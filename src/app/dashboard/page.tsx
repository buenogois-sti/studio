'use client';
import * as React from 'react';
import {
  Activity,
  ArrowRight,
  Calendar,
  DollarSign,
  FolderKanban,
  Sparkles,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Loader2,
  BrainCircuit,
  Users,
  Timer,
  Gavel,
  Zap,
  Wallet,
  Receipt,
  Briefcase,
  Clock,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  ShieldAlert,
  Terminal,
  Search
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from 'recharts';
import Link from 'next/link';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { useFirebase, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, orderBy, limit, Timestamp, where, doc } from 'firebase/firestore';
import { Client, FinancialTitle, Process, Hearing, Log, UserProfile, StaffCredit, LegalDeadline, Staff, Lead } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { format, isBefore, startOfMonth, startOfDay, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { analyzeOfficeStatus, type OfficeInsightsOutput } from '@/ai/flows/office-insights-flow';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { IntimacoesHighlight } from '@/components/notifications/IntimacoesHighlight';

// --- SUB-COMPONENTES DE VISÃO MEMOIZADOS ---

const AIAdvisor = React.memo(({ stats, activities, isLoading, role }: { stats: any, activities: string[], isLoading: boolean, role: string }) => {
    const [insights, setInsights] = React.useState<OfficeInsightsOutput | null>(null);
    const [isAnalyzing, setIsAnalyzing] = React.useState(false);

    const handleAnalyze = async () => {
        setIsAnalyzing(true);
        try {
            const result = await analyzeOfficeStatus({
                totalRevenue: stats.totalRevenue || 0,
                pendingReceivables: stats.pendingReceivables || 0,
                totalOverdue: stats.totalOverdue || 0,
                activeProcessesCount: stats.activeProcessesCount || 0,
                upcomingHearingsCount: stats.upcomingHearingsCount || 0,
                recentActivities: activities,
            });
            setInsights(result);
        } catch (error) {
            console.error("AI Analysis failed:", error);
        } finally {
            setIsAnalyzing(false);
        }
    };

    if (isLoading) return <Skeleton className="h-48 w-full bg-[#0f172a]" />;

    return (
        <Card className="relative overflow-hidden border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-[#0f172a] to-accent/5 shadow-2xl">
            <div className="absolute top-0 right-0 p-4 opacity-10">
                <BrainCircuit className="h-24 w-24 text-primary" />
            </div>
            <CardHeader>
                <div className="flex items-center gap-2">
                    <div className="bg-primary/20 p-2 rounded-lg">
                        <Sparkles className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <CardTitle className="text-lg text-white">Advisor AI - {role === 'admin' ? 'Gestão' : 'Operacional'}</CardTitle>
                        <CardDescription>Insights baseados na sua carga de trabalho</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {insights ? (
                    <div className="space-y-4 animate-in fade-in duration-500">
                        <div className="flex items-start gap-3 p-4 rounded-xl bg-black/40 border border-white/10">
                            {insights.mood === 'positive' ? (
                                <CheckCircle2 className="h-5 w-5 text-emerald-500 mt-0.5" />
                            ) : insights.mood === 'alert' ? (
                                <AlertCircle className="h-5 w-5 text-rose-500 mt-0.5" />
                            ) : (
                                <TrendingUp className="h-5 w-5 text-blue-500 mt-0.5" />
                            )}
                            <p className="text-sm font-medium leading-relaxed text-slate-200">{insights.summary}</p>
                        </div>
                        <ul className="grid gap-2">
                            {insights.insights.map((insight: string, i: number) => (
                                <li key={i} className="text-xs text-slate-400 flex gap-2">
                                    <span className="text-primary font-bold">•</span>
                                    {insight}
                                </li>
                            ))}
                        </ul>
                        <Button variant="outline" size="sm" onClick={handleAnalyze} disabled={isAnalyzing} className="w-full border-primary/20 text-primary hover:bg-primary/5">
                            {isAnalyzing ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : <Sparkles className="h-3 w-3 mr-2" />}
                            Atualizar Análise
                        </Button>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-6 text-center space-y-4">
                        <p className="text-sm text-slate-400 max-w-xs">
                            Solicite uma análise estratégica baseada nos dados do {role === 'admin' ? 'escritório' : 'seu perfil'}.
                        </p>
                        <Button onClick={handleAnalyze} disabled={isAnalyzing} className="bg-primary text-primary-foreground font-bold shadow-lg shadow-primary/20">
                            {isAnalyzing ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : <Sparkles className="h-3 w-3 mr-2" />}
                            Gerar Insights
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
});
const WhatsNewBanner = React.memo(() => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 animate-in slide-in-from-top duration-700">
        {[
            { 
                title: "Perícias Judiciais", 
                desc: "Novo módulo para agendamento e controle de peritos.", 
                icon: Search, 
                href: "/dashboard/pericias",
                color: "text-blue-400 bg-blue-500/10 border-blue-500/20"
            },
            { 
                title: "Gestão de RH", 
                desc: "Sistema de remuneração e folha de elite integrado.", 
                icon: Users, 
                href: "/dashboard/rh",
                color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
            },
            { 
                title: "Categorias Financeiras", 
                desc: "Novo plano de contas com subcategorias detalhadas.", 
                icon: DollarSign, 
                href: "/dashboard/financeiro",
                color: "text-amber-400 bg-amber-500/10 border-amber-500/20"
            }
        ].map((item, i) => (
            <Link key={i} href={item.href} className={cn("flex items-start gap-3 p-4 rounded-2xl border hover:scale-[1.02] transition-all bg-black/40 shadow-xl", item.color)}>
                <div className="p-2 rounded-xl bg-white/5 border border-white/10 shrink-0">
                    <item.icon className="h-5 w-5" />
                </div>
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-xs font-black uppercase text-white">{item.title}</h3>
                        <Badge className="text-[8px] font-black h-4 px-1.5 bg-primary text-primary-foreground">NOVO</Badge>
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 leading-tight">{item.desc}</p>
                </div>
            </Link>
        ))}
    </div>
));
WhatsNewBanner.displayName = 'WhatsNewBanner';

AIAdvisor.displayName = 'AIAdvisor';

const AdminDashboard = React.memo(({ stats, isLoading, logsData, hearingsData, chartData }: any) => (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Receita Bruta (Mês)" value={stats.totalRevenue} icon={DollarSign} currency />
        <StatCard title="Eficiência Triagem" value={stats.leadsConverted} icon={Zap} suffix="%" />
        <StatCard title="Processos Ativos" value={stats.activeProcessesCount} icon={FolderKanban} />
        <StatCard title="Pauta Urgente" value={stats.upcomingHearingsCount} icon={Calendar} />
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <AIAdvisor stats={stats} activities={logsData} isLoading={isLoading} role="admin" />
          <ChartCard data={chartData} title="Entrada de Novos Casos" />
        </div>
        <div className="space-y-6">
          <UpcomingActsCard data={hearingsData} isLoading={isLoading} />
        </div>
      </div>
    </div>
));
AdminDashboard.displayName = 'AdminDashboard';

const LawyerDashboard = React.memo(({ stats, isLoading, hearingsData, deadlinesData, logsData }: any) => (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Minha Carteira" value={stats.activeProcessesCount} icon={Briefcase} />
        <StatCard title="Meus Honorários" value={stats.personalFees} icon={Wallet} currency />
        <StatCard title="Prazos Pendentes" value={stats.personalDeadlines} icon={Timer} />
        <StatCard title="Atos Agendados" value={stats.upcomingHearingsCount} icon={Gavel} />
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <AIAdvisor stats={stats} activities={logsData} isLoading={isLoading} role="lawyer" />
          <PersonalDeadlinesCard data={deadlinesData} isLoading={isLoading} />
        </div>
        <div className="space-y-6">
          <UpcomingActsCard data={hearingsData} isLoading={isLoading} title="Minhas Audiências" />
        </div>
      </div>
    </div>
));
LawyerDashboard.displayName = 'LawyerDashboard';

const FinancialDashboard = React.memo(({ stats, isLoading, titlesData }: any) => (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Recebido (Mês)" value={stats.totalRevenue} icon={TrendingUp} currency color="text-emerald-500" />
        <StatCard title="Pendentes" value={stats.pendingReceivables} icon={Clock} currency color="text-amber-500" />
        <StatCard title="Total em Atraso" value={stats.totalOverdue} icon={AlertCircle} currency color="text-rose-500" />
        <StatCard title="Contas a Pagar" value={stats.totalExpenses} icon={DollarSign} currency />
      </div>
      <Card className="bg-[#0f172a] border-border/50">
        <CardHeader><CardTitle className="text-white font-headline">Lançamentos Críticos</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-4">
            {titlesData?.map((t: any) => (
              <div key={t.id} className="flex items-center justify-between p-3 rounded-lg bg-black/20 border border-white/5">
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-white">{t.description}</span>
                  <span className="text-[10px] text-slate-500">Vencimento: {t.dueDate?.toDate ? format(t.dueDate.toDate(), 'dd/MM/yy') : 'N/A'}</span>
                </div>
                <span className="text-sm font-black text-white">{t.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
));
FinancialDashboard.displayName = 'FinancialDashboard';

const AssistantDashboard = React.memo(({ stats, hearingsData, leadsData, isLoading }: any) => (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Atos p/ Hoje" value={stats.hearingsToday} icon={Calendar} color="text-primary" />
        <StatCard title="Novos Leads" value={stats.newLeads} icon={Zap} color="text-amber-400" />
        <StatCard title="Prazos Diários" value={stats.deadlinesToday} icon={Timer} />
        <StatCard title="Pastas Pendentes" value={stats.pendingDrive} icon={FolderKanban} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <UpcomingActsCard data={hearingsData} isLoading={isLoading} title="Logística de Audiências" />
        <Card className="bg-[#0f172a] border-border/50">
          <CardHeader><CardTitle className="text-white font-headline">Últimos Leads para Triagem</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {leadsData?.map((l: any) => (
              <div key={l.id} className="flex items-center justify-between p-3 rounded-xl bg-black/20 border border-white/5">
                <span className="text-xs font-bold text-white truncate max-w-[200px]">{l.title}</span>
                <Badge variant="outline" className="text-[9px] font-black uppercase text-primary border-primary/30">{l.status}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
));
AssistantDashboard.displayName = 'AssistantDashboard';

// --- HELPER COMPONENTS ---

function StatCard({ title, value, icon: Icon, currency, suffix, color }: any) {
  return (
    <Card className="bg-[#0f172a] border-border/50 transition-all hover:border-primary/20">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{title}</CardTitle>
        <Icon className={cn("h-4 w-4", color || "text-primary")} />
      </CardHeader>
      <CardContent>
        <div className={cn("text-2xl font-black text-white", color)}>
          {currency ? (value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : `${value || 0}${suffix || ''}`}
        </div>
      </CardContent>
    </Card>
  );
}

function UpcomingActsCard({ data, isLoading, title = "Próximos Atos" }: any) {
  return (
    <Card className="h-full bg-[#0f172a] border-border/50 shadow-none">
      <CardHeader className="border-b border-white/5">
        <CardTitle className="font-headline text-xl flex items-center gap-2 text-white uppercase tracking-tighter">
          <Calendar className="h-5 w-5 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 w-full bg-white/5 rounded-xl" />)}
          </div>
        ) : (
          <div className="space-y-6 text-slate-300">
            {data?.map((h: any) => {
              const hDate = h.date?.toDate ? h.date.toDate() : null;
              if (!hDate) return null;
              
              return (
                <div key={h.id} className="flex items-start gap-4 p-3 rounded-xl hover:bg-white/5 transition-colors group">
                  <div className="flex flex-col items-center justify-center p-2 bg-black/40 rounded-xl w-12 h-12 border border-white/5 shrink-0 group-hover:border-primary/30 transition-all">
                    <span className="text-[10px] font-black uppercase text-primary leading-none">{format(hDate, 'MMM', { locale: ptBR })}</span>
                    <span className="text-lg font-black text-white leading-none">{format(hDate, 'dd')}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-sm truncate text-white">Audiência {h.type}</p>
                    <p className="text-[10px] text-muted-foreground uppercase flex items-center gap-1"><Users className="h-2.5 w-2.5" /> {h.lawyerName}</p>
                  </div>
                </div>
              );
            })}
            {data?.length === 0 && <p className="text-xs italic text-muted-foreground text-center py-10 opacity-30">Sem atos agendados.</p>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PersonalDeadlinesCard({ data, isLoading }: any) {
  return (
    <Card className="bg-[#0f172a] border-border/50 shadow-none">
      <CardHeader><CardTitle className="text-white font-headline">Prazos Fatais</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? <Skeleton className="h-32 w-full" /> : data?.map((d: any) => {
          const endDate = d.endDate?.toDate ? d.endDate.toDate() : null;
          if (!endDate) return null;

          return (
            <div key={d.id} className="flex items-center justify-between p-4 rounded-xl bg-rose-500/[0.03] border border-rose-500/20 group hover:bg-rose-500/5 transition-all">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-500"><Timer className="h-4 w-4" /></div>
                <div>
                  <p className="text-sm font-bold text-white">{d.type}</p>
                  <p className="text-[10px] text-rose-400 font-bold uppercase tracking-widest">Vence em: {format(endDate, 'dd/MM/yyyy')}</p>
                </div>
              </div>
              <Button size="sm" variant="ghost" className="text-[10px] font-black uppercase text-rose-400" asChild><Link href="/dashboard/prazos">Ver Guia</Link></Button>
            </div>
          );
        })}
        {data?.length === 0 && <p className="text-center py-10 text-xs text-slate-500 italic">Nenhum prazo pendente.</p>}
      </CardContent>
    </Card>
  );
}

function ChartCard({ data, title }: any) {
  return (
    <Card className="bg-[#0f172a] border-border/50 shadow-none">
      <CardHeader><CardTitle className="font-headline text-xl text-white">{title}</CardTitle></CardHeader>
      <CardContent>
        <ChartContainer config={{ newCases: { label: 'Novos Casos', color: '#F5D030' } }} className="h-[250px] w-full">
          <ResponsiveContainer>
            <BarChart data={data}>
              <XAxis dataKey="month" stroke="#475569" fontSize={12} axisLine={false} tickLine={false} />
              <YAxis stroke="#475569" fontSize={12} axisLine={false} tickLine={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="newCases" fill="#F5D030" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

// --- MAIN PAGE ---

export default function Dashboard() {
  const { firestore, user, userError } = useFirebase();
  const { data: session, status } = useSession();

  // Estabiliza as datas para evitar subscrições cíclicas no Firebase
  const stableStartOfMonth = React.useMemo(() => Timestamp.fromDate(startOfMonth(new Date())), []);
  const stableNow = React.useMemo(() => Timestamp.now(), []);

  const userProfileRef = useMemoFirebase(
    () => (firestore && session?.user?.id ? doc(firestore, 'users', session.user.id) : null),
    [firestore, session]
  );
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);
  
  const role = userProfile?.role || 'assistant';

  // Resolução de Staff ID para filtros do advogado — só carrega staff se for role que precisa
  const needsStaffLookup = role === 'lawyer';
  const staffQuery = useMemoFirebase(
    () => (firestore && needsStaffLookup ? collection(firestore, 'staff') : null),
    [firestore, needsStaffLookup]
  );
  const { data: staffData } = useCollection<Staff>(staffQuery);
  
  const currentStaffMember = React.useMemo(() => {
    if (!staffData || !session?.user?.email) return null;
    return staffData.find(s => s.email.toLowerCase() === session.user.email?.toLowerCase());
  }, [staffData, session?.user?.email]);

  // Flag: dados de base prontos para disparar queries?
  const isRoleReady = !!userProfile && (role !== 'lawyer' || !!currentStaffMember);

  // QUERIES DINÂMICAS POR ROLE — só disparam quando isRoleReady
  const titlesQuery = useMemoFirebase(() => {
    if (!firestore || !isRoleReady) return null;
    if (role !== 'admin' && role !== 'financial') return null;
    // Buscamos um número maior de títulos para que o cálculo de totais seja real
    return query(collection(firestore, 'financial_titles'), where('dueDate', '>=', stableStartOfMonth), limit(500));
  }, [firestore, isRoleReady, role, stableStartOfMonth]);
  const { data: titlesData, isLoading: isLoadingTitles, error: titlesError } = useCollection<FinancialTitle>(titlesQuery);

  const processesQuery = useMemoFirebase(() => {
    if (!firestore || !isRoleReady) return null;
    const base = collection(firestore, 'processes');
    if (role === 'lawyer' && currentStaffMember) {
      return query(base, where('leadLawyerId', '==', currentStaffMember.id), orderBy('updatedAt', 'desc'), limit(100));
    }
    return query(base, orderBy('createdAt', 'desc'), limit(300));
  }, [firestore, isRoleReady, role, currentStaffMember]);
  const { data: rawProcessesData, isLoading: isLoadingProcesses, error: processesError } = useCollection<Process>(processesQuery);

  const processesData = React.useMemo(() => {
    if (!rawProcessesData) return null;
    const seen = new Set<string>();
    return rawProcessesData.filter(p => {
      const key = p.processNumber 
        ? `num-${p.processNumber.replace(/\D/g, '')}` 
        : `name-${p.name}-${p.clientId || 'no-client'}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [rawProcessesData]);

  const hearingsQuery = useMemoFirebase(() => {
    if (!firestore || !isRoleReady) return null;
    const base = collection(firestore, 'hearings');
    if (role === 'lawyer' && currentStaffMember) {
      return query(base, where('lawyerId', '==', currentStaffMember.id), where('date', '>=', stableNow), orderBy('date', 'asc'), limit(5));
    }
    return query(base, where('date', '>=', stableNow), orderBy('date', 'asc'), limit(5));
  }, [firestore, isRoleReady, role, currentStaffMember, stableNow]);
  const { data: rawHearingsData, isLoading: isLoadingHearings, error: hearingsError } = useCollection<Hearing>(hearingsQuery);

  const hearingsData = React.useMemo(() => {
    if (!rawHearingsData) return null;
    const seen = new Set<string>();
    return rawHearingsData.filter(h => {
      const key = `${h.processId}-${h.type}-${h.date.seconds}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [rawHearingsData]);

  const deadlinesQuery = useMemoFirebase(() => {
    if (!firestore || !isRoleReady) return null;
    const base = collection(firestore, 'deadlines');
    if (role === 'lawyer' && currentStaffMember) {
      return query(base, where('authorId', '==', currentStaffMember.id), where('status', '==', 'PENDENTE'), orderBy('endDate', 'asc'), limit(3));
    }
    // Para admin/assistant, pegar todos os pendentes para hoje/geral
    return query(base, where('status', '==', 'PENDENTE'), orderBy('endDate', 'asc'), limit(5));
  }, [firestore, isRoleReady, role, currentStaffMember]);
  const { data: deadlinesData, error: deadlinesError } = useCollection<LegalDeadline>(deadlinesQuery);

  const personalCreditsQuery = useMemoFirebase(() => {
    if (!firestore || role !== 'lawyer' || !currentStaffMember) return null;
    return query(collection(firestore, `staff/${currentStaffMember.id}/credits`), where('status', '==', 'DISPONIVEL'));
  }, [firestore, role, currentStaffMember]);
  const { data: creditsData } = useCollection<StaffCredit>(personalCreditsQuery);

  const logsData = useMemoFirebase(
    () => (firestore && isRoleReady && session?.user?.id
      ? query(collection(firestore, `users/${session.user.id}/logs`), orderBy('timestamp', 'desc'), limit(3))
      : null),
    [firestore, isRoleReady, session?.user?.id]
  );
  const { data: logsDataList } = useCollection<Log>(logsData);

  const leadsQuery = useMemoFirebase(() => {
    if (!firestore || !isRoleReady) return null;
    if (role !== 'admin' && role !== 'assistant') return null;
    return query(collection(firestore, 'leads'), orderBy('createdAt', 'desc'), limit(200));
  }, [firestore, isRoleReady, role]);
  const { data: leadsData } = useCollection<Lead>(leadsQuery);

  const stats = React.useMemo(() => {
    const s = { 
      totalRevenue: 0, pendingReceivables: 0, totalOverdue: 0, activeProcessesCount: 0, 
      upcomingHearingsCount: 0, leadsConverted: 0, personalFees: 0, personalDeadlines: 0,
      totalExpenses: 0, hearingsToday: 0, newLeads: 0, deadlinesToday: 0, pendingDrive: 0
    };
    
    if (!processesData) return s;
    const now = startOfDay(new Date());

    if (role === 'admin' || role === 'financial') {
      titlesData?.forEach(t => {
        const dueDate = t.dueDate instanceof Timestamp ? t.dueDate.toDate() : (t.dueDate ? new Date(t.dueDate as any) : null);
        const paymentDate = t.paymentDate instanceof Timestamp ? t.paymentDate.toDate() : (t.paymentDate ? new Date(t.paymentDate as any) : null);
        
        if (t.type === 'RECEITA') {
          // Receita do mês: título pago com data de pagamento dentro do mês atual
          if (t.status === 'PAGO' && paymentDate && paymentDate >= startOfMonth(new Date())) {
            s.totalRevenue += t.value;
          } 
          
          if (t.status === 'PENDENTE') {
            if (dueDate && isBefore(dueDate, now)) s.totalOverdue += t.value;
            else s.pendingReceivables += t.value;
          }
        } else if (t.type === 'DESPESA' && t.status === 'PENDENTE') {
          s.totalExpenses += t.value;
        }
      });
    }

    if (role === 'lawyer') {
      creditsData?.forEach(c => s.personalFees += (c.value || 0));
      s.personalDeadlines = deadlinesData?.length || 0;
    }

    if (leadsData) {
      const totalLeads = leadsData.length;
      const convertedLeads = leadsData.filter(l => l.status === 'CONVERTIDO').length;
      s.leadsConverted = totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 100) : 0;
      s.newLeads = leadsData.filter(l => l.status === 'NOVO').length;
    }

    if (hearingsData) {
      s.upcomingHearingsCount = hearingsData.length;
      s.hearingsToday = hearingsData.filter(h => isSameDay(h.date.toDate(), now)).length;
    }
    
    if (deadlinesData) {
      s.deadlinesToday = deadlinesData.filter(d => isSameDay(d.endDate.toDate(), now)).length;
    }

    s.activeProcessesCount = processesData.filter(p => p.status === 'Ativo').length;
    s.pendingDrive = processesData.filter(p => p.status === 'Ativo' && !p.driveFolderId).length;

    return s;
  }, [role, titlesData, processesData, hearingsData, creditsData, deadlinesData, leadsData]);

  const chartData = React.useMemo(() => {
    const months: { month: string; key: string; newCases: number; }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ month: d.toLocaleString('pt-BR', { month: 'short' }), key: `${d.getFullYear()}-${d.getMonth()}`, newCases: 0 });
    }
    processesData?.forEach(p => {
      const date = p.createdAt?.toDate ? p.createdAt.toDate() : null;
      if (date) {
        const key = `${date.getFullYear()}-${date.getMonth()}`;
        const m = months.find(m => m.key === key);
        if (m) m.newCases++;
      }
    });
    return months;
  }, [processesData]);

  const anyError = userError || titlesError || processesError || hearingsError || deadlinesError;
  const isLoading = status === 'loading' || isLoadingTitles || isLoadingProcesses || isLoadingHearings;

  if (anyError) {
    const errorMsg = (anyError as any)?.message || '';
    const autoIndexLink = errorMsg.match(/https:\/\/console\.firebase\.google\.com[^\s]*/)?.[0];
    const isAuthError = (anyError as any)?.code === 'auth/invalid-custom-token';

    return (
      <div className="p-6">
        <Alert variant="destructive" className="bg-rose-500/10 border-rose-500/20 text-rose-400 shadow-lg">
          <AlertTriangle className="h-5 w-5" />
          <AlertTitle className="text-lg font-black uppercase tracking-tighter">
            {isAuthError ? 'Erro de Sincronização de Projeto' : 'Configuração Pendente no Banco de Dados'}
          </AlertTitle>
          <AlertDescription className="text-xs mt-2 space-y-4">
            {isAuthError ? (
              <p>O token de acesso foi gerado para um projeto diferente deste cliente. Isso ocorre quando a variável <code>FIREBASE_SERVICE_ACCOUNT_JSON</code> no servidor não corresponde ao projeto configurado no navegador.</p>
            ) : (
              <p>O Dashboard não pode carregar as informações estratégicas porque faltam índices compostos para organizar os dados.</p>
            )}
            
            <div className="bg-black/40 p-4 rounded-xl border border-white/10 font-mono text-[10px] leading-relaxed">
              <p className="text-white font-bold mb-2">Instruções para Resolução:</p>
              {autoIndexLink ? (
                <Button className="w-full bg-primary text-primary-foreground font-black uppercase text-[10px] h-10 mb-4 shadow-lg shadow-primary/20" asChild>
                  <a href={autoIndexLink} target="_blank">
                    <RefreshCw className="h-3 w-3 mr-2" /> CRIAR ÍNDICE AUTOMATICAMENTE
                  </a>
                </Button>
              ) : isAuthError ? (
                <>1. Verifique se o <code>project_id</code> no JSON de credenciais é o mesmo do <code>src/firebase/config.ts</code>.<br />2. Atualize as variáveis de ambiente no seu servidor (Vercel/Docker).<br />3. Consulte o arquivo <code>docs/firebase-auth-flow.md</code> para o guia completo.</>
              ) : (
                <p>Abra o console do seu navegador (F12) e procure pelo link gerado pelo Firebase para criar o índice rapidamente.</p>
              )}
            </div>
            
            <div className="flex gap-3">
              <Button variant="outline" size="sm" onClick={() => window.location.reload()} className="mt-2 border-rose-500/30">
                <RefreshCw className="h-3 w-3 mr-2" /> Recarregar Página
              </Button>
              {isAuthError && (
                <Button variant="ghost" size="sm" className="mt-2 text-rose-400" asChild>
                  <a href="https://vercel.com" target="_blank">Abrir Vercel <ExternalLink className="h-3 w-3 ml-2" /></a>
                </Button>
              )}
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 pb-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="animate-in slide-in-from-left duration-500">
            <h1 className="text-4xl font-black tracking-tight font-headline text-white">
            Olá, {session?.user?.name?.split(' ')[0]}
            </h1>
            <p className="text-slate-400 font-medium mt-1">
              Visão: <span className="text-primary font-black uppercase tracking-widest text-[10px]">{role}</span>
            </p>
        </div>
        <Badge variant="outline" className="h-8 px-3 border-emerald-500/20 bg-emerald-500/5 text-emerald-600 font-bold">
            <CheckCircle2 className="h-3 w-3 mr-1.5" /> Acesso Seguro
        </Badge>
      </div>
      
      <IntimacoesHighlight />
      <WhatsNewBanner />
      
      {role === 'admin' && <AdminDashboard stats={stats} isLoading={isLoading} logsData={logsDataList?.map((l: any) => l.description) || []} hearingsData={hearingsData} chartData={chartData} />}
      {role === 'lawyer' && <LawyerDashboard stats={stats} isLoading={isLoading} hearingsData={hearingsData} deadlinesData={deadlinesData} logsData={logsDataList?.map((l: any) => l.description) || []} />}
      {role === 'financial' && <FinancialDashboard stats={stats} isLoading={isLoading} titlesData={titlesData} />}
      {role === 'assistant' && <AssistantDashboard stats={stats} hearingsData={hearingsData} leadsData={leadsData || []} isLoading={isLoading} />}
    </div>
  );
}
