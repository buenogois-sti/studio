'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { CheckCircle2 } from 'lucide-react';

interface Step {
  id: string;
  label: string;
}

interface ProcessFormStepperProps {
  steps: Step[];
  currentStep: number;
}

const StepCircle = ({ index, currentStep }: { index: number; currentStep: number }) => (
  <div className={cn(
    "w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black transition-all z-10",
    currentStep === index ? "bg-primary text-primary-foreground scale-110 shadow-lg" : 
    currentStep > index ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground"
  )}>
    {currentStep > index ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
  </div>
);

const StepLabel = ({ label, isActive }: { label: string; isActive: boolean }) => (
  <span className={cn(
    "text-[9px] font-bold uppercase tracking-tighter text-center",
    isActive ? "text-primary" : "text-muted-foreground"
  )}>
    {label}
  </span>
);

const StepConnector = ({ isCompleted }: { isCompleted: boolean }) => (
  <div className={cn(
    "absolute top-4 left-1/2 w-full h-[2px] -z-0 transition-colors",
    isCompleted ? "bg-emerald-500" : "bg-muted"
  )} />
);

export const ProcessFormStepper = React.memo(({ steps, currentStep }: ProcessFormStepperProps) => {
  return (
    <div className="flex items-center justify-between px-1 mb-6">
      {steps.map((step, index) => (
        <div key={step.id} className="flex flex-col items-center gap-1.5 flex-1 relative">
          <StepCircle index={index} currentStep={currentStep} />
          <StepLabel label={step.label} isActive={currentStep === index} />
          {index < steps.length - 1 && (
            <StepConnector isCompleted={currentStep > index} />
          )}
        </div>
      ))}
    </div>
  );
});

ProcessFormStepper.displayName = 'ProcessFormStepper';
