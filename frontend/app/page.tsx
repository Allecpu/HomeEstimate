'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { WizardStepper } from '@/components/wizard/WizardStepper';
import { Step1UrlInput } from '@/components/wizard/Step1UrlInput';
import { Step2CompleteData } from '@/components/wizard/Step2CompleteData';
import { Step3VerifyLocation } from '@/components/wizard/Step3VerifyLocation';
import { Step4Calculation } from '@/components/wizard/Step4Calculation';

const WIZARD_STEPS = [
  {
    step: 1,
    title: 'URL Annuncio',
    description: 'Incolla il link',
  },
  {
    step: 2,
    title: 'Completa Dati',
    description: 'Integra informazioni',
  },
  {
    step: 3,
    title: 'Verifica Posizione',
    description: 'Conferma su mappa',
  },
  {
    step: 4,
    title: 'Calcolo',
    description: 'Elaborazione stima',
  },
  {
    step: 5,
    title: 'Report',
    description: 'Visualizza risultati',
  },
];

export default function Home() {
  const searchParams = useSearchParams();
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [wizardData, setWizardData] = useState<any>({});

  // Check for extension data on mount
  useEffect(() => {
    const extensionDataParam = searchParams.get('extensionData');
    if (extensionDataParam) {
      try {
        const extensionData = JSON.parse(decodeURIComponent(extensionDataParam));
        console.log('Extension data received:', extensionData);
        setWizardData(extensionData);
        setCompletedSteps([1]);
        setCurrentStep(2);
      } catch (error) {
        console.error('Error parsing extension data:', error);
      }
    }
  }, [searchParams]);

  const handleStep1Complete = (data: any) => {
    setWizardData({ ...wizardData, ...data });
    setCompletedSteps([...completedSteps, 1]);
    setCurrentStep(2);
  };

  const handleStep2Complete = (data: any) => {
    setWizardData({ ...wizardData, ...data });
    setCompletedSteps([...completedSteps, 2]);
    setCurrentStep(3);
  };

  const handleStep3Complete = (data: any) => {
    setWizardData({ ...wizardData, ...data });
    setCompletedSteps([...completedSteps, 3]);
    setCurrentStep(4);
  };

  const handleStep4Complete = (data: any) => {
    setWizardData({ ...wizardData, ...data });
    setCompletedSteps([...completedSteps, 4]);
    setCurrentStep(5);
  };

  const handleBack = () => {
    setCurrentStep(Math.max(1, currentStep - 1));
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">HomeEstimate</h1>
          <p className="text-lg text-gray-600">Stima professionale del valore immobiliare</p>
        </div>

        {/* Wizard Stepper */}
        <WizardStepper
          steps={WIZARD_STEPS}
          currentStep={currentStep}
          completedSteps={completedSteps}
        />

        {/* Steps Content */}
        <div className="mt-8">
          {currentStep === 1 && (
            <Step1UrlInput
              onNext={handleStep1Complete}
              initialUrl={wizardData.url}
            />
          )}

          {currentStep === 2 && (
            <Step2CompleteData
              onNext={handleStep2Complete}
              onBack={handleBack}
              initialData={wizardData}
            />
          )}

          {currentStep === 3 && (
            <Step3VerifyLocation
              onNext={handleStep3Complete}
              onBack={handleBack}
              propertyData={wizardData}
            />
          )}

          {currentStep === 4 && (
            <Step4Calculation
              onNext={handleStep4Complete}
              onBack={handleBack}
              propertyData={wizardData}
            />
          )}

          {currentStep === 5 && (
            <div className="text-center py-12">
              <p className="text-gray-600">Step 5: Report (in sviluppo)</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
