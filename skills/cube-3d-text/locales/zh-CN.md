---
name: cube-3d-text
description: 使用 Cube 3D Text 网页制作透明背景的 3D 文字 PNG 标题图。适用于 Minecraft 风格立体文字标题。
---

# Cube 3D Text PNG 标题图

使用能在网页中执行 JavaScript 并接收下载文件的浏览器工具；若普通页面求值只读，改用该工具的 DevTools/CDP 执行入口。打开 `https://3dt.easecation.net/?mode=render`（或用户提供的部署镜像），等待 `window.cube3DText` 出现。

从现有材质预设出发。渐变色：`gradient_red`、`gradient_orange`、`gradient_green`、`gradient_cyan`、`gradient_blue`、`gradient_purple`、`gradient_pink`。主题贴图：`bedrock_preview`、`education`、`snow`、`cherry`、`grass`、`atmosphere`、`winter`、`crystal`、`deepdark`、`cracked`。需要查看实时预设颜色或字体 ID 时，再调用 `await window.cube3DText.getCapabilities()`。随后在页面上下文中一次提交整张标题图：

```js
await window.cube3DText.renderTitle({
  version: 1,
  width: 1200,
  height: 600,
  lines: [{ text: "我的世界", presetId: "gradient_blue" }]
})
```

调用会等待渲染完成并触发透明 PNG 下载。接收文件、查看图片；若浏览器工具未捕获下载事件，可使用返回结果中的 `downloadUrl` 在同一标签页获取图片。仅在需要调整时修改数据再调用。不要逐个点击滑块，也不要用固定延时猜测加载是否完成。

`lines` 支持 1-6 行，每行必填 `text`；可选 `fontId`、`presetId`、`size`、`depth`、`outlineWidth`、`letterSpacing`、`x`、`y`、`z`、`rotX`、`rotY`、`rotZ`（旋转单位为度）。顶层可选 `width`、`height`、`padding`。省略坐标时自动排列文字，镜头自动适配画幅。只使用上列或能力查询返回的预设 ID。若浏览器工具无法执行页面 JavaScript 或接收下载，应明确告知用户这一限制。
