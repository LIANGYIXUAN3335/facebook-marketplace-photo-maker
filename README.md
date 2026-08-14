# Facebook Marketplace Photo Maker

本地批量生成 Facebook Marketplace 商品图的小工具。

## 功能

- 拖拽或选择多张商品照片
- 给每张照片填写标题、单个价、满 N 个后的单价、描述标签
- 自动生成 1080 x 1080 方形 Marketplace 风格图片
- 右上角自动生成醒目的促销价格标签
- 支持白色、暖色、深色、清爽蓝四种模板
- 支持批量下载 ZIP
- 所有处理都在浏览器本地完成，照片不会上传

## 使用方法

直接双击打开：

```text
index.html
```

或者在浏览器打开这个文件。

## 推荐流程

1. 上传商品照片。
2. 填写默认城市、默认标签、价格前缀、默认满几个和默认批量价。
3. 给每张照片填标题、单个价、满几个、批量单价。
4. 点击 `Generate previews` 生成预览。
5. 点击 `Download ZIP` 下载所有成品图。
6. 在 Facebook Marketplace 发帖时上传这些图片。

## 注意

这个工具只负责生成图片，不会自动发布 Facebook Marketplace listing。自动发布可能违反平台规则，也容易触发风控。
