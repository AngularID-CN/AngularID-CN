# [翻译] Angular 属性绑定更新机制

> 原文链接：**[The mechanics of property bindings update in Angular](https://blog.angularindepth.com/the-mechanics-of-property-bindings-update-in-angular-39c0812bc4ce)**

![property binding mechanics](https://user-gold-cdn.xitu.io/2018/7/30/164ead22fef5928e?w=800&h=320&f=png&s=43092)

所有现代前端框架都是用组件来合成 UI，这样很自然就会产生父子组件层级，这就需要框架提供父子组件通信的机制。同样，Angular 也提供了两种方式来实现父子组件通信：**输入输出绑定**和**共享服务**。对于 **[stateless presentational components](https://medium.com/@dan_abramov/smart-and-dumb-components-7ca2f9a7c7d0#8ce5)** 我更喜欢输入输出绑定方式，然而对于 **[stateful container components](https://medium.com/@dan_abramov/smart-and-dumb-components-7ca2f9a7c7d0#8ce5#c27f)** 我使用共享服务方式。

本文主要介绍输入输出绑定方式，特别是当父组件输入绑定值变化时，Angular 如何更新子组件输入值。如果想了解 Angular 如何更新当前组件 DOM，可以查看 **[译 Angular DOM 更新机制](https://juejin.im/post/5ad35b0cf265da2381561347)**，这篇文章也会有助于加深对本文的理解。由于我们将探索 Angular 如何更新 DOM 元素和组件的输入绑定属性，所以假定你知道 Angular 内部是如何表现组件和指令的，如果你不是很了解并且很感兴趣，可以查看 **[译 为何 Angular 内部没有发现组件](https://juejin.im/post/5ad378a06fb9a028ca536c69)**， 这篇文章主要讲了 Angular 内部如何使用指令形式来表示组件。而本文对于组件和指令两个概念互换使用，因为 Angular 内部就是把组件当做指令。


## 模板绑定语法
你可能知道 Angular 提供了 **[属性绑定语法](https://angular.io/guide/template-syntax#property-binding--property-)** —— `[]`，这个语法很通用，它可以用在子组件上，也可以用在原生 DOM 元素上。如果你想从父组件把数据传给子组件 `b-comp` 或者原生 DOM 元素 `span`，你可以在父组件模板中这么写：

```ts
import { Component } from '@angular/core';

@Component({
  moduleId: module.id,
  selector: 'a-comp',
  template: `
      <b-comp [textContent]="AText"></b-comp>
      <span [textContent]="AText"></span>
  `
})
export class AComponent {
  AText = 'some';
}
```

你不必为原生 DOM 元素做些额外的工作，但是对于子组件 `b-comp` 你需要申明输入属性 `textContent`：

```ts
@Component({
    selector: 'b-comp',
    template: 'Comes from parent: {{textContent}}'
})
export class BComponent {
    @Input() textContent;
}
```

这样当父组件 `AComponent.AText` 属性改变时，Angular 会自动更新子组件 `BComponent.textContent` 属性，和原生元素 `span.textContent` 属性。同时，还会调用子组件 `BComponent` 的生命周期钩子函数 `ngOnChanges`（注：实际上还有 `ngDoCheck`，见下文）。

你可能好奇 Angular 是怎么知道 `BComponent` 和 `span` 支持 `textContent` 绑定的。这是因为 Angular 编译器在解析模板时，如果遇到简单 DOM 元素如 `span`，就去查找这个元素是否定义在 **[dom_element_schema_registry](https://github.com/angular/angular/blob/master/packages/compiler/src/schema/dom_element_schema_registry.ts#L78)**，从而知道它是 HTMLElement 子类，`textContent` 是其中的一个属性（注：可以试试如果 `span` 绑定一个 `[abc]=AText` 就报错，没法识别 `abc` 属性）；如果遇到了组件或指令，就去查看其装饰器 `@Component/@Directive` 的元数据 `input` 属性里是否有该绑定属性项，如果没有，编译器同样会抛出错误：

```ts
Can’t bind to ‘textContent’ since it isn’t a known property of …
```

这些知识都很好理解，现在让我们进一步看看其内部发生了什么。


## 组件工厂
尽管在子组件 `BComponent` 和 `span` 元素绑定了输入属性，但是输入绑定更新所需要的信息全部在父组件 `AComponent` 的组件工厂里。让我们看下 `AComponent` 的组件工厂代码：

```ts
function View_AComponent_0(_l) {
  return jit_viewDef1(0, [
     jit_elementDef_2(..., 'b-comp', ...),
     jit_directiveDef_5(..., jit_BComponent6, [], {
         textContent: [0, 'textContent']
     }, ...),
     jit_elementDef_2(..., 'span', [], [[8, 'textContent', 0]], ...)
  ], function (_ck, _v) {
     var _co = _v.component;
     var currVal_0 = _co.AText;
     var currVal_1 = 'd';
     _ck(_v, 1, 0, currVal_0, currVal_1);
  }, function (_ck, _v) {
     var _co = _v.component;
     var currVal_2 = _co.AText;
     _ck(_v, 2, 0, currVal_2);
  });
}
```

如果你读了 **[译 Angular DOM 更新机制](https://juejin.im/post/5ad35b0cf265da2381561347)** 或 **[译 为何 Angular 内部没有发现组件](https://juejin.im/post/5ad378a06fb9a028ca536c69)**，就会对上面代码中的各个视图节点比较熟悉了。前两个节点中，`jit_elementDef_2` 是元素节点，`jit_directiveDef_5` 是指令节点，这两个组成了子组件 `BComponent`；第三个节点 `jit_elementDef_2` 也是元素节点，组成了 `span` 元素。

### 节点绑定
相同类型的节点使用相同的节点定义函数，但区别是接收的参数不同，比如 `jit_directiveDef_5` 节点定义函数参数如下：

```ts
jit_directiveDef_5(..., jit_BComponent6, [], {
    textContent: [0, 'textContent']
}, ...),
```

其中，参数 `{textContent: [0, 'textContent']}` 叫做 **props**，这点可以查看 **[directiveDef](https://github.com/angular/angular/blob/master/packages/core/src/view/provider.ts#L33)** 函数的参数列表：

```ts
directiveDef(..., props?: {[name: string]: [number, string]}, ...)
```

**props** 参数是一个对象，每一个键为绑定属性名，对应的值为绑定索引和绑定属性名组成的数组，比如本例中只有一个绑定，**textContent** 对应的值为：

```ts
{textContent: [0, 'textContent']}
```

如果指令有多个绑定，比如：

```ts
<b-comp [textContent]="AText" [otherProp]="AProp">
```

**props** 参数值也包含两个属性：

```
jit_directiveDef5(49152, null, 0, jit_BComponent6, [], {
    textContent: [0, 'textContent'],
    otherProp: [1, 'otherProp']
}, null),
```

Angular 会使用这些值来生成当前指令节点的 **[binding](https://github.com/angular/angular/blob/master/packages/core/src/view/provider.ts#L39)**，从而生成当前视图的指令节点。在变更检测时，每一个 **[binding](https://github.com/angular/angular/blob/master/packages/core/src/view/types.ts#L204)** 决定 Angular 使用哪种操作来更新节点和提供上下文信息，绑定类型是通过 **[BindingFlags](https://github.com/angular/angular/blob/master/packages/core/src/view/types.ts#L213)** 设置的（注：每一个绑定定义是 **[BindingDef](https://github.com/angular/angular/blob/master/packages/core/src/view/types.ts#L204)**，它的属性 **[flags: BindingFlags](https://github.com/angular/angular/blob/master/packages/core/src/view/types.ts#L213)** 决定 Angular 该采取什么操作，比如 `Class` 型绑定和 `Style` 型绑定都会调用对应的操作函数，见下文）。比如，如果是属性绑定，编译器会设置绑定标志位为：

```
export const enum BindingFlags {
    TypeProperty = 1 << 3,
```

> 注：上文说完了指令定义函数的参数，下面说说元素定义函数的参数。

本例中，因为 `span` 元素有属性绑定，编译器会设置绑定参数为 `[[8, 'textContent', 0]]`：

```
jit_elementDef2(..., 'span', [], [[8, 'textContent', 0]], ...)
```

不同于指令节点，对元素节点来说，绑定参数结构是个二维数组，因为 `span` 元素只有一个绑定，所以它仅仅只有一个子数组。数组 `[8, 'textContent', 0]` 中第一个参数也同样是绑定标志位 **[BindingFlags](https://github.com/angular/angular/blob/master/packages/core/src/view/types.ts#L213)**，决定 Angular 应该采取什么类型操作（注：`[8, 'textContent', 0]` 中的 `8` 表示为 `property` 型绑定）：

```ts
export const enum BindingFlags {
    TypeProperty = 1 << 3, // 8
```

其他类型标志位已经在文章 **[译 Angular DOM 更新机制](https://juejin.im/post/5ad35b0cf265da2381561347)** 有所解释：

```ts
TypeElementAttribute = 1 << 0,
TypeElementClass = 1 << 1,
TypeElementStyle = 1 << 2,
```

编译器不会为指令定义提供绑定标志位，因为指令的绑定类型也只能是 `BindingFlags.TypeProperty`。

> 注：**节点绑定** 这一节主要讲的是对于元素节点来说，每一个节点的 **[binding](https://github.com/angular/angular/blob/master/packages/core/src/view/provider.ts#L39)** 类型是由 **[BindingFlags](https://github.com/angular/angular/blob/master/packages/core/src/view/types.ts#L213)** 决定的；对于指令节点来说，每一个节点的 **[binding](https://github.com/angular/angular/blob/master/packages/core/src/view/provider.ts#L39)** 类型只能是 `BindingFlags.TypeProperty`。

## updateRenderer 和 updateDirectives
组件工厂代码里，编译器还为我们生成了两个函数：

```ts
function (_ck, _v) {
    var _co = _v.component;
    var currVal_0 = _co.AText;
    var currVal_1 = _co.AProp;
    _ck(_v, 1, 0, currVal_0, currVal_1);
},
function (_ck, _v) {
    var _co = _v.component;
    var currVal_2 = _co.AText;
    _ck(_v, 2, 0, currVal_2);
}
```

如果你读了 **[译 Angular DOM 更新机制](https://juejin.im/post/5ad35b0cf265da2381561347)**，应该对第二个函数即 **[updateRenderer](https://github.com/angular/angular/blob/master/packages/core/src/view/types.ts#L54)** 有所熟悉。第一个函数叫做 **[updateDirectives](https://github.com/angular/angular/blob/master/packages/core/src/view/types.ts#L53)**。这两个函数都是 **[ViewUpdateFn](https://github.com/angular/angular/blob/master/packages/core/src/view/types.ts#L78)** 类型接口，两者都是视图定义的属性：

```ts
interface ViewDefinition {
  flags: ViewFlags;
  updateDirectives: ViewUpdateFn;
  updateRenderer: ViewUpdateFn;
```

有趣的是这两个函数的函数体基本相同，参数都是 `_ck` 和 `_v`，并且两个函数的对应参数都指向同一个对象，所以为何需要两个函数？

因为在变更检测期间，这是不同阶段的两个不同行为：

* **[更新子组件的输入绑定属性](https://hackernoon.com/everything-you-need-to-know-about-change-detection-in-angular-8006c51d206f#2485)**
* **[更新当前组件的 DOM 元素](https://hackernoon.com/everything-you-need-to-know-about-change-detection-in-angular-8006c51d206f#bbd8)**

这两个操作是在变更检测的不同阶段执行，所以 Angular 需要两个独立的函数分别在对应的阶段调用：

* updateDirectives——变更检测的开始阶段被调用，来更新子组件的输入绑定属性
* updateRenderer——变更检测的中间阶段被调用，来更新当前组件的 DOM 元素

这两个函数都会在 Angular **[每次的变更检测时](https://hackernoon.com/everything-you-need-to-know-about-change-detection-in-angular-8006c51d206f#2485)** 被调用，并且函数参数也是在这时被传入的。让我们看看函数内部做了哪些工作。

`_ck` 就是 `check` 的缩写，其实就是函数 **[prodCheckAndUpdateNode](https://github.com/angular/angular/blob/master/packages/core/src/view/services.ts#L324)**，另一个参数就是 **[组件视图数据](https://github.com/angular/angular/blob/master/packages/core/src/view/types.ts#L342)**。函数的主要功能就是从组件对象里拿到绑定属性的当前值，然后和视图数据对象、视图节点索引等一起传入 **[prodCheckAndUpdateNode](https://github.com/angular/angular/blob/master/packages/core/src/view/services.ts#L324)** 函数。其中，因为 Angular 会更新每一个视图的 DOM，所以需要传入当前视图的索引。如果我们有两个 `span` 和两个组件：

```html
<b-comp [textContent]="AText"></b-comp>
<b-comp [textContent]="AText"></b-comp>
<span [textContent]="AText"></span>
<span [textContent]="AText"></span>
```

编译器生成的 `updateRenderer` 函数和 `updateDirectives` 函数如下：

```ts
function(_ck, _v) {
    var _co = _v.component;
    var currVal_0 = _co.AText;
    
    // update first component
    _ck(_v, 1, 0, currVal_0);
    var currVal_1 = _co.AText;
    
    // update second component
    _ck(_v, 3, 0, currVal_1);
}, 
function(_ck, _v) {
    var _co = _v.component;
    var currVal_2 = _co.AText;
    
    // update first span
    _ck(_v, 4, 0, currVal_2);
    var currVal_3 = _co.AText;

    // update second span
    _ck(_v, 5, 0, currVal_3);
}
```

没有什么更复杂的东西，这两个函数还不是重点，重点是 `_ck` 函数，接着往下看。

## 更新元素的属性
从上文我们知道，编译器生成的 `updateRenderer` 函数会在每一次变更检测被调用，用来更新 DOM 元素的属性，并且其参数 `_ck` 就是函数 **[prodCheckAndUpdateNode](https://github.com/angular/angular/blob/master/packages/core/src/view/services.ts#L324)**。对于 DOM 元素的更新，该函数经过一系列的函数调用后，最终会调用函数 **[checkAndUpdateElementValue](https://github.com/angular/angular/blob/master/packages/core/src/view/element.ts#L225)**，这个函数会检查绑定标志位是 `[attr.name, class.name, style.some]` 其中的哪一个，又或者是属性绑定（注：可查看源码这段 **[L233-L250](https://github.com/angular/angular/blob/master/packages/core/src/view/element.ts#L233-L250)**）：

```
case BindingFlags.TypeElementAttribute -> setElementAttribute
case BindingFlags.TypeElementClass     -> setElementClass
case BindingFlags.TypeElementStyle     -> setElementStyle
case BindingFlags.TypeProperty         -> setElementProperty;
```

上面代码就是刚刚说的几个绑定类型，当绑定标志位是 `BindingFlags.TypeProperty`，会调用函数 **[setElementProperty](https://github.com/angular/angular/blob/master/packages/core/src/view/element.ts#L298)**，该函数内部也是通过调用 DOM Renderer 的 **[setProperty](https://github.com/angular/angular/blob/master/packages/platform-browser/src/dom/dom_renderer.ts#L201)** 方法来更新 DOM。

> 注：`setElementProperty` 函数里这行代码 `view.renderer.setProperty(renderNode,name, renderValue);`，renderer 就是 **[Renderer2 interface](https://github.com/angular/angular/blob/master/packages/core/src/render/api.ts#L146)**，它仅仅是一个接口，在浏览器平台下，它的实现就是 **[DefaultDomRenderer2](https://github.com/angular/angular/blob/master/packages/platform-browser/src/dom/dom_renderer.ts#L102)**。

## 更新指令的属性
上文中已经描述了 `updateRenderer` 函数是用来更新元素的属性，而 `updateDirective` 是用来更新子组件的输入绑定属性，并且变更检测期间传入的参数 `_ck` 就是函数 **[prodCheckAndUpdateNode](https://github.com/angular/angular/blob/master/packages/core/src/view/services.ts#L324)**。只是进过一系列函数调用后，最终调用的函数却是**[checkAndUpdateDirectiveInline](https://github.com/angular/angular/blob/master/packages/core/src/view/provider.ts#L152)**，这是因为这次节点的标志位是 `NodeFlags.TypeDirective`（注：可查看源码 **[L428-L429](https://github.com/angular/angular/blob/master/packages/core/src/view/view.ts#L428-L429)**），**[checkAndUpdateDirectiveInline](https://github.com/angular/angular/blob/master/packages/core/src/view/provider.ts#L152)** 函数主要功能如下：

1. 从当前视图节点里获取组件/指令对象（注：查看 **[L156](https://github.com/angular/angular/blob/master/packages/core/src/view/provider.ts#L156)**）

2. 检查组件/指令对象的绑定属性值是否发生改变（注：查看 **[L160-L199](https://github.com/angular/angular/blob/master/packages/core/src/view/provider.ts#L160-L199)**）

3. 如果属性发生改变：
	a. 如果变更策略设置为 `OnPush`，设置视图状态为 `checksEnabled`（注：查看 **[L438](https://github.com/angular/angular/blob/master/packages/core/src/view/provider.ts#L438)**）
	b. 更新子组件的绑定属性值（注：查看 **[L446](https://github.com/angular/angular/blob/master/packages/core/src/view/provider.ts#L446)**）
	c. 准备 `SimpleChange` 数据和更新视图的 `oldValues` 属性，新值替换旧值（注：查看 **[L451-L454](https://github.com/angular/angular/blob/master/packages/core/src/view/provider.ts#L451-L454)**）
	d. 调用生命周期钩子 **ngOnChanges**（注：查看 **[L201](https://github.com/angular/angular/blob/master/packages/core/src/view/provider.ts#L201)**）

4. 如果该视图是首次执行变更检测，则调用生命周期钩子 **ngOnInit**（注：查看 **[L205](https://github.com/angular/angular/blob/master/packages/core/src/view/provider.ts#L205)**）

5. 调用生命周期钩子 **ngDoCheck**（注：查看 **[L233](https://github.com/angular/angular/blob/master/packages/core/src/view/provider.ts#L233)**）

当然，只有在生命周期钩子在组件内定义了才被调用，Angular 使用 **[NodeDef](https://github.com/angular/angular/blob/master/packages/core/src/view/types.ts#L108)** 节点标志位来判断是否有生命周期钩子，如果查看源码你会发现类似如下代码（注：查看 **[L203-L207](https://github.com/angular/angular/blob/master/packages/core/src/view/provider.ts#L203-L207)**）：

```ts
if (... && (def.flags & NodeFlags.OnInit)) {
  directive.ngOnInit();
}
if (def.flags & NodeFlags.DoCheck) {
  directive.ngDoCheck();
}
```

和更新元素节点一样，更新指令时也同样把上一次的值存储在视图数据的属性 **[oldValues](https://github.com/angular/angular/blob/master/packages/core/src/view/types.ts#L359)** 里（注：即上面的 `3.c` 步骤）。


