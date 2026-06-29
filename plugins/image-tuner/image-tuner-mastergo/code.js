var host = typeof mg !== "undefined" ? mg : typeof mastergo !== "undefined" ? mastergo : typeof figma !== "undefined" ? figma : null;

if (!host) {
  throw new Error("Plugin host API was not found. Expected mg, mastergo, or figma.");
}

host.showUI(__html__, { width: 420, height: 860 });

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

function getDefaultParams() {
  var params = {};
  PARAM_KEYS.forEach(function (key) {
    params[key] = 0;
  });
  params.cgBlending = 50;
  return params;
}

function normalizeBaseUrl(value) {
  var raw = String(value || "").trim() || "https://api.openai.com/v1";
  return raw.replace(/\/+$/, "");
}

function getAiInstruction() {
  return [
    "You are generating non-destructive photo tuning settings for a MasterGo plugin named Image Tuner.",
    "Compare the target image with the reference image and return only practical slider values that move the target toward the reference style.",
    "Keep changes tasteful. Avoid extreme values unless the reference image clearly requires them.",
    "Use hue values in degrees, saturation/luminance/blending/balance and all other sliders within their declared ranges.",
    "Return JSON only through the provided schema. Include a short Chinese summary."
  ].join(" ");
}

function buildAiRequestBody(payload) {
  return {
    model: payload.model || "gpt-4.1-mini",
    input: [
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: getAiInstruction()
          },
          { type: "input_text", text: "Target image:" },
          { type: "input_image", image_url: payload.targetDataUrl },
          { type: "input_text", text: "Reference style image:" },
          { type: "input_image", image_url: payload.referenceDataUrl }
        ]
      }
    ],
    text: {
      format: {
        type: "json_schema",
        name: "image_tuner_ai_match",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            summary: { type: "string" },
            params: {
              type: "object",
              additionalProperties: false,
              properties: payload.schemaProperties || {},
              required: payload.parameterKeys || PARAM_KEYS
            }
          },
          required: ["summary", "params"]
        }
      }
    }
  };
}

function buildChatRequestBody(payload) {
  return {
    model: payload.model || "gpt-4.1-mini",
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "image_tuner_ai_match",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            summary: { type: "string" },
            params: {
              type: "object",
              additionalProperties: false,
              properties: payload.schemaProperties || {},
              required: payload.parameterKeys || PARAM_KEYS
            }
          },
          required: ["summary", "params"]
        }
      }
    },
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: getAiInstruction() },
          { type: "text", text: "Target image:" },
          { type: "image_url", image_url: { url: payload.targetDataUrl } },
          { type: "text", text: "Reference style image:" },
          { type: "image_url", image_url: { url: payload.referenceDataUrl } }
        ]
      }
    ]
  };
}

function buildChatJsonOnlyRequestBody(payload) {
  var paramsShape = (payload.parameterKeys || PARAM_KEYS).map(function (key) {
    return '"' + key + '": 0';
  }).join(", ");
  return {
    model: payload.model || "gpt-4.1-mini",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: getAiInstruction() + " Return only valid JSON in this exact shape: {\"summary\":\"中文摘要\",\"params\":{" + paramsShape + "}}."
          },
          { type: "text", text: "Target image:" },
          { type: "image_url", image_url: { url: payload.targetDataUrl } },
          { type: "text", text: "Reference style image:" },
          { type: "image_url", image_url: { url: payload.referenceDataUrl } }
        ]
      }
    ]
  };
}

function extractResponseText(data) {
  if (data && typeof data.output_text === "string") return data.output_text;
  if (data && data.choices && data.choices[0] && data.choices[0].message) {
    var messageContent = data.choices[0].message.content;
    if (typeof messageContent === "string") return messageContent;
    if (Array.isArray(messageContent)) {
      return messageContent.map(function (part) {
        return typeof part.text === "string" ? part.text : "";
      }).join("");
    }
  }
  var chunks = [];
  (data && data.output ? data.output : []).forEach(function (item) {
    (item.content || []).forEach(function (content) {
      if (typeof content.text === "string") chunks.push(content.text);
    });
  });
  return chunks.join("");
}

function sendJsonRequest(url, apiKey, body) {
  if (typeof fetch === "function") {
    return fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + apiKey
      },
      body: JSON.stringify(body)
    }).then(async function (response) {
      var data = {};
      try {
        data = await response.json();
      } catch (jsonError) {}
      return {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
        data: data
      };
    });
  }

  if (typeof XMLHttpRequest === "function") {
    return new Promise(function (resolve, reject) {
      var xhr = new XMLHttpRequest();
      xhr.open("POST", url, true);
      xhr.setRequestHeader("Content-Type", "application/json");
      xhr.setRequestHeader("Authorization", "Bearer " + apiKey);
      xhr.onreadystatechange = function () {
        if (xhr.readyState !== 4) return;
        var data = {};
        try {
          data = JSON.parse(xhr.responseText || "{}");
        } catch (jsonError) {}
        resolve({
          ok: xhr.status >= 200 && xhr.status < 300,
          status: xhr.status,
          statusText: xhr.statusText || "",
          data: data
        });
      };
      xhr.onerror = function () {
        reject(new Error("Network request failed"));
      };
      xhr.send(JSON.stringify(body));
    });
  }

  return Promise.reject(new Error("Plugin runtime does not support fetch or XMLHttpRequest"));
}

function responseErrorMessage(result) {
  return result && result.data && result.data.error && result.data.error.message
    ? result.data.error.message
    : result.status + " " + result.statusText;
}

async function sendAiRequest(payload) {
  var baseUrl = normalizeBaseUrl(payload.baseUrl);
  var responseResult = await sendJsonRequest(baseUrl + "/responses", payload.apiKey, buildAiRequestBody(payload));
  if (responseResult.ok) return responseResult.data;

  var shouldTryChat = responseResult.status === 400 || responseResult.status === 404 || responseResult.status === 405;
  if (!shouldTryChat) throw new Error(responseErrorMessage(responseResult));

  var chatResult = await sendJsonRequest(baseUrl + "/chat/completions", payload.apiKey, buildChatRequestBody(payload));
  if (chatResult.ok) return chatResult.data;

  var shouldTryJsonOnly = chatResult.status === 400 || chatResult.status === 422;
  if (shouldTryJsonOnly) {
    var jsonOnlyResult = await sendJsonRequest(baseUrl + "/chat/completions", payload.apiKey, buildChatJsonOnlyRequestBody(payload));
    if (jsonOnlyResult.ok) return jsonOnlyResult.data;
    throw new Error(responseErrorMessage(jsonOnlyResult) || responseErrorMessage(chatResult) || responseErrorMessage(responseResult));
  }

  throw new Error(responseErrorMessage(chatResult) || responseErrorMessage(responseResult));
}

async function requestAiMatch(payload) {
  try {
    if (!payload || !payload.apiKey) throw new Error("Missing API key");
    if (!payload.targetDataUrl || !payload.referenceDataUrl) throw new Error("Missing image data");
    var data = await sendAiRequest(payload);
    var text = extractResponseText(data);
    if (!text) throw new Error("AI response was empty");
    var parsed = JSON.parse(text);
    postToUi({
      type: "ai-match-complete",
      params: parsed.params || {},
      summary: parsed.summary || ""
    });
  } catch (error) {
    postToUi({
      type: "ai-match-error",
      message: error && error.message ? error.message : String(error)
    });
  }
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

async function applyImageBytes(bytes, params, version) {
  try {
    var selection = await getSelection();
    if (selection.length !== 1) {
      postToUi({
        type: "selection-status",
        ok: false,
        title: "Apply failed",
        detail: "Select one layer before applying. selection=" + selection.length,
        source: "apply"
      });
      return;
    }

    var node = selection[0];
    if (!("fills" in node) || !Array.isArray(node.fills)) {
      postToUi({
        type: "selection-status",
        ok: false,
        title: "Apply failed",
        detail: "Selected layer cannot accept fills. " + describeNode(node),
        source: "apply"
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
      applyImageBytes(payload.bytes, payload.params, payload.version);
    }
    if (payload && payload.type === "reset-image") {
      resetSelectedImage();
    }
    if (payload && payload.type === "ai-match") {
      requestAiMatch(payload);
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

