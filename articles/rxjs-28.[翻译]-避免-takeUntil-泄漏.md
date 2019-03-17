# [翻译] 避免 takeUntil 泄漏

> 原文链接：[RxJS: Avoiding takeUntil Leaks](https://blog.angularindepth.com/rxjs-avoiding-takeuntil-leaks-fb5182d047ef)
>
> 原文作者：[Nicholas Jamieson](https://blog.angularindepth.com/@cartant)
>
> 译者：[dreamdevil00](https://github.com/dreamdevil00)；校对者：

![](../assets/rxjs-28/1.jpeg)

Ben Lesh 的 [Don’t Unsubscribe](https://medium.com/@benlesh/rxjs-dont-unsubscribe-6753ed4fda87) 介绍了使用 `takeUntil` 操作符取消订阅 observable 的机制。

在 Angular 组件销毁时使用 `takeUntil` 操作符取消 observable 订阅是人们[普遍接受的模式](https://stackoverflow.com/a/41177163/6680611)。


为了使该机制生效，必须按照特定的顺序应用操作符。最近，我看到了一些使用 `takeUntil` 操作符的代码，但是应用了会导致订阅泄漏的操作符顺序。

让我们看看出问题的操作符顺序和泄漏的原因。

## 出问题的操作符顺序是什么?

如果 `takeUntil` 操作符被放在订阅了另一个 observable 源的操作符前面， 当 `takeUntil` 收到通知时，订阅该 observable 源的订阅可能不会被取消。 

比如，下述 `combineLatest` 的用法会泄漏对 `b` 的订阅：

```typescript
import { Observable } from "rxjs";
import { combineLatest, takeUntil } from "rxjs/operators";

declare const a: Observable<number>;
declare const b: Observable<number>;
declare const notifier: Observable<any>;

const c = a.pipe(
  takeUntil(notifier),
  combineLatest(b)
).subscribe(value => console.log(value));
```

下述 `switchMap` 的用法也会泄漏对 `b` 的订阅:

```typescript
import { Observable } from "rxjs";
import { switchMap, takeUntil } from "rxjs/operators";

declare const a: Observable<number>;
declare const b: Observable<number>;
declare const notifier: Observable<any>;

const c = a.pipe(
  takeUntil(notifier),
  switchMap(_ => b)
).subscribe(value => console.log(value));
```

## 为何会泄漏 ?

如果使用静态的 `combineLatest` 工厂函数替换掉废弃的 `combineLatest` 操作符，泄漏的原因就显而易见了， 如下所示:

```typescript
import { combineLatest, Observable } from "rxjs";
import { takeUntil } from "rxjs/operators";

declare const a: Observable<number>;
declare const b: Observable<number>;
declare const notifier: Observable<any>;

const c = a.pipe(
  takeUntil(notifier),
  o => combineLatest(o, b)
).subscribe(value => console.log(value));
```

当 `notifier` 发射时，`takeUntil` 操作符返回的 observable 执行完毕， 所有的订阅自动取消。

然而，`c` 的订阅者并没有订阅 `takeUntil` 返回的 observable(它所订阅的是 `combineLatest` 返回的 observable)，所以当 `takeUntil` observable 执行完毕后， 并不会自动取消订阅。

`c` 的订阅者会保持订阅状态直到所有传给 `combineLatest` 的 observable 执行完毕。 因此， 除非 `b` 在 `notifier` 发射之前执行完毕， 否则 订阅 `b` 就会导致泄漏。

要避免该问题， 通用的规则是: `takeUntil` 应当是操作符序列中的最后一个操作符:

```typescript
import { combineLatest, Observable } from "rxjs";
import { takeUntil } from "rxjs/operators";

declare const a: Observable<number>;
declare const b: Observable<number>;
declare const notifier: Observable<any>;

const c = a.pipe(
  o => combineLatest(o, b),
  takeUntil(notifier)
).subscribe(value => console.log(value));
```
这样排列的话， 当 `notifier` 发射时，`c` 的订阅者会自动取消订阅(`takeUntil` 返回的 observable 执行完毕时)，并且 `takeUntil` 的实现会取消订阅 `combingLatest` 返回的 observable ， 而这又会同时取消订阅 `a` 和 `b` 。

## 使用 TSLint 避免此问题

如果你正使用 `takeUntil` 机制来间接取消订阅， 可以通过启用我已添加到 `rxjs-tslint-rules` 包的 [rxjs-no-unsafe-takeuntil](https://github.com/cartant/rxjs-tslint-rules#rules) 规则，确保 `takeUntil` 总是最后一个传给 pipe 的操作符。

## 更新

一般的规则是将 `takeUntil` 放在最后。然而，某些情况下, 必须将其作为倒数第二个操作符。

RxJS 中有几个操作符会在源 observable 执行完毕时发射一个值。 比如， 当源 observable 完成时，  `count` 会发射源 observable 所发射的值的数目，`toArray` 会发射值的累积数组。

当一个 observable 由于 `takeUntil` 的原因执行完毕时， 像 `count` 和 `toArray` 这样的操作符如果是被放在 `takeUntil` 操作符后面，就会只发射一个值。

除此之外， 还有个操作符你应该放在 `takeUntil` 后面: `shareReplay` 操作符。

`shareReplay` 的当前实现有个 bug/feature: `shareReplay` 永远不会从其源中取消订阅。它将保持订阅，直到它所订阅的源发生错误或执行完毕(更多信息，请查看此 [pr](https://github.com/ReactiveX/rxjs/pull/4059))。因此， 将 `takeUntil` 放在 `shareReplay` 后将是无效的。

上述提及到的 TSLint 规则会感知到[通用规则的异常](https://github.com/cartant/rxjs-tslint-rules/blob/v4.14.2/source/rules/rxjsNoUnsafeTakeuntilRule.ts#L41-L62)，不会造成不必要的失败。


在 RxJS 6.4.0 中， `shareReplay` 有所改变， 可以通过 `config` 参数指定其引用计数行为，如果指定了引用计数， 那么 `shareReplay` 就可以安全地放在 `takeUntil` 操作符前面了。

如需更多信息， 请查阅[本文](https://medium.com/@cartant/rxjs-whats-changed-with-sharereplay-65c098843e95)