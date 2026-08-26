import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

const LANGUAGE_INSTRUCTIONS = {
  en: "Respond in English.",
  hi: "हिंदी में उत्तर दें (Respond in Hindi).",
  gu: "ગુજરાતીમાં જવાબ આપો (Respond in Gujarati).",
};

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const message = (body?.message || "").toString().trim();
    const language = ["en", "hi", "gu"].includes(body?.language) ? body.language : "en";
    const history = Array.isArray(body?.history) ? body.history.slice(-10) : [];

    if (!message) return Response.json({ error: 'Message is required' }, { status: 400 });
    if (message.length > 1000) return Response.json({ error: 'Message too long' }, { status: 400 });

    const langInstruction = LANGUAGE_INSTRUCTIONS[language];

    const conversation = history
      .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
      .join("\n");

    const prompt = `You are Kramashah Assistant, a helpful AI bot inside a service-business management SaaS app (Kramashah) used by photographers, event managers, and production teams in India. The app helps manage events/projects, clients, team members, quotations, and finances.

Your job: help the user with questions about how to use the app, general business advice for photographers/event managers, and quick tips. Be friendly, concise, and practical. Keep replies short (2-4 sentences) unless the user asks for detail.

${langInstruction}

${conversation ? `Conversation so far:\n${conversation}\n` : ""}
User: ${message}

Assistant:`;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
    });

    const reply = typeof result === "string" ? result : result?.response || result?.output || JSON.stringify(result);

    return Response.json({ reply });
  } catch (error) {
    return Response.json({ error: error.message || 'Failed to generate response' }, { status: 500 });
  }
}