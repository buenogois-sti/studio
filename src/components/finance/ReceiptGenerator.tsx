"use client";

import React, { useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText, Download, Plus, Trash2, Printer, Share2, ShieldCheck } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export type ReceiptType = 'HONORARIOS' | 'REPASSE_CLIENTE' | 'DILIGENCIA' | 'ORDEM_PAGAMENTO' | 'PRESTADORES' | 'SALARIO' | 'OUTROS';

interface ReceiptItem {
  id: string;
  description: string;
  amount: number;
  type: 'addition' | 'deduction';
}

interface ReceiptData {
  type: ReceiptType;
  receiptNumber: string;
  date: string;
  payerName: string;
  payerDoc: string; // CPF/CNPJ
  payeeName: string;
  payeeDoc: string;
  referenceText: string; // Processo vinculador
  processNumber: string;
  baseValue: number;
  items: ReceiptItem[];
  city: string;
}

export function ReceiptGenerator({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const previewRef = useRef<HTMLDivElement>(null);
  
  const [formData, setFormData] = React.useState<ReceiptData>({
    type: 'HONORARIOS',
    receiptNumber: `REC-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
    date: new Date().toISOString().split('T')[0],
    payerName: '',
    payerDoc: '',
    payeeName: 'Nome do Seu Escritório',
    payeeDoc: '00.000.000/0001-00',
    referenceText: '',
    processNumber: '',
    baseValue: 0,
    items: [],
    city: 'São Paulo'
  });

  const [isGenerating, setIsGenerating] = React.useState(false);

  const calculateTotal = () => {
    let total = formData.baseValue || 0;
    formData.items.forEach(item => {
      if (item.type === 'addition') total += (item.amount || 0);
      else if (item.type === 'deduction') total -= (item.amount || 0);
    });
    return total;
  };

  const totalValue = calculateTotal();

  // Helper para conversão de valores (Extenso) - Básico para demonstração
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { id: Date.now().toString(), description: '', amount: 0, type: 'addition' }]
    }));
  };

  const removeItem = (id: string) => {
    setFormData(prev => ({ ...prev, items: prev.items.filter(i => i.id !== id) }));
  };

  const updateItem = (id: string, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map(i => i.id === id ? { ...i, [field]: value } : i)
    }));
  };

  const generatePDF = async () => {
    if (!previewRef.current) return;
    setIsGenerating(true);

    try {
      const canvas = await html2canvas(previewRef.current, { scale: 3, useCORS: true, logging: false });
      const imgData = canvas.toDataURL('image/png');
      
      const pdf = new jsPDF({ orientation: 'l', unit: 'mm', format: [215, 105] });
      
      // Centraliza se for menor que a página
      pdf.addImage(imgData, 'PNG', 0, 0, 215, 105);
      pdf.save(`${formData.receiptNumber}_${formData.payeeName.replace(/\s+/g, '_')}.pdf`);
    } catch (error) {
      console.error("Erro ao gerar PDF", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const receiptTypeLabels: Record<ReceiptType, string> = {
    'HONORARIOS': 'Recibo de Honorários Advocatícios',
    'REPASSE_CLIENTE': 'Recibo de Repasse Judicial ao Cliente',
    'DILIGENCIA': 'Recibo de Pagamento de Diligências',
    'ORDEM_PAGAMENTO': 'Ordem de Pagamento',
    'PRESTADORES': 'Recibo de Prestação de Serviços (Correspondente)',
    'SALARIO': 'Recibo de Pagamento de Salário',
    'OUTROS': 'Recibo Geral'
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[1800px] w-[95vw] h-[90vh] flex flex-col p-0 bg-[#0f172a] border-white/10 shrink-0">
        <DialogHeader className="p-6 border-b border-white/5 shrink-0 flex flex-row items-center justify-between">
          <div>
            <DialogTitle className="text-white text-2xl font-black italic uppercase flex items-center gap-2">
              <FileText className="h-6 w-6 text-primary" /> Gerador de Recibos
            </DialogTitle>
            <DialogDescription className="text-slate-400">Configure, preencha as taxas e exporte recibos com a identidade do escritório.</DialogDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="border-white/10 text-white bg-transparent hover:bg-white/5" onClick={() => generatePDF()} disabled={isGenerating}>
              <Share2 className="h-4 w-4 mr-2" /> Compartilhar
            </Button>
            <Button className="bg-primary text-primary-foreground font-black uppercase text-xs tracking-widest shadow-lg shadow-primary/20 hover:scale-105 transition-transform" onClick={() => generatePDF()} disabled={isGenerating}>
              {isGenerating ? 'Gerando...' : <><Download className="h-4 w-4 mr-2" /> Baixar PDF</>}
            </Button>
          </div>
        </DialogHeader>

        <div className="flex flex-1 overflow-hidden">
          {/* PAINEL DE FORMULÁRIO (Esquerda) */}
          <ScrollArea className="w-1/2 min-w-[500px] border-r border-white/5 p-6 h-full bg-slate-900/50">
            <div className="space-y-6">
              
              <div className="space-y-4">
                <h4 className="text-white font-black tracking-widest text-xs uppercase border-b border-white/5 pb-2">Configuração Principal</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5 block">Tipo de Recibo</label>
                    <Select value={formData.type} onValueChange={(val: any) => setFormData({...formData, type: val})}>
                      <SelectTrigger className="bg-black/20 border-white/10 text-white"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-[#0f172a] border-white/10 text-white">
                        <SelectItem value="HONORARIOS">Honorários Advocatícios</SelectItem>
                        <SelectItem value="REPASSE_CLIENTE">Repasse Judicial (Cliente)</SelectItem>
                        <SelectItem value="DILIGENCIA">Pagamento de Diligências</SelectItem>
                        <SelectItem value="ORDEM_PAGAMENTO">Ordem de Pagamento</SelectItem>
                        <SelectItem value="PRESTADORES">Prestadores (Correspondentes)</SelectItem>
                        <SelectItem value="SALARIO">Pagamento de Salário</SelectItem>
                        <SelectItem value="OUTROS">Recibo Geral (Outros)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5 block">Número do Recibo</label>
                    <Input value={formData.receiptNumber} onChange={e => setFormData({...formData, receiptNumber: e.target.value})} className="bg-black/20 border-white/10 text-white font-mono" />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-white font-black tracking-widest text-xs uppercase border-b border-white/5 pb-2">Dados das Partes</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5 block">Pagador (Nome)</label>
                    <Input value={formData.payerName} onChange={e => setFormData({...formData, payerName: e.target.value})} className="bg-black/20 border-white/10 text-white" placeholder="Nome de quem paga" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5 block">Pagador (CPF/CNPJ)</label>
                    <Input value={formData.payerDoc} onChange={e => setFormData({...formData, payerDoc: e.target.value})} className="bg-black/20 border-white/10 text-white" placeholder="Documento do pagador" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5 block">Recebedor (Nome)</label>
                    <Input value={formData.payeeName} onChange={e => setFormData({...formData, payeeName: e.target.value})} className="bg-black/20 border-white/10 text-primary font-bold" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5 block">Recebedor (CPF/CNPJ)</label>
                    <Input value={formData.payeeDoc} onChange={e => setFormData({...formData, payeeDoc: e.target.value})} className="bg-black/20 border-white/10 text-white" />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-white font-black tracking-widest text-xs uppercase border-b border-white/5 pb-2">Valores e Detalhes do Referente</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5 block">Referente a / Descrição</label>
                    <Input value={formData.referenceText} onChange={e => setFormData({...formData, referenceText: e.target.value})} className="bg-black/20 border-white/10 text-white" placeholder="Ex: Pagamento da parcela referente ao acordo trabalhista..." />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-amber-500 tracking-widest mb-1.5 block">Nº do Processo (Opcional)</label>
                    <Input value={formData.processNumber} onChange={e => setFormData({...formData, processNumber: e.target.value})} className="bg-[#0f172a] border-amber-500/20 text-amber-400 font-mono" placeholder="0000000-00.0000.0.00.0000" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-emerald-500 tracking-widest mb-1.5 block">Valor Base (R$)</label>
                    <Input type="number" value={formData.baseValue === 0 ? '' : formData.baseValue} onChange={e => setFormData({...formData, baseValue: Number(e.target.value)})} className="bg-emerald-500/10 border-emerald-500/20 text-emerald-400 font-black text-xl h-10" placeholder="0.00" />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-white font-black tracking-widest text-xs uppercase border-b border-white/5 pb-2 flex justify-between items-center">
                  <span>Compor Taxas e Adicionais</span>
                  <Button variant="ghost" size="sm" onClick={addItem} className="h-6 text-[10px] text-primary hover:text-white px-2"><Plus className="h-3 w-3 mr-1" /> Add</Button>
                </h4>
                <div className="space-y-2">
                  {formData.items.length === 0 && <p className="text-xs text-slate-500 italic">Nenhum adicional incluído no recibo.</p>}
                  {formData.items.map((item) => (
                    <div key={item.id} className="flex gap-2 items-center bg-black/20 p-2 rounded-lg border border-white/5">
                      <Select value={item.type} onValueChange={(val: any) => updateItem(item.id, 'type', val)}>
                        <SelectTrigger className="w-[120px] bg-transparent border-white/10 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="addition">Acréscimo (+)</SelectItem>
                          <SelectItem value="deduction">Dedução (-)</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input value={item.description} onChange={e => updateItem(item.id, 'description', e.target.value)} placeholder="Descrição (Ex: Custas Judiciais)" className="flex-1 bg-transparent border-white/10 text-xs text-white h-8" />
                      <Input type="number" value={item.amount === 0 ? '' : item.amount} onChange={e => updateItem(item.id, 'amount', Number(e.target.value))} placeholder="R$ 0,00" className="w-[100px] bg-transparent border-white/10 text-xs text-white h-8" />
                      <Button variant="ghost" size="icon" onClick={() => removeItem(item.id)} className="h-8 w-8 text-rose-500 hover:text-rose-400 hover:bg-rose-500/10"><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </ScrollArea>

          {/* PAINEL DE PREVIEW (Direita) */}
          <div className="flex-1 bg-slate-950 p-8 overflow-y-auto flex items-start justify-center pattern-isometric relative">
             <div className="absolute top-4 right-4 text-xs font-bold uppercase text-slate-500 tracking-widest opacity-50 flex items-center">
                <Printer className="h-4 w-4 mr-2" /> Pré-Visualização da Impressão
             </div>
             {/* PAPEL DO RECIBO NO FORMATO TALÃO (21.5 x 10.5 cm) */}
             <div 
               ref={previewRef}
               className="bg-white w-[812px] h-[396px] p-6 flex flex-col relative shadow-2xl overflow-hidden shrink-0" 
               style={{ fontFamily: 'sans-serif' }}
             >
                {/* Estilo Premium e Bordas */}
                <div className="absolute top-0 left-0 w-full h-2 bg-[#0f172a]" />
                <div className="absolute top-2 left-0 w-full h-0.5 bg-amber-500" />
                <div className="absolute bottom-0 left-0 w-full h-2 bg-[#0f172a]" />
                
                <div className="absolute top-12 left-12 opacity-[0.02] pointer-events-none">
                    <ShieldCheck className="w-80 h-80 text-black" strokeWidth={0.5} />
                </div>

                {/* Header (Escritório) */}
                <div className="flex justify-between items-center border-b-[2px] border-slate-200 pb-4 mt-1 relative z-10">
                    <div className="flex items-center gap-4">
                        <img 
                          src="/logo.png" 
                          alt="Studio Legal Logo" 
                          className="h-20 object-contain" 
                          crossOrigin="anonymous" 
                        />
                        <div className="h-12 w-px bg-slate-200"></div>
                        <h2 className="text-[14px] font-black text-[#0f172a] uppercase tracking-widest leading-none" style={{ maxWidth: '280px' }}>{receiptTypeLabels[formData.type]}</h2>
                    </div>
                    <div className="text-right flex flex-col items-end">
                        <div className="flex items-center gap-2">
                           <span className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Nº Identificador:</span>
                           <span className="text-sm font-mono font-black text-[#0f172a] bg-slate-100 px-2 py-0.5 rounded">{formData.receiptNumber}</span>
                        </div>
                        <div className="text-[9px] font-bold text-slate-500 mt-1 uppercase tracking-widest">Emitido em: <strong className="text-amber-700">{formData.date.split('-').reverse().join('/')}</strong></div>
                    </div>
                </div>

                <div className="flex items-start gap-5 mt-3 flex-1">
                  {/* Coluna Esquerda: Texto Detalhado e Total */}
                  <div className="flex-1 flex flex-col justify-between h-full">

                    <div className="flex items-center justify-between mb-3">
                       <div className="bg-[#0f172a] rounded-lg px-4 py-2 border-l-[4px] border-amber-500 flex items-center shadow-md">
                         <span className="text-[9px] uppercase font-black text-amber-500 tracking-widest mr-3">Valor Líquido:</span>
                         <span className="text-2xl font-black tracking-tighter tabular-nums text-white">{formatCurrency(totalValue)}</span>
                       </div>
                       {formData.processNumber && (
                         <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-50 border border-slate-200 px-2 py-1 rounded">Autos: <span className="text-slate-700 font-mono">{formData.processNumber}</span></div>
                       )}
                    </div>

                    {/* Corpo do Recibo */}
                    <div className="text-slate-700 leading-relaxed text-justify relative z-10 text-[11px] mb-auto pr-2">
                        <p className="indent-6 mb-1.5 leading-snug">
                           Declaramos que, na data de <strong>{formData.date.split('-').reverse().join('/')}</strong>, a título de <strong>{receiptTypeLabels[formData.type]}</strong>, transacionou-se a quantia líquida de <strong>{formatCurrency(totalValue)}</strong>.
                        </p>
                        <p className="indent-6 mb-1.5 leading-snug">
                           O valor foi gerado com envolvimento de <strong>{formData.payerName || '__________________________________'}</strong> (Doc: <strong>{formData.payerDoc || '________________'}</strong>){formData.processNumber && <span>, em via dos autos processuais nº <strong>{formData.processNumber}</strong></span>}.
                        </p>
                        <p className="indent-6 leading-snug">
                           Concedes-se quitação referente a: "<em>{formData.referenceText || '____________________________________________________________________'}</em>".
                        </p>
                    </div>

                    {/* Assinatura */}
                    <div className="mt-2 relative z-10 flex flex-row items-end justify-between pr-4 pb-1">
                        <div className="flex flex-col text-left mb-1">
                            <p className="text-[10px] font-bold text-slate-400">{formData.city}, {formData.date.split('-').reverse().join('/')}</p>
                        </div>
                        <div className="flex flex-col text-center items-center">
                            <div className="w-48 border-b-2 border-slate-800 mb-1"></div>
                            <p className="font-black text-slate-900 text-[10px] uppercase">{formData.payeeName}</p>
                            <p className="text-[8px] font-bold text-slate-500 tracking-wider">Doc: {formData.payeeDoc}</p>
                        </div>
                    </div>
                  </div>

                  {/* Coluna Direita: Discriminadão Mímini */}
                  <div className="w-[240px] relative z-10 bg-slate-50 rounded-xl border border-slate-200 p-3 shadow-sm h-full flex flex-col pt-4">
                    <h5 className="text-[9px] font-black bg-slate-200 inline-block px-1.5 py-0.5 rounded uppercase text-slate-600 tracking-widest mb-3 self-start">Discriminação</h5>
                    <div className="flex-1 overflow-hidden space-y-2">
                       <div className="flex justify-between items-center pb-1.5 border-b border-slate-200">
                           <span className="text-[10px] font-bold text-slate-600 uppercase">Valor Base</span>
                           <span className="text-[10px] font-black text-[#0f172a]">{formatCurrency(formData.baseValue)}</span>
                       </div>
                       {formData.items.slice(0, 4).map(item => (
                         <div key={item.id} className="flex justify-between items-center pb-1.5 border-b border-slate-100">
                             <span className="text-[9px] font-bold text-slate-500 truncate pr-2 flex items-center">
                                {item.type === 'addition' ? <div className="text-emerald-500 mr-1 font-black">+</div> : <div className="text-rose-500 mr-1 font-black">-</div>}
                                {item.description || 'Taxa'}
                             </span>
                             <span className={`text-[10px] font-black whitespace-nowrap ${item.type === 'addition' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {item.type === 'deduction' ? '-' : ''}{formatCurrency(item.amount)}
                             </span>
                         </div>
                       ))}
                       {formData.items.length > 4 && <div className="text-[8px] italic text-slate-400 text-center py-1">... e mais {formData.items.length - 4} rubricas.</div>}
                    </div>
                    <div className="pt-2 flex justify-between items-end border-t border-slate-200 mt-auto">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Líquido</span>
                        <span className="text-sm tracking-tighter font-black text-amber-600">{formatCurrency(totalValue)}</span>
                    </div>
                  </div>
                </div>
             </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
