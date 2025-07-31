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

interface KVKSearchResult {
  data: {
    items: KVKCompany[];
    totalItems: number;
  };
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
  private baseUrl: string = 'https://api.kvk.nl/api/v1';
  private apiKey: string;
  private jwtSecret: string;
  private password: string;
  private useMockData: boolean;

  constructor() {
    // KVK_API_URL might actually be an API key based on the error
    this.apiKey = process.env.KVK_API_URL || '';
    this.jwtSecret = process.env.KVK_JWT_SECRET || '';
    this.password = process.env.KVK_PASSWORD || '';
    
    // Enable mock mode if API credentials are not configured or if explicitly set
    this.useMockData = process.env.USE_MOCK_KVK === 'true' || !this.apiKey;
    
    // Debug logging
    console.log('KVK API initialized with:');
    console.log('- API Key configured:', !!this.apiKey);
    console.log('- JWT Secret configured:', !!this.jwtSecret);
    console.log('- Password configured:', !!this.password);
    console.log('- Using mock data:', this.useMockData);
  }

  private generateToken(): string {
    // KVK API requires a JWT token with specific claims
    const payload = {
      username: 'TNXML08196', // This is typically the KVK username
      password: this.password,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600 // 1 hour expiry
    };

    return jwt.sign(payload, this.jwtSecret);
  }

  async searchByKvkNumber(kvkNumber: string): Promise<KVKCompany | null> {
    if (this.useMockData) {
      console.log('Using mock data for KVK number search:', kvkNumber);
      const company = MOCK_COMPANIES.find(c => c.kvkNumber === kvkNumber);
      return company || null;
    }

    try {
      // Try different API formats - some APIs use API key in headers, others in URL
      const url = `${this.baseUrl}/search/companies?kvkNumber=${kvkNumber}`;
      
      console.log('Searching KVK by number:', kvkNumber);
      console.log('Request URL:', url);
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      };

      // Try different authentication methods
      if (this.jwtSecret && this.password) {
        // JWT based auth
        const token = this.generateToken();
        headers['Authorization'] = `Bearer ${token}`;
      } else if (this.apiKey) {
        // API key based auth - try different header names
        headers['X-API-Key'] = this.apiKey;
        headers['apikey'] = this.apiKey;
      }
      
      const response = await fetch(url, {
        method: 'GET',
        headers,
        // Add timeout to prevent hanging requests
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('KVK API error:', response.status, errorText);
        
        // If we get a 401, we might be using the wrong auth method
        if (response.status === 401) {
          console.error('Authentication failed. Check your API credentials.');
        }
        
        return null;
      }

      const result: KVKSearchResult = await response.json();
      
      if (result.data.items.length > 0) {
        return result.data.items[0];
      }

      return null;
    } catch (error) {
      console.error('Error searching KVK:', error);
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
      const url = `${this.baseUrl}/search/companies?name=${encodeURIComponent(name)}&limit=${limit}`;
      
      console.log('Searching KVK by name:', name);
      console.log('Request URL:', url);
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      };

      // Try different authentication methods
      if (this.jwtSecret && this.password) {
        // JWT based auth
        const token = this.generateToken();
        headers['Authorization'] = `Bearer ${token}`;
      } else if (this.apiKey) {
        // API key based auth - try different header names
        headers['X-API-Key'] = this.apiKey;
        headers['apikey'] = this.apiKey;
      }
      
      const response = await fetch(url, {
        method: 'GET',
        headers,
        // Add timeout to prevent hanging requests
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('KVK API error:', response.status, errorText);
        
        // If we get a 401, we might be using the wrong auth method
        if (response.status === 401) {
          console.error('Authentication failed. Check your API credentials.');
        }
        
        return [];
      }

      const result: KVKSearchResult = await response.json();
      return result.data.items;
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

  // Transform KVK data to our format
  transformCompanyData(kvkData: KVKCompany) {
    const mainAddress = kvkData.addresses?.find(addr => addr.type === 'hoofdvestiging') || kvkData.addresses?.[0];
    
    return {
      kvkNumber: kvkData.kvkNumber,
      name: kvkData.name,
      legalForm: kvkData.legalForm,
      sbiCode: kvkData.businessActivity?.sbiCode,
      sbiDescription: kvkData.businessActivity?.sbiDescription,
      address: mainAddress ? {
        street: `${mainAddress.street} ${mainAddress.houseNumber}`,
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