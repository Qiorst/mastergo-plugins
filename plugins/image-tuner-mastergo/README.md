# Image Tuner for MasterGo

MasterGo image color tuning plugin.

## Features

- Read one selected image layer.
- Prefer original image fill bytes when the host API exposes them.
- Fall back to exporting the selected layer as PNG when image bytes are not exposed.
- Keep a fixed top preview while tuning.
- Adjust Light, Color, Color Grading, and Effects parameters.
- Use Camera Raw style Shadows, Midtones, and Highlights color grading wheels.
- Directly type numeric slider values.
- Reset individual parameters or restore the original image globally.
- Auto-apply tuned PNG output back to the selected layer.
- Generate tuning parameters from a reference image with a user-provided OpenAI API key, editable Base URL, and editable model name.
- Import OpenCode-style JSON config to fill API key, Base URL, and model automatically.
- Use a local AI proxy when the MasterGo plugin runtime cannot make network requests directly.

## Files

```text
image-tuner-mastergo/
  manifest.json
  code.js
  ui.html
  icon.svg
  ai-proxy.js
  README.md
```

## How to test

1. Re-import or refresh `manifest.json` in MasterGo plugin manager.
2. Select one image layer, or a layer that can be exported as a visible PNG.
3. Run Image Tuner.
4. Adjust sliders in the panel and watch the fixed preview.
5. Start the local AI proxy before using AI reference matching:

```bash
node plugins/image-tuner-mastergo/ai-proxy.js
```

6. To use AI reference matching, enter an OpenAI API key, keep or change the Base URL, Proxy URL, and model name, choose a reference image, and click Generate AI look.
7. Alternatively, paste an OpenCode JSON config into the OpenCode field and click Import config.
8. Continue fine-tuning manually or click Reset to restore the original image.

## Notes

- This folder is the MasterGo version. Use `plugins/image-tuner-figma` for the Figma version.
- The plugin tries `mg`, then `mastergo`, then `figma` as the host object.
- If direct image fill reading fails, it uses `node.exportAsync({ format: "PNG" })` as a fallback.
- In fallback mode, applying the result replaces/sets the selected layer fill with the tuned PNG preview.
- If MasterGo reports that `exportAsync`, `getImageByHash`, or `createImage` is unavailable, paste the console error so the plugin can be adapted to the exact MasterGo API version.
- OpenAI API keys are not included in this repository. The AI panel only uses a key entered by the current user, and local remembering is opt-in.
- The local proxy listens on `http://127.0.0.1:8787/v1/ai-match` by default and adds local CORS headers for the plugin UI.
