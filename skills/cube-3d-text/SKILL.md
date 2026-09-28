---
name: cube-3d-text
description: Create transparent PNG 3D text titles with the Cube 3D Text web app. Use when a user asks for a Minecraft-style 3D text title image.
---

# Cube 3D Text PNG titles

Use a browser tool that can execute JavaScript in the page and capture downloads. If normal page evaluation is read-only, use its DevTools/CDP execution capability. Open `https://3dt.easecation.net/?mode=render` (or the user's deployed mirror). Wait for `window.cube3DText`.

Start from an existing material preset. Gradients: `gradient_red`, `gradient_orange`, `gradient_green`, `gradient_cyan`, `gradient_blue`, `gradient_purple`, `gradient_pink`. Themed textures: `bedrock_preview`, `education`, `snow`, `cherry`, `grass`, `atmosphere`, `winter`, `crystal`, `deepdark`, `cracked`. Call `await window.cube3DText.getCapabilities()` only when you need the current preset colors or font IDs. Make the whole title with one page-context call:

```js
await window.cube3DText.renderTitle({
  version: 1,
  width: 1200,
  height: 600,
  lines: [{ text: "Your title", presetId: "gradient_blue" }]
})
```

The call finishes after rendering and starts a transparent PNG download. Capture the download and inspect the image. Its result also contains a `downloadUrl` usable in the same tab if the browser tool misses the download event. Revise the spec and call again only when needed. Do not click through sliders or use fixed sleep delays.

`lines` accepts 1-6 entries. Each line requires `text`; optional fields are `fontId`, `presetId`, `size`, `depth`, `outlineWidth`, `letterSpacing`, `x`, `y`, `z`, `rotX`, `rotY`, and `rotZ` (rotations in degrees). At the top level, `width`, `height`, and `padding` are optional. Omitted positions use automatic line layout; the camera fits the title to the output. Use only listed or capability-reported preset IDs. Report a clear limitation if the browser tool cannot execute page JavaScript or capture downloads.
