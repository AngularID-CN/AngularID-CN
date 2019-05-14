# [翻译] RxJS优化unsubscribe

> 原文链接: [RxJS: Don't Unsubscribe – Ben Lesh – Medium](https://medium.com/@benlesh/rxjs-dont-unsubscribe-6753ed4fda87)

本文所提倡的思想是不需要unsubscribe太多次。

在我帮忙给人定位RxJS异步机制的bug时，经常了解到他们保持处理大量的订阅对象，导致同一事件不断地被执行。通常开发人员建立3个可观察HTTP请求，然后在需要事件调用的地方也保持了3次订阅对象。

我能理解这么做的原因，以前开发者通常使用N次 'addEventListener'，然后使用N次 'removeEventListener' 移除不必要的event事件。同样的思维也会被应用到订阅对象中，通常这样子使用没什么问题。但是会有更好的方法来处理这种情况。如果在程序中出现过多的订阅对象，那就意味着你急需要学会如何管理订阅，以及你还没get到Rx的优势。

#### 什么情况需要紧急管理订阅呢？
如下例所示：
~~~typescript
class MyGenericComponent extends SomeFrameworkComponent {
  updateData( data ) {
    // do something framework-specific to update your component here.
  }

  onMount() {
    this.dataSub = this.getData().subscribe(data => this.updateData(data));
    
    const cancelBtn = this.element.querySelector('.cancel-button');
    const rangeSelector = this.element.querySelector('.rangeSelector');

    this.cancelSub = Observable.fromEvent(cancelBtn, 'click').subscribe(() => {
      this.dataSub.unsubscribe();
    });

    this.rangeSub = Observable.fromEvent(rangeSelector, 'change')
      .map(e => e.target.value)
      .subscribe((value) => {
        if (+value > 500) {
          this.dataSub.unsubscribe();
        }
      });
  }

  onUnmount() {
    this.dataSub.unsubscribe();
    this.cancelSub.unsubscribe();
    this.rangeSub.unsubscribe();
  }
}
~~~
在示例中，在onUnmount方法函数中使用了3次unsubscribe，同时在13行中的取消按钮点击回调中使用了this.dataSub.unsubscribe()，在22行中在range selector在超过500的条件下停止订阅数据流。

在这个相对琐碎的例子中，有点尴尬的情形是我迫切在多处进行取消订阅管理。

使用这种方式最大的好处是性能。使用更少的代码实现了同样的功能，使得性能有所提升。虽然这种方式在大多数web应用程序中能达到显著的效果不太可能，但是这并不值得担心。

或者， 你可以通过创建父subscription并且添加其他子subscription把所有subscriptions成一个subscription。

#### 使用takeUntil管理订阅
现在我们使用RxJS中的takeUntil操作符修改上面的示例。
~~~typescript
class MyGenericComponent extends SomeFrameworkComponent {
  updateData( data ) {
    // do something framework-specific to update your component here.
  }

  onMount() {
    const data$ = this.getData();
    const cancelBtn = this.element.querySelector('.cancel-button');
    const rangeSelector = this.element.querySelector('.rangeSelector');
    const cancel$ = Observable.fromEvent(cancelBtn, 'click');
    const range$ = Observable.fromEvent(rangeSelector, 'change')
      .map(e => e.target.value);
    
    const stop$ = Observable.merge(cancel$, range$.filter(x => x > 500))
    this.subscription = data$.takeUntil(stop$).subscribe(data => this.updateData(data));
  }

  onUnmount() {
    this.subscription.unsubscribe();
  }
}
~~~
引入RxJS后直观感受是代码量变少。这个好处只是其一，另一好处就是此程序中构建了stop$流事件去结束数据流的进程。这种写法可以在你任何时候想添加一个需要结束数据流进程的条件时都比较方便，比如添加一个定时器timer，到点了需要结束该数据流进程，那么就可以把timer条件合并到stop$事件变量中即可。还有一个显而易见的写法是我只使用了一个订阅对象，这就符合面向对象的程序世界中的函数式编程。毕竟，javascript是命令式语言，我们必须在一定程度上符合其他世界的某部分规则。

这种改造的另一个优势是它确实完整的完成了订阅。也就是说你可以在任何时间使用完成事件去结束你的订阅。如果仅仅是在某个返回订阅对象的时候unsubscribe的话，那么你不会收到任何取消订阅的通知。而换做takeUntil或者其他的相似操作符，在通过事件结束可观察对象后你会感知到（比如事例中stop$事件结束后，this.updateData(data)触发使人感知到）。

我要说的最后一个优势是，通过在一个地方调用‘subscribe’，就可以连接所有业务。这使得管理订阅以及定位初始订阅处变的超级简单。要记住的是，除非你订阅它们，否则可观察对象是不会被执行的。

就RxJS语义而言，这成为了唯一的缺点，不过相对其他的优势来说，这点可以忽略。

使用操作符和直接调用'unsubscribe' 之间在性能上是有点不同的，在大多数应用中，这点性能的差异是可以忽略的。

#### 其他操作符
Rx提供了更多地类似操作符可以用来结束流。下面列了一些值得推荐的：
> take(n): 发出observable的前n个值
> takeWhile(predicate)：发出在源 Observable 中满足 predicate 函数的每个值，并且一旦出现不满足 predicate 的值就立即完成
> first()：只发出由源 Observable 所发出的值中第一个
> first(predicate)：只发出由源 Observable 所发出的值中第一个满足条件的值

总结：使用takeUntil, takeWile以及其他
在管理RxJS订阅的时候应该使用类似takeUntil的操作符，为了规范，如果在一个组件中出现了2个以上的订阅需要管理，你就会考虑如何更好地去组合它们。
> 更有组合性
> 调用一次完整事件去结束流
> 少编码
> 容易管理
> 减少实际订阅（因为减少了subscribe的调用）
