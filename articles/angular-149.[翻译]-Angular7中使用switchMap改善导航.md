# [翻译]-Angular7中使用switchMap改善导航

> 原文链接: **[Improved Navigation in Angular 7 with switchMap](https://blog.angularindepth.com/new-in-angular-7-better-navigations-79267db452c0)**
> 
> 原文作者: **[Nate Lapinski](https://blog.angularindepth.com/@natelapinski)**
> 
> 译者: **[Sunny Liu](https://segmentfault.com/u/lx1036/articles)**；校对者：**[尊重](https://github.com/sawyerbutton)**

![Pushing Devils](../assets/angular-149/1.jpeg)

> 注：想要看看 RxJS 的 **switchMap** 操作符的神奇之处，以及其如何被 Angular 路由器神奇般的使用，可以深入研究本文提到的这个 PR **[#25740](https://github.com/angular/angular/commit/b7baf632c0161692f15d13f718329ab54a0f938a)**。

由于 PR **[#25740](https://github.com/angular/angular/commit/b7baf632c0161692f15d13f718329ab54a0f938a)**，所有由 Angular 路由器所执行的导航被合并为一个 observable 流，导致任意时刻只存在一个有效的导航。这个改动会让会让导航更快更容易预测。虽然这些主要是内部的更改，但它们确实会影响我们对于应用程序中的导航和路由的考量。

> 这个 PR 是对路由器之前工作方式的一次大重构。这次重构会带来一系列重大好处，也会是后续工作的基石。

这些修正和重构的内容随着 Angular 7.0 一起发布，在本文中，我们将检查这些变化的部分并了解如何使用它们。我们也将看到 `switchMap` 操作符如何实现任意时刻强制只存在一个导航的功能。

## 理解导航

当 URL 发生变化时，就会发生一次导航，而这个 URL 变化可能是某种命令式行为触发的（如使用 **[navigate](https://github.com/angular/angular/blob/7.1.4/packages/router/src/router.ts#L841-L869) 服务** 或者 **[navigateByUrl()](https://github.com/angular/angular/blob/7.1.4/packages/router/src/router.ts#L804-L839)**，或者 **[返回 UrlTree 的路由守卫](https://blog.angularindepth.com/new-in-angular-v7-1-updates-to-the-router-fd67d526ad05)**），也可能是用户点击挂载 `[routerLink]` 指令的 DOM 元素触发的。

一旦导航开始，路由器就会依次执行以下几个步骤：

1. 执行重定向
2. 将 URL 与路径匹配
3. 运行路由守卫（Route Guards）和数据预处理器（Resolvers)
4. 渲染组件并更新浏览器状态栏（注：浏览器 **[location](https://developer.mozilla.org/zh-CN/docs/Web/API/Location)** 对象）

**[如果你想详细知道每一步的具体细节，我写了一篇文章解释上述每个阶段的内容。](https://blog.angularindepth.com/angular-router-series-pillar-2-navigation-d050286bf4fa)**

## 现存的问题
在 PR **[#25740](https://github.com/angular/angular/commit/b7baf632c0161692f15d13f718329ab54a0f938a)** 之前，同一时刻运行多个导航的情境是可能发生的。不难想象，这会引发一些诡异的问题。

比如下面这个场景：

* 用户点击 X 连接，启动了 `id` 为1的新导航。
* 在导航到 X 期间，会异步运行路由守卫（Route Guards）和数据预处理器（Resolvers)，这一过程可能需要 10 秒才完成。
* 在这 10 秒内，用户厌倦了等待的过程，点击了 Y 连接，又启动了 `id` 为2的新导航。
* 导航 2 必须等到导航 1 运行完路由守卫（Route Guards）和数据预处理器（Resolvers)完成后才能执行，但实际上导航 1 的这些运行结果又将会被忽略掉。
* 甚至导航 2 在等待过程中，导航 1 的某个路由守卫返回了 false 的结果并对路由进行了重定向，这时就很难估计用户最终会被导航到哪里。

Jason Aden 在 **[AngularConnect 2018 上具体讨论过这个问题](https://www.youtube.com/watch?v=MMPl9wHzmS4&feature=youtu.be&t=1563)**，我建议去瞅瞅他具体说了啥。

总之，不管是在框架内还是框架外，同时管理多个导航是很糟糕的。但是由于 PR **[#25740](https://github.com/angular/angular/commit/b7baf632c0161692f15d13f718329ab54a0f938a)**，现在任何时刻只有一个有效的导航。

这样的修正简化了很多事情，并让导航更容易理解。

## 修改

PR **[#25740](https://github.com/angular/angular/commit/b7baf632c0161692f15d13f718329ab54a0f938a)** 最大的内部修改如下：

* 导航周期内的每一个阶段都由其自身的操作所表示（如重定向、路由识别等等阶段）
* 这些操作符都通过 `switchMap` 运行，这样可以保证只有最新的导航是有效的，并会取消和清除所有正在执行中的导航请求。

## 详细细节

### 一个 map 操作符带来的重大突破

前文提到**任意时刻有且只有一个有效的导航**这个规则是由强大的 `switchMap` 操作符制定的，通过创建单个可观察流并通过 `switchMap` 而不是 `mergeMap` 来管理路由中的所有导航，这样当一个新的导航发生时会取消并清除上一个正在进行中的导航。

> Refactor `switchMap` instead of the previous `mergeMap` to ensure new navigations cause a cancellation and clean up of already running navigations
> --- excerpt from PR 25740
> 重构使用 `switchMap` 而不是之前的 `mergeMap` 操作符，可以保证一旦产生新的导航，就会取消并清除正在执行中的导航请求。

如果你尚不了解到 `switchMap` 的强大，或对其工作原理不了解，我建议你可以阅读 Nicholas Jamieson 有关 `switchMap` 的这篇文章 **    [RxJS: When to Use switchMap](https://blog.angularindepth.com/when-to-use-switchmap-dfe84ac5a1ff)**。

### 自定义操作符

RxJS 的优美之处在于你可以组合已有的操作符（如 map 和 filter），构成新的操作符。自从有了 PR **[#25740](https://github.com/angular/angular/commit/b7baf632c0161692f15d13f718329ab54a0f938a)**，导航周期的不同部分被重构成自定义 RxJS 操作符，代码位于 `[/packages/router/src/operators](https://github.com/angular/angular/tree/master/packages/router/src/operators)`。你可以看到之前提到的导航周期的每一个阶段都是由自定义 RxJS 操作符来表示：

* apply_redirects.ts
* recognize.ts
* check_guards.ts and resolve_data.ts
* activate_routes.ts

从内部而言，导航间的转换是由 `[NavigationTransition](https://github.com/angular/angular/blob/7.1.4/packages/router/src/router.ts#L172-L191)` 类型来表示。一个名为 `router.transitions` 的 `NavigationTransition` 类型的可观察对象与主 `router.navigations` 一起使用用来处理新的导航。这里则是利用 `switchMap` 操作符使得新的导航发生时自动取消当前导航的过程：

```ts
private setupNavigations(transitions: Observable<NavigationTransition>): Observable<NavigationTransition> {
    return transitions.pipe(
        filter(t => t.id !== 0),
        // Extract URL
        map(t => ({...t, extractedUrl: this.urlHandlingStrategy.extract(t.rawUrl)}) as NavigationTransition),
         // Using switchMap so we cancel executing navigations when a new one comes in
        switchMap(t => {
```

如果你查看在 `router.ts` 文件中的 **[setupNavigations](https://github.com/angular/angular/blob/7.1.4/packages/router/src/router.ts#L367-L642)** 函数代码，就能看到整个管道链。

## 好处

由于这些修改，任何新的导航都会自动取消并清除正在执行中的导航请求。这意味着更少的内存泄露，并立即结束废弃导航的路由守卫和数据解析器的运行过程，从而减少时间的花费。在较大的应用中，这些好处确实可以带来变革。

很幸运，这些修改对用户来说是封闭的，你一点都不需要修改你的程序，仅仅需要意识到，现在任意时刻**有且只有**一个活跃的导航执行。

## 总结

PR **[#25740](https://github.com/angular/angular/commit/b7baf632c0161692f15d13f718329ab54a0f938a)** 总共有如下几个修改：

* 任意时刻有且只有一个激活的导航。
* 新的导航被触发时，会取消并清除正在执行中的导航请求。
* 其内部，导航周期的每一个阶段被分割成独立的操作。
* 这些修改会提供更快更可靠的导航。

Happy navigating!