// LLM Configuration — independent of Base44 billing.
//
// The agent uses Google Gemini directly (free tier available).
// Get your FREE API key from: https://aistudio.google.com/apikey
//
// Paste your key below. You can also restrict it to your app's domain
// in Google AI Studio for security.
//
// NOTE: This key is visible in the browser. For production, restrict it
// by HTTP referrer in Google AI Studio, or move this call behind a
// Supabase Edge Function (key stored as a Supabase secret).

export const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || ""; // Set in .env.local

// Tried in order: if a model is busy (503/429) or retired (404) the next one is used.
// Google retires Gemini models regularly — re-check https://ai.google.dev/gemini-api/docs/models when chat starts failing.
export const GEMINI_MODELS = ["gemini-3.5-flash", "gemini-3.6-flash", "gemini-3.1-flash-lite"];
export const GEMINI_MODEL = GEMINI_MODELS[0];

export function hasGeminiKey() {
  return Boolean(GEMINI_API_KEY && GEMINI_API_KEY.trim().length > 10);
}