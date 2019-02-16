# [翻译] 你到底需不需要redux-反方观点

> 原文链接： **[You Might Not Need Redux](https://medium.com/@dan_abramov/you-might-not-need-redux-be46360cf367)**
>
> 原文作者： **[Dan Abramov](https://medium.com/@dan_abramov)**
>
> 原文链接： **[You Probably Don’t Need Redux](https://medium.com/@blairanderson/you-probably-dont-need-redux-1b404204a07f)**
>
> 原文作者： **[Blair Anderson](https://medium.com/@blairanderson)**
>
> 原文链接： **[Goodbye Redux](https://hackernoon.com/goodbye-redux-26e6a27b3a0b)**
>
> 原文作者： **[Jack R. Scott](https://hackernoon.com/@jackrobertscott)**

> 译者按：本系列文章分为 **你到底需不需要redux-反方观点** 和 **你到底需不需要redux-正方观点** 两部分，翻译这一系列文章的原因是，译者在去年的 **ngChina** 开发者活动中咨询了有关状态管理的问题，当时咨询的问题是 **项目中是否真的需要NGRX这样的状态管理工具**，虽然当时没有得到完全正面的回答，但是译者会后还是觉得形如 NGRX Redux 之类的状态管理工具/包 **对于项目是否真的需要**是难以一言以蔽之的，故而翻译系列文章来传递来自多方多角度的观点，关于状态管理的争论必然将持续存在，谨望各位阅读此文的开发者能从中获得启发，获得自己的理解

> 译者：[尊重](https://github.com/sawyerbutton)，校对：[]()

## 你可能并不需要 Redux

开发人员经常在真正需要 Redux 之前就选择其作为项目的状态管理工具。“没有 Redux 的话我们的项目应该如何扩张呢？” 这是不加思索的开发者经常说的一句话，但后续却因为 Redux 引入其项目代码中的中间层部分而不由地皱起了眉头。“为什么我非得经由三个文件才能让一个简单地功能正常运行起来呢？我是想不开吗？！” 这样的场景是这些开发者们的真实写照。

我完全理解开发者们因为这些困境去抱怨 Redux，React，函数式编程，不可变性以及一些其他让他们不舒服的概念/工具的心情。将 Redux 与 不需要模板代码也可以执行状态更新的方法 进行比较是很自然的事情，并且得出 Redux 仅仅就是复杂的代名词的结论也“理所当然”。某种程度来说，Redux 的设计就是这样的。

事实上，Redux 给与了你权衡的能力。Redux 会要求你：

* 将应用程序状态描述为普通对象和数组
* 将系统中的变化描述为普通对象
* 将处理变化的逻辑描述为纯函数

无论是否使用 React，上述要求都不是构建一个应用所必需的。

那么你有充分的理由使用 Redux 吗？

上述这些“限制条件”之所以吸引我是因为它们会通过 以下方式 帮助项目的开发构建：

* 将状态保持到本地存储，开箱即用
* 在服务器上预填充状态，并以HTML格式将状态发送到客户端，开箱即用
* 将用户操作序列化并将其与状态快照一起添加到自动错误报告中，以便产品开发人员可以**重播**它们以复现错误
* 通过网络传递操作对象以实现协作环境，避免对代码的编写方式进行重大更改
* 维护一个撤消历史记录或实施乐观改变，避免对代码的编写方式进行重大更改
* 在开发的状态历史之间旅行，并在代码改变时从行动历史中重新评估当前状态，即 TDD (测试驱动开发)
* 为开发工具提供全面的检查和控制功能以便产品开发者能够为其应用构建自定义工具
* 在复用大多数业务逻辑的同时提供备用的UI

如果你正在使用[可扩展的终端](https://hyperterm.org/)，[JavaScript调试器](https://hacks.mozilla.org/2016/09/introducing-debugger-html/)或[其他类型的Web应用程序](https://twitter.com/necolas/status/727538799966715904)，对 Redux 进行尝试是值得的，就算不使用 redux，对其背后的理念进行一些思考也是好事(这些概念并不是[新](https://github.com/evancz/elm-architecture-tutorial)[概念](https://github.com/omcljs/om))。

但是如果你是 React 的初学者，不要一开始就使用 Redux。

一开始时你需要去学习[以 React 的方式思考](https://twitter.com/necolas/status/727538799966715904)。当你觉得你真的需要 Redux 或者 你想尝试新鲜玩意的时候，再回来试试 Redux 也不迟。但是注意要谨小慎微地对待 Redux,就像你对待任何高度自洽(自成一体)的工具时一样。

如果你觉得你在强行 ”以 Redux 的方式“ 进行开发时，这可能是你或你的团队太把 Redux 当回事的信号。它只是工具箱中的一个工具，[一个疯狂的实验而已](https://www.youtube.com/watch?v=xsSnOQynTHs)。

最后，不要忘了就算你不使用 Redux，你也可以使用 Redux 中所涉及的理念。比如：考虑以下具有本地状态的 React 组件：

```javascript
import React, { Component } from 'react';

class Counter extends Component {
  state = { value: 0 };

  increment = () => {
    this.setState(prevState => ({
      value: prevState.value + 1
    }));
  };

  decrement = () => {
    this.setState(prevState => ({
      value: prevState.value - 1
    }));
  };
  
  render() {
    return (
      <div>
        {this.state.value}
        <button onClick={this.increment}>+</button>
        <button onClick={this.decrement}>-</button>
      </div>
    )
  }
}
```

这样的组件写法完全没问题。我再重复一遍，他一点问题都没有。

使用本地状态一点问题都没有。

Redux 所提供的取舍是提供中间层以解耦”事情何时变化“与”事情如何变化“。

这总是一件好事吗？并不是，Redux 提供的仅是一个取舍。

比如，我们可以从我们的组件中抽取出一个 reducer:

```javascript
import React, { Component } from 'react';

const counter = (state = { value: 0 }, action) => {
  switch (action.type) {
    case 'INCREMENT':
      return { value: state.value + 1 };
    case 'DECREMENT':
      return { value: state.value - 1 };
    default:
      return state;
  }
}

class Counter extends Component {
  state = counter(undefined, {});
  
  dispatch(action) {
    this.setState(prevState => counter(prevState, action));
  }

  increment = () => {
    this.dispatch({ type: 'INCREMENT' });
  };

  decrement = () => {
    this.dispatch({ type: 'DECREMENT' });
  };
  
  render() {
    return (
      <div>
        {this.state.value}
        <button onClick={this.increment}>+</button>
        <button onClick={this.decrement}>-</button>
      </div>
    )
  }
}
```

你会发现我们在没有执行 npm install 的情况下就使用了 Redux，多么神奇！

你是否应该对你的状态组件使用 Redux 或其相关概念吗？可能并不一定。事实上，除非你有计划通过使用中间层让应用获益，你并不需要 Redux。按照新时代的说法，制定计划是成功的关键。

[Redux 库](https://redux.js.org/)仅仅是一组帮助器，用以将 reducers 挂载到单个全局存储对象上而已。你完全可以根据自己的喜好，或多用，或少用，Redux。

只是记住，如果你因为是用 Redux 付出了一些东西，确保你也因此获得了相应的回报。