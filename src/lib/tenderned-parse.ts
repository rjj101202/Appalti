import { XMLParser } from 'fast-xml-parser';

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_', textNodeName: '#text' });

function dfsFindText(node: any, predicate: (key: string) => boolean): string | undefined {
  if (!node || typeof node !== 'object') return undefined;
  for (const [k, v] of Object.entries(node)) {
    if (predicate(k)) {
      const t = (v as any)['#text'] ?? v;
      if (typeof t === 'string') return t;
    }
    if (v && typeof v === 'object') {
      const found = dfsFindText(v, predicate);
      if (found) return found;
    }
  }
  return undefined;
}

const match = (needles: string[]) => (k: string) => {
  const key = k.toLowerCase();
  return needles.some(n => key.endsWith(n) || key.includes(':'+n));
};

export function parseEformsSummary(xmlText: string): { title?: string; shortDescription?: string; buyer?: string } {
  try {
    const xml = parser.parse(xmlText);
    const title = dfsFindText(xml, match(['name','title']));
    const shortDescription = dfsFindText(xml, match(['short_descr','shortdescription','description']));
    const buyer = dfsFindText(xml, match(['buyerprofileuri','partyname','name']));
    return { title, shortDescription, buyer };
  } catch {
    return {};
  }
}

