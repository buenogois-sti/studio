'use client';
import * as React from 'react';
import { 
  Users, 
  Search, 
  Plus, 
  Filter, 
  Download, 
  MoreVertical, 
  Mail, 
  Phone, 
  Calendar,
  Briefcase,
  BadgeCheck,
  Loader2,
  FileText,
  Trash2,
  Edit,
  UserPlus
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useFirebase, useCollection } from '@/firebase';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import type { Staff } from '@/lib/types';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { StaffForm } from '@/components/staff/StaffForm';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function EmployeesPage() {
  const { firestore } = useFirebase();
  const [searchTerm, setSearchTerm] = React.useState('');
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [selectedStaff, setSelectedStaff] = React.useState<Staff | null>(null);
  
  const staffQuery = React.useMemo(() => firestore ? query(collection(firestore, 'staff'), orderBy('lastName', 'asc'), limit(100)) : null, [firestore]);
  const { data: staffData, isLoading } = useCollection<Staff>(staffQuery);

  const filtered = React.useMemo(() => {
    if (!searchTerm.trim()) return staffData || [];
    const q = searchTerm.toLowerCase();
    return (staffData || []).filter(s => 
      `${s.firstName} ${s.lastName}`.toLowerCase().includes(q) || 
      s.email.toLowerCase().includes(q) ||
      s.role.toLowerCase().includes(q)
    );
  }, [staffData, searchTerm]);

  const handleEdit = (staff: Staff) => {
    setSelectedStaff(staff);
    setIsFormOpen(true);
  };

  const handleAddNew = () => {
    setSelectedStaff(null);
    setIsFormOpen(true);
  };

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight font-headline text-white uppercase italic">Gestão de Colaboradores</h1>
          <p className="text-sm text-slate-400 font-bold uppercase tracking-widest">Controle de Admissões, Fichas e Histórico Profissional</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="bg-white/5 border-white/10 text-white font-black uppercase text-[10px] tracking-widest h-11">
            <Download className="mr-2 h-4 w-4" /> Exportar Dados
          </Button>
          <Sheet open={isFormOpen} onOpenChange={setIsFormOpen}>
            <SheetTrigger asChild>
              <Button onClick={handleAddNew} className="bg-primary text-primary-foreground font-black uppercase text-[10px] tracking-widest h-11 px-6 shadow-xl shadow-primary/20 hover:scale-105 transition-all">
                <UserPlus className="mr-2 h-4 w-4" /> Admissão Imediata
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full sm:max-w-3xl bg-background border-l border-white/5 overflow-y-auto">
              <SheetHeader className="mb-8">
                <SheetTitle className="text-2xl font-black uppercase italic text-white flex items-center gap-3">
                    <Users className="h-6 w-6 text-primary" /> {selectedStaff ? 'Ficha do Colaborador' : 'Nova Contratação'}
                </SheetTitle>
              </SheetHeader>
              <StaffForm staff={selectedStaff} onSave={() => setIsFormOpen(false)} />
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <div className="flex items-center gap-4 bg-[#0f172a] p-2 rounded-2xl border border-white/5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <Input 
            placeholder="Filtrar por nome, cargo ou e-mail corporativo..." 
            className="pl-10 bg-transparent border-none text-white font-bold h-10 placeholder:text-slate-600 focus-visible:ring-0" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button variant="ghost" className="text-slate-500 font-black uppercase text-[10px]"><Filter className="mr-2 h-3 w-3" /> Filtros Avançados</Button>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-32 space-y-4"><Loader2 className="h-12 w-12 animate-spin text-primary" /><p className="text-xs font-black uppercase text-slate-500">Acessando Arquivos de Pessoal...</p></div>
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((s) => (
            <Card key={s.id} className="bg-[#0f172a] border-white/5 overflow-hidden group hover:border-primary/20 transition-all flex flex-col relative">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-6">
                    <div className="h-14 w-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-xl font-black text-primary uppercase shadow-inner">{s.firstName[0]}{s.lastName[0]}</div>
                    <div className="flex flex-col items-end gap-2">
                        <Badge variant="outline" className="text-[8px] font-black uppercase border-white/10 text-slate-400 bg-white/5 px-2 h-5">{s.role}</Badge>
                        {s.admissionDate && <div className="text-[9px] font-bold text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full bg-emerald-500/5">Ativo desde {format(typeof s.admissionDate === 'string' ? new Date(s.admissionDate) : (s.admissionDate as any).toDate(), 'MMM/yyyy', { locale: ptBR })}</div>}
                    </div>
                </div>

                <div className="space-y-1 mb-6">
                   <h3 className="text-lg font-black text-white group-hover:text-primary transition-all uppercase italic truncate">{s.firstName} {s.lastName}</h3>
                   <div className="flex items-center gap-2 text-slate-500">
                      <Mail className="h-3 w-3" />
                      <span className="text-[10px] font-bold truncate">{s.email}</span>
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-6 border-t border-white/5">
                   <div className="space-y-1">
                      <p className="text-[9px] font-black uppercase text-slate-600">Documento CPF</p>
                      <p className="text-xs font-bold text-white font-mono">{s.documentCPF || '---.---.--- --'}</p>
                   </div>
                   <div className="space-y-1">
                      <p className="text-[9px] font-black uppercase text-slate-600">Salário Base</p>
                      <p className="text-xs font-bold text-white italic">{(s.remuneration?.salary || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                   </div>
                </div>

                <div className="mt-8 flex items-center gap-2">
                   <Button onClick={() => handleEdit(s)} className="flex-1 bg-white/5 border border-white/10 text-white font-black uppercase text-[9px] h-9 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all">
                      <Edit className="mr-2 h-3.5 w-3.5" /> Ficha Completa
                   </Button>
                   <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-600 hover:text-white hover:bg-white/5"><Phone className="h-4 w-4" /></Button>
                   <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-600 hover:text-rose-500 hover:bg-rose-500/5"><Trash2 className="h-4 w-4" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center rounded-3xl border-2 border-dashed border-white/5 bg-black/20 py-32 text-center flex-col gap-4">
            <Users className="h-12 w-12 text-slate-500/30" />
            <div className="space-y-1">
                <p className="text-white font-black uppercase italic tracking-widest">Quadro de pessoal vazio</p>
                <p className="text-xs font-bold text-slate-500">O seu contingente operacional ainda não foi registrado.</p>
            </div>
            <Button onClick={handleAddNew} className="mt-4 bg-primary text-primary-foreground font-black uppercase text-[10px] tracking-widest h-10 px-8Shadow-xl shadow-primary/20">
                <Plus className="mr-2 h-4 w-4" /> Admitir Primeiro Colaborador
            </Button>
        </div>
      )}
    </div>
  );
}
