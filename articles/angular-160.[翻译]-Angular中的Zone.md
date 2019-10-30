# Angular 中的 Zone

[原文链接](https://blog.thoughtram.io/angular/2016/02/01/zones-in-angular-2.html)

译者:[尊重](https://www.zhihu.com/people/yiji-yiben-ming/posts)

校对:[lx1036](https://lx1036.github.io)


在 [理解 Zone](https://blog.thoughtram.io/angular/2016/01/22/understanding-zones.html) 这篇文章中，我们通过构筑一个分析 Zone （分析代码中的异步操作）理解了 Zone 的能力。Zone 是一种允许在异步任务中挂载钩子的执行上下文。如果你还没有阅读上面提到的文章，强烈推荐你先阅读一遍。本文中我们将会更加了解 Zone 在 Angular 中扮演的角色。

如果你有兴趣的话可以接着阅读这篇文章[如何利用 Zone 让 Angular 更快运行](https://blog.thoughtram.io/angular/2017/02/21/using-zones-in-angular-for-better-performance.html)

## Zone 非常适合 Angular

Zone 解决问题的方案与 Angular 的变更检测机制能够做到很好地配合。你是否疑问过，Angular会在何时以及为什么会执行变更检测？是不是像是 “Angular，应用发生变化了，麻烦你检查一下”。

在我们深入这些问题之前，让我们先思考一下是什么导致了应用的变化。换句话说，什么可以改变应用的状态。通常来说，应用状态的改变由三种事件触发：

- Events：如 `click`, `change`, `input`, `submit` 等用户事件
- XMLHttpRequests：比如从远端服务获取数据
- Timers： 比如 JavaScript 的自有 API `setTimeout()`, `setInterval()`

这三种事件都有一个共同的特点：都是异步事件。

听起来有点无趣，但是事实证明，只有在这些情况下 Angular 才进行视图的更新。下述例子中，我们使用一个点击按钮触发操作的组件。

```typescript
@Component({
  selector: 'my-component',
  template: `
    <h3>We love {{name}}</h3>
    <button (click)="changeName()">Change name</button>
  `
})
class MyComponent {

  name:string = 'thoughtram';

  changeName() {
    this.name = 'Angular';
  }
}
```

如果你对 `(click)` 语法还不熟悉，最好先去看看这篇文章 [](https://blog.thoughtram.io/angular/2015/08/11/angular-2-template-syntax-demystified-part-1.html)。简而言之，其为 `<button>` 元素上的 `click` 事件设置了一个事件处理程序。

当组件的按钮被点击时，`changeName()` 将会执行，组件的 `name` 属性将被改变。因为我们也希望改变反馈到 DOM 节点的展示上，Angular 将会相应地更新视图绑定 `{% raw %}{{name}}{% endraw %}`。

另一个例子是使用 `setTimeout()` 更新 `name` 属性。我们此时不再需要 button 功能。

```typescript
@Component({
  selector: 'my-component',
  template: `
    <h3>We love {{name}}</h3>
  `
})
class MyComponent implements OnInit {

  name:string = 'thoughtram';

  ngOnInit() {
    setTimeout(() => {
      this.name = 'Angular';
    }, 1000);
  }
}
```

我们没做任何特别的事情通知框架改变已经发生。没有 `ng-click`,`$timeout`, `$scope.$apply()`。

如果你已经读过文章 [理解 Zones](https://blog.thoughtram.io/angular/2016/01/22/understanding-zones.html)，就会知道这是 Angular 享受了 Zones 的好处。 Zone monkey-patched 了全局的所有异步操作如 `setTimeout()` 和 `addEventListener()`, 这也是为什么 Angular 可以快速发现何时需要更新 DOM。

实际上，告知 Angular 每当完成VM turn 时执行更改检测的代码如下：

```typescript
ObservableWrapper.subscribe(this.zone.onTurnDone, () => {
  this.zone.run(() => {
    this.tick();
  });
});

tick() {
  // perform change detection
  this.changeDetectorRefs.forEach((detector) => {
    detector.detectChanges();
  });
}
```

每当 Angular 的 zone 抛出一个 `onTurnDone` 的事件，Angular 都会运行一个任务执行全应用的变更检测。如果你希望了解更多有关 Angular 的变更检测工作机制，可以阅读 [这篇文章](https://blog.thoughtram.io/angular/2016/02/22/angular-2-change-detection-explained.html)

但是，`onTurnDone` 事件发生器从何而来？他不是 Zone 的默认 API 之一，而是 Angular 自己引入的 NgZone 的API。

## Angular 中的 NgZone

NgZone 实际上就是一个 forked Zone，继承了 Zone 的原始 API 的同时，向其执行上下文增加了些许功能。NgZone 加入到 API 中的内容主要是下述可以订阅的事件，因为它们是可观察的流。

- `onTurnStart()`: 在 Angular Event turn 开始之前通知订阅者。每个由 Angular 处理的浏览器任务都会抛出一个事件。
  
- `onTurnDone()`: 在 Angular Zone 处理完当前 turn 和任何该 turn 安排的 micro tasks 之后立刻通知订阅者。

- `onEventDone()`: 在 VM 事件结束前，在 `onTurnDone()` 的最终回调之后立刻通知订阅者。对于测试以验证应用程序状态很有用。

如果 `Observalbe` 和 `Stream` 对你而言并不熟悉，最好去读读这篇文章 [Taking advantage of Observables in Angular](https://blog.thoughtram.io/angular/2016/01/06/taking-advantage-of-observables-in-angular2.html)。

Angular 添加自己的 event emitter 而不是使用原生 Zone 的 `beforeTask` 和 `afterTask` 回调的原因是，Angular 需要追踪 timer 和其他 micro tasks。而使用 Observables 用作处理这些事件的API是很“Angular”的一种的方式。

## 脱离 Angular Zone 运行代码

因为 `NgZone` 只是对全局 Zone 的 fork，Angular 可以控制何时将功能运行于 Zone 中以执行变更检测。某些时候我们并不需要 Angular 总是执行变更检测，这种控制能力就很有用处了。

正如上面所提到的， Zone monkey-patched 浏览器绝大多数的异步操作。而因为 `NgZone` 只是 fork 了 Zone，当异步操作发生时，Zone 通知框架执行变更检测；所以当发生 `mousemove` 之类的事件发生时，也会触发变更检测。

开发者不会希望每次 `mousemove` 事件发生时都会触发变更检测，因为那样整个系统将会严重降速，影响用户体验。

所以 NgZone 提供了一个 API 叫做 `runOutsideAngular`, 将任务执行于 `NgZone` 的父级 Zone 中，这样不会抛出 `onTurnDone` 事件，也就不会触发变更检测。阅读下述代码以了解该功能：

```typescript
@Component({
  selector: 'progress-bar',
  template: `
    <h3>Progress: {{progress}}</h3>
    <button (click)="processWithinAngularZone()">
      Process within Angular zone
    </button>
  `
})
class ProgressBar {

  progress: number = 0;

  constructor(private zone: NgZone) {}

  processWithinAngularZone() {
    this.progress = 0;
    this.increaseProgress(() => console.log('Done!'));
  }
}
```

没有什么特别之处，模板中的 button 被点击时将会触发组件的 `processWithinAngularZone` 函数，并触发 `increaseProgress()` 函数，接着看：

```typescript
increaseProgress(doneCallback: () => void) {
  this.progress += 1;
  console.log(`Current progress: ${this.progress}%`);

  if (this.progress < 100) {
    window.setTimeout(() => {
      this.increaseProgress(doneCallback);
    }, 10);
  } else {
    doneCallback();
  }
}
```

在 `progress` 等于 `100` 之前 `increaseProgress()` 函数都将以 10ms 为一间隔请求自身。一旦该流程完成，作为传参的 `doneCallback` 将会执行。注意使用 `setTImeout()` 增加 `progress` 的方式。

在浏览器中运行上述代码，将会验证我们所描述的功能。每当 `setTimeout()` 函数被调用，Angular 都会触发变更检测并更新视图，可以观察到每 10 ms Progress 的值都在持续增长。

而当我们在 Angular Zone 之外运行此代码时，会变得更加有趣。看下面的代码：

```typescript
processOutsideAngularZone() {
  this.progress = 0;
  this.zone.runOutsideAngular(() => {
    this.increaseProgress(() => {
      this.zone.run(() => {
        console.log('Outside Done!');
      });
    });
  });
}
```

`processOutsideAngularZone()` 函数同样调用了`increaseProgress()` 方法，只是这次使用了 `runOutsideAngularZone()` API, 这样每次的 timeout 都将不会触发 Angular 的变更检测。 通过使用 NgZone token 将其注入到组件中，就可以使用 Angular zone 的相关API。

此时当`Progress` 增加时，UI 并不会更新。然而，当 `increaseProgress()` 完成时，使用 `zone.run()` API 在 Zone 中执行了另一个任务，该任务触发 Angular 的变更检测并导致 UI 的更新。换句话说，我们看到的不是 `Progress` 的持续更新，而是函数结束时看到一个最终的值。查看这个 [Demo](https://stackblitz.com/edit/angular-dr9tyf) 以亲自实践。

现在，TC39还建议将 Zone 作为标准进行推进，如果成功，将作为下一代 JS 的 native feature 存在，值得学习与了解。
