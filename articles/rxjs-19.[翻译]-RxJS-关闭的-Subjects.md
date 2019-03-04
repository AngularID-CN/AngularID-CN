# [翻译] RxJS: 关闭的 Subjects

> 原文：[RxJS: Closed Subjects](https://blog.angularindepth.com/rxjs-closed-subjects-1b6f76c1b63c?source=---------18---------------------)
>
> 作者：[Nicholas Jamieson](https://blog.angularindepth.com/@cartant)
>
> 译者：[vaanxy](https://github.com/vaanxy)；校对者：[dreamdevil00](https://github.com/dreamdevil00)

![img](../assets/rxjs-19/1.png)

本图由 [Tim Mossholder](https://unsplash.com/photos/C8jNJslQM3A?utm_source=unsplash&utm_medium=referral&utm_content=creditCopyText) 拍摄并发布在 [Unsplash](https://unsplash.com/?utm_source=unsplash&utm_medium=referral&utm_content=creditCopyText) 上

这篇文章我们来看一下 `Subject` 及其派生类的 `unsubscribe` 方法，该方法的一些行为会令人感到惊讶。

#### Subscriptions

如果你看过 `Observable.prototype.subscribe` 的签名，你会发现该函数会返回一个 `Subscription`。并且如果你使用过 observables，那么你会对调用 subscription 的 `unsubscribe` 方法感到熟悉。然而，一个 subscription 不仅仅只包含一个 `unsubscribe` 方法。

特别的，`Subscription` 类实现了 `ISubscription` 接口：

~~~typescript
export interface ISubscription extends AnonymousSubscription {
  unsubscribe(): void;
  readonly closed: boolean;
}
~~~

`AnonymousSubscription` 也是一个相同的接口，但是并不包含 `closed` 这个只读属性。

`closed` 属性表明了 subscription 是否被取消了订阅——无论是手动或自动取消（ observable 完成工作或发生了错误时会自动取消订阅）

#### Subscribers 和 unsubscription

有趣的是，调用 `subscribe` 方法真正返回的是一个 `Subscriber` 类的实例，它扩展了 `Subscription` 类。

与 `subscribe` 方法相似，`Subscriber` 类可以传入一个 partial observer 或是独立的 `next`，`error` 以及 `complete` 回调函数。

`Subscriber` 的主要目的是确保只有在指定了 observer 方法或回调函数时才调用它们，并确保在调用 `unsubscribe` 方法后或者源 observable `completes` 或 `errors` 发生时不调用它们。

可以创建一个 `Subscriber` 实例并在调用 `subscribe` 时传递它，因为 `Subscriber` 实现了 `Observer` 接口。`Subscriber` 将跟踪受此类 `subscribe ` 调用影响的 subscriptions，`unsubscribe` 方法可以在 `Subscriber` 或返回的 `Subscription` 上被调用。

也可以在多个 `subscribe` 调用中传递 `Subscriber` 实例，而在 `Subscriber` 上调用 `unsubscribe` 方法将从订阅它的所有 observable 中取消订阅，并将其标记为关闭。在这里，调用 `unsubscribe` 将从 `one` 和 `two` 中取消订阅：


~~~typescript
import { interval } from "rxjs/observable/interval";
import { map } from "rxjs/operators";
import { Subscriber } from "rxjs/Subscriber";

const one = interval(1000).pipe(map(value => `one(${value})`));
const two = interval(2000).pipe(map(value => `two(${value})`));

const subscriber = new Subscriber<string>(value => console.log(value));
one.subscribe(subscriber);
two.subscribe(subscriber);
subscriber.unsubscribe();
~~~

那么这与 subjects 有什么关系呢？嗯，subjects 的行为方式是不同。

#### Subjects

Subject 既是一个 observer 又是一个 observable。`Subject` 类扩展了 `Observable` 类又实现了 `Observer` 接口。它还实现了 `ISubscription` 接口——所以 subjects 拥有只读的 `closed` 属性以及一个 `unsubscribe` 方法。

`Subject` 实现了 `ISubscription` 接口表明它应该和 `Subscriber` 一样，可以进行订阅和取消订阅，如下所示：

~~~typescript
import { interval } from "rxjs/observable/interval";
import { map } from "rxjs/operators";
import { Subject } from "rxjs/Subject";

const one = interval(1000).pipe(map(value => `one(${value})`));
const two = interval(2000).pipe(map(value => `two(${value})`));

const subject = new Subject<string>();
subject.subscribe(value => console.log(value));

one.subscribe(subject);
two.subscribe(subject);
subject.unsubscribe();
~~~

然而，这将会引起一个错误：

```
ObjectUnsubscribedError: object unsubscribed
  at new ObjectUnsubscribedError
  at Subject.next
  at SubjectSubscriber.Subscriber._next
  at SubjectSubscriber.Subscriber.next
  at MapSubscriber._next
  at MapSubscriber.Subscriber.next
  at AsyncAction.IntervalObservable.dispatch
  at AsyncAction._execute
  at AsyncAction.execute
  at AsyncScheduler.flush
```

为什么？实际上 `Subject` 中的 `unsubscribe` 方法并没有取消订阅任何东西，而是将 subject 标记成 `closed`  并且它将其内部的 subscribed observer 数组（`Subject` 扩展了 `Observable`）设置为 `null`。请务必记住这一点。

Subject 会追踪所有订阅它的 observers，但是与 subscribers 不同，他们不跟踪 subjects 本身订阅的 observables，因此 subjects 无法从他们的来源中取消订阅自己。

所以为什么会发生这个错误？在 subject 被标记成 `closed` 后，其 `next`，`error` 或者  `complete` 再被调用，那么将会抛出该错误。并且[该行为是故意这么设计的](https://medium.com/@benlesh/on-the-subject-of-subjects-in-rxjs-2b08b7198b93):

> 如果你在 subject 使用完成后再调用其 next 方法，并希望它疯狂的报错，那么你可以直接调用 subject 实例本身的 unsubscribe 方法。 — Ben Lesh

这种行为意味着，如果你调用了某个 subject 的 `unsubscribe` 方法，则必须确保该 subject 已从其源中取消订阅，或者源已完成或出错。

#### 预警

上述行为确实令人感到惊讶，你可能希望在调用 subject 的 `unsubscribe` 方法时被阻止或警告。如果你确实想要这么做，我的  `rxjs-tslint-rules`  包涵盖了一条规则能够实现这一功能那就是：`rxjs-no-subject-unsubscribe`。

该规则同时也阻止了将 subjects 传入到一个 subscription 的 `add` 方法中——该方法我们会在之后 subscription 的组合这一文章中详细讨论。
