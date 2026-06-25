var host = typeof mg !== "undefined" ? mg : typeof mastergo !== "undefined" ? mastergo : typeof figma !== "undefined" ? figma : null;

if (!host) {
  throw new Error("Plugin host API was not found. Expected mg, mastergo, or figma.");
}

host.showUI(__html__, { width: 380, height: 620 });

function postToUi(message) {
  if (host.ui && typeof host.ui.postMessage === "function") {
    host.ui.postMessage(message, "*");
    return true;
  }
  return false;
}

function getHostName() {
  if (typeof mg !== "undefined") return "mg";
  if (typeof mastergo !== "undefined") return "mastergo";
  if (typeof figma !== "undefined") return "figma";
  return "unknown";
}

function describeNode(node) {
  if (!node) return "node=null";
  var fills = Array.isArray(node.fills) ? node.fills.length : "n/a";
  var backgrounds = Array.isArray(node.backgrounds) ? node.backgrounds.length : "n/a";
  return "name=" + (node.name || "Untitled") + ", type=" + (node.type || "unknown") + ", fills=" + fills + ", backgrounds=" + backgrounds + ", exportAsync=" + (typeof node.exportAsync === "function");
}

function describeSelectionApis() {
  return "hasDocument=" + Boolean(host.document) +
    ", hasDocumentCurrentPage=" + Boolean(host.document && host.document.currentPage) +
    ", hasCurrentPage=" + Boolean(host.currentPage) +
    ", hasHostGetSelection=" + (typeof host.getSelection === "function");
}

var PARAMS_KEY = "image-tuner-params-v1";
var ORIGINAL_IMAGE_REF_KEY = "image-tuner-original-image-ref-v1";
var APPLIED_IMAGE_REF_KEY = "image-tuner-applied-image-ref-v1";

function getDefaultParams() {
  return { brightness: 0, contrast: 0, saturation: 0, hue: 0 };
}

function readSavedParams(node) {
  if (!node || typeof node.getPluginData !== "function") return getDefaultParams();

  try {
    var raw = node.getPluginData(PARAMS_KEY);
    if (!raw) return getDefaultParams();
    var parsed = JSON.parse(raw);
    return {
      brightness: Number(parsed.brightness) || 0,
      contrast: Number(parsed.contrast) || 0,
      saturation: Number(parsed.saturation) || 0,
      hue: Number(parsed.hue) || 0
    };
  } catch (error) {
    return getDefaultParams();
  }
}

function saveParams(node, params) {
  if (!node || typeof node.setPluginData !== "function") return false;

  var nextParams = {
    brightness: Number(params && params.brightness) || 0,
    contrast: Number(params && params.contrast) || 0,
    saturation: Number(params && params.saturation) || 0,
    hue: Number(params && params.hue) || 0
  };

  node.setPluginData(PARAMS_KEY, JSON.stringify(nextParams));
  return true;
}

function readOriginalImageRef(node) {
  if (!node || typeof node.getPluginData !== "function") return "";

  try {
    return node.getPluginData(ORIGINAL_IMAGE_REF_KEY) || "";
  } catch (error) {
    return "";
  }
}

function readAppliedImageRef(node) {
  if (!node || typeof node.getPluginData !== "function") return "";

  try {
    return node.getPluginData(APPLIED_IMAGE_REF_KEY) || "";
  } catch (error) {
    return "";
  }
}

function saveOriginalImageRefIfNeeded(node, imageRef) {
  if (!node || !imageRef || typeof node.getPluginData !== "function" || typeof node.setPluginData !== "function") {
    return false;
  }

  try {
    if (!node.getPluginData(ORIGINAL_IMAGE_REF_KEY)) {
      node.setPluginData(ORIGINAL_IMAGE_REF_KEY, imageRef);
      return true;
    }
  } catch (error) {}

  return false;
}

function setOriginalImageRef(node, imageRef) {
  if (!node || !imageRef || typeof node.setPluginData !== "function") return false;

  node.setPluginData(ORIGINAL_IMAGE_REF_KEY, imageRef);
  return true;
}

function saveAppliedImageRef(node, imageRef) {
  if (!node || !imageRef || typeof node.setPluginData !== "function") return false;

  node.setPluginData(APPLIED_IMAGE_REF_KEY, imageRef);
  return true;
}

function clearAppliedImageRef(node) {
  if (!node) return false;

  try {
    if (typeof node.removePluginData === "function") {
      node.removePluginData(APPLIED_IMAGE_REF_KEY);
      return true;
    }
    if (typeof node.setPluginData === "function") {
      node.setPluginData(APPLIED_IMAGE_REF_KEY, "");
      return true;
    }
  } catch (error) {}

  return false;
}

function clearSavedParams(node) {
  if (!node) return false;

  try {
    if (typeof node.removePluginData === "function") {
      node.removePluginData(PARAMS_KEY);
      return true;
    }
    if (typeof node.setPluginData === "function") {
      node.setPluginData(PARAMS_KEY, "");
      return true;
    }
  } catch (error) {}

  return false;
}

async function getSelection() {
  if (host.document && host.document.currentPage && Array.isArray(host.document.currentPage.selection)) {
    return host.document.currentPage.selection;
  }

  if (host.document && host.document.currentPage && typeof host.document.currentPage.getSelection === "function") {
    var documentPageSelection = await host.document.currentPage.getSelection();
    if (Array.isArray(documentPageSelection)) return documentPageSelection;
  }

  if (host.currentPage && Array.isArray(host.currentPage.selection)) {
    return host.currentPage.selection;
  }

  if (host.currentPage && typeof host.currentPage.getSelection === "function") {
    var pageSelection = await host.currentPage.getSelection();
    if (Array.isArray(pageSelection)) return pageSelection;
  }

  if (typeof host.getSelection === "function") {
    var hostSelection = await host.getSelection();
    if (Array.isArray(hostSelection)) return hostSelection;
  }

  if (host.selection && Array.isArray(host.selection)) {
    return host.selection;
  }

  return [];
}

function getImageHash(paint) {
  if (!paint) return null;
  return paint.imageRef || paint.imageHash || paint.hash || paint.image || paint.imageId || null;
}

function findImagePaint(node) {
  var fillSets = [];
  if (node && Array.isArray(node.fills)) fillSets.push({ name: "fills", paints: node.fills });
  if (node && Array.isArray(node.backgrounds)) fillSets.push({ name: "backgrounds", paints: node.backgrounds });

  for (var setIndex = 0; setIndex < fillSets.length; setIndex += 1) {
    var set = fillSets[setIndex];
    for (var index = 0; index < set.paints.length; index += 1) {
      var paint = set.paints[index];
      if (paint && paint.type === "IMAGE") {
        return {
          field: set.name,
          paint: paint,
          paintIndex: index,
          imageHash: getImageHash(paint)
        };
      }
    }
  }

  return null;
}

function clonePaints(paints) {
  return (paints || []).map(function (paint) {
    var clone = {};
    Object.keys(paint).forEach(function (key) {
      clone[key] = paint[key];
    });
    return clone;
  });
}

function makeImagePaint(image, originalPaint) {
  var imageRef = image && (image.href || image.imageRef || image.hash || image.imageHash || image.id || image.ref);
  if (!imageRef) {
    throw new Error("Created image has no imageRef. keys=" + (image ? Object.keys(image).join(",") : "null"));
  }

  var paint = Object.assign({}, originalPaint || {}, {
    type: "IMAGE",
    scaleMode: originalPaint && originalPaint.scaleMode ? originalPaint.scaleMode : "FILL"
  });

  delete paint.imageHash;
  paint.imageRef = imageRef;
  return paint;
}

async function createImageFromBytes(bytes) {
  if (typeof host.createImage !== "function") {
    throw new Error("createImage unavailable");
  }

  var payload;
  if (bytes instanceof Uint8Array) {
    payload = bytes;
  } else if (bytes instanceof ArrayBuffer) {
    payload = new Uint8Array(bytes);
  } else if (Array.isArray(bytes)) {
    payload = new Uint8Array(bytes);
  } else if (bytes && bytes.buffer instanceof ArrayBuffer) {
    payload = new Uint8Array(bytes.buffer);
  } else {
    throw new Error("Unsupported image bytes payload");
  }

  return await host.createImage(payload);
}

async function readImagePaintBytes(imageHash) {
  if (!imageHash) {
    throw new Error("missing image ref");
  }

  var image = null;
  if (typeof host.getImageByHref === "function") {
    image = host.getImageByHref(imageHash);
  } else if (typeof host.getImageByHash === "function") {
    image = host.getImageByHash(imageHash);
  }

  if (!image || typeof image.getBytesAsync !== "function") {
    throw new Error("image.getBytesAsync unavailable for image ref");
  }

  return await image.getBytesAsync();
}

async function exportNodeBytes(node) {
  if (node && typeof node.exportAsync === "function") {
    return await node.exportAsync({ format: "PNG" });
  }
  throw new Error("node.exportAsync unavailable");
}

async function applyImageBytes(bytes, params) {
  try {
    var selection = await getSelection();
    if (selection.length !== 1) {
      postToUi({
        type: "selection-status",
        ok: false,
        title: "Apply failed",
        detail: "Select one layer before applying. selection=" + selection.length
      });
      return;
    }

    var node = selection[0];
    if (!("fills" in node) || !Array.isArray(node.fills)) {
      postToUi({
        type: "selection-status",
        ok: false,
        title: "Apply failed",
        detail: "Selected layer cannot accept fills. " + describeNode(node)
      });
      return;
    }

    var image = await createImageFromBytes(bytes);
    var fills = clonePaints(node.fills);
    var imagePaint = findImagePaint(node);
    var index = imagePaint ? imagePaint.paintIndex : -1;
    if (imagePaint && imagePaint.imageHash) {
      saveOriginalImageRefIfNeeded(node, imagePaint.imageHash);
    }
    var nextPaint = makeImagePaint(image, index >= 0 ? fills[index] : null);

    if (index >= 0 && index < fills.length) {
      fills[index] = nextPaint;
    } else {
      fills = [nextPaint];
    }

    node.fills = fills;
    var paramsSaved = saveParams(node, params);
    saveAppliedImageRef(node, nextPaint.imageRef);

    postToUi({
      type: "selection-status",
      ok: true,
      title: "Applied to selected layer",
      detail: "Applied tuned PNG. paramsSaved=" + paramsSaved + ". " + describeNode(node)
    });
    postToUi({
      type: "apply-complete",
      params: readSavedParams(node),
      detail: "Applied tuned PNG. paramsSaved=" + paramsSaved
    });
  } catch (error) {
    postToUi({
      type: "selection-status",
      ok: false,
      title: "Apply failed",
      detail: error && error.message ? error.message : String(error)
    });
  }
}

async function resetSelectedImage() {
  try {
    var selection = await getSelection();
    if (selection.length !== 1) {
      postToUi({
        type: "selection-status",
        ok: false,
        title: "Reset failed",
        detail: "Select one layer before resetting. selection=" + selection.length
      });
      return;
    }

    var node = selection[0];
    var originalRef = readOriginalImageRef(node);
    if (!originalRef) {
      clearSavedParams(node);
      postToUi({
        type: "reset-complete",
        params: getDefaultParams(),
        detail: "No saved original imageRef. Params cleared."
      });
      sendCurrentSelection("after-reset-no-original");
      return;
    }

    if (!("fills" in node) || !Array.isArray(node.fills)) {
      throw new Error("Selected layer cannot accept fills");
    }

    var fills = clonePaints(node.fills);
    var imagePaint = findImagePaint(node);
    var index = imagePaint ? imagePaint.paintIndex : 0;
    var originalPaint = index >= 0 && index < fills.length ? fills[index] : null;
    var resetPaint = Object.assign({}, originalPaint || {}, {
      type: "IMAGE",
      scaleMode: originalPaint && originalPaint.scaleMode ? originalPaint.scaleMode : "FILL",
      imageRef: originalRef
    });
    delete resetPaint.imageHash;

    if (index >= 0 && index < fills.length) {
      fills[index] = resetPaint;
    } else {
      fills = [resetPaint];
    }

    node.fills = fills;
    clearSavedParams(node);
    clearAppliedImageRef(node);

    postToUi({
      type: "reset-complete",
      params: getDefaultParams(),
      detail: "Restored original image and cleared params."
    });
    sendCurrentSelection("after-reset");
  } catch (error) {
    postToUi({
      type: "selection-status",
      ok: false,
      title: "Reset failed",
      detail: error && error.message ? error.message : String(error)
    });
  }
}

async function sendCurrentSelection(reason) {
  try {
    var selection = await getSelection();
    var diagnostics = "host=" + getHostName() + ", reason=" + (reason || "refresh") + ", selection=" + selection.length + ", " + describeSelectionApis();

    if (selection.length !== 1) {
      postToUi({
        type: "selection-status",
        ok: false,
        title: selection.length === 0 ? "No layer selected" : "Select one layer only",
        detail: diagnostics
      });
      return;
    }

    var node = selection[0];
    var imagePaint = findImagePaint(node);
    var originalImageRef = readOriginalImageRef(node);
    var appliedImageRef = readAppliedImageRef(node);
    var currentImageRef = imagePaint ? imagePaint.imageHash : "";
    var sourceChanged = false;
    if (imagePaint && imagePaint.imageHash) {
      if (!originalImageRef) {
        saveOriginalImageRefIfNeeded(node, currentImageRef);
        originalImageRef = readOriginalImageRef(node) || currentImageRef;
      } else if (currentImageRef !== originalImageRef && currentImageRef !== appliedImageRef) {
        setOriginalImageRef(node, currentImageRef);
        clearSavedParams(node);
        clearAppliedImageRef(node);
        originalImageRef = currentImageRef;
        appliedImageRef = "";
        sourceChanged = true;
      }
    }
    diagnostics += ", " + describeNode(node);
    diagnostics += ", imagePaint=" + Boolean(imagePaint);
    diagnostics += imagePaint ? ", imageRef=" + Boolean(imagePaint.imageHash) : "";
    diagnostics += ", sourceChanged=" + sourceChanged;

    postToUi({
      type: "selection-status",
      ok: true,
      title: "Selected: " + (node.name || "Untitled"),
      detail: diagnostics
    });

    var bytes;
    var mode;
    if (originalImageRef || (imagePaint && imagePaint.imageHash)) {
      try {
        bytes = await readImagePaintBytes(originalImageRef || imagePaint.imageHash);
        mode = "paint";
      } catch (paintError) {
        bytes = await exportNodeBytes(node);
        mode = "export";
      }
    } else {
      bytes = await exportNodeBytes(node);
      mode = "export";
    }

    postToUi({
      type: "selection-image",
      nodeName: node.name || "Image",
      nodeId: node.id || "",
      bytes: bytes,
      mode: mode,
      params: readSavedParams(node),
      sourceChanged: sourceChanged,
      detail: diagnostics + ", mode=" + mode
    });
  } catch (error) {
    postToUi({
      type: "selection-status",
      ok: false,
      title: "Selection read failed",
      detail: error && error.message ? error.message : String(error)
    });
  }
}

if (host.ui) {
  host.ui.onmessage = function (message) {
    var payload = message && message.pluginMessage ? message.pluginMessage : message;
    if (payload && payload.type === "refresh-selection") {
      sendCurrentSelection("ui-refresh");
    }
    if (payload && payload.type === "apply-image") {
      applyImageBytes(payload.bytes, payload.params);
    }
    if (payload && payload.type === "reset-image") {
      resetSelectedImage();
    }
  };
}

if (typeof host.on === "function") {
  host.on("selectionchange", function () {
    sendCurrentSelection("selectionchange");
  });
  host.on("currentpagechange", function () {
    sendCurrentSelection("currentpagechange");
  });
}

postToUi({
  type: "selection-status",
  ok: true,
  title: "Plugin main started",
  detail: "main started, host=" + getHostName() + ", hasUi=" + Boolean(host.ui) + ", hasPostMessage=" + Boolean(host.ui && typeof host.ui.postMessage === "function")
});
setTimeout(function () {
  sendCurrentSelection("startup");
}, 100);

