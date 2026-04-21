'use client';

import * as React from 'react';
import { 
  BarChart as BarChartIcon, 
  TrendingUp, 
  Users, 
  FolderKanban, 
  DollarSign, 
  Download, 
  Calendar,
  PieChart as PieChartIcon,
  Timer,
  Gavel,
  Zap,
  AlertTriangle,
  Target,
  Flame,
  Clock,
  Activity,
  XCircle,
  Sparkles,
  RefreshCw,
  Loader2,
  CheckCircle2,
  ShieldCheck,
  Building,
  Scale,
  Award,
  History,
  FileText,
  Printer,
  ChevronDown,
  ChevronUp,
  Briefcase,
  Handshake,
  LayoutList
} from 'lucide-react';
import { 
  Bar, 
  BarChart, 
  ResponsiveContainer, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell as RechartsCell
} from 'recharts';
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval, isBefore, startOfDay, isToday, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { H1 } from '@/components/ui/typography';
import { useFirebase, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, where, limit, getDocs, Timestamp, doc } from 'firebase/firestore';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { useSession } from 'next-auth/react';
import type { Process, Client, FinancialTitle, Staff, LegalDeadline, Hearing, Lead, UserProfile, StaffCredit } from '@/lib/types';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { MoreVertical, Eye } from 'lucide-react';

const COLORS = ['#F5D030', '#3b82f6', '#10b981', '#f43f5e', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

const ReportLetterhead = ({ title }: { title: string }) => (
  <div className="hidden print:block mb-10 pb-6 border-b-2 border-slate-900">
    <div className="flex justify-between items-center">
      <div className="flex items-center gap-4">
        <div className="bg-slate-900 p-2 rounded-xl">
          <img src="/logo.png" alt="Logo" className="h-12 w-auto brightness-0 invert" />
        </div>
        <div>
          <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-900">Bueno Gois Advogados</h2>
          <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Inteligência Jurídica & Performance Estratégica</p>
        </div>
      </div>
      <div className="text-right">
        <div className="text-xl font-black text-slate-900 font-headline uppercase">{title}</div>
        <div className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-tighter">Emissão: {format(new Date(), 'dd/MM/yyyy HH:mm')}</div>
      </div>
    </div>
    <div className="mt-4 flex items-center justify-between text-[8px] font-black uppercase tracking-widest text-rose-600 border border-rose-600/20 px-3 py-1 rounded">
      <span>⚠️ DOCUMENTO CONFIDENCIAL - USO INTERNO EXCLUSIVO</span>
      <span>BUENO GOIS ADVOGADOS E ASSOCIADOS</span>
    </div>
  </div>
);

function StatCard({ title, value, subValue, icon: Icon, currency = false, color = "text-primary" }: any) {
  return (
    <Card className="bg-[#0f172a] border-white/5 transition-all hover:border-primary/20 shadow-xl group">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{title}</CardTitle>
        <div className={cn("p-2 rounded-lg bg-white/5 group-hover:scale-110 transition-transform", color)}>
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className={cn("text-2xl font-black text-white tabular-nums", color)}>
          {currency ? (value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : value}
        </div>
        {subValue && <p className="text-[9px] text-slate-500 font-bold uppercase mt-1 tracking-tighter">{subValue}</p>}
      </CardContent>
    </Card>
  );
}


const PortfolioTable = React.memo(({ data }: { data: any[] }) => {
  const router = useRouter();
  
  return (
    <Card className="bg-[#0f172a] border-white/5 shadow-2xl overflow-hidden mt-8">
      <CardHeader className="bg-white/5 border-b border-white/5 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg text-white font-black uppercase tracking-tighter flex items-center gap-2">
              <FolderKanban className="h-5 w-5 text-primary" /> Distribuição de Portfólio & Performance
            </CardTitle>
            <CardDescription className="text-slate-400">Top 10 casos de maior impacto financeiro em andamento.</CardDescription>
          </div>
          <Badge variant="outline" className="border-primary/30 text-primary font-black text-[10px] uppercase tracking-widest px-3 h-8">ESTRATÉGICO</Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-black/20 border-b border-white/5">
                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest">Caso / Identificação</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest">Advogado Titular</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest">Valor da Causa</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest">Retorno Office (Realizado)</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest">Status / Área</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {data.map((p, i) => (
                <tr key={i} className="border-b border-white/[0.02] hover:bg-white/[0.02] transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs font-bold text-white group-hover:text-primary transition-colors truncate max-w-[200px]">{p.name}</span>
                      <span className="text-[9px] font-mono text-slate-500">{p.processNumber || 'Sem Número CNJ'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-[8px] font-black text-primary border border-primary/20">
                        {p.lawyer.charAt(0)}
                      </div>
                      <span className="text-[10px] font-bold text-slate-300">Dr(a). {p.lawyer}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[11px] font-black text-white tabular-nums">
                      {p.caseValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-0.5">
                      <span className={cn("text-[11px] font-black tabular-nums", p.financialReturn > 0 ? "text-emerald-400" : "text-slate-500")}>
                        {p.financialReturn.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                      <div className="w-16 h-1 rounded-full bg-white/5 overflow-hidden">
                        <div 
                          className="h-full bg-emerald-500" 
                          style={{ width: `${Math.min(100, (p.financialReturn / (p.caseValue || 1)) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={cn("text-[8px] font-black px-1.5 h-5 border-none", 
                        p.status === 'Ativo' ? "bg-emerald-500/10 text-emerald-400" : "bg-slate-500/10 text-slate-400"
                      )}>
                        {p.status.toUpperCase()}
                      </Badge>
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">{p.legalArea}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-white/20 hover:text-white rounded-full bg-white/5">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-[#0f172a] border-white/10 w-56 p-1">
                        <DropdownMenuItem onClick={() => {
                          if (p.clientId) router.push(`/dashboard/processos?clientId=${p.clientId}`);
                        }} className="font-bold gap-2 text-white">
                          <FolderKanban className="h-4 w-4 text-primary" /> Abrir no Gestor
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
});
PortfolioTable.displayName = 'PortfolioTable';

const LeadsReportTab = React.memo(({ data }: { data: any }) => {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total de Leads" value={data.stats.totalLeads} icon={Users} color="text-primary" subValue="Últimos 6 meses" />
        <StatCard title="Leads Convertidos" value={data.stats.convertedLeadsCount} icon={CheckCircle2} color="text-emerald-400" subValue="Processos gerados" />
        <StatCard title="Taxa de Conversão" value={`${data.stats.overallLeadConversion.toFixed(1)}%`} icon={Target} color="text-blue-400" subValue="Eficiência de vendas" />
        <StatCard title="Tempo Médio Conv." value={`${data.stats.avgConversionDays} dias`} icon={Clock} color="text-purple-400" subValue="Lead -> Contrato" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-[#0f172a] border-white/5 shadow-2xl">
          <CardHeader>
            <CardTitle className="text-lg text-white font-black uppercase tracking-tighter flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" /> Timeline de Novos Leads
            </CardTitle>
            <CardDescription>Volume de chegada mensal (Últimos 6 meses).</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.leadTimeline}>
                <defs>
                  <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F5D030" stopOpacity={0.3}/><stop offset="95%" stopColor="#F5D030" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff05" />
                <XAxis dataKey="month" stroke="#475569" fontSize={10} axisLine={false} tickLine={false} />
                <YAxis stroke="#475569" fontSize={10} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #ffffff10', borderRadius: '8px' }} />
                <Area type="monotone" dataKey="count" name="Novos Leads" stroke="#F5D030" fillOpacity={1} fill="url(#colorLeads)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-[#0f172a] border-white/5 shadow-2xl">
          <CardHeader>
            <CardTitle className="text-lg text-white font-black uppercase tracking-tighter flex items-center gap-2">
              <LayoutList className="h-5 w-5 text-blue-400" /> Distribuição por Status
            </CardTitle>
            <CardDescription>Volume de leads em cada fase do funil.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data.leadStatusDistribution} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value" nameKey="name">
                  {data.leadStatusDistribution.map((_: any, index: number) => <RechartsCell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #ffffff10', borderRadius: '8px' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', textTransform: 'uppercase' }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-[#0f172a] border-white/5 shadow-2xl">
          <CardHeader>
            <CardTitle className="text-lg text-white font-black uppercase tracking-tighter flex items-center gap-2">
              <Zap className="h-5 w-5 text-amber-400" /> Velocidade do Funil (Tempo Médio)
            </CardTitle>
            <CardDescription>Dias médios de permanência em cada etapa.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.avgTimePerStage} layout="vertical" margin={{ left: 40, right: 30 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#ffffff05" />
                <XAxis type="number" stroke="#475569" fontSize={10} hide />
                <YAxis dataKey="stage" type="category" stroke="#94a3b8" fontSize={9} axisLine={false} tickLine={false} width={80} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #ffffff10', borderRadius: '8px' }} />
                <Bar dataKey="days" name="Dias" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={20} label={{ position: 'right', fill: '#fff', fontSize: 10, offset: 10 }} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-[#0f172a] border-white/5 shadow-2xl">
          <CardHeader>
            <CardTitle className="text-lg text-white font-black uppercase tracking-tighter flex items-center gap-2">
              <History className="h-5 w-5 text-emerald-400" /> Performance de Atendimento
            </CardTitle>
            <CardDescription>Conversão por profissional responsável.</CardDescription>
          </CardHeader>
          <CardContent className="p-0 overflow-auto">
            <table className="w-full text-left">
                <thead className="bg-black/20 border-b border-white/5">
                <tr className="uppercase text-[9px] font-black text-slate-500">
                    <th className="px-4 py-3">Advogado</th>
                    <th className="px-4 py-3 text-center">Leads</th>
                    <th className="px-4 py-3 text-center">Conv.</th>
                    <th className="px-4 py-3 text-right">Taxa %</th>
                </tr>
                </thead>
                <tbody className="text-[11px]">
                {data.lawyerLeadStats?.map((s: any, i: number) => (
                    <tr key={i} className="border-b border-white/[0.02] hover:bg-white/[0.05]">
                    <td className="px-4 py-3 font-bold text-white max-w-[120px] truncate">{s.nome}</td>
                    <td className="px-4 py-3 text-center text-slate-400">{s.leads}</td>
                    <td className="px-4 py-3 text-center text-emerald-400">{s.converted}</td>
                    <td className="px-4 py-3 text-right font-black text-primary">{s.conversionRate}%</td>
                    </tr>
                ))}
                </tbody>
            </table>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-[#0f172a] border-white/5 shadow-2xl">
        <CardHeader>
          <CardTitle className="text-lg text-white font-black uppercase tracking-tighter flex items-center gap-2">
            <Target className="h-5 w-5 text-emerald-400" /> Eficiência por Fonte de Captação
          </CardTitle>
          <CardDescription>Análise de conversão detalhada por origem do lead.</CardDescription>
        </CardHeader>
        <CardContent className="p-0 overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-black/20 border-b border-white/5">
                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest">Origem / Canal</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest text-center">Volume Total</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest text-center">Convertidos</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest text-right">Taxa de Conversão</th>
              </tr>
            </thead>
            <tbody>
              {data.leadCapture.map((s: any, i: number) => (
                <tr key={i} className="border-b border-white/[0.02] hover:bg-white/[0.02]">
                  <td className="px-6 py-4 text-[11px] font-bold text-white">{s.name}</td>
                  <td className="px-6 py-4 text-[11px] font-bold text-slate-300 text-center">{s.value}</td>
                  <td className="px-6 py-4 text-[11px] font-bold text-emerald-400 text-center">{s.converted}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-3 font-black text-xs">
                      <div className="w-24 h-1.5 rounded-full bg-white/5 overflow-hidden">
                        <div className="h-full bg-blue-500" style={{ width: `${s.conversionRate}%` }} />
                      </div>
                      <span className="text-white w-10">{s.conversionRate.toFixed(1)}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
});
LeadsReportTab.displayName = 'LeadsReportTab';

const AdminReports = React.memo(({ data }: { data: any }) => {
  if (!data) return null;
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <ReportLetterhead title="Relatório de Performance Gerencial" />

      <Tabs defaultValue="geral" className="w-full">
        <TabsList className="bg-[#0f172a] border border-white/5 p-1 mb-8 h-12">
          <TabsTrigger value="geral" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-black uppercase text-[10px] px-8 h-10 tracking-widest">
            <LayoutList className="h-4 w-4" /> Panorama Geral
          </TabsTrigger>
          <TabsTrigger value="leads" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-black uppercase text-[10px] px-8 h-10 tracking-widest">
            <Target className="h-4 w-4" /> Gestão de Leads
          </TabsTrigger>
        </TabsList>

        <TabsContent value="geral" className="space-y-8 animate-in fade-in duration-500">
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            <StatCard title="Ticket Médio / Causa" value={data.stats.avgCaseValue} icon={Scale} currency color="text-primary" subValue="Expectativa de recebimento" />
            <StatCard title="Ticket Médio / Acordo" value={data.stats.avgSettlementValue} icon={Handshake} currency color="text-emerald-400" subValue="Recuperação real imediata" />
            <StatCard title="Taxa de Procedência" value={`${data.stats.successRate}%`} icon={Award} color="text-blue-400" subValue="Vitórias judiciais" />
            <StatCard title="Tempo Médio (Aging)" value={`${data.stats.avgAging} meses`} icon={Timer} color="text-purple-400" subValue="Ciclo de vida do processo" />
          </div>

          <PortfolioTable data={data.portfolio || []} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-8">
            <Card className="bg-[#0f172a] border-white/5 shadow-2xl">
              <CardHeader>
                <CardTitle className="text-lg text-white font-black uppercase tracking-tighter flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" /> Distribuição de Carga Operacional
                </CardTitle>
                <CardDescription>Breakdown por advogado titular do caso.</CardDescription>
              </CardHeader>
              <CardContent className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.lawyerPerformance || []} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff10" />
                    <XAxis dataKey="nome" stroke="#94a3b8" fontSize={10} axisLine={false} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={10} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #ffffff10', borderRadius: '8px' }} />
                    <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '10px', textTransform: 'uppercase' }} />
                    <Bar dataKey="demandas" name="Processos" fill="#F5D030" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="prazos" name="Prazos" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="audiencias" name="Audiências" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="bg-[#0f172a] border-white/5 shadow-2xl">
              <CardHeader>
                <CardTitle className="text-lg text-white font-black uppercase tracking-tighter flex items-center gap-2">
                  <Activity className="h-5 w-5 text-blue-400" /> Fluxo de Financeiro (Bueno Gois)
                </CardTitle>
                <CardDescription>Entradas vs Saídas Institucionais.</CardDescription>
              </CardHeader>
              <CardContent className="h-[400px]">
                 <FinancialEvolutionChart data={data.financial || []} hideTitle />
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:break-before-page pt-10">
            <Card className="bg-[#0f172a] border-white/5">
              <CardHeader><CardTitle className="text-white text-sm uppercase flex items-center gap-2"><Flame className="h-4 w-4 text-rose-500" /> Casos em Risco Crítico</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {data.riskyProcesses?.map((p: any) => (
                  <div key={p.id} className="p-3 rounded-xl bg-rose-500/5 border border-rose-500/20 flex justify-between items-center">
                    <div>
                      <p className="text-xs font-bold text-white truncate max-w-[250px]">{p.name}</p>
                      <p className="text-[9px] text-rose-400 font-mono uppercase">#{p.id.substring(0,8)}</p>
                    </div>
                    <Badge variant="outline" className="border-rose-500/30 text-rose-500 text-[9px] font-black uppercase tracking-widest">EXPIRADO</Badge>
                  </div>
                ))}
                {(!data.riskyProcesses || data.riskyProcesses.length === 0) && <p className="text-xs italic text-center py-4 text-slate-500">Nenhum risco imediato detectado.</p>}
              </CardContent>
            </Card>

            <Card className="bg-[#0f172a] border-white/5">
              <CardHeader><CardTitle className="text-white text-sm uppercase flex items-center gap-2"><Award className="h-4 w-4 text-emerald-500" /> Top Performers (Encerrados)</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {data.topPerformers?.map((s: any, i: number) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500 font-black text-[10px]">{i+1}</div>
                      <span className="text-xs font-bold text-white">{s.name}</span>
                    </div>
                    <span className="text-xs font-black text-emerald-400">{s.count} Êxitos</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="leads" className="py-4">
          <LeadsReportTab data={data} />
        </TabsContent>
      </Tabs>
    </div>
  );
});
AdminReports.displayName = 'AdminReports';

const FinancialEvolutionChart = React.memo(({ data, hideTitle }: { data: any[]; hideTitle?: boolean }) => {
  return (
    <Card className={cn("bg-[#0f172a] border-white/5 shadow-2xl", hideTitle && "border-none shadow-none")}>
      {!hideTitle && (
        <CardHeader>
          <CardTitle className="text-lg text-white font-black uppercase tracking-tighter flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-emerald-400" /> Fluxo de Caixa Institucional (Bueno Gois)
          </CardTitle>
          <CardDescription>Comparativo entre entradas efetivas e saídas operacionais (Últimos 6 meses).</CardDescription>
        </CardHeader>
      )}
      <CardContent className={cn("h-[350px]", hideTitle && "p-0 h-[380px]")}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorRec" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff05" />
            <XAxis dataKey="month" stroke="#475569" fontSize={10} axisLine={false} tickLine={false} />
            <YAxis stroke="#475569" fontSize={10} axisLine={false} tickLine={false} tickFormatter={(val) => `R$${val/1000}k`} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #ffffff10', borderRadius: '8px' }}
              formatter={(val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            />
            <Area type="monotone" dataKey="receita" name="Entradas" stroke="#10b981" fillOpacity={1} fill="url(#colorRec)" strokeWidth={3} />
            <Area type="monotone" dataKey="despesa" name="Saídas" stroke="#ef4444" fill="transparent" strokeWidth={2} strokeDasharray="5 5" />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
});
FinancialEvolutionChart.displayName = 'FinancialEvolutionChart';

export default function RelatoriosPage() {
  const { firestore } = useFirebase();
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [reportData, setReportData] = React.useState<any>(null);

  const userProfileRef = useMemoFirebase(
    () => (firestore && session?.user?.id ? doc(firestore, 'users', session.user.id) : null),
    [firestore, session]
  );
  const { data: userProfile } = useDoc<UserProfile>(userProfileRef);
  const role = userProfile?.role || 'assistant';

  const fetchData = React.useCallback(async () => {
    if (!firestore || !session?.user?.id || !userProfile) return;
    setIsLoading(true);
    setError(null);

    try {
      const sixMonthsAgo = Timestamp.fromDate(subMonths(new Date(), 6));
      
      // 1. Fetch de Processos para KPIs
      const processesSnap = await getDocs(query(collection(firestore, 'processes')));
      const allProcesses = processesSnap.docs.map(d => ({ id: d.id, ...d.data() } as Process));
      
      // 2. Fetch de Títulos para Financeiro
      const titlesSnap = await getDocs(query(collection(firestore, 'financial_titles'), where('dueDate', '>=', sixMonthsAgo)));
      const titles = titlesSnap.docs.map(d => ({ id: d.id, ...d.data() } as FinancialTitle));

      // 3. Fetch de Atos Operacionais
      const hearingsSnap = await getDocs(query(collection(firestore, 'hearings'), where('date', '>=', sixMonthsAgo)));
      const hearings = hearingsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Hearing));

      // 4. Cálculo de KPIs Estratégicos
      const settlements = titles.filter(t => t.origin === 'ACORDO' && t.status === 'PAGO');
      const avgCaseValue = allProcesses.length > 0 ? allProcesses.reduce((s, p) => s + (p.caseValue || 0), 0) / allProcesses.length : 0;
      const avgSettlementValue = settlements.length > 0 ? settlements.reduce((s, t) => s + t.value, 0) / settlements.length : 0;
      
      const ProcedenciaCount = titles.filter(t => t.origin === 'SENTENCA' && t.status === 'PAGO').length;
      const ImprocedenciaCount = allProcesses.filter(p => p.status === 'Arquivado' && !titles.some(t => t.processId === p.id && t.status === 'PAGO')).length;
      const successRate = ProcedenciaCount > 0 ? ((ProcedenciaCount / (ProcedenciaCount + ImprocedenciaCount)) * 100).toFixed(1) : "0";

      // 4.1 Cálculo de Aging Médio Real
      const activeProcesses = allProcesses.filter(p => p.status === 'Ativo');
      const totalAgingDays = activeProcesses.reduce((acc, p) => {
        const start = p.createdAt instanceof Timestamp ? p.createdAt.toDate() : new Date();
        return acc + differenceInDays(new Date(), start);
      }, 0);
      const avgAgingMonths = activeProcesses.length > 0 ? Math.round((totalAgingDays / activeProcesses.length) / 30) : 0;

      // 5. Fetch de Prazos para Produtividade
      const deadlinesSnap = await getDocs(query(collection(firestore, 'deadlines'), where('endDate', '>=', sixMonthsAgo)));
      const deadlines = deadlinesSnap.docs.map(d => d.data() as LegalDeadline);

      // 6. Organização de Gráficos (Lawyer Performance)
      const staffSnap = await getDocs(collection(firestore, 'staff'));
      const lawyerPerformance = staffSnap.docs
        .filter(s => s.data().role === 'lawyer' || s.data().role === 'partner')
        .map(s => {
          const data = s.data();
          return {
            nome: `${data.firstName} ${data.lastName.charAt(0)}.`,
            demandas: allProcesses.filter(p => p.leadLawyerId === s.id).length,
            audiencias: hearings.filter(h => h.lawyerId === s.id).length,
            prazos: deadlines.filter(d => d.authorId === s.id).length 
          };
        });

      // 7. Lead Capture & Conversion Analytics
      const leadsSnap = await getDocs(query(collection(firestore, 'leads'), where('createdAt', '>=', sixMonthsAgo)));
      const leads = leadsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Lead));
      
      // 7. Lead Detail Analytics (Real Production Data)
      const staffList = staffSnap.docs.map(d => ({ id: d.id, ...d.data() } as Staff));
      const lawyerLeadPerformanceMap: Record<string, { nome: string; leads: number; converted: number; avgTime: number }> = {};
      const conversionTimes: number[] = [];
      const stageDurations: Record<string, number[]> = {
        'NOVO': [], 'ATENDIMENTO': [], 'CONTRATUAL': [], 'BUROCRACIA': [], 'DISTRIBUICAO': []
      };

      leads.forEach(l => {
        // Atendimento por Advogado
        const responderId = l.interviewerId || l.lawyerId || 'N/A';
        const staff = staffList.find(s => s.id === responderId);
        const name = staff ? `${staff.firstName} ${staff.lastName}` : (responderId === 'N/A' ? 'Sem Atribuição' : 'Profissional Inativo');
        
        if (!lawyerLeadPerformanceMap[responderId]) {
          lawyerLeadPerformanceMap[responderId] = { nome: name, leads: 0, converted: 0, avgTime: 0 };
        }
        lawyerLeadPerformanceMap[responderId].leads++;
        
        // Conversão e Tempos
        if (l.status === 'CONVERTIDO' && l.stageEntryDates?.['CONVERTIDO']) {
          const start = (l.createdAt as Timestamp).toDate();
          const end = (l.stageEntryDates['CONVERTIDO'] as Timestamp).toDate();
          const diffDays = differenceInDays(end, start);
          conversionTimes.push(diffDays);
          lawyerLeadPerformanceMap[responderId].converted++;
          lawyerLeadPerformanceMap[responderId].avgTime += diffDays;
        }

        // Tempos entre etapas (Velocity)
        if (l.stageEntryDates) {
          const stagesOrder = ['NOVO', 'ATENDIMENTO', 'CONTRATUAL', 'BUROCRACIA', 'DISTRIBUICAO', 'CONVERTIDO'];
          for (let i = 0; i < stagesOrder.length - 1; i++) {
            const current = stagesOrder[i];
            const next = stagesOrder[i+1];
            if (l.stageEntryDates[current] && l.stageEntryDates[next]) {
               const d1 = (l.stageEntryDates[current] as Timestamp).toDate();
               const d2 = (l.stageEntryDates[next] as Timestamp).toDate();
               const diff = differenceInDays(d2, d1);
               if (!stageDurations[current]) stageDurations[current] = [];
               stageDurations[current].push(diff);
            }
          }
        }
      });

      const lawyerLeadStats = Object.values(lawyerLeadPerformanceMap).map(s => ({
        ...s,
        avgTime: s.converted > 0 ? Number((s.avgTime / s.converted).toFixed(1)) : 0,
        conversionRate: s.leads > 0 ? Number(((s.converted / s.leads) * 100).toFixed(1)) : 0
      })).sort((a, b) => b.leads - a.leads);

      const avgConversionDays = conversionTimes.length > 0 ? Math.round(conversionTimes.reduce((a, b) => a + b, 0) / conversionTimes.length) : 0;
      
      const avgTimePerStage = Object.entries(stageDurations).map(([stage, times]) => ({
        stage,
        days: times.length > 0 ? Number((times.reduce((a, b) => a + b, 0) / times.length).toFixed(1)) : 0
      }));

      // Lead capture summary
      const captureMap: Record<string, { total: number; converted: number }> = {};
      leads.forEach(l => {
        const source = l.captureSource || 'Outros';
        if (!captureMap[source]) captureMap[source] = { total: 0, converted: 0 };
        captureMap[source].total++;
        if (l.status === 'CONVERTIDO') captureMap[source].converted++;
      });
      
      const leadCapture = Object.entries(captureMap).map(([name, stats]) => ({ 
        name, 
        value: stats.total,
        converted: stats.converted,
        conversionRate: stats.total > 0 ? (stats.converted / stats.total) * 100 : 0
      })).sort((a, b) => b.value - a.value);

      const leadStatusMap: Record<string, number> = {};
      leads.forEach(l => leadStatusMap[l.status] = (leadStatusMap[l.status] || 0) + 1);
      const leadStatusDistribution = Object.entries(leadStatusMap).map(([name, value]) => ({ name, value }));

      const leadTimeline: any[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = subMonths(new Date(), i);
        leadTimeline.push({ month: format(d, 'MMM/yy', { locale: ptBR }), key: format(d, 'yyyy-MM'), count: 0 });
      }
      leads.forEach(l => {
        const mKey = format(l.createdAt instanceof Timestamp ? l.createdAt.toDate() : new Date(l.createdAt as any), 'yyyy-MM');
        const m = leadTimeline.find(m => m.key === mKey);
        if (m) m.count++;
      });

      // 8. Financial Evolution (Institucional Bueno Gois)
      const months: any[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = subMonths(new Date(), i);
        months.push({ month: format(d, 'MMM/yy', { locale: ptBR }), key: format(d, 'yyyy-MM'), receita: 0, despesa: 0 });
      }
      titles.forEach(t => {
        const mKey = format(t.dueDate instanceof Timestamp ? t.dueDate.toDate() : new Date(t.dueDate as any), 'yyyy-MM');
        const m = months.find(m => m.key === mKey);
        if (m) {
          if (t.type === 'RECEITA' && t.status === 'PAGO') {
            // Se o título tem processo, tentamos ver a participação real do escritório
            const process = allProcesses.find(p => p.id === t.processId);
            const lawyerId = process?.leadLawyerId;
            const lawyerStaff = staffSnap.docs.find(doc => doc.id === lawyerId)?.data() as Staff;
            const officePercentage = lawyerStaff?.remuneration?.officePercentage || 70; // Default 70% banca
            m.receita += (t.value * (officePercentage / 100)); 
          }
          if (t.type === 'DESPESA' && t.status === 'PAGO') m.despesa += t.value;
        }
      });

        // 9. Portfolio Performance Table (Top 10 High Value)
        const portfolio = allProcesses
          .map(p => {
            const processTitles = titles.filter(t => t.processId === p.id && t.status === 'PAGO' && t.type === 'RECEITA');
            const lawyerId = p.leadLawyerId;
            const lawyerStaff = staffSnap.docs.find(doc => doc.id === lawyerId)?.data() as Staff;
            const officePercentage = lawyerStaff?.remuneration?.officePercentage || 70;
            
            const totalReturned = processTitles.reduce((sum, t) => sum + (t.value * (officePercentage / 100)), 0); 
            
            return {
              id: p.id,
              name: p.name,
              processNumber: p.processNumber,
              lawyer: lawyerStaff ? `${lawyerStaff.firstName} ${lawyerStaff.lastName.charAt(0)}.` : 'Não Atribuído',
              caseValue: p.caseValue || 0,
              financialReturn: totalReturned,
              status: p.status,
              legalArea: p.legalArea,
              clientId: p.clientId,
              aging: differenceInDays(new Date(), p.createdAt instanceof Timestamp ? p.createdAt.toDate() : new Date())
            };
          })
          .sort((a, b) => b.caseValue - a.caseValue)
          .slice(0, 10);

      setReportData({
        stats: {
          avgCaseValue,
          avgSettlementValue,
          successRate,
          avgAging: avgAgingMonths, 
          totalLeads: leads.length,
          convertedLeadsCount: leads.filter(l => l.status === 'CONVERTIDO').length,
          overallLeadConversion: leads.length > 0 ? (leads.filter(l => l.status === 'CONVERTIDO').length / leads.length) * 100 : 0,
          avgConversionDays
        },
        lawyerPerformance,
        lawyerLeadStats,
        avgTimePerStage,
        leadCapture,
        leadStatusDistribution,
        leadTimeline,
        financial: months,
        portfolio,
        riskyProcesses: allProcesses.filter(p => p.status === 'Pendente').slice(0, 5),
        topPerformers: lawyerPerformance.sort((a, b) => b.demandas - a.demandas).slice(0, 3).map(l => ({ name: l.nome, count: l.demandas }))
      });

    } catch (e: any) {
      console.error("[Relatorios] Fetch error:", e);
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  }, [firestore, session, role, userProfile]);

  React.useEffect(() => { fetchData(); }, [fetchData]);

  if (isLoading) return <div className="flex flex-col items-center justify-center py-40 gap-4"><Loader2 className="h-12 w-12 animate-spin text-primary" /><p className="text-sm font-black text-slate-500 uppercase tracking-widest">Calculando Inteligência Jurídica...</p></div>;

  return (
    <div className="flex flex-col gap-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 print:hidden">
        <div>
          <H1 className="text-white text-3xl font-black">BI & Performance Estratégica</H1>
          <p className="text-sm text-slate-400 mt-1">Análise institucional para diretoria e gestores de elite.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => fetchData()} className="bg-[#0f172a] border-white/10 text-white h-10"><RefreshCw className="mr-2 h-4 w-4" /> Recalcular</Button>
          <Button variant="default" size="sm" onClick={() => window.print()} className="bg-primary text-primary-foreground font-black h-10 shadow-lg shadow-primary/20"><Printer className="mr-2 h-4 w-4" /> Exportar Relatório (PDF)</Button>
        </div>
      </div>

      {error ? (
        <Alert variant="destructive" className="bg-rose-500/10 border-rose-500/20 text-rose-400">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Configuração Pendente (Índice Firestore)</AlertTitle>
          <AlertDescription className="text-xs mt-2 space-y-4">
            <p>O Firebase requer a criação de índices para gerar esses relatórios consolidados.</p>
            <Button variant="outline" size="sm" className="mt-2 text-[10px] uppercase font-bold" asChild>
              <a href="https://console.firebase.google.com" target="_blank">Abrir Console e Verificar</a>
            </Button>
          </AlertDescription>
        </Alert>
      ) : reportData ? (
        <div id="report-print-area">
          {role === 'admin' || role === 'financial' ? <AdminReports data={reportData} /> : <div className="text-center py-20 opacity-40 italic">Relatório disponível apenas para gestores.</div>}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 opacity-40">
          <Activity className="h-12 w-12 mb-4" />
          <p className="font-bold text-white">Nenhum dado disponível para compilação.</p>
        </div>
      )}
    </div>
  );
}
