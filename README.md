# Figma / MasterGo Plugins

This repository stores Figma and MasterGo plugins in a product-first structure. Each plugin has one product folder, and each platform version lives under that product.

## Structure

```text
plugins/
  plugin-name/
    README.md
    mastergo/
      manifest.json
      code.js
      ui.html
    figma/
      manifest.json
      code.js
      ui.html
```

## Plugins

| Plugin | MasterGo | Figma |
| --- | --- | --- |
| Image Tuner | `plugins/image-tuner/image-tuner-mastergo/manifest.json` | `plugins/image-tuner/image-tuner-figma/manifest.json` |
| Layer Renamer | `plugins/layer-renamer/layer-renamer-mastergo/manifest.json` | - |

## Version Tags

Each platform version uses its own tag prefix:

- `image-tuner-mastergo-v1.1.0`
- `image-tuner-figma-v1.0.0`
- `layer-renamer-mastergo-v1.0.0`

Future plugins should use tags like:

- `plugin-name-platform-v1.0.0`
