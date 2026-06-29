var PARAMS_KEY = "image-tuner-params-v1";
var ORIGINAL_IMAGE_HASH_KEY = "image-tuner-original-image-hash-v1";
var APPLIED_IMAGE_HASH_KEY = "image-tuner-applied-image-hash-v1";
var PARAM_KEYS = [
  "exposure",
  "contrast",
  "highlights",
  "shadows",
  "whites",
  "blacks",
  "temperature",
  "tint",
  "vibrance",
  "saturation",
  "hue",
  "cgShadowsHue",
  "cgShadowsSaturation",
  "cgShadowsLuminance",
  "cgMidtonesHue",
  "cgMidtonesSaturation",
  "cgMidtonesLuminance",
  "cgHighlightsHue",
  "cgHighlightsSaturation",
  "cgHighlightsLuminance",
  "cgBlending",
  "cgBalance",
  "grain",
  "vignette"
];

if (typeof figma === "undefined") {
  throw new Error("Figma plugin API was not found.");
}

figma.showUI(__html__, { width: 420, height: 860 });

function postToUi(message) {
  figma.ui.postMessage(message);
}

function getDefaultParams() {
  var params = {};
  PARAM_KEYS.forEach(function (key) {
    params[key] = 0;
  });
  params.cgBlending = 50;
  return params;
}

function describeNode(node) {
  if (!node) return "node=null";
  var fills = Array.isArray(node.fills) ? node.fills.length : "n/a";
  return "name=" + (node.name || "Untitled") + ", type=" + (node.type || "unknown") + ", fills=" + fills + ", exportAsync=" + (typeof node.exportAsync === "function");
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

function findImagePaint(node) {
  if (!node || !Array.isArray(node.fills)) return null;

  for (var index = 0; index < node.fills.length; index += 1) {
    var paint = node.fills[index];
    if (paint && paint.type === "IMAGE") {
      return {
        paint: paint,
        paintIndex: index,
        imageHash: paint.imageHash || null
      };
    }
  }

  return null;
}

function readSavedParams(node) {
  if (!node || typeof node.getPluginData !== "function") return getDefaultParams();

  try {
    var raw = node.getPluginData(PARAMS_KEY);
    if (!raw) return getDefaultParams();
    var parsed = JSON.parse(raw);
    var params = getDefaultParams();
    PARAM_KEYS.forEach(function (key) {
      params[key] = Number(parsed[key]) || 0;
    });
    if (parsed.brightness && !params.exposure) {
      params.exposure = Number(parsed.brightness) || 0;
    }
    if (Object.prototype.hasOwnProperty.call(parsed, "cgBlending")) {
      params.cgBlending = Number(parsed.cgBlending) || 0;
    }
    return params;
  } catch (error) {
    return getDefaultParams();
  }
}

function saveParams(node, params) {
  if (!node || typeof node.setPluginData !== "function") return false;

  var nextParams = getDefaultParams();
  PARAM_KEYS.forEach(function (key) {
    nextParams[key] = Number(params && params[key]) || 0;
  });
  node.setPluginData(PARAMS_KEY, JSON.stringify(nextParams));
  return true;
}

function readPluginData(node, key) {
  try {
    return node && typeof node.getPluginData === "function" ? node.getPluginData(key) || "" : "";
  } catch (error) {
    return "";
  }
}

function setPluginData(node, key, value) {
  if (!node || typeof node.setPluginData !== "function") return false;
  node.setPluginData(key, value || "");
  return true;
}

function clearPluginData(node, key) {
  if (!node) return false;

  try {
    if (typeof node.setPluginData === "function") {
      node.setPluginData(key, "");
      return true;
    }
  } catch (error) {}

  return false;
}

function saveOriginalHashIfNeeded(node, imageHash) {
  if (!node || !imageHash) return false;
  if (!readPluginData(node, ORIGINAL_IMAGE_HASH_KEY)) {
    return setPluginData(node, ORIGINAL_IMAGE_HASH_KEY, imageHash);
  }
  return false;
}

async function readImageBytes(imageHash) {
  if (!imageHash) throw new Error("Missing imageHash");

  var image = figma.getImageByHash(imageHash);
  if (!image || typeof image.getBytesAsync !== "function") {
    throw new Error("Could not read selected image bytes");
  }

  return await image.getBytesAsync();
}

async function exportNodeBytes(node) {
  if (node && typeof node.exportAsync === "function") {
    return await node.exportAsync({ format: "PNG" });
  }
  throw new Error("Selected layer cannot be exported as PNG");
}

function getSingleSelection(source) {
  var selection = figma.currentPage && Array.isArray(figma.currentPage.selection)
    ? figma.currentPage.selection
    : [];

  if (selection.length !== 1) {
    postToUi({
      type: "selection-status",
      ok: false,
      title: selection.length === 0 ? "No layer selected" : "Select one layer only",
      detail: "source=" + (source || "selection") + ", selection=" + selection.length
    });
    return null;
  }

  return selection[0];
}

function ensureWritableFillsNode(node) {
  if (!node || !("fills" in node) || !Array.isArray(node.fills)) {
    throw new Error("Selected layer cannot accept image fills. " + describeNode(node));
  }
}

async function sendCurrentSelection(reason) {
  try {
    var node = getSingleSelection(reason || "refresh");
    if (!node) return;

    var imagePaint = findImagePaint(node);
    var originalHash = readPluginData(node, ORIGINAL_IMAGE_HASH_KEY);
    var appliedHash = readPluginData(node, APPLIED_IMAGE_HASH_KEY);
    var currentHash = imagePaint ? imagePaint.imageHash : "";
    var sourceChanged = false;

    if (imagePaint && imagePaint.imageHash) {
      if (!originalHash) {
        saveOriginalHashIfNeeded(node, currentHash);
        originalHash = readPluginData(node, ORIGINAL_IMAGE_HASH_KEY) || currentHash;
      } else if (currentHash !== originalHash && currentHash !== appliedHash) {
        setPluginData(node, ORIGINAL_IMAGE_HASH_KEY, currentHash);
        clearPluginData(node, PARAMS_KEY);
        clearPluginData(node, APPLIED_IMAGE_HASH_KEY);
        originalHash = currentHash;
        appliedHash = "";
        sourceChanged = true;
      }
    }

    var diagnostics = "host=figma, reason=" + (reason || "refresh") + ", " + describeNode(node);
    diagnostics += ", imagePaint=" + Boolean(imagePaint);
    diagnostics += imagePaint ? ", imageHash=" + Boolean(imagePaint.imageHash) : "";
    diagnostics += ", sourceChanged=" + sourceChanged;

    postToUi({
      type: "selection-status",
      ok: true,
      title: "Selected: " + (node.name || "Untitled"),
      detail: diagnostics
    });

    var bytes;
    var mode;
    if (originalHash || (imagePaint && imagePaint.imageHash)) {
      try {
        bytes = await readImageBytes(originalHash || imagePaint.imageHash);
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

async function applyImageBytes(bytes, params, version) {
  try {
    var node = getSingleSelection("apply");
    if (!node) return;
    ensureWritableFillsNode(node);

    var payload = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    var image = figma.createImage(payload);
    var imageHash = image.hash;
    if (!imageHash) throw new Error("Created Figma image has no hash");

    var fills = clonePaints(node.fills);
    var imagePaint = findImagePaint(node);
    var index = imagePaint ? imagePaint.paintIndex : -1;

    if (imagePaint && imagePaint.imageHash) {
      saveOriginalHashIfNeeded(node, imagePaint.imageHash);
    }

    var basePaint = index >= 0 && index < fills.length ? fills[index] : {};
    var nextPaint = Object.assign({}, basePaint, {
      type: "IMAGE",
      scaleMode: basePaint.scaleMode || "FILL",
      imageHash: imageHash
    });

    if (index >= 0 && index < fills.length) {
      fills[index] = nextPaint;
    } else {
      fills = [nextPaint];
    }

    node.fills = fills;
    var paramsSaved = saveParams(node, params);
    setPluginData(node, APPLIED_IMAGE_HASH_KEY, imageHash);

    postToUi({
      type: "selection-status",
      ok: true,
      title: "Applied to selected layer",
      detail: "Applied tuned PNG. paramsSaved=" + paramsSaved + ". " + describeNode(node)
    });
    postToUi({
      type: "apply-complete",
      params: readSavedParams(node),
      version: version,
      detail: "Applied tuned PNG. paramsSaved=" + paramsSaved
    });
  } catch (error) {
    postToUi({
      type: "selection-status",
      ok: false,
      title: "Apply failed",
      detail: error && error.message ? error.message : String(error),
      source: "apply"
    });
  }
}

async function resetSelectedImage() {
  try {
    var node = getSingleSelection("reset");
    if (!node) return;

    var originalHash = readPluginData(node, ORIGINAL_IMAGE_HASH_KEY);
    if (!originalHash) {
      clearPluginData(node, PARAMS_KEY);
      postToUi({
        type: "reset-complete",
        params: getDefaultParams(),
        detail: "No saved original imageHash. Params cleared."
      });
      await sendCurrentSelection("after-reset-no-original");
      return;
    }

    ensureWritableFillsNode(node);

    var fills = clonePaints(node.fills);
    var imagePaint = findImagePaint(node);
    var index = imagePaint ? imagePaint.paintIndex : 0;
    var basePaint = index >= 0 && index < fills.length ? fills[index] : {};
    var resetPaint = Object.assign({}, basePaint, {
      type: "IMAGE",
      scaleMode: basePaint.scaleMode || "FILL",
      imageHash: originalHash
    });

    if (index >= 0 && index < fills.length) {
      fills[index] = resetPaint;
    } else {
      fills = [resetPaint];
    }

    node.fills = fills;
    clearPluginData(node, PARAMS_KEY);
    clearPluginData(node, APPLIED_IMAGE_HASH_KEY);

    postToUi({
      type: "reset-complete",
      params: getDefaultParams(),
      detail: "Restored original image and cleared params."
    });
    await sendCurrentSelection("after-reset");
  } catch (error) {
    postToUi({
      type: "selection-status",
      ok: false,
      title: "Reset failed",
      detail: error && error.message ? error.message : String(error)
    });
  }
}

figma.ui.onmessage = function (message) {
  var payload = message && message.pluginMessage ? message.pluginMessage : message;
  if (payload && payload.type === "refresh-selection") {
    sendCurrentSelection("ui-refresh");
  }
  if (payload && payload.type === "apply-image") {
    applyImageBytes(payload.bytes, payload.params, payload.version);
  }
  if (payload && payload.type === "reset-image") {
    resetSelectedImage();
  }
  if (payload && payload.type === "ai-match") {
    postToUi({
      type: "ai-match-error",
      message: "Figma version uses the local proxy for AI matching. Start ai-proxy.js and use the AI panel proxy option."
    });
  }
};

figma.on("selectionchange", function () {
  sendCurrentSelection("selectionchange");
});

postToUi({
  type: "selection-status",
  ok: true,
  title: "Plugin main started",
  detail: "main started, host=figma"
});

setTimeout(function () {
  sendCurrentSelection("startup");
}, 100);
