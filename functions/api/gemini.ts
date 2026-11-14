// ============================================================
// Cloudflare Pages Function: POST /api/gemini
// Proxy que oculta la API key de Gemini (nunca llega al navegador).
//
// Secretos (Cloudflare Pages → Settings → Environment variables, tipo "Secret"):
//   GEMINI_API_KEY   (obligatoria)
//   GEMINI_MODEL     (opcional, por defecto gemini-2.5-flash)
// En local: archivo .dev.vars + `npx wrangler pages dev`.
//
// Hardening:
//  - Solo acepta 3 tareas fijas (event | debrief | ping); el esquema JSON y el
//    systemInstruction infantil los pone SIEMPRE el servidor, no el cliente.
//  - Prompt limitado a MAX_PROMPT_CHARS. Comprobación de mismo origen.
//  - No reenvía el cuerpo de error de Google al cliente, solo el código HTTP.
// ============================================================

import {
  DEFAULT_GEMINI_MODEL,
  MAX_PROMPT_CHARS,
  PING_PROMPT,
  SYSTEM_INSTRUCTION,
  TASKS,
  isTaskKind,
} from '../../src/services/geminiSchemas';

interface Env {
  GEMINI_API_KEY?: string;
  GEMINI_MODEL?: string;
}

interface PagesContext {
  request: Request;
  env: Env;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
    },
  });

function sameOrigin(request: Request): boolean {
  const origin = request.headers.get('Origin');
  if (!origin) return true; // peticiones sin Origin (p. ej. curl de diagnóstico)
  try {
    return new URL(origin).host === new URL(request.url).host;
  } catch {
    return false;
  }
}

export const onRequestGet = async ({ env }: PagesContext) =>
  json({ ok: true, service: 'gemini-proxy', configured: Boolean(env.GEMINI_API_KEY) });

export const onRequestPost = async ({ request, env }: PagesContext) => {
  if (!sameOrigin(request)) return json({ error: 'Origen no permitido', status: 403 }, 403);
  if (!env.GEMINI_API_KEY) return json({ error: 'GEMINI_API_KEY no configurada en el servidor', status: 500 }, 500);

  let body: { kind?: unknown; prompt?: unknown };
  try {
    body = await request.json();
  } catch {
    return json({ error: 'JSON inválido', status: 400 }, 400);
  }

  if (!isTaskKind(body.kind)) return json({ error: 'Tarea no permitida', status: 400 }, 400);
  const kind = body.kind;
  const prompt = kind === 'ping' ? PING_PROMPT : body.prompt;
  if (typeof prompt !== 'string' || prompt.length === 0 || prompt.length > MAX_PROMPT_CHARS) {
    return json({ error: 'Prompt inválido', status: 400 }, 400);
  }

  const model = env.GEMINI_MODEL && /^[a-z0-9.\-]+$/i.test(env.GEMINI_MODEL) ? env.GEMINI_MODEL : DEFAULT_GEMINI_MODEL;
  const task = TASKS[kind];

  let upstream: Response;
  try {
    upstream = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: task.schema,
          temperature: task.temperature,
          maxOutputTokens: 2048,
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
    });
  } catch {
    return json({ error: 'No se pudo contactar con Gemini', status: 502 }, 502);
  }

  if (!upstream.ok) {
    return json({ error: `Gemini respondió HTTP ${upstream.status}`, status: upstream.status }, 502);
  }

  const data = (await upstream.json().catch(() => null)) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  } | null;
  const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
  if (!text) return json({ error: 'Respuesta vacía de Gemini', status: 502 }, 502);

  return json({ text, model });
};
