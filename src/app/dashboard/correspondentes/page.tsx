'use client';
import * as React from 'react';
import {
  Users,
  Search,
  PlusCircle,
  MoreVertical,
  UserCircle,
  DollarSign,
  History,
  FileText,
  X,
  Mail,
  Phone,
  MessageSquare,
  MapPin,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  Briefcase
} from 'lucide-react';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc, deleteDoc, orderBy, getDocs, limit, Timestamp } from 'firebase/firestore';
import type { Staff, StaffCredit, Process, Hearing } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { StaffForm } from '@/components/staff/StaffForm';
import { StaffDetailsSheet } from '@/components/staff/StaffDetailsSheet';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { format, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const roleLabels: Record<string, string> = {
  lawyer: 'Advogado(a)',
  intern: 'Estagiário(a)',
  provider: 'Prestador',
  partner: 'Sócio(a)',
  employee: 'Administrativo',
};

function CorrespondentStats({ staffId }: { staffId: string }) {
  const { firestore } = useFirebase();
  const [stats, setStats] = React.useState({ pending: 0, paid: 0, completed: 0 });
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!firestore || !staffId) return;
    
    const fetchData = async () => {
      try {
        const now = new Date();
        const startOfCurrentMonth = startOfMonth(now);

        // 1. Buscar Créditos (Financeiro)
        const creditsRef = collection(firestore, `staff/${staffId}/credits`);
        const creditsSnap = await getDocs(query(creditsRef));
        
        let pending = 0;
        let paid = 0;
        
        creditsSnap.docs.forEach(d => {
          const data = d.data();
          const val = data.value || 0;
          if (data.status === 'DISPONIVEL') pending += val;
          if (data.status === 'PAGO') {
            const pDate = data.paymentDate?.toDate?.() || data.paymentDate;
            if (pDate && new Date(pDate) >= startOfCurrentMonth) paid += val;
          }
        });

        // 2. Buscar Diligências (Operacional)
        const diligSnap = await getDocs(query(
          collection(firestore, 'hearings'),
          where('lawyerId', '==', staffId),
          where('type', '==', 'DILIGENCIA'),
          where('status', '==', 'REALIZADA')
        ));
        
        setStats({ pending, paid, completed: diligSnap.size });
      } catch (e) {
        console.error("Error fetching correspondent stats:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [firestore, staffId]);

  if (loading) return (
    <div className="space-y-3 animate-pulse">
        <div className="grid grid-cols-2 gap-2">
            <div className="h-10 bg-white/5 rounded-xl" />
            <div className="h-10 bg-white/5 rounded-xl" />
        </div>
        <div className="h-10 bg-white/5 rounded-xl" />
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Financeiro</h4>
        <div className="flex items-center gap-1">
          <Badge variant="outline" className="text-[9px] h-4 bg-emerald-500/5 text-emerald-500 border-emerald-500/20 font-black">
            PRODUÇÃO
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="p-3 rounded-xl bg-white/5 border border-white/5 flex flex-col">
          <span className="text-[9px] font-black text-slate-500 uppercase">A Receber</span>
          <span className="text-sm font-black text-white">
            {stats.pending.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </span>
        </div>
        <div className="p-3 rounded-xl bg-white/5 border border-white/5 flex flex-col">
          <span className="text-[9px] font-black text-slate-500 uppercase">Pago (Mês)</span>
          <span className="text-sm font-black text-emerald-500">
            {stats.paid.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </span>
        </div>
      </div>

      <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Briefcase className="h-3.5 w-3.5 text-primary" />
          <span className="text-[10px] font-black text-white uppercase tracking-tighter">Diligências Concluídas</span>
        </div>
        <span className="text-sm font-black text-primary">{stats.completed}</span>
      </div>
    </div>
  );
}

export default function CorrespondentesPage() {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = React.useState('');
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = React.useState(false);
  const [selectedStaff, setSelectedStaff] = React.useState<Staff | null>(null);
  const [editingStaff, setEditingStaff] = React.useState<Staff | null>(null);
  const [globalStats, setGlobalStats] = React.useState({ activeStates: 0, pendingRepasses: 0, diligencesMonth: 0, pjCount: 0 });
  const [statsError, setStatsError] = React.useState<string | null>(null);

  const correspondentsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'staff'), where('engagementType', '==', 'correspondent')) : null),
    [firestore]
  );
  const { data: correspondents, isLoading: isLoadingStaff } = useCollection<Staff>(correspondentsQuery);

  const processesQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'processes') : null),
    [firestore]
  );
  const { data: processes } = useCollection<Process>(processesQuery);

  React.useEffect(() => {
    if (!firestore || !correspondents) return;
    
    const fetchGlobalStats = async () => {
      try {
        const now = new Date();
        const startOfMonthDate = startOfMonth(now);

        // 1. Estados Ativos
        const states = new Set(correspondents.map(c => c.address?.state).filter(Boolean));

        // 2. Diligências no Mês
        const diligSnap = await getDocs(query(
          collection(firestore, 'hearings'),
          where('type', '==', 'DILIGENCIA'),
          where('status', '==', 'REALIZADA'),
          where('date', '>=', Timestamp.fromDate(startOfMonthDate))
        ));

        // 3. Repasses Pendentes (Soma de todos os créditos DISPONIVEIS de todos os correspondentes)
        let totalPending = 0;
        for (const c of correspondents) {
            const creditsRef = collection(firestore, `staff/${c.id}/credits`);
            const snap = await getDocs(query(creditsRef, where('status', '==', 'DISPONIVEL')));
            snap.docs.forEach(d => totalPending += (d.data().value || 0));
        }

        setGlobalStats({ 
            activeStates: states.size, 
            pendingRepasses: totalPending, 
            diligencesMonth: diligSnap.size,
            pjCount: correspondents.filter(c => c.legalType === 'PJ').length
        });
        setStatsError(null);
      } catch (e: any) {
        console.error("Global stats error:", e);
        if (e.message?.includes('index')) setStatsError(e.message);
      }
    };

    fetchGlobalStats();
  }, [firestore, correspondents]);

  const filteredCorrespondents = React.useMemo(() => {
    if (!correspondents) return [];
    if (!searchTerm.trim()) return correspondents;
    const term = searchTerm.toLowerCase();
    return correspondents.filter(c => 
      `${c.firstName} ${c.lastName}`.toLowerCase().includes(term) ||
      (c.companyName || '').toLowerCase().includes(term) ||
      c.email.toLowerCase().includes(term) ||
      (c.address?.city || '').toLowerCase().includes(term)
    );
  }, [correspondents, searchTerm]);

  const stats = React.useMemo(() => {
    if (!correspondents) return { total: 0, byRole: {} };
    const total = correspondents.length;
    const roles: Record<string, number> = {};
    correspondents.forEach(c => {
      roles[c.role] = (roles[c.role] || 0) + 1;
    });
    return { total, byRole: roles };
  }, [correspondents]);

  const handleEdit = (staff: Staff) => {
    setEditingStaff(staff);
    setIsFormOpen(true);
  };

  const handleViewDetails = (staff: Staff) => {
    setSelectedStaff(staff);
    setIsDetailsOpen(true);
  };

  const handleDelete = async (staff: Staff) => {
    if (!firestore || !window.confirm(`Excluir o correspondente ${staff.firstName}?`)) return;
    try {
      await deleteDoc(doc(firestore, 'staff', staff.id));
      toast({ title: 'Correspondente excluído com sucesso!' });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Erro ao excluir', description: e.message });
    }
  };

  return (
    <div className="flex flex-col gap-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight font-headline text-white uppercase italic">Central de Correspondentes</h1>
          <p className="text-sm text-muted-foreground">Gestão de prestadores externos e pagamentos por diligência.</p>
        </div>
        
        {statsError && (
          <div className="bg-rose-500/10 border border-rose-500/30 p-2 rounded-lg flex items-center gap-2 max-w-sm">
            <AlertCircle className="h-4 w-4 text-rose-500 shrink-0" />
            <p className="text-[9px] font-bold text-rose-400 uppercase leading-tight">
              Erro de índice detectado. Consfira o console para link de correção.
            </p>
          </div>
        )}
        
        <div className="flex items-center gap-3">
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Nome, cidade ou email..." 
              className="pl-8 pr-8 h-10 bg-card border-border/50 text-white" 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute right-2.5 top-2.5">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
          </div>
          <Button size="sm" className="h-10 shadow-md bg-primary text-primary-foreground font-bold" onClick={() => { setEditingStaff(null); setIsFormOpen(true); }}>
            <PlusCircle className="mr-2 h-4 w-4" /> Novo Correspondente
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-[#0f172a] border-border/50 shadow-none">
          <CardContent className="p-4 flex items-center gap-4 text-left">
            <div className="h-10 w-10 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-500">
              <Briefcase className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Escritórios PJ</p>
              <p className="text-xl font-black leading-none text-white">{globalStats.pjCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#0f172a] border-border/50 shadow-none">
          <CardContent className="p-4 flex items-center gap-4 text-left">
            <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
              <MapPin className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Estados Ativos</p>
              <p className="text-xl font-black leading-none text-white">{globalStats.activeStates}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#0f172a] border-border/50 shadow-none text-left">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Repasses Pendentes</p>
              <p className="text-xl font-black leading-none text-white">{globalStats.pendingRepasses.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#0f172a] border-border/50 shadow-none text-left">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-500">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Diligências/Mês</p>
              <p className="text-xl font-black leading-none text-white">{globalStats.diligencesMonth}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="pf" className="w-full">
        <TabsList className="bg-black/20 border border-white/5 p-1 mb-6 rounded-2xl h-11 flex gap-1">
          <TabsTrigger value="pf" className="flex-1 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-black text-[10px] uppercase tracking-widest border border-transparent transition-all">
            <UserCircle className="mr-2 h-3.5 w-3.5" /> Profissionais Autônomos (PF)
          </TabsTrigger>
          <TabsTrigger value="pj" className="flex-1 rounded-xl data-[state=active]:bg-indigo-500 data-[state=active]:text-white font-black text-[10px] uppercase tracking-widest border border-transparent transition-all">
            <Briefcase className="mr-2 h-3.5 w-3.5" /> Escritórios & Parceiros (PJ)
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pf" className="mt-0">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
            {isLoadingStaff ? (
              [...Array(6)].map((_, i) => <Card key={i} className="h-64 bg-white/5 animate-pulse" />)
            ) : filteredCorrespondents.filter(c => c.legalType !== 'PJ').length > 0 ? (
                filteredCorrespondents.filter(c => c.legalType !== 'PJ').map(c => (
                  <CorrespondentCard 
                    key={c.id} 
                    correspondent={c} 
                    onEdit={() => handleEdit(c)}
                    onView={() => handleViewDetails(c)}
                    onDelete={() => handleDelete(c)}
                  />
                ))
            ) : (
                <div className="col-span-full py-20 text-center flex flex-col items-center gap-4 bg-white/5 rounded-3xl border-2 border-dashed border-white/10">
                    <Users className="h-12 w-12 text-slate-500 opacity-30" />
                    <div>
                      <h3 className="text-lg font-bold text-white">Sem profissionais PF</h3>
                      <p className="text-sm text-slate-400">Nenhum correspondente autônomo encontrado.</p>
                    </div>
                </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="pj" className="mt-0">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
            {isLoadingStaff ? (
              [...Array(4)].map((_, i) => <Card key={i} className="h-64 bg-white/5 animate-pulse" />)
            ) : filteredCorrespondents.filter(c => c.legalType === 'PJ').length > 0 ? (
                filteredCorrespondents.filter(c => c.legalType === 'PJ').map(c => (
                  <CorrespondentCard 
                    key={c.id} 
                    correspondent={c} 
                    onEdit={() => handleEdit(c)}
                    onView={() => handleViewDetails(c)}
                    onDelete={() => handleDelete(c)}
                  />
                ))
            ) : (
                <div className="col-span-full py-20 text-center flex flex-col items-center gap-4 bg-white/5 rounded-3xl border-2 border-dashed border-white/10">
                    <Briefcase className="h-12 w-12 text-slate-500 opacity-30" />
                    <div>
                      <h3 className="text-lg font-bold text-white">Sem escritórios PJ</h3>
                      <p className="text-sm text-slate-400">Clique em "Novo Correspondente" e selecione PJ no cadastro.</p>
                    </div>
                </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <Sheet open={isFormOpen} onOpenChange={setIsFormOpen}>
        <SheetContent className="sm:max-w-5xl w-full flex flex-col p-0 bg-[#020617] border-border">
          <SheetHeader className="p-6 border-b border-white/5 shrink-0">
            <SheetTitle className="text-white text-2xl font-black font-headline">
              {editingStaff ? 'Editar Correspondente' : 'Cadastro de Correspondente'}
            </SheetTitle>
            <SheetDescription className="text-slate-400">
              Defina o perfil, áreas de atuação e dados bancários para repasses automáticos.
            </SheetDescription>
          </SheetHeader>
          <ScrollArea className="flex-1">
            <div className="p-6">
              <StaffForm 
                onSave={() => { setIsFormOpen(false); setEditingStaff(null); }} 
                staff={editingStaff} 
              />
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      <StaffDetailsSheet 
        staff={selectedStaff}
        processes={processes || []}
        open={isDetailsOpen}
        onOpenChange={setIsDetailsOpen}
      />
    </div>
  );
}

function CorrespondentCard({ correspondent, onEdit, onView, onDelete }: { 
  correspondent: Staff; 
  onEdit: () => void;
  onView: () => void;
  onDelete: () => void;
}) {
  const statusConfig = {
    ATIVO: { label: 'Ativo', color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', ping: 'bg-emerald-500' },
    PENDENTE_HOMOLOGACAO: { label: 'Em Homologação', color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/20', ping: 'bg-amber-500' },
    BLOQUEADO: { label: 'Bloqueado', color: 'text-rose-500', bg: 'bg-rose-500/10', border: 'border-rose-500/20', ping: 'bg-rose-500' },
    INATIVO: { label: 'Inativo', color: 'text-slate-500', bg: 'bg-slate-500/10', border: 'border-slate-500/20', ping: 'bg-slate-500' },
  };

  const status = correspondent.status || 'ATIVO';
  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.ATIVO;

  return (
    <Card className="relative flex flex-col group hover:shadow-xl transition-all duration-300 overflow-hidden bg-[#0f172a] border-border/50 hover:border-primary/30">
        <div className={cn("absolute top-0 left-0 w-1 h-full transition-colors", status === 'ATIVO' ? "bg-primary/30 group-hover:bg-primary" : "bg-slate-500/30")} />
        
        <CardHeader className="pb-4">
            <div className="flex items-start justify-between">
                <div className="flex flex-col gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className={cn("flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[8px] font-black uppercase tracking-widest", config.bg, config.color, config.border)}>
                        <span className="relative flex h-1.5 w-1.5">
                          {status === 'ATIVO' && <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", config.ping)}></span>}
                          <span className={cn("relative inline-flex rounded-full h-1.5 w-1.5", config.ping)}></span>
                        </span>
                        {config.label}
                      </div>

                      <Badge variant="outline" className={cn(
                          "w-fit text-[8px] font-black uppercase py-0 px-1.5 h-4 border-none",
                          correspondent.legalType === 'PJ' ? "bg-indigo-500/20 text-indigo-400" : "bg-blue-500/20 text-blue-400"
                      )}>
                          {correspondent.legalType || 'PF'}
                      </Badge>

                      {correspondent.legalType === 'PJ' && correspondent.teamMembers && correspondent.teamMembers.length > 0 && (
                        <Badge variant="outline" className="w-fit text-[8px] font-black uppercase py-0 px-1.5 h-4 bg-amber-500/10 text-amber-500 border-amber-500/20">
                          Equipe: {correspondent.teamMembers.length}
                        </Badge>
                      )}

                      <Badge variant="outline" className={cn(
                          "w-fit text-[8px] font-black uppercase py-0 px-1.5 h-4",
                          correspondent.role === 'lawyer' ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
                          correspondent.role === 'intern' ? "bg-purple-500/10 text-purple-400 border-purple-500/20" :
                          "bg-slate-500/10 text-slate-400 border-slate-500/20"
                      )}>
                          {roleLabels[correspondent.role] || correspondent.role}
                      </Badge>
                    </div>

                    <div className="space-y-0.5">
                      {correspondent.legalType === 'PJ' && correspondent.companyName && (
                        <p className="text-[10px] font-black text-primary uppercase tracking-tighter leading-none italic">{correspondent.companyName}</p>
                      )}
                      <h3 className="font-bold text-xl leading-tight text-white group-hover:text-primary transition-colors">
                        {correspondent.firstName} {correspondent.lastName}
                      </h3>
                    </div>

                    <div className="flex items-center gap-1.5 text-slate-400 mt-1">
                        <MapPin className="h-3 w-3" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">{correspondent.address?.city || 'Local não informado'} / {correspondent.address?.state || '--'}</span>
                    </div>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-white/40 hover:text-white"><MoreVertical className="h-4 w-4" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 bg-card border-border shadow-2xl p-1">
                    <DropdownMenuLabel className="text-[10px] font-black uppercase text-muted-foreground px-2 py-1.5 tracking-widest">Ações</DropdownMenuLabel>
                    <DropdownMenuItem onClick={onView} className="gap-2 cursor-pointer focus:bg-primary/10">
                      <UserCircle className="h-4 w-4 text-primary" /> <span className="font-bold text-white">Ver Perfil Completo</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={onView} className="gap-2 cursor-pointer focus:bg-emerald-500/10">
                      <DollarSign className="h-4 w-4 text-emerald-400" /> <span className="font-bold text-white">Extrato de Pagamentos</span>
                    </DropdownMenuItem>
                    {correspondent.legalType === 'PJ' && (
                      <DropdownMenuItem onClick={onEdit} className="gap-2 cursor-pointer focus:bg-indigo-500/10">
                        <Users className="h-4 w-4 text-indigo-400" /> <span className="font-bold text-white">Configurar Equipe / Preços</span>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator className="bg-white/5" />
                    <DropdownMenuItem onClick={onEdit} className="gap-2 cursor-pointer">
                      <FileText className="h-4 w-4 text-slate-400" /> <span className="font-bold text-white">Editar Dados</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-white/5" />
                    <DropdownMenuItem onClick={onDelete} className="text-rose-500 gap-2 cursor-pointer focus:bg-rose-500/10">
                      <X className="h-4 w-4" /> <span className="font-bold">Excluir</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </CardHeader>

        <CardContent className="flex-grow space-y-4 pt-0">
            <div className="grid grid-cols-3 gap-2 p-1.5 bg-black/20 rounded-xl border border-white/5">
                <Button variant="ghost" size="icon" className="h-9 w-full rounded-lg hover:bg-white/5 text-blue-400" asChild disabled={!correspondent.email}>
                    <a href={`mailto:${correspondent.email}`} title={correspondent.email}><Mail className="h-4 w-4" /></a>
                </Button>
                <Button variant="ghost" size="icon" className="h-9 w-full rounded-lg hover:bg-white/5 text-emerald-400" asChild disabled={!correspondent.whatsapp}>
                    <a href={`https://wa.me/${correspondent.whatsapp?.replace(/\D/g, '')}`} target="_blank"><MessageSquare className="h-4 w-4" /></a>
                </Button>
                <Button variant="ghost" size="icon" className="h-9 w-full rounded-lg hover:bg-white/5 text-slate-400" asChild disabled={!correspondent.phone}>
                    <a href={`tel:${correspondent.phone}`}><Phone className="h-4 w-4" /></a>
                </Button>
            </div>

            <CorrespondentStats staffId={correspondent.id} />
        </CardContent>

        <div className="px-4 pb-4">
          <Button variant="outline" className="w-full h-9 bg-white/5 border-white/10 hover:bg-white/10 text-white font-bold text-xs gap-2" onClick={onView}>
             <History className="h-3.5 w-3.5 text-slate-400" /> Histórico de Diligências
          </Button>
        </div>
    </Card>
  );
}
