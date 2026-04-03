'use client';
import * as React from 'react';
import { 
  HeartHandshake, 
  Search, 
  MapPin, 
  Gavel, 
  Star, 
  MoreVertical, 
  Plus, 
  Mail, 
  Phone, 
  MessageSquare,
  Globe,
  DollarSign,
  AlertCircle,
  FileSearch,
  CheckCircle2,
  Trash2,
  Edit,
  UserCheck,
  ChevronRight,
  Loader2,
  Filter,
  X
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useFirebase, useCollection } from '@/firebase';
import { collection, query, limit, orderBy, getDocs, where, Timestamp, addDoc, updateDoc, doc } from 'firebase/firestore';
import { startOfMonth } from 'date-fns';
import type { Correspondent } from '@/lib/types';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

export default function CorrespondentsPage() {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('TODOS');
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [atosMes, setAtosMes] = React.useState<number>(0);
  const [formData, setFormData] = React.useState<Partial<Correspondent>>({
    name: '', document: '', email: '', phone: '', whatsapp: '',
    legalArea: [], locations: [], status: 'PENDENTE_HOMOLOGACAO', type: 'ESCRITORIO', oab: '', services: []
  });
  const [locationInput, setLocationInput] = React.useState('');
  const [areaInput, setAreaInput] = React.useState('');

  const handleAddLocation = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      if (!locationInput.trim()) return;
      const newItems = locationInput.split(',').map(s => s.trim()).filter(Boolean);
      setFormData(prev => ({ ...prev, locations: [...(prev.locations || []), ...newItems] }));
      setLocationInput('');
    }
  };
  
  const handleRemoveLocation = (idx: number) => {
    const locs = [...(formData.locations || [])];
    locs.splice(idx, 1);
    setFormData(prev => ({ ...prev, locations: locs }));
  };

  const handleAddArea = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      if (!areaInput.trim()) return;
      const newItems = areaInput.split(',').map(s => s.trim()).filter(Boolean);
      setFormData(prev => ({ ...prev, legalArea: [...(prev.legalArea || []), ...newItems] }));
      setAreaInput('');
    }
  };

  const handleRemoveArea = (idx: number) => {
    const areas = [...(formData.legalArea || [])];
    areas.splice(idx, 1);
    setFormData(prev => ({ ...prev, legalArea: areas }));
  };

  const addService = () => {
    setFormData(prev => ({
      ...prev,
      services: [...(prev.services || []), { id: Date.now().toString(), name: '', price: 0, hasAdditionals: false }]
    }));
  };

  const updateService = (id: string, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      services: (prev.services || []).map(s => s.id === id ? { ...s, [field]: value } : s)
    }));
  };

  const removeService = (id: string) => {
    setFormData(prev => ({
      ...prev,
      services: (prev.services || []).filter(s => s.id !== id)
    }));
  };

  React.useEffect(() => {
    if (!firestore) return;
    const fetchAtos = async () => {
      try {
        const startOfMonthDate = startOfMonth(new Date());
        const snap = await getDocs(query(
          collection(firestore, 'hearings'),
          where('type', '==', 'DILIGENCIA'),
          where('status', '==', 'REALIZADA'),
          where('date', '>=', Timestamp.fromDate(startOfMonthDate))
        ));
        setAtosMes(snap.size);
      } catch (e) {
        console.error("Erro ao buscar atos:", e);
      }
    };
    fetchAtos();
  }, [firestore]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore) return;
    setIsSubmitting(true);
    try {
      if (formData.id) {
        await updateDoc(doc(firestore, 'correspondents', formData.id), {
          ...formData,
          updatedAt: Timestamp.now()
        });
        toast({ title: 'Parceiro atualizado com sucesso!' });
      } else {
        await addDoc(collection(firestore, 'correspondents'), {
          ...formData,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        });
        toast({ title: 'Parceiro homologado com sucesso!' });
      }
      setIsFormOpen(false);
      setFormData({ name: '', document: '', email: '', phone: '', whatsapp: '', legalArea: [], locations: [], status: 'PENDENTE_HOMOLOGACAO' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro ao salvar', description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };
  const correspondentsQuery = React.useMemo(() => firestore ? query(collection(firestore, 'correspondents'), orderBy('createdAt', 'desc'), limit(100)) : null, [firestore]);
  const { data: correspondentsData, isLoading } = useCollection<Correspondent>(correspondentsQuery);

  const filtered = React.useMemo(() => {
    let result = correspondentsData || [];
    
    if (statusFilter !== 'TODOS') {
      result = result.filter(c => c.status === statusFilter);
    }
    
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter(c => {
        const nameMatch = c.name?.toLowerCase().includes(q) || false;
        const docMatch = c.document?.toLowerCase().includes(q) || false;
        const emailMatch = c.email?.toLowerCase().includes(q) || false;
        const locationMatch = c.locations ? c.locations.some(l => l.toLowerCase().includes(q)) : false;
        const areaMatch = c.legalArea ? c.legalArea.some(a => a.toLowerCase().includes(q)) : false;
        return nameMatch || docMatch || emailMatch || locationMatch || areaMatch;
      });
    }
    
    return result;
  }, [correspondentsData, searchTerm, statusFilter]);

  const stats = React.useMemo(() => {
    let cities = new Set<string>();
    let totalRating = 0;
    let ratingCount = 0;
    
    (correspondentsData || []).forEach(c => {
      if (c.rating) { totalRating += c.rating; ratingCount++; }
      c.locations?.forEach(loc => cities.add(loc.toLowerCase().trim()));
    });
    
    return {
      active: (correspondentsData || []).filter(c => c.status === 'ATIVO').length,
      cities: cities.size,
      avgRating: ratingCount > 0 ? (totalRating / ratingCount).toFixed(1) : 'N/A',
    };
  }, [correspondentsData]);

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight font-headline text-white uppercase italic">Correspondentes de Elite</h1>
          <p className="text-sm text-slate-400 font-bold uppercase tracking-widest">Parceiros Estratégicos e Prestadores de Serviço</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <Input 
              placeholder="Pesquisar por nome, cidade ou área..." 
              className="pl-10 bg-[#0f172a] border-white/5 text-white font-bold h-11 rounded-xl" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px] h-11 bg-[#0f172a] border-white/5 text-white font-bold rounded-xl">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-slate-500" />
                <SelectValue placeholder="Status" />
              </div>
            </SelectTrigger>
            <SelectContent className="bg-[#0f172a] border-white/10 text-white">
              <SelectItem value="TODOS">Todos os Status</SelectItem>
              <SelectItem value="ATIVO">Ativos</SelectItem>
              <SelectItem value="PENDENTE_HOMOLOGACAO">Em Homologação</SelectItem>
              <SelectItem value="BLOQUEADO">Bloqueados</SelectItem>
              <SelectItem value="INATIVO">Inativos</SelectItem>
            </SelectContent>
          </Select>

          <Button onClick={() => { setFormData({ name: '', document: '', email: '', phone: '', whatsapp: '', legalArea: [], locations: [], status: 'PENDENTE_HOMOLOGACAO', type: 'ESCRITORIO', oab: '', services: [] }); setIsFormOpen(true); }} className="bg-primary text-primary-foreground font-black uppercase text-[10px] tracking-widest h-11 px-6 shadow-xl shadow-primary/20 hover:scale-105 transition-transform">
            <Plus className="mr-2 h-4 w-4" /> Novo Parceiro
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
         <Card className="bg-[#0f172a] border-white/5 p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20"><UserCheck className="h-5 w-5" /></div>
            <div>
               <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Ativos</p>
               <p className="text-xl font-black text-white">{stats.active}</p>
            </div>
         </Card>
         <Card className="bg-[#0f172a] border-white/5 p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 border border-blue-500/20"><MapPin className="h-5 w-5" /></div>
            <div>
               <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Cobertura</p>
               <p className="text-xl font-black text-white">{stats.cities} {stats.cities === 1 ? 'Cidade' : 'Cidades'}</p>
            </div>
         </Card>
         <Card className="bg-[#0f172a] border-white/5 p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 border border-amber-500/20"><Star className="h-5 w-5" /></div>
            <div>
               <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Rating Médio</p>
               <p className="text-xl font-black text-white">{stats.avgRating}</p>
            </div>
         </Card>
         <Card className="bg-[#0f172a] border-white/5 p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-500 border border-purple-500/20"><Gavel className="h-5 w-5" /></div>
            <div>
               <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Atos Este Mês</p>
               <p className="text-xl font-black text-white">{atosMes}</p>
            </div>
         </Card>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-32 space-y-4"><Loader2 className="h-12 w-12 animate-spin text-primary" /><p className="text-xs font-black uppercase text-slate-500">Mapeando Rede de Parceiros...</p></div>
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((c) => (
            <Card key={c.id} className="bg-[#0f172a] border-white/5 overflow-hidden group hover:border-primary/20 transition-all flex flex-col">
              <CardHeader className="pb-4 border-b border-white/5 bg-white/5">
                <div className="flex items-start justify-between">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 mb-1">
                            <Badge className={cn("text-[8px] font-black uppercase px-2 h-4", c.status === 'ATIVO' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-slate-500/10 text-slate-400 border-slate-500/20")}>{c.status}</Badge>
                            <div className="flex items-center gap-0.5"><Star className="h-3 w-3 text-amber-400 fill-amber-400" /><span className="text-[10px] font-black text-amber-400">{c.rating || 'N/A'}</span></div>
                        </div>
                        <h3 className="text-lg font-black text-white group-hover:text-primary transition-all uppercase italic">{c.name}</h3>
                        <p className="text-[10px] font-mono text-slate-500 tracking-tighter">{c.document}</p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button size="icon" variant="ghost" className="h-8 w-8 text-white/20 hover:text-white"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-card border-border shadow-2xl p-1">
                          <DropdownMenuItem className="font-bold flex items-center gap-2"><FileSearch className="h-4 w-4 text-primary" /> Ver Portfólio</DropdownMenuItem>
                          <DropdownMenuItem className="font-bold flex items-center gap-2"><DollarSign className="h-4 w-4 text-emerald-400" /> Tabela de Preços</DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-white/5" />
                          <DropdownMenuItem onClick={() => { setFormData(c); setIsFormOpen(true); }} className="font-bold flex items-center gap-2 cursor-pointer"><Edit className="h-4 w-4 text-slate-400" /> Editar</DropdownMenuItem>
                          <DropdownMenuItem className="text-rose-500 font-bold flex items-center gap-2"><Trash2 className="h-4 w-4" /> Encerrar Parceria</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="flex-grow p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <p className="text-[9px] font-black text-slate-500 uppercase flex items-center gap-1"><MapPin className="h-2.5 w-2.5" /> Localidades</p>
                        <div className="flex flex-wrap gap-1">
                            {c.locations.slice(0, 2).map(l => <Badge key={l} variant="outline" className="text-[8px] h-4 bg-white/5 border-white/10 text-slate-300 font-black uppercase">{l}</Badge>)}
                            {c.locations.length > 2 && <Badge variant="outline" className="text-[8px] h-4 bg-white/5 border-white/10 text-slate-500">+{c.locations.length - 2}</Badge>}
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <p className="text-[9px] font-black text-slate-500 uppercase flex items-center gap-1"><Gavel className="h-2.5 w-2.5" /> Especialidades</p>
                        <div className="flex flex-wrap gap-1">
                            {c.legalArea.slice(0, 2).map(a => <Badge key={a} variant="outline" className="text-[8px] h-4 bg-white/5 border-white/10 text-slate-300 font-black uppercase">{a}</Badge>)}
                            {c.legalArea.length > 2 && <Badge variant="outline" className="text-[8px] h-4 bg-white/5 border-white/10 text-slate-500">+{c.legalArea.length - 2}</Badge>}
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-between gap-2 p-2 bg-black/40 rounded-xl border border-white/5">
                    <Button variant="ghost" size="icon" className="h-9 w-9 bg-primary/5 text-primary hover:bg-primary/10 rounded-lg" asChild disabled={!c.email}><a href={`mailto:${c.email}`} title={c.email}><Mail className="h-4 w-4" /></a></Button>
                    <Button variant="ghost" size="icon" className="h-9 w-9 bg-emerald-500/5 text-emerald-400 hover:bg-emerald-500/10 rounded-lg" asChild disabled={!c.whatsapp}><a href={`https://wa.me/${c.whatsapp?.replace(/\D/g, '')}`} target="_blank"><MessageSquare className="h-4 w-4" /></a></Button>
                    <Button variant="ghost" size="icon" className="h-9 w-9 bg-slate-500/5 text-slate-400 hover:bg-slate-500/10 rounded-lg" asChild><a href={`tel:${c.phone}`}><Phone className="h-4 w-4" /></a></Button>
                    <Button variant="ghost" className="flex-1 h-9 rounded-lg bg-blue-500/5 text-blue-400 text-[10px] font-black uppercase hover:bg-blue-500/10"><Globe className="mr-2 h-3.5 w-3.5" /> Portfólio</Button>
                </div>
              </CardContent>
              <CardFooter className="p-4 border-t border-white/5 bg-black/20 flex items-center justify-between">
                <div className="flex items-center gap-1.5 opacity-40"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /><span className="text-[9px] font-black uppercase text-slate-400 tracking-tighter">Homologado</span></div>
                <Button variant="ghost" className="h-7 text-[9px] font-black uppercase text-primary gap-1 group-hover:gap-2 transition-all">Contratar Ato <ChevronRight className="h-3 w-3" /></Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center rounded-3xl border-2 border-dashed border-white/5 bg-black/20 py-32 text-center flex-col gap-4">
            <HeartHandshake className="h-12 w-12 text-slate-500/30" />
            <div className="space-y-1">
                <p className="text-white font-black uppercase italic tracking-widest">Nenhum correspondente localizado</p>
                <p className="text-xs font-bold text-slate-500">Comece homologando o primeiro parceiro externo para sua rede.</p>
            </div>
            <Button onClick={() => { setFormData({ name: '', document: '', email: '', phone: '', whatsapp: '', legalArea: [], locations: [], status: 'PENDENTE_HOMOLOGACAO', type: 'ESCRITORIO', oab: '', services: [] }); setIsFormOpen(true); }} className="mt-4 bg-primary text-primary-foreground font-black uppercase text-[10px] tracking-widest h-10 px-8">
                <Plus className="mr-2 h-4 w-4" /> Homologar Parceiro
            </Button>
        </div>
      )}



      <Sheet open={isFormOpen} onOpenChange={setIsFormOpen}>
        <SheetContent className="sm:max-w-3xl w-[95vw] flex flex-col p-0 bg-[#0f172a] border-white/10">
          <SheetHeader className="p-6 border-b border-white/5">
            <SheetTitle className="text-white text-2xl font-black italic uppercase">
              {formData.id ? 'Editar Parceiro' : 'Homologar Parceiro'}
            </SheetTitle>
            <SheetDescription className="text-slate-400">
              Preencha os dados do correspondente para adicioná-lo à sua rede.
            </SheetDescription>
          </SheetHeader>
          <ScrollArea className="flex-1 p-6">
            <form id="correspondentForm" onSubmit={handleSave} className="space-y-5">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5 block">Tipo de Parceiro *</label>
                    <Select value={formData.type || 'ESCRITORIO'} onValueChange={(val: any) => setFormData({...formData, type: val})}>
                      <SelectTrigger className="bg-black/20 border-white/10 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#0f172a] border-white/10 text-white">
                        <SelectItem value="ESCRITORIO">Escritório de Advocacia</SelectItem>
                        <SelectItem value="AUTONOMO">Advogado(a) Autônomo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5 block">Documento (CPF / CNPJ) *</label>
                    <Input required value={formData.document || ''} onChange={e => setFormData({...formData, document: e.target.value})} className="bg-black/20 border-white/10 text-white font-mono" />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5 block">Nome do Parceiro *</label>
                  <Input required value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} className="bg-black/20 border-white/10 text-white" />
                </div>
                {formData.type === 'AUTONOMO' && (
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5 block">Inscrição OAB</label>
                    <Input value={formData.oab || ''} onChange={e => setFormData({...formData, oab: e.target.value})} placeholder="Ex: 123456/SP" className="bg-black/20 border-white/10 text-white" />
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5 block">Email *</label>
                    <Input required type="email" value={formData.email || ''} onChange={e => setFormData({...formData, email: e.target.value})} className="bg-black/20 border-white/10 text-white" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5 block">WhatsApp</label>
                    <Input value={formData.whatsapp || ''} onChange={e => setFormData({...formData, whatsapp: e.target.value})} className="bg-black/20 border-white/10 text-white" />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5 block">Telefone Comercial</label>
                  <Input value={formData.phone || ''} onChange={e => setFormData({...formData, phone: e.target.value})} className="bg-black/20 border-white/10 text-white" />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5 block">Cidades de Cobertura</label>
                  <div className="flex flex-col gap-2">
                    <Input placeholder="Digite uma cidade e aperte Enter ou Vírgula..." value={locationInput} onChange={e => setLocationInput(e.target.value)} onKeyDown={handleAddLocation} className="bg-black/20 border-white/10 text-white" />
                    <div className="flex flex-wrap gap-2">
                       {(formData.locations || []).map((loc, idx) => (
                           <Badge key={idx} variant="secondary" className="bg-white/10 hover:bg-white/20 text-white flex items-center gap-1 font-bold">
                               {loc} <X className="h-3.5 w-3.5 cursor-pointer text-slate-400 hover:text-white ml-0.5" onClick={() => handleRemoveLocation(idx)} />
                           </Badge>
                       ))}
                    </div>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5 block">Áreas de Especialidade</label>
                  <div className="flex flex-col gap-2">
                    <Input placeholder="Digite uma área (Ex: Cível) e aperte Enter ou Vírgula..." value={areaInput} onChange={e => setAreaInput(e.target.value)} onKeyDown={handleAddArea} className="bg-black/20 border-white/10 text-white" />
                    <div className="flex flex-wrap gap-2">
                       {(formData.legalArea || []).map((area, idx) => (
                           <Badge key={idx} variant="secondary" className="bg-white/10 hover:bg-white/20 text-white flex items-center gap-1 font-bold">
                               {area} <X className="h-3.5 w-3.5 cursor-pointer text-slate-400 hover:text-white ml-0.5" onClick={() => handleRemoveArea(idx)} />
                           </Badge>
                       ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest block border-t border-white/5 pt-5 mt-2">Tabela de Serviços Prestados</label>
                  <div className="space-y-2">
                    {(formData.services || []).map(svc => (
                      <div key={svc.id} className="flex flex-col gap-2 bg-black/20 p-2 rounded-lg border border-white/5 group transition-all">
                        <div className="flex items-center gap-2">
                          <Input value={svc.name} onChange={e => updateService(svc.id, 'name', e.target.value)} placeholder="Ex: Audiência de Conciliação" className="bg-transparent border-white/5 text-white flex-1 h-9 text-xs" />
                          <Input type="number" value={svc.price === 0 ? '' : svc.price} onChange={e => updateService(svc.id, 'price', Number(e.target.value))} placeholder="R$ 0,00" className="bg-transparent border-white/5 text-white w-24 h-9 text-xs" />
                          <div className="flex items-center gap-2 px-3">
                              <Checkbox checked={svc.hasAdditionals} onCheckedChange={(checked: boolean) => updateService(svc.id, 'hasAdditionals', checked)} id={`add-${svc.id}`} className="border-white/20 data-[state=checked]:bg-primary" />
                              <label htmlFor={`add-${svc.id}`} className="text-[9px] uppercase tracking-widest text-slate-500 font-bold whitespace-nowrap cursor-pointer hover:text-white transition-colors">Adicionais?</label>
                          </div>
                          <Button type="button" variant="ghost" size="icon" onClick={() => removeService(svc.id)} className="h-8 w-8 text-rose-500 hover:text-rose-400 hover:bg-rose-500/10 opacity-50 group-hover:opacity-100 transition-opacity"><Trash2 className="h-4 w-4" /></Button>
                        </div>
                        {svc.hasAdditionals && (
                          <Input value={svc.additionalDetails || ''} onChange={e => updateService(svc.id, 'additionalDetails', e.target.value)} placeholder="Especifique os adicionais (Ex: + R$ 1,50 por Km de deslocamento)" className="bg-white/5 border-white/10 text-slate-300 h-8 text-xs italic" />
                        )}
                      </div>
                    ))}
                  </div>
                  <Button type="button" variant="outline" onClick={addService} className="w-full h-10 border-dashed border-white/10 bg-transparent text-slate-400 hover:text-white hover:bg-white/5 uppercase font-black text-[10px] tracking-widest transition-colors"><Plus className="mr-2 h-4 w-4" /> Adicionar Novo Serviço</Button>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5 block">Status</label>
                  <Select value={formData.status || 'PENDENTE_HOMOLOGACAO'} onValueChange={(val: any) => setFormData({...formData, status: val})}>
                    <SelectTrigger className="bg-black/20 border-white/10 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#0f172a] border-white/10 text-white">
                      <SelectItem value="ATIVO">Ativo</SelectItem>
                      <SelectItem value="PENDENTE_HOMOLOGACAO">Pendente de Homologação</SelectItem>
                      <SelectItem value="BLOQUEADO">Bloqueado</SelectItem>
                      <SelectItem value="INATIVO">Inativo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </form>
          </ScrollArea>
          <div className="p-6 border-t border-white/5 bg-black/20 flex gap-4">
             <Button type="button" variant="ghost" onClick={() => setIsFormOpen(false)} className="flex-1 border border-white/10 hover:bg-white/5">Cancelar</Button>
             <Button type="submit" form="correspondentForm" disabled={isSubmitting} className="flex-1 bg-primary text-primary-foreground font-bold hover:scale-[1.02] transition-transform">
               {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
               Salvar Parceiro
             </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
