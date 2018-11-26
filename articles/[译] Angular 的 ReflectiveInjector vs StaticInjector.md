# [译] Angular 的 ReflectiveInjector vs StaticInjector

> 原文连接：**[Angular deprecates ReflectiveInjector and introduces StaticInjector. Should you care?](https://blog.angularindepth.com/angular-introduces-staticinjector-should-you-care-4e059eca030c)**

> 注：**[mgechev/injection-js](https://github.com/mgechev/injection-js)** 就是把低于 Angular V5 的依赖注入模块（使用 ReflectiveInjector）抽出来，单独做个包，可以被其他框架或包使用，阅读本文时可结合这个包一起看，代码就是 Angular V4 的依赖模块的源码。包作者 mgechev 也是 Angular Team Member。

> 注：也可结合知乎上该问题阅读：**[Angular2的依赖注入是怎么实现的？](https://www.zhihu.com/question/265773703/answer/299346644)** 。

![Injector](../assets/18/1.jpeg)

Angular 5.0.0 的 **[change log](https://github.com/angular/angular/blob/master/CHANGELOG.md#500-pentagonal-donut-2017-11-01)** 中提到了 breaking change，与平台和编译器提供商有关，并引入了 StaticInjector。StaticInjector 将会替换现有的 ReflectiveInjector，而 ReflectiveInjector 将会被废弃掉（注：ReflectiveInjector 被废弃掉并不是说明这个设计是残次品，只是它不适用于 Angular 框架内的设计，实际上它可以单独拿出来，作为依赖注入功能被其他框架或包使用，后文会涉及）。我们大多数开发者并不会直接使用 ReflectiveInjector，甚至都不了解其内部原理，所以这个 breaking change 不会立即对我们的代码产生什么影响。

为何 StaticInjector 这个设计会更好？这个 breaking change 会如何影响我们的代码，需要去修改我们的代码吗？你可能会问自己这些问题，但是别担心，我和 **[Alexey Zuev](https://medium.com/@a.yurich.zuev)** 替你想过了这些问题，并为你准备了这篇文章。

## ReflectiveInjector 为何是反射的？
在探索 StaticInjector 之前，先花几分钟看下 ReflectiveInjector 为啥被称为反射的。看一个简单的示例：

```ts
class B {}

class A {
  constructor(@Inject(B) b) { }
}

const i = ReflectiveInjector.resolveAndCreate([A, B]);
const a = i.get(A);
```

这里有 A 服务和 B 服务，且 A 服务依赖于 B 服务，当我们把服务提供商传给 `resolveAndCreate` 方法时，并没有指定两者的依赖关系，那为何注入器知道这个依赖关系呢？

你可能已经猜到关键就是 `Inject` 装饰器，这个装饰器使用 `Reflect` 库来给 A 类添加一些元数据。我写过一篇文章 **[Implementing custom component decorator in Angular](https://blog.angularindepth.com/implementing-custom-component-decorator-in-angular-4d037d5a3f0d)** 来讲解 Angular 中的装饰器如何使用这个 `Reflect` 库。

下面是 `Inject` 装饰器实现的代码片段：

```ts
function ParamDecorator(cls: any, unusedKey: any, index: number) {
  ...
  // parameters here will be [ {token: B} ]
  Reflect.defineMetadata('parameters', parameters, cls);
  return cls;
}
```

从上面代码可知道，当 `Inject` 装饰器执行时就会知道类的依赖。

因此，`resolveAndCreate` 方法会遍历传进来的每一个服务提供商，使用 `Reflect` 对象来收集所有依赖。**[resolveReflectiveFactory](https://github.com/angular/angular/blob/4.4.x/packages/core/src/di/reflective_provider.ts#L100-L121)** 函数会执行整个过程，即遍历传进来的服务提供商，并解析依赖（注：ReflectionCapabilities 源码在 **[L19-L236](https://github.com/angular/angular/blob/4.4.x/packages/core/src/reflection/reflection_capabilities.ts#L19-L236)**）：

```ts
function resolveReflectiveFactory(provider) {
  // ...
  if (provider.useClass) {
    var useClass = resolveForwardRef(provider.useClass);
    factoryFn = reflector.factory(useClass);
    resolvedDeps = _dependenciesFor(useClass);
  }
}

export class ReflectionCapabilities {
  ...
  private _ownParameters(type, parentCtor) {
     ...
     // R is Reflect
     const paramAnnotations = R.getOwnMetadata('parameters', type);
  }
}
```

现在，就可看出 `ReflectiveInjector` 依赖于 `Reflect` 对象提供的反射能力，来搜集隐式依赖。

## StaticInjector 有何不同？
StaticInjector 完全不会解析隐式依赖，相反，它需要开发者为每一个提供商显式指定依赖（注：放弃 ReflectiveInjector，恶心开发者。不过为了性能，这点代价，值）。所以如果要使用 StaticInjector 就得这么修改代码：

```ts
class B {}
class A { constructor(@Inject(B) b) {} }

const i = ReflectiveInjector.resolveAndCreate([A, B]);
const a = i.get(A);
```

使用 StaticInjector 就得重构代码：

```ts
class B {}
class A { constructor(b) {} }
const i = Injector.create([{provide: A, useClass: A, deps: [B]]};
const a = i.get(A);
```

可看到，这里使用 `deps` 属性来显式指定 A 的依赖是 B，新的服务提供商类型叫 `StaticClassProvider`，其接口类型是（注：源码为 **[L85-L114](https://github.com/angular/angular/blob/7.1.0/packages/core/src/di/provider.ts#L85-L114)**）：

```ts
export interface StaticClassProvider {
  provide: any;
  useClass: Type<any>;
  deps: any[];
  multi?: boolean;
}
```

现在的服务提供商包含所有可能类别（注：源码为 **[L271-283](https://github.com/angular/angular/blob/7.1.0/packages/core/src/di/provider.ts#L271-L283)**）：

```ts
export type StaticProvider = ValueProvider | 
                             ExistingProvider |
                             StaticClassProvider |  
                             ConstructorProvider |
                             FactoryProvider | any[];
```



## 为何 StaticInjector 更好？
StaticInjector 主要优势是性能优势。上文说到，ReflectiveInjector 依赖于 `Reflect` 对象，但由于浏览器 JS 引擎目前还不支持反射特性（注：目前 Reflect 对象反射功能浏览器兼容性也就剩 IE 支持的不好，**[Reflect 浏览器兼容性](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Reflect#%E6%B5%8F%E8%A7%88%E5%99%A8%E5%85%BC%E5%AE%B9)**），所以不得不引入 `Reflect` 增强包（注：有 **[reflect-metadata](https://www.npmjs.com/package/reflect-metadata)** 或 **[core-js/es7/reflect](https://www.npmjs.com/package/core-js)**）来支持这个功能。

从下面代码可看出，Reflect 会把你装饰器修饰的类存储在 Map 对象里：

```ts
// core-js/library/modules/_metadata.js
var Map     = require('./es6.map')
  , $export = require('./_export')
  , shared  = require('./_shared')('metadata')
  , store   = shared.store || (shared.store = new (require('./es6.weak-map')));
var getOrCreateMetadataMap = function(target, targetKey, create){
  var targetMetadata = store.get(target);
  if(!targetMetadata){
    if(!create)return undefined;
    store.set(target, targetMetadata = new Map);
  }
```

随着修饰类的增多，导致 Map 对象很大，查找 Map 对象时效率就会很慢。然而 StaticInjector 没有使用 `Reflect`，所以不存在查找效率问题。

除了性能问题，由于 StaticInjector 不依赖于 `Reflect` 包，从而可以减少整个程序的大小。由于模块和组件注入器没有使用 `ReflectiveInjector`，所以妨碍移除 `Reflect` 包的唯一因素就是装饰器，但是 **[装饰器除了元数据外，也支持其他方案](https://stackoverflow.com/questions/45274539/when-and-how-s-decorator-applied-to-the-decorated-classes-from-the-angular-pack)**，所以将来可能会被完全移除。

## 这个破坏性变化意味着什么？
尽管 Angular 5 引入了破坏性变更，但是大多数开发者在升级时不需要做什么。这是因为大多数开发者只关心模块和组件注入器，而这两个注入器又没用到 `ReflectiveInjector`。但是 Angular 也创建了 `Platform`、`Compiler` 和 `NgZone` 注入器，这些注入器使用了 `ReflectiveInjector`，因而会受到影响。

那开发者会在哪和这三个注入器打交道？还记得 `main.ts` 的代码吗：

```ts
platformBrowserDynamic().bootstrapModule(AppModule);
```

第一个函数 `platformBrowserDynamic()` 调用会创建 `Platform Injector`，并接收服务提供商，第二个函数 `bootstrapModule(AppModule)` 会实例化 JIT 编译器对象，即创建 `Compiler Injector`，并接收服务提供商。我之前写过一篇文章对这些知识有所涉及 **[How to manually bootstrap Angular application](https://blog.angularindepth.com/how-to-manually-bootstrap-an-angular-application-9a36ccf86429)** ，`NgZone Injector` 不需要传入服务提供商，所以不受影响。

正如我说的，你可以向 `Platform Injector` 传入服务提供商：

```ts
class B {}
class A { constructor(@Inject(B) b) {} }

platformBrowserDynamic([A, B])
```

向 `Compiler Injector` 传入服务提供商：

```ts
class B {}
class A { constructor(@Inject(B) b) {} }
bootstrapModule(AppModule, {providers: [A, B]});
```

由于将要使用 StaticInjector，所以将不会通过反射来隐式解析依赖，所以你需要像这样重构你的代码：

```ts
class B {}
class A { constructor(b) {} }
platformBrowserDynamic([{ provide: A, useClass: A, deps: [B] }, B])
```

`Compiler Injector` 那部分也同理：

```ts
class B {}
class A { constructor(b) {} }
bootstrapModule(AppModule,
  {
    providers: 
      [
        {provide: A, useClass: A, deps: [B]},
        B
      ]
  });
```

总之，Angular V5 的这次破坏性变更只影响 `Platform Injector` 和 `Compiler Injector` 那部分代码，由于 `ReflectiveInjector` 已经被废弃了，如果你在 `main.ts` 里使用到了这两个注入器，最好尽快升级。

> 注：翻译这篇文章，并不是为了了解 Angular 依赖注入功能的变更历史。**而是借此文为引子，学习 Reflect、Decorator 和如何用 Reflect 实现依赖注入。** Angular 不使用 ReflectiveInjector 并不代表这个设计方案不好，只是对于 Angular 不再需要了而已，相反，**[mgechev/injection-js](https://github.com/mgechev/injection-js)** 包就是把这个功能独立出来成包，可以给任何框架或包使用。总之，它依然是个优秀的设计，可以用于项目里。