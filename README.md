# Image Tuner

MasterGo image color tuning plugin prototype.

## V1 features

- Read one selected layer
- Prefer original image fill bytes when the host API exposes them
- Fall back to exporting the selected layer as PNG when image bytes are not exposed
- Preview in the plugin panel
- Adjust brightness, contrast, saturation, and hue
- Reset sliders
- Apply the tuned PNG back to the selected layer as an image fill

## Files

```text
mastergo-image-tuner/
  manifest.json
  code.js
  ui.html
  README.md
```

## How to test

1. Re-import or refresh `manifest.json` in MasterGo plugin manager.
2. Select one image layer, or a layer that can be exported as a visible PNG.
3. Run Image Tuner.
4. Adjust sliders in the panel.
5. Click Apply.

## Notes

- The plugin tries `mg`, then `mastergo`, then `figma` as the host object.
- If direct image fill reading fails, it uses `node.exportAsync({ format: "PNG" })` as a fallback.
- In fallback mode, applying the result replaces/sets the selected layer fill with the tuned PNG preview.
- If MasterGo reports that `exportAsync`, `getImageByHash`, or `createImage` is unavailable, paste the console error so the plugin can be adapted to the exact MasterGo API version.
