'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { CheckCircle2, Lock } from 'lucide-react';

interface Step {
  id: string;
  label: string;
  isDisabled?: boolean;
}

interface ProcessFormStepperProps {
  steps: Step[];
  currentStep: number;
  onStepClick?: (index: number) => void;
  completionStatus?: boolean[];
}

const StepCircle = ({ index, currentStep, isDisabled, isCompleted }: { index: number; currentStep: number; isDisabled?: boolean; isCompleted?: boolean }) => (
  <div className={cn(
    "w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-black transition-all z-10 relative",
    "hover:scale-125 cursor-pointer duration-200",
    currentStep === index ? "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground scale-110 shadow-lg ring-4 ring-primary/20" : 
    isCompleted ? "bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-md" : 
    "bg-muted text-muted-foreground",
    isDisabled && "opacity-50 cursor-not-allowed"
  )}>
    {isCompleted ? <CheckCircle2 className="h-5 w-5" /> : index + 1}
  </div>
);

const StepLabel = ({ label, isActive, isCompleted }: { label: string; isActive: boolean; isCompleted?: boolean }) => (
  <div className="flex flex-col items-center gap-0.5">
    <span className={cn(
      "text-[9px] font-bold uppercase tracking-widest text-center transition-colors",
      isActive ? "text-primary font-black" : 
      isCompleted ? "text-emerald-600" : 
      "text-muted-foreground"
    )}>
      {label}
    </span>
    {isActive && <div className="h-0.5 w-8 bg-primary rounded-full" />}
  </div>
);

const StepConnector = ({ isCompleted, isActive }: { isCompleted: boolean; isActive: boolean }) => (
  <div className="absolute top-4.5 left-1/2 w-full h-1 -z-0 flex items-center justify-center overflow-hidden">
    <div className={cn(
      "h-0.5 w-full transition-all duration-500",
      isCompleted ? "bg-emerald-500" : 
      isActive ? "bg-gradient-to-r from-primary/50 to-primary/20" :
      "bg-muted"
    )} />
  </div>
);

const StepProgress = ({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) => (
  <div className="text-[11px] font-bold text-muted-foreground text-center tracking-wide">
    Etapa {currentStep + 1} de {totalSteps}
  </div>
);

export const ProcessFormStepper = React.memo(({ steps, currentStep, onStepClick, completionStatus = [] }: ProcessFormStepperProps) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-2 py-4 rounded-xl bg-muted/40 backdrop-blur-sm border border-border/50 hover:bg-muted/60 transition-all duration-300">
        {steps.map((step, index) => (
          <div 
            key={step.id} 
            className="flex flex-col items-center gap-2 flex-1 relative cursor-pointer"
            onClick={() => !step.isDisabled && onStepClick?.(index)}
          >
            <StepCircle 
              index={index} 
              currentStep={currentStep} 
              isDisabled={step.isDisabled}
              isCompleted={completionStatus[index] || currentStep > index}
            />
            <StepLabel 
              label={step.label} 
              isActive={currentStep === index}
              isCompleted={completionStatus[index] || currentStep > index}
            />
            {index < steps.length - 1 && (
              <StepConnector 
                isCompleted={currentStep > index} 
                isActive={currentStep === index || currentStep > index}
              />
            )}
          </div>
        ))}
      </div>
      
      <div className="flex items-center justify-between px-4 py-2 bg-background/80 rounded-lg border border-border/30">
        <StepProgress currentStep={currentStep} totalSteps={steps.length} />
        <div className="flex items-center gap-1">
          {Array.from({ length: steps.length }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-1.5 rounded-full transition-all",
                i <= currentStep ? "bg-primary" : "bg-muted",
                i === currentStep && "w-3"
              )}
              style={{
                width: i === currentStep ? "12px" : "4px"
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
});

ProcessFormStepper.displayName = 'ProcessFormStepper';
