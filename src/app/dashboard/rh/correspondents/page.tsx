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
  Loader2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useFirebase, useCollection } from '@/firebase';
import { collection, query, limit, orderBy } from 'firebase/firestore';
import type { Correspondent } from '@/lib/types';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

export default function CorrespondentsPage() {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = React.useState('');
  
  const correspondentsQuery = React.useMemo(() => firestore ? query(collection(firestore, 'correspondents'), orderBy('createdAt', 'desc'), limit(100)) : null, [firestore]);
  const { data: correspondentsData, isLoading } = useCollection<Correspondent>(correspondentsQuery);

  const filtered = React.useMemo(() => {
    if (!searchTerm.trim()) return correspondentsData || [];
    const q = searchTerm.toLowerCase();
    return (correspondentsData || []).filter(c => 
      c.name.toLowerCase().includes(q) || 
      c.locations.some(l => l.toLowerCase().includes(q)) ||
      c.legalArea.some(a => a.toLowerCase().includes(q))
    );
  }, [correspondentsData, searchTerm]);

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight font-headline text-white uppercase italic">Correspondentes de Elite</h1>
          <p className="text-sm text-slate-400 font-bold uppercase tracking-widest">Parceiros Estratégicos e Prestadores de Serviço</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <Input 
              placeholder="Pesquisar por nome, cidade ou área..." 
              className="pl-10 bg-[#0f172a] border-white/5 text-white font-bold h-11 rounded-xl" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button className="bg-primary text-primary-foreground font-black uppercase text-[10px] tracking-widest h-11 px-6 shadow-xl shadow-primary/20">
            <Plus className="mr-2 h-4 w-4" /> Novo Parceiro
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
         <Card className="bg-[#0f172a] border-white/5 p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20"><UserCheck className="h-5 w-5" /></div>
            <div>
               <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Ativos</p>
               <p className="text-xl font-black text-white">{correspondentsData?.filter(c => c.status === 'ATIVO').length || 0}</p>
            </div>
         </Card>
         <Card className="bg-[#0f172a] border-white/5 p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 border border-blue-500/20"><MapPin className="h-5 w-5" /></div>
            <div>
               <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Cobertura</p>
               <p className="text-xl font-black text-white">12 Cidades</p>
            </div>
         </Card>
         <Card className="bg-[#0f172a] border-white/5 p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 border border-amber-500/20"><Star className="h-5 w-5" /></div>
            <div>
               <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Rating Médio</p>
               <p className="text-xl font-black text-white">4.8</p>
            </div>
         </Card>
         <Card className="bg-[#0f172a] border-white/5 p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-500 border border-purple-500/20"><Gavel className="h-5 w-5" /></div>
            <div>
               <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Atos Este Mês</p>
               <p className="text-xl font-black text-white">42</p>
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
                          <DropdownMenuItem className="font-bold flex items-center gap-2"><Edit className="h-4 w-4 text-slate-400" /> Editar</DropdownMenuItem>
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
            <Button className="mt-4 bg-primary text-primary-foreground font-black uppercase text-[10px] tracking-widest h-10 px-8">
                <Plus className="mr-2 h-4 w-4" /> Homologar Parceiro
            </Button>
        </div>
      )}

      <div className="p-6 rounded-3xl bg-blue-500/5 border border-blue-500/20 flex flex-col md:flex-row items-center gap-6">
          <div className="h-16 w-16 rounded-2xl bg-blue-500/20 flex items-center justify-center text-blue-400 border border-blue-500/20"><AlertCircle className="h-8 w-8" /></div>
          <div className="flex-1 space-y-1">
              <h4 className="text-white font-black uppercase tracking-tight italic">Manual de Gestão de Correspondentes</h4>
              <p className="text-xs text-slate-400 font-bold uppercase leading-relaxed">Todos os correspondentes homologados passam por auditoria de compliance. Certifique-se de anexar as certidões negativas e dados bancários para liberação de pagamentos por ato.</p>
          </div>
          <Button variant="outline" className="h-12 px-8 border-blue-500/30 text-blue-400 font-black uppercase text-[10px] tracking-widest hover:bg-blue-500/10">Ver Normativa Interna</Button>
      </div>
    </div>
  );
}
