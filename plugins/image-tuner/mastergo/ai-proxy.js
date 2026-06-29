const http = require("http");

const PORT = Number(process.env.IMAGE_TUNER_PROXY_PORT || 8787);

function json(response, status, data) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization"
  });
  response.end(JSON.stringify(data));
}

function normalizeBaseUrl(value) {
  return String(value || "https://api.openai.com/v1").trim().replace(/\/+$/, "");
}

function instruction() {
  return [
    "You are generating non-destructive photo tuning settings for a MasterGo plugin named Image Tuner.",
    "Compare the target image with the reference image and return only practical slider values that move the target toward the reference style.",
    "Keep changes tasteful. Avoid extreme values unless the reference image clearly requires them.",
    "Use hue values in degrees, saturation/luminance/blending/balance and all other sliders within their declared ranges.",
    "Return JSON only through the provided schema. Include a short Chinese summary."
  ].join(" ");
}

function responsesBody(payload) {
  return {
    model: payload.model || "gpt-4.1-mini",
    input: [{
      role: "user",
      content: [
        { type: "input_text", text: instruction() },
        { type: "input_text", text: "Target image:" },
        { type: "input_image", image_url: payload.targetDataUrl },
        { type: "input_text", text: "Reference style image:" },
        { type: "input_image", image_url: payload.referenceDataUrl }
      ]
    }],
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
              required: payload.parameterKeys || []
            }
          },
          required: ["summary", "params"]
        }
      }
    }
  };
}

function chatBody(payload, structured) {
  const body = {
    model: payload.model || "gpt-4.1-mini",
    messages: [{
      role: "user",
      content: [
        { type: "text", text: instruction() },
        { type: "text", text: "Target image:" },
        { type: "image_url", image_url: { url: payload.targetDataUrl } },
        { type: "text", text: "Reference style image:" },
        { type: "image_url", image_url: { url: payload.referenceDataUrl } }
      ]
    }]
  };
  if (structured) {
    body.response_format = {
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
              required: payload.parameterKeys || []
            }
          },
          required: ["summary", "params"]
        }
      }
    };
  } else {
    body.messages[0].content[0].text += " Return only valid JSON with summary and params.";
  }
  return body;
}

function outputText(data) {
  if (typeof data.output_text === "string") return data.output_text;
  if (data.choices && data.choices[0] && data.choices[0].message) {
    const content = data.choices[0].message.content;
    if (typeof content === "string") return content;
    if (Array.isArray(content)) return content.map((part) => part.text || "").join("");
  }
  return (data.output || []).flatMap((item) => item.content || []).map((part) => part.text || "").join("");
}

async function postJson(url, apiKey, body) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify(body)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data && data.error && data.error.message ? data.error.message : `${response.status} ${response.statusText}`;
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }
  return data;
}

async function callModel(payload) {
  const baseUrl = normalizeBaseUrl(payload.baseUrl);
  try {
    return await postJson(`${baseUrl}/responses`, payload.apiKey, responsesBody(payload));
  } catch (responsesError) {
    try {
      return await postJson(`${baseUrl}/chat/completions`, payload.apiKey, chatBody(payload, true));
    } catch (chatError) {
      return await postJson(`${baseUrl}/chat/completions`, payload.apiKey, chatBody(payload, false));
    }
  }
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 30 * 1024 * 1024) {
        reject(new Error("Request body too large"));
        request.destroy();
      }
    });
    request.on("end", () => resolve(body));
    request.on("error", reject);
  });
}

const server = http.createServer(async (request, response) => {
  if (request.method === "OPTIONS") {
    json(response, 204, {});
    return;
  }
  if (request.method !== "POST" || request.url !== "/v1/ai-match") {
    json(response, 404, { error: "Not found" });
    return;
  }
  try {
    const payload = JSON.parse(await readBody(request));
    if (!payload.apiKey) throw new Error("Missing API key");
    if (!payload.targetDataUrl || !payload.referenceDataUrl) throw new Error("Missing image data");
    const modelData = await callModel(payload);
    const text = outputText(modelData);
    if (!text) throw new Error("AI response was empty");
    json(response, 200, JSON.parse(text));
  } catch (error) {
    json(response, 500, { error: error.message || String(error) });
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Image Tuner AI proxy listening at http://127.0.0.1:${PORT}/v1/ai-match`);
});
