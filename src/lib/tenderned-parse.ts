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
  // extra meta/contracting
  ublVersionId?: string;
  customizationId?: string;
  noticeId?: string;
  versionId?: string;
  regulatoryDomain?: string;
  noticeSubTypeCode?: string;
  buyerLegalType?: string;
  buyerContractingType?: string;
  authorityActivityType?: string;
  internalProjectId?: string;
  projectNote?: string;
  submissionMethodCode?: string;
  languageId?: string;
  // touch point (appeal/contact point)
  touchPointName?: string;
  touchPointWebsite?: string;
  touchPointTelephone?: string;
  touchPointEmail?: string;
  touchPointAddressStreet?: string;
  touchPointAddressPostalCode?: string;
  touchPointCity?: string;
  // docs
  documentLinks?: string[];
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

    // Meta
    const ublVersionId = findFirst(h => lastSegment(h.key).toLowerCase() === 'ublversionid');
    const customizationId = findFirst(h => lastSegment(h.key).toLowerCase() === 'customizationid');
    const noticeId = findFirst(h => lastSegment(h.key).toLowerCase() === 'id' && pathIncludes(h.path, ['PriorInformationNotice']));
    const versionId = findFirst(h => lastSegment(h.key).toLowerCase() === 'versionid');
    const regulatoryDomain = findFirst(h => lastSegment(h.key).toLowerCase() === 'regulatorydomain');
    const noticeSubTypeCode = findFirst(h => lastSegment(h.key).toLowerCase() === 'subtypecode');

    // Contracting party types / activities
    const buyerLegalType = findFirst(h => lastSegment(h.key).toLowerCase() === 'partytypecode' && hits.some(x => x === h) ? undefined : undefined);
    const partyTypeCodes = hits.filter(h => lastSegment(h.key).toLowerCase() === 'partytypecode').map(h => h.text);
    // heuristics
    const _buyerLegalType = partyTypeCodes.find(v => /buyer-legal-type/i.test(v)) || undefined;
    const _buyerContractingType = partyTypeCodes.find(v => /buyer-contracting-type/i.test(v)) || undefined;
    const authorityActivityType = findFirst(h => lastSegment(h.key).toLowerCase() === 'activitytypecode');

    // Project identifiers/notes
    const internalProjectId = findFirst(h => lastSegment(h.key).toLowerCase() === 'id' && pathIncludes(h.path, ['ProcurementProject']) && /internalid/i.test(h.text) === false ? h.text : undefined) || findFirst(h => pathIncludes(h.path, ['ProcurementProject']) && lastSegment(h.key).toLowerCase() === 'id');
    const projectNote = findFirst(h => lastSegment(h.key).toLowerCase() === 'note');
    const submissionMethodCode = findFirst(h => lastSegment(h.key).toLowerCase() === 'submissionmethodcode');
    const languageId = findFirst(h => pathIncludes(h.path, ['Language']) && lastSegment(h.key).toLowerCase() === 'id');

    // TouchPoint (appeal or info point) – pick first touchpoint block fields
    const touchPointWebsite = findFirst(h => lastSegment(h.key).toLowerCase() === 'websiteuri' && pathIncludes(h.path, ['TouchPoint']));
    const touchPointName = findFirst(h => lastSegment(h.key).toLowerCase() === 'name' && pathIncludes(h.path, ['TouchPoint']));
    const touchPointTelephone = findFirst(h => lastSegment(h.key).toLowerCase() === 'telephone' && pathIncludes(h.path, ['TouchPoint']));
    const touchPointEmail = findFirst(h => lastSegment(h.key).toLowerCase() === 'electronicmail' && pathIncludes(h.path, ['TouchPoint']));
    const touchPointAddressStreet = findFirst(h => lastSegment(h.key).toLowerCase() === 'streetname' && pathIncludes(h.path, ['TouchPoint']));
    const touchPointAddressPostalCode = findFirst(h => lastSegment(h.key).toLowerCase() === 'postalzone' && pathIncludes(h.path, ['TouchPoint']));
    const touchPointCity = findFirst(h => lastSegment(h.key).toLowerCase() === 'cityname' && pathIncludes(h.path, ['TouchPoint']));

    // Document links
    const documentLinks = hits
      .filter(h => lastSegment(h.key).toLowerCase() === 'uri' && pathIncludes(h.path, ['CallForTendersDocumentReference']))
      .map(h => h.text)
      .filter(Boolean);

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
      ublVersionId,
      customizationId,
      noticeId,
      versionId,
      regulatoryDomain,
      noticeSubTypeCode,
      buyerLegalType: _buyerLegalType,
      buyerContractingType: _buyerContractingType,
      authorityActivityType,
      internalProjectId,
      projectNote,
      submissionMethodCode,
      languageId,
      touchPointName,
      touchPointWebsite,
      touchPointTelephone,
      touchPointEmail,
      touchPointAddressStreet,
      touchPointAddressPostalCode,
      touchPointCity,
      documentLinks,
    };
  } catch {
    return {} as any;
  }
}

