# Angular的 YoutubePlayer 组件

轻松地将 Youtube 视频嵌入到 Angular 应用中

[原文链接](https://dev.to/phenomnominal/the-new-angular-youtube-player-component-2cn6)

[Craig](https://dev.to/phenomnominal)

译者:[尊重](https://www.zhihu.com/people/yiji-yiben-ming/posts)

Angular 世界中出现了一个新的组件，该组件可以帮助你更便捷地将 Youtube 视频添加到你的应用中。只需要执行下述命令即可安装：

```bash
npm i @angular/youtube-player
```

如果你想了解更多细节，还请阅读官方API。

## Angular Youtube Player Component

最近除了 Ivy 之外，对于 Angular 而言最激动人心的改变是 `angular/material` 仓库被重新命名为 `angular/component`。这一重新命名的举措意味着，该仓库不再仅仅包含 [Angular Material](https://material.angular.io/) 的相关内容。
Angular 组件仓库已经包含了 [Angular Component Dev Kit](https://material.angular.io/cdk/categories)，除此之外，该仓库还将作为官方提供的高质量 Angular 组件构筑和分享的基地。
在 Angular Version9 即将发布的时间点，我们有幸一探究竟。
在即将发布的 Angular Component 中，有一个名为 `@angular/youtube-plyaer` 的组件。该组件是对 [embed Youtube player API](https://developers.google.com/youtube/iframe_api_reference)的简单封装。

[online demo](https://stackblitz.com/edit/angular-youtube-player-example)

目前官方文档的内容尚且单薄，所以我们需要深入到代码中，理解其运作方式。

首先，需要引入 `YouTubePlayerModule` 模块：

```
// video.module.ts

import { NgModule } from '@angular/core';
import { YouTubePlayerModule } from '@angular/youtube-player';

import { VideoComponent } from './video.component';

@NgModule({
  imports: [YouTubePlayerModule],
  declarations: [VideoComponent],
  exports: [VideoComponent]
})
export class VideoModule {}
```

借助导入的 `YouTubePlayerModule`，可以使用 `<youtube-player>` 组件。

```typescript
import { Component, OnInit } from '@angular/core';

@Component({
  template: '<youtube-player videoId="dQw4w9WgXcQ"></youtube-player>',
  selector: 'app-video'
})
export class VideoComponent implements OnInit {
  ngOnInit() {
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.body.appendChild(tag);
  }
}
```

平铺直叙。

## Angular Youtube Player API

很不幸，有关 Angular Youtube Player 的详细 API 文档尚未编写；不过我们可以查看[组件的源代码](https://github.com/angular/components/blob/master/src/youtube-player/youtube-player.ts) 获取信息。

> 警告，Youtube Player Component 还处于预发布阶段，API 可能会发生变化。

### inputs

- [videoId]: string - 需要渲染的 Youtube Video ID。在 Youtube URL 的最后有一串哈希码，比如，你的视频地址为 [https://www.youtube.com/watch?v=moSFlvxnbgk](https://www.youtube.com/watch?v=moSFlvxnbgk)，那么 videoID 就是 moSFlvxnbgk。
- [height]: number - 视频播放器的高度
- [width]: number - 视频播放器的宽度
- [startSeconds]: number - 视频播放器的起始播放时间
- [endSeconds]: number - 视频播放器的终止播放时间
- [suggestedQuality]: SuggestedQuality - 播放器的[推荐质量](https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/youtube/index.d.ts#L409)。参数可以为 `default` , `small`, `medium`, `large`, `hd720`, `hd1080`, 和 `highres`。
- [showBeforeIframeApiLoads]: boolean - 不管页面的 API 状态是否正常，是否尝试加载 Iframe。如果你不想在global window 上设置 `onYouTubeIframeAPIReady` 字段，请将 `showBeforeIframeApiLoads` 设置为true。

### Outputs:

每一个 Output 都与 [events fired from the YouTube JS API](https://developers.google.com/youtube/iframe_api_reference#Events) 相匹配。

- (ready): PlayerEvent - 当播放器完成加载并且准备开始接受 API 调用时触发。
- (stateChange): OnStateChangeEvent - 当播放器状态变化时触发。
- (error): OnErrorEvent - 播放器发生错误后触发。
- (apiChange): PlayerEvent - 触发则表示播放器已经加载(或卸载)了带有暴露 API 方法的模块
- (playbackQualityChange): OnPlaybackQualityChangeEvent - 当视频回放质量发生变化时触发
- (playbackRateChange): OnPlaybackRateChangeEvent - 当视频回放比率发生变化时触发

下述代码段，”略微“详尽地描述了如何使用 `<youtube-player>` 渲染和播放视频：

```html
<!--video.component.html-->
<youtube-player
  videoId="dQw4w9WgXcQ"
  suggestedQuality="highres"
  [height]="600"
  [width]="1080"
  [startSeconds]="43"
  [endSeconds]="60">
</youtube-player>
```

## The end! 📼 🎈

很高兴可以看到来自于 Angular 官方团队的新组件。`Youtube Player Component` 提供了清晰的 API 和 常见的用例。相信广大开发者都对如何使用 `Youtube Player Component` 有了初步的了解。

欢迎在 [Angular Components Official Repository](https://github.com/angular/components/) 提出你的建议和发现的问题。
