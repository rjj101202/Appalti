'use client';

import { useState, useEffect } from 'react';
import { IKPData, IKP_OPTIONS } from '@/types/ikp';
import { IKP_STEPS } from '@/config/ikp-steps';

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

export default function IKPForm({ initialData, clientCompanyId, onSave, onCancel }: IKPFormProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<Partial<IKPData>>(initialData || {});
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Special state for geographic scope items
  const [geoScopeItems, setGeoScopeItems] = useState<GeographicScopeItem[]>([]);

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
    
    // Initialize geographic scope items if they exist
    if (formData.geographicScope && formData.geographicScope.length > 0) {
      const items = formData.geographicScope.map((name, index) => ({
        id: `geo-${index}`,
        name,
        weight: 10 // Default weight
      }));
      setGeoScopeItems(items);
    }
  }, []);

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};
    const currentStepInfo = IKP_STEPS[step - 1];
    
    // Validate based on step requirements
    switch (step) {
      case 1: // Geographic scope
        if (geoScopeItems.length === 0) {
          newErrors.geographicScope = 'Voeg minimaal één provincie toe';
        }
        break;
      case 2: // Employee count
        if (!formData.employeeCount) {
          newErrors.employeeCount = 'Selecteer aantal medewerkers';
        }
        break;
      case 3: // Client types
        if (!formData.clientTypes || formData.clientTypes.length === 0) {
          newErrors.clientTypes = 'Selecteer minimaal één type opdrachtgever';
        }
        break;
      case 4: // Industry
        if (!formData.industry || formData.industry.length === 0) {
          newErrors.industry = 'Selecteer minimaal één branche';
        }
        break;
      // Add more validations as needed
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      // Save geographic scope data when moving from step 1
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
    const step = IKP_STEPS[currentStep - 1];
    
    switch (currentStep) {
      case 1:
        return <Step1GeographicScope 
          geoScopeItems={geoScopeItems} 
          setGeoScopeItems={setGeoScopeItems} 
          errors={errors} 
        />;
      case 2:
        return <Step2EmployeeCount formData={formData} setFormData={setFormData} errors={errors} />;
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
        return <Step8KraljicMatrix formData={formData} setFormData={setFormData} errors={errors} />;
      case 9:
        return <Step9PotentialServices formData={formData} setFormData={setFormData} errors={errors} />;
      case 10:
        return <Step10AdditionalServices formData={formData} setFormData={setFormData} errors={errors} />;
      case 11:
        return <Step11Issues formData={formData} setFormData={setFormData} errors={errors} />;
      case 12:
        return <Step12ContractValue formData={formData} setFormData={setFormData} errors={errors} />;
      case 13:
        return <Step13GrossMargin formData={formData} setFormData={setFormData} errors={errors} />;
      case 14:
        return <Step14CollaborationDuration formData={formData} setFormData={setFormData} errors={errors} />;
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

// Step 1: Geographic Scope - Add provinces with weights
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

// Step 2: Employee Count
function Step2EmployeeCount({ formData, setFormData, errors }: any) {
  return (
    <div className="ikp-step">
      <div className="form-group">
        <label htmlFor="employeeCount">Aantal medewerkers *</label>
        <select
          id="employeeCount"
          value={formData.employeeCount || ''}
          onChange={(e) => setFormData({
            ...formData,
            employeeCount: e.target.value
          })}
          className={errors.employeeCount ? 'error' : ''}
        >
          <option value="">Selecteer aantal medewerkers</option>
          {IKP_OPTIONS.employeeCount.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {errors.employeeCount && <span className="error-message">{errors.employeeCount}</span>}
      </div>
    </div>
  );
}

// Step 3: Client Types
function Step3ClientTypes({ formData, setFormData, errors }: any) {
  const handleToggle = (value: string) => {
    const current = formData.clientTypes || [];
    if (current.includes(value)) {
      setFormData({
        ...formData,
        clientTypes: current.filter((v: string) => v !== value)
      });
    } else {
      setFormData({
        ...formData,
        clientTypes: [...current, value]
      });
    }
  };

  return (
    <div className="ikp-step">
      <div className="form-group">
        <label>Type opdrachtgevers *</label>
        <div className="checkbox-group">
          {IKP_OPTIONS.clientTypes.map(option => (
            <label key={option.value} className="checkbox-label">
              <input
                type="checkbox"
                checked={(formData.clientTypes || []).includes(option.value)}
                onChange={() => handleToggle(option.value)}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
        {errors.clientTypes && <span className="error-message">{errors.clientTypes}</span>}
      </div>
    </div>
  );
}

// Step 4: Industry
function Step4Industry({ formData, setFormData, errors }: any) {
  const handleToggle = (value: string) => {
    const current = formData.industry || [];
    if (current.includes(value)) {
      setFormData({
        ...formData,
        industry: current.filter((v: string) => v !== value)
      });
    } else {
      setFormData({
        ...formData,
        industry: [...current, value]
      });
    }
  };

  return (
    <div className="ikp-step">
      <div className="form-group">
        <label>Branches *</label>
        <div className="checkbox-group">
          {IKP_OPTIONS.industries.map(option => (
            <label key={option.value} className="checkbox-label">
              <input
                type="checkbox"
                checked={(formData.industry || []).includes(option.value)}
                onChange={() => handleToggle(option.value)}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
        {errors.industry && <span className="error-message">{errors.industry}</span>}
      </div>
    </div>
  );
}

// Placeholder components for remaining steps
function Step5ClientDNA({ formData, setFormData, errors }: any) {
  return <div className="ikp-step">
    <div className="form-group">
      <label>Matchingselementen</label>
      <textarea
        value={formData.clientDNA?.join('\n') || ''}
        onChange={(e) => setFormData({
          ...formData,
          clientDNA: e.target.value.split('\n').filter(Boolean)
        })}
        rows={5}
        placeholder="Voer matchingselementen in (één per regel)"
      />
    </div>
  </div>;
}

function Step6CompetitionType({ formData, setFormData, errors }: any) {
  return <div className="ikp-step">
    <div className="form-group">
      <label>Type concurrentie</label>
      <select
        value={formData.competitionType || ''}
        onChange={(e) => setFormData({
          ...formData,
          competitionType: e.target.value
        })}
      >
        <option value="">Selecteer type concurrentie</option>
        {IKP_OPTIONS.competitionType.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  </div>;
}

function Step7CompetitionCount({ formData, setFormData, errors }: any) {
  return <div className="ikp-step">
    <div className="form-group">
      <label>Aantal concurrenten</label>
      <select
        value={formData.competitionCount || ''}
        onChange={(e) => setFormData({
          ...formData,
          competitionCount: e.target.value
        })}
      >
        <option value="">Selecteer aantal concurrenten</option>
        {IKP_OPTIONS.competitionCount.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  </div>;
}

function Step8KraljicMatrix({ formData, setFormData, errors }: any) {
  return <div className="ikp-step">
    <div className="form-group">
      <label>Positie in Kraljic matrix</label>
      <select
        value={formData.kraljicPosition || ''}
        onChange={(e) => setFormData({
          ...formData,
          kraljicPosition: e.target.value
        })}
      >
        <option value="">Selecteer positie</option>
        {IKP_OPTIONS.kraljicMatrix.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  </div>;
}

function Step9PotentialServices({ formData, setFormData, errors }: any) {
  return <div className="ikp-step">
    <div className="form-group">
      <label>Potentiële dienstverlening</label>
      <textarea
        value={formData.potentialServices?.join('\n') || ''}
        onChange={(e) => setFormData({
          ...formData,
          potentialServices: e.target.value.split('\n').filter(Boolean)
        })}
        rows={5}
        placeholder="Voer potentiële diensten in (één per regel)"
      />
    </div>
  </div>;
}

function Step10AdditionalServices({ formData, setFormData, errors }: any) {
  return <div className="ikp-step">
    <div className="form-group">
      <label>Additionele dienstverlening</label>
      <textarea
        value={formData.additionalServices?.join('\n') || ''}
        onChange={(e) => setFormData({
          ...formData,
          additionalServices: e.target.value.split('\n').filter(Boolean)
        })}
        rows={5}
        placeholder="Voer additionele diensten in (één per regel)"
      />
    </div>
  </div>;
}

function Step11Issues({ formData, setFormData, errors }: any) {
  return <div className="ikp-step">
    <div className="form-group">
      <label>Vraagstukken</label>
      <textarea
        value={formData.issues?.join('\n') || ''}
        onChange={(e) => setFormData({
          ...formData,
          issues: e.target.value.split('\n').filter(Boolean)
        })}
        rows={5}
        placeholder="Voer vraagstukken in (één per regel)"
      />
    </div>
  </div>;
}

function Step12ContractValue({ formData, setFormData, errors }: any) {
  return <div className="ikp-step">
    <div className="form-group">
      <label>Potentiële contractwaarde</label>
      <select
        value={formData.contractValue || ''}
        onChange={(e) => setFormData({
          ...formData,
          contractValue: e.target.value
        })}
      >
        <option value="">Selecteer contractwaarde</option>
        {IKP_OPTIONS.contractValue.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  </div>;
}

function Step13GrossMargin({ formData, setFormData, errors }: any) {
  return <div className="ikp-step">
    <div className="form-group">
      <label>Brutomarge</label>
      <select
        value={formData.grossMargin || ''}
        onChange={(e) => setFormData({
          ...formData,
          grossMargin: e.target.value
        })}
      >
        <option value="">Selecteer brutomarge</option>
        {IKP_OPTIONS.grossMargin.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  </div>;
}

function Step14CollaborationDuration({ formData, setFormData, errors }: any) {
  return <div className="ikp-step">
    <div className="form-group">
      <label>Samenwerkingsduur</label>
      <select
        value={formData.collaborationDuration || ''}
        onChange={(e) => setFormData({
          ...formData,
          collaborationDuration: e.target.value
        })}
      >
        <option value="">Selecteer samenwerkingsduur</option>
        {IKP_OPTIONS.collaborationDuration.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  </div>;
}

function Step15Creditworthiness({ formData, setFormData, errors }: any) {
  return <div className="ikp-step">
    <div className="form-group">
      <label>Kredietwaardigheid *</label>
      <select
        value={formData.creditworthiness || ''}
        onChange={(e) => setFormData({
          ...formData,
          creditworthiness: e.target.value
        })}
        className={errors.creditworthiness ? 'error' : ''}
      >
        <option value="">Selecteer kredietwaardigheid</option>
        {IKP_OPTIONS.creditworthiness.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {errors.creditworthiness && <span className="error-message">{errors.creditworthiness}</span>}
    </div>
  </div>;
}