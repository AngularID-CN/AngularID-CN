# [译] 为何 Angular 内部没有发现组件
> 原文链接：**[Here is why you will not find components inside Angular](https://blog.angularindepth.com/here-is-why-you-will-not-find-components-inside-angular-bdaf204d955c)**

![Component Not Found](https://cdn-images-1.medium.com/max/1600/1*3-VTiSXK-d3RXKmIBkmqAQ.jpeg)

> Component is just a directive with a template? Or is it?

从我开始使用 Angular 开始，就被组件和指令间区别的问题所困惑，尤其对那些从 Angular.js 世界来的人，因为 Angular.js 里只有指令，尽管我们也经常把它当做组件来使用。如果你在网上搜这个问题解释，很多都会这么解释（注：不翻译）：

> Components are just directives with a content defined in a template…

> Angular components are a subset of directives. Unlike directives, components always have…

> Components are high-order directives with templates and serve as …

这些说法貌似都对，我在查看由 Angular 编译器编译组件生成的视图工厂源码里，的确没发现组件定义，你如果查看也只会发现 **指令**。

> 注：使用 Angular-CLI ng new 一个新项目，执行 ng serve 运行程序后，就可在 Chrome Dev Tools 的 Source Tab 的 ng:// 域下查看到编译组件后生成的 **.ngfactory.js 文件，该文件代码即上面说的视图工厂源码。

但是我在网上没有找到 **原因解释**，因为想要知道原因就必须对 Angular 内部工作原理比较熟悉，如果上面的问题也困让了你很长一段时间，那本文正适合你。让我们一起探索其中的奥秘并做好准备吧。

**本质上，本文主要解释 Angular 内部是如何定义组件和指令的，并引入新的视图节点定义——指令定义。**

> 注：视图节点还包括元素节点和文本节点，有兴趣可查看 **[译 Angular DOM 更新机制](https://juejin.im/post/5ad35b0cf265da2381561347)** 。

- - -

## 视图
如果你读过我之前写的文章，尤其是 **[译 Angular DOM 更新机制](https://juejin.im/post/5ad35b0cf265da2381561347)**，你可能会明白 Angular 程序内部是一棵视图树，每一个视图都是由视图工厂生成的，并且每个视图包含具有特定功能的不同视图节点。在刚刚提到的文章中（那篇文章对了解本文很重要嗷），我介绍过两个最简单的节点类型——元素节点定义和文本节点定义。元素节点定义是用来创建所有 **[DOM 元素节点](https://developer.mozilla.org/en-US/docs/Web/API/Element)**，而文本节点定义是用来创建所有 **[DOM 文本节点](https://developer.mozilla.org/en-US/docs/Web/API/Text)** 。

所以如果你写了如下的一个模板：

```html
<div><h1>Hello {{name}}</h1></div>
```

**[Angular Compiler](https://github.com/angular/angular/blob/master/packages/compiler/design/separate_compilation.md)** 将会编译这个模板，并生成两个元素节点，即 `div` 和 `h1` DOM 元素，和一个文本节点，即 `Hello {{name}}` DOM 文本。这些都是很重要的节点，因为没有它们，你在屏幕上看不到任何东西。但是组件合成模式告诉我们可以嵌套组件，所以必然另一种视图节点来嵌入组件。为了搞清楚这些特殊节点是什么，首先需要了解组件是由什么组成的。本质上，组件本质上是具有特定行为的 DOM 元素，而这些行为是在组件类里实现的。首先看下 DOM 元素吧。

- - -

## 自定义 DOM 元素
你可能知道在 html 里可以创建一个新的 HTML 标签，比如，如果不使用框架，你可以直接在 html 里插入一个新的标签：

```html
<a-comp></a-comp>
```

然后查询这个 DOM 节点并检查类型，你会发现它是个完全合法的 DOM 元素（注：你可以在一个 html 文件里试试这部分代码，甚至可以写上 `<a-comp>A Component</a-comp>`，结果是可以运行的，原因见下文）：

```javascript
const element = document.querySelector('a-comp');
element.nodeType === Node.ELEMENT_NODE; // true
```

浏览器会使用 **[HTMLUnknownElement](https://developer.mozilla.org/en-US/docs/Web/API/HTMLUnknownElement)** 接口来创建 `a-comp` 元素，这个接口又继承 **[HTMLElement](https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement)** 接口，但是它不需要实现任何属性或方法。你可以使用 CSS 来装饰它，也可以给它添加事件监听器来监听一些普遍事件，比如 `click` 事件。所以正如我说的，`a-comp` 是一个完全合法的 DOM 元素。

然后，你可以把它转变成 **[自定义 DOM 元素](https://developer.mozilla.org/en-US/docs/Web/Web_Components/Custom_Elements)** 来增强这个元素，你需要为它单独创建一个类并使用 JS API 来注册这个类：

```ts
class AComponent extends HTMLElement {...}
window.customElements.define('a-comp', AComponent);
```

这是不是和你一直在做的事情有些类似呀。

没错，这和你在 Angular 中定义一个组件非常类似，实际上，Angular 框架严格遵循 Web 组件标准但是为我们简化了很多事情，所以我们不必自己创建 `shadow root` 并挂载到宿主元素（注：关于 `shadow root` 的概念网上资料很多，其实在 Chrome Dev Tools 里，点击右上角 settings，然后点击 Preferences -> Elements，打开 `Show user agent shadow root` 后，这样你就可以在 Elements 面板里看到很多 DOM 元素下的 `shadow root`）。然而，我们在 Angular 中创建的组件并没有注册为自定义元素，它会被 Angular 以特定方式去处理。如果你对没有框架时如何创建组件很好奇，你可以查看 **[Custom Elements v1: Reusable Web Components](https://developers.google.com/web/fundamentals/getting-started/primers/customelements)** 。

现在已经知道，我们可以创建任何一个 HTML 标签并在模板里使用它。所以，如果我们在 Angular 的组件模板里使用这个标签，框架将会给这个标签创建元素定义（注：这是由 Angular Compiler 编译生成的）：

```ts
function View_AppComponent_0(_l) {
    return jit_viewDef2(0, [
        jit_elementDef3(0, null, null, 1, 'a-comp', [], ...)
    ])
}
```

然而，你得需要在 `module` 或组件装饰器属性里添加 `schemas: [CUSTOM_ELEMENTS_SCHEMA]`，来告诉 Angular 你在使用自定义元素，否则 Angular Compiler 会抛出错误（注：所以如果需要使用某个组件，你不得不在 `module.declarations` 或 `module.entryComponents` 或 `component.entryComponents` 去注册这个组件）：

```
'a-comp' is not a known element:
1. If 'c-comp' is an Angular component, then ...
2. If 'c-comp' is a Web Component then add...
```

所以，我们已经有了 DOM 元素但是还没有附着在元素上的类呢，那 Angular 里除了组件外还有其他特殊类没？当然有——指令。让我们看看指令有些啥。

- - -

## 指令定义
你可能知道每一个指令都有一个选择器，用来挂载到特定的 DOM 元素上。大多数指令使用属性选择器（attribute selectors），但是有一些也选择元素选择器（element selectors）。实际上，Angular 表单指令就是使用 **[元素选择器 form](https://github.com/angular/angular/blob/master/packages/forms/src/directives/ng_form.ts#L67)** 来把特定行为附着在 `html form`元素上。

所以，让我们创建一个空指令类，并把它附着在自定义元素上，再看看视图定义是什么样的：

```ts
@Directive({selector: 'a-comp'})
export class ADirective {}
```

然后核查下生成的视图工厂：

```ts
function View_AppComponent_0(_l) {
    return jit_viewDef2(0, [
        jit_elementDef3(0, null, null, 1, 'a-comp', [], ...),
        jit_directiveDef4(16384, null, 0, jit_ADirective5, [],...)
    ], null, null);
}
```

现在 Angular Compiler 在视图定义函数的第二个参数数组里，添加了新生成的指令定义 `jit_directiveDef4` 节点，并放在元素定义节点 `jit_elementDef3` 后面。同时设置元素定义的 `childCount` 为 1，因为附着在元素上的所有指令都会被看做该元素的子元素。

指令定义是个很简单的节点定义，它是由 **[directiveDef](https://github.com/angular/angular/blob/master/packages/core/src/view/provider.ts#L30)** 函数生成的，该函数参数列表如下（注：现在 Angular v5.x 版本略有不同）：

Name | Description
-------|-----------
matchedQueries | used when querying child nodes
childCount | specifies how many children the current element have
**ctor** | **reference to the component or directive constructor**
deps | an array of constructor dependencies
props | an array of input property bindings
outputs | an array of output property bindings

本文我们只对 **ctor** 参数感兴趣，它仅仅是我们定义的 `ADirective` 类的引用。当 Angular 创建指令对象时，它会实例化一个指令类，并存储在视图节点的 **[provider data](https://github.com/angular/angular/blob/master/packages/core/src/view/types.ts#L495)** 属性里。

所以我们看到组件其实仅仅是一个元素定义加上一个指令定义，但仅仅如此么？你可能知道 Angular 总是没那么简单啊！

- - -

## 组件展示
从上文知道，我们可以通过创建一个自定义元素和附着在该元素上的指令，来模拟创建出一个组件。让我们定义一个真实的组件，并把由该组件编译生成的视图工厂类，与我们上面实验性的视图工厂类做个比较：

```ts
@Component({
  selector: 'a-comp',
  template: '<span>I am A component</span>'
})
export class AComponent {}
```

做好准备了么？下面是生成的视图工厂类：

```ts
function View_AppComponent_0() {
    return jit_viewDef2(0, [
        jit_elementDef3(0, null, null, 1, 'a-comp', [], ...
                    jit_View_AComponent_04, jit__object_Object_5),
        jit_directiveDef6(49152, null, 0, jit_AComponent7, [], ...)
```

好的，现在我们仅仅验证了上文所说的。本示例中， Angular 使用两种视图节点来表示组件——元素节点定义和指令节点定义。但是当使用一个真实的组件时，就会发现这两个节点定义的参数列表还是有些不同的。让我们看看有哪些不同吧。

### 节点类型
节点类型（NodeFlags）是所有节点定义函数的第一个参数（注：最新 Angular v5.* 中参数列表有点点不一样，如 **[directiveDef](https://github.com/angular/angular/blob/master/packages/core/src/view/provider.ts#L31)** 中第二个参数才是 **[NodeFlags](https://github.com/angular/angular/blob/master/packages/core/src/view/types.ts#L160)**）。它实际上是 **[NodeFlags](https://github.com/angular/angular/blob/master/packages/core/src/view/types.ts#L160)** 位掩码（注：查看源码，是用二进制表示的），包含一系列特定的节点信息，大部分在 **[变更检测循环](https://juejin.im/post/5acba0b2f265da2393776304)** 时被框架使用。并且不同节点类型采用不同数字：`16384` 表示简单指令节点类型（注：仅仅是指令，可看 **[TypeDirective](https://github.com/angular/angular/blob/master/packages/core/src/view/types.ts#L178)**）；`49152` 表示组件指令节点类型（注：组件加指令，即 TypeDirective + **[Component](https://github.com/angular/angular/blob/master/packages/core/src/view/types.ts#L179)**）。为了更好理解这些标志位是如何被编译器设置的，让我们先转换为二进制：

```ts
16384 =  100000000000000 // 15th bit set
49152 = 1100000000000000 // 15th and 16th bit set
```

如果你很好奇这些转换是怎么做的，可以查看我写的文章 **[The simple math behind decimal-binary conversion algorithms](https://blog.angularindepth.com/the-simple-math-behind-decimal-binary-conversion-algorithms-d30c967c9724)** 。所以，对于简单指令 Angular 编译器会设置 `15-th` 位为 1：

```
TypeDirective = 1 << 14
```

而对于组件节点会设置 `15-th` 和 `16-th` 位为 1：

```
TypeDirective = 1 << 14
Component = 1 << 15
```

现在明白为何这些数字不同了。对于指令来说，生成的节点被标记为 `TypeDirective` 节点；对于组件指令来说，生成的节点除了被标记为 `TypeDirective` 节点，还被标记为 `Component` 节点。

### 视图定义解析器
因为 `a-comp` 是一个组件，所以对于下面的简单模板：

```html
<span>I am A component</span>
```

编译器会编译它，生成一个带有视图定义和视图节点的工厂函数：

```ts
function View_AComponent_0(_l) {
    return jit_viewDef1(0, [
        jit_elementDef2(0, null, null, 1, 'span', [], ...),
        jit_textDef3(null, ['I am A component'])
```

Angular 是一个视图树，所以父视图需要有个对子视图的引用，子视图会被存储在元素节点内。本例中，`a-comp` 的视图存储在为 `<a-comp></a-comp>` 生成的宿主元素节点内（注：意思就是 AComponent 视图存储在该组件宿主元素的元素定义内，就是存在 **[componentView](https://github.com/angular/angular/blob/master/packages/core/src/view/types.ts#L253)** 属性里。也可以查看 _Host.ngfactory.js 文件，该文件表示宿主元素 `<a-comp></a-comp>` 的工厂，里面存储 `AComponent` 视图对象）。`jit_View_AComponent_04` 参数是一个 **[代理类](https://github.com/angular/angular/blob/15090a8ad4a23dbe947ec48b581f1bf6a2da411e/packages/compiler/src/metadata_resolver.ts#L85)** 的引用，这个代理类将会解析 **[工厂函数](https://github.com/angular/angular/blob/master/packages/core/src/view/types.ts#L75)** 创建一个 **[视图定义](https://github.com/angular/angular/blob/master/packages/core/src/view/types.ts#L51)**。每一个视图定义仅仅创建一次，然后存储在 **[DEFINITION_CACHE](https://github.com/angular/angular/blob/master/packages/core/src/view/util.ts#L244)**，然后这个视图定义函数被 Angular 用来 **[创建视图对象](https://github.com/angular/angular/blob/master/packages/core/src/view/view.ts#L214)**。

> 注：这段由于涉及大量的源码函数，会比较晦涩。作者讲的是创建视图的具体过程，细致到很多函数的调用。总之，只需要记住一点就行：视图解析器通过解析视图工厂（ViewDefinitionFactory）得到视图（ViewDefinition）。细节暂不用管。

> 拿到了视图，又该如何画出来呢？看下文。

### 组件渲染器类型
Angular 根据组件装饰器中定义的 **[ViewEncapsulation](https://angular.io/api/core/ViewEncapsulation)** 模式来决定使用哪种 DOM 渲染器：

* **[Emulated Encapsulation Renderer](https://github.com/angular/angular/blob/master/packages/platform-browser/src/dom/dom_renderer.ts#L228)**
* **[Shadow Renderer](https://github.com/angular/angular/blob/master/packages/platform-browser/src/dom/dom_renderer.ts#L252)**
* **[Default Renderer](https://github.com/angular/angular/blob/master/packages/platform-browser/src/dom/dom_renderer.ts#L102)**

以上组件渲染器是通过 **[DomRendererFactory2](https://github.com/angular/angular/blob/master/packages/platform-browser/src/dom/dom_renderer.ts#L62)** 来创建的。`componentRendererType` 参数是在元素定义里被传入的，本例即是 `jit__object_Object_5`（注：上面代码里有这个对象，是 `jit_elementDef3()` 的最后一个参数），该参数是渲染器的一个基本描述符，用来决定使用哪一个渲染器渲染组件。其中，最重要的是视图封装模式和所用于组件的样式（注：`componentRendererType` 参数的结构是 **[RendererType2](https://github.com/angular/angular/blob/master/packages/core/src/render/api.ts#L118)**）：

```
{
  styles:[["h1[_ngcontent-%COMP%] {color: green}"]], 
  encapsulation:0
}
``` 

如果你为组件定义了样式，编译器会自动设置组件的封装模式为 `ViewEncapsulation.Emulated`，或者你可以在组件装饰器里显式设置 `encapsulation` 属性。如果没有设置任何样式，并且也没有显式设置 `encapsulation` 属性，那描述符会被设置为 `ViewEncapsulation.Emulated`，并被 **[忽略生效](https://github.com/angular/angular/blob/master/packages/core/src/view/util.ts#L73)**，使用这种描述符的组件会使用父组件的组件渲染器。

- - -

## 子指令
现在，最后一个问题是，如果我们像下面这样，把一个指令作用在组件模板上，会生成什么：

```
<a-comp adir></a-comp>
```

我们已经知道当为 `AComponent` 生成工厂函数时，编译器会为 `a-comp` 元素创建元素定义，会为 `AComponent` 类创建指令定义。但是由于编译器会为每一个指令生成指令定义节点，所以上面模板的工厂函数像这样（注：Angular v5.* 版本是会为 `<a-comp></a-comp>` 元素单独生成一个 `*_Host.ngfactory.js` 文件，表示宿主视图，多出来的 `jit_directiveDef6(16384, null, 0, jit_ADirective8, [], ...)` 是在这个文件代码里。可以 `ng cli` 新建项目查看 `Sources Tab -> ng://`。但作者表达的意思还是一样的。）：

```ts
function View_AppComponent_0() {
    return jit_viewDef2(0, [
        jit_elementDef3(0, null, null, 2, 'a-comp', [], ...
        jit_View_AComponent_04, jit__object_Object_5),

    jit_directiveDef6(49152, null, 0, jit_AComponent7, [], ...)
    jit_directiveDef6(16384, null, 0, jit_ADirective8, [], ...)
```

上面代码都是我们熟悉的，仅仅是多添加了一个指令定义，和子组件数量增加为 2。

以上就是全部了！

> 注：全文主要讲的是组件（视图）在 Angular 内部是如何用指令节点和元素节点定义的。


