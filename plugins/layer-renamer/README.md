# Layer Renamer

Layer Renamer batch-renames selected design layers with template tokens, numbering, and a live preview before applying changes.

## Versions

| Platform | Import Manifest | Notes |
| --- | --- | --- |
| MasterGo | `plugins/layer-renamer/layer-renamer-mastergo/manifest.json` | First release. Uses MasterGo-compatible host detection and selection access. |

## Features

- Preview selected layer names before changing them.
- Rename multiple selected layers in one action.
- Build names with text blocks plus `{date}`, `{n}`, `{i}`, `{old}`, and `{type}` tokens.
- Build templates from draggable blocks, with click-to-insert tokens and removable blocks.
- Explain which form fields feed each template token.
- Configure numbering start and zero-padding width.
- Choose a date and date format for date-based layer names.
- Open in Chinese by default with an in-panel Chinese/English switch.
- Show useful diagnostics when the host or selection shape differs.

## Version Tags

- `layer-renamer-mastergo-v1.0.0`
