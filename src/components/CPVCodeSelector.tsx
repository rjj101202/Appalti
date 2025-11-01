'use client';

import { useState } from 'react';
import { CPV_CODES, searchCPVCodes } from '@/lib/cpv-codes';

export default function CPVCodeSelector({ selectedCodes, onChange }: { selectedCodes: string[]; onChange: (codes: string[]) => void }) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const results = search.length >= 2 ? searchCPVCodes(search) : CPV_CODES.filter(c => c.level === 'Divisie').slice(0, 10);

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
        placeholder="Zoek CPV code..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        onFocus={() => setOpen(true)}
        style={{ width: '100%' }}
      />
      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 10 }} onClick={() => setOpen(false)} />
          <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, maxHeight: 300, overflowY: 'auto', backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: 6, marginTop: 4, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 20 }}>
            {results.map((cpv) => (
              <div key={cpv.code} onClick={() => { onChange([...selectedCodes, cpv.code]); setOpen(false); }} style={{ padding: '0.75rem', cursor: 'pointer', borderBottom: '1px solid #f3f4f6' }}>
                <div style={{ fontWeight: 600, fontSize: '0.9em' }}>{cpv.code}</div>
                <div style={{ fontSize: '0.85em', color: '#6b7280' }}>{cpv.description}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
