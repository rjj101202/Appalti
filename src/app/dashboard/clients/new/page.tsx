'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import Link from 'next/link';

export default function NewClientPage() {
  const router = useRouter();
  const [step, setStep] = useState(1); // 1: KVK Search, 2: Company Details, 3: IKP
  const [kvkNumber, setKvkNumber] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [companyData, setCompanyData] = useState<any>(null);
  const [cpvCodes, setCpvCodes] = useState<string[]>([]);
  const [newCpvCode, setNewCpvCode] = useState('');

  const handleKvkSearch = async () => {
    if (!kvkNumber || kvkNumber.length !== 8) {
      alert('Voer een geldig 8-cijferig KVK nummer in');
      return;
    }

    setIsSearching(true);
    
    // Simuleer KVK API call
    setTimeout(() => {
      setCompanyData({
        name: 'Voorbeeld Bedrijf B.V.',
        kvkNumber: kvkNumber,
        address: 'Hoofdstraat 123, 1234 AB Amsterdam',
        sbiCode: '62010',
        sbiDescription: 'Ontwikkelen van software',
        employees: '10-50'
      });
      setIsSearching(false);
      setStep(2);
    }, 1000);
  };

  const handleAddCpvCode = () => {
    if (newCpvCode && !cpvCodes.includes(newCpvCode)) {
      setCpvCodes([...cpvCodes, newCpvCode]);
      setNewCpvCode('');
    }
  };

  const handleRemoveCpvCode = (code: string) => {
    setCpvCodes(cpvCodes.filter(c => c !== code));
  };

  const handleSubmit = () => {
    // Hier zou je naar de API sturen
    console.log('Saving client company:', {
      ...companyData,
      cpvCodes
    });
    
    // Redirect naar clients overzicht
    router.push('/dashboard/clients');
  };

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <Link href="/dashboard/clients" className="text-gray-600 hover:text-gray-900 text-sm">
            ← Terug naar overzicht
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">Nieuwe Client Company Toevoegen</h1>
        </div>

        {/* Progress indicator */}
        <div className="mb-8">
          <div className="flex items-center">
            <div className={`flex items-center ${step >= 1 ? 'text-purple-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-purple-600 text-white' : 'bg-gray-300'}`}>
                1
              </div>
              <span className="ml-2 text-sm font-medium">KVK Zoeken</span>
            </div>
            <div className={`flex-1 h-0.5 mx-4 ${step >= 2 ? 'bg-purple-600' : 'bg-gray-300'}`} />
            <div className={`flex items-center ${step >= 2 ? 'text-purple-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-purple-600 text-white' : 'bg-gray-300'}`}>
                2
              </div>
              <span className="ml-2 text-sm font-medium">Bedrijfsgegevens</span>
            </div>
            <div className={`flex-1 h-0.5 mx-4 ${step >= 3 ? 'bg-purple-600' : 'bg-gray-300'}`} />
            <div className={`flex items-center ${step >= 3 ? 'text-purple-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 3 ? 'bg-purple-600 text-white' : 'bg-gray-300'}`}>
                3
              </div>
              <span className="ml-2 text-sm font-medium">IKP Profiel</span>
            </div>
          </div>
        </div>

        {/* Step 1: KVK Search */}
        {step === 1 && (
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Zoek bedrijf op KVK nummer</h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="kvk" className="block text-sm font-medium text-gray-700">
                  KVK Nummer
                </label>
                <div className="mt-1 flex rounded-md shadow-sm">
                  <input
                    type="text"
                    id="kvk"
                    className="flex-1 block w-full rounded-md border-gray-300 focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                    placeholder="12345678"
                    value={kvkNumber}
                    onChange={(e) => setKvkNumber(e.target.value.replace(/\D/g, '').slice(0, 8))}
                    onKeyPress={(e) => e.key === 'Enter' && handleKvkSearch()}
                  />
                  <button
                    type="button"
                    onClick={handleKvkSearch}
                    disabled={isSearching}
                    className="ml-3 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50"
                  >
                    {isSearching ? 'Zoeken...' : 'Zoeken'}
                  </button>
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  Voer het 8-cijferige KVK nummer in van het bedrijf
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Company Details */}
        {step === 2 && companyData && (
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Bedrijfsgegevens</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Bedrijfsnaam</label>
                  <p className="mt-1 text-sm text-gray-900">{companyData.name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">KVK Nummer</label>
                  <p className="mt-1 text-sm text-gray-900">{companyData.kvkNumber}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">SBI Code</label>
                  <p className="mt-1 text-sm text-gray-900">{companyData.sbiCode} - {companyData.sbiDescription}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Aantal medewerkers</label>
                  <p className="mt-1 text-sm text-gray-900">{companyData.employees}</p>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Adres</label>
                  <p className="mt-1 text-sm text-gray-900">{companyData.address}</p>
                </div>
              </div>

              {/* CPV Codes */}
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  CPV Codes (voor tender matching)
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={newCpvCode}
                    onChange={(e) => setNewCpvCode(e.target.value)}
                    placeholder="bijv. 79000000-4"
                    className="flex-1 rounded-md border-gray-300 shadow-sm focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                  />
                  <button
                    type="button"
                    onClick={handleAddCpvCode}
                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Toevoegen
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {cpvCodes.map((code) => (
                    <span
                      key={code}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800"
                    >
                      {code}
                      <button
                        type="button"
                        onClick={() => handleRemoveCpvCode(code)}
                        className="ml-2 text-purple-600 hover:text-purple-800"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Vorige
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700"
                >
                  Volgende: IKP Profiel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: IKP Profile (simplified for now) */}
        {step === 3 && (
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">IKP Profiel</h2>
            <p className="text-sm text-gray-600 mb-6">
              Het Ideaal Klant Profiel (IKP) wordt gebruikt voor intelligente tender matching.
            </p>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-6">
              <p className="text-sm text-yellow-800">
                <strong>Let op:</strong> Het volledige IKP formulier met 15 stappen wordt in de volgende fase geïmplementeerd.
                Voor nu kunt u de client company opslaan en later het IKP profiel invullen.
              </p>
            </div>

            <div className="flex justify-between">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Vorige
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700"
              >
                Client Company Opslaan
              </button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}