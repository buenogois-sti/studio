'use client';

import React from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ProcessFormStepper } from './ProcessFormStepper';

interface ProcessFormHeaderProps {
  steps: Array<{ id: string; label: string }>;
  currentStep: number;
  onStepClick: (stepIndex: number) => void;
  completionStatus: boolean[];
  isAutoSaving: boolean;
  lastSaveTime: Date | null;
  draftExists: boolean;
  hasErrors: boolean;
  processId?: string;
}

export function ProcessFormHeader({
  steps,
  currentStep,
  onStepClick,
  completionStatus,
  isAutoSaving,
  lastSaveTime,
  draftExists,
  hasErrors,
  processId,
}: ProcessFormHeaderProps) {
  const progressPercentage = Math.round(((currentStep + 1) / steps.length) * 100);

  return (
    <div className="space-y-2 px-1">
      <ProcessFormStepper 
        steps={steps} 
        currentStep={currentStep}
        onStepClick={onStepClick}
        completionStatus={completionStatus}
      />
      
      {/* Barra de progresso */}
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-primary to-emerald-500 transition-all duration-500"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>

      {/* Status indicators */}
      <div className="flex items-center justify-between px-2 text-xs">
        <div className="flex items-center gap-1.5">
          {isAutoSaving && (
            <div className="flex items-center gap-1 text-blue-600 animate-pulse">
              <div className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
              Salvando...
            </div>
          )}
          {lastSaveTime && !isAutoSaving && (
            <div className="text-muted-foreground">
              Salvo: {lastSaveTime.toLocaleTimeString()}
            </div>
          )}
          {draftExists && !processId && (
            <div className="flex items-center gap-1 text-amber-600">
              <AlertCircle className="h-3 w-3" />
              Rascunho detectado
            </div>
          )}
        </div>
        {hasErrors && (
          <div className="flex items-center gap-1 text-destructive">
            <AlertCircle className="h-3 w-3" />
            Valide os campos
          </div>
        )}
      </div>
    </div>
  );
}
