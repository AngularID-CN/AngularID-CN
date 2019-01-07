# [翻译] Angular 的单向数据流

> 原文：[Do you really know what unidirectional data flow means in Angular](https://blog.angularindepth.com/do-you-really-know-what-unidirectional-data-flow-means-in-angular-a6f55cefdc63)
> 作者：**[Max Koretskyi](http://twitter.com/maxim_koretskyi)**
> 原技术博文由 `Max Koretskyi` 撰写发布，他目前于 [ag-Grid](https://angular-grid.ag-grid.com/?utm_source=medium&utm_medium=blog&utm_campaign=angularcustom) 担任开发大使(Developer Advocate)
*译者按：开发大使负责确保其所在的公司认真听取社区的声音并向社区传达他们的行动及目标，其作为社区和公司之间的纽带存在。*</br>
> 译者：**[秋天](https://github.com/jkhhuse)**；校对者：**[Ice Panpan](https://github.com/TanYiBing)**

大部分的架构的模式很难掌握，尤其资料缺乏的情况下。Angular的单向数据流便是其中之一。这个概念在官方文档中没有明确的解释，只零星存在于 [expression guidelines](https://angular.cn/guide/template-syntax#expression-guidelines) 和 [template statements](https://angular.cn/guide/template-syntax#template-statements) 章节之中。作者在网上也没有找到详细描述单向数据流的文章，所以写下此篇文章。

### 双向绑定 vs 单向数据流
在论及 Angularjs 与 Angular 之间的性能差异时，通常会提及单向数据流这一概念。单向数据流是 Angular 性能高于 Angularjs 的“秘诀”。  

两个框架都存在利用绑定来实现组件之间通信的类似机制，例如在 Anuglarjs 中定义一个父组件 `A`：

```js
app.component('aComponent', {
  controller: class ParentComponent() {
    this.value = {name: 'initial'};
  },
  template: `
    <b-component obj="$ctrl.value"></b-component>
  `
});
----------------
app.component('bComponent', {
    bindings: {
        obj: '='
    },
```

你可以发现它有一个子组件 `B` 并且父组件 `A` 向子组件 `B` 传递值的方式是使用 `obj` 输入绑定：

```js
<b-component obj="$ctrl.value"></b-component>
```

这和 Angular 很相似：

```js
@Component({
    template: `
        <b-component [obj]="value"></b-component>`
    ...
export class AppComponent {
    value = {name: 'initial'};
}
----------------
export class BComponent {
    @Input() obj;
```

首先，最重要的事情是要理解 **Angular 和 Angularjs 是在变更检测(change detection)中更新绑定的**。在对父组件 `A` 运行变更检测时，子组件 `B` 中的 `obj` 属性的值也会被更新。

```ts
bComponentInstance.obj = aComponentInstance.value;
```

这个过程演示了自顶向下的单向数据绑定或单向数据流。但是 Angularjs 的不同之处是它可以通过子组件来更新父组件中的绑定值 `value`。

```ts
app.component('parentComponent', {
  controller: function ParentComponent($timeout) {    
    $timeout(()=>{
      console.log(this.value); // logs {name: 'updated'}
    }, 3000)
  }
----------------
  
app.component('childComponent', {
    controller: function ChildComponent($timeout) {      
      $timeout(()=>{
        this.obj = { name: 'updated' };  
      }, 2000)
```

在上面代码片段中存在两个带有回调函数的 timeout 函数--首先更新子组件的属性，然后过一秒钟执行第二个 timeout 来检查父组件的属性值是否已更新，如果在 AngularJS 中运行这段代码，你将看到该父组件属性已更新。这是怎么回事？

当第一个 timeout 回调函数执行完毕后，子组件 `B` 的 `obj` 属性更新为 `{name: ‘updated’}`，AngularJS 就会运行变更检测。在这个过程中，AngularJS 检测子组件中绑定值的变化并且更新父组件中的 `value` 属性。**这是 Angularjs 变更检测机制的内置功能**。如果我在 Angular 中执行相同的操作，它将只更新子组件上的属性，但是不会冒泡到父组件中。这是两者变更检测过程中非常重要的区别。然而，有一件事困扰了我很长一段时间。

在 Angular 中，虽然没有双向绑定，但是仍然存在一种可以通过子组件来更新父组件中值的机制，即组件中的 `Output` 绑定。

```ts
@Component({
    template: `
        <h1>Hello {{value.name}}</h1>
        <a-comp (updateObj)="value = $event"></a-comp>`
    ...
export class AppComponent {
    value = {name: 'initial'};
    
    constructor() {
        setTimeout(() => {
            console.log(this.value); // logs {name: 'updated'}
        }, 3000);
----------------
@Component({...})
export class AComponent {
    @Output() updateObj = new EventEmitter();
    
    constructor() {
        setTimeout(() => {
            this.updateObj.emit({name: 'updated'});
        }, 2000);
```

首先，需要说明的是，这种方式与 Angularjs 那种直接改变子组件值来更新父组件中值的双向绑定不同。很长一段时间我都找不到答案，为什么这种方式不能称之为双向绑定？毕竟子/父组件的交互是双向的。

但后来有一天晚上，我读到了 [Victor Savkin ](https://medium.com/@vsavkin) 的这篇文章 [Two Phases of Angular Applications](https://vsavkin.com/two-phases-of-angular-2-applications-fda2517604be) 给他解释说:  
>***Angular 2 separates updating the application model and reflecting the state of the model in the view into two distinct phases.** The developer is responsible for updating the application model. Angular, by means of change detection, is responsible for reflecting the state of the model in the view.* 
>
>*Angular2 更新应用中 model 和解析 model 至 view 是位于两个不同的处理阶段。开发人员负责更新应用 model，Angular 通过变更检测，把 model 的变更映射到 view 层。*

我花了几天时间才意识到父组件属性是通过使用输出绑定机制来更新的：

```ts
<a-comp (updateObj)="value = $event"></a-comp>
```

所以上述示例中，Angular 父组件依赖于 `output` 绑定机制的更新，并不属于 Angular 的变更检测的一部分。它是在变更检测开始之前，更新应用 model 的第一个阶段执行的。因此，**单向数据流定义了变更检测期间的绑定更新体系结构**。与 Angularjs 不同，Angular 的变更检测机制下没有把子组件属性更新传播到父组件。`output` 绑定处理位于变更检测之外，因此不会将单向数据流转变为双向绑定。

另外，虽然 Angular 中没有可以在变更检测期间令父组件模型更新的内置机制，但仍然可以通过共享的服务或同步事件广播来实现。由于框架强制使用单向数据流，因此会导致 `ExpressionChangedAfterItHasBeenCheckedError` 的错误经常被误解。要了解更多有关这个错误的信息可以阅读 [Everything you need to know about the `ExpressionChangedAfterItHasBeenCheckedError` error](https://blog.angularindepth.com/everything-you-need-to-know-about-the-expressionchangedafterithasbeencheckederror-error-e3fd9ce7dbb4)。

### view 和 service 层中的单向数据流
大部分的 web 应用都使用了分层设计，视图(view)层和服务(service)层。  

![service and view layer](../assets/angular-48/1.png?raw=true)

在 web 环境下，view 层中为使用 DOM 等技术来展示用户数据，在 Angular 中 view 层则由组件实现。service 层则负责处理与存储业务相关的数据。像上图所示，service 层包含了状态管理、REST 调用、可重用的通用工具服务等。

之前解释的单向数据流是与应用的 view 层相关，Angular 中的 view 由组件呈现，所以单向数据流其实就可以表现为组件之间的数据流动。

![data flow](../assets/angular-48/2.png?raw=true)

然而，当引入 [ngrx](https://github.com/ngrx/platform)（实现了类似 Redux 的状态管理模式）之后，又会陷入另外一种困惑。[Redux 的文档中](https://redux.js.org/basics/data-flow)关于状态的描述：

>*Redux architecture revolves around a **strict unidirectional data flow**.*
>*This means that all data in an application follows the same lifecycle pattern, making the logic of your app more predictable and easier to understand…*
>
>*Redux 的架构围绕**严格的单向数据流**实现，这意味着应用程序中的所有数据都遵循着相同的生命周期，使你的应用程序逻辑更加可预测和可理解。*

所以，这里的单向数据流是与 service 层相关，而不是 view 层。在引入类 Redux 模式时，要注意区别这两者的区别。**Redux 谈到的单向数据流与 view 层无关**，Redux 主要关注的是 service 层中的状态管理模块，引入 Redux 后，Web 应用的架构则由：

![state_management](../assets/angular-48/3.png?raw=true)

转变为：  

![new state_management](../assets/angular-48/4.png?raw=true)

### 译者备注
这篇文章对 Angualrjs 与 Angular 的绑定机制做了对比，Angular 的“双向绑定”通过指令 `ngModel` 实现（在表单中可以直接使用 `ngModel`）或者由语法 `[()]` 来实现。
关于 `[()]` 其实是 `[]` 与 `()` 的集合，可以视作一种语法糖，参考一个示例：
```js
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-sizer',
  template: `
  <div>
    <button (click)="dec()" title="smaller">-</button>
    <button (click)="inc()" title="bigger">+</button>
    <label [style.font-size.px]="size">FontSize: {{size}}px</label>
  </div>`
})
export class SizerComponent {
  @Input()  size: number | string;
  @Output() sizeChange = new EventEmitter<number>();

  dec() { this.resize(-1); }
  inc() { this.resize(+1); }

  resize(delta: number) {
    this.size = Math.min(40, Math.max(8, +this.size + delta));
    this.sizeChange.emit(this.size);
  }
}
---------------app.component.html
<app-sizer [(size)]="fontSizePx"></app-sizer>
```
`[(size)]` 其实是 `[size]` 与 `(sizeChange)` 的一个简写：

```js
<app-sizer [size]="fontSizePx" (sizeChange)="fontSizePx=$event"></app-sizer>
```

可以简写的原因就是这里其实目标是实现 `fontSizePx` 的双向绑定，即子组件 `app-sizer` 中的 `size` 的改动更新可以冒泡到父组件中。`sizeChange` 则可以隐式 `emit` 出 `size` 值。

`ngModel` 指令也是同样，它其实是可以分解为 `[ngModel]` 与 `(ngModelChange)` 两个部分。
