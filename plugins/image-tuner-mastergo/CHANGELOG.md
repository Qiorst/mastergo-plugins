# Changelog

## v1.1.0 - 2026-06-26

### Added

- Add AI reference-image color matching powered by a user-provided OpenAI API key.
- Add API key input, optional local key remembering, and saved-key clearing.
- Add editable Base URL support for OpenAI-compatible API endpoints.
- Add editable local AI proxy URL for environments where MasterGo blocks plugin network APIs.
- Add editable AI model input so users can choose a model available to their API key.
- Add OpenCode JSON config import to detect `baseURL`, `apiKey`, and model IDs automatically.
- Add reference image upload for extracting a target color style.
- Add structured AI parameter generation for existing Light, Color, Color Grading, and Effects controls.

### Changed

- Apply AI-generated values through the existing realtime preview and auto-apply flow so users can keep manually fine-tuning.
- Downsample target and reference images before AI analysis to keep requests lighter.
- Route AI requests through the plugin main thread instead of the UI iframe to avoid direct UI `fetch` failures on compatible endpoints.
- Add `XMLHttpRequest` fallback for plugin runtimes that do not expose `fetch`.
- Automatically retry OpenAI-compatible `/chat/completions` when `/responses` is not supported.
- Prefer the local AI proxy from the UI before falling back to plugin-main requests.

### Development log

- Planned a bring-your-own-key workflow so the plugin does not ship or commit any secret key.
- Added a dedicated AI panel above the manual tuning controls.
- Added local-only optional API key persistence with a clear-key action.
- Added OpenAI-compatible Base URL configuration.
- Added OpenCode config JSON parsing for provider options and models.
- Added reference image upload and client-side preview-size conversion.
- Added structured JSON output validation and slider-range clamping before applying AI suggestions.
- Connected AI-generated parameters to the existing non-destructive tuning pipeline.
- Moved AI network requests out of the UI layer after plugin testing showed direct UI requests can fail before receiving a response.
- Added request fallbacks after plugin testing showed the MasterGo main runtime may not provide `fetch`.
- Added `ai-proxy.js` after testing showed the MasterGo runtime may provide neither `fetch` nor `XMLHttpRequest`.

## v1.0.1 - 2026-06-26

### Fixed

- Replace contenteditable slider values with native number inputs after plugin testing showed value entry was unreliable.

## v1.0.0 - 2026-06-26

First stable release. Earlier public tags were test releases and have been renamed to `v0.1.0` and `v0.2.0`.

### Added

- Add Camera Raw style Color Grading with Shadows, Midtones, and Highlights color wheels.
- Add per-zone color grading luminance controls plus global Blending and Balance controls.
- Add per-parameter reset buttons for every adjustable slider.
- Add per-wheel reset buttons for color grading Hue and Saturation.
- Add direct numeric editing for every slider value.
- Add a fixed top preview window and fixed bottom global Reset bar.

### Changed

- Replace the CSS color wheel approximation with canvas-rendered HSV color wheels.
- Rework Color Grading layout into vertically stacked rows with larger wheels and aligned luminance controls.
- Remove the manual Apply button and rely on realtime auto-apply.
- Expand the plugin window height for the larger editing surface.
- Hide the side scrollbar while preserving parameter panel scrolling.

### Fixed

- Prevent stale auto-apply responses from rolling edited values back.
- Improve preview responsiveness by rendering a lower-resolution preview while keeping full-resolution export for MasterGo.
- Make the fixed preview background fully opaque so controls do not show through.
- Move status helper text away from the selected-layer status card.

### Development log

- Planned Color Grading after reviewing Camera Raw's Shadows, Midtones, Highlights, Blending, and Balance model.
- Implemented Color Grading parameters, persistence, and reset compatibility.
- Added three color wheels for Shadows, Midtones, and Highlights.
- Replaced the first CSS-gradient wheel with a canvas-rendered HSV wheel after visual review showed incorrect color distribution.
- Changed Color Grading layout from three horizontal wheels to vertically stacked rows with larger wheels and aligned luminance sliders.
- Added individual reset buttons for every adjustable slider.
- Added individual reset buttons for each Color Grading wheel's Hue and Saturation.
- Added direct numeric editing by clicking each displayed slider value.
- Investigated preview lag and value rollback during fast edits.
- Added edit-version guarding so stale auto-apply responses cannot overwrite newer local values.
- Split preview rendering and export rendering so preview uses a smaller canvas while export keeps full image size.
- Fixed the preview panel at the top of the plugin window.
- Made the preview panel fully opaque so parameter text cannot show through transparent areas.
- Fixed the global Reset control at the bottom of the plugin window.
- Removed the manual Apply button because realtime auto-apply is now the primary workflow.
- Expanded the plugin window height to make room for the fixed preview and dense controls.
- Hid the side scrollbar while preserving scrollable controls.
- Moved status helper text out of the selected-layer card and into the footer/debug status area.

## v0.2.0 - 2026-06-26

Test release.

### Added

- Add Camera Raw style Light controls: Exposure, Contrast, Highlights, Shadows, Whites, Blacks.
- Add Color controls: Temperature, Tint, Vibrance, Saturation, Hue.
- Add Effects controls: Grain and Vignette.
- Add Chinese/English UI language toggle.
- Add realtime layer updates while dragging sliders.

### Changed

- Expand the saved parameter schema while preserving migration from old Brightness values to Exposure.
- Keep the Apply button as an immediate manual apply action alongside realtime updates.
- Use a debounce and queue so dragging sliders updates the layer without flooding MasterGo with writes.

### Fixed

- Cancel pending auto-apply work before restoring the original image with Reset.
- Preserve the non-destructive original-image baseline, external image source change detection, and Reset-to-original behavior.

## v0.1.0

Test release.

- Select one MasterGo image layer.
- Preview the selected image in the plugin panel.
- Adjust brightness, contrast, saturation, and hue.
- Apply the adjusted image back to the selected layer.
- Preserve original image source for non-destructive reset.
- Reset restores the original image and clears adjustment parameters.
- Detect external image source changes and reset parameters automatically.
