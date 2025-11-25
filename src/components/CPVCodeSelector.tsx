'use client';

import { useState, useEffect } from 'react';

interface CPVCode {
  code: string;
  coreCode: string;
  checkDigit: number;
  description: string;
  level: 'Divisie' | 'Groep' | 'Klasse' | 'Categorie';
  tenderNedCompatible: boolean;
}

export default function CPVCodeSelector({ selectedCodes, onChange }: { selectedCodes: string[]; onChange: (codes: string[]) => void }) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [allCodes, setAllCodes] = useState<CPVCode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Laad alle CPV codes client-side (1.7 MB, maar wordt gecached)
  useEffect(() => {
    fetch('/cpv-codes.json')
      .then(r => r.json())
      .then(data => {
        // Laad ALLE codes (ook non-TenderNed compatible) zodat gebruikers alle codes kunnen vinden
        setAllCodes(data);
        setIsLoading(false);
      })
      .catch(err => {
        console.error('Failed to load CPV codes:', err);
        setIsLoading(false);
      });
  }, []);
  
  // Zoek in ALLE codes
  const searchCodes = (query: string): CPVCode[] => {
    if (!query || query.length < 2) {
      // Toon Klasse codes by default (meest gebruikt)
      return allCodes.filter(c => c.level === 'Klasse').slice(0, 20);
    }
    
    const lowerQuery = query.toLowerCase();
    const matches = allCodes.filter(cpv => {
      const descMatch = cpv.description.toLowerCase().includes(lowerQuery);
      const codeMatch = cpv.code.includes(query);
      const coreCodeMatch = cpv.coreCode.includes(query);
      return descMatch || codeMatch || coreCodeMatch;
    });
    
    // Sorteer: exact matches eerst, dan description matches
    return matches.sort((a, b) => {
      // Prioriteit 1: Exact code match
      const aCodeMatch = a.code === query || a.coreCode === query;
      const bCodeMatch = b.code === query || b.coreCode === query;
      if (aCodeMatch && !bCodeMatch) return -1;
      if (!aCodeMatch && bCodeMatch) return 1;
      
      // Prioriteit 2: Description starts with query
      const aStartsWith = a.description.toLowerCase().startsWith(lowerQuery);
      const bStartsWith = b.description.toLowerCase().startsWith(lowerQuery);
      if (aStartsWith && !bStartsWith) return -1;
      if (!aStartsWith && bStartsWith) return 1;
      
      return 0;
    }).slice(0, 50); // Max 50 resultaten
  };
  
  const results = searchCodes(search);

  return (
    <div style={{ position: 'relative' }}>
      {selectedCodes.length > 0 && (
        <div style={{ marginBottom: '0.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
          {selectedCodes.map(code => (
            <span key={code} style={{ backgroundColor: '#f3e8ff', color: '#701c74', padding: '0.25rem 0.5rem', borderRadius: 4, fontSize: '0.85em' }}>
              {code} <button onClick={() => onChange(selectedCodes.filter(c => c !== code))} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>×</button>
            </span>
          ))}
        </div>
      )}
      <input
        placeholder={isLoading ? "CPV codes laden..." : "Zoek CPV code of beschrijving... (bijv. '64200000', 'telecommunicatie', 'software')"}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        onFocus={() => setOpen(true)}
        disabled={isLoading}
        style={{ width: '100%' }}
      />
      {open && !isLoading && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 10 }} onClick={() => setOpen(false)} />
          <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, maxHeight: 300, overflowY: 'auto', backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: 6, marginTop: 4, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 20 }}>
            {results.length === 0 ? (
              <div style={{ padding: '1rem', textAlign: 'center', color: '#6b7280' }}>
                {search.length < 2 ? 'Type minimaal 2 karakters om te zoeken' : 'Geen codes gevonden'}
              </div>
            ) : (
              results.map((cpv) => (
                <div key={cpv.code} onClick={() => { 
                  if (!selectedCodes.includes(cpv.code)) {
                    onChange([...selectedCodes, cpv.code]); 
                  }
                  setOpen(false); 
                  setSearch('');
                }} style={{ 
                  padding: '0.75rem', 
                  cursor: 'pointer', 
                  borderBottom: '1px solid #f3f4f6',
                  background: 'white'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.9em', color: '#701c74' }}>{cpv.code}</div>
                      <div style={{ fontSize: '0.85em', color: '#6b7280' }}>{cpv.description}</div>
                    </div>
                  </div>
                </div>
              ))
            )}
            {results.length > 0 && (
              <div style={{ padding: '0.5rem', textAlign: 'center', fontSize: '0.75em', color: '#9ca3af', borderTop: '1px solid #f3f4f6' }}>
                {results.length} van {allCodes.length} codes • Alle EU CPV codes beschikbaar
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
