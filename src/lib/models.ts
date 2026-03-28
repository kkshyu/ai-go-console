export const AVAILABLE_MODELS = [
  { id: "anthropic/claude-sonnet-4", label: "Claude Sonnet 4" },
  { id: "anthropic/claude-haiku-4.5", label: "Claude Haiku 4.5" },
  { id: "openai/gpt-4o-mini", label: "GPT-4o Mini" },
  { id: "openai/gpt-4o", label: "GPT-4o" },
  { id: "google/gemini-2.5-flash-preview", label: "Gemini 2.5 Flash" },
] as const;

export const DEFAULT_MODEL = AVAILABLE_MODELS[0].id;
