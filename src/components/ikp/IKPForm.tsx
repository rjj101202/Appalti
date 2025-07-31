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

export default function IKPForm({ initialData, clientCompanyId, onSave, onCancel }: IKPFormProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<Partial<IKPData>>(initialData || {});
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Initialize empty data structure
  useEffect(() => {
    if (!formData.metadata) {
      setFormData(prev => ({
        ...prev,
        metadata: {
          createdAt: new Date(),
          updatedAt: new Date(),
          completedSteps: 0,
          lastCompletedStep: 0
        }
      }));
    }
  }, []);

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};
    
    switch (step) {
      case 1:
        if (!formData.personalDetails?.companyName) {
          newErrors.companyName = 'Bedrijfsnaam is verplicht';
        }
        if (!formData.personalDetails?.kvkNumber) {
          newErrors.kvkNumber = 'KVK nummer is verplicht';
        }
        break;
      case 2:
        if (!formData.contactPerson?.name) {
          newErrors.name = 'Naam is verplicht';
        }
        if (!formData.contactPerson?.email) {
          newErrors.email = 'Email is verplicht';
        }
        break;
      // Add more validation for other steps
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
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
        return <Step1PersonalDetails formData={formData} setFormData={setFormData} errors={errors} />;
      case 2:
        return <Step2ContactPerson formData={formData} setFormData={setFormData} errors={errors} />;
      case 3:
        return <Step3OrganizationSize formData={formData} setFormData={setFormData} errors={errors} />;
      case 4:
        return <Step4Industry formData={formData} setFormData={setFormData} errors={errors} />;
      case 5:
        return <Step5GeographicCoverage formData={formData} setFormData={setFormData} errors={errors} />;
      case 6:
        return <Step6ProductsServices formData={formData} setFormData={setFormData} errors={errors} />;
      case 7:
        return <Step7TargetAudience formData={formData} setFormData={setFormData} errors={errors} />;
      case 8:
        return <Step8Culture formData={formData} setFormData={setFormData} errors={errors} />;
      case 9:
        return <Step9GrowthPhase formData={formData} setFormData={setFormData} errors={errors} />;
      case 10:
        return <Step10Budget formData={formData} setFormData={setFormData} errors={errors} />;
      case 11:
        return <Step11Experience formData={formData} setFormData={setFormData} errors={errors} />;
      case 12:
        return <Step12Motivations formData={formData} setFormData={setFormData} errors={errors} />;
      case 13:
        return <Step13ProjectTypes formData={formData} setFormData={setFormData} errors={errors} />;
      case 14:
        return <Step14Collaboration formData={formData} setFormData={setFormData} errors={errors} />;
      case 15:
        return <Step15CPVCodes formData={formData} setFormData={setFormData} errors={errors} />;
      default:
        return null;
    }
  };

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
          Stap {currentStep} van 15: {IKP_STEPS[currentStep - 1].title}
        </div>
      </div>

      {/* Form content */}
      <div className="ikp-form-content">
        <h2>{IKP_STEPS[currentStep - 1].title}</h2>
        <p className="ikp-step-description">{IKP_STEPS[currentStep - 1].description}</p>
        
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

// Step 1: Personal Details
function Step1PersonalDetails({ formData, setFormData, errors }: any) {
  return (
    <div className="ikp-step">
      <div className="form-group">
        <label htmlFor="companyName">Bedrijfsnaam *</label>
        <input
          type="text"
          id="companyName"
          value={formData.personalDetails?.companyName || ''}
          onChange={(e) => setFormData({
            ...formData,
            personalDetails: {
              ...formData.personalDetails,
              companyName: e.target.value
            }
          })}
          className={errors.companyName ? 'error' : ''}
        />
        {errors.companyName && <span className="error-message">{errors.companyName}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="kvkNumber">KVK Nummer *</label>
        <input
          type="text"
          id="kvkNumber"
          value={formData.personalDetails?.kvkNumber || ''}
          onChange={(e) => setFormData({
            ...formData,
            personalDetails: {
              ...formData.personalDetails,
              kvkNumber: e.target.value
            }
          })}
          className={errors.kvkNumber ? 'error' : ''}
        />
        {errors.kvkNumber && <span className="error-message">{errors.kvkNumber}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="website">Website</label>
        <input
          type="url"
          id="website"
          value={formData.personalDetails?.website || ''}
          onChange={(e) => setFormData({
            ...formData,
            personalDetails: {
              ...formData.personalDetails,
              website: e.target.value
            }
          })}
        />
      </div>

      <div className="form-group">
        <label htmlFor="linkedin">LinkedIn</label>
        <input
          type="url"
          id="linkedin"
          value={formData.personalDetails?.linkedin || ''}
          onChange={(e) => setFormData({
            ...formData,
            personalDetails: {
              ...formData.personalDetails,
              linkedin: e.target.value
            }
          })}
        />
      </div>
    </div>
  );
}

// Step 2: Contact Person
function Step2ContactPerson({ formData, setFormData, errors }: any) {
  return (
    <div className="ikp-step">
      <div className="form-group">
        <label htmlFor="contactName">Naam *</label>
        <input
          type="text"
          id="contactName"
          value={formData.contactPerson?.name || ''}
          onChange={(e) => setFormData({
            ...formData,
            contactPerson: {
              ...formData.contactPerson,
              name: e.target.value
            }
          })}
          className={errors.name ? 'error' : ''}
        />
        {errors.name && <span className="error-message">{errors.name}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="contactFunction">Functie *</label>
        <input
          type="text"
          id="contactFunction"
          value={formData.contactPerson?.function || ''}
          onChange={(e) => setFormData({
            ...formData,
            contactPerson: {
              ...formData.contactPerson,
              function: e.target.value
            }
          })}
        />
      </div>

      <div className="form-group">
        <label htmlFor="contactEmail">Email *</label>
        <input
          type="email"
          id="contactEmail"
          value={formData.contactPerson?.email || ''}
          onChange={(e) => setFormData({
            ...formData,
            contactPerson: {
              ...formData.contactPerson,
              email: e.target.value
            }
          })}
          className={errors.email ? 'error' : ''}
        />
        {errors.email && <span className="error-message">{errors.email}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="contactPhone">Telefoon *</label>
        <input
          type="tel"
          id="contactPhone"
          value={formData.contactPerson?.phone || ''}
          onChange={(e) => setFormData({
            ...formData,
            contactPerson: {
              ...formData.contactPerson,
              phone: e.target.value
            }
          })}
        />
      </div>
    </div>
  );
}

// Step 3: Organization Size
function Step3OrganizationSize({ formData, setFormData, errors }: any) {
  return (
    <div className="ikp-step">
      <div className="form-group">
        <label htmlFor="employees">Aantal medewerkers *</label>
        <input
          type="number"
          id="employees"
          value={formData.organizationSize?.employees || ''}
          onChange={(e) => setFormData({
            ...formData,
            organizationSize: {
              ...formData.organizationSize,
              employees: parseInt(e.target.value)
            }
          })}
        />
      </div>

      <div className="form-group">
        <label htmlFor="revenue">Jaaromzet (€)</label>
        <input
          type="number"
          id="revenue"
          value={formData.organizationSize?.revenue || ''}
          onChange={(e) => setFormData({
            ...formData,
            organizationSize: {
              ...formData.organizationSize,
              revenue: parseInt(e.target.value)
            }
          })}
        />
      </div>

      <div className="form-group">
        <label htmlFor="locations">Aantal locaties</label>
        <input
          type="number"
          id="locations"
          value={formData.organizationSize?.locations || ''}
          onChange={(e) => setFormData({
            ...formData,
            organizationSize: {
              ...formData.organizationSize,
              locations: parseInt(e.target.value)
            }
          })}
        />
      </div>
    </div>
  );
}

// I'll implement the remaining steps in a similar pattern...
// For now, let me create placeholder components for the remaining steps

function Step4Industry({ formData, setFormData, errors }: any) {
  return <div className="ikp-step">Step 4 - Industry implementation coming...</div>;
}

function Step5GeographicCoverage({ formData, setFormData, errors }: any) {
  return <div className="ikp-step">Step 5 - Geographic Coverage implementation coming...</div>;
}

function Step6ProductsServices({ formData, setFormData, errors }: any) {
  return <div className="ikp-step">Step 6 - Products/Services implementation coming...</div>;
}

function Step7TargetAudience({ formData, setFormData, errors }: any) {
  return <div className="ikp-step">Step 7 - Target Audience implementation coming...</div>;
}

function Step8Culture({ formData, setFormData, errors }: any) {
  return <div className="ikp-step">Step 8 - Culture implementation coming...</div>;
}

function Step9GrowthPhase({ formData, setFormData, errors }: any) {
  return (
    <div className="ikp-step">
      <div className="form-group">
        <label htmlFor="growthPhase">Groeifase *</label>
        <select
          id="growthPhase"
          value={formData.growthPhase || ''}
          onChange={(e) => setFormData({
            ...formData,
            growthPhase: e.target.value
          })}
        >
          <option value="">Selecteer groeifase</option>
          {IKP_OPTIONS.growthPhase.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function Step10Budget({ formData, setFormData, errors }: any) {
  return <div className="ikp-step">Step 10 - Budget implementation coming...</div>;
}

function Step11Experience({ formData, setFormData, errors }: any) {
  return <div className="ikp-step">Step 11 - Experience implementation coming...</div>;
}

function Step12Motivations({ formData, setFormData, errors }: any) {
  return <div className="ikp-step">Step 12 - Motivations implementation coming...</div>;
}

function Step13ProjectTypes({ formData, setFormData, errors }: any) {
  return <div className="ikp-step">Step 13 - Project Types implementation coming...</div>;
}

function Step14Collaboration({ formData, setFormData, errors }: any) {
  return <div className="ikp-step">Step 14 - Collaboration implementation coming...</div>;
}

function Step15CPVCodes({ formData, setFormData, errors }: any) {
  return <div className="ikp-step">Step 15 - CPV Codes implementation coming...</div>;
}