import { getActiveAiConfig, getAnthropicClient } from "./provider.js";
import type { HistoryMessage } from "./history.js";

export interface InvokeLlmResult {
  text: string;
}

/**
 * Calls whichever AI provider/model is currently active in `ai_providers`/`ai_models`.
 * Supports anthropic, openai, and google — the three provider kinds in the schema.
 */
export async function invokeLLM(
  systemPrompt: string,
  history: HistoryMessage[],
): Promise<InvokeLlmResult> {
  const config = await getActiveAiConfig();
  if (!config) {
    return {
      text: "ขออภัยค่ะ ระบบ AI ยังไม่ได้ตั้งค่า กรุณาติดต่อเจ้าหน้าที่ หรือรอสักครู่นะคะ",
    };
  }

  const { provider, model } = config;

  if (provider.kind === "anthropic") {
    return invokeAnthropic(provider.apiKey, model.modelId, systemPrompt, history);
  }
  if (provider.kind === "openai") {
    return invokeOpenAi(provider.apiKey, model.modelId, systemPrompt, history);
  }
  return invokeGoogle(provider.apiKey, model.modelId, systemPrompt, history);
}

async function invokeAnthropic(
  apiKey: string,
  modelId: string,
  systemPrompt: string,
  history: HistoryMessage[],
): Promise<InvokeLlmResult> {
  const client = getAnthropicClient(apiKey);
  const messages = history.map((m) => toAnthropicMessage(m));

  const response = await client.messages.create({
    model: modelId,
    max_tokens: 1024,
    system: systemPrompt,
    messages,
  });

  const text = response.content
    .filter((block): block is { type: "text"; text: string } => block.type === "text")
    .map((block) => block.text)
    .join("\n");

  return { text: text || "ขออภัยค่ะ ไม่สามารถประมวลผลคำตอบได้ในขณะนี้" };
}

function toAnthropicMessage(m: HistoryMessage) {
  if (!m.imageBase64) {
    return { role: m.role, content: m.content };
  }
  return {
    role: m.role,
    content: [
      {
        type: "image" as const,
        source: {
          type: "base64" as const,
          media_type: (m.imageMediaType ?? "image/jpeg") as
            | "image/jpeg"
            | "image/png"
            | "image/gif"
            | "image/webp",
          data: m.imageBase64,
        },
      },
      { type: "text" as const, text: m.content || "ลูกค้าส่งรูปภาพมา ช่วยดูและแนะนำสินค้า/บริการที่เกี่ยวข้อง" },
    ],
  };
}

async function invokeOpenAi(
  apiKey: string,
  modelId: string,
  systemPrompt: string,
  history: HistoryMessage[],
): Promise<InvokeLlmResult> {
  const messages = [
    { role: "system", content: systemPrompt },
    ...history.map((m) => ({
      role: m.role,
      content: m.imageBase64
        ? [
            { type: "text", text: m.content },
            {
              type: "image_url",
              image_url: { url: `data:${m.imageMediaType ?? "image/jpeg"};base64,${m.imageBase64}` },
            },
          ]
        : m.content,
    })),
  ];

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: modelId, messages, max_tokens: 1024 }),
  });
  if (!res.ok) throw new Error(`OpenAI API error ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { choices: { message: { content: string } }[] };
  return { text: data.choices[0]?.message?.content ?? "" };
}

async function invokeGoogle(
  apiKey: string,
  modelId: string,
  systemPrompt: string,
  history: HistoryMessage[],
): Promise<InvokeLlmResult> {
  const contents = history.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: m.imageBase64
      ? [
          { text: m.content },
          { inlineData: { mimeType: m.imageMediaType ?? "image/jpeg", data: m.imageBase64 } },
        ]
      : [{ text: m.content }],
  }));

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents,
      }),
    },
  );
  if (!res.ok) throw new Error(`Google AI API error ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as {
    candidates: { content: { parts: { text: string }[] } }[];
  };
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text).join("\n") ?? "";
  return { text };
}
