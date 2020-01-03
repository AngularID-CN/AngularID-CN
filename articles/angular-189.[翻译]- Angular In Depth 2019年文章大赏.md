# Angular In Depth 2019年文章大赏

[原文链接](https://indepth.dev/top-15-angular-indepth-articles-of-2019/)

[原作者:Lars Gyrup Brink Nielsen](https://indepth.dev/author/layzee/)

[译者:尊重](https://www.zhihu.com/people/yiji-yiben-ming/posts)

![logo](../assets/angular-189/1.jpg)

2019年度 Angular In Depth 专栏最佳文章大赏。

2019年已经过去，值此之际，作为 Angular In Depth 专栏的主编，非常高兴专栏为各位读者提供了一整年与 Angular 相关高质量有深度的技术文章。非常感谢各位读者的厚爱。

今年也是 Indepth 技术大会首次开展。Indepth 专栏中七个最受欢迎的演讲者在乌克兰基辅开展了为期两天的技术研讨会和工作坊。如果你对会上讨论的内容感兴趣，可以查看[这个链接](https://www.youtube.com/channel/UCfiGD529EyGGA6fbQsl99BQ)。

回顾整个2019年，我们收集了15篇最受读者关注的文章。

文章的主题略有重叠，但是毫无疑问，在整个2019年中，读者们对以下主题最感兴趣：

- Angular version 8， Angular version 9 和 Angular Ivy
- Rxjs
- Angular Components（Angular CDK, Angular Material, 和 components for Google products）
- 动态载入和渲染

继续阅读下面的15篇文章概述，发现属于你的新内容。

## #15：使用 Angular 构建一个可伸缩可拔插的企业级动态应用

[Building an extensible Dynamic Pluggable Enterprise Application with Angular#](https://medium.com/angular-in-depth/building-extensible-dynamic-pluggable-enterprise-application-with-angular-aed8979faba5)

by Alexey Zuev

Angular 社区中有一个具有强烈需求的用例：允许通过运行时配置对 Angular components 进行组装。在 Angular 团队决定不提供官方解决方案的情况下，社区开发人员选择使用 Angular building blocks 和拓展选项实现这一需求。

Alexey 介绍了一种 Angular 视图引擎兼容方案：通过 AOT 编译，在确保不增加 bundle size 的情况下在不同的 Angular 插件模块之间共享
公共依赖，并提供 SSR 支持。这个方案使用的技术之一是自定义的 Angular CLI 构建器。

## #14：Angular Ivy 中的异步模块和组件

[Asynchronous Modules and Components in Angular Ivy](https://indepth.dev/asynchronous-modules-and-components-in-angular-ivy/)

By Artur Androsovych

Actur 探索了使用 Angular Ivy 和 Angular CDK Portal 实现 dynamic ，lazy module 的加载和 动态组件的渲染的相关实现思路。Actur 的探索之路经历了从 Ivy API 的不稳定态到稳定态。

作为结论，通过借助 Ivy 的能力，开发者可以将懒加载组件或者整个功能作为一个入口进行操作，而不再依赖于路由或者 CLI 工作区选项的 `lazyModules`。

## #13：Angular 中的 RxJS

[How to RxJS in Angular](https://medium.com/angular-in-depth/how-to-rxjs-in-angular-1037908e82a5)

By Matthias Meier

在本文中，Matthias 通过一些简单的实例描述了 RxJS 和 Angular 混合使用技巧。相关的技术和用例包括：

- Observable input properties
- Observable DOM events
- 取消已经发出的 HTTP 请求
- 使用 `AsyncPipe` 管理订阅
- 当多个订阅触发时避免重复的 HTTP 请求
- 管理多个订阅时避免内存泄漏

## #12：使用 Angular CDK 实现 Tooltip

[Tooltip with Angular CDK](https://medium.com/angular-in-depth/building-tooltips-for-angular-3cdaac16d138)

By Nikita Poltoratsky

基于使用 Angular CDK 创建 UI 组件库的经验，Nikita 在文中带领我们领略开发 tooltip 指令的全过程。

在本文中将会学到：

- Host listeners
- CDK Overlay
- CDK Portal
- Relative element positioning

## #11：Google Maps 现在是 Angular 组件了

[Google Maps is now an Angular component](https://medium.com/angular-in-depth/google-maps-is-now-an-angular-component-821ec61d2a0)

By Tim Deschryver

Google 开始将其产品作为 Angular Components 项目的内容进行正式发布啦！首先是在 Angular V8.2 版本中发布的 YouTube player。第二个官方的 Google 产品是对 Google Maps JavaScript API 的封装组件。在该文中，Tim 将会在详述以下内容：

- `GoogleMap` 组件
- `MapMarker` 组件
- `MapInfoWindow` 组件

组件的方法，输入属性和输出属性。

Angular Google Maps official package 预计于 Angular V9 版本中一并发布

## #10：Angular 中的 RxJS：何时去订阅？

[RxJS in Angular: When To Subscribe? (Rarely)](https://medium.com/angular-in-depth/when-to-subscribe-a83332ae053)

By Michael Lorton

对于订阅的命令式管理既繁琐又容易出错。在该文中，Michael 讲述了在 Angular 组件和服务中究竟何时才完全需要以手动的方式进行订阅操作。

## #9：重访Angular: 可摇树组件与可选的 NgModules

[Angular revisited: Tree-shakable components and optional NgModules](https://indepth.dev/angular-revisited-tree-shakable-components-and-optional-ngmodules/)

By Lars Gyrup Brink Nielsen

在该文中，Lars 探讨了即将到来的 Angular 依赖注入 API 的变化以及通过实验性 API 利用 Ivy 运行时某种程度上让 Angular modules 变为可选。

该文中介绍了可摇树组件和 SCAMs 的概念。

可摇树组件属于 Angular 组件的功能 wish list，该功能将于未来借助于 Ivy 实现。

SCAMs（Single Component Angular Modules）则是将 module 以安全的方式迁移为可摇树组件的一种方式。

在该文中，还介绍了可传递的模块作用域，以及 Angular 中的声明式依赖是如何连接的。

## #8：写给初学者：Angular 和 NgRx

[How to Start Flying with Angular and NgRx](https://indepth.dev/how-to-start-flying-with-angular-and-ngrx/)

By Andrew Evans

[Goose Weather](https://indepth.dev/top-15-angular-indepth-articles-of-2019/gooseweather.com) 是一个开源的北美天气APP。

Andrew 通过在本地复制和运行 Goose Weather 项目并实现其中的简要用例的方式，带领读者了解 NgRx-store，reducers，actions，selectors 和 effects 的概念。

读者将会以 step by step 的方式领略整个流程，对于初次使用 NgRx 的开发者而言会特别友好。

## #7：努力工作和梦想能带你去何方

[Connecting the dots: where hard work and dreams can lead you](https://medium.com/angular-in-depth/connecting-the-dots-where-hard-work-and-dreams-can-lead-you-2e8ef44096b)

By Max Koretskyi

在最近数年中，Max 通过在 Stack Overflow 上回答问题，在 Angular 领域提供技术文章和演讲的方式提高了自己的专业技能，并让自己的事业得到了巨大的提升。现在他已经获得了 `GDE` 和 `MVP` 的荣誉称号。

这是一个戏剧性的转变，因为几年前，Max 原本已经准备离开科技行业了，因为他难以在其中找到属于自己的热情。但是 Max 最终还是通过 Angular 中找到了适合于他的领域。作为一个新生的框架，只有很少的一部分作者在讨论超出与基础知识之外的内容。

在这过程中，Max 不再迷茫并且在 ag-Grid 找到了一份工作。最重要的是，Max 在其迈向成功的道路上并不是毫无阻碍，但是他从没有停止脚步，永远保持着前进的势头，每周工作超过90个小时，全力投身于其日常工作之外，也持续进行个人的技术提升并贡献开源项目。

感受 Max 是如何成为 Angular 社区中最顶尖的专家之一的旅程，相信会给你带来一些触动。

## #6：准备好：Angular 8 来了

[Brace yourself. Angular 8 is coming#](https://medium.com/angular-in-depth/embrace-yourself-angular-8-is-coming-1bf187c8f0bf)

By Santosh Yadav & Roman Yavoriv

在 Angular 8 发布的前夕，Santosh 和 Roman 联合向社区开发者们介绍了 Angular Version 8 的新功能和特性。

特性包括：

- Differential loading
- SVG templates
- Opt-in Ivy preview
- Opt-in Bazel preview
- Angular CLI builders
- 懒加载的原生动态载入陈述
- 升级 AngularJs 应用时支持 `$location` 服务
- Web Worker支持将密集型任务的处理拆分到单独的线程中
- Service worker improvements
- Reactive forms improvements
- TypeScript 3.4 support
- Server-side rendering performance improvements
- AngularFire 2 deployment builder
- Deprecated APIs
- 破坏性更新：component Query 需要增加 static 选项参数

## #5：四步优化 Angular bundle size

[Optimize Angular bundle size in 4 steps](https://medium.com/angular-in-depth/optimize-angular-bundle-size-in-4-steps-4a3b3737bf45)

By Siyang "Kern" Zhao

4个易于复制的步骤，帮助优化应用的页面加载时间：

1. 确认 bundle size
2. 确保 bundle 使用 Gzip 进行压缩处理
3. 分析最大的 bundle
4. 为 bundle size 设置阈值

Siyang 将他的经验之谈融入文中，并推荐通过控制懒加载 bundle size 的方式作为优化应用性能的下一步方案。

## #4：NG-VDOM：写 Angular 应用的新方式

[Introducing NG-VDOM: A new way to write Angular application](https://medium.com/angular-in-depth/introducing-to-ng-vdom-a-new-way-to-write-angular-application-60a3be805e59)

By "Trotyl" Yu

我们的中国合作伙伴 "Trotyl" Yu 通过 NG-VDOM 将两个世界结合在了一起。通过使用 NG-VDOM 库，开发者可以在 Angular 应用中使用 React，Vue 框架中的 TSX，函数式组件和类组件功能。

在该文中，Trotyl 介绍了 虚拟 DOM 是如何被建模的。读者还将会了解到 Angular 如何暴露 objects 和 collections 的区别，以及在使用 虚拟DOM 时 NG—VDOM 是使用这些区别管理变更检测的方式。

虽然 NG-VDOM 还处于初期阶段，当前能支持的功能还比较有限，但是未来计划中包含许多让人惊喜的功能。

虚拟DOM 在 Angular 项目中有应用场景吗？除了熟悉 React 和 Vue 的开发人员之外，Trotly 提出，当面对复杂和动态和 UI 场景时，NG-VDOM 的编译结果会比常规的 Angular 模板编译结果要精简。

## #3：Angular 中使用 Interceptors 的十种方式

[Top 10 ways to use Interceptors in Angular](https://medium.com/angular-in-depth/top-10-ways-to-use-interceptors-in-angular-db450f8a62d6)

By Michael Karén

Michael 基于其自身经验和 Angular InDepth 专家小组的简易，总结了十个最佳的 Angular HTTP interceptor 用例。

本文首先介绍了 HTTP inteceptors 的基本概念。相关用例则包括： URL 操作，添加 spinners，response conversion 和 mapping，给SRF令牌添加一个 X-Max HTTP header。

在这里卖个关子，推荐读者亲自阅读原文，了解 Angular 中最常用的十个 HTTP interecptors。

## #2：新 Angular 引擎 - Ivy

[All you need to know about Ivy, The new Angular engine!](https://medium.com/angular-in-depth/all-you-need-to-know-about-ivy-the-new-angular-engine-9cde471f42cf)

By Eliran Eliassy

几乎每一个人都很期待即将发布的 Angular Ivy 新一代 renderer，compiler 和 runtime。Ivy 标签已经存在许久了，Angular Version 8 则发布了 Ivy 的 "opt-in preview" 版本。

在文章中，Eliran 通过一些操作探索了解锁 Ivy 后所迸发出的未来设计模式潜力。

Ivy 带来的好处之一是更小的打包体积。 Eliran 使用自己的个人网站作为案例，将 View Engine 替换为 Ivy 之后进行打包，减少了 15% 的打包体积。

为了解释打包体积是如何减少了15%的，Eliran 分别使用 View Engine 和 Ivy compilers 编译一个简单的组件并向读者展示了其中的区别，并引出了一个结论：大多数的 Ivy 运行时代码都是可以摇树优化的。

常规情况下，Angular feature 模块通过懒加载的方式引入，但是通过 Ivy 的实验性功能，开发者能够通过不使用 Angular module 的方式 bootstrap 组件。

这样的方式引出了一个疑问：我们还需要 Angular module 吗？一些于 Angular module 相关的担忧可能通过不使用 Angular module 的方案所抹除。随着 Ivy 的引入，Angular 开发组正在试验将 Angular module 设置为 optional 的思路是否可行。

在文章的最后部分，Eliran 引入了高阶组件的概念：通过使用自定义 class 装饰器向 Angular module-free 组件添加元数据，并添加自定义生命周期钩子。

## #1：在 Angular 应用中取消订阅 RxJS Observable 的最佳方式

[The Best Way To Unsubscribe RxJS Observables In The Angular Applications!](https://medium.com/angular-in-depth/the-best-way-to-unsubscribe-rxjs-observable-in-the-angular-applications-d8f9aa42f6a0)

By Tomas "Trajan"

作为在 2019 年度最受读者欢迎和关注文章，其必然有其独特的魅力。

文章的开头首先简要介绍了 RxJS Observable 的概念，确保所有读者都对 Observable 拥有基本的了解。

之后，则讨论了由未受管理或意外构造的订阅所导致的潜在内存泄漏风险。

取消订阅是非常重要的概念。但是不幸的是，即使在父订阅中 bulk 订阅时，命令式地管理订阅也是非常繁琐和容易出错的。

更具有声明式的方案是将 takeUntil 操作符与生命周期钩子驱动的 subject 结合使用。这个方案一度成为 Stack Overflow 上最多支持的案例，但是事实，这样的方法还是容易出错。

社区也并不是没有尝试过其他操作符，但是每一个操作符都有其需要注意的问题。难道就没有一个简单合理的方案吗？

剩下的部分希望读者自己去探索，最佳的 RxJS Observable 取消订阅方案。

## 2019年度优秀文章

### Michael Karén

1. [Expecting the Unexpected — Best practices for Error handling in Angular](https://medium.com/angular-in-depth/expecting-the-unexpected-best-practices-for-error-handling-in-angular-21c3662ef9e4)
2. [How to Build a Component Library with Angular and Storybook](https://medium.com/angular-in-depth/how-to-build-a-component-library-with-angular-and-storybook-718278ab976)
3. [Game Development: Tetris in Angular](https://medium.com/angular-in-depth/game-development-tetris-in-angular-64ef96ce56f7)

### Oleksandr Poshtaruk

1. [Beware! Angular can steal your time](https://medium.com/angular-in-depth/beware-angular-can-steal-your-time-41fe589483df)
2. [RxJS recipes: ‘forkJoin’ with the progress of completion for bulk network requests in Angular](https://medium.com/angular-in-depth/rxjs-recipes-forkjoin-with-the-progress-of-completion-for-bulk-network-requests-in-angular-5d585a77cce1)
3. [Mastering RxJS: operators and functions that can bite you when you don’t expect](https://medium.com/angular-in-depth/mastering-rxjs-operators-and-functions-that-can-bite-you-when-you-dont-expect-cb2047cf5d4c)

### Alexey Zuev

1. [Angular DI: Getting to know the Ivy NodeInjector](https://medium.com/angular-in-depth/angular-di-getting-to-know-the-ivy-nodeinjector-33b815642a8e)
2. [Angular: show loading indicator when obs$ | async is not yet resolved](https://medium.com/angular-in-depth/angular-show-loading-indicator-when-obs-async-is-not-yet-resolved-9d8e5497dd8)
3. [Do you know how Angular transforms your code?](https://medium.com/angular-in-depth/do-you-know-how-angular-transforms-your-code-7943b9d32829)

### Andrew Evans

1. [How the AngularFire Library makes Firebase feel like Magic](https://indepth.dev/how-the-angularfire-library-makes-firebase-feel-like-magic/)
2. [How Cypress Makes Testing Fun](https://indepth.dev/how-cypress-makes-testing-fun/)
3. [Why Building with a JAMstack is Awesome](https://indepth.dev/why-building-with-a-jamstack-is-awesome/)

### Kevin Kreuzer

1. [Retry failed HTTP requests in Angular](https://medium.com/angular-in-depth/retry-failed-http-requests-in-angular-f5959d486294)
2. [Handling Angular environments in continuous delivery](https://medium.com/angular-in-depth/handling-angular-environments-in-continuous-delivery-eeaee96f0aae)
3. [Improve SPA performance by splitting your Angular libraries in multiple chunks](https://medium.com/angular-in-depth/improve-spa-performance-by-splitting-your-angular-libraries-in-multiple-chunks-8c68103692d0)

### Nikita Poltoratsky

1. [Angular Platforms in depth. Part 1. What are Angular Platforms?](https://medium.com/angular-in-depth/angular-platforms-in-depth-part-1-what-are-angular-platforms-9919d45f3054)
2. [Angular Platforms in depth. Part 2. Application bootstrap process](https://medium.com/angular-in-depth/angular-platforms-in-depth-part-2-application-bootstrap-process-8be461b4667e)
3. [Angular Platforms in depth. Part 3. Rendering Angular applications in Terminal](https://indepth.dev/top-15-angular-indepth-articles-of-2019/Angular%20Platforms%20in%20depth.%20Part%203.%20Rendering%20Angular%20applications%20in%20Terminal)

### Santosh Yadav

1. [Exciting Times Ahead — Be Ready For Angular 9](https://medium.com/angular-in-depth/exciting-time-ahead-be-ready-for-angular-9-b3dbb4078c47)
2. [Using Angular Elements with NgRx](https://medium.com/angular-in-depth/using-angular-elements-with-ngrx-bc655e1eb212)
3. [What’s new After Angular 8](https://medium.com/angular-in-depth/whats-new-after-angular-8-28d27ce3348a)

### Siyang "Kern" Zhao

1. [Creatively Decouple ngOnChanges](https://medium.com/angular-in-depth/creatively-decouple-ngonchanges-fab95395cc6e)
2. [Build Truly Dynamic Theme with CSS Variables](https://medium.com/angular-in-depth/build-truly-dynamic-theme-with-css-variables-539516e95837)
3. [Don’t reinvent the wheel when implementing ControlValueAccessor](https://medium.com/angular-in-depth/dont-reinvent-the-wheel-when-implementing-controlvalueaccessor-a0ed4ad0fafd)

## 收尾

2019年是令人惊叹的一年，非常非常感谢各位读者和作者对 Angular In Depth 的支持和厚爱，期待在 2020年继续看到各位 🎉🎆。