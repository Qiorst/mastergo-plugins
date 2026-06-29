var host = typeof mg !== "undefined" ? mg
  : typeof mastergo !== "undefined" ? mastergo
  : typeof figma !== "undefined" ? figma
  : null;

if (!host) {
  throw new Error("Plugin host API was not found. Expected mg, mastergo, or figma.");
}

var HOST_NAME = typeof mg !== "undefined" ? "mg"
  : typeof mastergo !== "undefined" ? "mastergo"
  : typeof figma !== "undefined" ? "figma"
  : "unknown";

host.showUI(__html__, { width: 440, height: 680 });

function postToUi(message) {
  if (host.ui && typeof host.ui.postMessage === "function") {
    host.ui.postMessage(message, "*");
    return true;
  }
  return false;
}

function getSelection() {
  var selection = null;

  if (host.document && host.document.currentPage && host.document.currentPage.selection) {
    selection = host.document.currentPage.selection;
  } else if (host.currentPage && host.currentPage.selection) {
    selection = host.currentPage.selection;
  } else if (host.selection) {
    selection = host.selection;
  } else if (typeof host.getSelection === "function") {
    selection = host.getSelection();
  }

  if (!selection) {
    return [];
  }

  if (Array.isArray(selection)) {
    return selection;
  }

  if (typeof selection.length === "number") {
    return Array.prototype.slice.call(selection);
  }

  return [];
}

function getNodeId(node, index) {
  return node && node.id ? String(node.id) : "selection-index-" + index;
}

function nodeCanRename(node) {
  return !!node && typeof node.name === "string";
}

function getSelectionPayload() {
  var selection = getSelection();
  var layers = selection.map(function (node, index) {
    return {
      id: getNodeId(node, index),
      index: index,
      name: node && typeof node.name === "string" ? node.name : "",
      type: node && node.type ? String(node.type) : "UNKNOWN",
      canRename: nodeCanRename(node)
    };
  });

  var renameableCount = layers.filter(function (layer) {
    return layer.canRename;
  }).length;

  return {
    type: "selection-status",
    title: selection.length ? "Selection loaded" : "No layers selected",
    detail: selection.length
      ? "Selected " + selection.length + " layer(s), " + renameableCount + " can be renamed."
      : "Select one or more layers, then refresh.",
    hostName: HOST_NAME,
    selectionCount: selection.length,
    renameableCount: renameableCount,
    canPostMessage: !!(host.ui && typeof host.ui.postMessage === "function"),
    supportsSelectionChange: typeof host.on === "function",
    layers: layers
  };
}

function sanitizeName(name) {
  var result = String(name || "").replace(/\s+/g, " ").trim();

  if (!result) {
    result = "Untitled";
  }

  if (result.length > 120) {
    result = result.slice(0, 120);
  }

  return result;
}

function applyRenames(items) {
  var selection = getSelection();
  var nodesById = {};
  var nodesByIndex = {};

  selection.forEach(function (node, index) {
    nodesById[getNodeId(node, index)] = node;
    nodesByIndex[index] = node;
  });

  var renamed = 0;
  var failed = [];

  (items || []).forEach(function (item) {
    var node = nodesById[String(item.id)] || nodesByIndex[item.index];
    var nextName = sanitizeName(item.name);

    if (!node) {
      failed.push({ name: nextName, reason: "Layer is no longer selected." });
      return;
    }

    if (!nodeCanRename(node)) {
      failed.push({ name: nextName, reason: "This layer does not expose a writable name." });
      return;
    }

    try {
      node.name = nextName;
      renamed += 1;
    } catch (error) {
      failed.push({
        name: nextName,
        reason: error && error.message ? error.message : "Rename failed."
      });
    }
  });

  postToUi({
    type: failed.length ? "apply-error" : "apply-complete",
    title: failed.length ? "Rename finished with issues" : "Rename complete",
    detail: "Renamed " + renamed + " layer(s)." + (failed.length ? " " + failed.length + " failed." : ""),
    renamed: renamed,
    failed: failed,
    selection: getSelectionPayload()
  });
}

function handleMessage(message) {
  var payload = message && message.pluginMessage ? message.pluginMessage : message;

  if (!payload || !payload.type) {
    return;
  }

  if (payload.type === "refresh-selection") {
    postToUi(getSelectionPayload());
    return;
  }

  if (payload.type === "apply-renames") {
    applyRenames(payload.items || []);
  }
}

if (host.ui) {
  host.ui.onmessage = handleMessage;
}

if (typeof host.on === "function") {
  try {
    host.on("selectionchange", function () {
      postToUi(getSelectionPayload());
    });
  } catch (error) {
    postToUi({
      type: "selection-status",
      title: "Selection listener unavailable",
      detail: error && error.message ? error.message : "Refresh manually after changing selection.",
      hostName: HOST_NAME,
      selectionCount: 0,
      renameableCount: 0,
      layers: []
    });
  }
}

postToUi(getSelectionPayload());
