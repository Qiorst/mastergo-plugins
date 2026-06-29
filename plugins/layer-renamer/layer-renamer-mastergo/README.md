# Layer Renamer for MasterGo

MasterGo plugin for batch renaming selected layers with a preview-first template workflow.

## Features

- Read the current MasterGo selection.
- Preview generated names before applying.
- Rename multiple selected layers in one action.
- Support `{date}`, `{n}`, `{i}`, `{old}`, and `{type}` template tokens.
- Build the template with draggable blocks instead of editing token syntax by hand.
- Delete template blocks with the corner remove button and drag blocks to reorder them.
- Show how template tokens map to form fields and insert tokens by clicking them.
- Configure start number and zero-padding width.
- Choose a date and date format for the `{date}` token.
- Open in Chinese by default and switch between Chinese and English in the panel.
- Report host diagnostics, selection count, renameable count, and failed rename items.

## Files

```text
layer-renamer/layer-renamer-mastergo/
  manifest.json
  code.js
  ui.html
  icon.svg
  README.md
```

## How to test

1. Import `plugins/layer-renamer/layer-renamer-mastergo/manifest.json` in MasterGo plugin manager.
2. Select multiple layers in a document.
3. Run Layer Renamer.
4. Confirm the panel shows the selected layer count and a rename preview.
5. Add a text block such as `Button`, then add `{n}`.
6. Click Apply Names and confirm the selected layers are renamed.
7. Test empty selection and unsupported selection states to confirm a clear status message is shown.

## Template tokens

| Token | Meaning | Example |
| --- | --- | --- |
| `{n}` | Number with zero padding | `01` |
| `{i}` | Plain 1-based index | `1` |
| `{old}` | Original layer name | `Rectangle 1` |
| `{type}` | Host-reported layer type | `FRAME` |
| `{date}` | Selected date using the chosen date format | `2025-06-10` |

## Notes

- This folder is the MasterGo version. There is no Figma build in this first release.
- The plugin tries `mg`, then `mastergo`, then `figma` as the host object for MasterGo compatibility.
- Selection access checks `host.document.currentPage.selection`, `host.currentPage.selection`, `host.selection`, and `host.getSelection()`.
- Duplicate generated names are allowed, but the UI warns before applying.
- Version tag: `layer-renamer-mastergo-v1.0.0`.
