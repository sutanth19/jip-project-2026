import { AppError } from "../../errors/app-error.js";
import type { GeminiModelAlias } from "./gemini-models.js";
interface GeminiResponse { text?: string; usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; totalTokenCount?: number }; }
interface GeminiClient { models: { generateContent(input: { model: string; contents: string; config: { systemInstruction: string; responseMimeType: string; temperature?: number; maxOutputTokens?: number } }): Promise<GeminiResponse>; }; }
interface GeminiModule { GoogleGenAI: new (options: { apiKey: string }) => GeminiClient; }
const env = () => ({ enabled: process.env.GEMINI_AI_ENABLED === "true", key: process.env.GEMINI_API_KEY?.trim() ?? "", timeout: Number(process.env.GEMINI_REQUEST_TIMEOUT_MS ?? "30000"), retries: Number(process.env.GEMINI_MAX_RETRIES ?? "2"), models: { TEXT: process.env.GEMINI_TEXT_MODEL?.trim() ?? "", FAST: process.env.GEMINI_FAST_MODEL?.trim() ?? "", AUDIO: process.env.GEMINI_AUDIO_MODEL?.trim() ?? "", EMBEDDING: process.env.GEMINI_EMBEDDING_MODEL?.trim() ?? "" } });
const fail = (code: string, message: string) => new AppError(code, 503, message);
export async function generateGeminiJson(input: { modelAlias: GeminiModelAlias; systemInstruction: string; prompt: string; temperature?: number; maximumOutputTokens?: number }) {
  const config = env(); if (!config.enabled || !config.key) throw fail("AI_FEATURE_DISABLED", "Ciri AI tidak diaktifkan.");
  const model = config.models[input.modelAlias]; if (!model) throw fail("AI_CONFIGURATION_INVALID", "Konfigurasi model AI tidak lengkap.");
  const module = await import("@google/genai") as unknown as GeminiModule; const client = new module.GoogleGenAI({ apiKey: config.key });
  const attempt = async () => { const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), Math.max(1_000, config.timeout)); try { return await client.models.generateContent({ model, contents: input.prompt, config: { systemInstruction: input.systemInstruction, responseMimeType: "application/json", ...(input.temperature === undefined ? {} : { temperature: input.temperature }), ...(input.maximumOutputTokens === undefined ? {} : { maxOutputTokens: input.maximumOutputTokens }) } }); } finally { clearTimeout(timer); } };
  let last: unknown; for (let count = 0; count <= Math.max(0, config.retries); count += 1) { try { const response = await attempt(); if (!response.text) throw fail("AI_OUTPUT_INVALID", "Respons AI tidak sah."); return { text: response.text, usage: response.usageMetadata ?? null, retryCount: count, modelAlias: input.modelAlias }; } catch (caught) { last = caught; if (caught instanceof AppError) throw caught; if (count < config.retries) await new Promise<void>((resolve) => setTimeout(resolve, 200 * (count + 1))); } }
  void last; throw fail("AI_PROVIDER_UNAVAILABLE", "Perkhidmatan AI tidak tersedia buat masa ini.");
}
