'use client';
import * as React from 'react';
import { 
  Users, 
  HeartHandshake, 
  DollarSign, 
  TrendingUp, 
  Briefcase, 
  Calendar, 
  ChevronRight, 
  Plus, 
  PieChart as ChartIcon,
  CheckCircle2,
  AlertCircle,
  FileText,
  UserPlus,
  ArrowUpRight,
  Target
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useFirebase, useCollection } from '@/firebase';
import { collection, query, where, limit, orderBy } from 'firebase/firestore';
import type { Staff, Correspondent, PayrollEntry } from '@/lib/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Link from 'next/link';

export default function RHPage() {
  const { firestore } = useFirebase();
  
  const staffQuery = React.useMemo(() => firestore ? query(collection(firestore, 'staff'), limit(100)) : null, [firestore]);
  const { data: staffData } = useCollection<Staff>(staffQuery);
  
  const correspondentsQuery = React.useMemo(() => firestore ? query(collection(firestore, 'correspondents'), limit(100)) : null, [firestore]);
  const { data: correspondentsData } = useCollection<Correspondent>(correspondentsQuery);

  const stats = React.useMemo(() => {
    const total = staffData?.length || 0;
    const active = staffData?.filter(s => !s.resignationDate).length || 0;
    const correspondents = correspondentsData?.length || 0;
    const payrollTotal = staffData?.reduce((acc, s) => acc + (s.remuneration?.salary || 0), 0) || 0;
    
    return { total, active, correspondents, payrollTotal };
  }, [staffData, correspondentsData]);

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight font-headline text-white uppercase italic">Departamento Pessoal & RH</h1>
          <p className="text-sm text-slate-400 font-bold uppercase tracking-widest">Gestão de Capital Humano e Folha de Elite</p>
        </div>
        <div className="flex items-center gap-3">
            <Button variant="outline" className="bg-white/5 border-white/10 text-white font-black uppercase text-[10px] tracking-widest h-11" asChild>
                <Link href="/dashboard/rh/payroll">
                    <Calendar className="mr-2 h-4 w-4 text-primary" /> Gerenciar Folha
                </Link>
            </Button>
            <Button className="bg-primary text-primary-foreground font-black uppercase text-[10px] tracking-widest h-11 px-6 shadow-xl shadow-primary/20 hover:scale-105 transition-all">
                <UserPlus className="mr-2 h-4 w-4" /> Novo Contrato
            </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-[#0f172a] border-white/5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform"><Users className="h-12 w-12" /></div>
          <CardHeader className="pb-2"><CardDescription className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Equipe Interna</CardDescription></CardHeader>
          <CardContent>
            <p className="text-3xl font-black text-white">{stats.active}</p>
            <p className="text-[10px] text-emerald-400 font-bold uppercase mt-1">Colaboradores Ativos</p>
          </CardContent>
        </Card>
        
        <Card className="bg-[#0f172a] border-white/5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform"><HeartHandshake className="h-12 w-12" /></div>
          <CardHeader className="pb-2"><CardDescription className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Correspondentes</CardDescription></CardHeader>
          <CardContent>
            <p className="text-3xl font-black text-white">{stats.correspondents}</p>
            <p className="text-[10px] text-blue-400 font-bold uppercase mt-1">Parceiros em Campo</p>
          </CardContent>
        </Card>

        <Card className="bg-[#0f172a] border-white/5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform"><DollarSign className="h-12 w-12" /></div>
          <CardHeader className="pb-2"><CardDescription className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Folha Estimada</CardDescription></CardHeader>
          <CardContent>
            <p className="text-3xl font-black text-white">{(stats.payrollTotal).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
            <p className="text-[10px] text-amber-400 font-bold uppercase mt-1">Custo Fixo Mensal</p>
          </CardContent>
        </Card>

        <Card className="bg-primary/5 border-primary/20 border-2 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform"><Target className="h-12 w-12" /></div>
          <CardHeader className="pb-2"><CardDescription className="text-[10px] font-black uppercase text-primary tracking-widest">Performance Global</CardDescription></CardHeader>
          <CardContent>
            <p className="text-3xl font-black text-primary">88%</p>
            <p className="text-[10px] text-white/50 font-bold uppercase mt-1">Nível de Eficiência RH</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 bg-[#0f172a] border-white/5 overflow-hidden">
          <CardHeader className="p-6 border-b border-white/5 bg-white/5">
            <div className="flex items-center justify-between">
                <div>
                   <CardTitle className="text-sm font-black uppercase tracking-tight text-white italic">Fluxo de Pagamentos RH</CardTitle>
                   <CardDescription className="text-[10px] font-bold uppercase text-slate-500">Projeção financeira de DP dos próximos 6 meses</CardDescription>
                </div>
                <ChartIcon className="h-5 w-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent className="p-12 text-center flex flex-col items-center justify-center gap-4 border-b border-white/5 min-h-[300px]">
             <div className="h-24 w-24 rounded-full bg-primary/5 border border-primary/20 flex items-center justify-center">
                <TrendingUp className="h-10 w-10 text-primary opacity-20" />
             </div>
             <div>
                <p className="text-sm font-bold text-slate-400 italic">O gráfico de projeção será gerado após o fechamento da primeira folha.</p>
             </div>
          </CardContent>
          <div className="p-6 bg-black/40 flex items-center justify-between">
             <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-emerald-500" /><span className="text-[9px] font-black uppercase text-slate-500">Salários</span></div>
                <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-blue-500" /><span className="text-[9px] font-black uppercase text-slate-500">Encargos</span></div>
                <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-amber-500" /><span className="text-[9px] font-black uppercase text-slate-500">Bônus</span></div>
             </div>
             <Button variant="ghost" className="text-[10px] font-black uppercase text-primary h-8">Ver Detalhes Financeiros <ArrowUpRight className="ml-2 h-3 w-3" /></Button>
          </div>
        </Card>

        <Card className="bg-[#0f172a] border-white/5 overflow-hidden flex flex-col">
            <CardHeader className="p-6 border-b border-white/5 bg-white/5">
                <CardTitle className="text-sm font-black uppercase tracking-tight text-white flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-primary" /> Próximos Vencimentos DP
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex-1">
                <div className="divide-y divide-white/5">
                   {[
                     { label: 'Salários Equipe', date: '05/Abr', status: 'PENDENTE', value: stats.payrollTotal },
                     { label: 'FGTS / GPS', date: '07/Abr', status: 'AGUARDANDO', value: stats.payrollTotal * 0.28 },
                     { label: 'Vale Refeição', date: '28/Mar', status: 'HOJE', value: 3450.00 },
                     { label: 'Contribuições OAB', date: '31/Mar', status: 'VENCENDO', value: 1200.00 },
                   ].map((item, i) => (
                     <div key={i} className="p-5 flex items-center justify-between hover:bg-white/5 transition-all group">
                        <div className="space-y-1">
                            <p className="text-xs font-black text-white">{item.label}</p>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter italic">{item.date} • {item.status}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-sm font-black text-white tabular-nums">{item.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                            <div className="h-1 w-full bg-white/5 rounded-full mt-1.5 overflow-hidden">
                                <div className="bg-primary h-full w-[40%] group-hover:w-[100%] transition-all duration-1000" />
                            </div>
                        </div>
                     </div>
                   ))}
                </div>
            </CardContent>
            <div className="p-6 border-t border-white/5 bg-black/20">
                <Button className="w-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-black uppercase text-[10px] h-11 hover:bg-emerald-500/20">
                    <CheckCircle2 className="mr-2 h-4 w-4" /> Autorizar Lotes Bancários
                </Button>
            </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <Link href="/dashboard/rh/employees" className="group">
            <Card className="bg-[#0f172a] border-white/5 p-6 hover:border-primary/30 transition-all cursor-pointer relative overflow-hidden">
                <div className="absolute -bottom-6 -right-6 h-24 w-24 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-all" />
                <Users className="h-8 w-8 text-primary mb-4" />
                <h3 className="text-sm font-black text-white uppercase tracking-tight italic">Gestão de Colaboradores</h3>
                <p className="text-[11px] text-slate-400 font-bold uppercase mt-2 leading-relaxed">Fichas completas, admissões, férias e histórico profissional de elite.</p>
                <div className="mt-4 flex items-center text-[10px] font-black text-primary uppercase items-center gap-1 group-hover:gap-2 transition-all">
                    Acessar Módulo <ChevronRight className="h-3 w-3" />
                </div>
            </Card>
         </Link>

         <Link href="/dashboard/rh/payroll" className="group">
            <Card className="bg-[#0f172a] border-white/5 p-6 hover:border-blue-500/30 transition-all cursor-pointer relative overflow-hidden">
                <div className="absolute -bottom-6 -right-6 h-24 w-24 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition-all" />
                <DollarSign className="h-8 w-8 text-blue-400 mb-4" />
                <h3 className="text-sm font-black text-white uppercase tracking-tight italic">Folha de Pagamento</h3>
                <p className="text-[11px] text-slate-400 font-bold uppercase mt-2 leading-relaxed">Calculadora de proventos, bônus, descontos e integração financeira total.</p>
                <div className="mt-4 flex items-center text-[10px] font-black text-blue-400 uppercase items-center gap-1 group-hover:gap-2 transition-all">
                    Acessar Módulo <ChevronRight className="h-3 w-3" />
                </div>
            </Card>
         </Link>

         <Link href="/dashboard/rh/correspondents" className="group">
            <Card className="bg-[#0f172a] border-white/5 p-6 hover:border-amber-500/30 transition-all cursor-pointer relative overflow-hidden">
                <div className="absolute -bottom-6 -right-6 h-24 w-24 bg-amber-500/5 rounded-full blur-2xl group-hover:bg-amber-500/10 transition-all" />
                <HeartHandshake className="h-8 w-8 text-amber-500 mb-4" />
                <h3 className="text-sm font-black text-white uppercase tracking-tight italic">Correspondentes & Freelancers</h3>
                <p className="text-[11px] text-slate-400 font-bold uppercase mt-2 leading-relaxed">Gestão de prestadores de serviço, avaliação de rating e pagamentos por ato.</p>
                <div className="mt-4 flex items-center text-[10px] font-black text-amber-500 uppercase items-center gap-1 group-hover:gap-2 transition-all">
                    Acessar Módulo <ChevronRight className="h-3 w-3" />
                </div>
            </Card>
         </Link>
      </div>
    </div>
  );
}
