# [译] Angular DOM 更新机制

> 原文链接：**[The mechanics of DOM updates in Angular](https://blog.angularindepth.com/the-mechanics-of-dom-updates-in-angular-3b2970d5c03d)**
> 
> 原文作者：[Max Koretskyi，aka Wizard](https://blog.angularindepth.com/@maxim.koretskyi?source=post_header_lockup)
>
> 原技术博文由`Max Koretskyi`撰写发布，他目前于[ag-Grid](https://angular-grid.ag-grid.com/?utm_source=medium&utm_medium=blog&utm_campaign=angularcustom)担任开发大使
> 
> 译者按：开发大使负责确保其所在的公司认真听取社区的声音并向社区传达他们的行动及目标，其作为社区和公司之间的纽带存在。

> 译者：**[Sunny Liu](https://segmentfault.com/u/lx1036/articles)**；校对者：**[尊重](https://github.com/sawyerbutton)**

<p align="center"> 
    <img src="../assets/angular-14/1.png" alt="DOM Update">
</p>

由模型变化触发的 DOM 更新是所有现代前端框架的重要特性，当然 Angular 也不例外。定义一个模板表达式如下：

```html
<span>Hello {{name}}</span>
```

或者类似下面的属性绑定：

```html
<span [textContent]="'Hello ' + name"></span>
```

当每次 `name` 值发生变化时，Angular 会神奇地自动更新 DOM 元素（注：最上面代码是更新 **[DOM 文本节点](https://developer.mozilla.org/en-US/docs/Web/API/Text)**，上面代码是更新 **[DOM 元素节点](https://developer.mozilla.org/en-US/docs/Web/API/Element)**，两者是不一样的，下文解释）。这表面上看起来很简单，但是其内部工作相当复杂。而且，DOM 更新仅仅是 Angular **[变更检测机制](https://hackernoon.com/everything-you-need-to-know-about-change-detection-in-angular-8006c51d206f)** 的一部分，变更检测机制主要由以下三种操作组成：

* DOM updates（注：即本文将要解释的内容）
* child components `Input` bindings updates
* query list updates

本文主要探索变更检测机制的渲染部分（即 DOM updates 部分）。如果你之前也对这个问题很好奇请继续读下去本文绝对会给予你启发。

本文在引用相关源码时，假设程序是以生产模式运行。让我们开始吧！

## 程序内部表现
在探索 DOM 更新之前，我们先搞清楚 Angular 程序内部究竟是如何表现的，简单回顾下吧。

### 视图
从我的这篇文章 **[Here is what you need to know about dynamic components in Angular](https://hackernoon.com/here-is-what-you-need-to-know-about-dynamic-components-in-angular-ac1e96167f9e)** 知道 Angular 编译器会为程序中使用的每个组件编译生成一个**工厂**（factory）。例如，下面代码展示 Angular 如何从工厂创建一个组件：

```ts
const factory = r.resolveComponentFactory(AComponent);
factory.create(injector);
```

Angular 使用这个工厂来实例化 **[ViewDefinition](https://github.com/angular/angular/blob/15090a8ad4a23dbe947ec48b581f1bf6a2da411e/packages/core/src/view/types.ts#L48)** ，然后使用 **[ViewDefinition](https://github.com/angular/angular/blob/15090a8ad4a23dbe947ec48b581f1bf6a2da411e/packages/core/src/view/types.ts#L48)** 来 **[创建视图对象](https://github.com/angular/angular/blob/15090a8ad4a23dbe947ec48b581f1bf6a2da411e/packages/core/src/view/view.ts#L217)**。**Angular 内部把一个程序看作为一颗视图树**，每个组件类型只有一个 view definition 实例而其用于充当所有视图的模板，但是对于每个组件实例，Angular会为其创建一个单独的视图。

### 工厂（factory）
组件工厂主要是由编译器生成的视图节点组成的，这些视图节点是通过模板解析生成的。假设定义一个组件的模板如下：

```html
<span>I am {{name}}</span>
```

编译器会解析这个模板生成包含如下的组件工厂：

```ts
function View_AComponent_0(l) {
    return jit_viewDef1(0,
        [
          jit_elementDef2(0,null,null,1,'span',...),
          jit_textDef3(null,['I am ',...])
        ], 
        null,
        function(_ck,_v) {
            var _co = _v.component;
            var currVal_0 = _co.name;
            _ck(_v,1,0,currVal_0);
```

上面代码描述了视图的结构，并在实例化组件时会被调用。`jit_viewDef_1` 是 **[viewDef](https://github.com/angular/angular/blob/15090a8ad4a23dbe947ec48b581f1bf6a2da411e/packages/core/src/view/view.ts#L23)** 函数的引用，而该函数创造了一个视图定义。

视图定义使用 [view definition nodes](https://github.com/angular/angular/blob/15090a8ad4a23dbe947ec48b581f1bf6a2da411e/packages/core/src/view/types.ts#L105) 作为参数，而 view definition nodes 类似于 html 的结构只是包含了许多 angular 的特定细节。上面代码中第二个参数是一个数组，其第一个数组元素 `jit_elementDef_2` 是元素节点定义，第二个数组元素 `jit_textDef_3` 是文本节点定义。Angular 编译器会生成很多不同的节点定义，节点类型是由 **[NodeFlags](https://github.com/angular/angular/blob/15090a8ad4a23dbe947ec48b581f1bf6a2da411e/packages/core/src/view/types.ts#L153)** 设置的。稍后我们将看到 Angular 如何根据不同节点类型决定如何处理更新。

本文只对元素和文本节点感兴趣：

```ts
export const enum NodeFlags {
    TypeElement = 1 << 0, 
    TypeText = 1 << 1
```

让我们简要回顾一下。

> 注：上文核心就是，**程序是一堆视图组成的，而每一个视图又是由不同类型节点组成的。而本文只关心元素节点和文本节点，至于还有个重要的指令节点在另一篇文章。**

### 元素节点的定义
**[元素节点定义](https://github.com/angular/angular/blob/15090a8ad4a23dbe947ec48b581f1bf6a2da411e/packages/core/src/view/types.ts#L235)** 是 Angular 为每一个 html 元素生成的节点，它也是用来生成组件的元素，如对这点感兴趣可查看 **[Here is why you will not find components inside Angular](https://hackernoon.com/here-is-why-you-will-not-find-components-inside-angular-bdaf204d955c)**。元素节点也可以包含其他元素节点和文本节点作为子节点，而他们反映（reflected）在 childCount 属性中

所有元素定义是由 **[elementRef](https://github.com/angular/angular/blob/15090a8ad4a23dbe947ec48b581f1bf6a2da411e/packages/core/src/view/element.ts#L56)** 函数生成的，上文工厂函数中的 `jit_elementDef_2()` 引用了这个函数。元素定义包含一些通用参数如下：

Name | Description
---| ---
childCount | specifies how many children the current element have
namespaceAndName | the name of the html element（注：如 'span'）
fixedAttrs | attributes defined on the element

还有其他一些Angular特有功能的参数：

Name | Description
--- | ---
matchedQueriesDsl | used when querying child nodes
ngContentIndex | used for node projection
**bindings** | **used for dom and bound properties update**
outputs, handleEvent | used for event propagation

出于写作目的，本文只论及绑定（bindings）参数。

> 注：从上文知道视图（view）是由不同类型节点（nodes）组成的，而元素节点（element nodes）是由 **[elementRef](https://github.com/angular/angular/blob/7.0.4/packages/core/src/view/element.ts#L58-L149)** 函数生成的，元素节点的结构是由 **[ElementDef](https://github.com/angular/angular/blob/7.0.4/packages/core/src/view/types.ts#L243-L265)** 定义的。


### 文本节点的定义
**[文本节点定义](https://github.com/angular/angular/blob/15090a8ad4a23dbe947ec48b581f1bf6a2da411e/packages/core/src/view/types.ts#L290)** 是 Angular 编译每一个 **[html 文本节点](https://developer.mozilla.org/en/docs/Web/API/Node/nodeType#Constants)** 生成的节点定义。通常它是元素定义节点的子节点，就像我们本文的示例那样（注：`<span>I am {{name}}</span>`，`span` 是元素节点，`I am {{name}}` 是文本节点，也是 `span` 的子节点）。它是由 **[textDef](https://github.com/angular/angular/blob/15090a8ad4a23dbe947ec48b581f1bf6a2da411e/packages/core/src/view/text.ts#L12)** 函数生成的节点定义。它以常量的形式接收解析后的表达式作为其第二个参数。例如，下面的文本：

```html
<h1>Hello {{name}} and another {{prop}}</h1>
```

将要被解析为一个数组：

```
["Hello ", " and another ", ""]
```

然后被用来生成正确的绑定：

```
{
  text: 'Hello',
  bindings: [
    {
      name: 'name',
      suffix: ' and another '
    },
    {
      name: 'prop',
      suffix: ''
    }
  ]
}
```

在脏检查阶段进行如下赋值：

```ts
text
+ context[bindings[0][property]] + context[bindings[0][suffix]]
+ context[bindings[1][property]] + context[bindings[1][suffix]]
```

> 注：同上，文本节点是由 **[textDef](https://github.com/angular/angular/blob/7.0.4/packages/core/src/view/text.ts#L12-L51)** 函数生成的，结构是由 **[TextDef](https://github.com/angular/angular/blob/7.0.4/packages/core/src/view/types.ts#L300)** 定义的。既然已经知道了两个节点的定义和生成，那节点上的属性绑定， Angular 是怎么处理的呢？

### 节点定义的绑定
Angular 使用 **[ bindings ](https://github.com/angular/angular/blob/15090a8ad4a23dbe947ec48b581f1bf6a2da411e/packages/core/src/view/types.ts#L196)** 来定义每一个节点的绑定依赖，而这些绑定通常是组件类的属性。在变更检测时 Angular 会根据每个绑定来决定 angular 采取何种操作更新节点和提供上下文信息。具体哪一种操作是由 **[BindingFlags](https://github.com/angular/angular/blob/15090a8ad4a23dbe947ec48b581f1bf6a2da411e/packages/core/src/view/types.ts#L205)** 决定的，下面列表展示了应对于 DOM 的特定操作：

Name | Construction in template
--- | ---
TypeElementAttribute | attr.name
TypeElementClass | class.name
TypeElementStyle | style.name

根据编译器标识的绑定标识 （Bindings flags），元素和文本定义在内部创建其绑定而每一种节点类型都有着不同的绑定生成逻辑。


## 更新渲染器
最让我们感兴趣的是位于工厂函数中最后那个由编译器生成的函数 `jit_viewDef_1` ：

```
function(_ck,_v) {
   var _co = _v.component;
   var currVal_0 = _co.name;
   _ck(_v,1,0,currVal_0);
});
```

这个函数叫做 **[updateRenderer](https://github.com/angular/angular/blob/7.0.4/packages/core/src/view/types.ts#L78)**。它接收两个参数：`_ck` 和 `_v`。`_ck` 是 `check` 的简写，其指向 **[prodCheckAndUpdateNode](https://github.com/angular/angular/blob/15090a8ad4a23dbe947ec48b581f1bf6a2da411e/packages/core/src/view/services.ts#L262)** 函数，而 `_v` 是组件的视图节点。`updateRenderer` 函数会在 **[每一次变更检测时](https://medium.com/m/global-identity?redirectUrl=https%3A%2F%2Fhackernoon.com%2Feverything-you-need-to-know-about-change-detection-in-angular-8006c51d206f#bbd8)** 被调用，其参数 `_ck` 和 `_v` 则由变更检测机制所提供。

`updateRenderer` 函数主要功能是从组件实例中获取绑定属性的当前值，并调用 `_ck` 函数，同时传入视图对象、视图节点索引和绑定属性的当前值。重要一点是 Angular 会为每一个视图分别执行 DOM 更新操作，所以必须传入视图节点索引参数（注：这个很好理解，上文说了 Angular 会依次对每一个 view 做模型视图同步过程）。你可以清晰看到 `_ck` 参数列表：

```ts
function prodCheckAndUpdateNode(
    view: ViewData, 
    nodeIndex: number, 
    argStyle: ArgumentType, 
    v0?: any, 
    v1?: any, 
    v2?: any,
```

`nodeIndex` 是变更检测将会操作的视图节点的索引，如果你模板中有多个表达式：

```html
<h1>Hello {{name}}</h1>
<h1>Hello {{age}}</h1>
```

编译器所生成的相对应的 `updateRenderer` 函数如下：

```ts
var _co = _v.component;

// here node index is 1 and property is `name`
var currVal_0 = _co.name;
_ck(_v,1,0,currVal_0);

// here node index is 4 and bound property is `age`
var currVal_1 = _co.age;
_ck(_v,4,0,currVal_1);
```

---

## 更新 DOM
现在我们已经知道 Angular 编译器生成的所有对象（注：已经有了 view，element node，text node 和 updateRenderer 这几个道具），现在我们可以探索如何使用这些对象来实现 DOM 的更新。

从上文我们知道变更检测期间 `updateRenderer` 函数传入了 `_ck` 函数，而 `_ck` 作为传入函数的的参数为 **[prodCheckAndUpdateNode](https://github.com/angular/angular/blob/15090a8ad4a23dbe947ec48b581f1bf6a2da411e/packages/core/src/view/services.ts#L262)**。这是一个简短的泛型函数，它会进行一系列的操作并最终执行 **[checkAndUpdateNodeInline](https://github.com/angular/angular/blob/15090a8ad4a23dbe947ec48b581f1bf6a2da411e/packages/core/src/view/view.ts#L400)** 方法，如果表达式的数量超过10时，Angular 还提供了 **[checkAndUpdateNodeDynamic](https://github.com/angular/angular/blob/6b79ab5abec8b5a4b43d563ce65f032990b3e3bc/packages/core/src/view/view.ts#L386)** 这个变体函数（注：两个函数本质一样）。

`checkAndUpdateNodeInline` 是一个区分下述类型的视图节点 和 委派检查和更新给相应函数的路由器：

```ts
case NodeFlags.TypeElement   -> checkAndUpdateElementInline
case NodeFlags.TypeText      -> checkAndUpdateTextInline
case NodeFlags.TypeDirective -> checkAndUpdateDirectiveInline
```

让我们看下这些函数是做什么的，对于 `NodeFlags.TypeDirective` 可以查看我写的文章 **[The mechanics of property bindings update in Angular](https://medium.com/@maximus.koretskyi/the-mechanics-of-property-bindings-update-in-angular-39c0812bc4ce)** 。

> 注：本文只关注 `element node 和 text node`。

### 元素类型
对于元素类型会调用函数 **[CheckAndUpdateElement](https://github.com/angular/angular/blob/15090a8ad4a23dbe947ec48b581f1bf6a2da411e/packages/core/src/view/element.ts#L229)**。 这个函数主要用于检查绑定是属于 angular 的特殊形式如 ` [attr.name, class.name, style.some] ` 抑或是节点的特殊属性。 

```ts
case BindingFlags.TypeElementAttribute -> setElementAttribute
case BindingFlags.TypeElementClass     -> setElementClass
case BindingFlags.TypeElementStyle     -> setElementStyle
case BindingFlags.TypeProperty         -> setElementProperty;
```
 
相应的函数只是使用渲染器的相应方法在节点上执行所需的操作。

### 文本类型
它在使用了函数 **[CheckAndUpdateText](https://github.com/angular/angular/blob/15090a8ad4a23dbe947ec48b581f1bf6a2da411e/packages/core/src/view/text.ts#L62)**。以下是该功能的要点：

```ts
if (checkAndUpdateBinding(view, nodeDef, bindingIndex, newValue)) {
    value = text + _addInterpolationPart(...);
    view.renderer.setValue(DOMNode, value);
}
```

它会拿到 `updateRenderer` 函数传过来的当前值（注：即上文的 `_ck(_v,4,0,currVal_1);`），与上一次变更检测时的值相比较。视图数据使用 **[oldValues](https://github.com/angular/angular/blob/6b79ab5abec8b5a4b43d563ce65f032990b3e3bc/packages/core/src/view/types.ts#L318)** 属性存储旧的值，如果属性值如 `name` 发生变化，Angular 会使用最新 `name` 值合成最新的字符串文本，如 `Hello New World`，然后使用渲染器更新 DOM。

> 注：更新元素节点和文本节点都提到了渲染器（renderer），这也是一个重要的概念。每一个视图对象都有一个 **[renderer](https://github.com/angular/angular/blob/master/packages/core/src/view/types.ts#L345)** 属性，即是 **[Renderer2](https://github.com/angular/angular/blob/master/packages/core/src/render/api.ts#L146)** 的引用，也就是组件渲染器，DOM 的实际更新操作由它完成。因为 Angular 是跨平台的，这个 Renderer2 是个接口，这样根据不同 Platform 就选择不同的 Renderer。比如，在浏览器里这个 Renderer 就是 DOMRenderer，在服务端就是 ServerRenderer，等等。**从这里可看出，Angular 框架设计做了很好的抽象。**

## 结论
我知道有大量难懂的信息需要消化，但是通过理解这些知识，你就可以更好的设计程序或者去调试 DOM 更新相关的问题。我建议你按照本文所解释的执行逻辑并使用调试器进行实际演练。


