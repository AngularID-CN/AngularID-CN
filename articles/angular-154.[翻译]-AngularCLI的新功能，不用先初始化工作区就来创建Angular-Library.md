# [翻译] Angular Libary 系列之 Angular CLI的新功能，不用先初始化工作区就来创建Angular Library

> 原文链接：[Angular Workspace: No Application for You!](https://blog.angularindepth.com/angular-workspace-no-application-for-you-4b451afcc2ba)

> 原文作者：[Todd Palmer](https://blog.angularindepth.com/@palmer_todd?source=post_header_lockup)
> 
> 译者：[秋天](https://github.com/jkhhuse)；校对者：[尊重](https://github.com/sawyerbutton)
>
> 译者按：本文使用 库 指代 Angular Library 的概念。

> 用法及为什么使用 Angular CLI 提供的 -- createApplication 选项在不创建默认应用的前提下创建一个 angular 工作区（**workspace**）。

<p align="center"> 
    <img src="../assets/angular-154/1.jpeg">
</p>

> 赫尔辛基，芬兰新的中央图书馆 - Oodi

Angular CLI 7.0.0 中增加了一个非常好的选项：`--createApplication`。在本文中，我们将讨论如何以及何时使用这个新特性。它在创建 Angular 库的时候非常有用。

## 在 --createApplication 诞生之前的故事

到目前为止，你可能已经使用 Angular CLI 创建了一些甚至许多 Angular 应用程序。通常我们会使用如下命令：

```bash
ng new foo
```

当我们执行这个命令时，Angular CLI 创建了初始化的程序，即我们熟知的 Angular 工作区的 `src/app` 目录。

<p align="center"> 
    <img src="../assets/angular-154/2.png?raw=true">
</p>

通常情况下，这样的工程结构就是我们所想要的那样。然而，这个初始化的应用程序会在我们想要生成 Angular 库时，产生一些问题。

你可能还记得我之前写的文章 [Creating a Library with Angular CLI](https://blog.angularindepth.com/creating-a-library-in-angular-6-87799552e7e5) 介绍了创建一个工作区并随后重命名工作区的方式。我们这样做，是为了保证我们生成的应用不会与我们的库之间产生重名冲突。不过，这里有个好消息，我们在 Angular 7.0 不用再使用这个令人费解的策略来生成库了。

## 使用 --createApplication

这个 `--createAplication` 选项与 `ng new` 结合一起使用，设置它为 **false** 时，它会告诉 `ng new` 命令不要在工作区内创建初始化的 Angular 应用。默认情况下，这个选项被设置为 **true** 以便于之前 Angular CLI 旧版本的行为保持一致。

下面是[官方文档](https://angular.cn/cli/new)中的介绍：

<p align="center"> 
    <img src="../assets/angular-154/3.png?raw=true">
</p>

为了创建一个不包含初始化应用的 Angular 工作区，我们使用下面方法：

```bash
ng new foo --createApplication=false
```

使用这个命令创建的 Angular 工作区，对比之前，工作区中的文件少了很多，尽管这个工作区显得很“空”，它仍然包含有一些重要的配置信息：

- package.json 

包含了所有 Angular 所需的所有常见依赖

- angular.json

不包含 **projects** 配置项的 Angular 配置文件

- README.md, tsconfig.json, tslint.json 以及 node_modules 文件都与以前保持一致。

<p align="center"> 
    <img src="../assets/angular-154/4.gif?raw=true">
</p>

你可能会注意到，这里没有 **src** 文件夹，之后 **projects** 文件夹将会在生成库项目或者测试应用项目时被添加。

自从我们设置 `--createApplication` 选项为 **false** 后，我们的工程就不是一个初始化的应用。因此，如果你试着去运行一些命令，例如：`ng build` 或者 `ng serve` 时，我们会看到下面错误：`Could not determine a single project for the ‘build’ target`。

## 何时使用它？

这是一个好问题，毕竟 Angular CLI 创建的初始应用是开始一个工程开发的很好起点。我是指，它甚至还包含有单元测试等内容！

使用 `--createApplication=false` 的一个重要原因是我们能够使用 `ng generate` 来创建一个 Angualr 库。

例如，通常在创建 Angular 库时，需要以下内容：：

- 你的工程目录下有一个 Angular 库。
- 一个与库重名的 Angular 工作区。
- 一个用来作为 Angular 库的示例的测试应用

就像我文章开头提到的那样：以前使用我们库的名称创建工作区时，会导致初始应用程序被使用相同的名称创建。这阻止了我们的 Angular 库使用该名称，这是我们首先创建工作区的主要原因。

## 示例

让我们创建一个符合上述标准的 Angular 工作区，首先假设我们需要创建一个名称为 foo-lib 的 Angular 库。

## 工作区

首先创建一个 Angular 工作区，这个工作区与我们的库名称保持一致。记得使用 `--createApplication=false` 选项：

```bash
ng new foo-lib --createApplication=false
```

当你被询问 `router` 或者 `css` 等选择时，选择默认即可。

## 库项目

现在，我们有了 Angular 工作区，我们可以添加库项目到工作区之中。如果你阅读了之前的文章，你应该记得添加前缀的建议：

```bash
cd foo-lib
ng generate library foo-lib --prefix=foo
```

这个命令添加了一个 **project** 目录，并包含有一个 **foo-lib** 子目录，它就是我们新生成的 **foo-lib** Angluar 库。

## 测试应用项目

最后，我们希望建立一个测试应用项目，能够调用我们建立的 Angluar 库。我们使用这个项目来做库的测试或者文档等工作。

```bash
ng generate application foo-tester
```

这条命令，在 **project** 文件夹下添加了 **foo-tester** 目录。此外，Angluar CLI 还添加了一个 **foo-tester-e2e** 项目来用做 e2e 测试。

## 构建、运行及测试

现在，我们已经有了一个工程，我们可以使用 Angular CLI 来构建、运行和测试。

你将希望始终指定一个目标项目。

### 构建

使用下面的命令来构建 `foo-lib` 库：

```bash
ng build foo-lib
```

注意，从 v6.1 起，Angluar CLI 始终在生产模式下构建库，所以我们不需要额外指定 `--prod` 选项。

与构建库克不同，我们构建一个应用，需要使用 `--prod` 选项：

```bash
ng build foo-tester --prod
```

### 运行

我们无法直接运行一个库项目，但是我们可以运行我们创建的测试应用项目：

```bash
ng serve foo-tester
```

### 测试

我们能够为我们创建的 Angular 库项目和测试应用项目运行单元测试.

库项目运行单元测试：

```bash
ng test foo-lib
```

测试应用项目运行单元测试：

```bash
ng test foo-tester
```

## 资源

关于 `ng new` 命令的文档： [https://angular.cn/cli/new](https://angular.cn/cli/new)

更多关于 Angular 创建库的文章可以查看：

[The Angular Library Series — Creating a Library with the Angular CLI](https://blog.angularindepth.com/creating-a-library-in-angular-6-87799552e7e5)

[The Angular Library Series — Building and Packaging](https://blog.angularindepth.com/creating-a-library-in-angular-6-part-2-6e2bc1e14121)

[The Angular Library Series — Publishing](https://blog.angularindepth.com/the-angular-library-series-publishing-ce24bb673275)