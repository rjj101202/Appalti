'use client';

import { useState, useEffect } from 'react';
import { IKPData, IKP_OPTIONS, WeightedItem } from '@/types/ikp';
import { IKP_STEPS } from '@/config/ikp-steps';
import WeightedItemsInput from './WeightedItemsInput';

interface IKPFormProps {
  initialData?: Partial<IKPData>;
  clientCompanyId?: string;
  onSave: (data: IKPData) => void;
  onCancel: () => void;
}

// Geographic scope item with weight
interface GeographicScopeItem {
  id: string;
  name: string;
  weight: number;
}

// Employee count item with weight
interface EmployeeCountItem {
  id: string;
  range: string;
  weight: number;
}

export default function IKPForm({ initialData, clientCompanyId, onSave, onCancel }: IKPFormProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<Partial<IKPData>>(initialData || {});
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Special states for multi-select with weights
  const [geoScopeItems, setGeoScopeItems] = useState<GeographicScopeItem[]>([]);
  const [employeeCountItems, setEmployeeCountItems] = useState<EmployeeCountItem[]>([]);
  const [contractValueItems, setContractValueItems] = useState<GeographicScopeItem[]>([]);
  const [collaborationItems, setCollaborationItems] = useState<GeographicScopeItem[]>([]);
  
  // Kraljic matrix scores
  const [kraljicScores, setKraljicScores] = useState<Record<string, number>>({
    'supplier_all_leverancier': 0,
    'preferred_supplier': 0,
    'solution_partner': 10,
    'strategic_partner': 10,
    'trusted_partner': 10
  });

  // Initialize form data
  useEffect(() => {
    if (!formData.metadata) {
      setFormData(prev => ({
        ...prev,
        metadata: {
          createdAt: new Date(),
          updatedAt: new Date(),
          completedSteps: 0,
          lastCompletedStep: 0,
          totalScore: 0,
          ckvPassed: false
        }
      }));
    }
    
    // Initialize states from existing data
    if (formData.geographicScope && formData.geographicScope.length > 0) {
      const items = formData.geographicScope.map((name, index) => ({
        id: `geo-${index}`,
        name,
        weight: formData.geographicScopeWeights?.[name] || 10
      }));
      setGeoScopeItems(items);
    }
    
    // Initialize weighted items
    if (!formData.clientTypes) setFormData(prev => ({ ...prev, clientTypes: [] }));
    if (!formData.industry) setFormData(prev => ({ ...prev, industry: [] }));
    if (!formData.clientDNA) setFormData(prev => ({ ...prev, clientDNA: [] }));
    if (!formData.competitionType) setFormData(prev => ({ ...prev, competitionType: [] }));
    if (!formData.competitionCount) setFormData(prev => ({ ...prev, competitionCount: [] }));
    if (!formData.potentialServices) setFormData(prev => ({ ...prev, potentialServices: [] }));
    if (!formData.additionalServices) setFormData(prev => ({ ...prev, additionalServices: [] }));
    if (!formData.issues) setFormData(prev => ({ ...prev, issues: [] }));
    if (!formData.grossMargin) setFormData(prev => ({ ...prev, grossMargin: [] }));
    
    // Initialize Kraljic positions from data if exists
    if (formData.kraljicPosition) {
      setKraljicScores(formData.kraljicPosition);
    }
  }, []);

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};
    
    switch (step) {
      case 1: // Geographic scope
        if (geoScopeItems.length === 0) {
          newErrors.geographicScope = 'Voeg minimaal één provincie toe';
        }
        break;
      case 2: // Employee count
        if (employeeCountItems.length === 0) {
          newErrors.employeeCount = 'Voeg minimaal één categorie toe';
        }
        break;
      case 3: // Client types
        if (!formData.clientTypes || formData.clientTypes.length === 0) {
          newErrors.clientTypes = 'Voeg minimaal één type opdrachtgever toe';
        }
        break;
      case 4: // Industry
        if (!formData.industry || formData.industry.length === 0) {
          newErrors.industry = 'Voeg minimaal één branche toe';
        }
        break;
      case 15: // Creditworthiness
        if (!formData.creditworthiness) {
          newErrors.creditworthiness = 'Selecteer ja of nee';
        }
        break;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      // Save data based on current step
      if (currentStep === 1) {
        const provinces = geoScopeItems.map(item => item.name);
        const weights: Record<string, number> = {};
        geoScopeItems.forEach(item => {
          weights[item.name] = item.weight;
        });
        setFormData(prev => ({
          ...prev,
          geographicScope: provinces,
          geographicScopeWeights: weights
        }));
      } else if (currentStep === 2) {
        const ranges = employeeCountItems.map(item => item.range);
        const weights: Record<string, number> = {};
        employeeCountItems.forEach(item => {
          weights[item.range] = item.weight;
        });
        setFormData(prev => ({
          ...prev,
          employeeCount: ranges,
          employeeCountWeights: weights
        }));
      } else if (currentStep === 8) {
        setFormData(prev => ({
          ...prev,
          kraljicPosition: kraljicScores
        }));
      } else if (currentStep === 12) {
        const values = contractValueItems.map(item => item.name);
        const weights: Record<string, number> = {};
        contractValueItems.forEach(item => {
          weights[item.name] = item.weight;
        });
        setFormData(prev => ({
          ...prev,
          contractValue: values,
          contractValueWeights: weights
        }));
      } else if (currentStep === 14) {
        const durations = collaborationItems.map(item => item.name);
        const weights: Record<string, number> = {};
        collaborationItems.forEach(item => {
          weights[item.name] = item.weight;
        });
        setFormData(prev => ({
          ...prev,
          collaborationDuration: durations,
          collaborationDurationWeights: weights
        }));
      }
      
      setFormData(prev => ({
        ...prev,
        metadata: {
          ...prev.metadata!,
          lastCompletedStep: Math.max(currentStep, prev.metadata?.lastCompletedStep || 0),
          completedSteps: Math.max(currentStep, prev.metadata?.completedSteps || 0),
          updatedAt: new Date()
        }
      }));
      
      if (currentStep < 15) {
        setCurrentStep(currentStep + 1);
      }
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = () => {
    if (validateStep(currentStep)) {
      onSave(formData as IKPData);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return <Step1GeographicScope 
          geoScopeItems={geoScopeItems} 
          setGeoScopeItems={setGeoScopeItems} 
          errors={errors} 
        />;
      case 2:
        return <Step2EmployeeCount 
          employeeCountItems={employeeCountItems}
          setEmployeeCountItems={setEmployeeCountItems}
          errors={errors} 
        />;
      case 3:
        return <Step3ClientTypes formData={formData} setFormData={setFormData} errors={errors} />;
      case 4:
        return <Step4Industry formData={formData} setFormData={setFormData} errors={errors} />;
      case 5:
        return <Step5ClientDNA formData={formData} setFormData={setFormData} errors={errors} />;
      case 6:
        return <Step6CompetitionType formData={formData} setFormData={setFormData} errors={errors} />;
      case 7:
        return <Step7CompetitionCount formData={formData} setFormData={setFormData} errors={errors} />;
      case 8:
        return <Step8KraljicMatrix 
          kraljicScores={kraljicScores}
          setKraljicScores={setKraljicScores}
          errors={errors} 
        />;
      case 9:
        return <Step9PotentialServices formData={formData} setFormData={setFormData} errors={errors} />;
      case 10:
        return <Step10AdditionalServices formData={formData} setFormData={setFormData} errors={errors} />;
      case 11:
        return <Step11Issues formData={formData} setFormData={setFormData} errors={errors} />;
      case 12:
        return <Step12ContractValue 
          contractValueItems={contractValueItems}
          setContractValueItems={setContractValueItems}
          errors={errors} 
        />;
      case 13:
        return <Step13GrossMargin formData={formData} setFormData={setFormData} errors={errors} />;
      case 14:
        return <Step14CollaborationDuration 
          collaborationItems={collaborationItems}
          setCollaborationItems={setCollaborationItems}
          errors={errors} 
        />;
      case 15:
        return <Step15Creditworthiness formData={formData} setFormData={setFormData} errors={errors} />;
      default:
        return null;
    }
  };

  const currentStepInfo = IKP_STEPS[currentStep - 1];

  return (
    <div className="ikp-form-container">
      {/* Progress bar */}
      <div className="ikp-progress">
        <div className="ikp-progress-bar">
          <div 
            className="ikp-progress-fill" 
            style={{ width: `${(currentStep / 15) * 100}%` }}
          />
        </div>
        <div className="ikp-progress-text">
          Stap {currentStep} van 15: {currentStepInfo.title}
          {currentStepInfo.scoreType === 'CKV' && (
            <span className="badge badge-danger" style={{ marginLeft: '8px' }}>CKV - Harde eis</span>
          )}
          {currentStepInfo.scoreType === 'percentage' && (
            <span className="badge badge-info" style={{ marginLeft: '8px' }}>{currentStepInfo.score}%</span>
          )}
        </div>
      </div>

      {/* Form content */}
      <div className="ikp-form-content">
        <h2>{currentStepInfo.title}</h2>
        <p className="ikp-step-description">{currentStepInfo.description}</p>
        
        {renderStepContent()}
      </div>

      {/* Navigation buttons */}
      <div className="ikp-form-actions">
        <button 
          onClick={handlePrevious} 
          disabled={currentStep === 1}
          className="btn btn-secondary"
        >
          Vorige
        </button>
        
        <button onClick={onCancel} className="btn btn-secondary">
          Opslaan & Sluiten
        </button>
        
        {currentStep < 15 ? (
          <button onClick={handleNext} className="btn btn-primary">
            Volgende
          </button>
        ) : (
          <button onClick={handleSubmit} className="btn btn-primary">
            Voltooien
          </button>
        )}
      </div>
    </div>
  );
}

// Step 1: Geographic Scope - Add provinces with weights (unchanged)
function Step1GeographicScope({ geoScopeItems, setGeoScopeItems, errors }: any) {
  const [selectedProvince, setSelectedProvince] = useState('');
  const [weight, setWeight] = useState(10);

  const addProvince = () => {
    if (selectedProvince && !geoScopeItems.find((item: GeographicScopeItem) => item.name === selectedProvince)) {
      const newItem: GeographicScopeItem = {
        id: `geo-${Date.now()}`,
        name: selectedProvince,
        weight: weight
      };
      setGeoScopeItems([...geoScopeItems, newItem]);
      setSelectedProvince('');
      setWeight(10);
    }
  };

  const removeProvince = (id: string) => {
    setGeoScopeItems(geoScopeItems.filter((item: GeographicScopeItem) => item.id !== id));
  };

  const updateWeight = (id: string, newWeight: number) => {
    setGeoScopeItems(geoScopeItems.map((item: GeographicScopeItem) => 
      item.id === id ? { ...item, weight: newWeight } : item
    ));
  };

  return (
    <div className="ikp-step">
      <div className="form-group">
        <label>Selecteer provincie</label>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
          <select
            value={selectedProvince}
            onChange={(e) => setSelectedProvince(e.target.value)}
            style={{ flex: 1 }}
          >
            <option value="">Kies een provincie</option>
            {IKP_OPTIONS.provinces.map(province => (
              <option key={province} value={province}>
                {province}
              </option>
            ))}
          </select>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <label style={{ fontSize: '0.875rem' }}>Weging</label>
            <input
              type="number"
              value={weight}
              onChange={(e) => setWeight(parseInt(e.target.value) || 10)}
              min="1"
              max="100"
              style={{ width: '80px' }}
            />
          </div>
          
          <button 
            onClick={addProvince} 
            className="btn btn-primary"
            disabled={!selectedProvince}
          >
            Toevoegen
          </button>
        </div>
        {errors.geographicScope && <span className="error-message">{errors.geographicScope}</span>}
      </div>

      {/* List of added provinces */}
      {geoScopeItems.length > 0 && (
        <div className="added-items" style={{ marginTop: '2rem' }}>
          <h4>Toegevoegde provincies:</h4>
          <div className="items-list">
            {geoScopeItems.map((item: GeographicScopeItem) => (
              <div key={item.id} className="item-row" style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '1rem', 
                padding: '0.75rem',
                backgroundColor: '#f8f9fa',
                borderRadius: '4px',
                marginBottom: '0.5rem'
              }}>
                <span style={{ flex: 1 }}>{item.name}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.875rem' }}>Weging:</label>
                  <input
                    type="number"
                    value={item.weight}
                    onChange={(e) => updateWeight(item.id, parseInt(e.target.value) || 10)}
                    min="1"
                    max="100"
                    style={{ width: '60px' }}
                  />
                </div>
                <button 
                  onClick={() => removeProvince(item.id)} 
                  className="btn btn-sm btn-danger"
                  style={{ padding: '0.25rem 0.5rem' }}
                >
                  Verwijderen
                </button>
              </div>
            ))}
          </div>
          <div style={{ marginTop: '1rem', fontSize: '0.875rem', color: '#6b7280' }}>
            Totaal gewicht: {geoScopeItems.reduce((sum: number, item: GeographicScopeItem) => sum + item.weight, 0)}
          </div>
        </div>
      )}
    </div>
  );
}

// Step 2: Employee Count - Multiple selections with weights
function Step2EmployeeCount({ employeeCountItems, setEmployeeCountItems, errors }: any) {
  const [selectedRange, setSelectedRange] = useState('');
  const [weight, setWeight] = useState(10);

  const addRange = () => {
    if (selectedRange && !employeeCountItems.find((item: EmployeeCountItem) => item.range === selectedRange)) {
      const newItem: EmployeeCountItem = {
        id: `emp-${Date.now()}`,
        range: selectedRange,
        weight: weight
      };
      setEmployeeCountItems([...employeeCountItems, newItem]);
      setSelectedRange('');
      setWeight(10);
    }
  };

  const removeRange = (id: string) => {
    setEmployeeCountItems(employeeCountItems.filter((item: EmployeeCountItem) => item.id !== id));
  };

  const updateWeight = (id: string, newWeight: number) => {
    setEmployeeCountItems(employeeCountItems.map((item: EmployeeCountItem) => 
      item.id === id ? { ...item, weight: newWeight } : item
    ));
  };

  return (
    <div className="ikp-step">
      <div className="form-group">
        <label>Selecteer aantal medewerkers</label>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
          <select
            value={selectedRange}
            onChange={(e) => setSelectedRange(e.target.value)}
            style={{ flex: 1 }}
          >
            <option value="">Kies een categorie</option>
            {IKP_OPTIONS.employeeCount.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <label style={{ fontSize: '0.875rem' }}>Weging</label>
            <input
              type="number"
              value={weight}
              onChange={(e) => setWeight(parseInt(e.target.value) || 10)}
              min="1"
              max="100"
              style={{ width: '80px' }}
            />
          </div>
          
          <button 
            onClick={addRange} 
            className="btn btn-primary"
            disabled={!selectedRange}
          >
            Toevoegen
          </button>
        </div>
        {errors.employeeCount && <span className="error-message">{errors.employeeCount}</span>}
      </div>

      {/* List of added ranges */}
      {employeeCountItems.length > 0 && (
        <div className="added-items" style={{ marginTop: '2rem' }}>
          <h4>Toegevoegde categorieën:</h4>
          <div className="items-list">
            {employeeCountItems.map((item: EmployeeCountItem) => {
              const label = IKP_OPTIONS.employeeCount.find(opt => opt.value === item.range)?.label || item.range;
              return (
                <div key={item.id} className="item-row" style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '1rem', 
                  padding: '0.75rem',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '4px',
                  marginBottom: '0.5rem'
                }}>
                  <span style={{ flex: 1 }}>{label}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <label style={{ fontSize: '0.875rem' }}>Weging:</label>
                    <input
                      type="number"
                      value={item.weight}
                      onChange={(e) => updateWeight(item.id, parseInt(e.target.value) || 10)}
                      min="1"
                      max="100"
                      style={{ width: '60px' }}
                    />
                  </div>
                  <button 
                    onClick={() => removeRange(item.id)} 
                    className="btn btn-sm btn-danger"
                    style={{ padding: '0.25rem 0.5rem' }}
                  >
                    Verwijderen
                  </button>
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: '1rem', fontSize: '0.875rem', color: '#6b7280' }}>
            Totaal gewicht: {employeeCountItems.reduce((sum: number, item: EmployeeCountItem) => sum + item.weight, 0)}
          </div>
        </div>
      )}
    </div>
  );
}

// Step 3: Client Types - Free form with weights
function Step3ClientTypes({ formData, setFormData, errors }: any) {
  return (
    <WeightedItemsInput
      items={formData.clientTypes || []}
      onItemsChange={(items) => setFormData({ ...formData, clientTypes: items })}
      placeholder="Voer type opdrachtgever in..."
      label="Type opdrachtgevers"
    />
  );
}

// Step 4: Industry - Free form with weights
function Step4Industry({ formData, setFormData, errors }: any) {
  return (
    <WeightedItemsInput
      items={formData.industry || []}
      onItemsChange={(items) => setFormData({ ...formData, industry: items })}
      placeholder="Voer branche in..."
      label="Branches"
    />
  );
}

// Step 5: Client DNA - Free form with weights
function Step5ClientDNA({ formData, setFormData, errors }: any) {
  return (
    <WeightedItemsInput
      items={formData.clientDNA || []}
      onItemsChange={(items) => setFormData({ ...formData, clientDNA: items })}
      placeholder="Voer matchingselement in..."
      label="Matchingselementen"
    />
  );
}

// Step 6: Competition Type - Free form with weights
function Step6CompetitionType({ formData, setFormData, errors }: any) {
  return (
    <WeightedItemsInput
      items={formData.competitionType || []}
      onItemsChange={(items) => setFormData({ ...formData, competitionType: items })}
      placeholder="Voer naam concurrent in..."
      label="Concurrenten"
    />
  );
}

// Step 7: Competition Count - Free form with weights
function Step7CompetitionCount({ formData, setFormData, errors }: any) {
  return (
    <WeightedItemsInput
      items={formData.competitionCount || []}
      onItemsChange={(items) => setFormData({ ...formData, competitionCount: items })}
      placeholder="Voer aantal concurrenten in..."
      label="Aantal concurrenten per segment"
    />
  );
}

// Step 8: Kraljic Matrix - 5 positions with scores
function Step8KraljicMatrix({ kraljicScores, setKraljicScores, errors }: any) {
  const updateScore = (position: string, score: number) => {
    setKraljicScores({ ...kraljicScores, [position]: score });
  };

  return (
    <div className="ikp-step">
      <div className="form-group">
        <label>Positie in Kraljic matrix</label>
        <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '1rem' }}>
          Geef een score aan elke positie in de matrix (0-100)
        </p>
        
        <div className="kraljic-matrix-list">
          {IKP_OPTIONS.kraljicMatrix.map(option => (
            <div key={option.value} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              padding: '1rem',
              backgroundColor: '#f8f9fa',
              borderRadius: '4px',
              marginBottom: '0.75rem'
            }}>
              <span style={{ flex: 1, fontWeight: 500 }}>{option.label}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.875rem' }}>Score:</label>
                <input
                  type="number"
                  value={kraljicScores[option.value] || 0}
                  onChange={(e) => updateScore(option.value, parseInt(e.target.value) || 0)}
                  min="0"
                  max="100"
                  style={{ width: '80px' }}
                />
              </div>
            </div>
          ))}
        </div>
        
        <div style={{ marginTop: '1rem', fontSize: '0.875rem', color: '#6b7280' }}>
          Totaal score: {Object.values(kraljicScores).reduce((sum, score) => sum + score, 0)}
        </div>
      </div>
    </div>
  );
}

// Step 9: Potential Services - Free form with weights
function Step9PotentialServices({ formData, setFormData, errors }: any) {
  return (
    <WeightedItemsInput
      items={formData.potentialServices || []}
      onItemsChange={(items) => setFormData({ ...formData, potentialServices: items })}
      placeholder="Voer potentiële dienst in..."
      label="Potentiële dienstverlening"
    />
  );
}

// Step 10: Additional Services - Free form with weights
function Step10AdditionalServices({ formData, setFormData, errors }: any) {
  return (
    <WeightedItemsInput
      items={formData.additionalServices || []}
      onItemsChange={(items) => setFormData({ ...formData, additionalServices: items })}
      placeholder="Voer additionele dienst in..."
      label="Additionele dienstverlening"
    />
  );
}

// Step 11: Issues - Free form with weights
function Step11Issues({ formData, setFormData, errors }: any) {
  return (
    <WeightedItemsInput
      items={formData.issues || []}
      onItemsChange={(items) => setFormData({ ...formData, issues: items })}
      placeholder="Voer vraagstuk in..."
      label="Vraagstukken"
    />
  );
}

// Step 12: Contract Value - Multiple selections with weights
function Step12ContractValue({ contractValueItems, setContractValueItems, errors }: any) {
  const [selectedValue, setSelectedValue] = useState('');
  const [weight, setWeight] = useState(10);

  const addValue = () => {
    if (selectedValue && !contractValueItems.find((item: GeographicScopeItem) => item.name === selectedValue)) {
      const newItem: GeographicScopeItem = {
        id: `val-${Date.now()}`,
        name: selectedValue,
        weight: weight
      };
      setContractValueItems([...contractValueItems, newItem]);
      setSelectedValue('');
      setWeight(10);
    }
  };

  const removeValue = (id: string) => {
    setContractValueItems(contractValueItems.filter((item: GeographicScopeItem) => item.id !== id));
  };

  const updateWeight = (id: string, newWeight: number) => {
    setContractValueItems(contractValueItems.map((item: GeographicScopeItem) => 
      item.id === id ? { ...item, weight: newWeight } : item
    ));
  };

  return (
    <div className="ikp-step">
      <div className="form-group">
        <label>Selecteer contractwaarde ranges</label>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
          <select
            value={selectedValue}
            onChange={(e) => setSelectedValue(e.target.value)}
            style={{ flex: 1 }}
          >
            <option value="">Kies een range</option>
            {IKP_OPTIONS.contractValue.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <label style={{ fontSize: '0.875rem' }}>Weging</label>
            <input
              type="number"
              value={weight}
              onChange={(e) => setWeight(parseInt(e.target.value) || 10)}
              min="1"
              max="100"
              style={{ width: '80px' }}
            />
          </div>
          
          <button 
            onClick={addValue} 
            className="btn btn-primary"
            disabled={!selectedValue}
          >
            Toevoegen
          </button>
        </div>
      </div>

      {/* List of added values */}
      {contractValueItems.length > 0 && (
        <div className="added-items" style={{ marginTop: '2rem' }}>
          <h4>Toegevoegde ranges:</h4>
          <div className="items-list">
            {contractValueItems.map((item: GeographicScopeItem) => {
              const label = IKP_OPTIONS.contractValue.find(opt => opt.value === item.name)?.label || item.name;
              return (
                <div key={item.id} className="item-row" style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '1rem', 
                  padding: '0.75rem',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '4px',
                  marginBottom: '0.5rem'
                }}>
                  <span style={{ flex: 1 }}>{label}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <label style={{ fontSize: '0.875rem' }}>Weging:</label>
                    <input
                      type="number"
                      value={item.weight}
                      onChange={(e) => updateWeight(item.id, parseInt(e.target.value) || 10)}
                      min="1"
                      max="100"
                      style={{ width: '60px' }}
                    />
                  </div>
                  <button 
                    onClick={() => removeValue(item.id)} 
                    className="btn btn-sm btn-danger"
                    style={{ padding: '0.25rem 0.5rem' }}
                  >
                    Verwijderen
                  </button>
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: '1rem', fontSize: '0.875rem', color: '#6b7280' }}>
            Totaal gewicht: {contractValueItems.reduce((sum: number, item: GeographicScopeItem) => sum + item.weight, 0)}
          </div>
        </div>
      )}
    </div>
  );
}

// Step 13: Gross Margin - Free form with weights
function Step13GrossMargin({ formData, setFormData, errors }: any) {
  return (
    <WeightedItemsInput
      items={formData.grossMargin || []}
      onItemsChange={(items) => setFormData({ ...formData, grossMargin: items })}
      placeholder="Voer brutomarge in (bijv. 15-20%)..."
      label="Brutomarge percentages"
    />
  );
}

// Step 14: Collaboration Duration - Multiple selections with weights
function Step14CollaborationDuration({ collaborationItems, setCollaborationItems, errors }: any) {
  const [selectedDuration, setSelectedDuration] = useState('');
  const [weight, setWeight] = useState(10);

  const addDuration = () => {
    if (selectedDuration && !collaborationItems.find((item: GeographicScopeItem) => item.name === selectedDuration)) {
      const newItem: GeographicScopeItem = {
        id: `dur-${Date.now()}`,
        name: selectedDuration,
        weight: weight
      };
      setCollaborationItems([...collaborationItems, newItem]);
      setSelectedDuration('');
      setWeight(10);
    }
  };

  const removeDuration = (id: string) => {
    setCollaborationItems(collaborationItems.filter((item: GeographicScopeItem) => item.id !== id));
  };

  const updateWeight = (id: string, newWeight: number) => {
    setCollaborationItems(collaborationItems.map((item: GeographicScopeItem) => 
      item.id === id ? { ...item, weight: newWeight } : item
    ));
  };

  return (
    <div className="ikp-step">
      <div className="form-group">
        <label>Selecteer samenwerkingsduur</label>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
          <select
            value={selectedDuration}
            onChange={(e) => setSelectedDuration(e.target.value)}
            style={{ flex: 1 }}
          >
            <option value="">Kies een duur</option>
            {IKP_OPTIONS.collaborationDuration.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <label style={{ fontSize: '0.875rem' }}>Weging</label>
            <input
              type="number"
              value={weight}
              onChange={(e) => setWeight(parseInt(e.target.value) || 10)}
              min="1"
              max="100"
              style={{ width: '80px' }}
            />
          </div>
          
          <button 
            onClick={addDuration} 
            className="btn btn-primary"
            disabled={!selectedDuration}
          >
            Toevoegen
          </button>
        </div>
      </div>

      {/* List of added durations */}
      {collaborationItems.length > 0 && (
        <div className="added-items" style={{ marginTop: '2rem' }}>
          <h4>Toegevoegde periodes:</h4>
          <div className="items-list">
            {collaborationItems.map((item: GeographicScopeItem) => {
              const label = IKP_OPTIONS.collaborationDuration.find(opt => opt.value === item.name)?.label || item.name;
              return (
                <div key={item.id} className="item-row" style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '1rem', 
                  padding: '0.75rem',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '4px',
                  marginBottom: '0.5rem'
                }}>
                  <span style={{ flex: 1 }}>{label}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <label style={{ fontSize: '0.875rem' }}>Weging:</label>
                    <input
                      type="number"
                      value={item.weight}
                      onChange={(e) => updateWeight(item.id, parseInt(e.target.value) || 10)}
                      min="1"
                      max="100"
                      style={{ width: '60px' }}
                    />
                  </div>
                  <button 
                    onClick={() => removeDuration(item.id)} 
                    className="btn btn-sm btn-danger"
                    style={{ padding: '0.25rem 0.5rem' }}
                  >
                    Verwijderen
                  </button>
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: '1rem', fontSize: '0.875rem', color: '#6b7280' }}>
            Totaal gewicht: {collaborationItems.reduce((sum: number, item: GeographicScopeItem) => sum + item.weight, 0)}
          </div>
        </div>
      )}
    </div>
  );
}

// Step 15: Creditworthiness - Yes/No only
function Step15Creditworthiness({ formData, setFormData, errors }: any) {
  return (
    <div className="ikp-step">
      <div className="form-group">
        <label>Is het bedrijf kredietwaardig? *</label>
        <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '1rem' }}>
          Dit is een harde eis (CKV). Als een bedrijf niet kredietwaardig is, is dit vaak een no-go voor samenwerking.
        </p>
        <div className="radio-group">
          <label className="radio-label">
            <input
              type="radio"
              name="creditworthiness"
              value="yes"
              checked={formData.creditworthiness === 'yes'}
              onChange={(e) => setFormData({ ...formData, creditworthiness: 'yes' })}
            />
            <span>Ja</span>
          </label>
          <label className="radio-label">
            <input
              type="radio"
              name="creditworthiness"
              value="no"
              checked={formData.creditworthiness === 'no'}
              onChange={(e) => setFormData({ ...formData, creditworthiness: 'no' })}
            />
            <span>Nee</span>
          </label>
        </div>
        {errors.creditworthiness && <span className="error-message">{errors.creditworthiness}</span>}
      </div>
    </div>
  );
}