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
        if (!formData.contactPerson?.function) {
          newErrors.function = 'Functie is verplicht';
        }
        if (!formData.contactPerson?.phone) {
          newErrors.phone = 'Telefoon is verplicht';
        }
        break;
      
      case 3:
        if (!formData.organizationSize?.employees) {
          newErrors.employees = 'Aantal medewerkers is verplicht';
        }
        break;
      
      case 4:
        if (!formData.industry?.primary) {
          newErrors.primary = 'Primaire branche is verplicht';
        }
        break;
      
      case 5:
        if (!formData.geographicCoverage?.regions || formData.geographicCoverage.regions.length === 0) {
          if (!formData.geographicCoverage?.national && !formData.geographicCoverage?.international) {
            newErrors.regions = 'Selecteer minstens één regio of geef aan dat u landelijk/internationaal actief bent';
          }
        }
        break;
      
      case 6:
        if (!formData.productsServices?.main || formData.productsServices.main.length === 0) {
          newErrors.main = 'Hoofdproducten/diensten zijn verplicht';
        }
        if (!formData.productsServices?.description) {
          newErrors.description = 'Beschrijving is verplicht';
        }
        break;
      
      case 7:
        if (!formData.targetAudience?.b2b && !formData.targetAudience?.b2c && !formData.targetAudience?.b2g) {
          newErrors.targetType = 'Selecteer minstens één type klant';
        }
        if (!formData.targetAudience?.segments || formData.targetAudience.segments.length === 0) {
          newErrors.segments = 'Marktsegmenten zijn verplicht';
        }
        break;
      
      case 8:
        if (!formData.culture?.coreValues || formData.culture.coreValues.length === 0) {
          newErrors.coreValues = 'Kernwaarden zijn verplicht';
        }
        if (!formData.culture?.workEnvironment) {
          newErrors.workEnvironment = 'Werkomgeving beschrijving is verplicht';
        }
        break;
      
      case 9:
        if (!formData.growthPhase) {
          newErrors.growthPhase = 'Groeifase is verplicht';
        }
        break;
      
      case 10:
        if (!formData.tenderBudget?.min && formData.tenderBudget?.min !== 0) {
          newErrors.min = 'Minimum budget is verplicht';
        }
        if (!formData.tenderBudget?.max && formData.tenderBudget?.max !== 0) {
          newErrors.max = 'Maximum budget is verplicht';
        }
        if (formData.tenderBudget?.min > formData.tenderBudget?.max) {
          newErrors.max = 'Maximum budget moet groter zijn dan minimum budget';
        }
        break;
      
      case 11:
        if (!formData.tenderExperience?.level) {
          newErrors.level = 'Ervaringsniveau is verplicht';
        }
        break;
      
      case 12:
        if (!formData.tenderMotivations || formData.tenderMotivations.length === 0) {
          newErrors.tenderMotivations = 'Selecteer minstens één drijfveer';
        }
        break;
      
      case 13:
        if (!formData.projectTypes?.categories || formData.projectTypes.categories.length === 0) {
          newErrors.categories = 'Projectcategorieën zijn verplicht';
        }
        if (!formData.projectTypes?.preferredDuration) {
          newErrors.preferredDuration = 'Voorkeur projectduur is verplicht';
        }
        if (!formData.projectTypes?.contractTypes || formData.projectTypes.contractTypes.length === 0) {
          newErrors.contractTypes = 'Contract types zijn verplicht';
        }
        break;
      
      case 14:
        if (!formData.collaborationPreferences?.consortium && 
            !formData.collaborationPreferences?.subcontracting && 
            !formData.collaborationPreferences?.mainContracting) {
          newErrors.collaborationPreferences = 'Selecteer minstens één samenwerkingsvoorkeur';
        }
        break;
      
      case 15:
        if (!formData.cpvCodes?.primary || formData.cpvCodes.primary.length === 0) {
          newErrors.primary = 'Primaire CPV codes zijn verplicht';
        }
        break;
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
        
        <button 
          onClick={() => {
            // Save current progress and exit
            onSave(formData as IKPData);
          }} 
          className="btn btn-secondary"
        >
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
          className={errors.function ? 'error' : ''}
        />
        {errors.function && <span className="error-message">{errors.function}</span>}
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
          className={errors.phone ? 'error' : ''}
        />
        {errors.phone && <span className="error-message">{errors.phone}</span>}
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
          className={errors.employees ? 'error' : ''}
        />
        {errors.employees && <span className="error-message">{errors.employees}</span>}
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
  return (
    <div className="ikp-step">
      <div className="form-group">
        <label htmlFor="primaryIndustry">Primaire branche *</label>
        <input
          type="text"
          id="primaryIndustry"
          placeholder="Bijv. Bouw, IT, Zorg, Retail, etc."
          value={formData.industry?.primary || ''}
          onChange={(e) => setFormData({
            ...formData,
            industry: {
              ...formData.industry,
              primary: e.target.value
            }
          })}
          className={errors.primary ? 'error' : ''}
        />
        {errors.primary && <span className="error-message">{errors.primary}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="secondaryIndustries">Secundaire branches</label>
        <textarea
          id="secondaryIndustries"
          placeholder="Voer secundaire branches in, gescheiden door komma's"
          value={formData.industry?.secondary?.join(', ') || ''}
          onChange={(e) => setFormData({
            ...formData,
            industry: {
              ...formData.industry,
              secondary: e.target.value.split(',').map((s: string) => s.trim()).filter((s: string) => s)
            }
          })}
          rows={3}
        />
      </div>

      <div className="form-group">
        <label htmlFor="sbiCodes">SBI Codes</label>
        <textarea
          id="sbiCodes"
          placeholder="Voer SBI codes in, gescheiden door komma's (bijv. 4321, 6201)"
          value={formData.industry?.sbicodes?.join(', ') || ''}
          onChange={(e) => setFormData({
            ...formData,
            industry: {
              ...formData.industry,
              sbicodes: e.target.value.split(',').map((s: string) => s.trim()).filter((s: string) => s)
            }
          })}
          rows={2}
        />
      </div>
    </div>
  );
}

function Step5GeographicCoverage({ formData, setFormData, errors }: any) {
  return (
    <div className="ikp-step">
      <div className="form-group">
        <label>Regio's waar actief *</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginTop: '0.5rem' }}>
          {IKP_OPTIONS.regions.map((region) => (
            <label key={region} style={{ display: 'flex', alignItems: 'center' }}>
              <input
                type="checkbox"
                checked={formData.geographicCoverage?.regions?.includes(region) || false}
                onChange={(e) => {
                  const currentRegions = formData.geographicCoverage?.regions || [];
                  const newRegions = e.target.checked
                    ? [...currentRegions, region]
                    : currentRegions.filter(r => r !== region);
                  
                  setFormData({
                    ...formData,
                    geographicCoverage: {
                      ...formData.geographicCoverage,
                      regions: newRegions
                    }
                  });
                }}
                style={{ marginRight: '0.5rem' }}
              />
              {region}
            </label>
          ))}
        </div>
        {errors.regions && <span className="error-message">{errors.regions}</span>}
      </div>

      <div className="form-group">
        <label style={{ display: 'flex', alignItems: 'center', marginTop: '1rem' }}>
          <input
            type="checkbox"
            checked={formData.geographicCoverage?.national || false}
            onChange={(e) => setFormData({
              ...formData,
              geographicCoverage: {
                ...formData.geographicCoverage,
                national: e.target.checked
              }
            })}
            style={{ marginRight: '0.5rem' }}
          />
          Landelijk actief
        </label>
      </div>

      <div className="form-group">
        <label style={{ display: 'flex', alignItems: 'center' }}>
          <input
            type="checkbox"
            checked={formData.geographicCoverage?.international || false}
            onChange={(e) => setFormData({
              ...formData,
              geographicCoverage: {
                ...formData.geographicCoverage,
                international: e.target.checked
              }
            })}
            style={{ marginRight: '0.5rem' }}
          />
          Internationaal actief
        </label>
      </div>

      {formData.geographicCoverage?.international && (
        <div className="form-group">
          <label htmlFor="countries">Landen waar actief</label>
          <textarea
            id="countries"
            placeholder="Voer landen in, gescheiden door komma's"
            value={formData.geographicCoverage?.countries?.join(', ') || ''}
            onChange={(e) => setFormData({
              ...formData,
              geographicCoverage: {
                ...formData.geographicCoverage,
                countries: e.target.value.split(',').map((s: string) => s.trim()).filter((s: string) => s)
              }
            })}
            rows={2}
          />
        </div>
      )}
    </div>
  );
}

function Step6ProductsServices({ formData, setFormData, errors }: any) {
  return (
    <div className="ikp-step">
      <div className="form-group">
        <label htmlFor="mainProducts">Hoofdproducten/diensten *</label>
        <textarea
          id="mainProducts"
          placeholder="Voer uw belangrijkste producten of diensten in, gescheiden door komma's"
          value={formData.productsServices?.main?.join(', ') || ''}
          onChange={(e) => setFormData({
            ...formData,
            productsServices: {
              ...formData.productsServices,
              main: e.target.value.split(',').map((s: string) => s.trim()).filter((s: string) => s)
            }
          })}
          className={errors.main ? 'error' : ''}
          rows={3}
        />
        {errors.main && <span className="error-message">{errors.main}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="productDescription">Beschrijving producten/diensten *</label>
        <textarea
          id="productDescription"
          placeholder="Geef een uitgebreide beschrijving van wat u aanbiedt"
          value={formData.productsServices?.description || ''}
          onChange={(e) => setFormData({
            ...formData,
            productsServices: {
              ...formData.productsServices,
              description: e.target.value
            }
          })}
          className={errors.description ? 'error' : ''}
          rows={4}
        />
        {errors.description && <span className="error-message">{errors.description}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="uniqueSellingPoints">Unieke verkooppunten (USPs)</label>
        <textarea
          id="uniqueSellingPoints"
          placeholder="Wat maakt uw aanbod uniek? Gescheiden door komma's"
          value={formData.productsServices?.uniqueSellingPoints?.join(', ') || ''}
          onChange={(e) => setFormData({
            ...formData,
            productsServices: {
              ...formData.productsServices,
              uniqueSellingPoints: e.target.value.split(',').map((s: string) => s.trim()).filter((s: string) => s)
            }
          })}
          rows={3}
        />
      </div>
    </div>
  );
}

function Step7TargetAudience({ formData, setFormData, errors }: any) {
  return (
    <div className="ikp-step">
      <div className="form-group">
        <label>Type klanten *</label>
        <div style={{ display: 'flex', gap: '2rem', marginTop: '0.5rem' }}>
          <label style={{ display: 'flex', alignItems: 'center' }}>
            <input
              type="checkbox"
              checked={formData.targetAudience?.b2b || false}
              onChange={(e) => setFormData({
                ...formData,
                targetAudience: {
                  ...formData.targetAudience,
                  b2b: e.target.checked
                }
              })}
              style={{ marginRight: '0.5rem' }}
            />
            B2B (Bedrijven)
          </label>
          <label style={{ display: 'flex', alignItems: 'center' }}>
            <input
              type="checkbox"
              checked={formData.targetAudience?.b2c || false}
              onChange={(e) => setFormData({
                ...formData,
                targetAudience: {
                  ...formData.targetAudience,
                  b2c: e.target.checked
                }
              })}
              style={{ marginRight: '0.5rem' }}
            />
            B2C (Consumenten)
          </label>
          <label style={{ display: 'flex', alignItems: 'center' }}>
            <input
              type="checkbox"
              checked={formData.targetAudience?.b2g || false}
              onChange={(e) => setFormData({
                ...formData,
                targetAudience: {
                  ...formData.targetAudience,
                  b2g: e.target.checked
                }
              })}
              style={{ marginRight: '0.5rem' }}
            />
            B2G (Overheid)
          </label>
        </div>
        {errors.targetType && <span className="error-message">{errors.targetType}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="segments">Marktsegmenten *</label>
        <textarea
          id="segments"
          placeholder="Beschrijf uw doelgroepen, gescheiden door komma's"
          value={formData.targetAudience?.segments?.join(', ') || ''}
          onChange={(e) => setFormData({
            ...formData,
            targetAudience: {
              ...formData.targetAudience,
              segments: e.target.value.split(',').map((s: string) => s.trim()).filter((s: string) => s)
            }
          })}
          className={errors.segments ? 'error' : ''}
          rows={3}
        />
        {errors.segments && <span className="error-message">{errors.segments}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="targetDescription">Aanvullende beschrijving doelgroep</label>
        <textarea
          id="targetDescription"
          placeholder="Geef een uitgebreidere beschrijving van uw ideale klanten"
          value={formData.targetAudience?.description || ''}
          onChange={(e) => setFormData({
            ...formData,
            targetAudience: {
              ...formData.targetAudience,
              description: e.target.value
            }
          })}
          rows={3}
        />
      </div>
    </div>
  );
}

function Step8Culture({ formData, setFormData, errors }: any) {
  return (
    <div className="ikp-step">
      <div className="form-group">
        <label htmlFor="coreValues">Kernwaarden *</label>
        <textarea
          id="coreValues"
          placeholder="Voer uw belangrijkste waarden in, gescheiden door komma's (bijv. Integriteit, Innovatie, Klantgerichtheid)"
          value={formData.culture?.coreValues?.join(', ') || ''}
          onChange={(e) => setFormData({
            ...formData,
            culture: {
              ...formData.culture,
              coreValues: e.target.value.split(',').map((s: string) => s.trim()).filter((s: string) => s)
            }
          })}
          className={errors.coreValues ? 'error' : ''}
          rows={3}
        />
        {errors.coreValues && <span className="error-message">{errors.coreValues}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="workEnvironment">Werkomgeving *</label>
        <textarea
          id="workEnvironment"
          placeholder="Beschrijf uw bedrijfscultuur en werkomgeving"
          value={formData.culture?.workEnvironment || ''}
          onChange={(e) => setFormData({
            ...formData,
            culture: {
              ...formData.culture,
              workEnvironment: e.target.value
            }
          })}
          className={errors.workEnvironment ? 'error' : ''}
          rows={4}
        />
        {errors.workEnvironment && <span className="error-message">{errors.workEnvironment}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="socialResponsibility">Maatschappelijke verantwoordelijkheid</label>
        <textarea
          id="socialResponsibility"
          placeholder="Beschrijf uw MVO activiteiten, gescheiden door komma's"
          value={formData.culture?.socialResponsibility?.join(', ') || ''}
          onChange={(e) => setFormData({
            ...formData,
            culture: {
              ...formData.culture,
              socialResponsibility: e.target.value.split(',').map((s: string) => s.trim()).filter((s: string) => s)
            }
          })}
          rows={3}
        />
      </div>
    </div>
  );
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
          className={errors.growthPhase ? 'error' : ''}
        >
          <option value="">Selecteer groeifase</option>
          {IKP_OPTIONS.growthPhase.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {errors.growthPhase && <span className="error-message">{errors.growthPhase}</span>}
      </div>
    </div>
  );
}

function Step10Budget({ formData, setFormData, errors }: any) {
  return (
    <div className="ikp-step">
      <div className="form-group">
        <label htmlFor="budgetMin">Minimum projectbudget (€) *</label>
        <input
          type="number"
          id="budgetMin"
          placeholder="0"
          value={formData.tenderBudget?.min || ''}
          onChange={(e) => setFormData({
            ...formData,
            tenderBudget: {
              ...formData.tenderBudget,
              min: parseInt(e.target.value) || 0
            }
          })}
          className={errors.min ? 'error' : ''}
        />
        {errors.min && <span className="error-message">{errors.min}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="budgetMax">Maximum projectbudget (€) *</label>
        <input
          type="number"
          id="budgetMax"
          placeholder="0"
          value={formData.tenderBudget?.max || ''}
          onChange={(e) => setFormData({
            ...formData,
            tenderBudget: {
              ...formData.tenderBudget,
              max: parseInt(e.target.value) || 0
            }
          })}
          className={errors.max ? 'error' : ''}
        />
        {errors.max && <span className="error-message">{errors.max}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="averageProjectSize">Gemiddelde projectgrootte (€)</label>
        <input
          type="number"
          id="averageProjectSize"
          placeholder="0"
          value={formData.tenderBudget?.averageProjectSize || ''}
          onChange={(e) => setFormData({
            ...formData,
            tenderBudget: {
              ...formData.tenderBudget,
              averageProjectSize: parseInt(e.target.value) || 0
            }
          })}
        />
      </div>
    </div>
  );
}

function Step11Experience({ formData, setFormData, errors }: any) {
  return (
    <div className="ikp-step">
      <div className="form-group">
        <label htmlFor="experienceLevel">Ervaringsniveau *</label>
        <select
          id="experienceLevel"
          value={formData.tenderExperience?.level || ''}
          onChange={(e) => setFormData({
            ...formData,
            tenderExperience: {
              ...formData.tenderExperience,
              level: e.target.value
            }
          })}
          className={errors.level ? 'error' : ''}
        >
          <option value="">Selecteer ervaringsniveau</option>
          {IKP_OPTIONS.experienceLevel.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {errors.level && <span className="error-message">{errors.level}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="previousTenders">Aantal eerdere aanbestedingen</label>
        <input
          type="number"
          id="previousTenders"
          placeholder="0"
          value={formData.tenderExperience?.previousTenders || ''}
          onChange={(e) => setFormData({
            ...formData,
            tenderExperience: {
              ...formData.tenderExperience,
              previousTenders: parseInt(e.target.value) || 0
            }
          })}
        />
      </div>

      <div className="form-group">
        <label htmlFor="successRate">Succespercentage (%)</label>
        <input
          type="number"
          id="successRate"
          placeholder="0"
          min="0"
          max="100"
          value={formData.tenderExperience?.successRate || ''}
          onChange={(e) => setFormData({
            ...formData,
            tenderExperience: {
              ...formData.tenderExperience,
              successRate: parseInt(e.target.value) || 0
            }
          })}
        />
      </div>
    </div>
  );
}

function Step12Motivations({ formData, setFormData, errors }: any) {
  return (
    <div className="ikp-step">
      <div className="form-group">
        <label>Drijfveren voor aanbestedingen *</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
          {IKP_OPTIONS.motivations.map((motivation) => (
            <label key={motivation.value} style={{ display: 'flex', alignItems: 'center' }}>
              <input
                type="checkbox"
                checked={formData.tenderMotivations?.includes(motivation.value) || false}
                onChange={(e) => {
                  const currentMotivations = formData.tenderMotivations || [];
                  const newMotivations = e.target.checked
                    ? [...currentMotivations, motivation.value]
                    : currentMotivations.filter(m => m !== motivation.value);
                  
                  setFormData({
                    ...formData,
                    tenderMotivations: newMotivations
                  });
                }}
                style={{ marginRight: '0.5rem' }}
              />
              {motivation.label}
            </label>
          ))}
        </div>
        {errors.tenderMotivations && <span className="error-message">{errors.tenderMotivations}</span>}
      </div>
    </div>
  );
}

function Step13ProjectTypes({ formData, setFormData, errors }: any) {
  return (
    <div className="ikp-step">
      <div className="form-group">
        <label htmlFor="projectCategories">Projectcategorieën *</label>
        <textarea
          id="projectCategories"
          placeholder="Voer type projecten in waaraan u wilt werken, gescheiden door komma's"
          value={formData.projectTypes?.categories?.join(', ') || ''}
          onChange={(e) => setFormData({
            ...formData,
            projectTypes: {
              ...formData.projectTypes,
              categories: e.target.value.split(',').map((s: string) => s.trim()).filter((s: string) => s)
            }
          })}
          className={errors.categories ? 'error' : ''}
          rows={3}
        />
        {errors.categories && <span className="error-message">{errors.categories}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="preferredDuration">Voorkeur projectduur *</label>
        <select
          id="preferredDuration"
          value={formData.projectTypes?.preferredDuration || ''}
          onChange={(e) => setFormData({
            ...formData,
            projectTypes: {
              ...formData.projectTypes,
              preferredDuration: e.target.value
            }
          })}
          className={errors.preferredDuration ? 'error' : ''}
        >
          <option value="">Selecteer projectduur</option>
          {IKP_OPTIONS.projectDuration.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {errors.preferredDuration && <span className="error-message">{errors.preferredDuration}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="contractTypes">Contract types *</label>
        <textarea
          id="contractTypes"
          placeholder="Voer contracttypes in (bijv. Vaste prijs, Time & Material, Raamcontract), gescheiden door komma's"
          value={formData.projectTypes?.contractTypes?.join(', ') || ''}
          onChange={(e) => setFormData({
            ...formData,
            projectTypes: {
              ...formData.projectTypes,
              contractTypes: e.target.value.split(',').map((s: string) => s.trim()).filter((s: string) => s)
            }
          })}
          className={errors.contractTypes ? 'error' : ''}
          rows={2}
        />
        {errors.contractTypes && <span className="error-message">{errors.contractTypes}</span>}
      </div>
    </div>
  );
}

function Step14Collaboration({ formData, setFormData, errors }: any) {
  return (
    <div className="ikp-step">
      <div className="form-group">
        <label>Samenwerkingsvoorkeuren *</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
          <label style={{ display: 'flex', alignItems: 'center' }}>
            <input
              type="checkbox"
              checked={formData.collaborationPreferences?.consortium || false}
              onChange={(e) => setFormData({
                ...formData,
                collaborationPreferences: {
                  ...formData.collaborationPreferences,
                  consortium: e.target.checked
                }
              })}
              style={{ marginRight: '0.5rem' }}
            />
            Consortium (Samenwerking met andere partijen)
          </label>
          <label style={{ display: 'flex', alignItems: 'center' }}>
            <input
              type="checkbox"
              checked={formData.collaborationPreferences?.subcontracting || false}
              onChange={(e) => setFormData({
                ...formData,
                collaborationPreferences: {
                  ...formData.collaborationPreferences,
                  subcontracting: e.target.checked
                }
              })}
              style={{ marginRight: '0.5rem' }}
            />
            Onderaanneming
          </label>
          <label style={{ display: 'flex', alignItems: 'center' }}>
            <input
              type="checkbox"
              checked={formData.collaborationPreferences?.mainContracting || false}
              onChange={(e) => setFormData({
                ...formData,
                collaborationPreferences: {
                  ...formData.collaborationPreferences,
                  mainContracting: e.target.checked
                }
              })}
              style={{ marginRight: '0.5rem' }}
            />
            Hoofdaanneming
          </label>
        </div>
        {errors.collaborationPreferences && <span className="error-message">{errors.collaborationPreferences}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="preferredPartners">Voorkeur samenwerkingspartners</label>
        <textarea
          id="preferredPartners"
          placeholder="Voer namen van voorkeurspartners in, gescheiden door komma's"
          value={formData.collaborationPreferences?.preferredPartners?.join(', ') || ''}
          onChange={(e) => setFormData({
            ...formData,
            collaborationPreferences: {
              ...formData.collaborationPreferences,
              preferredPartners: e.target.value.split(',').map((s: string) => s.trim()).filter((s: string) => s)
            }
          })}
          rows={2}
        />
      </div>
    </div>
  );
}

function Step15CPVCodes({ formData, setFormData, errors }: any) {
  return (
    <div className="ikp-step">
      <div className="form-group">
        <label htmlFor="primaryCPV">Primaire CPV codes *</label>
        <textarea
          id="primaryCPV"
          placeholder="Voer primaire CPV codes in, gescheiden door komma's (bijv. 45000000, 72000000)"
          value={formData.cpvCodes?.primary?.join(', ') || ''}
          onChange={(e) => setFormData({
            ...formData,
            cpvCodes: {
              ...formData.cpvCodes,
              primary: e.target.value.split(',').map((s: string) => s.trim()).filter((s: string) => s)
            }
          })}
          className={errors.primary ? 'error' : ''}
          rows={2}
        />
        {errors.primary && <span className="error-message">{errors.primary}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="secondaryCPV">Secundaire CPV codes</label>
        <textarea
          id="secondaryCPV"
          placeholder="Voer secundaire CPV codes in, gescheiden door komma's"
          value={formData.cpvCodes?.secondary?.join(', ') || ''}
          onChange={(e) => setFormData({
            ...formData,
            cpvCodes: {
              ...formData.cpvCodes,
              secondary: e.target.value.split(',').map((s: string) => s.trim()).filter((s: string) => s)
            }
          })}
          rows={2}
        />
      </div>

      <div className="form-group">
        <label htmlFor="cpvDescription">CPV code beschrijvingen</label>
        <textarea
          id="cpvDescription"
          placeholder="Voeg beschrijvingen toe voor de CPV codes, gescheiden door komma's"
          value={formData.cpvCodes?.description?.join(', ') || ''}
          onChange={(e) => setFormData({
            ...formData,
            cpvCodes: {
              ...formData.cpvCodes,
              description: e.target.value.split(',').map((s: string) => s.trim()).filter((s: string) => s)
            }
          })}
          rows={3}
        />
      </div>
    </div>
  );
}