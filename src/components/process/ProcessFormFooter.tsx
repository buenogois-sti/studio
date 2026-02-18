
'use client';

import React from 'react';
import { ChevronRight, ChevronLeft, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SheetFooter } from '@/components/ui/sheet';

interface ProcessFormFooterProps {
  currentStep: number;
  totalSteps: number;
  isSaving: boolean;
  hasErrors: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onSubmit: () => void;
}

export function ProcessFormFooter({
  currentStep,
  totalSteps,
  isSaving,
  hasErrors,
  onPrevious,
  onNext,
  onSubmit,
}: ProcessFormFooterProps) {
  const isLastStep = currentStep === totalSteps - 1;
  const isFirstStep = currentStep === 0;

  return (
    <SheetFooter className="border-none pt-0 bg-transparent">
      <div className="flex justify-between sm:w-full w-full gap-3 px-6 py-4">
        <Button 
          type="button" 
          variant="outline" 
          onClick={onPrevious} 
          disabled={isFirstStep || isSaving}
          className="gap-2 hover:bg-muted/50 transition-all h-11"
          aria-label="Voltar etapa"
        >
          <ChevronLeft className="h-4 w-4" /> Anterior
        </Button>

        <div className="flex items-center gap-2 flex-1 justify-center text-[10px] font-black uppercase text-muted-foreground tracking-widest">
          <span className="text-white">{currentStep + 1}</span>
          <span>de</span>
          <span>{totalSteps}</span>
        </div>

        {!isLastStep ? (
          <Button 
            type="button" 
            onClick={onNext} 
            className="gap-2 min-w-[120px] bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase tracking-widest text-[10px] h-11 transition-all"
            aria-label="Próxima etapa"
          >
            Próximo <ChevronRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button 
            type="submit" 
            disabled={isSaving || hasErrors} 
            className="gap-2 min-w-[140px] bg-emerald-600 hover:bg-emerald-700 font-black uppercase tracking-widest text-[10px] h-11 transition-all disabled:opacity-50"
            onClick={onSubmit}
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            {isSaving ? 'Salvando...' : 'Finalizar'}
          </Button>
        )}
      </div>
    </SheetFooter>
  );
}
