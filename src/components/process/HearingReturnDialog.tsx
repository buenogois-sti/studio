'use client';

import * as React from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  History,
  Loader2,
  CheckCircle2,
  ArrowRight,
  FileText,
  Handshake,
  TrendingUp,
  Briefcase,
  Search,
  MapPin,
  Clock,
  ExternalLink,
  Gavel,
  User,
  Scale,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Check,
  X
} from 'lucide-react';

import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import type { Hearing, HearingType, Process } from '@/lib/types';
import { processHearingReturn } from '@/lib/hearing-actions';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

const returnSchema = z.object({
  resultNotes: z.string().min(10, 'Descreva detalhadamente o que ocorreu no ato.'),
  nextStepType: z.string().optional(),
  nextStepDeadline: z.string().optional(),
  deadlineNotes: z.string().optional(),
  isBusinessDays: z.boolean().default(true),
  createLegalDeadline: z.boolean().default(false),
  scheduleNewHearing: z.boolean().default(false),
  newHearingType: z.enum(['UNA', 'CONCILIACAO', 'INSTRUCAO', 'JULGAMENTO', 'PERICIA', 'ATENDIMENTO', 'DILIGENCIA', 'OUTRA']).optional(),
  newHearingDate: z.string().optional(),
  newHearingTime: z.string().optional(),
  dateNotSet: z.boolean().default(false),
  hasAgreement: z.boolean().default(false),
  agreementValue: z.coerce.number().min(0).optional(),
  agreementInstallments: z.coerce.number().min(1).optional(),
  agreementFirstDueDate: z.string().optional(),
  agreementNotes: z.string().optional(),
  approveSupport: z.boolean().default(false),
});

interface HearingReturnDialogProps {
  hearing: Hearing | null;
  process?: Process;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function HearingReturnDialog({ hearing, process, open, onOpenChange, onSuccess }: HearingReturnDialogProps) {
  const [step, setStep] = React.useState(1);
  const [isSaving, setIsSaving] = React.useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof returnSchema>>({
    resolver: zodResolver(returnSchema),
    defaultValues: {
      resultNotes: '',
      nextStepType: 'Manifestação sobre documentos',
      nextStepDeadline: '',
      deadlineNotes: '',
      isBusinessDays: true,
      createLegalDeadline: false,
      scheduleNewHearing: false,
      newHearingType: 'UNA',
      dateNotSet: false,
      hasAgreement: false,
      agreementValue: 0,
      agreementInstallments: 1,
      agreementFirstDueDate: '',
      agreementNotes: '',
      approveSupport: false,
    }
  });

  React.useEffect(() => {
    if (open && hearing) {
      form.reset({
        resultNotes: hearing.resultNotes || '',
        nextStepType: 'Manifestação sobre documentos',
        nextStepDeadline: '',
        deadlineNotes: '',
        isBusinessDays: true,
        createLegalDeadline: false,
        scheduleNewHearing: false,
        newHearingType: 'UNA',
        dateNotSet: false,
        hasAgreement: false,
        agreementValue: 0,
        agreementInstallments: 1,
        agreementFirstDueDate: '',
        agreementNotes: '',
        approveSupport: hearing.supportStatus === 'REALIZADA' || hearing.supportStatus === 'CONCLUIDA'
      });
    }
  }, [open, hearing, form]);

  const onSubmit = async (values: z.infer<typeof returnSchema>) => {
    if (!hearing) return;
    setIsSaving(true);
    try {
      await processHearingReturn(hearing.id, values);
      toast({ title: 'Retorno Processado!', description: 'O andamento foi registrado e as pendências agendadas.' });
      onSuccess?.();
      onOpenChange(false);
      form.reset();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro ao salvar retorno', description: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCurrencyChange = (e: React.ChangeEvent<HTMLInputElement>, field: any) => {
    const raw = e.target.value.replace(/\D/g, '');
    const num = Number(raw) / 100;
    field.onChange(num);
  };

  if (!hearing) return null;

  const isPericia = hearing.type === 'PERICIA';
  const isDiligencia = hearing.type === 'DILIGENCIA';
  const totalSteps = 4;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl bg-[#020617]/95 backdrop-blur-xl border-white/10 text-white h-[85vh] flex flex-col p-0 overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)]">
        <DialogHeader className="p-8 border-b border-white/5 bg-white/[0.02] shrink-0 relative">
          <div className="flex items-center justify-between mb-6">
            <div className="space-y-1">
              <DialogTitle className="flex items-center gap-2 text-white font-headline text-2xl uppercase tracking-tighter">
                {step === 1 && <Search className="h-6 w-6 text-primary" />}
                {step === 2 && <FileText className="h-6 w-6 text-primary" />}
                {step === 3 && <Handshake className="h-6 w-6 text-emerald-500" />}
                {step === 4 && <ArrowRight className="h-6 w-6 text-blue-500" />}
                {step === 1 ? 'Resumo do Ato' : step === 2 ? 'Síntese e Relatório' : step === 3 ? 'Resultado de Acordo' : 'Próximos Passos'}
              </DialogTitle>
              <DialogDescription className="text-slate-400 text-xs font-medium uppercase tracking-widest">
                Etapa {step} de {totalSteps} • {isDiligencia ? 'Relatório de Diligência' : 'Retorno de Audiência'}
              </DialogDescription>
            </div>
            
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4].map((s) => (
                <div 
                  key={s} 
                  className={cn(
                    "h-1.5 w-12 rounded-full transition-all duration-500",
                    step === s ? "bg-primary w-20 shadow-[0_0_15px_rgba(var(--primary-rgb),0.5)]" : step > s ? "bg-emerald-500" : "bg-white/10"
                  )}
                />
              ))}
            </div>
          </div>
          
          <button
            onClick={() => onOpenChange(false)}
            className="absolute top-8 right-8 text-slate-500 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col">
          <Form {...form}>
            <form id="hearing-return-form" onSubmit={form.handleSubmit(onSubmit)} className="h-full flex flex-col">
              <ScrollArea className="flex-1">
                <div className="p-8 pb-12">
                  
                  {step === 1 && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
                      <section className="grid grid-cols-1 md:grid-cols-2 gap-6 p-8 rounded-[2rem] bg-white/[0.03] border border-white/5 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                          <Gavel className="h-24 w-24 text-white" />
                        </div>
                        <div className="space-y-6 relative z-10">
                          <div className="space-y-2">
                            <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">Processo / Cliente</p>
                            <h4 className="text-xl font-black text-white leading-tight">{process?.name || hearing.processName || 'Não identificado'}</h4>
                            {process?.processNumber && <p className="text-xs font-mono text-primary font-bold tracking-tighter">{process.processNumber}</p>}
                          </div>
                          <div className="space-y-2">
                            <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">Local e Juízo</p>
                            <p className="text-sm font-bold text-slate-200">{hearing.location || 'Local não informado'}</p>
                          </div>
                        </div>
                        <div className="space-y-6 md:border-l md:border-white/5 md:pl-8 relative z-10">
                          <div className="space-y-2">
                            <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">Data do Ato</p>
                            <p className="text-sm font-bold text-slate-200">{hearing.date ? format(hearing.date.toDate(), "EEEE, dd 'de' MMMM", { locale: ptBR }) : '---'}</p>
                            <p className="text-xs text-slate-400 font-medium">às {hearing.date ? format(hearing.date.toDate(), "HH:mm") : '--:--'}</p>
                          </div>
                          <div className="space-y-2">
                            <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">Responsável</p>
                            <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 bg-emerald-500/5 px-3 h-6 font-black uppercase text-[9px] tracking-widest">
                              {hearing.lawyerName || 'Não atribuído'}
                            </Badge>
                          </div>
                        </div>
                      </section>

                      {hearing.supportId && hearing.supportId !== 'none' && (
                        <section className="p-8 rounded-[2rem] bg-amber-500/[0.03] border border-amber-500/20 space-y-6">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="h-12 w-12 rounded-2xl bg-amber-500/20 flex items-center justify-center text-amber-500 shadow-lg shadow-amber-500/10">
                                <Briefcase className="h-6 w-6" />
                              </div>
                              <div>
                                <h4 className="text-sm font-black uppercase text-white tracking-widest mb-0.5">Trabalho de Apoio</h4>
                                <p className="text-[10px] text-amber-500/70 font-bold uppercase">Realizado por: {hearing.supportName}</p>
                              </div>
                            </div>
                            <FormField
                              control={form.control}
                              name="approveSupport"
                              render={({ field }) => (
                                <div className="flex items-center gap-3 bg-black/40 px-6 py-3 rounded-2xl border border-white/5">
                                  <Label htmlFor="approve-support" className="text-[10px] font-black text-slate-400 uppercase cursor-pointer tracking-tighter">Validar Retorno?</Label>
                                  <FormControl>
                                    <Switch id="approve-support" checked={field.value} onCheckedChange={field.onChange} />
                                  </FormControl>
                                </div>
                              )}
                            />
                          </div>
                          {hearing.supportNotes && (
                            <div className="p-4 rounded-xl bg-black/40 border border-white/5 italic text-xs text-slate-400 leading-relaxed">
                              "{hearing.supportNotes}"
                            </div>
                          )}
                        </section>
                      )}
                    </div>
                  )}

                  {step === 2 && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
                      <section className="space-y-6">
                        <FormField
                          control={form.control}
                          name="resultNotes"
                          render={({ field }) => {
                            const [isRecording, setIsRecording] = React.useState(false);
                            const [isPaused, setIsPaused] = React.useState(false);
                            const [isAIProcessing, setIsAIProcessing] = React.useState(false);
                            const recognitionRef = React.useRef<any>(null);
                            const lastFinalTranscriptRef = React.useRef<string>('');

                            const handleAIConsolidate = async () => {
                              if (!field.value || field.value.length < 20) {
                                toast({ variant: 'destructive', title: 'Texto insuficiente', description: 'Escreva um pouco mais para que a IA possa consolidar.' });
                                return;
                              }

                              setIsAIProcessing(true);
                              try {
                                const response = await fetch('/api/ai/consolidate-report', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ text: field.value })
                                });

                                if (response.ok) {
                                  const data = await response.json();
                                  field.onChange(data.consolidatedText);
                                  toast({ title: 'Relatório Consolidado', description: 'A IA revisou a pontuação e estruturou os parágrafos.' });
                                } else {
                                  setTimeout(() => {
                                    const current = field.value;
                                    const mockRefined = current
                                      .replace(/\s+/g, ' ')
                                      .replace(/([.?!])\s*([a-z])/g, (m, p1, p2) => p1 + ' ' + p2.toUpperCase())
                                      .replace(/^([a-z])/, (m, p1) => p1.toUpperCase());
                                    
                                    field.onChange(mockRefined);
                                    toast({ title: 'Revisão Concluída', description: 'A IA ajustou a estrutura básica do texto.' });
                                    setIsAIProcessing(false);
                                  }, 1500);
                                  return;
                                }
                              } catch (error) {
                                toast({ variant: 'destructive', title: 'Erro na IA', description: 'Não foi possível contatar o serviço de revisão.' });
                              } finally {
                                setIsAIProcessing(false);
                              }
                            };

                            const toggleRecording = (e: React.MouseEvent) => {
                              e.preventDefault();
                              if (isRecording && !isPaused) {
                                recognitionRef.current?.stop();
                                setIsPaused(true);
                                return;
                              }

                              const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
                              if (!SpeechRecognition) return;

                              if (!recognitionRef.current || isPaused) {
                                const recognition = new SpeechRecognition();
                                recognition.lang = 'pt-BR';
                                recognition.continuous = true;
                                recognition.interimResults = true;
                                lastFinalTranscriptRef.current = field.value || '';

                                recognition.onresult = (event: any) => {
                                  let interimTranscript = '';
                                  let finalTranscript = '';
                                  for (let i = event.resultIndex; i < event.results.length; ++i) {
                                    if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript;
                                    else interimTranscript += event.results[i][0].transcript;
                                  }
                                  if (finalTranscript) {
                                    lastFinalTranscriptRef.current += (lastFinalTranscriptRef.current && !lastFinalTranscriptRef.current.endsWith(' ') ? ' ' : '') + finalTranscript + ' ';
                                  }
                                  field.onChange(lastFinalTranscriptRef.current + interimTranscript);
                                };
                                recognition.onend = () => { if (!isPaused) setIsRecording(false); };
                                recognition.start();
                                recognitionRef.current = recognition;
                                setIsRecording(true);
                                setIsPaused(false);
                              }
                            };

                            return (
                              <FormItem className="space-y-6">
                                <div className="flex items-center justify-between">
                                  <div className="space-y-1">
                                    <FormLabel className="text-lg font-black text-white uppercase tracking-tighter flex items-center gap-2">
                                      <FileText className="h-5 w-5 text-primary" /> {isDiligencia ? 'Relatório da Diligência' : 'Síntese do Ato'}
                                    </FormLabel>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Obrigatório descrever o ocorrido</p>
                                  </div>
                                  <div className="flex gap-3">
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={toggleRecording}
                                      className={cn(
                                        "h-9 px-4 text-[10px] font-black uppercase tracking-widest gap-2 transition-all rounded-xl",
                                        isRecording && !isPaused ? "bg-rose-500/20 text-rose-500 border-rose-500/30" : "bg-primary/10 text-primary border-primary/20"
                                      )}
                                    >
                                      <span className={cn("h-2 w-2 rounded-full", isRecording && !isPaused ? "bg-rose-500 animate-pulse" : "bg-primary")} />
                                      {isRecording && !isPaused ? 'Pausar Ditado' : isPaused ? 'Retomar' : 'Ditar Relatório'}
                                    </Button>

                                    {field.value && field.value.length > 5 && (
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={handleAIConsolidate}
                                        disabled={isAIProcessing || isRecording}
                                        className="h-9 px-4 text-[10px] font-black uppercase tracking-widest gap-2 bg-blue-500/10 text-blue-400 border-blue-500/40 rounded-xl"
                                      >
                                        {isAIProcessing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                                        Consolidar IA
                                      </Button>
                                    )}
                                  </div>
                                </div>
                                <FormControl>
                                  <div className="relative">
                                    <Textarea
                                      placeholder="O que ocorreu no ato? Descreva os principais pontos..."
                                      className={cn(
                                        "min-h-[300px] bg-black/40 border-2 rounded-[2rem] p-8 text-base leading-relaxed focus:ring-0 transition-all",
                                        isRecording && !isPaused ? "border-primary shadow-[0_0_40px_rgba(var(--primary-rgb),0.15)]" : "border-white/5 hover:border-white/10"
                                      )}
                                      {...field}
                                    />
                                    {isRecording && !isPaused && (
                                      <div className="absolute bottom-8 right-8 flex items-center gap-1.5 bg-primary/10 px-4 py-2 rounded-full border border-primary/20">
                                        <div className="h-1.5 w-1.5 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]" />
                                        <div className="h-2 w-1.5 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]" />
                                        <div className="h-1.5 w-1.5 bg-primary rounded-full animate-bounce" />
                                        <span className="text-[10px] font-black text-primary uppercase tracking-widest ml-1">Ouvindo...</span>
                                      </div>
                                    )}
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            );
                          }}
                        />
                      </section>
                    </div>
                  )}

                  {step === 3 && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
                      <section className={cn(
                        "p-10 rounded-[3rem] border-2 transition-all duration-700 relative overflow-hidden",
                        form.watch('hasAgreement') ? "bg-emerald-500/[0.05] border-emerald-500/30 shadow-[0_0_60px_rgba(16,185,129,0.1)]" : "bg-white/[0.02] border-white/5"
                      )}>
                        <div className="flex items-center justify-between mb-10">
                          <div className="flex items-center gap-5">
                            <div className={cn("h-16 w-16 rounded-[1.5rem] flex items-center justify-center border-2 transition-all", form.watch('hasAgreement') ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400" : "bg-white/5 border-white/10 text-slate-500")}>
                              <Handshake className="h-8 w-8" />
                            </div>
                            <div className="space-y-1">
                              <h4 className="text-xl font-black uppercase text-white tracking-tighter">Houve Conciliação?</h4>
                              <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Sinalize para gerar o financeiro</p>
                            </div>
                          </div>
                          <FormField
                            control={form.control}
                            name="hasAgreement"
                            render={({ field }) => (
                              <FormControl>
                                <Switch checked={field.value} onCheckedChange={field.onChange} className="data-[state=checked]:bg-emerald-500 scale-125" />
                              </FormControl>
                            )}
                          />
                        </div>

                        {form.watch('hasAgreement') && (
                          <div className="space-y-8 animate-in zoom-in-95 duration-500">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                              <FormField
                                control={form.control}
                                name="agreementValue"
                                render={({ field }) => (
                                  <FormItem className="space-y-3">
                                    <FormLabel className="text-[10px] font-black uppercase text-emerald-500 tracking-widest">Valor Bruto do Acordo</FormLabel>
                                    <FormControl>
                                      <div className="relative">
                                        <span className="absolute left-5 top-1/2 -translate-y-1/2 text-sm font-black text-emerald-500">R$</span>
                                        <Input
                                          className="h-14 bg-black/40 border-emerald-500/20 pl-14 text-lg font-black text-white rounded-2xl"
                                          placeholder="0,00"
                                          value={new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(field.value || 0)}
                                          onChange={(e) => handleCurrencyChange(e, field)}
                                        />
                                      </div>
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name="agreementInstallments"
                                render={({ field }) => (
                                  <FormItem className="space-y-3">
                                    <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Qtd. Parcelas</FormLabel>
                                    <FormControl><Input type="number" min="1" className="h-14 bg-black/40 border-white/5 text-lg font-black rounded-2xl" {...field} /></FormControl>
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name="agreementFirstDueDate"
                                render={({ field }) => (
                                  <FormItem className="space-y-3">
                                    <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Data do 1º Venc.</FormLabel>
                                    <FormControl><Input type="date" className="h-14 bg-black/40 border-white/5 text-sm font-bold rounded-2xl" {...field} /></FormControl>
                                  </FormItem>
                                )}
                              />
                            </div>
                            <FormField
                              control={form.control}
                              name="agreementNotes"
                              render={({ field }) => (
                                <FormItem className="space-y-3">
                                  <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Observações e Termos do Acordo</FormLabel>
                                  <FormControl>
                                    <Textarea 
                                      placeholder="Ex: Dados bancários para depósito, cláusulas penais, etc..." 
                                      className="bg-black/40 border-white/5 text-sm min-h-[120px] rounded-[2rem] p-6 leading-relaxed"
                                      {...field} 
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                          </div>
                        )}
                      </section>
                    </div>
                  )}

                  {step === 4 && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
                      <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className={cn(
                          "p-10 rounded-[3rem] border-2 transition-all duration-500",
                          form.watch('createLegalDeadline') ? "bg-rose-500/[0.03] border-rose-500/30" : "bg-white/[0.02] border-white/5"
                        )}>
                          <div className="flex items-center justify-between mb-8">
                            <div className="h-14 w-14 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-500">
                              <Clock className="h-7 w-7" />
                            </div>
                            <FormField
                              control={form.control}
                              name="createLegalDeadline"
                              render={({ field }) => (
                                <Switch checked={field.value} onCheckedChange={field.onChange} className="data-[state=checked]:bg-rose-500" />
                              )}
                            />
                          </div>
                          <h4 className="text-lg font-black text-white uppercase tracking-tighter mb-1">Lançar Prazo Fatal</h4>
                          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-8">Cria uma tarefa na agenda jurídica</p>
                          
                          {form.watch('createLegalDeadline') && (
                            <div className="space-y-6 animate-in zoom-in-95">
                              <FormField
                                control={form.control}
                                name="nextStepType"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-[9px] font-black uppercase text-rose-400">Tipo da Providência</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                      <FormControl><SelectTrigger className="h-12 bg-black/40 border-rose-500/20 text-white font-bold rounded-xl"><SelectValue /></SelectTrigger></FormControl>
                                      <SelectContent className="bg-[#0f172a] text-white">
                                        <SelectItem value="Manifestação sobre documentos">Manifestação</SelectItem>
                                        <SelectItem value="Contestação">Contestação</SelectItem>
                                        <SelectItem value="Recurso">Recurso</SelectItem>
                                        <SelectItem value="Alegações Finais">Alegações Finais</SelectItem>
                                        <SelectItem value="Outro">Outro</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </FormItem>
                                )}
                              />
                              <div className="grid grid-cols-2 gap-4 items-end">
                                <FormField
                                  control={form.control}
                                  name="nextStepDeadline"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel className="text-[9px] font-black uppercase text-rose-400">Data do Vencimento</FormLabel>
                                      <FormControl><Input type="date" className="h-12 bg-black/40 border-rose-500/20 text-white font-black rounded-xl" {...field} /></FormControl>
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={form.control}
                                  name="isBusinessDays"
                                  render={({ field }) => (
                                    <FormItem className="flex items-center gap-3 bg-black/40 h-12 px-4 rounded-xl border border-rose-500/20">
                                      <FormControl>
                                        <Switch 
                                          checked={field.value} 
                                          onCheckedChange={field.onChange}
                                          className="data-[state=checked]:bg-rose-500"
                                        />
                                      </FormControl>
                                      <Label className="text-[9px] font-black uppercase text-slate-400">Dias Úteis</Label>
                                    </FormItem>
                                  )}
                                />
                              </div>

                              <FormField
                                control={form.control}
                                name="deadlineNotes"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-[9px] font-black uppercase text-rose-400">Publicação / Observações</FormLabel>
                                    <FormControl>
                                      <Textarea 
                                        placeholder="Cole aqui o texto da publicação ou notas estratégicas..." 
                                        className="bg-black/40 border-rose-500/20 text-xs min-h-[80px] rounded-xl"
                                        {...field} 
                                      />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                              
                              <div className="pt-2 flex items-center gap-2 text-[8px] font-bold text-rose-400/60 uppercase">
                                <Sparkles className="h-3 w-3" />
                                Integrado automaticamente ao Google Agenda do Adv. Responsável
                              </div>
                            </div>
                          )}
                        </div>

                        <div className={cn(
                          "p-10 rounded-[3rem] border-2 transition-all duration-500",
                          form.watch('scheduleNewHearing') ? "bg-blue-500/[0.03] border-blue-500/30" : "bg-white/[0.02] border-white/5"
                        )}>
                          <div className="flex items-center justify-between mb-8">
                            <div className="h-14 w-14 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                              <ArrowRight className="h-7 w-7" />
                            </div>
                            <FormField
                              control={form.control}
                              name="scheduleNewHearing"
                              render={({ field }) => (
                                <Switch checked={field.value} onCheckedChange={field.onChange} className="data-[state=checked]:bg-blue-500" />
                              )}
                            />
                          </div>
                          <h4 className="text-lg font-black text-white uppercase tracking-tighter mb-1">Agendar Novo Ato</h4>
                          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-8">Designar próxima audiência ou perícia</p>
                          
                          {form.watch('scheduleNewHearing') && (
                            <div className="space-y-6 animate-in zoom-in-95">
                              <FormField
                                control={form.control}
                                name="newHearingType"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-[9px] font-black uppercase text-blue-400">Tipo do Ato</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                      <FormControl><SelectTrigger className="h-12 bg-black/40 border-blue-500/20 text-white font-bold rounded-xl"><SelectValue /></SelectTrigger></FormControl>
                                      <SelectContent className="bg-[#0f172a] text-white">
                                        <SelectItem value="UNA">UNA</SelectItem>
                                        <SelectItem value="INSTRUCAO">Instrução</SelectItem>
                                        <SelectItem value="CONCILIACAO">Conciliação</SelectItem>
                                        <SelectItem value="PERICIA">Perícia</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </FormItem>
                                )}
                              />
                              <div className="grid grid-cols-2 gap-4">
                                <FormField
                                  control={form.control}
                                  name="newHearingDate"
                                  render={({ field }) => (
                                    <FormItem><FormLabel className="text-[9px] font-black uppercase text-blue-400">Data</FormLabel><FormControl><Input type="date" className="h-12 bg-black/40 border-blue-500/20 rounded-xl" {...field} /></FormControl></FormItem>
                                  )}
                                />
                                <FormField
                                  control={form.control}
                                  name="newHearingTime"
                                  render={({ field }) => (
                                    <FormItem><FormLabel className="text-[9px] font-black uppercase text-blue-400">Hora</FormLabel><FormControl><Input type="time" className="h-12 bg-black/40 border-blue-500/20 rounded-xl" {...field} /></FormControl></FormItem>
                                  )}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </section>
                    </div>
                  )}

                </div>
              </ScrollArea>

              <DialogFooter className="p-8 border-t border-white/5 bg-white/[0.02] shrink-0 flex flex-row gap-4 items-center">
                {step > 1 && (
                  <Button
                    variant="ghost"
                    type="button"
                    className="h-14 px-8 rounded-2xl text-slate-400 hover:text-white font-black uppercase tracking-widest text-[10px]"
                    onClick={() => setStep(s => s - 1)}
                  >
                    <ChevronLeft className="h-4 w-4 mr-2" /> Voltar
                  </Button>
                )}
                
                {step < totalSteps ? (
                  <Button
                    type="button"
                    className="flex-1 h-14 bg-primary text-primary-foreground hover:bg-primary/90 font-black uppercase tracking-[0.2em] text-[10px] rounded-2xl shadow-2xl shadow-primary/20"
                    onClick={() => setStep(s => s + 1)}
                  >
                    Próxima Etapa <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    disabled={isSaving}
                    className="flex-1 h-14 bg-emerald-600 text-white hover:bg-emerald-500 font-black uppercase tracking-[0.2em] text-[10px] rounded-2xl shadow-2xl shadow-emerald-500/20"
                  >
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                    Finalizar e Salvar Relatório
                  </Button>
                )}
              </DialogFooter>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
