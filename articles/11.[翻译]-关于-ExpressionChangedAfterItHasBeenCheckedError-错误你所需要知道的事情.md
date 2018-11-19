# [翻译] 关于 ExpressionChangedAfterItHasBeenCheckedError 错误你所需要知道的事情

> 原文链接：**[Everything you need to know about the `ExpressionChangedAfterItHasBeenCheckedError` error](https://blog.angularindepth.com/everything-you-need-to-know-about-the-expressionchangedafterithasbeencheckederror-error-e3fd9ce7dbb4)**

最近 stackoverflow 上几乎每天都有人提到 Angular 抛出的一个错误：`ExpressionChangedAfterItHasBeenCheckedError`，通常提出这个问题的 Angular 开发者都不理解变更检测（change detection）的原理，不理解为何产生这个错误的数据更新检查是必须的，甚至很多开发者认为这是 Angular 框架的一个 bug（译者注：Angular 提供变更检测功能，包括自动开启和手动开启，自动开启是默认的，手动开启是在使用 `ChangeDetectionStrategy.OnPush` 关闭自动开启的情况下生效。如何手动开启，参考 **[Triggering change detection manually in Angular](https://stackoverflow.com/questions/34827334/triggering-change-detection-manually-in-angular)**）。当然不是了！其实这是 Angular 的警告机制，防止由于模型数据（model data）与视图 UI 不一致，导致页面上存在错误或过时的数据展示给用户。

本文将解释引起这个错误的内在原因，检测机制的内部原理，提供导致这个错误的共同行为，并给出修复这个错误的解决方案。最后章节解释为什么数据更新检查是如此重要。

It seems that the more links to the sources I put in the article the less likely people are to recommend it 😃. That’s why there will be no reference to the sources in this article.（译者注：这是作者的吐槽，不翻译）

## 相关变更检测行为
一个运行的 Angular 程序其实一个组件树，在变更检测期间，Angular 会按照以下顺序检查每一个组件（译者注：这个列表称为列表 1）：

* **[更新所有子组件/指令的绑定属性](https://hackernoon.com/the-mechanics-of-property-bindings-update-in-angular-39c0812bc4ce)**
* 调用所有子组件/指令的三个生命周期钩子：`ngOnInit`，`OnChanges`，`ngDoCheck`
* **[更新当前组件的 DOM](https://hackernoon.com/the-mechanics-of-dom-updates-in-angular-3b2970d5c03d)**
* 为子组件执行变更检测（译者注：在子组件上重复上面三个步骤，依次递归下去）
* 为所有子组件/指令调用当前组件的 `ngAfterViewInit` 生命周期钩子

在变更检测期间还会有其他操作，可以参考我写的文章：**[《Everything you need to know about change detection in Angular》](https://hackernoon.com/everything-you-need-to-know-about-change-detection-in-angular-8006c51d206f)** 。

在每一次操作后，Angular 会记下执行当前操作所需要的值，并存放在组件视图的 `oldValues` 属性里（译者注：Angular Compiler 会把每一个组件编译为对应的 view class，即组件视图类）。在所有组件的检查更新操作完成后，Angular 并不是马上接着执行上面列表中的操作，而是会开始下一次 **[digest cycle](https://hackernoon.com/angulars-digest-is-reborn-in-the-newer-version-of-angular-718a961ebd3e)**，即 Angular 会把来自上一次 digest cycle 的值与当前值比较（译者注：这个列表称为列表 2）：

* 检查已经传给子组件用来更新其属性的值，是否与当前将要传入的值相同
* 检查已经传给当前组件用来更新 DOM 值，是否与当前将要传入的值相同
* 针对每一个子组件执行相同的检查（译者注：就是如果子组件还有子组件，子组件会继续执行上面两步的操作，依次递归下去。）

记住这个检查只在开发环境下执行，我会在后文解释原因。

让我们一起看一个简单示例，假设你有一个父组件 `A` 和一个子组件 `B`，而 `A` 组件有 `name` 和 `text` 属性，在 `A` 组件模板里使用 `name` 属性的模板表达式：

```ts
template: '<span>{{name}}</span>'
```

同时，还有一个 `B` 子组件，并将 `A` 父组件的 `text` 属性以输入属性绑定方式传给 `B` 子组件：

```ts
@Component({
    selector: 'a-comp',
    template: `
        <span>{{name}}</span>
        <b-comp [text]="text"></b-comp>
    `
})
export class AComponent {
    name = 'I am A component';
    text = 'A message for the child component`;
```

那么当 Angular 执行变更检测的时候会发生什么呢？首先是从检查父组件 `A` 开始，根据上面列表 1 列出的行为，第一步是`更新所有子组件/指令的绑定属性（binding property）`，所以 Angular 会计算 `text` 表达式的值为 `A message for the child component`，并将值向下传给子组件 `B`，同时，Angular 还会在当前组件视图中存储这个值：
```ts
view.oldValues[0] = 'A message for the child component';
```

第二步是执行上面列表 1 列出的执行几个生命周期钩子。（译者注：即调用子组件 `B` 的 `ngOnInit`，`OnChanges`，`ngDoCheck` 这三个生命周期钩子。）

第三步是计算模板表达式 `{{name}}` 的值为 `I am A component`，然后更新当前组件 `A` 的 DOM，同时，Angular 还会在当前组件视图中存储这个值：
```
view.oldValues[1] = 'I am A component';
```

第四步是为子组件 `B` 执行以上第一步到第三步的相同操作，一旦 `B` 组件检查完毕，那本次 digest loop 结束。（译者注：我们知道 Angular 程序是由组件树构成的，当前父组件 `A` 组件做了第一二三步，完事后子组件 `B` 同样会去做第一二三步，如果 `B` 组件还有子组件 `C`，同样 `C` 也会做第一二三步，一直递归下去，直到当前树枝的最末端，即最后一个组件没有子组件为止。这一次过程称为 digest loop。）

如果处于开发者模式，Angular 还会执行上面列表 2 列出的 digest cycle 循环核查。现在假设当 `A` 组件已经把 `text` 属性值向下传入给 `B` 组件并保存该值后，这时 `text` 值突变为 `updated text`，这样在 Angular 运行 digest cycle 循环核查时，会执行列表 2 中第一步操作，即检查当前digest cycle 的 text 属性值与上一次时的 text 属性值是否发生变化：
```ts
AComponentView.instance.text === view.oldValues[0]; // false
'A message for the child component' === 'updated text'; // false
```

结果是发生变化，这时 Angular 会抛出 `ExpressionChangedAfterItHasBeenCheckedError` 错误。

列表 1 中第三步操作也同样会执行 digest cycle 循环检查，如果 `name` 属性已经在 DOM 中被渲染，并且在组件视图中已经被存储了，那这时 `name` 属性值突变同样会有同样错误：
```
AComponentView.instance.name === view.oldValues[1]; // false
'I am A component' === 'updated name'; // false
```

你可能会问上面提到的 `text` 或 `name` 属性值发生突变，这会发生么？让我们一起往下看。

## 属性值突变的原因
属性值突变的罪魁祸首是子组件或指令，一起看一个简单证明示例吧。我会先使用最简单的例子，然后举个更贴近现实的例子。你可能知道子组件或指令可以注入它们的父组件，假设子组件 `B` 注入它的父组件 `A`，然后更新绑定属性 `text`。我们在子组件 `B` 的 `ngOnInit` 生命周期钩子中更新父组件 `A` 的属性，这是因为 `ngOnInit` 生命周期钩子会在属性绑定完成后触发（译者注：参考列表 1，第一二步操作）：
```ts
export class BComponent {
    @Input() text;

    constructor(private parent: AppComponent) {}

    ngOnInit() {
        this.parent.text = 'updated text';
    }
}
```
 
果然会报错：

```ts
Error: ExpressionChangedAfterItHasBeenCheckedError: Expression has changed after it was checked. Previous value: 'A message for the child component'. Current value: 'updated text'.
```
 
现在我们再同样改变父组件 `A` 的 `name` 属性：

```ts
ngOnInit() {
    this.parent.name = 'updated name';
}
```

纳尼，居然没有报错！！！怎么可能？

如果你往上翻看列表 1 的操作执行顺序，你会发现 `ngOnInit` 生命周期钩子会在 DOM 更新操作执行前触发，所以不会报错。为了有报错，看来我们需要换一个生命周期钩子，`ngAfterViewInit` 是个不错的选项：

```ts
export class BComponent {
    @Input() text;

    constructor(private parent: AppComponent) {}

    ngAfterViewInit() {
        this.parent.name = 'updated name';
    }
}
```

还好，终于有报错了：

```
AppComponent.ngfactory.js:8 ERROR Error: ExpressionChangedAfterItHasBeenCheckedError: Expression has changed after it was checked. Previous value: 'I am A component'. Current value: 'updated name'.
```

当然，真实世界的例子会更加复杂，改变父组件属性从而引发 DOM 渲染，通常间接是因为使用服务（services）或可观察者（observables）引发的，不过根本原因还是一样的。

现在让我们看看真实世界的案例吧。

### 共享服务（Shared service）
这个模式案例可查看代码 **[plunker](https://plnkr.co/edit/VtcGEuBpAC3mQ0MFPcbU?p=preview)**。这个程序设计为父子组件有个共享的服务，子组件修改了共享服务的某个属性值，响应式地导致父组件的属性值发生改变。我把它称为非直接父组件属性更新，因为不像上面的示例，它明显不是子组件立刻改变父组件属性值。

### 同步事件广播
这个模式案例可查看代码 **[plunker](https://plnkr.co/edit/VtcGEuBpAC3mQ0MFPcbU?p=preview)**。这个程序设计为子组件抛出一个事件，而父组件监听这个事件，而这个事件会引起父组件属性值发生改变。同时这些属性值又被父组件作为输入属性绑定传给子组件。这也是非直接父组件属性更新。

### 动态组件实例化
这个模式有点不同于前面两个影响的是输入属性绑定，它引起的是 DOM 更新从而抛出错误，可查看代码 **[plunker](https://plnkr.co/edit/lehon0WU14LxDIZFZcmp)**。这个程序设计为父组件在 `ngAfterViewInit` 生命周期钩子动态添加子组件。因为添加子组件会触发 DOM 修改，并且 `ngAfterViewInit` 生命周期钩子也是在 DOM 更新后触发的，所以同样会抛出错误。

## 解决方案
如果你仔细查看错误描述的最后部分：
> Expression has changed after it was checked. Previous value:… Has it been created **in a change detection hook** ?

根据上面描述，通常的解决方案是使用正确的生命周期钩子来创建动态组件。例如上面创建动态组件的示例，其解决方案就是把组件创建代码移到 `ngOnInit` 生命周期钩子里。尽管官方文档说 `ViewChild` 只有在 `ngAfterViewInit` 钩子后才有效，但是当创建视图时它就已经填入了子组件，所以在早期阶段就可用。（译者注：Angular 官网说的是 **[`View queries are set before the ngAfterViewInit callback is called`](https://angular.io/api/core/ViewChild#description)**，就已经说明了 `ViewChild` 是在 `ngAfterViewInit` 钩子前生效，不明白作者为啥要说之后才能生效。）

如果你 google 下就知道解决这个错误一般有两种方式：异步更新属性和手动强迫变更检测。尽管我列出这两个解决方案，但不建议这么去做，我将会解释原因。

### 异步更新
这里需要注意的事情是变更检测和核查循环（verification digests）都是同步的，这意味着如果我们在核查循环（verification loop）运行时去异步更新属性值，会导致错误，测试下吧：

```ts
export class BComponent {
    name = 'I am B component';
    @Input() text;

    constructor(private parent: AppComponent) {}

    ngOnInit() {
        setTimeout(() => {
            this.parent.text = 'updated text';
        });
    }

    ngAfterViewInit() {
        setTimeout(() => {
            this.parent.name = 'updated name';
        });
    }
}
```

实际上没有抛出错误（译者注：耍我呢！），这是因为 `setTimeout()` 函数会让回调在下一个 VM turn 中作为宏观任务（macrotask）被执行。如果使用 `Promise.then` 回调来包装，也可能在当前 VM turn 中执行完同步代码后，紧接着在当前 VM turn 继续执行回调：（译者注：VM turn 就是 Virtual Machine Turn，等于 **[browser task](https://stackoverflow.com/questions/38783544/angular2-understanding-vm-turns-and-events)**，这涉及到 JS 引擎如何执行 JS 代码的知识，这又是一块大知识，不详述，有兴趣可以参考这篇经典文章 **[Tasks, microtasks, queues and schedules](https://jakearchibald.com/2015/tasks-microtasks-queues-and-schedules)** ，或者这篇详细描述的文档 **[从浏览器多进程到JS单线程，JS运行机制最全面的一次梳理](https://juejin.im/post/5a6547d0f265da3e283a1df7)** 。）

```ts
Promise.resolve(null).then(() => this.parent.name = 'updated name');
```
与宏观任务（macrotask）不同，`Promise.then` 会把回调构造成微观任务（microtask），微观任务会在当前同步代码执行完后再紧接着被执行，所以在核查之后会紧接着更新属性值。想要更多学习 Angular 的宏观任务和围观任务，可以查看我写的 **[ I reverse-engineered Zones (zone.js) and here is what I’ve found](https://blog.angularindepth.com/i-reverse-engineered-zones-zone-js-and-here-is-what-ive-found-1f48dc87659b)** 。

如果你使用 `EventEmitter` 你可以传入 `true` 参数实现异步：

```ts
new EventEmitter(true);
```

### 强迫式变更检测
另一种解决方案是在第一次变更检测和核查循环阶段之间，再一次迫使 Angular 执行父组件 `A` 的变更检测（译者注：由于 Angular 先是变更检测，然后核查循环，所以这段意思是变更检测完后，再去变更检测）。最佳时期是在 `ngAfterViewInit` 钩子里去触发父组件 `A` 的变更检测，因为这个父组件的钩子函数会在所有子组件已经执行完它们自己的变更检测后被触发，而恰恰是子组件做它们自己的变更检测时可能会改变父组件属性值：

```ts
export class AppComponent {
    name = 'I am A component';
    text = 'A message for the child component';

    constructor(private cd: ChangeDetectorRef) {
    }

    ngAfterViewInit() {
        this.cd.detectChanges();
    }
```

很好，没有报错，不过这个解决方案仍然有个问题。如果我们为父组件 `A` 触发变更检测，Angular 仍然会触发它的所有子组件变更检测，这可能重新会导致父组件属性值发生改变。


## 为何需要循环核查（verification loop）
Angular 实行的是**从上到下的单向数据流**，当父组件改变值已经被同步后（译者注：即父组件模型和视图已经同步后），不允许子组件去更新父组件的属性，这样确保在第一次 digest loop 后，整个组件树是稳定的。如果属性值发生改变，那么依赖于这些属性的消费者（译者注：即子组件）就需要同步，这会导致组件树不稳定。在我们的示例中，子组件 `B` 依赖于父组件的 `text` 属性，每当 `text` 属性改变时，除非它已经被传给 `B` 组件，否则整个组件树是不稳定的。对于父组件 `A` 中的 DOM 模板也同样道理，它是 `A` 模型中属性的消费者，并在 UI 中渲染出这些数据，如果这些属性没有被及时同步，那么用户将会在页面上看到错误的数据信息。

数据同步过程是在变更检测期间发生的，特别是列表 1 中的操作。所以如果当同步操作执行完毕后，在子组件中去更新父组件属性时，会发生什么呢？你将会得到不稳定的组件树，这样的状态是不可测的，大多数时候你将会给用户展现错误的信息，并且很难调试。

那为何不等到组件树稳定了再去执行变更检测呢？答案很简答，因为它可能永远不会稳定。如果把子组件更新了父组件的属性，作为该属性改变时的响应，那将会无限循环下去。当然，正如我之前说的，不管是直接更新还是依赖的情况，这都不是重点，但是在现实世界中，更新还是依赖一般都是非直接的。

有趣的是，AngularJS 并没有**单向数据流**，所以它会试图想办法去让组件树稳定。但是它会经常导致那个著名的错误 `10 $digest() iterations reached. Aborting!`，去谷歌这个错误，你会惊讶发现关于这个错误的问题有很多。

最后一个问题你可能会问为什么只有在开发模式下会执行 digest cycle 呢？我猜可能因为相比于一个运行错误，不稳定的模型并不是个大问题，毕竟它可能在下一次循环检查数据同步后变得稳定。然而，最好能在开发阶段注意可能发生的错误，总比在生产环境去调试错误要好得多。


