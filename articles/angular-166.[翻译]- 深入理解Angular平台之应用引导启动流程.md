# 深入理解Angular平台之应用启动流程

[原文链接](https://medium.com/angular-in-depth/angular-platforms-in-depth-part-2-application-bootstrap-process-8be461b4667e)

原作者:[
Nikita Poltoratsky
](https://twitter.com/NikPoltoratsky)

译者:[尊重](https://www.zhihu.com/people/yiji-yiben-ming/posts)

Angular 框架的设计初衷是将其打造成一个独立平台。这样的设计思路确保了 Angular 应用可以正常地跨环境执行 -  无论是在浏览器，服务端，web-worker 甚至是在移动设备上。

在这一系列文章中，我们将揭示 Angular 应用跨平台执行的奥秘。我们还会学习如果创建自定义 Angular 平台，该平台可以在系统命令终端中，使用 ASCII 图像工具渲染应用。

系列文章：

- [Angular Platforms in depth. Part 1. 什么是 Angular Platforms](https://blog.angularindepth.com/angular-platforms-in-depth-part-1-what-are-angular-platforms-9919d45f3054)
- Angular Platforms in depth. Part 2. 应用启动流程
- [Angular Platforms in depth. Part 3. 在命令行终端中渲染 Angular 应用](https://medium.com/angular-in-depth/angular-platforms-in-depth-part-3-rendering-angular-applications-in-terminal-117e4da9c0cc)

![](../assets/angular-166/1.jpeg)

每一个 Angular 应用都以 `main.ts` 文件作为起点：

```typescript
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { PlatformRef } from '@angular/core';
 
 
// Create Browser Platform
const platformRef: PlatformRef = platformBrowserDynamic();
 
// Bootstrap Application
platformRef.bootstrapModule(AppModule);
```

上述代码中，我们创建了一个 `PlatformRef` 的新实例，并调用了它的 `bootstrapModule` 方法。这就是 Angular 应用启动的起点。在本文中，我们将深入理解 Angular 应用的引导启动过程。

> 如果你希望了解更多有关 什么是 Angular platforms 以及 Angular platforms 的创建过程，请阅读本系列的上一篇文章：[深入理解Angular平台之什么是Angular平台](https://blog.angularindepth.com/angular-platforms-in-depth-part-1-what-are-angular-platforms-9919d45f3054)

如上所述，每一个 Angular 应用的启动都来自于下面这一句函数调用：

```typescript
platformRef.bootstrapModule(AppModule) 
```

下面是 `bootstrapModule` 方法的代码：

```typescript
bootstrapModule<M>(
    moduleType: Type<M>,
    compilerOptions: (CompilerOptions & BootstrapOptions) | Array<CompilerOptions & BootstrapOptions> = [],
  ): Promise<NgModuleRef<M>> {

    const options = optionsReducer({}, compilerOptions);

    return compileNgModuleFactory(this.injector, options, moduleType)
      .then(moduleFactory => {

        const ngZoneOption = options ? options.ngZone : undefined;
        const ngZone = getNgZone(ngZoneOption);

        const providers: StaticProvider[] = [{ provide: NgZone, useValue: ngZone }];

        return ngZone.run(() => {

          const ngZoneInjector = Injector.create(
            { providers: providers, parent: this.injector, name: moduleFactory.moduleType.name });

          const moduleRef = <InternalNgModuleRef<M>>moduleFactory.create(ngZoneInjector);

          const exceptionHandler: ErrorHandler = moduleRef.injector.get(ErrorHandler, null);

          if (!exceptionHandler) {
            throw new Error('No ErrorHandler. Is platform module (BrowserModule) included?');
          }

          const localeId = moduleRef.injector.get(LOCALE_ID, DEFAULT_LOCALE_ID);
          setLocaleId(localeId);

          moduleRef.onDestroy(() => remove(this._modules, moduleRef));

          ngZone !.runOutsideAngular(
            () => ngZone !.onError.subscribe(
              {
                next: (error: any) => {
                  exceptionHandler.handleError(error);
                },
              }));

          return _callAndReportToErrorHandler(exceptionHandler, ngZone !, () => {
            const initStatus: ApplicationInitStatus = moduleRef.injector.get(ApplicationInitStatus);
            initStatus.runInitializers();
            return initStatus.donePromise.then(() => {
              this._moduleDoBootstrap(moduleRef);
              return moduleRef;
            });
          });
        });
      });
  }
```

让我们逐步讨论其中的内容。

## 内容清单

- Module Compilation
- Root NgZone
- Error handling
- Initializers
- Bootstrap components

## Module Compilation

应用引导启动流程中的第一步是模块编译。

```typescript
bootstrapModule<M>(moduleType: Type<M>, options: CompilerOptions): Promise<NgModuleRef<M>> {
  return compileNgModuleFactory(this.injector, options, moduleType)
    .then((moduleFactory: NgModuleFactory) => {
  
      // ...
    });
}
```

首先，我们调用了 `PlatformRef` 的 `bootstrapModule(AppModule, options)` 函数。在此处，`moduleType` 指向 `AppModule`。injector 只是通过构造器所注入的 `Injector` 实例。options 是编译参数，其作为第二个参数传入到 `bootstrapModule` 方法中。

让我们深入到 `compileNgModuleFactory` 方法的细节中了解更多有关模块编译的过程。

```typescript
function compileNgModuleFactory<M>(
  injector: Injector,
  options: CompilerOptions,
  moduleType: Type<M>
  ): Promise<NgModuleFactory<M>> {
  
  const compilerFactory: CompilerFactory = injector.get(CompilerFactory);
  const compiler = compilerFactory.createCompiler([options]);
  return compiler.compileModuleAsync(moduleType);
}
```

首先，Angular 从 injector 那里获取 `CompilerFactory` 的实例。`CompilerFactory` 是一个抽象类，负责创建 `Compiler` 实例。举例来说，当我们以 dev 模式启动 Angular 应用时，`JitCompilerFactory` 则是对 `CompilerFactory` 这个抽象类的实现。`JitCompilerFactory` 将调用 `compilerFactory.createCompiler()` 函数生成 `Compiler`。最后，`Compiler` 将会用于编译 `AppModule`。

```typescript
export class JitCompiler {
  
  private compileModuleAsync(moduleType: Type): Promise<NgModuleFactory> {
  
    return this._loadModules(moduleType)
      .then(() => {
        this._compileComponents(moduleType);
        return this._compileModule(moduleType);
      });
  }
}
```

此时，Angular 加载所有模块，指令和管道的元数据。之后，Angular 编译所有组件。在编译组件的阶段，Angular 搜索所有注册在应用中的组件元数据，并要求编译器“就地”编译所有组件的模板。最后需要做的是编译应用的 root module。在这个阶段中，Angular 将解析所有模块所需的元数据并返回模块 factory。

当模块编译完成时，`PlatformRef` 就拥有了 moduleFactory 可以触发引导启动流程了。


## Root NgZone

在真正启动 Angular 应用前，`PlatformRef` 需要创建一个 root `NgZone`。

```typescript
const ngZone = new NgZone();

ngZone.run(() => {
  
  const moduleRef = moduleFactory.create(this.injector);
  // The rest bootstrap logic
});
```

root `NgZone` 必须在 `AppModule` 创建前被初始化，因为我们需要将所有应用的逻辑封装在 zone 中。与此同时，在 Angular 模块创建的过程中可能会“积极地”创建某些 providers，所以 root module 的创建逻辑也需要封装进 zone 中。

只有当 root `NgZone` 创建后，`PlatformRef` 才可以通过 模块编译过程生成的 root module factory 初始化 root module。

## Error handling

当 root `NgZone` 完成创建， root module 完成初始化之后，是时候设置全局错误处理器了：

```typescript
// Get error handler from injector
const exceptionHandler: ErrorHandler = injector.get(ErrorHandler);
 
// Setup error handling outside Angular
// To make sure change-detection will not be triggered
zone.runOutsideAngular(
 
  // Subscribe on zone errors
  () => zone.onError.subscribe({
    next: (error: any) => {
 
      // Call error handler
      exceptionHandler.handleError(error);
    }
  })
);
```

在 Angular 中， `ErrorHandler` 负责正确地记录错误和处理错误。为了设置 `ErrorHandler`, `PlatformRef` 需要从 injector 中获取其所提供的 `ErrorHandler`。之后，从 root zone 中订阅 error stream 并调用 `handleError` 方法对每一个错误事件作出响应。

需要注意的是，所有的错误处理逻辑都被封装在 `zone.runOutsideAngular` 函数中。该函数确保所有于该函数中运行的代码永远不会触发变更检测。

## Initializers

完成对 `ErrorHandler` 的配置后，是时候运行应用初始化工具了。

```typescript
const initStatus: ApplicationInitStatus = moduleRef.injector.get(ApplicationInitStatus);
initStatus.runInitializers().then(() => {
  // ...
});
```

Angular 使用 `ApplicationInitStatus` entity 去运行应用的初始化工具。应用初始化工具只是一个函数，其执行需要在应用的引导启动前完成。举例来说，web worker platform 拥有下述初始化工具：

```typescript
{provide: APP_INITIALIZER, useValue: setupWebWorker, multi: true}
```

应用的初始化工具只是包含 `APP_INITIALIZER` token 的函数。所有的 `APP_INITIALIZER` token 使用下述方式注入到 `ApplicationInitStatus` 中：

```typescript
constructor(@Inject(APP_INITIALIZER) private appInits: (() => any)[]) {
```

当 `runInitializers` 函数被调用时，将会执行所有的 app 初始化工具并使用 `Promise.all()` 统一返回所有的结果。

## Bootstrap components

在这个阶段里，`PlatformRef` 和其他内容已经准备就绪，可以真正意义上引导启动 `AppComponent` 了。如果你还记得的话，我们已经展示了 root module 实例的创建过程：

```typescript
const moduleRef = moduleFactory.create(this.injector);
```

每一个 root module 都必须包含引导启动的组件数组：

```typescript
@NgModule({
  bootstrap: [AppComponent],
})
export class AppModule {}
```

`PlatformRef` 将会遍历引导启动组件数组并调用 `ApplicationRef` 去实际引导启动每个组件：

```typescript
const appRef = injector.get(ApplicationRef);

moduleRef._bootstrapComponents.forEach(f => appRef.bootstrap(f));
```

`ApplicationRef` 的内部动作只是创建和渲染组件：

```typescript
const componentFactory =
  this._componentFactoryResolver.resolveComponentFactory(component);
  
const compRef = componentFactory.create();
```

如果你曾经动态创建过 Angular 组件的话，上述代码对你而言肯定不陌生。通过上述代码，可以了解如何使用 `ComponentFactoryResolver`：通过 `componentFactory` 去解析 `AppComponent` 并创建 `AppComponent`。

成功啦！在最终阶段，我们将 `AppComponent` 渲染在屏幕上，并依次将应用的剩余部分全部渲染出来。

## 结论

恭喜，你已经抵达这篇文章的末尾了。在本文中，我们讨论了 Angular 应用的引导启动流程。现在起我们已经具备了所有所需的知识，下一步就可以开始构建我们的自定义 platform，使用 ASCII 图像工具在系统终端中渲染 Angular 应用了。

如果你希望了解更多有关 Angular platforms 的知识，还请阅读后续的系列文章

- [Angular Platforms in depth. Part 1. 什么是 Angular Platforms](https://blog.angularindepth.com/angular-platforms-in-depth-part-1-what-are-angular-platforms-9919d45f3054)
- Angular Platforms in depth. Part 2. 应用启动流程
- [Angular Platforms in depth. Part 3. 在命令行终端中渲染 Angular 应用](https://medium.com/angular-in-depth/angular-platforms-in-depth-part-3-rendering-angular-applications-in-terminal-117e4da9c0cc)

别忘了，在 [twitter](https://twitter.com/NikPoltoratsky) 上粉我一下，你会在第一时间获得有关 Angular 文章的通知。