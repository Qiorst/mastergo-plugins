# Image Tuner for Figma

Figma-native version of the Image Tuner plugin.

## Files

```text
image-tuner-figma/
  manifest.json
  code.js
  ui.html
  icon.svg
  ai-proxy.js
  README.md
```

## How to install in Figma

1. Open Figma.
2. Go to `Plugins` > `Development` > `Import plugin from manifest...`.
3. Choose `plugins/image-tuner-figma/manifest.json`.
4. Select a layer with an image fill.
5. Run `Image Tuner` from `Plugins` > `Development`.

## Publishing

For Figma Community submission, use the files in this folder and import `plugins/image-tuner-figma/manifest.json`. Do not use the MasterGo manifest for Figma.

## Notes

- This version only targets Figma and uses `figma.currentPage.selection`, `figma.getImageByHash`, `figma.createImage`, and `paint.imageHash`.
- The original MasterGo version is stored separately in `plugins/image-tuner-mastergo`.
- AI matching should use the included local proxy:

```bash
node plugins/image-tuner-figma/ai-proxy.js
```
