# 每个 Angular 开发人员应该了解的关于 Zone.js 十件事

每个开发者都应该对 Zone.js 有基本的了解

![logo](../../angularindepth/assets/angular-158/1.jpeg)

## 为何需要关注 zone.js

Angular 引入 [Zone.js](https://github.com/angular/zone.js/) 以处理变更检测。Zone.js 使 angular 可以决定何时需要刷新UI。通常情况下，你不需要关注 Zone.js，因为其一直在正常工作。

然而，当有关 Zone.js 的某个部分出现错误时，尝试分析和理解错误的过程将会使人沮丧绝望。这也是为什么每个 angular 开发者都需要了解 Zone.js 的基本功能。

## 简而言之：Zone.js 如何工作

Zone.js 对所有常见的异步 API（`setTimeout`, `setInterval` 和 `Promise`）打上了“补丁” 以追踪所有的异步操作。

你需要了解下述所有基本概念：

### Zone

Zone 是一种用于拦截和跟踪异步工作的机制。

### Tasks

Zone.js 将会对每一个异步操作创建一个 task。一个 task 于一个 Zone 中运行。

### NgZone

通常来说， 在 Angular APP 中，每个 task 都会在 "Angular" Zone 中运行，这个 Zone 被称为 `NgZone`。一个 Angular APP 中只存在一个 Angular Zone，而变更检测只会由运行于这个 `NgZone` 中的异步操作触发。

### Root Zone/Forks

在 Zone.js 中 zone 是存在层级关系的，你永远只会从顶层的 zone 进行操作 - 也就是 "root zone"。新的 zone 可以通过 fork root zone 创建。NgZone 也是由 root zone fork 而来。

### ZoneSpecs

在 fork 一个 zone 时，一个新的 zone 将会由 `ZoneSpec` 创建。一个 `ZoneSpec` 可以只包含一个提供给新 child zone 的名字，也可以包含许多用于拦截特定 Zone/任务事件的钩子函数。

如果你想要了解更多有关于 Zone.js 的工作机制，[浏览这个网页](https://blog.thoughtram.io/angular/2016/01/22/understanding-zones.html?source=post_page-----573d89bbb890----------------------)。

## 你并不一定要在 Angular 应用中使用 Zone.js (但是推荐你使用)

Zone.js 可以在 Angular 应用的启动阶段通过设置一个 `noop` 的 zone 参数以禁用。然而如果你选择在 Angular 中禁用 Zone，那你就必须自己手动控制 UI 刷新的时机（比如通过 `ChangeDetectorRef.detectChanges()` 函数）。

通常来说，不推荐放弃使用 Zone.js, 因为你放弃了自动变更检测的便利，但是对于某些自定义元素（Angular elements），使用手动控制的方式就比较合理了。

关于更多有关于禁用 Zone.js 的细节请查阅[本链接](https://www.softwarearchitekt.at/aktuelles/angular-elements-part-iii/)。

## 自动的变更检测很好，但是如果我自己控制的时候该怎么办？

在某些场景中因为自动变更检测触发过于频繁而导致性能下降时，你可能会希望可以自己控制之。

如果你仍然希望利用Zone.js的优势，但又想要控制能够触发变更检测的场景/动作，你可以采用如下方法。

通过注入 `NgZone`， 你可以使用一个 API 决定”一个异步操作是否需要在 `NgZone` 中执行“。函数 [runOutsideAngular](https://angular.io/api/core/NgZone#runOutsideAngular) 用于确保代码于 `NgZone` 之外运行，确保变更检测不会因为相关代码而触发。

这儿有一个例子：

```typescript
constructor(private ngZone: NgZone) {
  this.ngZone.runOutsideAngular(() => {
    // this will not trigger change detection
    setInterval(() => doSomething(), 100)
  });
}
```

## Zone.js 如何影响 Protractor Tests?

一旦不再运行异步操作，Zone 是处于稳定状态的。一个”健康“的 Zone 初始时是稳定的，在某些任务运行时，Zone 会变化为不稳定的状态，而在某个时刻，任务完成后，Zone 又会重回稳定状态。

这与 protractor 有什么关系呢？如果你在 E2E 测试中使用了 `browser.waitForAngular`方法，那么 protractor 将会通过检查 `NgZone` 的方式判断测试能否继续进行。

所以，在发送给浏览器的每条命令之后，protractor 将等待 Zone 进入稳定态后再进行后续步骤。如果你使用了 `setInterval` 创建了一个短间隔的定时器任务，那么 `NgZone` 将无法进入稳定状态，而测试也将会冻结并超时。

通过在 Angular Zone 之外运行长周期任务或重复运行式任务的方式，可以解决上述问题。

## RxJS 与 Zone.js 如何一起使用

默认情况下，RxJS 与 Zone.js 可能如你预期的那般运行。比如，你可能会把 Observable 相关代码封装进一个函数，并将其传递到 `NgZone.runOutsideAngular` 方法中，却仍然以在NgZone 内部运行的任务结束这个 Observable（与 Zone 外创建数据流，于 Zone 内订阅数据流）。

使用 RxJS 时，应始终从Zone.js导入相关补丁，以确保 RxJS 以”合理“的方式工作。在 subscription，operator 或 Observable 构造时，它会记住当前所处的 Zone，并且始终在该 Zone 中运行，这与你订阅的 Zone 无关，两者完全独立。

你可以依照如下的方案给 Zone.js 和 RxJS 的适配打补丁，通常在 `polyfill.ts` 文件中。

```typescript
import ‘zone.js/dist/zone-patch-rxjs’;
```

你可以在[这篇文档](https://github.com/angular/zone.js/blob/master/NON-STANDARD-APIS.md)中找到更好的示例。

## 如何从 Zone.js 中排除某些事件

## 如何分析 Zone.js 的问题？

## 什么是微观和宏观任务？

## Zone.js如何与Ng-Upgrade一起使用？

