---
name: cube-3d-text
description: Cube 3D Text の Web アプリで、透明背景の 3D テキスト PNG タイトル画像を作成します。Minecraft 風の立体文字タイトルに使用します。
---

# Cube 3D Text PNG タイトル

ページ内で JavaScript を実行し、ダウンロードを受け取れるブラウザーツールを使用します。通常のページ評価が読み取り専用なら、DevTools/CDP の実行機能を使います。`https://3dt.easecation.net/?mode=render`（またはユーザーが指定したミラー）を開き、`window.cube3DText` が使えるまで待ちます。

既存のマテリアルプリセットから選びます。グラデーション：`gradient_red`、`gradient_orange`、`gradient_green`、`gradient_cyan`、`gradient_blue`、`gradient_purple`、`gradient_pink`。テーマ別テクスチャ：`bedrock_preview`、`education`、`snow`、`cherry`、`grass`、`atmosphere`、`winter`、`crystal`、`deepdark`、`cracked`。現在の配色やフォント ID が必要な場合だけ `await window.cube3DText.getCapabilities()` を呼び出します。次に、ページ内でタイトル全体を一度に送信します。

```js
await window.cube3DText.renderTitle({
  version: 1,
  width: 1200,
  height: 600,
  lines: [{ text: "タイトル", presetId: "gradient_blue" }]
})
```

レンダリング完了後、透明 PNG のダウンロードが始まります。ファイルを受け取って画像を確認します。ブラウザーツールがダウンロードを検出できない場合は、返された `downloadUrl` を同じタブ内で使用できます。調整が必要な場合だけデータを変更して再実行します。スライダーを順番に操作したり、固定時間の待機で読み込みを推測したりしないでください。

`lines` は 1～6 行で、各行の `text` は必須です。`fontId`、`presetId`、`size`、`depth`、`outlineWidth`、`letterSpacing`、`x`、`y`、`z`、`rotX`、`rotY`、`rotZ`（回転は度単位）は省略できます。最上位の `width`、`height`、`padding` も省略できます。位置を省略すると行が自動配置され、カメラは画面に合わせて調整されます。上記または能力照会で返されたプリセット ID だけを使用してください。ブラウザーツールがページ内 JavaScript の実行やダウンロードの取得に対応しない場合は、その制限をユーザーに伝えてください。
