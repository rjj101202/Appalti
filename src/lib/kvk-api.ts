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

class KVKAPIService {
  private baseUrl: string;
  private jwtSecret: string;
  private password: string;

  constructor() {
    this.baseUrl = process.env.KVK_API_URL || 'https://api.kvk.nl/api/v1';
    this.jwtSecret = process.env.KVK_JWT_SECRET || '';
    this.password = process.env.KVK_PASSWORD || '';
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
    try {
      const token = this.generateToken();
      
      const response = await fetch(`${this.baseUrl}/search/companies?kvkNumber=${kvkNumber}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        console.error('KVK API error:', response.status, await response.text());
        return null;
      }

      const result: KVKSearchResult = await response.json();
      
      if (result.data.items.length > 0) {
        return result.data.items[0];
      }

      return null;
    } catch (error) {
      console.error('Error searching KVK:', error);
      return null;
    }
  }

  async searchByName(name: string, limit: number = 10): Promise<KVKCompany[]> {
    try {
      const token = this.generateToken();
      
      const response = await fetch(
        `${this.baseUrl}/search/companies?name=${encodeURIComponent(name)}&limit=${limit}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        console.error('KVK API error:', response.status, await response.text());
        return [];
      }

      const result: KVKSearchResult = await response.json();
      return result.data.items;
    } catch (error) {
      console.error('Error searching KVK by name:', error);
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