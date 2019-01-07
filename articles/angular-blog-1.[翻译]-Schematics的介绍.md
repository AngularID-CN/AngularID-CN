# [翻译] Schematics 的介绍
> 原文链接：[Schematics — An Introduction](https://blog.angular.io/schematics-an-introduction-dc1dfbc2a2b2)
>
> 译者：[ssrivers](https://www.zhihu.com/people/try-23-74/activities)；校对者：


Schematics 是一个为当今 web 开发服务的工作流工具。他可以在你的项目中应用一些变化，比如创建一个新的组件，更新你的代码去解决依赖中的破坏性更新。又或者你希望在已有的项目中增加一个新的配置项或框架。

## 目标
Angular CLI 的使命是帮助你提高开发生产力。我们一致认为我们需要一个更强大的，更通用的机制来支撑CLI的脚手架，因此我们设定了4个主要目标：
1. __易使用和开发__。建立一些简单的概念让开发者可以感觉很自然，靠直觉就可以理解。同样，开发代码也需要设计的便于开发使用。
2. __可扩展性和可重用性__。保持可重用性为重心，我们设计出了简单但是很强大的管道化接口。Schematics 可以作为另一个Schematics的输入输出。例如，一个应用可以由组件和模块的 Schematics 创建。
3. __原子性__。我们的CLI蓝图中存在很多错误是由于蓝图的副作用直接导致的。在开发 Schematics 时，我们就决定彻底从代码中移除那些副作用。所有更改都记录在内存中，只有在确认有效时才应用。例如，创建一个已经存在的文件是一个错误，它将丢弃到目前为止应用的所有其他更改。
4. __异步性__。很多的工作流本身就是异步的（例如访问 web 服务），所以 Schematics 也必须支持这些场景。这一点看起来与为了易于开发，将调试进程设计成同步的第一个目标是冲突的，我们为了使这一切能够一起工作，做出了一个折中设计。Schematics 的输入是同步的，但输出可以是异步的，库将等待一切完成后才开始下一步。这样的方式使得开发者们在使用时甚至都不要关心 Schematics 是使用异步的机制。
Schematics 所有的设计都基于这四个主要目标。Schematics 是一个在共同努力下构建出来的更好的工作流工具。

## 理解 Schematics
在 schematic 中，你无须直接操作文件系统。确切的说，你将需要做的变化应用到一个叫做 `Tree` 的模型上。这样就支持了我们需要的一些特性，比如无需增加额外的支持就可以做到的演练(或打补丁)。同时 schematics 的密封性也保证了可重用的能力和安全性。

`Tree` 是一个包含了一个基础（已存在的文件的集合）和一个临时区域（待应用的一系列变化）的数据结构。当需要做出修改时，你不需要在基础区域应用变化，而是将这些变化添加到临时区域中。这是非常强大的，但也可能是棘手的，将在另一篇 medium 的文章中进一步探讨。

schematic 接收到的 `Tree` 可以是任何内容。Angular CLI 调用第一个 schematic 时，Tree 呈现的是磁盘上的项目结构，不过中间的 schematic 可能接收到任何内容的 `Tree` 。好消息是这并无大碍，`Tree` 始终代表的是入口节点。

## 创建你第一个Schematics
首先，确保你已经安装了6.9及以上的版本的 Node。接下来，全局安装 Schematics 命令行工具：
```bash
npm install -g @angular-devkit/schematics-cli
```

这样就安装了可执行的 Schematics，你可以用它来创建一个空的 Schematics 项目：
```bash
schematics blank --name=my-component
```
好啦。这个 `blank` Schematics 命令不但可以创建一个新的项目，还可以添加空的 Schematic 到已有的项目中（两种场景都可以用）。通过 cd 命令进入到你创建的项目中，安装 npm 依赖，然后选择你喜欢的编辑器打开他们：
```bash
cd my-component
npm install
code . # or atom, webstorm, vi, ...
```

## Collections
Schematics Collections 是一组用户用来发布和安装的已经命名的 Schematics 集合。例如，Angular 官方团队发布和维护的 `@schematics/angular` 集合，这其中包含了例如 `component`, `module` 和 `application` 的 Schematics。

在我们的例子中，Collection 仅有 `my-component` schematic。你可以查看 `src/collection.json` 文件，这里面包含了 Collection 的描述信息：
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
`$schema` 键指向的 JSON Schema 定义了文件的格式。它是一个可选项，被 IDE 用来做自动补全，格式验证。

重要的键是 `schematics` , 他描述了在这个 Collection 中包含了哪些 Schematics 。在我们的例子中，我们描述了一个 Schematic：`my-component`, 它拥有一个简单的 description 和一个 factory 字段。`factory` 字段指向一个 JavaScript 函数。我们的例子从 `my-component/index.js` 文件中导出了 `myComponent` 函数，他是一个 `RuleFactory` 。

## Rules, Trees和文件
`Rule` 是一个接收一个 `Tree` 作为入参并且返回另一个 `Tree` 的函数。Rules 是 Schematics 的核心；通过它们在你的项目中做出变化，调用外部工具并做逻辑实现。`RuleFactory` 正如他名字一样，是一个创建 `Rule` 的函数。

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
这个工厂函数接收一个 `options` 参数，返回一个 `Rule` , 这个 `Rule` 接收了 tree 但未做任何改变并将其返回。

factory 的输入参数 `options` 是一个对象。通过 CLI 调用，由用户通过 CLI 的命令行参数传递过来。通过另外的 Schematic 调用，`options` 就由那个 Schematic 传递。例如，GUI 工具就可以通过用户或项目的输入来构建这个 option。

在任何情况下，它永远是一个对象且可以定义为 any 类型，可以通过 JSON Schema 来验证确保输入的内容是正确类型且有正确的默认值。JSON Schemas 会在后续的文章中更细致的解读。

与此同时，让我们在 rule 中做一些有趣的事：
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
通过新增的一行，我们在 Schematic 的 Tree 的根目录创建了一个文件，文件名为 option 的 `name` 属性（或默认的 `hello`），内容是 `world` 字符串。现在看起来视乎微不足道，但是底层做了很多事情。

`Tree` 中包含了你的 Schematics 中需要应用的所有文件。它包括一系列文件和你希望应用改动的相关元数据。在我们的例子中，唯一的变动就是创建了一个文件。Trees 相比于文件系统要更加复杂，后续的文章中我们会更加深入的剖析，不过现在你就把他们看做是一个文件和改动的集合。

默认情况下，Angular CLI 将 Angular 项目的根路径作为 Tree 传递给 schematic，但任何一个 schematic 可以传递不同的 Tree 给其他的 schematics。你可以创建一个空的 Tree，将 Tree 的作用域限定为父级 Tree 的目录，合并两支 Tree 或创建他们的分支（复制）。

改变 Tree 的方法有四种：create, delete, rename, 和 overwrite.

## 运行你新建立的 schematic

运行我们的例子之前，你需要先编译，然后使用 schematics 命令行工具，使用 Collection 中描述的 schematic 项目目录作为路径。在我们项目的根目录下运行：

```bash
npm run build
# ... wait for build to finish
schematics .:my-component --name=test
# ... see that a file is created in the root.
```

在深入研究这里发生了什么之前，发现有警告的文字；不必担心，这时是不会在真正的文件系统中创建文件的。这是因为 schematics 使用集合中的路径时工具处于调试模式。当在调试时（也可以通过 `--debug=true` 来设定），默认会使用演练模式运行，演练模式会阻止工具真正的去创建文件。

你可以使用 `--dry-run=false` 参数来改变上述情形。但是请注意，这意味着所有的改变将会立即应用到文件系统上。如果你删除了或覆盖了一个文件，在可能并不符合你的期望下丢失了文件内容。我们建议当你使用一个临时的分开的目录调试 schematics，在必要的时候才关闭演练。

你可以在另一个 terminal 窗口运行 `npm run build -- -w` 这样就可以自动监视文件变化，在变化后执行重新编译。
## 调试
为了调试你的 Schematics，你需要将 node 在调试模式下运行：

`node --inspect-brk $(which schematics) .:myComponent --name=test` 

调试模式的另一个优势是在你运行你的 Schematic 之前，Schematics 命令行工具会直接放置一个断点。

## 调用另一个 Schematic

Schematics 的最大优点之一是它们很容易组合在一起。在我们的例子里，我们将会从 Angular Collection 中调用组件的 Schematic 在应用中添加组件，然后为 Schematics 添加的所有 TypeScript 文件添加个头部。

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

不要忘记在 `package.json` 文件中添加 `@schematics/angular` 依赖。

这里注意一些细节，我们直接调用并返回 `chain` 。`chain` 是由 Schematics 库提供的 `RuleFactory` 将多个 Rule 链接在一起，两个 Rule 的顺序调用之间，后一个 Rule 会等待前一个执行完成。Schematics 库还提供了其他的Rule工厂方法， 稍后我们仔细学习下。

接着，我们调用了另一个称为 `externalSchematic` 的 `RuleFactory` (他也有一个兄弟工厂方法叫做 `schematic` ) 。Schematics 都是 rule，你或许想试着只是简单的导入 Schematic 的 rule 工厂，自己建立一个 rule，然后直接调用它（或将他直接传递到 chain 中）。不要直接调用其他的作为 Rule 的 Schematics。`externalSchematic` (和 `schematic` ) rule 工厂方法中还有很多的逻辑处理，比如 Schema 的验证和填入默认值，而不是简单的导入 Schematic 执行。

最后要说的是，由于 Schematics 的封闭性，目前没有很好的方法从 Tree 中获得我们创建的文件或修改的文件。你所获得的 Tree 是不包括本地的修改的。鉴于这一点，我们必须把所有的文件都过一遍。

## 使用 Angular CLI

当前对于用户来说 Schematics 最好的使用方式是通过 Angular CLI。这意味着你可能应该在将其发布到 NPM 之前尝试一下。现在我们将试着通过 Angular CLI 来使用我们新建的 `myComponent` schematic。

首先，通过 CLI 建立一个空的项目：
```bash
ng new my-project
```

接着将我们刚才创建的 Schematics 链接到我们新建的项目中：
```bash
npm link $PATH_TO_SCHEMATIC_PROJECT
```

使用你的项目的根路径来替换 `$PATH_TO_SCHEMATIC_PROJECT` 。注意，用户不会使用链接而是通过安装的方式，这只是为了在开发时更快地在本地迭代。

一旦你的 schematic 项目连接上，你就可以使用 `ng generate` 调用你的 Schematics 了：
```
ng generate my-component:my-component someName
```

默认情况下，如果 schematics 接受 name 参数，则 generate 命令的第二个参数将设置为该名称。

就这样！现在足可以让你的用户去使用了。注意一下，你可以设置 CLI 配置上的默认的集合。更多有关这个配置的信息可以到 CLI wiki 上了解。

## 总结

简单概括下目前为止你学习到的内容：

1. 如何通过 Schematics CLI 工具去创建一个新的项目
2. 如果通过 Schematics CLI 工具去调试你的项目
3. 如何使用 `chain` 和 `externalSchematic` 的 rule 工厂方法去组合 rules 及调用其他的 Schematics
4. 如何通过 Angular CLI 去调用我们的 Schematics（应对调试和使用目的）

接下来的博文中，我们会深入的解析下 `Tree` 的数据结构以及 tasks，task 是一种用来调用外部进程的智能且安全的方式。

Schematics 是 Angular DevKit 下发布第一部分库，承载了大量努力。Angular DevKit 将来会包含更多的库，会在后续的博文中描述。

感谢!

