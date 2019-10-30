# [翻译] Schematics的介绍
> 原文链接：[Schematics — An Introduction](https://blog.angular.io/schematics-an-introduction-dc1dfbc2a2b2)
>
> 译者：[ssrivers](https://www.zhihu.com/people/try-23-74/activities)；校对者：


Schematics是一个为当今web开发服务的工作流工具。他可以在你的项目中应用一些变化，比如创建一个新的组件，更新你的代码去解决依赖中的破坏性更新。又或者你希望在已有的项目中增加一个新的配置项或框架。

## <a name="gny2up"></a>目标
Angular CLI的使命是帮助你提高开发生产力。我们一致认为我们需要一个更强大的，更通用的机制来支撑CLI的脚手架，因此我们设定了4个主要目标：
1. __易使用和开发__。建立一些简单的概念让开发者可以感觉很自然，靠直觉就可以理解。同样，开发代码也需要设计的便于开发使用。
2. __可扩展性和可重用性__。保持可重用性为重心，我们设计出了简单但是很强大的管道化接口。Schematics可以作为另一个Schematics的输入输出。例如，一个应用可以由组件和模块的Schematics创建。
3. __原子性__。我们的CLI蓝图中存在很多错误是由于蓝图的副作用直接导致的。在开发Schematics时，我们就决定彻底从代码中移除那些副作用。所有的变动记录在内存中，直到被确认合法时再进行一次性的应用。比如，创建一个已经存在的文件看做一种错误，一旦过程中遇到这种情况，其他所有的改动都会被丢弃。
4. __异步性__。很多的工作流本身就是异步的（例如访问web服务），所以Schematics也必须支持这些场景。这一点看起来与为了易于开发，将调试进程设计成同步的第一个目标是冲突的，我们为了使这一切能够一起工作，做出了一个折中设计。Schematics的输入是同步的，但是输出是异步的，库会等待所有的都执行完成才会进行下一步操作。这样的方式使得开发者们在使用时甚至都不要关心Schematics是使用异步的机制。
Schematics所有的设计都基于这四个主要目标。Schematics是一个在共同努力下构建出来的更好的工作流工具。

## <a name="sr3niq"></a>理解Schematics
在schematic中，你无须直接操作文件系统。确切的说，你将需要做的变化应用到一个叫做 `Tree` 的模型上。这样就支持了我们需要的一些特性，比如无需增加额外的支持就可以做到的演练(或打补丁)。同时schematics的密封性也保证了可重用的能力和安全性。

`Tree` 是一个包含了一个基础的（已存在的文件的集合）和一个临时的区域（待应用的一系列变化）的数据结构。当需要做出修改时，你不需要在基础区域去应用变化，而是将这些变化添加到临时区域中。这是非常强大的，但也可能是棘手的，将在另一篇medium的文章中进一步探讨。

schematic接收到的 `Tree`可以是任何内容。Angular CLI调用第一个schematic时，Tree呈现是磁盘上的项目结构，不过中间的schematic可能接收到任何内容的 `Tree` 。好消息是这并不重要，`Tree` 始终代表的是入口节点。

## <a name="gghisp"></a>创建你第一个Schematics
首先，确保你已经安装了6.9及以上的版本的Node。接下来，全局安装Schematics命令行工具：
```bash
npm install -g @angular-devkit/schematics-cli
```

这样就安装了可执行的Schematics，你可以用它来创建一个空的Schematics项目：
```bash
schematics blank --name=my-component
```
好啦。这个 `blank` Schematics命令不但可以创建一个新的项目，还可以添加空的Schematic到已有的项目中（两种场景都可以用）。通过cd命令进入到你创建的项目中，安装npm依赖，然后选择你喜欢的编辑器打开他们：
```bash
cd my-component
npm install
code . # or atom, webstorm, vi, ...
```

## <a name="85iwls"></a>Collections
Schematics Collections是一组用户用来发布和安装的已经命名的Schematics集合。例如，Angular团队发布和维护官方的<span data-type="color" style="color:rgba(0, 0, 0, 0.84)"><span data-type="background" style="background-color:rgba(0, 0, 0, 0.05)">@schematics/angular</span></span>集合，这其中包含了例如 `component`, `module` 和 `application` 的Schematics。

在我们的例子中，我们的Collection仅有 `my-component` schematic。你可以查看 `src/collection.json` 文件，这里面包含了我们Collection的描述信息：
```json
{
  "$schema": "../node_modules/@angular-devkit/schematics/collection-schema.json",
  "schematics": {
    "my-component": {
      "description": "A blank schematic.",
      "factory": "./my-component/index#myComponent"
    }
  }
}  
```
`$schema` 键指向的JSON Schema，定义了文件的格式。他被IDE用来做自动补全，格式验证，是一个可选项。

重要的键是 `schematics` , 他描述了在这个Collection中包含了哪些Schematics。在我们的例子里，我们描述了一个Schematic：`my-component`, 他拥有一个简单的description和一个factory字段。`factory` 字段指向一个JavaScript函数。我们的例子从 `my-component/index.js` 文件中导出了 `myComponent` 函数，他是一个 `RuleFactory` 。

## <a name="gw28ms"></a>Rules, Trees和文件
`Rule` 是一个接收一个 `Tree` 作为入参并且返回另一个 `Tree` 的函数。Rules是Schematics的核心；通过它们在你的项目中做出变化，调用外部工具并做逻辑实现。`RuleFactory` 正如他名字一样，是一个创建 `Rule` 的函数。

目前为止，这还是个空的 `RuleFactory` :
```typescript
import { Rule, SchematicContext, Tree } from '@angular-devkit/schematics';


// You don't have to export the function as default. You can also have more than one rule factory
// per file.
export function myComponent(options: any): Rule {
  return (tree: Tree, _context: SchematicContext) => {
    return tree;
  };
}
```
这个工厂函数接收一个 `options` 参数，返回一个 `Rule` , 这个 `Rule` 接收了tree但未做任何改变并将其返回。

factory的输入参数 `options` 是一个对象。通过CLI调用，由用户通过CLI的命令行参数传递过来。通过另外的Schematic调用，`options` 就由那个Schematic传递。例如，GUI工具就可以通过用户或项目的输入来构建这个option。

在任何情况下，它永远是一个对象且可以定义为any类型，可以通过JSON Schema来验证确保输入的内容是正确类型且有正确的默认值。JSON Schemas会在后续的文章中更细致的解读。

与此同时，让我们在rule中做一些有趣的事：
```typescript
import { Rule, SchematicContext, Tree } from '@angular-devkit/schematics';


// You don't have to export the function as default. You can also have more than one rule factory
// per file.
export function myComponent(options: any): Rule {
  return (tree: Tree, _context: SchematicContext) => {
    tree.create(options.name || 'hello', 'world');
    return tree;
  };
}
```
通过新增的一行，我们在Schematic的Tree的根目录创建了一个文件，文件名为option的name属性（或默认的hello）,内容是world字符串。现在看起来视乎微不足道，但是底层做了很多事情。

`Tree` 中包含了你的Schematics中需要应用的所有文件。它包括一系列文件和你希望应用改动的相关元数据。在我们的例子中，唯一的变动就是创建了一个文件。Trees相比于文件系统要更加复杂，后续的文章中我们会更加深入的剖析，不过现在你就把他们看做是一个文件和改动的集合。

默认情况下，Angular CLI将Angular项目的根路径作为Tree传递给schematic，但任何一个schematic可以传递不同的Tree给其他的schematics。你可以创建一个空的Tree，将Tree的作用域限定为父级Tree的目录，合并两支Tree或创建他们的分支（复制）。

改变Tree的方法有四种：create, delete, rename, 和 overwrite.

## <a name="rrbpaf"></a>运行你新建立的schematic

运行我们的例子之前，你需要先编译，然后使用schematics命令行工具，使用Collection中描述的schematic项目目录作为路径。在我们项目的根目录下运行：

```bash
npm run build
# ... wait for build to finish
schematics .:my-component --name=test
# ... see that a file is created in the root.
```

在深入研究这里发生了什么之前，发现有警告的文字；不必担心，这时是不会在真正的文件系统中创建文件的。这是因为schematics使用集合中的路径时工具处于调试模式。当在调试时（也可以通过 `--debug=true` 来设定），默认会使用演练模式运行，演练模式会阻止工具真正的去创建文件。

你可以使用 `--dry-run=false` 参数来改变上述情形。但是请注意，这意味着所有的改变将会立即应用到文件系统上。如果你删除了或覆盖了一个文件，在可能并不符合你的期望下丢失了文件内容。我们建议当你使用一个临时的分开的目录调试schematics，在必要的时候才关闭演练。

你可以在另一个terminal窗口运行`npm run build -- -w` 这样就可以自动监视文件变化，在变化后执行重新编译。
## <a name="vp9uil"></a>调试
为了调试你的Schematics，你需要将node在调试模式下运行：

`node --inspect-brk $(which schematics) .:myComponent --name=test` 

调试模式的另一个优势是在你运行你的Schematic之前，Schematics命令行工具会直接放置一个断点。

## <a name="emlyog"></a>调用另一个Schematic

Schematics另一个很大的优势是将多个Schematics组合变得很简单。在我们的例子里，我们将会从Angular Collection中调用组件的Schematic在应用中添加组件，然后通过Schematics在每个typescript文件中在头部增加版权内容。

```typescript
import { Rule, SchematicContext, Tree, chain, externalSchematic } from '@angular-devkit/schematics';

const licenseText = `
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
`;

export function myComponent(options: any): Rule {
  return chain([
    externalSchematic('@schematics/angular', 'component', options),
    (tree: Tree, _context: SchematicContext) => {
      tree.getDir(options.sourceDir)
          .visit(filePath => {
            if (!filePath.endsWith('.ts')) {
              return;
            }
            const content = tree.read(filePath);
            if (!content) {
              return;
            }

            // Prevent from writing license to files that already have one.
            if (content.indexOf(licenseText) == -1) {
              tree.overwrite(filePath, licenseText + content);
            }
          });
      return tree;
    },
  ]);
}
```

Don’t forget to add `@schematics/angular` to your dependencies in your `package.json`!
不要忘记在 `package.json` 文件中添加`@schematics/angular`依赖。

这里注意一些细节，我们直接调用并返回 `chain` 。`chain` 是由Schematics库提供的 `RuleFactory` 将多个Rule链接在一起，两个Rule的顺序调用之间，后一个Rule会等待前一个执行完成。Schematics库还提供了其他的Rule工厂方法， 稍后我们仔细学习下。

接着，我们调用了另一个称为 `externalSchematic` 的 `RuleFactory` (他也有一个兄弟工厂方法叫做 `schematic` ) 。Schematics都是rule，你或许想试着只是简单的导入Schematic的rule工厂，自己建立一个rule，然后直接调用它（或将他直接传递到chain中）。不要直接调用其他的作为Rule的Schematics。`externalSchematic` (和schematic) rule工厂方法中还有很多的逻辑处理，比如Schema的验证和填入默认值，而不是简单的导入Schematic执行。

最后要说的是，由于Schematics的封闭性，目前没有很好的方法从Tree中获得我们创建的文件或修改的文件。你所获得的Tree是不包括本地的修改的。鉴于这一点，我们必须把所有的文件都过一遍。

## <a name="a231"></a>使用 Angular CLI

当前对于用户来说Schematics最好的使用方式是通过Angular CLI。这意味着你在发布到NPM之前需要尽可能的测试一下。现在我们将试着通过Angular CLI来使用我们新建的 `myComponent` schematic。

首先，通过CLI建立一个空的项目：
```bash
ng new my-project
```

接着将我们刚才创建的Schematics链接到我们新建的项目中：
```bash
npm link $PATH_TO_SCHEMATIC_PROJECT
```

使用你的项目的根路径来替换 `$PATH_TO_SCHEMATIC_PROJECT` 。注意，用户不会使用链接而是通过安装的方式，这只是为了在开发时更快地在本地迭代。

一旦你的schematic项目连接上，你就可以使用 `ng generate` 调用你的Schematics了：
```
ng generate my-component:my-component someName
```

默认情况下，如果Schematic接收一个name参数，generate命令的第二个参数将接收它。

就这样！现在足可以让你的用户去使用了。注意一下，你可以设置CLI配置上的默认的集合。更多有关这个配置的信息可以到CLI wiki上了解。

## <a name="255c"></a>总结

简单概括下目前为止你学习到的内容：

1. 如何通过Schematics CLI工具去创建一个新的项目
2. 如果通过Schematics CLI工具去调试你的项目
3. 如何使用 `chain` 和 `externalSchematic` 的rule工厂方法去组合rules及调用其他的Schematics
4. 如何通过Angular CLI去调用我们的Schematics（应对调试和使用目的）

接下来的博文中，我们会深入的解析下 `Tree` 的数据结构以及tasks，task是一种用来调用外部进程的智能且安全的方式。

Schematics是Angular DevKit下发布第一部分库，承载了大量努力。Angular DevKit将来会包含更多的库，会在后续的博文中描述。

感谢!

