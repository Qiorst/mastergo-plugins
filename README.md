# Figma / MasterGo Plugins

This repository stores Figma and MasterGo plugins in separate folders. Platform-specific versions live side by side so each editor can import its own `manifest.json`.

## Plugins

### Image Tuner

MasterGo version:

`plugins/image-tuner-mastergo/manifest.json`

Figma version:

`plugins/image-tuner-figma/manifest.json`

Features:

- Preview selected image layers.
- Adjust Light, Color, Color Grading, and Effects parameters.
- Apply tuned images back to the selected layer.
- Preserve original image source for reset.
- Reset parameters and restore the original image.
- Detect external image source changes and reset parameters automatically.
- Optionally generate tuning parameters from a reference image through a local AI proxy.

## Version Tags

Each platform version uses its own tag prefix:

- `image-tuner-mastergo-v1.1.0`
- `image-tuner-figma-v1.0.0`

Future plugins should use tags like:

- `plugin-name-platform-v1.0.0`
