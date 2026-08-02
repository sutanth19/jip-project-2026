declare module "@google/genai" {
  interface GeminiResponse { text?: string; usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; totalTokenCount?: number }; }
  export class GoogleGenAI {
    constructor(options: { apiKey: string });
    models: { generateContent(input: { model: string; contents: string; config: { systemInstruction: string; responseMimeType: string; temperature?: number; maxOutputTokens?: number } }): Promise<GeminiResponse>; };
  }
}
