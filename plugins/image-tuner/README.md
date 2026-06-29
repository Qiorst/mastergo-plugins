# Image Tuner

Image Tuner adjusts selected image layers with Camera Raw style controls for light, color, color grading, and effects. The plugin has separate platform builds because Figma and MasterGo use different image APIs.

## Versions

| Platform | Import Manifest | Notes |
| --- | --- | --- |
| MasterGo | `plugins/image-tuner/mastergo/manifest.json` | Uses the MasterGo-oriented runtime and compatibility helpers. |
| Figma | `plugins/image-tuner/figma/manifest.json` | Uses Figma-native `imageHash` APIs. |

## Features

- Preview selected image layers.
- Adjust Light, Color, Color Grading, and Effects parameters.
- Apply tuned images back to the selected layer.
- Preserve original image source for reset.
- Reset parameters and restore the original image.
- Detect external image source changes and reset parameters automatically.
- Optionally generate tuning parameters from a reference image through a local AI proxy.

## Version Tags

- `image-tuner-mastergo-v1.1.0`
- `image-tuner-figma-v1.0.0`
