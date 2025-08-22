import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/context';

const bodySchema = z.object({
  message: z.string().min(1),
  currentText: z.string().optional(),
  contextSnippets: z.array(z.object({ text: z.string(), source: z.string().optional() })).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!auth.tenantId) return NextResponse.json({ error: 'No active tenant' }, { status: 400 });
    const json = await request.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) return NextResponse.json({ error: 'Invalid body', details: parsed.error.issues }, { status: 400 });

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'ANTHROPIC_API_KEY missing' }, { status: 400 });

    const system = `Je bent een Appalti tenderschrijfassistent. Schrijf professioneel en hartelijk, in helder Nederlands. Gebruik context en broncitaties wanneer relevant.`;
    let user = `Vraag:\n${parsed.data.message}\n\n`;
    if (parsed.data.currentText) user += `Huidige tekst:\n${parsed.data.currentText.slice(0, 4000)}\n\n`;
    if (parsed.data.contextSnippets && parsed.data.contextSnippets.length > 0) {
      user += `Contextfragmenten (gebruik als bron, citeer beknopt):\n`;
      for (const s of parsed.data.contextSnippets.slice(0, 10)) {
        user += `---\n${s.text.slice(0, 1500)}\nBron: ${s.source || 'onbekend'}\n`;
      }
    }

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-latest',
        max_tokens: 1200,
        system,
        messages: [{ role: 'user', content: user }]
      })
    });
    if (!res.ok) {
      const t = await res.text();
      return NextResponse.json({ error: `AI error: ${t}` }, { status: 500 });
    }
    const data = await res.json();
    const text = data?.content?.[0]?.text || data?.content || JSON.stringify(data);
    return NextResponse.json({ success: true, data: { reply: text } });
  } catch (e: any) {
    console.error('AI chat error', e);
    return NextResponse.json({ error: e?.message || 'Failed' }, { status: 500 });
  }
}