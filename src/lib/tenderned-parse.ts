import { XMLParser } from 'fast-xml-parser';

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_', textNodeName: '#text' });

type TextHit = { path: string[]; key: string; text: string };

function lastSegment(key: string): string {
  const idx = key.lastIndexOf(':');
  return idx >= 0 ? key.slice(idx + 1) : key;
}

function collectTextNodes(node: any, path: string[] = [], out: TextHit[] = []): TextHit[] {
  if (!node || typeof node !== 'object') return out;
  for (const [k, v] of Object.entries(node)) {
    // Sla attributes zoals "@_listName" over; we willen element‑tekst, geen attributen
    if (k.startsWith('@_')) continue;
    if (v && typeof v === 'object' && typeof (v as any)['#text'] === 'string') {
      out.push({ path, key: k, text: (v as any)['#text'] as string });
    }
    if (v && typeof v === 'object') collectTextNodes(v, [...path, k], out);
    if (typeof v === 'string') out.push({ path, key: k, text: v });
  }
  return out;
}

function pathIncludes(path: string[], needles: string[]): boolean {
  const lowerPath = path.map(p => lastSegment(p).toLowerCase());
  return needles.some(n => lowerPath.includes(n.toLowerCase()));
}

export function parseEformsSummary(xmlText: string): {
  title?: string;
  shortDescription?: string;
  buyer?: string;
  sourceUrl?: string;
  city?: string;
  nutsCodes?: string[];
} {
  try {
    const xml = parser.parse(xmlText);
    const hits = collectTextNodes(xml);

    const findFirst = (predicate: (hit: TextHit) => boolean) => hits.find(predicate)?.text;

    const title = findFirst(h => lastSegment(h.key).toLowerCase() === 'name' && pathIncludes(h.path, ['ProcurementProject']));
    const shortDescription = findFirst(h => lastSegment(h.key).toLowerCase() === 'description' && pathIncludes(h.path, ['ProcurementProject']));
    const buyer = findFirst(h => lastSegment(h.key).toLowerCase() === 'name' && (pathIncludes(h.path, ['PartyName']) || pathIncludes(h.path, ['Organization']) || pathIncludes(h.path, ['Company']) || pathIncludes(h.path, ['ContractingParty'])));
    const city = findFirst(h => lastSegment(h.key).toLowerCase() === 'cityname');
    const nutsCodes = hits
      .filter(h => lastSegment(h.key).toLowerCase() === 'countrysubentitycode')
      .map(h => h.text)
      .filter(Boolean);
    const sourceUrl = findFirst(h => lastSegment(h.key).toLowerCase() === 'uri');

    const uniqueNuts = Array.from(new Set(nutsCodes));

    return { title, shortDescription, buyer, sourceUrl, city, nutsCodes: uniqueNuts };
  } catch {
    return {} as any;
  }
}

