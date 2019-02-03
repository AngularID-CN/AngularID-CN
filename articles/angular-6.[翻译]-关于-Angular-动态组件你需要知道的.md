# [翻译] 关于 Angular 动态组件你需要知道的

> 原文链接：**[Here is what you need to know about dynamic components in Angular](https://blog.angularindepth.com/here-is-what-you-need-to-know-about-dynamic-components-in-angular-ac1e96167f9e)**  
> 原文作者：[Max Koretskyi，aka Wizard](https://blog.angularindepth.com/@maxim.koretskyi?source=post_header_lockup)  
> 原技术博文由 [`Max Koretskyi`](https://twitter.com/maxim_koretskyi) 撰写发布，他目前于 [ag-Grid](https://angular-grid.ag-grid.com/?utm_source=medium&utm_medium=blog&utm_campaign=angularcustom) 担任开发者职位。  
> *译者按：开发大使负责确保其所在的公司认真听取社区的声音并向社区传达他们的行动及目标，其作为社区和公司之间的纽带存在。*  
> 译者：**[Sunny Liu](https://segmentfault.com/u/lx1036/articles)**；校对者：**[秋天](https://github.com/jkhhuse)**  

![Create Components Dynamically](../assets/angular-6/1.png)

如果你之前使用 AngularJS（第一代 Angular 框架）来编程，可能会使用 `$compile` 服务生成 HTML，并连接到数据模型从而获得双向绑定功能：

```ts
const template = '<span>generated on the fly: {{name}}</span>'
const linkFn = $compile(template);
const dataModel = $scope.$new();
dataModel.name = 'dynamic';

// link data model to a template
linkFn(dataModel);
```

AngularJS 中指令可以使用多种方式去修改 DOM，但是框架却无法感知修改了什么。这种方式产生的问题和任何动态环境下的问题一样，很难去优化性能。当然，动态模板不是 AngularJS 性能慢的主要元凶，但也是重要原因之一。

我在看了 Angular 内部代码一段时间后，发现这个新设计的框架非常重视性能，在 Angular 源码里你会经常发现这几句话（注：为清晰理解，不翻译）：

```
Attention: Adding fields to this is performance sensitive!

Note: We use one type for all nodes so that loops that loop over all nodes of a ViewDefinition stay monomorphic!

For performance reasons, we want to check and update the list every five seconds.
```

所以，Angular 设计者决定牺牲灵活性来获得更大的性能提升，如引入了 JIT 和 AOT Compiler 和静态模板（static templates），指令/模块工厂（**[ComponentFactory](https://github.com/angular/angular/blob/master/packages/core/src/linker/component_factory.ts#L70)**），工厂解析器（**[ComponentFactoryResolver](https://github.com/angular/angular/blob/master/packages/core/src/linker/component_factory_resolver.ts#L39)**）。对 AngularJS 社区来说，这些概念很陌生，甚至充满敌意，不过不用担心，如果你之前仅仅是听说过这些概念，但现在想知道这些是什么，继续阅读本文，将让你茅塞顿开。

> 注：实际上，JIT/AOT Compiler 说的是同一个 Compiler，只是这个 Compiler 在 building time 阶段还是在 running time 阶段被使用而已。  
> 至于 factory，是 Angular Compiler 把你写的组件如 a.component.ts 编译为 a.component.ngfactory.js，即 Compiler 使用 @Component decorator 作为原材料，把你写的组件/指令类编译为另一个视图工厂类。  
> 回到刚刚的 JIT/AOT Compiler，如果 a.component.ngfactory.js 是在 build 阶段生成的那就是 AOT Compiler，这个 Compiler 不会被打包到依赖包里；如果是在 run 阶段生成，那 Compiler 就需要被打包到依赖包里，被用户下载到本地，在运行时 Compiler 会编译组件/指令类生成对应的视图工厂类，仅此而已。下文将会看下这些 *.ngfactory.js 文件代码是什么样的。  
> 至于 factory resolver，那就更简单了，就是一个对象，通过它拿到那些编译后的 factory 对象。  

## 组件工厂和编译器
Angular 中每一个组件是由组件工厂创建的，组件工厂又是由编译器根据你写的 `@Component` 装饰器里的元数据编译生成的。如果你在网上读了大量的 decorator 文章还有点迷惑，可以参考我写的这篇 Medium 文章 **[Implementing custom component decorator](https://medium.com/@maximus.koretskyi/implementing-custom-component-decorator-in-angular-4d037d5a3f0d)** 。

Angular 内部使用了 **视图（view）** 概念，或者说整个框架是一颗视图树。每个视图都是由不同类型的节点（node）组成：元素节点，文本节点等等（注：可查看 **[译 Angular DOM 更新机制](https://juejin.im/post/5ad35b0cf265da2381561347)**）。种个节点都有其专门作用，这样每种节点的处理只需要花很少的时间。此外，每种节点都有与之对应的服务提供商（provider），例如 `ViewContainerRef` 和 `TemplateRef`。还可以使用 `ViewChild/ViewChildren` 和 `ContentChild/ContentChildren` 来查找节点。

每一个节点包含大量信息，为了性能考虑，节点一旦被创建就生效，后面不允许被更改（注：被创建的节点会被缓存起来）。节点生成过程是编译器搜集你写的组件信息（注：主要是你写的组件里的模板信息），并以组件工厂形式封装起来。

假设你写了如下的一个组件：

```ts
@Component({
  selector: 'a-comp',
  template: '<span>A Component</span>'
})
class AComponent {}
```

编译器根据你写的信息，生成类似如下的组件工厂代码，代码只包含重要部分（注：下面整个代码可理解为**视图**，其中 `elementDef2` 和 `jit_textDef3` 可理解为**节点**）：

```ts
function View_AComponent_0(l) {
  return jit_viewDef1(0,[
      elementDef2(0,null,null,1,'span',...),
      jit_textDef3(null,['My name is ',...])
    ]
```

上面代码基本描述了组件视图的结构，并在实例化组件时使用。其中，第一个节点 `elementDef2` 就是元素节点定义，第二个节点 `jit_textDef3` 就是文本节点定义。你可以看到每一个节点都有足够的参数信息来实例化，而这些参数信息是编译器解析所有依赖生成的，并且在运行时由框架提供这些依赖的具体值。

从上文知道，如果你能够访问到组件工厂，就可以使用它实例化出对应的组件对象，并使用 **[ViewContainerRef](https://angular.io/api/core/ViewContainerRef)** API 把该组件/视图插入 DOM 中。如果你对 `ViewContainerRef` 感兴趣，可以查看 **[译 探索 Angular 使用 ViewContainerRef 操作 DOM](https://juejin.im/post/5ab09a49518825557005d805)**。应该如何使用这个 API 呢（注：下面代码展示如何使用 `ViewContainerRef` API 往视图树上插入一个视图）：

```ts
export class SampleComponent implements AfterViewInit {
    @ViewChild("vc", {read: ViewContainerRef}) vc: ViewContainerRef;

    ngAfterViewInit() {
        this.vc.createComponent(componentFactory);
    }
}
```

好的，从上面代码可知道只要拿到组件工厂，一切问题就解决了。现在，问题是如何拿到 **[ComponentFactory](https://github.com/angular/angular/blob/master/packages/core/src/linker/component_factory.ts#L70)** 组件工厂对象，继续看。

## 模块（Modules）和组件工厂解析器（ComponentFactoryResolver）
尽管 AngularJS 也有模块，但它缺少指令所需要的真正的命名空间，并且会有潜在的命名冲突，还没法在单独的模块里封装指令。然而，很幸运，Angular 吸取了教训，为各种声明式类型，如指令、组件和管道，提供了合适的命名空间（注：即 Angular 提供的 `Module`，使用装饰器函数 `@NgModule` 装饰一个类就能得到一个 `Module`）。

就像 AngularJS 那样，Angular 中的组件是被封装在模块中。组件自己并不能独立存在，如果你想要使用另一个模块的一个组件，你必须导入这个模块：

```ts
@NgModule({
    // imports CommonModule with declared directives like
    // ngIf, ngFor, ngClass etc.
    imports: [CommonModule],
    ...
})
export class SomeModule {}
```

同样道理，如果一个模块想要提供一些组件给别的模块使用，就必须导出这些组件，可以查看 `exports` 属性。比如，可以查看 `CommonModule` 源码的做法（注：查看 **[L24-L25](https://github.com/angular/angular/blob/master/packages/common/src/common_module.ts#L24-L25)**）：

```ts
const COMMON_DIRECTIVES: Provider[] = [
    NgClass,
    NgComponentOutlet,
    NgForOf,
    NgIf,
    ...
];

@NgModule({
    declarations: [COMMON_DIRECTIVES, ...],
    exports: [COMMON_DIRECTIVES, ...],
    ...
})
export class CommonModule {
}
```

所以每一个组件都是绑定在一个模块里，并且不能在不同模块里申明同一个组件，如果你这么做了，Angular 会抛出错误：

```
Type X is part of the declarations of 2 modules: ...
```

当 Angular 编译程序时，编译器会把在模块中 `entryComponents` 属性注册的组件，或模板里使用的组件编译为组件工厂（注：在所有静态模板中使用的组件如 `<a-comp></a-comp>`，即静态组件；在 `entryComponents` 定义的组件，即动态组件，动态组件的一个最佳示例如 **[Angular Material Dialog](https://material.angular.io/components/dialog/overview#configuring-dialog-content-via-code-entrycomponents-code-)** 组件，可以在 `entryComponents` 中注册 `DialogContentComp` 组件动态加载对话框内容）。你可以在 `Sources` 标签里看到编译后的组件工厂文件：

![Component Factory](https://cdn-images-1.medium.com/max/800/1*9dwvGfdtqn8hH1G1QhTK4w.jpeg)

从上文中我们知道，如果我们能拿到组件工厂，就可以使用组件工厂创建对应的组件对象，并插入到视图里。实际上，每一个模块都为所有组件提供了一个获取组件工厂的服务 **[ComponentFactoryResolver](https://angular.io/api/core/ComponentFactoryResolver)**。所以，如果你在模块中定义了一个 `BComponent` 组件并想要拿到它的组件工厂，你可以在这个组件内注入这个服务并使用它：

```ts
export class AppComponent {
  constructor(private resolver: ComponentFactoryResolver) {
    // now the `factory` contains a reference to the BComponent factory
    const factory = this.resolver.resolveComponentFactory(BComponent);
  }
```

这是在两个组件 `AppComponent` 和 `BComponent` 都定义在一个模块里才行，或者导入其他模块时该模块已经有组件 `BComponent` 对应的组件工厂。


## 动态加载和编译模块
但是如果组件在其他模块定义，并且这个模块是按需加载，这样的话是不是完蛋了呢？实际上我们照样可以拿到某个组件的组件工厂，方法同路由使用 `loadChildren` 配置项按需加载模块很类似。

**有两种方式可以在运行时加载模块**。**第一种方式** 是使用 **[SystemJsNgModuleLoader](https://angular.io/api/core/SystemJsNgModuleLoader)** 模块加载器，如果你使用 SystemJS 加载器的话，路由在加载子路由模块时也是用的 `SystemJsNgModuleLoader` 作为模块加载器。`SystemJsNgModuleLoader` 模块加载器有一个 `load` 方法来把模块加载到浏览器里，同时编译该模块和在该模块中申明的所有组件。`load` 方法需要传入文件路径参数，并加上导出模块的名称，返回值是 **[NgModuleFactory](https://angular.io/api/core/NgModuleFactory)**：

```ts
loader.load('path/to/file#exportName')
```
> 注：**[NgModuleFactory](https://github.com/angular/angular/blob/master/packages/core/src/linker/ng_module_factory.ts#L60)** 源码是在 `packages/core/linker` 文件夹内，该文件夹里的代码主要是`粘合剂`代码，主要都是一些接口类供 `Core` 模块使用，具体实现在其他文件夹内。

如果没有指定具体的导出模块名称，加载器会使用默认关键字 `default` 导出的模块名。还需注意的是，想要使用 `SystemJsNgModuleLoader` 还需像这样去注册它：

```ts
providers: [
    {
      provide: NgModuleFactoryLoader,
      useClass: SystemJsNgModuleLoader
    }
  ]
```

你当然可以在 `provide` 里使用任何标识（token），不过路由模块使用 `NgModuleFactoryLoader` 标识，所以最好也使用相同 `token`。（注：`NgModuleFactoryLoader` 注册可查看源码 **[L68](https://github.com/angular/angular/blob/master/packages/router/src/router_module.ts#L68)**，使用可查看 **[L78](https://github.com/angular/angular/blob/master/packages/router/src/router_preloader.ts#L78)**）

模块加载并获取组件工厂的完整代码如下：

```ts
@Component({
  providers: [
    {
      provide: NgModuleFactoryLoader,
      useClass: SystemJsNgModuleLoader
    }
  ]
})
export class ModuleLoaderComponent {
  constructor(private _injector: Injector,
              private loader: NgModuleFactoryLoader) {
  }

  ngAfterViewInit() {
    this.loader.load('app/t.module#TModule').then((factory) => {
      const module = factory.create(this._injector);
      const r = module.componentFactoryResolver;
      const cmpFactory = r.resolveComponentFactory(AComponent);
      
      // create a component and attach it to the view
      const componentRef = cmpFactory.create(this._injector);
      this.container.insert(componentRef.hostView);
    })
  }
}
```

但是在使用 `SystemJsNgModuleLoader` 时还有个问题，上面代码的 `load()` 函数内部（注：参见 **[L70](https://github.com/angular/angular/blob/master/packages/core/src/linker/system_js_ng_module_factory_loader.ts#L70)**）其实是使用了编译器的 **[compileModuleAsync](https://angular.io/api/core/Compiler#compileModuleAsync)** 方法，该方法只会为在 `entryComponents` 中注册的或者在组件模板中使用的组件，去创建组件工厂。但是如果你就是不想要把组件注册在 `entryComponents` 属性里，是不是就完蛋了呢？仍然有解决方案 —— 使用 **[compileModuleAndAllComponentsAsync](https://angular.io/api/core/Compiler#compileModuleAndAllComponentsAsync)** 方法自己去加载模块。该方法会为模块里所有组件生成组件工厂，并返回 `ModuleWithComponentFactories` 对象：

```ts
class ModuleWithComponentFactories<T> {
    componentFactories: ComponentFactory<any>[];
    ngModuleFactory: NgModuleFactory<T>;
```

下面代码完整展示如何使用该方法加载模块并获取所有组件的组件工厂（注：这是上面说的 **第二种方式**）：

```ts
ngAfterViewInit() {
  System.import('app/t.module').then((module) => {
      _compiler.compileModuleAndAllComponentsAsync(module.TModule)
        .then((compiled) => {
          const m = compiled.ngModuleFactory.create(this._injector);
          const factory = compiled.componentFactories[0];
          const cmp = factory.create(this._injector, [], null, m);
        })
    })
}
```

然而，记住，这个方法使用了编译器的私有 API，下面是源码中的 **[文档说明](https://github.com/angular/angular/blob/master/docs/PUBLIC_API.md)**：

> One intentional omission from this list is `@angular/compiler`, which is currently considered a low level api and is subject to internal changes. These changes will not affect any applications or libraries using the higher-level apis (the command line interface or JIT compilation via `@angular/platform-browser-dynamic`). Only very specific use-cases require direct access to the compiler API (mostly tooling integration for IDEs, linters, etc). If you are working on this kind of integration, please reach out to us first.


## 运行时动态创建组件
从上文中我们知道如何通过模块中的组件工厂来动态创建组件，其中模块是在运行时之前定义的，并且模块是可以提前或延迟加载的。但是，也可以不需要提前定义模块，可以像 AngularJS 的方式在运行时创建模块和组件。

首先看看上文中的 AngularJS 的代码是如何做的：

```ts
const template = '<span>generated on the fly: {{name}}</span>'
const linkFn = $compile(template);
const dataModel = $scope.$new();
dataModel.name = 'dynamic'

// link data model to a template
linkFn(dataModel);
```

从上面代码可以总结动态创建视图的一般流程如下：

1. 定义组件类及其属性，并使用装饰器装饰组件类
2. 定义模块类，在模块类中申明组件类，并使用装饰器装饰模块类
3. 编译模块和模块中所有组件，拿到所有组件工厂

模块类也仅仅是带有模块装饰器的普通类，组件类也同样如此，而由于装饰器也仅仅是简单地函数而已，在运行时可用，所以只要我们需要，就可以使用这些装饰器如 `@NgModule()/@Component()` 去装饰任何类。下面代码完整展示如何动态创建组件：

```ts
@ViewChild('vc', {read: ViewContainerRef}) vc: ViewContainerRef;

constructor(private _compiler: Compiler,
            private _injector: Injector,
            private _m: NgModuleRef<any>) {
}

ngAfterViewInit() {
  const template = '<span>generated on the fly: {{name}}</span>';

  const tmpCmp = Component({template: template})(class {
  });
  const tmpModule = NgModule({declarations: [tmpCmp]})(class {
  });

  this._compiler.compileModuleAndAllComponentsAsync(tmpModule)
    .then((factories) => {
      const f = factories.componentFactories[0];
      const cmpRef = this.vc.createComponent(tmpCmp);
      cmpRef.instance.name = 'dynamic';
    })
}
```

为了更好的调试信息，你可以使用任何类来替换上面代码中的匿名类。


## Ahead-of-Time Compilation
上文中说到的编译器说的是 Just-In-Time(JIT) 编译器，你可能听说过 Ahead-of-Time(AOT) 编译器，实际上 Angular 只有一个编译器，它们仅仅是根据编译器使用在不同阶段，而采用的不同叫法。如果编译器是被下载到浏览器里，在运行时使用就叫 JIT 编译器；如果是在编译阶段去使用，而不需要下载到浏览器里，在编译时使用就叫 AOT 编译器。使用 AOT 方法是被 Angular 官方推荐的，并且官方文档上有详细的 **[原因解释](https://angular.io/guide/aot-compiler#why-compile-with-aot)** —— 渲染速度更快并且代码包更小。

如果你使用 AOT 的话，意味着运行时不存在编译器，那上面的不需要编译的示例仍然有效，仍然可以使用 `ComponentFactoryResolver` 来做，但是动态编译需要编译器，就没法运行了。但是，如果非得要使用动态编译，那就得把编译器作为开发依赖一起打包，然后代码被下载到浏览器里，这样做需要点安装步骤，不过也没啥特别的，看看代码：

```ts
import { JitCompilerFactory } from '@angular/compiler';

export function createJitCompiler() {
  return new JitCompilerFactory([{
    useDebug: false,
    useJit: true
  }]).createCompiler();
}

import { AppComponent }  from './app.component';

@NgModule({
  providers: [{provide: Compiler, useFactory: createJitCompiler}],
  ...
})
export class AppModule {
}
```

上面代码中，我们使用 `@angular/compiler` 的 `JitCompilerFactory` 类来实例化出一个编译器工厂，然后通过标识 `Compiler` 来注册编译器工厂实例。以上就是所需要修改的全部代码，就这么点东西需要修改添加，很简单不是么。

## 组件销毁
如果你使用动态加载组件方式，最后需要注意的是，当父组件销毁时，该动态加载组件需要被销毁：

```ts
ngOnDestroy() {
  if(this.cmpRef) {
    this.cmpRef.destroy();
  }
}
```

上面代码将会从视图容器里移除该动态加载组件视图并销毁它。

## ngOnChanges
对于所有动态加载的组件，Angular 会像对静态加载组件一样也执行变更检测，这意味着 `ngDoCheck` 也同样会被调用（注：可查看 Medium 这篇文章 **[If you think ngDoCheck means your component is being checked — read this article](https://blog.angularindepth.com/if-you-think-ngdocheck-means-your-component-is-being-checked-read-this-article-36ce63a3f3e5)**）。然而，就算动态加载组件申明了 `@Input` 输入绑定，但是如果父组件输入绑定属性发生改变，该动态加载组件的 `ngOnChanges` 不会被触发。这是因为这个检查输入变化的 `ngOnChanges` 函数，只是在编译阶段由编译器编译后重新生成，该函数是组件工厂的一部分，编译时是根据模板信息编译生成的。因为动态加载组件没有在模板中被使用，所以该函数不会由编译器编译生成。

## Github
本文的所有示例代码存放在 **[Github](https://github.com/maximusk/Here-is-what-you-need-to-know-about-dynamic-components-in-Angular)**。

> 注：本文主要讲了组件 `b-comp` 如何动态加载组件 `a-comp`，如果两个在同一个 `module`，直接调用 **[ComponentFactoryResolver](https://github.com/angular/angular/blob/master/packages/core/src/linker/component_factory_resolver.ts#L39)** 等 API 就行；如果不在同一个 `module`，就使用 **[SystemJsNgModuleLoader](https://angular.io/api/core/SystemJsNgModuleLoader)** 模块加载器就行。


