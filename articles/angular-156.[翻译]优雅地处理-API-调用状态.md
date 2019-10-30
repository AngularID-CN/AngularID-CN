# [翻译] 优雅地处理 API 调用状态

> 原文链接：[Handle API call state NICELY](https://blog.angularindepth.com/handle-api-call-state-nicely-445ab37cc9f8)
> 
> 原文作者：[Siyang Kern Zhao](https://blog.angularindepth.com/@siyangkernzhao)
> 
> 译者：[dreamdevil00](https://github.com/dreamdevil00)；校对者：

在本文中， 我将介绍一种处理 API 调用状态的方法， 该方法通过提取通用逻辑的方式减少了样板代码。 这种方法非常强力、整洁、不易出错。本文假定使用 [NgRx](https://ngrx.io/) 管理状态。

![Photo by Sven Fischer on Unsplash](../assets/angular-156/1.jpg)

我敢打赌 API 调用是 web 开发中最常见的需求之一。很多应用程序都有大量的 API 调用。就用户体验而言，显示 API 调用的状态(例如加载时使用 spinner 显示 `加载中`或出错时显示错误消息)始终是一种良好的实践。我见过很多对 API 调用状态建模的方法，并且发现了一个主要的痛点——**繁重的样板代码**，这通常会导致更多的问题。

**繁重的样板代码**

比如， 假设有下列业务要求:

1. 发起 API 请求并获取今天的新闻列表

2. 在加载时显示 spinner

3. 当获取数据成功时， 显示加载的新闻列表

很多开发者会按下述方式设计状态模型(使用 2 种 actions，例如 `LoadNews` 和 `LoadNewsSuccess`, 然后使用 2 个 reducer cases 改变 `loading` 和 `entities` 的状态)

```typescript
export interface News {
    loading: boolean;
    entities: string[];
}
```

到目前为止， 我们还没有看到任何问题。 这种处理方式很中规中矩。

如果在应用中有 20(或者更多)次 API 请求， 问题来了:

1. **样板代码太多**。 我们需要添加 API 状态(`loading`) 20 次， 40 个 actions 以及实现 40 个 reducer cases。 代码中有很多逻辑是重复的。
 
2. **命名不一致**。如果 20 次 API 调用是由 4 名开发者实现的。 他们可能会有不同的命名方式。 比如， `loading` 可能被命名为 `isLoading`, `waiting`, `isWaiting`, `started` 等等。

实际上，上述 API 状态模型只有一个状态 `loading`。 然而， 一个完整的 API 状态应该有更多的状态(会在下节讨论), 这将使上述 2 个问题更加糟糕。

我们来优雅地解决这个问题。

## 什么是完整的状态集

完整的 API 调用过程可能有下述状态:

1. API 调用尚未开始
2. API 调用已开始但是还没有收到响应
3. API 调用成功，收到调用成功的响应
4. API 调用失败，收到错误响应

这样我们就可以设计一种通用的模型， 如下(称其为 `Loadable`)

```typescript
export interface Loadable {
    loading: boolean; 
    success: boolean; 
    error: any;
}
```

很容易将 API 调用过程的 4 种状态映射到 上述模型中的 3 个字段。

我创建了 4 个 helper 函数来更新 loadable 的状态。可以看到它们都是纯函数， 都返回了新的 Loadable 对象:

```typescript
export function createDefaultLoadable() {
  return {
    loading: false,
    success: false,
    error: null,
  }
}
export function onLoadableLoad(loadable) {
  return {
    ...loadable,
    loading: true,
    success: false,
    error: null,
  };
}
export function onLoadableSuccess(loadable) {
  return {
    ...loadable,
    loading: false,
    success: true,
    error: null,
  };
}
export function onLoadableError(loadable, error) {
  return {
    ...loadable,
    loading: false,
    success: false,
    error: error,
  };
```

## 将 loadable 添加到我们的加载新闻列表示例

## 模型

除了 loadable 的 3 个字段， 我们还需要一个状态来存储从 API 调用中获取到的新闻列表。我们可以添加下述模型:

```typescript
export interface News extends Loadable {
    news: string[];
}
export function createDefaultNews(): News {
  return {
    ...createDefaultLoadable(),
    entities: []
  };
}
```

## Actions

Actions 和 **ngrx** 惯例保持一致。

```typescript
export enum NewsActionsTypes {
  Load = '[NEWS PAGE] LOAD NEWS',
  LoadSuccess = '[NEWS PAGE] LOAD NEWS SUCCESS',
  LoadError = '[NEWS PAGE] LOAD NEWS ERROR',
}

export class LoadNews implements Action {
  readonly type = NewsActionsTypes.Load;
}

export class LoadNewsSuccess implements Action {
  readonly type = NewsActionsTypes.LoadSuccess;
  constructor(public payload: {entities: string[]}) {}
}

export class LoadNewsError implements Action {
  readonly type = NewsActionsTypes.LoadError;
  constructor(public error: any) {}
}
export type NewsActions = LoadNews | LoadNewsSuccess | LoadNewsError
```

## Reducer(仍未完善)

根据 3 种不同的 actions， 我们使用一个 reducer 改变状态。

```typescript
export function newsReducer(state: News = createDefaultNews(), action: NewsActions): News {
  switch (action.type) {
    case NewsActionsTypes.Load:
      return onLoadableLoad(state);
    case NewsActionsTypes.LoadSuccess:
      return {
        ...onLoadableSuccess(state),
        entities: action.payload.entities
      };
    case NewsActionsTypes.LoadError:
      return onLoadableError(state, action.error);
    default:
      return state;
  }
}
```

## Effects

```typescript
@Effect()
loadNews = this.actions$.pipe(
  ofType(NewsActionsTypes.Load),
  switchMap(action => {
    return this.http.get('some url').pipe(
      map((response: any) => new LoadNewsSuccess({entities: response.todaysNews})),
      catchError(error => of(new LoadNewsError(error)))
    );
  }),
);
```

## UI Component

```typescript
@Component({
  selector: 'app-news',
  template: `
  <button (click)="load()">Load News</button>

  <!--loading spinner-->
  <p *ngIf="(news$ | async).loading">loading...</p>
  
  <p *ngFor="let item of (news$ | async).entities">{{item}}</p>
  `
})
export class NewsComponent {

  news$: Observable<News>;

  constructor(private store: Store<{news: News}>) {
    this.news$ = this.store.select(state => state.news);
  }

  load() {
    this.store.dispatch(new LoadNews());
  }
}
```

这就足够让它运行了。然而，这仅仅是通过扩展 loadable 来帮助实现一致的命名，并通过使用 helper 函数来帮助确保状态的正确更改。实际上样板代码并没有减少。想象一下，如果我们有 20 个 API调用，我们仍然需要处理这 20 个 reduce 中的所有 action(load、loadSuccess、loadError)。其中有 20 个共享相同的状态(即 `loading` `success` `error`)改变逻辑。

## 从 reducer 中提取 API 状态改变逻辑

我们定义一个的高阶函数 `withLoadable`, 该函数以 reducer、三种 action 类型字符串为参数， 并返回新的加强过的 reducer

```typescript
export function withLoadable(baseReducer, {loadingActionType, successActionType, errorActionType}) {
  return (state, action) => {
    if (action.type === loadingActionType) {
      state = onLoadableLoad(state);
    }
    if (action.type === successActionType) {
      state = onLoadableSuccess(state);
    }
    if (action.type === errorActionType) {
      state = onLoadableError(state, action.error);
    }
    return baseReducer(state, action);
  };
}
```

这样， news reducer 就会变成这样子:

```typescript
// base reducer should only update non-loadable states
function baseNewsReducer(state: News = createDefaultNews(), action: NewsActions): News {
  switch (action.type) {
    case NewsActionsTypes.LoadSuccess:
      return {
        ...state,
        entities: action.payload.entities
      };
    default:
      return state;
  }
}
// withLoadable enhances baseReducer to update loadable state
export function newsReducer(state: News, action: NewsActions): News {
  return withLoadable(baseNewsReducer, {
    loadingActionType: NewsActionsTypes.Load,
    successActionType: NewsActionsTypes.LoadSuccess,
    errorActionType: NewsActionsTypes.LoadError,
  })(state, action);
}
```

`baseNewsReducer` 处理 loadable 之外的状态(即 `entities`)

`newsReducer` 实际上会将 `withLoadable` 增强程序应用到 `baseReducer`, 而 `baseReducer` 会 **自动** 处理 loadable 状态的改变。

这样， 如果我们有 20 次 API 调用，并且想存储 20 * 3 = 60 个状态， 我们仅仅需要将 `withLoadable` 应用到 20 个 base reducers. 在这 20 个 base reducers 中， 我们并不关心应该如何更新 loadable 状态。 这样的话， 就省下了手动更新 API 状态的大量工作。

## 福利: 将 Loadable 和 UI 组件连接起来

Loadable 实际上提供了一个真正的一致性契约，这样它就可以与全局 UI 组件无缝连接。例如，我可以创建一个通用组件 `loading-container` 来全局地处理加载场景 UI，错误场景 UI。与外界的唯一契约仅仅是经 `@Input` 修饰的 `Loadable`。

```typescript
@Component({
  selector: 'loading-container',
  template: `
    <div *ngIf="loadable.loading">This is loading spinner...</div>
    <div *ngIf="loadable.error">{{loadable?.error?.message || 'Something went wrong'}}</div>
    <ng-container *ngIf="loadable.success">
        <ng-content></ng-content>
    </ng-container>
  `
})
export class LoadingContainerComponent {
  @Input() loadable: Loadable;
}
```

只要像这样使用 `loading-container` 组件, 我们就可以在 API 调用过程中显示 spinner， 在 API 调用出错时显示错误信息, 同时， 也减少了大量样板代码。

```typescript
<loading-container [loadable]="news$ | async">
  <p *ngFor="let item of (news$ | async).entities">{{item}}</p>
</loading-container>
```

请阅读在 [StackBlitz](https://stackblitz.com/github/zhaosiyang/loadable-example) 或者 [Github Repo](https://github.com/zhaosiyang/loadable-example) 上的最终代码。这上面的代码和本文代码的唯一的区别是: 其类型更加严格。这是为了在现实生活中获得更好的编码体验。此外，它还使用 mock API 调用来获取新闻列表。

如果你想在你的项目中使用它， 我已经发布了一个 npm 包。 可以在[这里](https://www.npmjs.com/package/loadable-state)查看。

[Loading-example](https://stackblitz.com/github/zhaosiyang/loadable-example)

[zhaosiyang/loadable-example](https://github.com/zhaosiyang/loadable-example)

[loadable-state](https://www.npmjs.com/package/loadable-state)

编码快乐!