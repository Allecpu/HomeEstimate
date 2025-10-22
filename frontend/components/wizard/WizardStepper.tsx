'use client';

import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface WizardStep {
  step: number;
  title: string;
  description: string;
}

interface WizardStepperProps {
  steps: WizardStep[];
  currentStep: number;
  completedSteps: number[];
}

export function WizardStepper({ steps, currentStep, completedSteps }: WizardStepperProps) {
  return (
    <div className="w-full py-8">
      <div className="relative">
        {/* Progress bar */}
        <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-200">
          <div
            className="h-full bg-blue-600 transition-all duration-300"
            style={{
              width: `${((currentStep - 1) / (steps.length - 1)) * 100}%`,
            }}
          />
        </div>

        {/* Steps */}
        <div className="relative flex justify-between">
          {steps.map((step) => {
            const isCompleted = completedSteps.includes(step.step);
            const isCurrent = currentStep === step.step;
            const isPast = step.step < currentStep;

            return (
              <div key={step.step} className="flex flex-col items-center" style={{ width: '120px' }}>
                {/* Circle */}
                <div
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 bg-white',
                    {
                      'border-blue-600 bg-blue-600 text-white': isCurrent || isCompleted || isPast,
                      'border-gray-300 text-gray-400': !isCurrent && !isCompleted && !isPast,
                    }
                  )}
                >
                  {isCompleted || isPast ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <span className="text-sm font-semibold">{step.step}</span>
                  )}
                </div>

                {/* Text */}
                <div className="mt-2 text-center">
                  <p
                    className={cn('text-sm font-medium', {
                      'text-blue-600': isCurrent,
                      'text-gray-900': isCompleted || isPast,
                      'text-gray-400': !isCurrent && !isCompleted && !isPast,
                    })}
                  >
                    {step.title}
                  </p>
                  <p className="text-xs text-gray-500 mt-1 hidden sm:block">{step.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
