# [翻译] 别再对 Angular Modules 感到迷惑

> 原文链接：**[Avoiding common confusions with modules in Angular](https://blog.angularindepth.com/avoiding-common-confusions-with-modules-in-angular-ada070e6891f)**

![Module](https://user-gold-cdn.xitu.io/2018/8/9/1651d798851b3566?w=270&h=360&f=jpeg&s=14849)

Angular Modules 是个相当复杂的话题，甚至 Angular 开发团队在官网上写了好几篇有关 **[NgModule](https://angular.io/guide/ngmodules)** 的文章教程。这些教程清晰的阐述了 **Modules** 的大部分内容，但是仍欠缺一些内容，导致很多开发者被误导。我看到很多开发者由于不知道 **Modules** 内部是如何工作的，所以经常理解错相关概念，使用 **Modules API** 的姿势也不正确。

本文将深度解释 **Modules** 内部工作原理，争取帮你消除一些常见的误解，而这些错误我在 **StackOverflow** 上经常看到有人提问。

## 模块封装
Angular 引入了模块封装的概念，这个和 ES 模块概念很类似（注：ES Modules 概念可以查看 TypeScript 中文网的 **[Modules](https://www.tslang.cn/docs/handbook/modules.html)**），基本意思是所有声明类型，包括组件、指令和管道，只可以在当前模块内部，被其他声明的组件使用。比如，如果我在 **App** 组件中使用 **A** 模块的 **a-comp** 组件：

```ts
@Component({
  selector: 'my-app',
  template: `
      <h1>Hello {{name}}</h1>
      <a-comp></a-comp>
  `
})
export class AppComponent { }
```

Angular 编译器就会抛出错误：

> Template parse errors: 'a-comp' is not a known element

这是因为 **App** 模块中没有申明 **a-comp** 组件，如果我想要使用这个组件，就不得不导入 **A** 模块，就像这样：

```ts
@NgModule({
  imports: [..., AModule]
})
export class AppModule { }
```

上面描述的就是 **模块封装**。不仅如此，如果想要 **a-comp** 组件正常工作，得设置它为可以公开访问，即在 **A** 模块的 **exports** 属性中导出这个组件：

```ts
@NgModule({
  ...
  declarations: [AComponent],
  exports: [AComponent]
})
export class AModule { }
```

同理，对于指令和管道，也得遵守 **模块封装** 的规则：

```ts
@NgModule({
  ...
  declarations: [
    PublicPipe, 
    PrivatePipe, 
    PublicDirective, 
    PrivateDirective
  ],
  exports: [PublicPipe, PublicDirective]
})
export class AModule {}
```


需要注意的是，**模块封装** 原则不适用于在 **entryComponents** 属性中注册的组件，如果你在使用动态视图时，像 **[译 关于 Angular 动态组件你需要知道的](https://juejin.im/post/5ae00616f265da0b7e0bee78)** 这篇文章中所描述的方式去实例化动态组件，就不需要在 **A** 模块的 **exports** 属性中去导出 **a-comp** 组件。当然，还得导入 **A** 模块。

大多数初学者会认为 **providers** 也有封装规则，**但实际上没有**。在 **非懒加载模块** 中申明的任何 **provider** 都可以在程序内的任何地方被访问，下文将会详细解释原因。

## 模块层级
初学者最大的一个误解就是认为，一个模块导入其他模块后会形成一个模块层级，认为该模块会成为这些被导入模块的父模块，从而形成一个类似模块树的层级，当然这么想也很合理。但实际上，不存在这样的模块层级。因为 **所有模块在编译阶段会被合并**，所以导入和被导入模块之间不存在任何层级关系。

就像 **[组件](https://juejin.im/post/5ae00616f265da0b7e0bee78)** 一样，Angular 编译器也会为根模块生成一个模块工厂，根模块就是你在 **main.ts** 中，以参数传入 **bootstrapModule()** 方法的模块：

```ts
platformBrowserDynamic().bootstrapModule(AppModule);
```

Angular 编译器使用 **[createNgModuleFactory](https://github.com/angular/angular/blob/master/packages/core/src/view/entrypoint.ts#L35-L38)** 方法来创建该模块工厂（注：可参考 **[L274](https://github.com/angular/angular/blob/master/packages/core/src/application_ref.ts#L274)** -> **[L60](https://github.com/angular/angular/blob/master/packages/compiler/src/jit/compiler.ts#L60-L61)** -> **[L109](https://github.com/angular/angular/blob/master/packages/compiler/src/jit/compiler.ts#L109)** -> **[L153-L155](https://github.com/angular/angular/blob/master/packages/compiler/src/jit/compiler.ts#L153-L155)** -> **[L50](https://github.com/angular/angular/blob/master/packages/compiler/src/ng_module_compiler.ts#L50)**），该方法需要几个参数（注：为清晰理解，不翻译。最新版本不包括第三个依赖参数。）：

* module class reference
* bootstrap components
* **component factory resolver with entry components**
* **definition factory with merged module providers**

最后两点解释了为何 **providers** 和 **entry components** 没有模块封装规则，因为编译结束后没有多个模块，而仅仅只有一个合并后的模块。并且在编译阶段，编译器不知道你将如何使用 **providers** 和动态组件，所以编译器去控制封装。但是在编译阶段的组件模板解析过程时，编译器知道你是如何使用组件、指令和管道的，所以编译器能控制它们的私有申明。（注：**providers** 和 **entry components** 是整个程序中的动态部分 dynamic content，Angular 编译器不知道它会被如何使用，但是模板中写的组件、指令和管道，是静态部分 static content，Angular 编译器在编译的时候知道它是如何被使用的。这点对理解 Angular 内部工作原理还是比较重要的。）


让我们看一个生成模块工厂的示例，假设你有 **A** 和 **B** 两个模块，并且每一个模块都定义了一个 **provider** 和一个 **entry component**：

```ts
@NgModule({
  providers: [{provide: 'a', useValue: 'a'}],
  declarations: [AComponent],
  entryComponents: [AComponent]
})
export class AModule {}

@NgModule({
  providers: [{provide: 'b', useValue: 'b'}],
  declarations: [BComponent],
  entryComponents: [BComponent]
})
export class BModule {}
```

根模块 **App** 也定义了一个 **provider** 和根组件 **app**，并导入 **A** 和 **B** 模块：

```ts
@NgModule({
  imports: [AModule, BModule],
  declarations: [AppComponent],
  providers: [{provide: 'root', useValue: 'root'}],
  bootstrap: [AppComponent]
})
export class AppModule {}
```

当编译器编译 **App** 根模块生成模块工厂时，编译器会 **合并** 所有模块的 **providers**，并只为合并后的模块创建模块工厂，下面代码展示模块工厂是如何生成的：

```ts
createNgModuleFactory(
    // reference to the AppModule class
    AppModule,

    // reference to the AppComponent that is used
    // to bootstrap the application
    [AppComponent],

    // module definition with merged providers
    moduleDef([
        ...

        // reference to component factory resolver
        // with the merged entry components
        moduleProvideDef(512, jit_ComponentFactoryResolver_5, ..., [
            ComponentFactory_<BComponent>,
            ComponentFactory_<AComponent>,
            ComponentFactory_<AppComponent>
        ])

        // references to the merged module classes 
        // and their providers
        moduleProvideDef(512, AModule, AModule, []),
        moduleProvideDef(512, BModule, BModule, []),
        moduleProvideDef(512, AppModule, AppModule, []),
        moduleProvideDef(256, 'a', 'a', []),
        moduleProvideDef(256, 'b', 'b', []),
        moduleProvideDef(256, 'root', 'root', [])
]);
```

从上面代码知道，所有模块的 **providers** 和 **entry components** 都将会被合并，并传给 **moduleDef()** 方法，**所以无论导入多少个模块，编译器只会合并模块，并只生成一个模块工厂**。该模块工厂会使用模块注入器来生成合并模块对象（注：查看 **[L232](https://github.com/angular/angular/blob/master/packages/core/src/application_ref.ts#L232)**），然而由于只有一个合并模块，Angular 将只会使用这些 **providers**，来生成一个单例的根注入器。

现在你可能想到，如果两个模块里定义了相同的 **provider token**，会发生什么？

**第一个规则** 则是导入其他模块的模块中定义的 **provider** 总是优先胜出，比如在 **AppModule** 中也同样定义一个 **a provider**：

```ts
@NgModule({
  ...
  providers: [{provide: 'a', useValue: 'root'}],
})
export class AppModule {}
```

查看生成的模块工厂代码：

```ts
moduleDef([
     ...
     moduleProvideDef(256, 'a', 'root', []),
     moduleProvideDef(256, 'b', 'b', []),
 ]);
```

可以看到最后合并模块工厂包含 **moduleProvideDef(256, 'a', 'root', [])**，会覆盖 **AModule** 中定义的 **{provide: 'a', useValue: 'a'}**。

**第二个规则** 是最后导入模块的 **providers**，会覆盖前面导入模块的 **providers**。同样，也在 **BModule** 中定义一个 **a provider**：

```ts
@NgModule({
  ...
  providers: [{provide: 'a', useValue: 'b'}],
})
export class BModule {}
```

然后按照如下顺序在 **AppModule** 中导入 **AModule** 和 **BModule**：

```ts
@NgModule({
  imports: [AModule, BModule],
  ...
})
export class AppModule {}
```

查看生成的模块工厂代码：

```ts
moduleDef([
     ...
     moduleProvideDef(256, 'a', 'b', []),
     moduleProvideDef(256, 'root', 'root', []),
 ]);
```

所以上面代码已经验证了第二条规则。我们在 **BModule** 中定义了 **{provide: 'a', useValue: 'b'}**，现在让我们交换模块导入顺序：

```ts
@NgModule({
  imports: [BModule, AModule],
  ...
})
export class AppModule {}
```

查看生成的模块工厂代码：

```ts
moduleDef([
     ...
     moduleProvideDef(256, 'a', 'a', []),
     moduleProvideDef(256, 'root', 'root', []),
 ]);
```

和预想一样，由于交换了模块导入顺序，现在 **AModule** 的 **{provide: 'a', useValue: 'a'}**  覆盖了 **BModule** 的 **{provide: 'a', useValue: 'b'}**。


> 注：上文作者提供了 AppModule 被 @angular/compiler 编译后的代码，并针对编译后的代码分析多个 modules 的 providers 会被合并。实际上，我们可以通过命令 **yarn ngc -p ./tmp/tsconfig.json** 自己去编译一个小实例看看，其中，**./node_modules/.bin/ngc** 是 **@angular/compiler-cli** 提供的 cli 命令。我们可以使用 **ng new module** 新建一个项目，我的版本是 6.0.5。然后在项目根目录创建 **/tmp** 文件夹，然后加上 **tsconfig.json**，内容复制项目根目录的 **tsconfig.json**，然后加上一个 **module.ts** 文件。**module.ts** 内容包含根模块 **AppModule**，和两个模块 **AModule** 和 **BModule**，**AModule** 提供 **AService** 、**{provide:'a', value:'a'}** 和 **{provide:'b', value:'b'}** 服务，而 **BModule** 提供 **BService** 和 **{provide: 'b', useValue: 'c'}**。**AModule** 和 **BModule** 按照先后顺序导入根模块 **AppModule**，完整代码如下：

```
import {Component, Inject, Input, NgModule} from '@angular/core';
import "./goog"; // goog.d.ts 源码文件拷贝到 /tmp 文件夹下
import "hammerjs";
import {platformBrowserDynamic} from '@angular/platform-browser-dynamic';
export class AService {
}
@NgModule({
  providers: [
    AService,
    {provide: 'a', useValue: 'a'},
    {provide: 'b', useValue: 'b'},
  ],
})
export class AModule {
}
export class BService {
}
@NgModule({
  providers: [
    BService,
    {provide: 'b', useValue: 'c'}
  ]
})
export class BModule {
}
@Component({
  selector: 'app',
  template: `
    <p>{{name}}</p>
    <!--<a-comp></a-comp>-->
  `
})
export class AppComp {
  name = 'lx1036';
}

export class AppService {
}

@NgModule({
  imports: [AModule, BModule],
  declarations: [AppComp],
  providers: [
    AppService,
    {provide: 'a', useValue: 'b'}
  ],
  bootstrap: [AppComp]
})
export class AppModule {
}

platformBrowserDynamic().bootstrapModule(AppModule).then(ngModuleRef => console.log(ngModuleRef));
```

> 然后 **yarn ngc -p ./tmp/tsconfig.json** 使用 @angular/compiler 编译这个 module.ts 文件会生成多个文件，包括 **module.js** 和 **module.factory.js**。
先看下 **module.js**。**AppModule** 类会被编译为如下代码，发现我们在 **@NgModule** 类装饰器中写的元数据，会被赋值给 **AppModule.decorators** 属性，如果是属性装饰器，会被赋值给 **propDecorators** 属性：

```
var AppModule = /** @class */ (function () {
    function AppModule() {
    }
    AppModule.decorators = [
        { type: core_1.NgModule, args: [{
                    imports: [AModule, BModule],
                    declarations: [AppComp],
                    providers: [
                        AppService,
                        { provide: 'a', useValue: 'b' }
                    ],
                    bootstrap: [AppComp]
                },] },
    ];
    return AppModule;
}());
exports.AppModule = AppModule;
```

> 然后看下 **module.factory.js** 文件，这个文件很重要，本文关于模块 **providers** 合并就可以从这个文件看出。该文件 AppModuleNgFactory 对象中就包含合并后的 **providers**，这些 **providers** 来自于 **AppModule,AModule,BModule**，并且 **AppModule** 中的 **providers** 会覆盖其他模块的 **providers**，**BModule** 中的 **providers** 会覆盖 **AModule** 的 **providers**，因为 **BModule** 在 **AModule** 之后导入，可以交换导入顺序看看发生什么。其中，ɵcmf 是 **[createNgModuleFactory](https://github.com/angular/angular/blob/master/packages/core/src/view/entrypoint.ts#L33-L39)**，ɵmod 是 **[moduleDef](https://github.com/angular/angular/blob/master/packages/core/src/view/ng_module.ts#L40-L63)**，ɵmpd 是 **[moduleProvideDef](https://github.com/angular/angular/blob/master/packages/core/src/view/ng_module.ts#L25-L38)**，**moduleProvideDef** 第一个参数是 **[enum NodeFlags](https://github.com/angular/angular/blob/master/packages/core/src/view/types.ts#L155-L202)** 节点类型，用来表示当前节点是什么类型，比如 **i0.ɵmpd(256, "a", "a", [])** 中的 256 表示 **[TypeValueProvider](https://github.com/angular/angular/blob/master/packages/core/src/view/types.ts#L172)** 是个值类型。

```
Object.defineProperty(exports, "__esModule", { value: true });
var i0 = require("@angular/core");
var i1 = require("./module");

var AModuleNgFactory = i0.ɵcmf(
  i1.AModule,
  [],
  function (_l) {
    return i0.ɵmod([
      i0.ɵmpd(512, i0.ComponentFactoryResolver, i0.ɵCodegenComponentFactoryResolver, [[8, []], [3, i0.ComponentFactoryResolver], i0.NgModuleRef]),
      i0.ɵmpd(4608, i1.AService, i1.AService, []),
      i0.ɵmpd(1073742336, i1.AModule, i1.AModule, []),
      i0.ɵmpd(256, "a", "a", []),
      i0.ɵmpd(256, "b", "b", [])]
    );
  });
exports.AModuleNgFactory = AModuleNgFactory;

var BModuleNgFactory = i0.ɵcmf(
  i1.BModule,
  [],
  function (_l) {
    return i0.ɵmod([
      i0.ɵmpd(512, i0.ComponentFactoryResolver, i0.ɵCodegenComponentFactoryResolver, [[8, []], [3, i0.ComponentFactoryResolver], i0.NgModuleRef]),
      i0.ɵmpd(4608, i1.BService, i1.BService, []),
      i0.ɵmpd(1073742336, i1.BModule, i1.BModule, []),
      i0.ɵmpd(256, "b", "c", [])
    ]);
  });
exports.BModuleNgFactory = BModuleNgFactory;

var AppModuleNgFactory = i0.ɵcmf(
  i1.AppModule,
  [i1.AppComp], // AppModule 的 bootstrapComponnets 启动组件数据
  function (_l) {
    return i0.ɵmod([
      i0.ɵmpd(512, i0.ComponentFactoryResolver, i0.ɵCodegenComponentFactoryResolver, [[8, [AppCompNgFactory]], [3, i0.ComponentFactoryResolver], i0.NgModuleRef]),
      i0.ɵmpd(4608, i1.AService, i1.AService, []),
      i0.ɵmpd(4608, i1.BService, i1.BService, []),
      i0.ɵmpd(4608, i1.AppService, i1.AppService, []),
      i0.ɵmpd(1073742336, i1.AModule, i1.AModule, []),
      i0.ɵmpd(1073742336, i1.BModule, i1.BModule, []),
      i0.ɵmpd(1073742336, i1.AppModule, i1.AppModule, []),
      i0.ɵmpd(256, "a", "b", []),
      i0.ɵmpd(256, "b", "c", [])]);
  });
exports.AppModuleNgFactory = AppModuleNgFactory;
```

> 自己去编译实践下，会比只看文章的解释，效率更高很多。

## 懒加载模块
现在又有一个令人困惑的地方-懒加载模块。官方文档是这样说的（注：不翻译）：

> Angular creates a lazy-loaded module with its own injector, a child of the root injector… So a lazy-loaded module that imports that shared module makes its own copy of the service.

所以我们知道 Angular 会为懒加载模块创建它自己的注入器，这是因为 Angular 编译器会为每一个懒加载模块编译生成一个 **独立的组件工厂**。这样在该懒加载模块中定义的 **providers** 不会被合并到主模块的注入器内，所以如果懒加载模块中定义了与主模块有着相同的 **provider**，则 Angular 编译器会为该 **provider** 创建一份新的服务对象。

**所以懒加载模块也会创建一个层级，但是注入器的层级，而不是模块层级。** 在懒加载模块中，导入的所有模块同样会在编译阶段被合并为一个，就和上文非懒加载模块一样。


以上相关逻辑是在 **@angular/router** 包的 **RouterConfigLoader** 代码里，该段展示了如何加载模块和创建注入器：

```ts
export class RouterConfigLoader {

  load(parentInjector, route) {
    ...
    const moduleFactory$ = this.loadModuleFactory(route.loadChildren);
    return moduleFactory$.pipe(map((factory: NgModuleFactory<any>) => {
  		...

  		const module = factory.create(parentInjector);
		...
	 }));
  }

  private loadModuleFactory(loadChildren) {
    ...
    return this.loader.load(loadChildren)
  }
}
```

查看这行代码：

```ts
const module = factory.create(parentInjector);
```

传入父注入器来创建懒加载模块新对象。


## forRoot 和 forChild 静态方法
查看官网是如何介绍的（注：不翻译）：

> Add a CoreModule.forRoot method that configures the core UserService… Call forRoot only in the root application module, AppModule

这个建议是合理的，但是如果你不理解为什么这样做，最终会写出类似下面代码：

```ts
@NgModule({
  imports: [
    SomeLibCarouselModule.forRoot(),
    SomeLibCheckboxModule.forRoot(),
    SomeLibCloseModule.forRoot(),
    SomeLibCollapseModule.forRoot(),
    SomeLibDatetimeModule.forRoot(),
    ...
  ]
})
export class SomeLibRootModule {...}
```

每一个导入的模块（如 **CarouselModule**，**CheckboxModule** 等等）**不再定义任何 providers**，但是我觉得没理由在这里使用 **forRoot**，让我们一起看看为何在第一个地方需要 **forRoot**。

当你导入一个模块时，通常会使用该模块的引用：

```ts
@NgModule({ providers: [AService] })
export class A {}

@NgModule({ imports: [A] })
export class B {}
```

这种情况下，在 **A** 模块中定义的所有 **providers** 都会被合并到主注入器，并在整个程序上下文中可用，我想你应该已经知道原因-上文中已经解释了所有模块 **providers** 都会被合并，用来创建注入器。

Angular 也支持另一种方式来导入带有 **providers** 的模块，它不是通过使用模块的引用来导入，而是传一个实现了 **ModuleWithProviders** 接口的对象：

```ts
interface ModuleWithProviders { 
   ngModule: Type<any>
   providers?: Provider[] 
}
```

上文中我们可以这么改写：

```ts
@NgModule({})
class A {}

const moduleWithProviders = {
    ngModule: A,
    providers: [AService]
};

@NgModule({
    imports: [moduleWithProviders]
})
export class B {}
```

最好能在模块对象内使用一个静态方法来返回 **ModuleWithProviders**，而不是直接使用 **ModuleWithProviders** 类型的对象，使用 **forRoot** 方法来重构代码：

```ts
@NgModule({})
class A {
  static forRoot(): ModuleWithProviders {
    return {ngModule: A, providers: [AService]};
  }
}

@NgModule({
  imports: [A.forRoot()]
})
export class B {}
```

当然对于文中这个简单示例没必要定义 **forRoot** 方法返回 **ModuleWithProviders** 类型对象，因为可以在两个模块内直接定义 **providers** 或如上文使用一个 **moduleWithProviders** 对象，这里仅仅也是为了演示效果。然而如果我们想要分割 **providers**，并在被导入模块中分别定义这些 **providers**，那上文中的做法就很有意义了。

比如，如果我们想要为非懒加载模块定义一个全局的 **A** 服务，为懒加载模块定义一个 **B** 服务，就需要使用上文的方法。我们使用 **forRoot** 方法为非懒加载模块返回 **providers**，使用 **forChild** 方法为懒加载模块返回 **providers**。

```ts
@NgModule({})
class A {
  static forRoot() {
    return {ngModule: A, providers: [AService]};
  }
  static forChild() {
    return {ngModule: A, providers: [BService]};
  }
}

@NgModule({
  imports: [A.forRoot()]
})
export class NonLazyLoadedModule {}

@NgModule({
  imports: [A.forChild()]
})
export class LazyLoadedModule {}
```

因为非懒加载模块会被合并，所以 **forRoot** 中定义的 **providers** 全局可用（注：包括非懒加载模块和懒加载模块），但是由于懒加载模块有它自己的注入器，你在 **forChild** 中定义的 **providers** 只在当前懒加载模块内可用（注：不翻译）。

> Please note that the names of methods that you use to return ModuleWithProviders structure can be completely arbitrary. The names forChild and forRoot I used in the examples above are just conventional names recommended by Angular team and used in the RouterModuleimplementation.（注：即 forRoot 和 forChild 方法名称可以随便修改。）

好吧，回到最开始要看的代码：

```ts
@NgModule({
  imports: [
    SomeLibCarouselModule.forRoot(),
    SomeLibCheckboxModule.forRoot(),
    ...
```

根据上文的理解，就发现没有必要在每一个模块里定义 **forRoot** 方法，因为在多个模块中定义的 **providers** 需要全局可用，也没有为懒加载模块单独准备 **providers**（注：即本就没有切割 **providers** 的需求，但你使用 **forRoot** 强制来切割）。甚至，如果一个被导入模块没有定义任何 **providers**，那代码写的就更让人迷惑。

> Use forRoot/forChild convention only for shared modules with providers that are going to be imported into both eager and lazy module modules


还有一个需要注意的是 **forRoot** 和 **forChild** 仅仅是方法而已，所以可以传参。比如，**@angular/router** 包中的 **RouterModule**，就定义了 **[forRoot](https://github.com/angular/angular/blob/master/packages/router/src/router_module.ts#L136-L183)** 方法并传入了额外的参数：

```ts
export class RouterModule {
  static forRoot(routes: Routes, config?: ExtraOptions)
```

传入的 **routes** 参数是用来注册 **ROUTES** 标识（token）的：

```ts
static forRoot(routes: Routes, config?: ExtraOptions) {
  return {
    ngModule: RouterModule,
    providers: [
      {provide: ROUTES, multi: true, useValue: routes}
```

传入的第二个可选参数 **config** 是用来作为配置选项的（注：如配置预加载策略）：

```ts
static forRoot(routes: Routes, config?: ExtraOptions) {
  return {
    ngModule: RouterModule,
    providers: [
      {
        provide: PreloadingStrategy,
        useExisting: config.preloadingStrategy ?
          config.preloadingStrategy :
          NoPreloading
      }
```

正如你所看到的，**RouterModule** 使用了 **forRoot** 和 **forChild** 方法来分割 **providers**，并传入参数来配置相应的 **providers**。

## 模块缓存
在 **Stackoverflow** 上有段时间有位开发者提了个问题，担心如果在非懒加载模块和懒加载模块导入相同的模块，在运行时会导致该模块代码有重复。这个担心可以理解，不过不必担心，因为所有模块加载器会缓存所有加载的模块对象。

当 SystemJS 加载一个模块后会缓存该模块，下次当懒加载模块又再次导入该模块时，SystemJS 模块加载器会从缓存里取出该模块，而不是执行网络请求，这个过程对所有模块适用（注：Angular 内置了 **[SystemJsNgModuleLoader](https://github.com/angular/angular/blob/master/packages/core/src/linker/system_js_ng_module_factory_loader.ts#L49-L85)** 模块加载器）。比如，当你在写 Angular 组件时，从 **@angular/core** 包中导入 **Component** 装饰器：

```ts
import { Component } from '@angular/core';
```

你在程序里多处引用了这个包，但是 SystemJS 并不会每次加载这个包，它只会加载一次并缓存起来。

如果你使用 **angular-cli** 或者自己配置 **Webpack**，也同样道理，它只会加载一次并缓存起来，并给它分配一个 **ID**，其他模块会使用该 **ID** 来找到该模块，从而可以拿到该模块提供的多种多样的服务。


