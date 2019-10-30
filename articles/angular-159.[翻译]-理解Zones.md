# 理解Zones

[原文链接](https://blog.thoughtram.io/angular/2016/01/22/understanding-zones.html)

译者:[尊重](https://www.zhihu.com/people/yiji-yiben-ming/posts)

校对:[lx1036](https://lx1036.github.io)

2014年的 NG-Conf 上，[Brain](http://twitter.com/briantford) 介绍了美妙的 [Zone](https://www.youtube.com/watch?v=3IqtmUscE_U)，以及 Zone 是如何改变我们处理异步代码的方式的。如果你还没有看过这个视频，强烈建议你去看一看，视频只有大约15分钟。时至今日， Zone 的 APIs 可能已经变化了，但是背后的语义概念和理念并不会变化。本文我们将会略微深入地了解 Zone 的工作方式。

## 需要解决的问题

简单概括 Zone，就像 Brain 在 Talk 中说的，Zone 就是对异步操作的一个执行上下文。事实证明，Zone 对于错误处理和性能分析非常有用。但 Zone 具体是指什么呢？

为了理解这里的执行上下文是什么，我们需要更好地了解 Zone 试图解决的问题是什么。让我们先看下述的 JavaScript 代码。

```JavaScript
foo();
bar();
baz();

function foo() {...}
function bar() {...}
function baz() {...}
```

这里没有什么特别之处。有三个函数 `foo`,`bar`,`baz` 依次执行。假设我们现在希望确认代码的执行时间，我们可以使用一些分析代码来扩展上述代码段，如下所示：

```JavaScript
var start,
    time = 0;
    timer = performance ? performance.now : Date.now;

// start timer
start = timer();
foo();
bar();
baz();
// stop timer
time = timer() - start;
// log time in ms
console.log(Math.floor(time*100) / 100 + 'ms');
```

然而，我们经常会有异步操作需要执行。异步操作可能是从远端服务器获取数据的 AJAX 请求，或者我们想在下一帧安排一些工作。不论这些工作是什么，他们都有一个特性 - 异步。异步也就意味着，上述的分析代码将无法对其生效。查看下述代码段：

```JavaScript
function doSomething() {
  console.log('Async task');
}

// start timer
start = timer();
foo();
setTimeout(doSomething, 2000);
bar();
baz();
// stop timer
time = timer() - start;
```

我们通过其他操作拓展了代码序列，只是这次使用的是异步代码。这会对我们的分析代码产生什么影响呢？好吧，我们不会发现有太大的变化。事实上，现在多了一个操作，执行代码的时间比之前稍长了一些。 setTimeout 函数返回的实际时间并不被分析代码所计入，这是因为异步操作被添加到浏览器的 event queue 中，而 event queue 会在 event loop 有时间时进行清理。

如果上述内容对你而言难于理解，最好去看看[本视频](https://www.youtube.com/watch?v=8aGhZQkoFbQ)学习一下浏览器的 event loop 工作方式。

那么我们如何解决这个问题呢？ 我们需要的是 对异步操作的hooks，这样无论何时发生异步任务，我们都可以执行一些性能分析代码。当然，我们可以手动地给每个异步操作创造并启动一个独立的 timer 进行性能分析，但是由于异步操作代码都被添加到代码序列中，手动的方式会让代码变得一团糟。

这正是 Zone 发挥作用的地方。Zone 可以执行操作，例如启动或停止计时器，或保存堆栈跟踪-每次代码进入或退出 Zone。Zone 可以 override 代码中的方法，甚至可以将数据与各个 Zone 相关联。

## Creating, forking and extending Zones

Zones 其实是 Dart 的一个语言特性。然而，因为 Dart 也可以编译为 JavaScript，所以我们也可以将 Zone 的功能以 JavaScript 的语言实现。之前提到过的 Brain 就将 Zone 实现了。他创建了 [zone.js](https://github.com/angular/zone.js) 作为 Zone 与 JavaScript 的接口，Zone.js 同样也是 Angular 的依赖之一。在我们开始接触如何使用 Zone 分析代码的案例之前，先来看看 Zone 是如何被创建的。

一旦将 Zone.js 集成在网页中，我们可以就可以接入全局的 Zone 对象。Zone 包含一个 `run()` 方法，，该方法接收一个执行于该 Zone 的方法。换句话说，如果我们想要在 Zone 中运行我们的代码，我们采用如下方式：

```JavaScript
function main() {
  foo();
  setTimeout(doSomething, 2000);
  bar();
  baz();
}

zone.run(main);
```

看起来很酷，但是我们做了啥？目前看来，除了我们多写了一些代码之外，我们没得到什么不同的输出。然而，此时此刻，我们的代码在 Zone 中运行（另一个执行上下文），并且正如我们之前所学习的那样，每当我们的代码从 Zone 中进入/退出时，Zone 都可以进行操作。

为了去设置这些钩子，我们需要去 fork 当前的 zone。 Fork 一个 zone 将会返回一个新 zone，该 zone 完全继承于 父 zone。然而，forking zone 的方式允许我们拓展返回的 zone 的行为。通过使用 `Zone` 对象上的 `.fork()` 方法即可 fork zone。相关操作代码如下：

```JavaScript
var myZone = zone.fork();

myZone.run(main);
```

这样的操作将会返回一个与原始 Zone 能力相同的新 Zone()。让我们试试我们之前提到的钩子并拓展我们的新 zone。钩子使用 `ZoneSpecification` 定义， `ZoneSpecification` 用于传递给 `fork()` 函数作为参数。有下述钩子可以使用：

- onZoneCreated 于 zone 被 fork 时运行。
- beforeTask 在 zone.run 执行的状况下，在相关函数被执行前运行。
- afterTask 在相关函数于 zone 中执行后运行。
- onError 在传递给 `zone.run` 的函数出错被抛出时运行

下述例子展示了用于记录每个任务被执行前后的扩展 zone 的实现：

```JavaScript
var myZoneSpec = {
  beforeTask: function () {
    console.log('Before task');
  },
  afterTask: function () {
    console.log('After task');
  }
};

var myZone = zone.fork(myZoneSpec);
myZone.run(main);

// Logs:
// Before task
// After task
// Before task
// Async task
// After task
```

等等，发生了什么？两个 hooks 被执行了两次。为什么？很明显 `Zone.run` 接受了一个 task，因此前两条信息被记录了下来。但是看起来 `setTimeout()` 函数也创建了一个 task。这怎么可能。

## Monkey-patched Hooks

事实上还有一些其他钩子。事实上，这些并不仅仅是钩子，也是在全局范围内的 monkey-patched 方法。只要在页面中集成了 zone.js，许多触发异步操作的方法都将会被 monkey-patched, 运行于一个新的 zone 中。

比如，当我们调用 `setTimeout()` 方法时，实际上我们调用的是 `Zone.setTimeout()`, 换句话说，先使用 `zone.fork()` 创建一个新 zone，再依次执行传递给 zone 的函数处理。钩子也会被执行的原因是，因为被传入的函数处理被执行的 fork zone 是完全由父 zone 继承而来。

下述是被 `zone.js` 默认复写并作为钩子提供的函数：

- `Zone.setInterval()`
- `Zone.alert()`
- `Zone.prompt()`
- `Zone.requestAnimationFrame()`
- `Zone.addEventListener()`
- `Zone.removeEventListener()`

我们可能会疑问，为什么像是 `alert()` 和 `prompt()` 函数也会被打补丁。正如之前所提及的那样，这些打上补丁的方法同一时间都是钩子。正如我们之前所做的 `beforeTask` 和 `afterTask` 方式一样，我们也可以通过 fork zone 的方式改变和继承这些函数。利用这样的方式，我们可以拦截触发 `alert()` 和 `prompt()` 的请求，并在我们写测试时改变他们的原生行为。

`zone.js` 包含一个很小的 DSL，允许你增加 zone 的钩子。如果你对相关操作感兴趣，去查看 zone 项目的 [readMe](https://github.com/angular/zone.js#augmenting-a-zones-hook)以获取更多信息。

## 创建一个分析 Zone

我们原始的问题是无法获取代码中异步任务的执行时间。现在在 Zone 和之前我们所学习的 APIs 的基础上，我们已经拥有了创建分析异步任务 CPU 运行时间的zone 的一切。幸运的是，分析性 zone 已经于官方的 repo 中作为[例子](https://github.com/angular/zone.js/tree/master/example/profiling.html)实现。

代码如下:

```javascript
var profilingZone = (function () {
  var time = 0,
      timer = performance ?
                  performance.now.bind(performance) :
                  Date.now.bind(Date);
  return {
    beforeTask: function () {
      this.start = timer();
    },
    afterTask: function () {
      time += timer() - this.start;
    },
    time: function () {
      return Math.floor(time*100) / 100 + 'ms';
    },
    reset: function () {
      time = 0;
    }
  };
}());
```

上述代码与本文开头的代码几乎相同，只是包装在 zone specification 中。上述方法向 zone 中添加了 `.time()` 和 `.reset()` 方法，通过下述方式于 zone 对象上调用：

```JavaScript
zone
  .fork(profilingZone)
  .fork({
    '+afterTask': function () {
      console.log('Took: ' + zone.time());
    }
  })
  .run(main);
```

`+` 的语法是一个 DSL 的缩写，用于拓展父 zone 的钩子，非常简洁。

zone 还有 [LongStackTraceZone](https://github.com/angular/zone.js/tree/master/lib/zones/long-stack-trace.ts) 可以使用，同样还有更多的[例子](https://github.com/angular/zone.js/tree/master/example/profiling.html)。

继续关注后续文章，了解 zone 如何应用于 Angular 框架。