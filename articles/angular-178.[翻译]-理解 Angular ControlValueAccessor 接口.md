# 理解 Angular 中的 ControlValueAccessor 接口

[原文链接](https://dev.to/bitovi/understanding-angular-s-control-value-accessor-interface-5e7k)

[原作者:Jennifer Wadella](https://dev.to/likeomgitsfeday)

译者:[尊重](https://www.zhihu.com/people/yiji-yiben-ming/posts)

如果你经常使用 `Angular form` 进行表单内容处理，了解并学会 `ControlValueAccessor` `接口的使用技巧会对你大有裨益。ControlValueAccesor` 接口是 DOM 元素与 `FormControl` 之间的桥梁。拓展了 `ControlValueAccessor` 接口的组件可以创建属于自己的自定义 `FormControl`，这些自定义的 `FromControl` 拥有与常规的 input/radio button 同样的行为表现(内部实现一致)。

## 为什么需要使用 ControlValueAccessor

有时，你可能需要创建自定义的表单元素，并将其作为常规的 `FormControl` 使用。如果你尚不了解 `Angular FormControl` 及其他 `Angular Form` 类，可以阅读我的[另一篇文章](https://dev.to/angular/managing-nested-and-dynamic-forms-in-angular-1he6)。

比如，你想创建一个 5星评级的 UI，更新模型中的一个变量。下面我们就将使用这样的例子作为demo。

![demoGif](../assets/angular-178/1.gif)

上面的功能展示图中包含了许多内容 - 悬浮于星星上时其颜色发生了改变，并且对不同的评分会展示不同的文本信息，而我们关注的是背后的 rating value 的变化。

## 实现 ControlValueAccseeor

在一个组件中拓展 `ControlValueAccessor` 接口需要实现三个方法：`writeValue`,`registerOnChange` 和 `registerOnTouched`。除此之外，还有一个名为 `setDisabledState` 的方法可选实现。

`writeValue` 函数在以下两种场景下被调用：

- `formControl` 被初始化时

```typescript
rating = new FormControl({value: null, disabled: false}) 
```

- `formControl` 的值发生变化时：

```
rating.patchValue(3)
```

每当值发生变化时，`registerOnChange` 方法都会被触发。在我们的示例中，当星星被点击时，`registerOnChange` 函数就会被触发。

每当 UI 的部分发生交互时（比如 blur 事件）,`registerOnChange` 函数都会被调用。如果你曾经使用过 `BootStrap` 或者 `NGX-Bootstrap` 的话，比较熟悉 `onBlur` 方法的你此时会有一些既视感。

`setDisabledState` 方法在以下两种场景下被调用：

- 当 `formControl` 初始化时使用了 disabled 的属性

```typescript
rating = new FormControl({value: null, disabled: false}) 
```

- 当 `formControl` 的 disabled 状态发生了变化

```typescript
rating.disable();
rating.enable();
```

对示例的评分组件实现 `ControlValueAccessor` 代码如下所示：

```typescript
export class StarRaterComponent implements ControlValueAccessor {
  public ratings = [
    {
      stars: 1,
      text: 'must GTFO ASAP'
    },
    {
      stars: 2,
      text: 'meh'
    },
    {
      stars: 3,
      text: 'it\'s ok'
    },
    {
      stars: 4,
      text: 'I\'d be sad if a black hole ate it'
    },
    {
      stars: 5,
      text: '10/10 would write review on Amazon'
    }
  ]
  public disabled: boolean;
  public ratingText: string;
  public _value: number;

  onChanged: any = () => {}
  onTouched: any = () => {}

  writeValue(val) {
    this._value = val;
  }

  registerOnChange(fn: any){
    this.onChanged = fn
  }
  registerOnTouched(fn: any){
    this.onTouched = fn
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  setRating(star: any) {
    if(!this.disabled) {
      this._value = star.stars;
      this.ratingText = star.text
      this.onChanged(star.stars);
      this.onTouched();
    }
  }

}
```

在此之后，你必须告诉 Angular 组件实现的 `ControlValueAccessor` 是一个使用 `NG_VALUE_ACCESSOR` 和 `forwardRef` 的 `value accessor`**（注意接口不会被 Typescript 编译)**。

```typescript
import { Component, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'gr-star-rater',
  templateUrl: './star-rater.component.html',
  styleUrls: ['./star-rater.component.less'],
  providers: [     
    {
      provide: NG_VALUE_ACCESSOR, 
      useExisting: forwardRef(() => StarRaterComponent),
      multi: true     
    }   
  ]
})
export class StarRaterComponent implements ControlValueAccessor {
...
```

## 使用新建的 ControlValueAccessor 组件

现在，就可以像使用常规的 FormControl 一样使用新的 `ControlValueAccessor` 组件了。

```typescript
this.galaxyForm = new FormGroup({
  rating: new FormControl({value: null, disabled: true})
});
```

```html
<form [formGroup]="galaxyForm" (ngSubmit)="onSubmit()">
  <h1>Galaxy Rating App</h1>
  <div class="form-group">
    <label>
      Rating:
      <gr-star-rater formControlName="rating"></gr-star-rater>
    </label>
  </div>
  <div class="form-group">
    <button type="submit">Submit</button>
  </div>
</form>
```

其实 ControlValueAccessor 并不复杂，希望你可以从本文中获得些许知识。
