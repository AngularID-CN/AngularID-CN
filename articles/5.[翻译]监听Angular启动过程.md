# [译] 监听 Angular 启动过程

> 原文链接： **[Hooking into the Angular bootstrap process](https://blog.angularindepth.com/hooking-into-the-angular-bootstrap-process-36e82a01fba8)**


Angular 提供了一些机制来监听框架初始化过程，本文主要探索如何使用这些机制。

## APP_BOOTSTRAP_LISTENER
可以为 `APP_BOOTSTRAP_LISTENER` 标识注册监听器来监听 Angular 启动过程，比如看看 **[Angular 源码](https://github.com/angular/angular/blob/master/packages/core/src/application_ref.ts#L557)** 里是如何使用的：

```ts
private _loadComponent(componentRef: ComponentRef<any>): void {
    this.attachView(componentRef.hostView);
    this.tick();
    this.components.push(componentRef);
    // Get the listeners lazily to prevent DI cycles.
    const listeners =
        this._injector.get(APP_BOOTSTRAP_LISTENER,[]).concat(this._bootstrapListeners);
    listeners.forEach((listener) => listener(componentRef));
  }
```

这个 `_loadComponent()` 函数会在初始化程序时被调用（译者注：这句可参考 `application_ref.ts` 中 **[L245](https://github.com/angular/angular/blob/master/packages/core/src/application_ref.ts#L245)**，**[L281](https://github.com/angular/angular/blob/master/packages/core/src/application_ref.ts#L281)**， **[L463](https://github.com/angular/angular/blob/master/packages/core/src/application_ref.ts#L463)**，**[L492](https://github.com/angular/angular/blob/master/packages/core/src/application_ref.ts#L492)**），通过观察这个函数不仅知道一个组件是如何被添加到程序里的（译者注：该方法第三行），还能知道对于每一个启动组件，Angular 都会执行使用 `APP_BOOTSTRAP_LISTENER` 标识注册的监听器，并且把该启动组件对象作为参数传入监听器函数中（译者注：该函数第五行）。

这就意味着我们可以使用这些钩子来监听程序启动过程，执行自定义的初始化逻辑，比如 `Router` 模块**[监听启动过程](https://github.com/angular/angular/blob/master/packages/router/src/router_module.ts#L413)**，并执行了一些**[初始化过程](https://github.com/angular/angular/blob/master/packages/router/src/router_module.ts#L365)**。

由于 Angular 把初始化后的启动组件对象作为参数传给回调函数，所以我们可以像这样拿到程序根组件对象 **[ComponentRef](https://angular.io/docs/ts/latest/api/core/index/ComponentRef-class.html)** ：

```ts
import {APP_BOOTSTRAP_LISTENER, ...} from '@angular/core';
@NgModule({
  imports: [BrowserModule, ReactiveFormsModule, TasksModule],
  declarations: [AppComponent, BComponent, AComponent, SComponent, LiteralsComponent],
  providers: [{
    provide: APP_BOOTSTRAP_LISTENER, 
    multi: true, 
    useFactory: () => {
      return (component: ComponentRef<any>) => {
        console.log(component.instance.title);
      }
    }
  }],
  bootstrap: [AppComponent]
})
export class AppModule {
}
```

在运行完上面代码后，我又查阅了官方文档，文档上是**[这样描述的](https://angular.io/api/core/APP_BOOTSTRAP_LISTENER)**（译者注：为清晰理解，该描述不翻译）：

> All callbacks provided via this token will be called for every component that is bootstrapped. Signature of the callback:
> `(componentRef: ComponentRef) => void`


## APP_INITIALIZER
Angular 也在程序（application）初始化前提供了钩子机制（译者注：Angular 框架有 platform 和 application 概念，Angular 在启动时会先实例化 platform，然后是 application，一个 platform 可以有多个 application，而 platform 可以有 platform-browser、platform-service-worker 或者 platform-server，因为 Angular 框架想做到跨平台，所以它得根据当前运行环境实例化特定的 platform。关于 platform 和 application 实例化过程也可参考 **[如何手动启动 Angular 程序](https://juejin.im/post/5ab53baaf265da23866fd614)**），然后在初始化后就是变更检测和模板渲染过程。这段**[初始化过程步骤](https://github.com/angular/angular/blob/master/packages/core/src/application_init.ts#L33)** 是（译者注：下面源码是在 **[L53](https://github.com/angular/angular/blob/master/packages/core/src/application_init.ts#L53)**）：

```ts
if (this.appInits) {
	 for (let i = 0; i < this.appInits.length; i++) {
	   const initResult = this.appInits[i]();
	   if (isPromise(initResult)) {
	     asyncInitPromises.push(initResult);
	   }
	 }
 }
```

所以，正如我们为 `APP_BOOTSTRAP_LISTENER` 标识做的一样，这里也为 `APP_INITIALIZER` 注册回调函数。比如下面代码让 Angular 初始化延迟 5 秒执行：

```ts
{
  provide: APP_INITIALIZER,
  useFactory: () => {
    return () => {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          resolve();
        }, 5000);
      });
    }
  },
  multi: true
}
```

当然你可以定义多个 `APP_INITIALIZER` 回调函数：

```ts
{
  provide: APP_INITIALIZER,
  useFactory: () => {
    return () => {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          resolve();
        }, 5000);
      });
    }
  },
  multi: true
},
{
  provide: APP_INITIALIZER,
  useFactory: () => {
    return () => {
      return new Promise.resolve(2);
    }
  },
  multi: true
}
```

## BootstrapModule
另外一个可以监听程序启动过程的地方就是使用 `bootstrapModule` 方法：

```ts
platform.bootstrapModule(AppModule).then((module) => {
  let applicationRef = module.injector.get(ApplicationRef);
  let rootComponentRef = applicationRef.components[0];
});
```

这里你可以拿到被启动模块的对象引用 **[NgModuleRef](https://angular.io/docs/ts/latest/api/core/index/NgModuleRef-class.html)** ，并通过该对象拿到 **[ApplicationRef](https://angular.io/docs/ts/latest/api/core/index/ApplicationRef-class.html#)** 和 **[ComponentRef](https://angular.io/docs/ts/latest/api/core/index/ComponentRef-class.html)** 。


