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

export const GEMINI_API_KEY = ""; // ← Paste your Gemini API key here

export const GEMINI_MODEL = "gemini-2.0-flash"; // fast + free tier

export function hasGeminiKey() {
  return Boolean(GEMINI_API_KEY && GEMINI_API_KEY.trim().length > 10);
}