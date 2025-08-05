'use client';

import { useState } from 'react';
import { WeightedItem } from '@/types/ikp';

interface WeightedItemsInputProps {
  items: WeightedItem[];
  onItemsChange: (items: WeightedItem[]) => void;
  placeholder?: string;
  label?: string;
}

export default function WeightedItemsInput({ 
  items, 
  onItemsChange, 
  placeholder = "Voer item in...",
  label = "Item"
}: WeightedItemsInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [inputWeight, setInputWeight] = useState(10);

  const addItem = () => {
    if (inputValue.trim()) {
      const newItem: WeightedItem = {
        id: `item-${Date.now()}`,
        value: inputValue.trim(),
        weight: inputWeight
      };
      onItemsChange([...items, newItem]);
      setInputValue('');
      setInputWeight(10);
    }
  };

  const removeItem = (id: string) => {
    onItemsChange(items.filter(item => item.id !== id));
  };

  const updateItem = (id: string, field: 'value' | 'weight', value: string | number) => {
    onItemsChange(items.map(item => 
      item.id === id 
        ? { ...item, [field]: field === 'weight' ? Number(value) : value }
        : item
    ));
  };

  return (
    <div className="weighted-items-input">
      <div className="form-group">
        <label>{label}</label>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={placeholder}
            style={{ flex: 1 }}
            onKeyPress={(e) => e.key === 'Enter' && addItem()}
          />
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <label style={{ fontSize: '0.875rem' }}>Weging</label>
            <input
              type="number"
              value={inputWeight}
              onChange={(e) => setInputWeight(parseInt(e.target.value) || 10)}
              min="1"
              max="100"
              style={{ width: '80px' }}
            />
          </div>
          
          <button 
            onClick={addItem} 
            className="btn btn-primary"
            disabled={!inputValue.trim()}
            type="button"
          >
            Toevoegen
          </button>
        </div>
      </div>

      {/* List of added items */}
      {items.length > 0 && (
        <div className="added-items" style={{ marginTop: '1.5rem' }}>
          <div className="items-list">
            {items.map((item) => (
              <div key={item.id} className="item-row" style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '1rem', 
                padding: '0.75rem',
                backgroundColor: '#f8f9fa',
                borderRadius: '4px',
                marginBottom: '0.5rem'
              }}>
                <input
                  type="text"
                  value={item.value}
                  onChange={(e) => updateItem(item.id, 'value', e.target.value)}
                  style={{ flex: 1, border: '1px solid #e5e7eb', borderRadius: '4px', padding: '0.5rem' }}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.875rem' }}>Weging:</label>
                  <input
                    type="number"
                    value={item.weight}
                    onChange={(e) => updateItem(item.id, 'weight', e.target.value)}
                    min="1"
                    max="100"
                    style={{ width: '60px' }}
                  />
                </div>
                <button 
                  onClick={() => removeItem(item.id)} 
                  className="btn btn-sm btn-danger"
                  style={{ padding: '0.25rem 0.5rem' }}
                  type="button"
                >
                  Verwijderen
                </button>
              </div>
            ))}
          </div>
          <div style={{ marginTop: '1rem', fontSize: '0.875rem', color: '#6b7280' }}>
            Totaal gewicht: {items.reduce((sum, item) => sum + item.weight, 0)}
          </div>
        </div>
      )}
    </div>
  );
}