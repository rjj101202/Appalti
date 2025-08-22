import { createHash } from 'crypto';

function getEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

export function computeChecksum(input: string | Uint8Array): string {
  const hash = createHash('sha256');
  hash.update(input);
  return hash.digest('hex');
}

export function chunkText(text: string, options?: { chunkSize?: number; overlap?: number }): string[] {
  const size = options?.chunkSize ?? 1000; // tokens approx; here characters as proxy
  const overlap = options?.overlap ?? 150;
  const chunks: string[] = [];
  let i = 0;
  while (i < text.length) {
    const end = Math.min(text.length, i + size);
    const piece = text.slice(i, end);
    chunks.push(piece);
    if (end === text.length) break;
    i = end - overlap;
    if (i < 0) i = 0;
  }
  return chunks.map(s => s.trim()).filter(Boolean);
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  const apiKey = getEnv('OPENAI_API_KEY');
  const model = process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small';
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({ model, input: texts })
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`OpenAI embeddings error: ${t}`);
  }
  const json = await res.json();
  const vectors = (json.data || []).map((d: any) => d.embedding as number[]);
  return vectors;
}