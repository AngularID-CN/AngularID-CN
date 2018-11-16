# [译] 如何手动启动 Angular 程序
> 原文链接：**[How to manually bootstrap an Angular application
](https://blog.angularindepth.com/how-to-manually-bootstrap-an-angular-application-9a36ccf86429)**

Angular 官方文档写到，为了启动 Angular 程序，必须在 `main.ts` 文件里写上如下代码：

```ts
platformBrowserDynamic().bootstrapModule(AppModule);
```

这行代码 `platformBrowserDynamic()` 是为了构造一个 **[`platform`](https://angular.io/api/core/PlatformRef)**，Angular 官方文档对 `platform` 的定义是（译者注：为清晰理解，`platform` 定义不翻译）：

> the entry point for Angular on a web page. Each page has exactly one platform, and services (such as reflection) which are common to every Angular application running on the page are bound in its scope.

同时，Angular 也有 **[运行的程序实例（running application instance）](https://angular.io/api/core/ApplicationRef)**的概念，你可以使用 `ApplicationRef` 标记（token）作为参数注入从而获取其实例。上文的 `platform` 定义也隐含了一个 `platform` 可以拥有多个 `application` 对象，而每一个 `application` 对象是通过 `bootstrapModule` 构造出来的，构造方法就像上文 `main.ts` 文件中使用的那样。所以，上文的 `main.ts` 文件中代码，首先构造了一个 `platform` 对象和一个 `application` 对象。

> 译者注：
```sequence
Platform->Application:Many
Application->AppModule:bootstrapModule
```

当 `application` 对象被正在构造时，Angular 会去检查模块 `AppModule` 的 `bootstrap` 属性，该模块是用来启动程序的：

```ts
@NgModule({
  imports: [BrowserModule],
  declarations: [AppComponent],
  bootstrap: [AppComponent]
})
export class AppModule {}
```

`bootstrap` 属性通常包含用来启动程序的组件（译者注：即根组件），Angular 会在 DOM 中查询并匹配到该启动组件的选择器，然后实例化该启动组件。

Angular 启动过程隐含了你想要哪一个组件去启动程序，但是如果启动程序的组件是在运行时才被定义的该怎么办呢？当你获得该组件时，又该如何启动程序呢？事实上这是个非常简单的过程。

## NgDoBootstrap
假设我们有 `A` 和 `B` 两个组件，将编码决定运行时使用哪一个组件来启动程序，首先让我们定义这两个组件吧：

```ts
import { Component } from '@angular/core';

@Component({
  selector: 'a-comp',
  template: `<span>I am A component</span>`
})
export class AComponent {}

@Component({
  selector: 'b-comp',
  template: `<span>I am B component</span>`
})
export class BComponent {}
```

然后在 `AppModule` 中注册这两个组件：

```ts
@NgModule({
  imports: [BrowserModule],
  declarations: [AComponent, BComponent],
  entryComponents: [AComponent, BComponent]
})
export class AppModule {}
```

注意，这里因为我们得自定义启动程序，从而没有在 `bootstrap` 属性而是 `entryComponents` 属性中注册这两个组件，并且通过在 `entryComponents` 注册组件，Angular 编译器（译者注：Angular 提供了 **[`@angular/compiler`](https://github.com/angular/angular/blob/master/packages/compiler/index.ts)** 包用来编译我们写的 angular 代码，同时还提供了 **[`@angular/compiler-cli`](https://github.com/angular/angular/blob/master/packages/compiler-cli/README.md)** CLI 工具）会为这两个组件创建工厂类（译者注：Angular Compiler 在编译每一个组件时，会首先把该组件类转换为对应的组件工厂类，即 a.component.ts 被编译为 a.component.ngfactory.ts）。因为 Angular 会自动把在 `bootstrap` 属性中注册的组件自动加入入口组件列表，所以通常不需要把根组件注册到 `entryComponents` 属性中。（译者注：即在 `bootstrap` 属性中注册的组件不需要在 `entryComponents` 中重复注册）。

由于我们不知道 `A` 还是 `B` 组件会被使用，所以没法在 `index.html` 中指定选择器，所以 `index.html` 看起来只能这么写（译者注：我们不知道服务端返回的是 `A` 还是 `B` 组件信息）：

```html
<body>
  <h1 id="status">
     Loading AppComponent content here ...
  </h1>
</body>
```

如果此时运行程序会有如下错误：

> The module AppModule was bootstrapped, but it does not declare “@NgModule.bootstrap” components nor a “ngDoBootstrap” method. Please define one of these

错误信息告诉我们， Angular 在向抱怨我们没有指定具体使用哪一个组件来启动程序，但是我们的确不能提前知道（译者注：我们不知道服务端何时返回什么）。等会儿我们得手动在 `AppModule` 类中添加 `ngDoBootstrap` 方法来启动程序：

```ts
export class AppModule {
  ngDoBootstrap(app) {  }
}
```

Angular 会把 [`ApplicationRef`](https://angular.io/api/core/ApplicationRef) 作为参数传给 `ngDoBootstrap`（译者注：参考 Angular 源码中[这一行](https://github.com/angular/angular/blob/master/packages/core/src/application_ref.ts#L283)），等会准备启动程序时，使用 `ApplicationRef` 的 `bootstrap` 方法初始化根组件。

让我们写一个自定义方法 `bootstrapRootComponent` 来启动根组件：

```ts
// app - reference to the running application (ApplicationRef)
// name - name (selector) of the component to bootstrap
function bootstrapRootComponent(app, name) {
  // define the possible bootstrap components 
  // with their selectors (html host elements)
  // （译者注：定义从服务端可能返回的启动组件数组）
  const options = {
    'a-comp': AComponent,
    'b-comp': BComponent
  };
  // obtain reference to the DOM element that shows status
  // and change the status to `Loaded` 
  //（译者注：改变 id 为 #status 的内容）
  const statusElement = document.querySelector('#status');
  statusElement.textContent = 'Loaded';
  // create DOM element for the component being bootstrapped
  // and add it to the DOM
  // （译者注：创建一个 DOM 元素）
  const componentElement = document.createElement(name);
  document.body.appendChild(componentElement);
  // bootstrap the application with the selected component
  const component = options[name];
  app.bootstrap(component); // （译者注：使用 bootstrap() 方法启动组件）
}
```

传入该方法的参数是 `ApplicationRef` 和启动组件的名称，同时定义变量 `options` 来映射所有可能的启动组件，并以组件选择器作为 key，当我们从服务器中获取所需要信息后，再根据该信息查询是哪一个组件类。

先构建一个 `fetch` 方法来模拟 `HTTP` 请求，该请求会在 2 秒后返回 `B` 组件选择器即 `b-comp` 字符串：

```ts
function fetch(url) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve('b-comp');
    }, 2000);
  });
}
```

现在我们拥有 `bootstrap` 方法来启动组件，在 `AppModule` 模块的 `ngDoBootstrap` 方法中使用该启动方法吧：

```ts
export class AppModule {
  ngDoBootstrap(app) {
    fetch('url/to/fetch/component/name')
      .then((name)=>{ this.bootstrapRootComponent(app, name)});
  }
}
```

这里我做了个 [stackblitz demo](https://stackblitz.com/edit/angular-h312t4) 来验证该解决方法。（译者注：译者把该作者 demo 中 angular 版本升级到最新版本 5.2.9，可以查看 **[angular-bootstrap-process](https://stackblitz.com/edit/angular-bootstrap-process?file=main.ts)**，2 秒后会根据服务端返回信息自定义启动 `application`）

## 在 AOT 中能工作么？
当然可以，你仅仅需要预编译所有组件，并使用组件的工厂类来启动程序：

```ts
import {AComponentNgFactory, BComponentNgFactory} from './components.ngfactory.ts';
@NgModule({
  imports: [BrowserModule],
  declarations: [AComponent, BComponent]
})
export class AppModule {
  ngDoBootstrap(app) {
    fetch('url/to/fetch/component/name')
      .then((name) => {this.bootstrapRootComponent(app, name);});
  }
  bootstrapRootComponent(app, name) {
    const options = {
      'a-comp': AComponentNgFactory,
      'b-comp': BComponentNgFactory
    };
    ...
```


记住我们不需要在 `entryComponents` 属性中注册组件，因为我们已经有了组件的工厂类了，没必要再通过 Angular Compiler 去编译组件获得组件工厂类了。（译者注：`components.ngfactory.ts` 是由 **[Angular AOT Compiler](https://angular.io/guide/aot-compiler)** 生成的，最新 Angular 版本 在 CLI 里隐藏了该信息，在内存里临时生成 **xxx.factory.ts** 文件，不像之前版本可以通过指令物理生成这中间临时文件，保存在硬盘里。）

