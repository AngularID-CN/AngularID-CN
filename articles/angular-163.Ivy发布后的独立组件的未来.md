# Ivy发布后的独立组件的未来

Angular Ivy 已经于 Angular 9 rc 版本中发布了。现在正是一个好机会去了解 何为Ivy，学习相关的新 API 并且思考独立组件背后的理念。

[原文链接](https://medium.com/angular-in-depth/the-future-of-standalone-components-in-the-post-ivy-release-days-e7ed9b9b4dcd)

原作者：[Eliran Eliassy
](https://medium.com/@eliranels?source=post_page-----e7ed9b9b4dcd----------------------)

译者:[尊重](https://www.zhihu.com/people/yiji-yiben-ming/activities)

![](../assets/angular-163/1.jpeg)

本文不会解释什么是 Angular Ivy。 如果你想要了解关于 Angular Ivy 的基本内容，请查看我的前一篇[技术博客](https://blog.angularindepth.com/all-you-need-to-know-about-ivy-the-new-angular-engine-9cde471f42cf)

本文中大部分内容还处于实验性阶段尚未官方推出。它们中的大部分在未来可能还会变化。

几周前， `9.0.0-next3` 版本宣告发布，并官方宣布 "Ivy 正式成为了 Angular 的默认编译器"。Ivy 近在咫尺，是时候通过独立组件背后的理念来了解组件实现的未来了。

![](../assets/angular-163/2.png)

让我们通过一个组件来看一个简单的概念。如下所示，一个计数器组件。其包含一个用于设置初始化计数器数值的输入属性，一个通知计数器已经被重置的输出属性。

```typescript
@Component({
  selector: 'app-counter',
  template: `
    <p>Counter value: {{counter}}</p>
    <button (click)="plus()" class="btn btn-primary">+</button>
    <button (click)="reset()" class="btn btn-danger">Reset</button>
    <button (click)="save()" class="btn btn-success">Save</button>
  `,
  styleUrls: ['./counter.component.scss'],

})
export class CounterComponent {

  @Input() counter = 0;
  @Output() counterReset: EventEmitter<void> = new EventEmitter<void>();
  plus() { this.counter++; }
  reset() { this.counter = 0; this.counterReset.emit(); }
}
```

我们创建了一个 Angular 组件，这样就可以通过自定义 HTML 标签的方式使用它：

```HTML
<app-counter></app-counter>
```

为了正常使用这个自定义 HTML 标签，我们可能还需要：

1. 创建一个 NgModule - `CounterModule`
2. 在该模块中申明计数器组件并将其导出
3. 引导启动该模块
4. 将 `CounterModule` 导入主模块 `AppModule` 中

只有上述操作做完后，我们才可以使用我们的自定义选择器

```typescript
@NgModule({
  declarations: [CounterComponent],
  exports: [CounterComponent],
  imports: [CommonModule]
})
export class CounterModule { }
```

为了使用自定义的组件我们却做了远超组件本身的事。

所以我查看了 Angular 官方文档并发现了这句话：

> “A component must belong to an NgModule”.

我对此很不满意。对我而言 NgModule 的内容远超过了一个组件的范畴。Modules 包含 Injectors, providers, DI 及其他超出组件范畴的内容。NgModules 某种意义上是一个展示应用。

我想说的是，**应用并是不组件**！有时候我们只是想不依赖于任何应用渲染一个独立组件而已。

Ivy 特别吸引人的一点就是，他终于向我们提供了仅同一个简单的函数就渲染一个组件的方法：

```typescript
ɵrenderComponent(CounterComponent);
```

但是，这不是没有代价的。

正如之前所说，NgModule 定义了 Injectors, zone, directives 和 providers，如果我们创建了独立组件却没有在模块中将其申明的话，我们就必须手动处理这些边角料。

看我表演：

除了使用 `app-counter` 选择器外，我们还可以在 `OnInit` 钩子中调用 `renderComponent` 方法，并同时申明其宿主：

```typescript
@Component({
  selector: 'app-render-comp',
  template: `<counter-host></counter-host>`,
  styleUrls: ['./render-comp.component.scss'],
})
export class RenderCompComponent implements OnInit {

  ngOnInit() {
    ɵrenderComponent(CounterComponent, { host: 'counter-host' });
  }

}
```

现在，在屏幕上，我们终于可以看见计数器了：

![](../assets/angular-163/3.png)

某些层面上，他在工作...

如果我们点击 `+` 或者 `reset` 按钮，会发现屏幕上不会响应任何内容...

我在 `plus()` 和 `reset()` 函数内添加了打印功能 `console.log`:

![](../assets/angular-163/4.gif)

我们知道，NgModule 定义了 zones，而 zones 负责自动变更检测的内容。因为我们的独立组件不属于任何一个 Module，也自然独立组件不具备自动变更检测的能力。

如何修复这样的状况？ Ivy 提供了一个名为 `detectChanges()` 的方法，有点像我们在 `ChangeDetectorRef` 上使用的 `detectChanges()` 方法。Ivy 提供的 detectChanges 方法仅仅是一个独立的函数，不需要注入任何服务或者 DI：

```typescript
@Component({
  selector: 'app-counter',
  template: `
    <p>Counter value: {{counter}}</p>
    <button (click)="plus()" class="btn btn-primary">+</button>
    <button (click)="reset()" class="btn btn-danger">Reset</button>
    <button (click)="save()" class="btn btn-success">Save</button>
  `,
  styleUrls: ['./counter.component.scss'],

})
export class CounterComponent {

  @Input() counter = 0;
  @Output() counterReset: EventEmitter<void> = new EventEmitter<void>();
  plus() { this.counter++; console.log(this.counter); ɵdetectChanges(this); }
  reset() { this.counter = 0; this.counterReset.emit(); ɵdetectChanges(this); }

}
```

现在：

![](../assets/angular-163/5.gif)

一切正常！

现在让我们进行一些更有趣的尝试。

我有一个服务，可以用于通过一个 Http 请求存储计数器的值：

```typescript
export class StorageService {

  constructor(private httpClient: HttpClient) { }

  saveCounter(counter: number) {
    return this.httpClient.post('SOME_FAKE_URL', { counter });
  }
}
```

我想要将这个服务作为独立组件的一部分进行使用，我直接通过构造器进行服务的注入，并通过触发保存按钮的方法实现对 `save` 方法的调用：

```typescript
@Component({
  selector: 'app-counter',
  template: `
    <p>Counter value: {{counter}}</p>
    <button (click)="plus()" class="btn btn-primary">+</button>
    <button (click)="reset()" class="btn btn-danger">Reset</button>
    <button (click)="save()" class="btn btn-success">Save</button>
  `,
  styleUrls: ['./counter.component.scss'],

})
export class CounterComponent {

  constructor(private storageService: StorageService) { }

  @Input() counter = 0;
  @Output() counterReset: EventEmitter<void> = new EventEmitter<void>();
  plus() { this.counter++; console.log(this.counter); ɵdetectChanges(this); }
  reset() { this.counter = 0; this.counterReset.emit(); ɵdetectChanges(this); }
  save() { this.storageService.saveCounter(this.counter).subscribe(); }

}
```

现在，当我们运行应用时，会直接报一个错误：

![](../assets/angular-163/6.png)

怎么回事？

其实很简单，`CounterComponent` 组件并没有 `Injector` 可以解析我们尝试进行注入的`StorageService` 中的 `HttpClient`。那谁有 Injector? 使用 `CounterComponent` 组件的应用。

我们可以像如下方式在主 app 中注入 Injector：

```typescript
constructor(private injector: Injector) { }

ngOnInit() {
  ɵrenderComponent(CounterComponent, { host: 'counter-host', injector: this.injector });
}
```

或者，我们不想使用依赖注入（DI），Ivy 同样提供了一个方法去注入 token - directiveInject：

```typescript
ngOnInit() {
    const injector = ɵɵdirectiveInject(INJECTOR);
    ɵrenderComponent(CounterComponent, { host: 'counter-host', injector });
}
```

