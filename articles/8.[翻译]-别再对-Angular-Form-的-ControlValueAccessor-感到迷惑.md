# [翻译] 别再对 Angular Form 的 ControlValueAccessor 感到迷惑

> 原文链接：**[Never again be confused when implementing ControlValueAccessor in Angular forms](https://blog.angularindepth.com/never-again-be-confused-when-implementing-controlvalueaccessor-in-angular-forms-93b9eee9ee83)**


![easy-control-value-accessor](https://user-gold-cdn.xitu.io/2018/7/18/164ae1e7e911951d?w=400&h=391&f=png&s=83608)

如果你正在做一个复杂项目，必然会需要自定义表单控件，这个控件主要需要实现 `ControlValueAccessor` 接口（译者注：该接口定义方法可参考 **[API 文档说明](https://angular.io/api/forms/ControlValueAccessor)**，也可参考 **[Angular 源码定义](https://github.com/angular/angular/blob/master/packages/forms/src/directives/control_value_accessor.ts)**）。网上有大量文章描述如何实现这个接口，但很少说到它在 Angular 表单架构里扮演什么角色，如果你不仅仅想知道如何实现，还想知道为什么这样实现，那本文正合你的胃口。

首先我解释下为啥需要 `ControlValueAccessor` 接口以及它在 Angular 中是如何使用的。然后我将展示如何封装第三方组件作为 Angular 组件，以及如何使用输入输出机制实现组件间通信（译者注：Angular 组件间通信输入输出机制可参考**[官网文档](https://angular.io/guide/component-interaction)**），最后将展示如何使用 `ControlValueAccessor` 来实现一种**针对 Angular 表单**新的数据通信机制。

## FormControl 和 ControlValueAccessor
如果你之前使用过 Angular 表单，你可能会熟悉 **[FormControl](https://angular.io/api/forms/FormControl)** ，Angular 官方文档将它描述为追踪单个表单控件**值和有效性**的实体对象。需要明白，不管你使用模板驱动还是响应式表单（译者注：即模型驱动），`FormControl` 都总会被创建。如果你使用响应式表单，你需要显式创建 `FormControl` 对象，并使用 `formControl` 或 `formControlName` 指令来绑定原生控件；如果你使用模板驱动方法，`FormControl` 对象会被 **[`NgModel`](https://angular.io/api/forms/NgModel)** 指令隐式创建（译者注：可查看 Angular 源码**[这一行](https://github.com/angular/angular/blob/master/packages/forms/src/directives/ng_model.ts#L113)**）：

```ts
@Directive({
  selector: '[ngModel]...',
  ...
})
export class NgModel ... {
  _control = new FormControl();   <---------------- here
```

不管 `formControl` 是隐式还是显式创建，都必须和原生 DOM 表单控件如 `input,textarea` 进行交互，并且很有可能需要自定义一个表单控件作为 Angular 组件而不是使用原生表单控件，而通常自定义表单控件会封装一个使用纯 JS 写的控件如 **[`jQuery UI's Slider`](https://jqueryui.com/slider/)**。本文我将使用**原生表单控件**术语来区分 Angular 特定的 `formControl` 和你在 `html` 使用的表单控件，但你需要知道任何一个自定义表单控件都可以和 `formControl` 指令进行交互，而不仅仅是原生表单控件如 `input`。

原生表单控件数量是有限的，但是自定义表单控件是无限的，所以 Angular 需要一种通用机制来**桥接**原生/自定义表单控件和 `formControl` 指令，而这正是 **[`ControlValueAccessor`](https://angular.io/api/forms/ControlValueAccessor)** 干的事情。这个对象桥接原生表单控件和 `formControl` 指令，并同步两者的值。官方文档是这么描述的（译者注：为清晰理解，该描述不翻译）：

> A ControlValueAccessor acts as a bridge between the Angular forms API and a native element in the DOM.


任何一个组件或指令都可以通过实现 `ControlValueAccessor` 接口并注册为 `NG_VALUE_ACCESSOR`，从而转变成 `ControlValueAccessor` 类型的对象，稍后我们将一起看看如何做。另外，这个接口还定义两个重要方法——`writeValue` 和 `registerOnChange` （译者注：可查看 Angular 源码**[这一行](https://github.com/angular/angular/blob/master/packages/forms/src/directives/control_value_accessor.ts)**）：

```
interface ControlValueAccessor {
  writeValue(obj: any): void
  registerOnChange(fn: any): void
  registerOnTouched(fn: any): void
  ...
}
```

`formControl` 指令使用 `writeValue` 方法设置原生表单控件的值（译者注：你可能会参考 **[L186](https://github.com/angular/angular/blob/master/packages/forms/src/directives/reactive_directives/form_control_directive.ts#L186)** 和 **[L41](https://github.com/angular/angular/blob/master/packages/forms/src/directives/shared.ts#L41)**）；使用 `registerOnChange` 方法来注册由每次原生表单控件值更新时触发的回调函数（译者注：你可能会参考这三行，**[L186](https://github.com/angular/angular/blob/master/packages/forms/src/directives/reactive_directives/form_control_directive.ts#L186)** 和 **[L43](https://github.com/angular/angular/blob/master/packages/forms/src/directives/shared.ts#L43)**，以及 **[L85](https://github.com/angular/angular/blob/master/packages/forms/src/directives/shared.ts#L85)**），**你需要把更新的值传给这个回调函数，这样对应的 Angular 表单控件值也会更新**（译者注：这一点可以参考 Angular 它自己写的 `DefaultValueAccessor` 的写法是如何把 input 控件每次更新值传给回调函数的，**[L52](https://github.com/angular/angular/blob/master/packages/forms/src/directives/default_value_accessor.ts#L52)** 和 **[L89](https://github.com/angular/angular/blob/master/packages/forms/src/directives/default_value_accessor.ts#L89)**）；使用 `registerOnTouched` 方法来注册用户和控件交互时触发的回调（译者注：你可能会参考 **[L95](https://github.com/angular/angular/blob/master/packages/forms/src/directives/shared.ts#L95)**）。

下图是 `Angular 表单控件` 如何通过 `ControlValueAccessor` 来和`原生表单控件`交互的（译者注：`formControl` 和**你写的或者 Angular 提供的 `CustomControlValueAccessor`** 两个都是要绑定到 native DOM element 的指令，而 `formControl` 指令需要借助 `CustomControlValueAccessor` 指令/组件，来和 native DOM element 交换数据。）：

![angular_form_control-controlValueAccessor-native_form_control](https://user-gold-cdn.xitu.io/2018/7/19/164ae1f202d9c5d7?w=684&h=188&f=jpeg&s=31681)

再次强调，不管是使用响应式表单显式创建还是使用模板驱动表单隐式创建，`ControlValueAccessor` 都总是和 Angular 表单控件进行交互。

Angular 也为所有原生 DOM 表单元素创建了 `Angular` 表单控件（译者注：Angular 内置的 ControlValueAccessor）：

Accessor | Form Element
---------|-------------
**[DefaultValueAccessor](https://github.com/angular/angular/blob/master/packages/forms/src/directives/default_value_accessor.ts#L47)**|input,textarea
**[CheckboxControlValueAccessor](https://github.com/angular/angular/blob/master/packages/forms/src/directives/checkbox_value_accessor.ts#L31)** |input[type=checkbox]
**[NumberValueAccessor](https://github.com/angular/angular/blob/master/packages/forms/src/directives/number_value_accessor.ts#L30)** | input[type=number]
**[RadioControlValueAccessor](https://github.com/angular/angular/blob/master/packages/forms/src/directives/radio_control_value_accessor.ts#L88)** |input[type=radio]
**[RangeValueAccessor](https://github.com/angular/angular/blob/master/packages/forms/src/directives/range_value_accessor.ts)** | input[type=range]
**[SelectControlValueAccessor](https://github.com/angular/angular/blob/master/packages/forms/src/directives/select_control_value_accessor.ts#L94)** | select
**[SelectMultipleControlValueAccessor](https://github.com/angular/angular/blob/master/packages/forms/src/directives/select_multiple_control_value_accessor.ts#L74)** | select[multiple] 

从上表中可看到，当 Angular 在组件模板中中遇到 `input` 或 `textarea` DOM 原生控件时，会使用`DefaultValueAccessor` 指令：

```ts
@Component({
  selector: 'my-app',
  template: `
      <input [formControl]="ctrl">
  `
})
export class AppComponent {
  ctrl = new FormControl(3);
}
```

所有表单指令，包括上面代码中的 `formControl` 指令，都会调用 **[setUpControl](https://github.com/angular/angular/blob/master/packages/forms/src/directives/shared.ts#L35)** 函数来让表单控件和`DefaultValueAccessor` 实现交互（译者注：意思就是上面代码中绑定的 `formControl` 指令，在其自身实例化时，会调用 `setUpControl()` 函数给同样绑定到 `input ` 的 `DefaultValueAccessor` 指令做好安装工作，如  **[L85](https://github.com/angular/angular/blob/master/packages/forms/src/directives/shared.ts#L85)**，这样 `formControl` 指令就可以借助 `DefaultValueAccessor` 来和 `input` 元素交换数据了）。细节可参考 `formControl` 指令的代码：

```ts
export class FormControlDirective ... {
  ...
  ngOnChanges(changes: SimpleChanges): void {
    if (this._isControlChanged(changes)) {
      setUpControl(this.form, this);
```

还有 `setUpControl` 函数源码也指出了原生表单控件和 Angular 表单控件是如何数据同步的（译者注：作者贴的可能是 Angular v4.x 的代码，v5 有了点小小变动，但基本相似）：

```ts
export function setUpControl(control: FormControl, dir: NgControl) {
  
  // initialize a form control
  // 调用 writeValue() 初始化表单控件值
  dir.valueAccessor.writeValue(control.value);
  
  // setup a listener for changes on the native control
  // and set this value to form control
  // 设置原生控件值更新时监听器，每当原生控件值更新，Angular 表单控件值也更新
  valueAccessor.registerOnChange((newValue: any) => {
    control.setValue(newValue, {emitModelToViewChange: false});
  });

  // setup a listener for changes on the Angular formControl
  // and set this value to the native control
  // 设置 Angular 表单控件值更新监听器，每当 Angular 表单控件值更新，原生控件值也更新
  control.registerOnChange((newValue: any, ...) => {
    dir.valueAccessor.writeValue(newValue);
  });
```

只要我们理解了内部机制，就可以实现我们自定义的 Angular 表单控件了。

## 组件封装器
由于 Angular 为所有默认原生控件提供了控件值访问器，所以在封装第三方插件或组件时，需要写一个新的控件值访问器。我们将使用上文提到的 jQuery UI 库的 **[slider](https://jqueryui.com/slider/)** 插件，来实现一个自定义表单控件吧。


### 简单的封装器
最基础实现是通过简单封装使其能在屏幕上显示出来，所以我们需要一个 `NgxJquerySliderComponent` 组件，并在其模板里渲染出 `slider`：

```ts
@Component({
  selector: 'ngx-jquery-slider',
  template: `
      <div #location></div>
  `,
  styles: ['div {width: 100px}']
})
export class NgxJquerySliderComponent {
  @ViewChild('location') location;
  widget;
  ngOnInit() {
    this.widget = $(this.location.nativeElement).slider();
  }
}
```

这里我们使用标准的 `jQuery` 方法在原生 DOM 元素上创建一个 `slider` 控件，然后使用 `widget` 属性引用这个控件。

一旦简单封装好了 `slider` 组件，我们就可以在父组件模板里使用它：

```ts
@Component({
  selector: 'my-app',
  template: `
      <h1>Hello {{name}}</h1>
      <ngx-jquery-slider></ngx-jquery-slider>
  `
})
export class AppComponent { ... }
```

为了运行程序我们需要加入 `jQuery` 相关依赖，简化起见，在 `index.html` 中添加全局依赖：

```html
<script src="https://code.jquery.com/jquery-3.2.1.js"></script>
<script src="https://code.jquery.com/ui/1.12.1/jquery-ui.js"></script>
<link rel="stylesheet" href="//code.jquery.com/ui/1.12.1/themes/smoothness/jquery-ui.css">
```

这里是安装依赖的**[源码](https://plnkr.co/edit/OyCXMLwVcWQelO1en9tR?p=preview)**。

### 交互式表单控件
上面的实现还不能让我们自定义的 `slider` 控件与父组件交互，所以还得使用输入/输出绑定来是实现组件间数据通信：

```ts
export class NgxJquerySliderComponent {
  @ViewChild('location') location;
  @Input() value;
  @Output() private valueChange = new EventEmitter();
  widget;

  ngOnInit() {
    this.widget = $(this.location.nativeElement).slider();   
    this.widget.slider('value', this.value);
    this.widget.on('slidestop', (event, ui) => {
      this.valueChange.emit(ui.value);
    });
  }

  ngOnChanges() {
    if (this.widget && this.widget.slider('value') !== this.value) {
      this.widget.slider('value', this.value);
    }
  }
}
```

一旦 `slider` 组件创建，就可以订阅 `slidestop` 事件获取变化的值，一旦 `slidestop` 事件被触发了，就可以使用输出事件发射器 `valueChanges` 通知父组件。当然我们也可以使用 `ngOnChanges` 生命周期钩子来追踪输入属性 `value` 值的变化，一旦其值变化，我们就将该值设置为 `slider` 控件的值。

然后就是父组件中如何使用 `slider` 组件的代码实现：

```ts
<ngx-jquery-slider
    [value]="sliderValue"
    (valueChange)="onSliderValueChange($event)">
</ngx-jquery-slider>
```

**[源码](https://plnkr.co/edit/bCrkvABQkRZXrnVvTW7D?p=preview)**在这里。

但是，我们想要的是，使用 `slider` 组件作为表单的一部分，并使用模板驱动表单或响应式表单的指令与其数据通信，那就需要让其实现 `ControlValueAccessor` 接口了。由于我们将实现的是新的组件通信方式，所以不需要标准的输入输出属性绑定方式，那就移除相关代码吧。（译者注：作者先实现标准的输入输出属性绑定的通信方式，又要删除，主要是为了引入**新的表单组件交互方式**，即 `ControlValueAccessor`。）

## 实现自定义控件值访问器
实现自定义控件值访问器并不难，只需要两步：
1. 注册 `NG_VALUE_ACCESSOR` 提供者
2. 实现 `ControlValueAccessor` 接口

`NG_VALUE_ACCESSOR` 提供者用来指定实现了 `ControlValueAccessor` 接口的类，并且被 Angular 用来和 `formControl` 同步，通常是使用组件类或指令来注册。所有表单指令都是使用`NG_VALUE_ACCESSOR` 标识来注入控件值访问器，然后选择合适的访问器（译者注：这句话可参考这两行代码，**[L175](https://github.com/angular/angular/blob/master/packages/forms/src/directives/reactive_directives/form_control_directive.ts#L175)** 和 **[L181](https://github.com/angular/angular/blob/master/packages/forms/src/directives/reactive_directives/form_control_directive.ts#L181)**）。要么选择`DefaultValueAccessor` 或者内置的数据访问器，否则 Angular 将会选择自定义的数据访问器，并且有且只有一个自定义的数据访问器（译者注：这句话参考 **[`selectValueAccessor` 源码实现](https://github.com/angular/angular/blob/master/packages/forms/src/directives/shared.ts#L186)**）。

让我们首先定义提供者：

```
@Component({
  selector: 'ngx-jquery-slider',
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: NgxJquerySliderComponent,
    multi: true
  }]
  ...
})
class NgxJquerySliderComponent implements ControlValueAccessor {...}
```

我们直接在组件装饰器里直接指定类名，然而 Angular 源码默认实现是放在类装饰器外面：

```ts
export const DEFAULT_VALUE_ACCESSOR: any = {
  provide: NG_VALUE_ACCESSOR,
  useExisting: forwardRef(() => DefaultValueAccessor),
  multi: true
};
@Directive({
  selector:'input',
  providers: [DEFAULT_VALUE_ACCESSOR]
  ...
})
export class DefaultValueAccessor implements ControlValueAccessor {}
```

放在外面就需要使用 `forwardRef`，关于原因可以参考 **[What is forwardRef in Angular and why we need it](https://blog.angularindepth.com/what-is-forwardref-in-angular-and-why-we-need-it-6ecefb417d48)** 。当实现自定义 `controlValueAccessor`，我建议还是放在类装饰器里吧（译者注：个人建议还是学习 Angular 源码那样放在外面）。

一旦定义了提供者后，就让我们实现 `controlValueAccessor` 接口：

```ts
export class NgxJquerySliderComponent implements ControlValueAccessor {
  @ViewChild('location') location;
  widget;
  onChange;
  value;
  
ngOnInit() {
	this.widget = $(this.location.nativeElement).slider(this.value);
   this.widget.on('slidestop', (event, ui) => {
      this.onChange(ui.value);
    });
}
  
writeValue(value) {
    this.value = value;
    if (this.widget && value) {
      this.widget.slider('value', value);
    }
  }
  
registerOnChange(fn) { this.onChange = fn;  }

registerOnTouched(fn) {  }
```

由于我们对用户是否与组件交互不感兴趣，所以先把 `registerOnTouched` 置空吧。在`registerOnChange` 里我们简单保存了对回调函数 `fn` 的引用，回调函数是由 `formControl` 指令传入的（译者注：参考 **[L85](https://github.com/angular/angular/blob/master/packages/forms/src/directives/shared.ts#L85)**），只要每次 `slider` 组件值发生改变，就会触发这个回调函数。在 `writeValue` 方法内我们把得到的值传给 `slider` 组件。

现在我们把上面描述的功能做成一张交互式图：

![jQuery_slider-slider_component-form_control](https://user-gold-cdn.xitu.io/2018/7/19/164ae1fa62375ccd?w=762&h=257&f=jpeg&s=32448)

如果你把简单封装和 `controlValueAccessor` 封装进行比较，你会发现父子组件交互方式是不一样的，尽管封装的组件与 `slider` 组件的交互是一样的。你可能注意到 `formControl` 指令实际上简化了与父组件交互的方式。这里我们使用 `writeValue` 来向子组件写入数据，而在简单封装方法中使用 `ngOnChanges`；调用 `this.onChange` 方法输出数据，而在简单封装方法中使用 `this.valueChange.emit(ui.value)`。

现在，实现了 `ControlValueAccessor` 接口的自定义 `slider` 表单控件完整代码如下：

```
@Component({
  selector: 'my-app',
  template: `
      <h1>Hello {{name}}</h1>
      <span>Current slider value: {{ctrl.value}}</span>
      <ngx-jquery-slider [formControl]="ctrl"></ngx-jquery-slider>
      <input [value]="ctrl.value" (change)="updateSlider($event)">
  `
})
export class AppComponent {
  ctrl = new FormControl(11);

  updateSlider($event) {
    this.ctrl.setValue($event.currentTarget.value, {emitModelToViewChange: true});
  }
}
```

你可以查看程序的**[最终实现](https://plnkr.co/edit/c3tUH819er2gA9ertQS6?p=preview)**。

## Github
项目的 **[Github 仓库](https://github.com/maximusk/custom-form-control-that-implements-control-value-accessor-and-wraps-jquery-slider)**。


# 深入学习 @angular/forms

1. setupControl: 实例化 control 对象，通过 ControlValueAccessor 来和 DOM 元素绑定。
2. addFormGroup: 把某一个 control 对象添加到一个 FormGroup 中。

@angular/forms 提供的装备：
```
Directives:
Template-Driven-Directives: NgForm,NgModel,NgModelGroup
Reactive-Driven-Directives: FormControl,FormControlName,FormGroup,FormGroupName,FormArrayName

Built-in ControlValueAccessor:(ControlValueAccessor 是搭建以上两种 directives 与 DOM element 之间的桥梁)
DefaultValueAccessor,NumberValueAccessor,RangeValueAccessor,CheckboxControlValueAccessor,SelectControlValueAccessor,SelectMultipleControlValueAccessor,RadioControlValueAccessor

Built-in Validator:
RequiredValidator,MinLengthValidator,MaxLengthValidator,PatternValidator,CheckboxRequiredValidator,EmailValidator
```

问题一：指令中的对象，如 FormControl 对象，是如何与 DOM element 进行绑定的？
问题二：已经绑定 DOM 元素的控件对象，如 FormControl 对象，是如何被添加到父控件对象如 FormGroup 中的？

先从 Template-Driven 分析，**[NgModel](https://github.com/angular/angular/blob/master/packages/forms/src/directives/ng_model.ts#L106-L111)** 指令是如何把 FormControl 对象与对应 DOM 元素绑定的？又是如何把绑定 DOM 元素的 FormControl 对象添加到 FormGroup 上的？
```
NgModel <- NgControl <- AbstractControlDirective
```

## @angular/forms 源码解析之双向绑定

FormControlDirective:
- JS object(let control = new FormControl)
- input[type=number],input[type=radio],...

我们知道，Angular 的 @angular/forms 包提供了 **[NgModel](https://github.com/angular/angular/blob/master/packages/forms/src/directives/ng_model.ts#L106-L111)** 指令，来实现双向绑定，即把一个 JS 变量（假设为 name）与一个 DOM 元素（假设为 input 元素）进行绑定，这样 name 的值发生变化，input 元素 的 value 也会自动变化；input 元素的 value 发生变化，name 的值也会自动变化。如下代码，展示一个最简单的双向绑定（也可见 **[stackblitz demo](https://stackblitz.com/edit/ng-model-lx1036)**）：

```html
@Component({
  selector: 'my-app',
  template: `
    <input [ngModel]="name" (ngModelChange)="this.name=$event">
    <button (click)="this.name = this.name + ' , apple';">ChangeName</button>
    <p>{{name}}</p>
  `,
  styleUrls: [ './app.component.css' ]
})
export class AppComponent  {
  name = 'banana';
}
```

上面代码使用了 **NgModel** 指令来把变量 **name** 和 **input** DOM 元素双向绑定到了一起，这里为了更清晰理解 **NgModel** 的本质，没有使用 **[(ngModel)]** 语法糖。实际上，在模板里写 **[(xxx)]** 这种 **'BANANA_BOX'** 语法，@angular/compiler 的 Template Parser 会把这种语法拆解为为 **[xxx]** 和 **(xxxChange)**，可看 **[L448-L453](https://github.com/angular/angular/blob/master/packages/compiler/src/template_parser/template_parser.ts#L448-L453)** 和 **[L501-L505](https://github.com/angular/angular/blob/master/packages/compiler/src/template_parser/template_parser.ts#L501-L505)**，所以 **[(xxx)]** 仅仅是为了省事的简单写法。

查看 **[stackblitz demo](https://stackblitz.com/edit/ng-model-lx1036)** 可以看到，如果修改 input 里的值，name 变量的值也自动发生变化了，这点可从与 name 绑定的 p 标签值自动变化看出；如果点击 button 修改了 name 的值，input 输入框内的 value 值也发生变化了，这点可从 input 框内的值变化可看到。那 **NgModel** 指令是如何做到双向绑定的呢？

在理解 **NgModel** 指令双向绑定原理之前，可以先看看双向绑定最简单形式：

```html
    <input [value]="country" (input)="country = $event.target.value">
    <button (click)="country = country + ' , China';">ChangeCountry</button>
    <p>Hello {{country}}!</p>
```

点击 button 修改 model 时，就会自动修改 input 的 value 值，即自动修改 view，数据流方向就是 model -> view；更新 input 框内值时，就会自动修改 country 这个 model 值，这点可从绑定的 p 标签看到，这时数据流方向就是 view -> model。当然，这是最简单且最不可扩展的一个双向绑定实例，如果去设计一个指令，不仅仅需要考虑 view 的不同类型，而且还需要考虑数据校验问题。尽管如此，这个简单实例与 **NgModel** 指令本质是类似的。

如果自己设计这样一个双向绑定指令，那它的输入必然是绑定的变量 **name**，该指令接收 **name** 后再去更新 input 元素的 value 值（还得支持 textarea，select 等 DOM 元素，甚至组件等自定义 DOM 元素），这样 name 发生变化，input 的 value 也会自动变化，即 model -> view；输出的必然是 input 元素的 value 值，然后赋值给 name，这样 input 元素的值变化，name 值也自动变化，即 view -> model。**这里的最难点是该指令得能够写 DOM 元素（不管原生或者自定义 DOM 元素）的值，并且能够监听 DOM 元素的值变化，读取变化的值。** 所以，为了支持原生 DOM 元素或自定义 DOM 元素，为了有个好的设计模式，必然会抽象出一个接口，来帮助指令去写入和监听读取 DOM 元素值，有了这个接口，事情就简单很多了。

**现在，我们需要搞明白两个问题：name 值发生变化时，input 的 value 如何自动变化；input 的 value 变化，name 值如何自动变化?**

绑定到 input 上的 **NgModel** 指令在实例化时，其 **[构造函数](https://github.com/angular/angular/blob/master/packages/forms/src/directives/ng_model.ts#L167-L177)** 会首先查找出 **[ControlValueAccessor](https://github.com/angular/angular/blob/master/packages/forms/src/directives/control_value_accessor.ts#L20-L110)** 对象，这个 ControlValueAccessor 就是上文提到的抽象出来的对象，该对象会具体负责更新和监听读取 DOM 元素的值。上文模板中的 input 元素不仅仅绑定了 **NgModel** 指令，实际上还绑定了 **[DefaultValueAccessor](https://github.com/angular/angular/blob/master/packages/forms/src/directives/default_value_accessor.ts#L45-L59)** 指令，这点可以从该指令的选择器知道，如果 input 模板是这么写的：

```html
<input [ngModel]="name" (ngModelChange)="this.name=$event" type="number">
```

那不仅仅绑定了 **DefaultValueAccessor** 指令，还绑定了 **[NumberValueAccessor](https://github.com/angular/angular/blob/master/packages/forms/src/directives/number_value_accessor.ts#L28-L38)** 指令。

由于 **DefaultValueAccessor** 的 providers 属性提供了 **NG_VALUE_ACCESSOR** 令牌，并且该令牌指向的对象就是 **DefaultValueAccessor**，所以 **NgModel** 构造函数中注入的 **NG_VALUE_ACCESSOR** 令牌包含的 **ControlValueAccessor** 对象数组只有 **DefaultValueAccessor** 一个。如果是 type="number" 的 input，则 **[valueAccessors](https://github.com/angular/angular/blob/master/packages/forms/src/directives/ng_model.ts#L170-L171)** 包含 **NumberValueAccessor** 和 **DefaultValueAccessor** 这两个对象。构造函数中的 **[selectValueAccessor()](https://github.com/angular/angular/blob/master/packages/forms/src/directives/shared.ts#L186-L218)** 方法会依次遍历 NG_VALUE_ACCESSOR 令牌提供的 **ControlValueAccessor** 对象数组，如果是自定义的 **ControlValueAccessor** 优先选择自定义的，如果是 @angular/forms 内置的 **ControlValueAccessor** 就选择内置的（内置的也就 6 个），否则最后选择默认的 **ControlValueAccessor** 即 **DefaultValueAccessor** 对象。对于本文 demo，那就是默认的 **DefaultValueAccessor** 对象。注意的一点是，注入的 NG_VALUE_ACCESSOR 令牌有装饰器 **[@Self](https://github.com/angular/angular/blob/master/packages/forms/src/directives/ng_model.ts#L170)**，所以只能从自身去查找这个依赖，自身的意思是 **NgModel** 指令自己，和它一起挂载到 input 元素的其他指令。另外，input 上没有绑定任何 validators 指令，所以注入的 NG_VALIDATORS 和 NG_ASYNC_VALIDATORS 令牌解析的值为空，并且 input 单独使用，没有放在 form 元素内，或 **[FormGroup](https://github.com/angular/angular/blob/master/packages/forms/src/directives/reactive_directives/form_group_directive.ts#L61-L67)** 绑定的元素内，所以不存在宿主控件容器 **[ControlContainer](https://github.com/angular/angular/blob/master/packages/forms/src/directives/ng_model.ts#L167)**，即 parent 也为空。

**NgModel** 指令在首次实例化时，运行 **[_setUpControl()](https://github.com/angular/angular/blob/master/packages/forms/src/directives/ng_model.ts#L181)** 方法，利用 **ControlValueAccessor**（本 demo 即 **DefaultValueAccessor** 对象） 把 **NgModel** 指令内部的 **[FormControl](https://github.com/angular/angular/blob/master/packages/forms/src/directives/ng_model.ts#L113)** 对象与 DOM 元素绑定。由于本 demo 中，**NgModel** 指令绑定的 input 没有父控件容器，所以会调用 **[_setUpStandalone](https://github.com/angular/angular/blob/master/packages/forms/src/directives/ng_model.ts#L228-L231)** 方法，核心方法就是 **[setUpControl()](https://github.com/angular/angular/blob/master/packages/forms/src/directives/shared.ts#L35-L63)**，该方法主要包含两点：第一点，通过调用 **[setUpViewChangePipeline()](https://github.com/angular/angular/blob/master/packages/forms/src/directives/shared.ts#L84-L92)** 向 **DefaultValueAccessor** 对象内注册一个回调函数，这样当 input 值发生变化时，就触发  **[input 事件](https://github.com/angular/angular/blob/master/packages/forms/src/directives/default_value_accessor.ts#L52)** 时，会执行这个回调函数，而这个回调函数的逻辑 **[一是更新 FormControl 的 value](https://github.com/angular/angular/blob/master/packages/forms/src/directives/shared.ts#L105)**，二是让 **NgModel** 指令抛出 **[ngModelChange](https://github.com/angular/angular/blob/master/packages/forms/src/directives/shared.ts#L106)** 事件，该事件包含的值就是当前 input 变化的新值，所以，**setUpViewChangePipeline()** 方法的作用就是搭建了 view -> model 的管道，这样 view (这里是 input) 值发生变化时，会同步 **FormControl** 对象的 value 值，并让 **NgModel** 指令把这个新值输出出去；第二点，通过调用 **[setUpModelChangePipeline](https://github.com/angular/angular/blob/master/packages/forms/src/directives/shared.ts#L44)** 方法向 **FormControl** 对象内注册 **[一个回调](https://github.com/angular/angular/blob/master/packages/forms/src/directives/shared.ts#L111-L116)**，这个回调逻辑是当 **FormControl** 的 value 值发生变化时（本 demo 中就是 [ngModel]="name" 时，name 值发生变化，也就是属性值改变，这样 **[isPropertyUpdated(changes, this.viewModel)](https://github.com/angular/angular/blob/master/packages/forms/src/directives/ng_model.ts#L186)** 就为 **true**，这样就会需要更新 **FormControl** 的 value 值 **[FormControl.setValue(value)](https://github.com/angular/angular/blob/master/packages/forms/src/directives/ng_model.ts#L258-L261)**，从而会 **[触发](https://github.com/angular/angular/blob/master/packages/forms/src/model.ts#L936-L939)** 上文说的 **FormControl** 对象内的回调函数），通过调用 **[ControlValueAccessor.writeValue()](https://github.com/angular/angular/blob/master/packages/forms/src/directives/shared.ts#L113)** 方法去修改 view (这里是 input) 的 value 值（本 demo 中使用的是 **[DefaultValueAccessor.writeValue(value)](https://github.com/angular/angular/blob/master/packages/forms/src/directives/default_value_accessor.ts#L74-L76)**），然后让 **NgModel** 指令抛出 **[ngModelChange](https://github.com/angular/angular/blob/master/packages/forms/src/directives/shared.ts#L106)** 事件，该事件包含的值就是当前 **FormControl** 对象 **[变化的新值](https://github.com/angular/angular/blob/master/packages/forms/src/directives/shared.ts#L116)**，所以，**setUpModelChangePipeline()** 方法的作用就是搭建了 model -> view 的管道，这样 FormControl 对象值发生改变时，会同步更新 view 的 value，并让 **NgModel** 指令把这个新值输出出去。

通过以上的解释，就能理解 **name 值发生变化时，input 的 value 是如何自动变化的；input 的 value 发生变化时，name 值是如何自动变化的。（最好能一个个点击链接查看源码，效率更高。）** 一句话解释就是：**NgModel** 指令初始化时先安装了两个回调（一个是 view 变化时更新 FormControl 对象 value 值的回调，另一个是 FormControl 对象 value 值变化时更新 view 值的回调），数据流方向从 view -> model 时，更新 FormControl 对象并抛出携带该值的 **ngModelChange** 事件，数据流方向从 model -> view 时，利用 ControlValueAccessor 去更新 view 值，同时也抛出携带该值的 **ngModelChange** 事件。抛出的 **ngModelChange** 事件包含新值，模板中的 **$event** 会被 @angular/compiler 特殊处理，为 **ngModelChange** 事件抛出的值。

当然，本文没有考虑存在 Validators 的情况，如果 input 模板修改为如下代码：

```
<input [ngModel]="name" (ngModelChange)="this.name=$event" required>
```

那该模板除了绑定 **NgModel** 指令外，还绑定了 **[RequiredValidator 指令](https://github.com/angular/angular/blob/master/packages/forms/src/directives/validators.ts#L64-L81)**，这样不管数据流方向是 view -> model 还是 model -> view，在数据流动之前，还需要运行验证器，验证数据的有效性。这样 NgModel 的构造函数里就会包含 **[一个 RequiredValidator 对象](https://github.com/angular/angular/blob/master/packages/forms/src/directives/ng_model.ts#L174)**，然后 **[把这个 Validator 传给 FormControl 对象](https://github.com/angular/angular/blob/master/packages/forms/src/directives/shared.ts#L39)**，最后注册 **[validatorChange 回调](https://github.com/angular/angular/blob/master/packages/forms/src/directives/shared.ts#L54-L57)**，这样以后 FormControl 值更新时就会 **[运行 Validators](https://github.com/angular/angular/blob/master/packages/forms/src/model.ts#L578-L580)**。

总之，**NgModel** 指令来管理 model <-> view 的数据流，内部存在一个 FormControl 对象，用来读取存储值和验证有效性，从 FormControl 读取的值会赋值给外界传进来的 model，view 是借助 ControlValueAccessor 来读写值。整个 @angular/forms 包的设计也是按照这种数据流形式，并不复杂。

也可阅读 @angular/forms 相关文章了解如何写一个自定义的 ControlValueAccessor：**[译 别再对 Angular 表单的 ControlValueAccessor 感到迷惑](https://juejin.im/post/5abcc723f265da23830af99a)**。



## @angular/forms 源码解析之 Validators
我们知道，@angular/forms 包主要用来解决表单问题的，而表单问题非常重要的一个功能就是表单校验功能。**数据校验非常重要，不仅仅前端在发请求给后端前需要校验数据，后端对前端发来的数据也需要校验其有效性和逻辑性，尤其在存入数据库前还得校验数据的有效性。** @angular/forms 定义了一个 **[Validator 接口](https://github.com/angular/angular/blob/master/packages/forms/src/directives/validators.ts#L21-L43)**，并内置了 **[RequiredValidator](https://github.com/angular/angular/blob/master/packages/forms/src/directives/validators.ts#L64-L81)**、**[CheckboxRequiredValidator](https://github.com/angular/angular/blob/master/packages/forms/src/directives/validators.ts#L104-L121)**、**[EmailValidator](https://github.com/angular/angular/blob/master/packages/forms/src/directives/validators.ts#L137-L154)**、**[MinLengthValidator](https://github.com/angular/angular/blob/master/packages/forms/src/directives/validators.ts#L193-L203)**、**[MaxLengthValidator](https://github.com/angular/angular/blob/master/packages/forms/src/directives/validators.ts#L245-L255)**、**[PatternValidator](https://github.com/angular/angular/blob/master/packages/forms/src/directives/validators.ts#L292-L309)** 六个常用的校验指令，每一个 validator 都实现了 **Validator 接口**。这些校验指令的使用很简单，比如使用 **EmailValidator** 和 **RequiredValidator** 指令来校验输入的数据得是 email 且不能为空：

```
<input type="email" name="email" ngModel email required>
```

这样输入的如果不是 email 格式，**EmailValidator** 指令就会校验错误，会给 host（这里也就是 input 元素）添加 **'ng-invalid' class**，这样开发者可以给这个 class 添加一些 css 效果，提高用户体验。那么，其内部运行过程是怎样的呢？

实际上，上面 demo 中不仅仅绑定了 **[NgModel](https://github.com/angular/angular/blob/master/packages/forms/src/directives/ng_model.ts#L49-L111)** 指令，还绑定了 **EmailValidator** 和 **RequiredValidator** 两个 validators 指令。指令在实例化时是按照声明顺序依次进行的，有依赖的指令则置后，**[FormsModule](https://github.com/angular/angular/blob/master/packages/forms/src/form_providers.ts#L24)** 先是声明了 **[RequiredValidator](https://github.com/angular/angular/blob/master/packages/forms/src/directives.ts#L60)** 指令，然后是 **[EmailValidator](https://github.com/angular/angular/blob/master/packages/forms/src/directives.ts#L65)** 指令，最后才是 **[NgModel](https://github.com/angular/angular/blob/master/packages/forms/src/directives.ts#L68)**，所以实例化顺序是 RequiredValidator -> EmailValidator -> NgModel，同时由于 **NgModel** 依赖于 **[NG_VALIDATORS](https://github.com/angular/angular/blob/master/packages/forms/src/directives/ng_model.ts#L168)**，所以就算 **NgModel** 声明在前也会被置后实例化。**RequiredValidator** 和 **EmailValidator** 在实例化过程中都会提供 **[REQUIRED_VALIDATOR](https://github.com/angular/angular/blob/master/packages/forms/src/directives/validators.ts#L50-L54)** 和 **[EMAIL_VALIDATOR](https://github.com/angular/angular/blob/master/packages/forms/src/directives/validators.ts#L127-L134)** 两个服务，并且 StaticProvider 的 multi 属性设置为 true，这样可以容许有多个依赖服务（这里是 RequiredValidator 和 EmailValidator 对象）公用一个令牌（这里是 NG_VALIDATORS），**[multi 属性作用可以查看源码中说明](https://github.com/angular/angular/blob/master/packages/core/src/di/provider.ts#L201-L205)**。当 **NgModel** 实例化时，其构造依赖于 **[@Self() NG_VALIDATORS](https://github.com/angular/angular/blob/master/packages/forms/src/directives/ng_model.ts#L168)**，**@Self()** 表示从 **NgModel** 指令挂载的宿主元素中去查找这个令牌拥有的服务，**NgModel** 没有提供 **NG_VALIDATORS**，但是挂载在 input 宿主元素上的 **REQUIRED_VALIDATOR** 和 **EMAIL_VALIDATOR** 却提供了这个服务，所以 **NgModel** 的依赖 **[validators](https://github.com/angular/angular/blob/master/packages/forms/src/directives/ng_model.ts#L174)** 就是这两个指令组成的对象数组。

**NgModel** 在实例化时，由于没有父控件容器，所以会调用 **[_setUpStandalone()](https://github.com/angular/angular/blob/master/packages/forms/src/directives/ng_model.ts#L228-L231)**，从而调用 **[setUpControl()](https://github.com/angular/angular/blob/master/packages/forms/src/directives/shared.ts#L35-L63)** 方法设置 FormControl 对象的 **[同步 validator 依赖](https://github.com/angular/angular/blob/master/packages/forms/src/directives/shared.ts#L39)**（如果有异步 validator 依赖，也同理），这个依赖是调用 **[Validators.compose()](https://github.com/angular/angular/blob/master/packages/forms/src/validators.ts#L337-L345)** 返回的一个 **ValidatorFn** 函数。而  **Validators.compose()** 参数调用的是 **[NgModel.validator](https://github.com/angular/angular/blob/master/packages/forms/src/directives/ng_model.ts#L200)**，也就是调用 **[composeValidators](https://github.com/angular/angular/blob/master/packages/forms/src/directives/shared.ts#L143-L145)** 获得 ValidatorFn，内部会调用 **normalizeValidator()** 函数转换为为 **[(AbstractControl) => Validator.validate()](https://github.com/angular/angular/blob/master/packages/forms/src/directives/normalize_validator.ts#L13-L14)**。所以，和 input 控件绑定的 FormControl 对象就有了同步 validator 数据校验器。那在 input 输入框内输入数据时，校验器是在何时被运行的呢？

**NgModel** 实例化时，还安装了一个 **[视图数据更新回调](https://github.com/angular/angular/blob/master/packages/forms/src/directives/shared.ts#L84-L92)**，这样当 input 视图内的数据更新时，就会运行这个回调，该回调会更新 FormControl 的 value 值，即 **[FormControl.setValue() 函数](https://github.com/angular/angular/blob/master/packages/forms/src/directives/shared.ts#L105)**，内部会调用 **[updateValueAndValidity](https://github.com/angular/angular/blob/master/packages/forms/src/model.ts#L530-L566)**，从而开始 **[运行数据校验器](https://github.com/angular/angular/blob/master/packages/forms/src/model.ts#L578-L580)**，上文说到 FormControl 的 validator 依赖实际上是 Validators.compose() 返回的函数，所以此时会运行 **[这个回调函数](https://github.com/angular/angular/blob/master/packages/forms/src/validators.ts#L342-L344)**，而这个 **presentValidators** 是 (AbstractControl) => RequiredValidator.validate() 和 (AbstractControl) => EmailValidator.validate() 组成的数组，然后依次 **[运行](https://github.com/angular/angular/blob/master/packages/forms/src/validators.ts#L384)** 这两个 Validator 的 validate() 函数。如果校验错误，就返回 **ValidationErrors**，比如 email 校验器返回的是 **[{'email': true}](https://github.com/angular/angular/blob/master/packages/forms/src/validators.ts#L179-L201)**。这里还需注意的是，Validator 指令里的 **validate()** 函数实际上调用的还是 **[Validator 类](https://github.com/angular/angular/blob/master/packages/forms/src/validators.ts#L63-L71)** 的对应的静态函数，这样验证器指令可以直接在模板里使用，而 Validator 类的静态函数可以在 **[响应式表单](https://angular.cn/guide/reactive-forms)** 中使用。校验器运行完成后，会设置 **[FormControl.errors](https://github.com/angular/angular/blob/master/packages/forms/src/model.ts#L550)** 属性，从而计算 FormControl 的 **[status 属性](https://github.com/angular/angular/blob/master/packages/forms/src/model.ts#L551)**，假设校验错误，则 status 属性值为 **[INVALID](https://github.com/angular/angular/blob/master/packages/forms/src/model.ts#L701)**。那如果校验错误，input 的 class 为何会添加 **'ng-invalid'** 呢？因为实际上还有一个 **[NgControlStatus 指令](https://github.com/angular/angular/blob/master/packages/forms/src/directives/ng_control_status.ts#L40-L57)** 也在绑定这个 input 元素，该指令的依赖会从当前挂载的宿主元素查找 **NgControl**，本 demo 中就是 **NgModel** 指令，**NgControlStatus 指令** 的 host 属性中的 **'[class.ng-invalid]': 'ngClassInvalid'**，会运行 **[ngClassInvalid()](https://github.com/angular/angular/blob/master/packages/forms/src/directives/ng_control_status.ts#L25)** 函数判断是否会有 **'ng-invalid' class**，而校验错误时，该函数运行结果是 true，因为它读取的是 **[FormControl.invalid](https://github.com/angular/angular/blob/master/packages/forms/src/model.ts#L205-L212)** 属性，则 **'ng-invalid' class** 就会被添加到 input 元素上。同理，其他 class 如 pending、dirty 等也同样道理。这样就理解了校验器的整个运行过程，也包括为何校验错误时会自动添加描述控件状态的 **'ng-invalid' class**。

我们已经理解了 Validators 的内部运行流程，这样写一个自定义的 Validator 就很简单了（当然，写一个自定义的 Validator 不需要去了解 Validator 内部运行原理）。比如，写一个自定义校验器 ForbiddenValidator，input 输入内容不能还有某些字符串，那可以模仿 @angular/forms 中的内置校验器 **[MinLengthValidator](https://github.com/angular/angular/blob/master/packages/forms/src/directives/validators.ts#L193-L229)** 写法：

```
import {Validators as FormValidators} from '@angular/forms';

export class Validators extends FormValidators {
  static forbidden(forbidden: string): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      return (new RegExp(forbidden)).test(control.value) ? {forbidden: true} : null;
    }
  }
}

export const FORBIDDEN_VALIDATOR: StaticProvider = {
  provide: NG_VALIDATORS,
  useExisting: forwardRef(() => ForbiddenValidator),
  multi: true
};

@Directive({
  selector:
    ':not([type=checkbox])[forbidden][formControlName],:not([type=checkbox])[forbidden][formControl],:not([type=checkbox])[forbidden][ngModel]',
  providers: [FORBIDDEN_VALIDATOR],
})
export class ForbiddenValidator implements Validator{
  private _onChange: () => void;
  private _validator: ValidatorFn;
  
  @Input() forbidden: string;
  
  ngOnChanges(changes: SimpleChanges) {
    if ('forbidden' in changes) {
      this._createValidator();
      if (this._onChange) this._onChange();
    }
  }
  
  registerOnValidatorChange(fn: () => void): void {
    this._onChange = fn;
  }
  
  validate(c: AbstractControl): ValidationErrors | null {
    return this.forbidden ? this._validator(c) : null;
  }
  
  private _createValidator(): void {
    this._validator = Validators.forbidden(this.forbidden);
  }
}
```

这样就可以在组件模板中使用了：

```
@Component(
{
    template: `
        <h2>Template-Driven Form</h2>
        <input type="email" name="email" [ngModel]="email" email required [forbidden]="forbiddenText">
        <h2>Reactive-Driven Form</h2>
        <input type="email" name="email" [formControl]="emailFormControl" email required [forbidden]="forbiddenText">
        <h2>Update Forbidden Text</h2>
        <input [(ngModel)]="forbiddenText">
    `
})
export class AppComponent {
    // custom validator
      forbiddenText = 'test';
      email = 'test@test.com';
      emailFormControl = new FormControl('test@test.com', [Validators.forbidden(this.forbiddenText)]);
}
```

完整代码可参见 **[stackblitz demo](https://stackblitz.com/edit/ng-model-lx1036)**。

所以，在理解了 Validator 内部运行原理后，不仅仅可以写自定义的 Validator，该 Validator 可以用于模板驱动表单也可以用于响应式表单，**还能明白为啥需要那么写，这个很重要！**

也可阅读 @angular/forms 相关文章了解 NgModel 双向绑定内部原理：**[@angular/forms 源码解析之双向绑定](https://juejin.im/post/5b516bd2e51d451951133797)**。