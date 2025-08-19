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
  description?: string;
  buyer?: string;
  buyerWebsite?: string;
  buyerCompanyId?: string;
  contactName?: string;
  contactTelephone?: string;
  contactEmail?: string;
  addressStreet?: string;
  addressPostalCode?: string;
  city?: string;
  countryCode?: string;
  nutsCodes?: string[];
  cpvCodes?: string[];
  procurementTypeCode?: string;
  publicationIssueDate?: string;
  publicationIssueTime?: string;
  noticeTypeCode?: string;
  noticeLanguageCode?: string;
  sourceUrl?: string;
  endpointId?: string;
  deadlineDate?: string;
  deadlineTime?: string;
} {
  try {
    const xml = parser.parse(xmlText);
    const hits = collectTextNodes(xml);

    const findFirst = (predicate: (hit: TextHit) => boolean) => hits.find(predicate)?.text;

    const title = findFirst(h => lastSegment(h.key).toLowerCase() === 'name' && pathIncludes(h.path, ['ProcurementProject']));
    const shortDescription = findFirst(h => lastSegment(h.key).toLowerCase() === 'short_descr' || (lastSegment(h.key).toLowerCase() === 'description' && pathIncludes(h.path, ['ProcurementProject'])));
    const description = findFirst(h => lastSegment(h.key).toLowerCase() === 'description' && !pathIncludes(h.path, ['ProcurementProjectLot']));
    const buyer = findFirst(h => lastSegment(h.key).toLowerCase() === 'name' && (pathIncludes(h.path, ['PartyName']) || pathIncludes(h.path, ['Organization']) || pathIncludes(h.path, ['Company']) || pathIncludes(h.path, ['ContractingParty'])));
    const buyerWebsite = findFirst(h => lastSegment(h.key).toLowerCase() === 'websiteuri');
    const buyerCompanyId = findFirst(h => lastSegment(h.key).toLowerCase() === 'companyid');
    const contactName = findFirst(h => lastSegment(h.key).toLowerCase() === 'name' && pathIncludes(h.path, ['Contact']));
    const contactTelephone = findFirst(h => lastSegment(h.key).toLowerCase() === 'telephone');
    const contactEmail = findFirst(h => lastSegment(h.key).toLowerCase() === 'electronicmail');
    const addressStreet = findFirst(h => lastSegment(h.key).toLowerCase() === 'streetname');
    const addressPostalCode = findFirst(h => lastSegment(h.key).toLowerCase() === 'postalzone');
    const city = findFirst(h => lastSegment(h.key).toLowerCase() === 'cityname');
    const countryCode = findFirst(h => lastSegment(h.key).toLowerCase() === 'identificationcode' && pathIncludes(h.path, ['Country']));
    const nutsCodes = hits
      .filter(h => lastSegment(h.key).toLowerCase() === 'countrysubentitycode')
      .map(h => h.text)
      .filter(Boolean);
    const cpvCodes = hits
      .filter(h => lastSegment(h.key).toLowerCase() === 'itemclassificationcode')
      .map(h => h.text)
      .filter(Boolean);

    const procurementTypeCode = findFirst(h => lastSegment(h.key).toLowerCase() === 'procurementtypecode');
    const publicationIssueDate = findFirst(h => lastSegment(h.key).toLowerCase() === 'issuedate');
    const publicationIssueTime = findFirst(h => lastSegment(h.key).toLowerCase() === 'issuetime');
    const noticeTypeCode = findFirst(h => lastSegment(h.key).toLowerCase() === 'noticetypecode');
    const noticeLanguageCode = findFirst(h => lastSegment(h.key).toLowerCase() === 'noticelanguagecode');
    const endpointId = findFirst(h => lastSegment(h.key).toLowerCase() === 'endpointid');
    const sourceUrl = findFirst(h => lastSegment(h.key).toLowerCase() === 'uri');
    const deadlineDate = findFirst(h => lastSegment(h.key).toLowerCase() === 'enddate');
    const deadlineTime = findFirst(h => lastSegment(h.key).toLowerCase() === 'endtime');

    const uniqueNuts = Array.from(new Set(nutsCodes));

    return {
      title,
      shortDescription,
      description,
      buyer,
      buyerWebsite,
      buyerCompanyId,
      contactName,
      contactTelephone,
      contactEmail,
      addressStreet,
      addressPostalCode,
      city,
      countryCode,
      nutsCodes: uniqueNuts,
      cpvCodes,
      procurementTypeCode,
      publicationIssueDate,
      publicationIssueTime,
      noticeTypeCode,
      noticeLanguageCode,
      sourceUrl,
      endpointId,
      deadlineDate,
      deadlineTime,
    };
  } catch {
    return {} as any;
  }
}

