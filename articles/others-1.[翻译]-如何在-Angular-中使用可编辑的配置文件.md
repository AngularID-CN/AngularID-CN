# [翻译] 如何在 Angular 中使用可编辑的配置文件

> 原文链接： **[Angular How-to: Editable Config Files](https://blogs.msdn.microsoft.com/premier_developer/2018/03/01/angular-how-to-editable-config-files/)**
>
> 原文作者： **[Pam Lahoud](https://social.msdn.microsoft.com/profile/Pam+Lahoud)**

_之前介绍过 Angular 提供了一些机制来监听框架初始化过程，本文主要介绍在 Angular 应用被构建，打包和部署后如何编辑其配置文件_

在本篇博客中，首席开发顾问 [Laurie Atkinson](https://www.linkedin.com/in/atkinsonlaurie/) 将会带你领略如何对已构建打包和部署的 Angular应用程序 进行配置文件的编辑和修改。

为了响应 Angular 的最新更新，本文已于2018年12月3日更新。

Angular CLI 是构建产品级应用的推荐工具，使用其生成的项目实现了打包，丑化（uglifying）和摇树优化的一体化。Angular CLI 生成的应用甚至拥有 创建特定环境版本 的机制。然而那些配置文件都由 typescript 文件所编写并且并不允许 IT 人员 或 自动部署工具（如VSTS）进行编辑。本文提供了关于 可以针对多个环境进行自定义配置的 JSON 文件的食用方式和代码示例。

### 为配置设定定义 TypeScript 接口

在 Angular 应用程序中使用接口可为实体提供智能感知和类型安全的功能。对于本文的需求的配置样本文件进行如下接口设定：

**app-config.model.ts**

```ts
export interface IAppConfig {
    env: {
        name: string;
    };
    appInsights: {
        instrumentationKey: string;
    };
    logging: {
        console: boolean;
        appInsights: boolean;
    };
    aad: {
        requireAuth: boolean;
        tenant: string;
        clientId: string;

    };
    apiServer: {
        metadata: string;
        rules: string;
    };
}
```

### 创建 JSON 配置文件

项目中存储配置文件最合适的位置是项目的 assets 文件夹下。使用上面定义的接口文件，样本文件如下所示：

**assets\config\config.dev.json**

```json
{
    "env": {
    "name": "DEV"
     },
    "appInsights": {
    "instrumentationKey": "<dev-guid-here>"
     },
    "logging": {
    "console": true,
    "appInsights": false
    },
    "aad": {
    "requireAuth": true,
    "tenant": "<dev-guid-here>",
    "clientId": "<dev-guid-here>"
    },
    "apiServer": {
    "metadata": "https://metadata.demo.com/api/v1.0/",
    "rules": "https://rules.demo.com/api/v1.0/"
    }
}
```

**assets\config\config.deploy.json** 注意下述占位符将会在部署时被替换掉

```json
{
    "env": {
    "name": "#{envName}"
    },
    "appInsights": {
    "instrumentationKey": "#{appInsightsKey}"
    },
    "logging": {
    "console": true,
    "appInsights": true
    },
    "aad": {
    "requireAuth": true,
    "tenant": "#{aadTenant}",
    "clientId": "#{aadClientId}"
    },
    "apiServer": {
    "metadata": "https://#{apiServerPrefix}.demo.com/api/v1.0/",
    "rule": "https://#{apiServerPrefix}.demo.com/api/v1.0/",
    }
}
```

### 继续使用带有 Angular CLI 构建的 environment.ts 文件

Angular CLI 文件在 environments 文件夹下创建了一些（数量不定但默认是两个）TypeScript 环境文件。在本文的例子中他们仍然将被使用，但是文件中只包含环境的名称。

**environments\environment.dev.json**

```ts
export const environment = {
    name: 'dev'
};
```

**environments\environment.deploy.json**

```ts
export const environment = {
    name: 'deploy'
};
```

**angular.json**

```json
"projects": {
  "my-app": {
    "architect": {
      "build": {
        "configurations": {
          "deploy": {
            "fileReplacements": [
              {
                "replace": "src/environments/environment.ts",
                "with": "src/environments/environment.deploy.ts"
              }
            ],
          }
        }
      },
      "serve": {
        "configurations": {
          "deploy": {
            "browserTarget": "my-app:build:deploy"
          }
        }
      }
    }
  }
}
```

### 创建一个服务以读取配置文件

该服务将会获取配置文件的配置并将配置存储于类的静态变量中

**app.config.ts** 注意对于上述接口定义的使用以及为了获取正确文件所配置的命名公约

```ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../environments/environment';
import { IAppConfig } from './models/app-config.model';
@Injectable()
export class AppConfig {
    static settings: IAppConfig;
    constructor(private http: HttpClient) {}
    load() {
        const jsonFile = `assets/config/config.${environment.name}.json`;
        return new Promise<void>((resolve, reject) => {
            this.http.get(jsonFile).toPromise().then((response : IAppConfig) => {
               AppConfig.settings = <IAppConfig>response;
               resolve();
            }).catch((response: any) => {
               reject(`Could not load file '${jsonFile}': ${JSON.stringify(response)}`);
            });
        });
    }
}
```

### 于应用创建前加载配置文件

Angular 包含一个名为 APP_INITIALIZER 的令牌，其允许在应用初始化的的过程中执行某些代码。在 app 模块中，使用该令牌以触发我们配置服务中的 load 方法。因为该方法返回了一个 promise，Angular 将会中止初始化流程等待该 promise 完成（resolve）。

**app.module.ts**

```ts
import { APP_INITIALIZER } from '@angular/core';
import { AppConfig } from './app.config';

export function initializeApp(appConfig: AppConfig) {
  return () => appConfig.load();
}
@NgModule({
    imports: [ , , , ],
    declarations: [ . . . ],
    providers: [
       AppConfig,
       { provide: APP_INITIALIZER,
         useFactory: initializeApp,
         deps: [AppConfig], multi: true }
    ],
    bootstrap: [
      AppComponent
    ]
})
export class AppModule { }
```

### 在应用中进行具体的配置

现在之前申明的配置设定可以在 Angular 应用中随意使用啦，并且其包含了由接口所提供的类型检查

```ts
export class DataService {
    protected apiServer = AppConfig.settings.apiServer;
    . . .
    if (AppConfig.settings.aad.requireAuth) { . . . }
}
export class LoggingService {
    . . .
    instrumentationKey: AppConfig.settings && AppConfig.settings.appInsights ?
                        AppConfig.settings.appInsights.instrumentationKey : ''
    . . .
    if (AppConfig.settings && AppConfig.settings.logging) { . . . }
}
```

注意： 当使用 prod 以外的环境名称构建应用程序的生产版本时使用以下命令：

```bash
ng build --configuration = deploy
```