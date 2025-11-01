'use client';

import { useState } from 'react';
import { CPV_CODES, searchCPVCodes, getPopularCPVCodes } from '@/lib/cpv-codes';

interface CPVCodeSelectorProps {
  selectedCodes: string[];
  onChange: (codes: string[]) => void;
}

export default function CPVCodeSelector({ selectedCodes, onChange }: CPVCodeSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  const results = searchQuery.length >= 2 ? searchCPVCodes(searchQuery) : getPopularCPVCodes();

  const toggleCode = (code: string) => {
    if (selectedCodes.includes(code)) {
      onChange(selectedCodes.filter(c => c !== code));
    } else {
      onChange([...selectedCodes, code]);
    }
  };

  const getCodeDescription = (code: string) => {
    const cpv = CPV_CODES.find(c => c.code === code);
    return cpv?.description || code;
  };

  return (
    <div style={{ position: 'relative' }}>
      {/* Selected codes */}
      {selectedCodes.length > 0 && (
        <div style={{ marginBottom: '0.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
          {selectedCodes.map(code => (
            <span key={code} style={{ backgroundColor: '#f3e8ff', color: '#701c74', padding: '0.25rem 0.5rem', borderRadius: 4, fontSize: '0.85em', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
              {code}
              <button onClick={() => toggleCode(code)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1em', lineHeight: 1, color: '#701c74' }}>×</button>
            </span>
          ))}
        </div>
      )}

      {/* Search input */}
      <input
        type="text"
        placeholder="Zoek CPV code of omschrijving..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        onFocus={() => setShowDropdown(true)}
        style={{ width: '100%' }}
      />

      {/* Dropdown */}
      {showDropdown && (
        <>
          <div 
            style={{ position: 'fixed', inset: 0, zIndex: 10 }} 
            onClick={() => setShowDropdown(false)}
          />
          <div style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            maxHeight: 400,
            overflowY: 'auto',
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: 6,
            marginTop: 4,
            boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
            zIndex: 20
          }}>
            <div style={{ padding: '0.5rem', borderBottom: '1px solid #e5e7eb', fontSize: '0.85em', color: '#6b7280' }}>
              {searchQuery.length >= 2 ? `${results.length} resultaten` : 'Populaire codes'}
            </div>
            {results.map((cpv) => {
              const isSelected = selectedCodes.includes(cpv.code);
              return (
                <div
                  key={cpv.code}
                  onClick={() => toggleCode(cpv.code)}
                  style={{
                    padding: '0.75rem',
                    cursor: 'pointer',
                    backgroundColor: isSelected ? '#f3e8ff' : 'white',
                    borderBottom: '1px solid #f3f4f6',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => !isSelected && (e.currentTarget.style.backgroundColor = '#f9fafb')}
                  onMouseLeave={(e) => !isSelected && (e.currentTarget.style.backgroundColor = 'white')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      readOnly
                      style={{ cursor: 'pointer' }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.9em', color: '#111827', marginBottom: '0.25rem' }}>
                        {cpv.code}
                      </div>
                      <div style={{ fontSize: '0.85em', color: '#6b7280' }}>
                        {cpv.description}
                      </div>
                      <div style={{ fontSize: '0.75em', color: '#9ca3af', marginTop: '0.25rem' }}>
                        {cpv.level}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

