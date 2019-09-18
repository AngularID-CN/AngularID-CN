# [翻译] 于服务端（SSR）环境下实现多语种Angular应用

> 原文链接：[Implementing multi-language Angular applications rendered on a server (SSR)](https://indepth.dev/implementing-multi-language-angular-applications-rendered-on-server/)
> 作者：**[Dmitry Efimenko](https://indepth.dev/author/dmitry/)**
> 译者：**[sawyer](https://github.com/sawyerbutton)**

**本文描述了：SSR场景下多语种Angular应用的可复用落地方式**

## 背景

即使是作为一个有超过10年业内工作经验的工程师，在我深入了解i18n之前，我完全不知道i18n是什么，以及为什么在i和n两个字母之间会有一个18。事实上这其中没什么奇妙的地方，只是在单词"internationalization"的 i 和 n 之间有18个字母而已，所以 i18n 就是 internationalization 国际化。 i8n 的[定义](https://www.w3.org/International/questions/qa-i18n)中有这样的描述

> The design and development of a product, application or document content that enables easy localization for target audiences that vary in culture, region, or language

通过阅读上述链接中的i18n定义，将会发现 i18n 涉及到许多领域的开发工作，但是在本文中，我们只会侧重于以下的部分

> Separating localizable elements from source code or content, such that localized alternatives can be loaded or selected based on the user’s international preferences as needed.

事实上，从代码的层面上考虑，任何需要被多语种展示的内容应当从代码中隔离出来以确保其可维护性。

本文将会探索如何在强可维护性的的规则下实现应用字段的翻译，允许应用仅载入需要的资源，并支持浏览器记忆选择的语种。之后我们将会实践多语种Angular应用的SSR落地，并给出相关问题的解决方案。

本文将会分隔成下述部分：

1. 塑造应用
2. 将SSR添加到应用中
3. 解决方案1 - 向server提供一个分隔的 i18nModule 模块
4. 解决方案2 - 在一个单个的模块中提供所有内容
5. 使用 TransferState 提高效率
6. 抵达目标

在本文的第一阶段，我们将会简单地构建一个Angular应用并添加i18n的能力。初学者请从第一部分开始阅读，有经验的开发者请看一下第一部分最后的代码，然后进入第二部分以了解添加SSR后将会出现的问题以及如何解决他们。

## 塑造应用

为了实现本文的目标，我们将会全程使用 Angular CLI 进行应用的创建。首先，使用下述 CLI 命令创建一个基本的 Angular 应用：

```bash
ng new ssr-with-i18n
```

使用下述指令创建两个演示用的组件

```bash
ng g c comp-a
ng g c comp-b
```

现在，使用创建的两个组件替换 app.component.html 文件中的内容

```html
<h1>Welcome to {{ title }}!</h1>

<app-comp-a></app-comp-a>
<app-comp-b></app-comp-b>
```

*** 上述代码位于本[仓库](https://github.com/DmitryEfimenko/ssr-with-i18n/tree/step-1-a)

## 将SSR添加到应用中

在应用中使用SSR的方式有很多，一开始我打算使用框架无关的 i18n 库 [i18next](https://www.i18next.com/)的 Angular 封装 [angular-i18next](https://github.com/Romanchuk/angular-i18next)。然而 i18next 存在一个重要的限制：在使用过程中无法进行语言的切换，无法满足我们的诉求。

在本文中，我们将会使用著名的 [ngx-translate](https://github.com/ngx-translate/core)。

> Note: The concepts of organizing modules and code described in this article do not apply just to ngx-translate. An application can use the new and shiny transloco library, which was released the date of writing this article (8/15/2019). The reader might even be trying to solve an issue that has nothing to do with translations. Therefore, this article is helpful for anybody who’s trying to solve a SSR related issue.

ngx-translate 将翻译的字句存储于不同的 JSON 文件中（一个语种一个文件），并且每个字句会使用键值对的方式进行展示：key 是字句的识别码，value是字句的翻译文本。

1. 安装依赖

除了安装 core library 之外，我们还将会安装 http-loader 以满足按需加载翻译内容的诉求。

```bash
npm install @ngx-translate/core @ngx-translate/http-loader --save
```

2. 添加代码

ngx-translate 的官方指南中推荐将相关的代码全部添加到 AppModule 中。 但是让我们做的更解藕一些，创建一个单独的模块以封装 i18n 的相关逻辑。

```bash
ng g m i18n --module app
```

该指令会添加一个新的文件 /i18n/i18n.module.ts，并将引入到 app.module.ts 文件中。

根据[官方文档](https://github.com/ngx-translate/core#configuration)修改 i18n.module.ts 文件

```typescript
import { NgModule } from '@angular/core';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { TranslateLoader, TranslateModule, TranslateService } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';

@NgModule({
  imports: [
    HttpClientModule,
    TranslateModule.forRoot({
      loader: {
        provide: TranslateLoader,
        useFactory: translateLoaderFactory,
        deps: [HttpClient]
      }
    }),
  ],
  exports: [TranslateModule]
})
export class I18nModule {
  constructor(translate: TranslateService) {
    translate.addLangs(['en', 'ru']);
    const browserLang = translate.getBrowserLang();
    translate.use(browserLang.match(/en|ru/) ? browserLang : 'en');
  }
}

export function translateLoaderFactory(httpClient: HttpClient) {
  return new TranslateHttpLoader(httpClient);
}
```

上述代码中，我们添加 TranslateModule 并配置其使用 HttpClient 加载翻译，导出 TranslateModule 模块确保 translate 管道在 AppModule 和 HTML 模版中可用，在构造器中，我们指定了可用的翻译语言并使用 ngx-translate 提供的方法获取和使用浏览器的默认语言。

默认情况下，TranslateHttpLoader 将会从 /assets/i18n/ 文件夹中加载翻译内容，让我们在相关位置添加一些文件。

/assets/i18n/en.json

```json
{
  "compA": "Component A works",
  "compB": "Component B works"
}
```

/assets/i18n/ru.json

```json
{
  "compA": "Компонент А работает",
  "compB": "Компонент Б работает"
}
```

注意：在本例子中，我们使用一种语言一个文件的方式；在更复杂的应用程序中，我们根据区域设置创建文件是更合理的方案，比如：en-US.json, en-Gb.json，但是其本质并没有发生改变，仍将是被视为单独的翻译处理。

通过上述配置，我们可以使用翻译模版字符串而不是硬编码文本更新我们的组件模板了：

```html
// comp-a.component.html
<p>{{'compA' | translate}}</p>

// comp-b.component.html
<p>{{'compB' | translate}}</p>
```

运行程序将会发现应用使用了en.json的翻译。现在创建一个组件以控制语种之间的切换。

```bash
ng g c select-language --inlineStyle --inlineTemplate
```

更新组件内的相关内容

```typescript
import { Component } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-select-language',
  template: `
    <select #langSelect (change)="translate.use(langSelect.value)">
      <option
        *ngFor="let lang of translate.getLangs()"
        [value]="lang"
        [attr.selected]="lang === translate.currentLang ? '' : null"
      >{{lang}}</option>
    </select>
  `,
})
export class SelectLanguageComponent {
  constructor(public translate: TranslateService) { }
}
```

ngx-translate 库允许我们使用 translate.use() 函数去切换所选语言，也同样支持使用 translate.currentLang 属性获取当前选择的语言。

在 app.component.html 文件中的 h1 tag 后加入我们的新组建

```html
<h1>Welcome to {{ title }}!</h1>
<app-select-language></app-select-language>
<app-comp-a></app-comp-a>
<app-comp-b></app-comp-b>
```

运行应用，现在可以观察到语言可以在运行时被切换了。选择一个不同的语言将会请求相应的 .json 文件

![1](../assets/angular-157/1.webp)

现在，让我们选择 ru 的语种后刷新页面，我们仍将看到页面以 en 语种被选中的方式被加载。浏览器没有记忆选中语言的机制，我们需要弥补这一问题。

## 记忆选中的语种

Angular 社区提供了不少扩充 ngx-translage 的[插件](https://github.com/ngx-translate/core#plugins), 其中的 [ngx-translate-cache](https://github.com/jgpacheco/ngx-translate-cache) 正是我们所需要的。跟随指南，我们首先安装相关的包

```bash
npm install ngx-translate-cache --save
```

并在 i18n 的模块中使用之，

```typescript
import { TranslateCacheModule, TranslateCacheSettings, TranslateCacheService } from 'ngx-translate-cache';

@NgModule({
  imports: [
    TranslateModule.forRoot(...), // unchanged
    TranslateCacheModule.forRoot({
      cacheService: {
        provide: TranslateCacheService,
        useFactory: translateCacheFactory,
        deps: [TranslateService, TranslateCacheSettings]
      },
      cacheMechanism: 'Cookie'
    })
  ]
})
export class I18nModule {
  constructor(
    translate: TranslateService,
    translateCacheService: TranslateCacheService
  ) {
    translateCacheService.init();
    translate.addLangs(['en', 'ru']);
    const browserLang = translateCacheService.getCachedLanguage() || translate.getBrowserLang();
    translate.use(browserLang.match(/en|ru/) ? browserLang : 'en');
  }
}

export function translateCacheFactory(
  translateService: TranslateService,
  translateCacheSettings: TranslateCacheSettings
) {
  return new TranslateCacheService(translateService, translateCacheSettings);
}
```

现在，如果我们选择了 ru 语种并且刷新了浏览器，我们会发现浏览器记住了我们之前的语种选择。注意：我们选择了 ‘cookie’ 作为我们存储选中语种的地方。 cacheMechanism 的默认选择为 ‘LocalStorage’， 但是 LocalStorage 无法在服务端访问。作为一篇用来提供SSR解决方案的长文，我们在这里先做出一些前述的行动并将选择的语种添加进服务端可以读取的地方。

直到目前，本文没有什么特别之处，我们仅仅是跟随着各种文档将 i18n 的相关逻辑封装在一个独立的模块中。而向项目中添加SSR则有许多有趣的部分，让我们继续向下。

*** 上述代码位于本[仓库](https://github.com/DmitryEfimenko/ssr-with-i18n/tree/step-1-b)

## 在应用中添加SSR

[Angular CLI](https://juristr.com/blog/2019/08/thank-you-angular-cli-team/) 是非常强大的工具，尤其是 CLI 所提供的 Schenmatics 特性允许开发者通过简单的指令，向应用中添加新能力。在本例中，将使用如下指令向应用中添加 SSR 。

```bash
ng add @nguniversal/express-engine --clientProject ssr-with-i18n
```

运行上述指令将会更新一些项目文件并添加一些新文件。

![1](../assets/angular-157/2.webp)

此时，Package.json 文件中会新增一些可执行的新脚本命令，其中最重要的两个是 _build:ssr_ 和 _serve:ssr_ 。

当我们执行上述的新脚本命令时，执行都会成功，但是当我们打开浏览器时加载页面时，将会产生一个错误。

> TypeError: Cannot read property 'match' of undefined
    at new I18nModule (C:\Source\Random\ssr-with-i18n\dist\server\main.js:113153:35)

追根溯源一下，将会发现出错的代码是

```typescript
browserLang.match(/en|ru/)
```

_browserLang_ 变量为 _undefined_, 这意味着下述语句失效了

```typescript
const browserLang = translateCacheService.getCachedLanguage() || translate.getBrowserLang();
```

当我们在使用服务端渲染时获取浏览器特性的API，毫无疑问会报错（_getBrowserLang_ 函数显然不是一个能运行在服务端的函数）。现在先姑且将 _browserLang_ 这个参数赋固定的值，之后再来具体解决这个问题。

```typescript
const browserLang = 'en';
```

重启应用之后将不会在产生之前的错误。打开开发者工具，可以观察到 SSR 正常运作，只是我们的翻译功能没有实现。

![3](../assets/angular-157/3.webp)

为什么？可以观察到 _TranslateModule_ 模块中用于加载翻译所使用的工厂函数为 _translateLoaderFactory_
。 这个函数使用了 _HttpClient_ 并且知晓如何从浏览器加载包含翻译的 JSON 文件。但是该工厂函数并不清楚如何在服务端环境中加载这些文件。

针对此种情况，需要解决两个问题：

1. 需要确保在客户端和服务端环境下正确地加载选中语言（而不是用固定赋值的方式）。
2. 针对不同的环境，使用合适的机制去加载包含翻译的 JSON 文件。

针对这两个问题，探寻解决方案

## 评估已有的解决方案

有许多方式可以确保解决问题，在 ngx-translate 的官方仓库中有一个和启用SSR 相关的 [issue #754](https://github.com/ngx-translate/core/issues/754)，提到了问题1和2的某些解决方案。

### 方案1：通过 HttpInterceptor 进行弥补

issue中最新提及的一个方案来自于 [Angular Universal: How to add multi language support?](https://itnext.io/angular-universal-how-to-add-multi-language-support-68d83f6dfc4d), 用于解决问题2，作者推荐使用 _HttpInterceptor_ 给请求打上补丁，确保在服务端环境下请求可以获取到 JSON 文件。

这个方案的确可行，但是给请求打补丁的方式还是有点怪异。为什么在相对本地的情况下，还需要进行一次额外的请求以获取文件呢？使用文件系统可能是一个更简洁的方案。

### 方案2: 直接读取 JSON 文件

在上述 Issue 中也有人提及到，可以直接将文件导入到定义模块的文件中去即可，这样在我们可以确认环境的情况下，我们可以决定使用 _TranslateHttpLoader_ 还是自定义的内容（直接导入 JSON 文件）。这个方案提供了一个思路，如何检查代码运行于哪个环境之中：_if (isPlatformBrowser(platform))_, 我们也将在下文中使用这个思路。

```typescript
import { PLATFORM_ID } from "@angular/core";
import { isPlatformBrowser } from '@angular/common';
import * as translationEn from './assets/i18n/en.json';
import * as translationEs from './assets/i18n/es.json';

const TRANSLATIONS = {
  en: translationEn,
  es: translationEs,
};

export class JSONModuleLoader implements TranslateLoader {
  getTranslation(lang: string): Observable<any> {
    return of(TRANSLATIONS[lang]);
  }
}

export function translateLoaderFactory(http: HttpClient, platform: any) {
  if (isPlatformBrowser(platform)) {
    return new TranslateHttpLoader(http);
  } else {
    return new JSONModuleLoader();
  }
}

// module imports:
TranslateModule.forRoot({
  loader: {
    provide: TranslateLoader,
    useFactory: translateLoaderFactory,
    deps: [HttpClient, PLATFORM_ID]
  }
})
```

虽然这的确是一个解决方案，但是极力不推荐使用这个方案，若以上述方式引入 JSON 文件，JSON 文件将会存在于构建出的浏览器包中。而使用 _HttpLoader_ 的目标就是按需加载语言文件以减少构建后的浏览器包大小。

使用这种方案将会导致所有的语言文件打包在一起，并影响JS的运行性能。

即使上述结局方案都从某种程度上解决了问题2，但是他们都存在其劣势。一个方案需要增加不必要的请求而另一个会影响应用的性能。最重要的是，都没人能解决问题1。

### 更好的方案 - 前置条件

下文中将会提供两个不同的方案以解决上述问题，而两个方案都需要下述前置条件：

1. 需要使用名为 [cookie-parser](https://www.npmjs.com/package/cookie-parser) 的第三方依赖。
2. 需要理解 Angular 中的 REQUEST 注入 token

#### 前置1：为什么需要 cookie-parser

ngx-translate-cache 库只负责当用户在客户端选择了一种语言后创建一个cookie，通常来说，cookie的名字是 lang（支持可配置）。在接下来的解决方案中，我们需要在服务端获取到 cookie 的值。一般状况下，我们可以从任意的 Express请求处理的对象 req.headers.cookie 中获取到相关的信息，cookie 的值形如：

```typescript
lang=en; other-cookie=other-value
```

这份属性包含了我们所需要的全部信息，只是我们需要将 lang 这个参数解析出来。而作为 express 中间件的 cookie-parser 刚好承担了这样的任务。

安装需要的依赖

```bash
npm install cookie-parser
npm install @types/cookie-parser -D
```

使用 cookie-parser 更新 server.ts 文件

```typescript
import * as cookieParser from 'cookie-parser';
app.use(cookieParser());
```

事实上，cookie-parser 将会解析 Cookies 并将其存储在 req.cookies 的字典对象中。

```JSON
{
  "lang": "en",
  "other-cookie": "other-value"
}
```

#### 前置2：Angular 的 REQUEST 注入 token

现在我们已经拥有了从请求体（request object）中获取 cookie 的能力，我们需要在 Angular 应用中获取 req 对象了。而 REQUEST Injection token 就是是做这个的。

```typescrpit
import { REQUEST } from '@nguniversal/express-engine/tokens';
import { Request } from 'express';

export class AnyModule {
  constructor(@Inject(REQUEST) private req: Request) {
    console.log(req.cookies.lang); // 'en' | 'ru'
  }
}
```

这里需要注意的是，REQUEST Injection token 是属于 @nguniversal/express-engine/tokens 模块的。
同时，req 对象是 Request 类型，而 Request 是由 express 库提供的类型定义。

如果我们玩合计将 Request 的类型定义从 express 库引入， typescript 将会假设 Request 来自于 lib.dom.d.ts 的 Fetch API，而来自 lib.dom.d.ts 类型定义文件中的 Request 是不包含 req.cookies的，并将配合 tslint 给出错误提示。

## 现在已经临门一脚了

请查看下面链接中的代码，因为它将会是系列的后续部分的基础。

*** 上述代码位于本[仓库](https://github.com/DmitryEfimenko/ssr-with-i18n/tree/step-2)
