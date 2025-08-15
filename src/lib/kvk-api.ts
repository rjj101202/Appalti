import jwt from 'jsonwebtoken';

interface KVKCompany {
  kvkNumber: string;
  name: string;
  legalForm?: string;
  businessActivity?: {
    sbiCode: string;
    sbiDescription: string;
  };
  addresses?: {
    type: string;
    street: string;
    houseNumber: string;
    postalCode: string;
    city: string;
  }[];
  hasEntryInBusinessRegister: boolean;
  employees?: string;
}

// Shapes for public KVK APIs we use
interface ZoekenV2Response {
  pagina: number;
  resultatenPerPagina: number;
  totaal: number;
  resultaten: Array<{
    kvkNummer: string;
    vestigingsnummer?: string;
    naam: string;
    adres?: {
      binnenlandsAdres?: {
        type?: string;
        straatnaam?: string;
        huisnummer?: number;
        huisletter?: string;
        postcode?: string;
        plaats?: string;
      };
      buitenlandsAdres?: {
        straatHuisnummer?: string;
        postcodeWoonplaats?: string;
        land?: string;
      }
    };
    type?: string;
  }>;
}

interface BasisprofielV1 {
  kvkNummer: string;
  naam?: string;
  statutaireNaam?: string;
  handelsnamen?: Array<{ naam: string }> | string[];
  sbiActiviteiten?: Array<{ sbiCode: string; sbiOmschrijving: string; indHoofdactiviteit?: boolean }>;
  adressen?: Array<{
    type?: string;
    volledigAdres?: string;
    straatnaam?: string;
    huisnummer?: string | number;
    huisnummerToevoeging?: string;
    huisletter?: string;
    postcode?: string;
    plaats?: string;
  }>;
  websites?: string[];
  // vestigingen-lijsten kunnen in verschillende secties voorkomen; we laten dit flexibel
  aantalCommercieleVestigingen?: number;
  aantalNietCommercieleVestigingen?: number;
  totaalAantalVestigingen?: number;
  vestigingen?: Array<{
    vestigingsnummer: string;
    eersteHandelsnaam?: string;
    volledigAdres?: string;
  }>;
}

interface VestigingsprofielV1 {
  vestigingsnummer: string;
  kvkNummer: string;
  eersteHandelsnaam?: string;
  handelsnamen?: Array<{ naam: string }> | string[];
  adressen?: Array<{
    type?: string;
    volledigAdres?: string;
    straatnaam?: string;
    huisnummer?: string | number;
    postcode?: string;
    plaats?: string;
  }>;
  websites?: string[];
  sbiActiviteiten?: Array<{ sbiCode: string; sbiOmschrijving: string; indHoofdactiviteit?: boolean }>;
}

interface NaamgevingenV1 {
  kvkNummer: string;
  naam?: string;
  statutaireNaam?: string;
  ookGenoemd?: string;
  vestigingen?: Array<{
    vestigingsnummer: string;
    eersteHandelsnaam?: string;
  }>;
}

export interface KVKAggregatedCompany {
  kvkNumber: string;
  rsin?: string;
  name?: string;                // hoofdnaam
  statutaireNaam?: string;
  handelsnamen?: string[];
  websites?: string[];
  sbiActiviteiten?: Array<{ sbiCode: string; omschrijving: string; hoofd?: boolean }>;
  adressen?: Array<{ type?: string; straat?: string; huisnummer?: string; postcode?: string; plaats?: string }>;
  vestigingen?: Array<{
    vestigingsnummer: string;
    naam?: string;
    adressen?: Array<{ type?: string; straat?: string; huisnummer?: string; postcode?: string; plaats?: string }>;
    websites?: string[];
    sbiActiviteiten?: Array<{ sbiCode: string; omschrijving: string; hoofd?: boolean }>;
  }>;
}

// Mock data for development
const MOCK_COMPANIES: KVKCompany[] = [
  {
    kvkNumber: '12345678',
    name: 'Jager Producties B.V.',
    legalForm: 'Besloten Vennootschap',
    businessActivity: {
      sbiCode: '62010',
      sbiDescription: 'Ontwikkelen, produceren en uitgeven van software'
    },
    addresses: [{
      type: 'hoofdvestiging',
      street: 'Hoofdstraat',
      houseNumber: '123',
      postalCode: '1234 AB',
      city: 'Amsterdam'
    }],
    hasEntryInBusinessRegister: true,
    employees: '10-50'
  },
  {
    kvkNumber: '87654321',
    name: 'Jansen Consultancy',
    legalForm: 'Eenmanszaak',
    businessActivity: {
      sbiCode: '70221',
      sbiDescription: 'Organisatie-adviesbureaus'
    },
    addresses: [{
      type: 'hoofdvestiging',
      street: 'Kerkstraat',
      houseNumber: '45',
      postalCode: '3456 CD',
      city: 'Utrecht'
    }],
    hasEntryInBusinessRegister: true,
    employees: '1-5'
  },
  {
    kvkNumber: '11223344',
    name: 'Jaguar Technologies',
    legalForm: 'Besloten Vennootschap',
    businessActivity: {
      sbiCode: '62090',
      sbiDescription: 'Overige dienstverlenende activiteiten op het gebied van informatietechnologie'
    },
    addresses: [{
      type: 'hoofdvestiging',
      street: 'Innovatielaan',
      houseNumber: '789',
      postalCode: '5678 EF',
      city: 'Eindhoven'
    }],
    hasEntryInBusinessRegister: true,
    employees: '50-100'
  }
];

class KVKAPIService {
  private baseUrlV1: string = 'https://api.kvk.nl/api/v1';
  private baseUrlV2: string = 'https://api.kvk.nl/api/v2';
  private apiKey: string;
  private jwtSecret: string;
  private password: string;
  private username: string;
  private useMockData: boolean;

  constructor() {
    // Use KVK_API for the API key
    this.apiKey = process.env.KVK_API || '';
    this.jwtSecret = process.env.KVK_JWT_SECRET || '';
    this.password = process.env.KVK_PASSWORD || '';
    this.username = process.env.KVK_USERNAME || 'TNXML08196';
    
    // Enable mock mode only if explicitly requested OR when neither API key nor JWT credentials are configured
    const hasApiKey = !!this.apiKey;
    const hasJwtCreds = !!this.jwtSecret && !!this.password;
    const mockFlag = (process.env.USE_MOCK_KVK || '').toLowerCase();
    const mockRequested = ['true', '1', 'yes', 'on'].includes(mockFlag);
    this.useMockData = mockRequested || (!hasApiKey && !hasJwtCreds);
    
    // Debug logging
    console.log('KVK API initialized with:');
    console.log('- API Key configured:', hasApiKey);
    console.log('- JWT Secret configured:', !!this.jwtSecret);
    console.log('- Password configured:', !!this.password);
    console.log('- Username configured:', !!process.env.KVK_USERNAME);
    console.log('- Using mock data:', this.useMockData);
    console.log('- Auth method:', hasApiKey ? 'apiKey' : (hasJwtCreds ? 'jwt' : 'mock'));
  }

  private buildHeaders(kind: 'name' | 'number'): Record<string, string> {
    const headers: Record<string, string> = {
      'Accept': 'application/json'
    };
    if (this.apiKey) {
      headers['apikey'] = this.apiKey;
      headers['X-API-Key'] = this.apiKey;
      console.log(`KVK auth method (${kind}): apiKey`);
    } else if (this.jwtSecret && this.password) {
      const token = this.generateToken();
      headers['Authorization'] = `Bearer ${token}`;
      console.log(`KVK auth method (${kind}): jwt`);
    }
    return headers;
  }

  private generateToken(): string {
    // KVK API requires a JWT token with specific claims
    const payload = {
      username: this.username,
      password: this.password,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600 // 1 hour expiry
    };

    return jwt.sign(payload, this.jwtSecret);
  }

  // Map Zoeken v2 item to our generic company shape (minimal)
  private mapZoekenItemToCompany(item: ZoekenV2Response['resultaten'][number]): KVKCompany {
    const b = item.adres?.binnenlandsAdres;
    return {
      kvkNumber: item.kvkNummer,
      name: item.naam,
      addresses: b ? [{
        type: 'bezoekadres',
        street: b.straatnaam || '',
        houseNumber: String(b.huisnummer || ''),
        postalCode: b.postcode || '',
        city: b.plaats || ''
      }] : [],
      hasEntryInBusinessRegister: true
    };
  }

  // Map Basisprofiel v1 to our shape
  private mapBasisprofielToCompany(bp: BasisprofielV1): KVKCompany {
    // Pick hoofdactiviteit indien aanwezig
    const hoofd = bp.sbiActiviteiten?.find(a => a.indHoofdactiviteit) || bp.sbiActiviteiten?.[0];
    const addr = bp.adressen?.[0];
    return {
      kvkNumber: bp.kvkNummer,
      name: bp.naam || bp.statutaireNaam || '',
      businessActivity: hoofd ? { sbiCode: hoofd.sbiCode, sbiDescription: hoofd.sbiOmschrijving } : undefined,
      addresses: addr ? [{
        type: addr.type || 'bezoekadres',
        street: addr.straatnaam || '',
        houseNumber: String(addr.huisnummer || ''),
        postalCode: addr.postcode || '',
        city: addr.plaats || ''
      }] : [],
      hasEntryInBusinessRegister: true
    };
  }

  async searchByKvkNumber(kvkNumber: string): Promise<KVKCompany | null> {
    if (this.useMockData) {
      console.log('Using mock data for KVK number search:', kvkNumber);
      const company = MOCK_COMPANIES.find(c => c.kvkNumber === kvkNumber);
      return company || null;
    }

    try {
      // Basisprofiel v1 supports path segment or query; we use path segment
      const url = `${this.baseUrlV1}/basisprofielen/${kvkNumber}`;
      console.log('Searching KVK (basisprofiel) by number:', kvkNumber);
      console.log('Request URL:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: this.buildHeaders('number'),
        signal: AbortSignal.timeout(10000)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('KVK API error:', response.status, errorText);
        if (response.status === 401) {
          console.error('Authentication failed. Check your API credentials.');
        }
        return null;
      }

      const bp: BasisprofielV1 = await response.json();
      return this.mapBasisprofielToCompany(bp);
    } catch (error) {
      console.error('Error searching KVK (basisprofiel):', error);
      if (error instanceof Error) {
        console.error('Error details:', error.message);
        console.error('Error stack:', error.stack);
      }
      return null;
    }
  }

  async searchByName(name: string, limit: number = 10): Promise<KVKCompany[]> {
    if (this.useMockData) {
      console.log('Using mock data for name search:', name);
      const searchTerm = name.toLowerCase();
      const filtered = MOCK_COMPANIES.filter(company => 
        company.name.toLowerCase().includes(searchTerm)
      );
      return filtered.slice(0, limit);
    }

    try {
      // Zoeken v2 expects parameter naam and resultatenPerPagina
      const url = `${this.baseUrlV2}/zoeken?naam=${encodeURIComponent(name)}&resultatenPerPagina=${limit}`;
      console.log('Searching KVK by name:', name);
      console.log('Request URL:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: this.buildHeaders('name'),
        signal: AbortSignal.timeout(10000)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('KVK API error:', response.status, errorText);
        if (response.status === 401) {
          console.error('Authentication failed. Check your API credentials.');
        }
        return [];
      }

      const result: ZoekenV2Response = await response.json();
      return (result.resultaten || []).map(item => this.mapZoekenItemToCompany(item));
    } catch (error) {
      console.error('Error searching KVK by name:', error);
      if (error instanceof Error) {
        console.error('Error details:', error.message);
        console.error('Error stack:', error.stack);
      }
      // Return empty array instead of throwing
      return [];
    }
  }

  // New: direct fetch helpers
  async getBasisprofiel(kvkNumber: string): Promise<BasisprofielV1 | null> {
    if (this.useMockData) {
      const m = MOCK_COMPANIES.find(c => c.kvkNumber === kvkNumber);
      if (!m) return null;
      return {
        kvkNummer: m.kvkNumber,
        naam: m.name,
        adressen: m.addresses?.map(a => ({ type: a.type, straatnaam: a.street, huisnummer: a.houseNumber, postcode: a.postalCode, plaats: a.city }))
      } as BasisprofielV1;
    }
    const url = `${this.baseUrlV1}/basisprofielen/${kvkNumber}`;
    const res = await fetch(url, { headers: this.buildHeaders('number'), signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;
    return res.json();
  }

  async getVestigingsprofiel(vestigingsnummer: string): Promise<VestigingsprofielV1 | null> {
    if (this.useMockData) {
      return null; // not modeling vestiging in mock
    }
    const url = `${this.baseUrlV1}/vestigingsprofielen/${vestigingsnummer}`;
    const res = await fetch(url, { headers: this.buildHeaders('number'), signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;
    return res.json();
  }

  async getNaamgevingen(kvkNumber: string): Promise<NaamgevingenV1 | null> {
    if (this.useMockData) {
      return { kvkNummer: kvkNumber, naam: 'Mock', vestigingen: [] } as NaamgevingenV1;
    }
    const url = `${this.baseUrlV1}/naamgevingen/kvknummer?kvkNummer=${kvkNumber}`;
    const res = await fetch(url, { headers: this.buildHeaders('number'), signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;
    return res.json();
  }

  // Aggregate full company from KVK (best effort)
  async getAggregatedCompany(kvkNumber: string, maxVestigingen: number = 10): Promise<KVKAggregatedCompany | null> {
    const bp = await this.getBasisprofiel(kvkNumber);
    if (!bp) return null;

    const handelsnamen: string[] = Array.isArray(bp.handelsnamen)
      ? (bp.handelsnamen as any[]).map(h => typeof h === 'string' ? h : h.naam)
      : [];

    const sbi = (bp.sbiActiviteiten || []).map(a => ({ sbiCode: a.sbiCode, omschrijving: a.sbiOmschrijving, hoofd: !!a.indHoofdactiviteit }));

    const adressen = (bp.adressen || []).map(a => ({
      type: a.type,
      straat: a.straatnaam,
      huisnummer: String(a.huisnummer || ''),
      postcode: a.postcode,
      plaats: a.plaats
    }));

    // Try naamgevingen to get full vestiging list
    const ng = await this.getNaamgevingen(kvkNumber);
    const vestigingIds = (ng?.vestigingen || []).slice(0, maxVestigingen).map(v => v.vestigingsnummer);

    const vestigingen: KVKAggregatedCompany['vestigingen'] = [];
    for (const id of vestigingIds) {
      const vp = await this.getVestigingsprofiel(id);
      if (!vp) continue;
      const vAddrs = (vp.adressen || []).map(a => ({
        type: a.type,
        straat: a.straatnaam,
        huisnummer: String(a.huisnummer || ''),
        postcode: a.postcode,
        plaats: a.plaats
      }));
      const vSbi = (vp.sbiActiviteiten || []).map(a => ({ sbiCode: a.sbiCode, omschrijving: a.sbiOmschrijving, hoofd: !!a.indHoofdactiviteit }));
      const vHandels = Array.isArray(vp.handelsnamen) ? (vp.handelsnamen as any[]).map(h => typeof h === 'string' ? h : h.naam) : [];
      vestigingen.push({
        vestigingsnummer: vp.vestigingsnummer,
        naam: vp.eersteHandelsnaam || vHandels[0],
        adressen: vAddrs,
        websites: vp.websites,
        sbiActiviteiten: vSbi
      });
    }

    return {
      kvkNumber: bp.kvkNummer,
      name: bp.naam || bp.statutaireNaam,
      statutaireNaam: bp.statutaireNaam,
      handelsnamen,
      websites: bp.websites,
      sbiActiviteiten: sbi,
      adressen,
      vestigingen
    };
  }

  // Transform kept for backwards compatibility (callers already use it)
  transformCompanyData(kvkData: KVKCompany) {
    const mainAddress = kvkData.addresses?.[0];
    
    return {
      kvkNumber: kvkData.kvkNumber,
      name: kvkData.name,
      legalForm: kvkData.legalForm,
      sbiCode: kvkData.businessActivity?.sbiCode,
      sbiDescription: kvkData.businessActivity?.sbiDescription,
      address: mainAddress ? {
        street: `${mainAddress.street || ''} ${mainAddress.houseNumber || ''}`.trim(),
        postalCode: mainAddress.postalCode,
        city: mainAddress.city
      } : null,
      employees: kvkData.employees,
      hasEntryInBusinessRegister: kvkData.hasEntryInBusinessRegister
    };
  }
}

// Export singleton instance
export const kvkAPI = new KVKAPIService();