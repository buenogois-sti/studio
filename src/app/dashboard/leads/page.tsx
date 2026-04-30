'use client';

import * as React from 'react';
import { 
  collection, 
  query, 
  where, 
  limit, 
  doc, 
  deleteDoc 
} from 'firebase/firestore';
import { useFirebase, useMemoFirebase, useCollection, useDoc } from '@/firebase';
import { useToast } from '@/components/ui/use-toast';
import { TooltipProvider } from '@/components/ui/tooltip';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetDescription 
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';

// Components
import { LeadHeader } from '@/components/leads/LeadHeader';
import { LeadAnalytics } from '@/components/leads/LeadAnalytics';
import { LeadKanban } from '@/components/leads/LeadKanban';
import { LeadDetailsSheet } from '@/components/leads/LeadDetailsSheet';
import { NewLeadSheet } from '@/components/leads/NewLeadSheet';
import { LeadChecklistDialog } from '@/components/leads/dialogs/LeadChecklistDialog';
import { LeadConversionDialog, conversionSchema } from '@/components/leads/dialogs/LeadConversionDialog';
import { ClientForm } from '@/components/client/ClientForm';

// Libs & Types
import { convertLeadToProcess } from '@/lib/lead-actions';
import { searchProcesses } from '@/lib/process-actions';
import type { Lead, Client, Staff, UserProfile, LeadStatus } from '@/lib/types';
import type * as z from 'zod';

export default function LeadsPage() {
  const { firestore, user } = useFirebase();
  const { toast } = useToast();
  
  // States
  const [searchTerm, setSearchTerm] = React.useState('');
  const [priorityFilter, setPriorityFilter] = React.useState('all');
  const [sourceFilter, setSourceFilter] = React.useState('all');
  const [showAnalytics, setShowAnalytics] = React.useState(false);
  const [expandedStage, setExpandedStage] = React.useState<LeadStatus | null>(null);
  
  const [isNewLeadOpen, setIsNewLeadOpen] = React.useState(false);
  const [selectedLeadId, setSelectedLeadId] = React.useState<string | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = React.useState(false);
  const [initialDetailTab, setInitialDetailTab] = React.useState<'ficha' | 'timeline'>('ficha');
  const [isConversionOpen, setIsConversionOpen] = React.useState(false);
  const [isChecklistDialogOpen, setIsChecklistDialogOpen] = React.useState(false);
  const [isClientSheetOpen, setIsClientSheetOpen] = React.useState(false);
  const [editingClient, setEditingClient] = React.useState<Client | null>(null);
  
  const [isSearchingHybrid, setIsSearchingHybrid] = React.useState(false);
  const [hybridResults, setHybridResults] = React.useState<Array<{ type: 'lead' | 'process', data: any }>>([]);

  // Data Fetching
  const userProfileRef = useMemoFirebase(
    () => (firestore && user?.uid ? doc(firestore, 'users', user.uid) : null),
    [firestore, user?.uid]
  );
  const { data: userProfile } = useDoc<UserProfile>(userProfileRef);

  const leadsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'leads'), where('status', '!=', 'CONVERTIDO')) : null),
    [firestore]
  );
  const { data: leadsData } = useCollection<Lead>(leadsQuery);

  const clientsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'clients'), limit(500)) : null),
    [firestore]
  );
  const { data: clientsData } = useCollection<Client>(clientsQuery);
  const clientsMap = React.useMemo(() => new Map(clientsData?.map(c => [c.id, c])), [clientsData]);

  const staffQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'staff') : null),
    [firestore]
  );
  const { data: staffData } = useCollection<Staff>(staffQuery);
  const staffMap = React.useMemo(() => new Map(staffData?.map(s => [s.id, s])), [staffData]);
  
  const lawyers = React.useMemo(() => staffData?.filter(s => s.role === 'lawyer' || s.role === 'partner') || [], [staffData]);
  const interviewers = React.useMemo(() => staffData?.filter(s => s.role === 'lawyer' || s.role === 'partner' || s.role === 'intern') || [], [staffData]);
  const commissionableStaff = React.useMemo(() => staffData?.filter(s => ['intern', 'employee', 'lawyer'].includes(s.role)) || [], [staffData]);

  // Hybrid Search Logic
  React.useEffect(() => {
    if (!searchTerm.trim() || searchTerm.length < 2) {
      setHybridResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingHybrid(true);
      try {
        const processResults = await searchProcesses(searchTerm);
        const results: Array<{ type: 'lead' | 'process', data: any }> = processResults.map(p => ({ type: 'process' as const, data: p }));
        
        if (leadsData) {
          const q = searchTerm.toLowerCase();
          const filteredLeads = leadsData.filter(l => 
            l.title.toLowerCase().includes(q) || 
            (l.clientName || '').toLowerCase().includes(q) ||
            (l.clientDocument || '').includes(q)
          );
          results.push(...filteredLeads.map(l => ({ type: 'lead' as const, data: l })));
        }
        
        setHybridResults(results.slice(0, 10));
      } catch (err) {
        console.error(err);
      } finally {
        setIsSearchingHybrid(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm, leadsData]);

  // Filters
  const filteredLeads = React.useMemo(() => {
    if (!leadsData || !userProfile) return [];
    let list = [...leadsData].sort((a, b) => b.updatedAt.seconds - a.updatedAt.seconds);
    
    // Visibility rules
    const currentStaff = staffData?.find(s => s.email.toLowerCase() === userProfile.email.toLowerCase());
    
    if (userProfile.role !== 'admin') {
      list = list.filter(l => {
        // Everyone sees NEW leads
        if (l.status === 'NOVO') return true;
        // See if I am the lawyer or interviewer
        if (currentStaff && (l.lawyerId === currentStaff.id || l.interviewerId === currentStaff.id)) return true;
        return false;
      });
    }

    // Search filter
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter(l => 
        l.title.toLowerCase().includes(q) || 
        (l.clientName || '').toLowerCase().includes(q) ||
        (l.clientDocument || '').includes(q)
      );
    }

    // Dropdown filters
    if (priorityFilter !== 'all') list = list.filter(l => l.priority === priorityFilter);
    if (sourceFilter !== 'all') list = list.filter(l => l.captureSource === sourceFilter);

    return list;
  }, [leadsData, searchTerm, sourceFilter, priorityFilter, userProfile]);

  // Analytics
  const analyticsData = React.useMemo(() => {
    if (!leadsData) return null;

    const totalLeads = leadsData.length;
    const convertedLeads = leadsData.filter(l => l.status === 'CONVERTIDO').length;
    const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;

    const sourceStats = leadsData.reduce((acc: any, lead) => {
      const source = lead.captureSource || 'Outros';
      if (!acc[source]) acc[source] = { name: source, total: 0, converted: 0 };
      acc[source].total++;
      if (lead.status === 'CONVERTIDO') acc[source].converted++;
      return acc;
    }, {});

    const sourceEfficiencyData = Object.values(sourceStats).map((s: any) => ({
      ...s,
      efficiency: (s.converted / s.total) * 100
    })).sort((a, b) => b.efficiency - a.efficiency);

    const lawyerStats = leadsData.reduce((acc: any, lead) => {
      const lawyer = staffMap.get(lead.lawyerId)?.firstName || 'Pendente';
      if (!acc[lawyer]) acc[lawyer] = { name: lawyer, count: 0 };
      acc[lawyer].count++;
      return acc;
    }, {});
    const lawyerDistributionData = Object.values(lawyerStats).sort((a: any, b: any) => b.count - a.count);

    const interviewerStats = leadsData.reduce((acc: any, lead) => {
      const interviewerId = lead.interviewerId || lead.lawyerId; 
      const interviewer = interviewerId === 'Outros' ? 'Outros' : (staffMap.get(interviewerId)?.firstName || 'N/A');
      if (!acc[interviewer]) acc[interviewer] = { name: interviewer, total: 0, converted: 0 };
      acc[interviewer].total++;
      if (lead.status === 'CONVERTIDO') acc[interviewer].converted++;
      return acc;
    }, {});
    const interviewerPerformanceData = Object.values(interviewerStats).map((s: any) => ({
      ...s,
      rate: s.total > 0 ? (s.converted / s.total) * 100 : 0
    })).sort((a, b) => b.rate - a.rate);

    return {
      totalLeads,
      convertedLeads,
      conversionRate,
      sourceEfficiencyData,
      lawyerDistributionData,
      interviewerPerformanceData
    };
  }, [leadsData, staffMap]);

  // Handlers
  const openLeadDetails = (leadId: string, tab: 'ficha' | 'timeline' = 'ficha') => {
    setSelectedLeadId(leadId);
    setInitialDetailTab(tab);
    setIsDetailsOpen(true);
  };

  const handleConfirmProtocol = async (data: z.infer<typeof conversionSchema>) => {
    if (!selectedLeadId) return;
    try {
      const result = await convertLeadToProcess(selectedLeadId, data);
      if (result.success) {
        toast({ title: 'Processo Protocolado!', description: 'Migrado para processos ativos.' });
        setIsConversionOpen(false);
        setIsDetailsOpen(false);
      }
    } catch (e: any) { 
      toast({ variant: 'destructive', title: 'Erro', description: e.message }); 
    }
  };

  const activeLead = React.useMemo(() => {
    if (!selectedLeadId || !leadsData) return null;
    return leadsData.find(l => l.id === selectedLeadId) || null;
  }, [selectedLeadId, leadsData]);

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-8 pb-10 w-full max-w-[1700px]">
        <LeadHeader 
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          priorityFilter={priorityFilter}
          onPriorityFilterChange={setPriorityFilter}
          sourceFilter={sourceFilter}
          onSourceFilterChange={setSourceFilter}
          showAnalytics={showAnalytics}
          onToggleAnalytics={() => setShowAnalytics(!showAnalytics)}
          onNewLead={() => setIsNewLeadOpen(true)}
          isSearching={isSearchingHybrid}
        />

        {showAnalytics && <LeadAnalytics analyticsData={analyticsData} />}

        <LeadKanban 
          leads={filteredLeads}
          clientsMap={clientsMap}
          expandedStage={expandedStage}
          onToggleExpand={setExpandedStage}
        />

        {/* Modal/Sheets */}
        <NewLeadSheet 
          open={isNewLeadOpen} 
          onOpenChange={setIsNewLeadOpen} 
          lawyers={lawyers} 
          interviewers={interviewers} 
          onSuccess={(id) => openLeadDetails(id, 'ficha')} 
        />
        
        <LeadChecklistDialog 
          lead={activeLead} 
          open={isChecklistDialogOpen} 
          onOpenChange={setIsChecklistDialogOpen} 
          onSuccess={() => {}} 
        />

        <LeadConversionDialog 
          lead={activeLead} 
          open={isConversionOpen} 
          onOpenChange={setIsConversionOpen} 
          onConfirm={handleConfirmProtocol} 
          lawyers={lawyers} 
          commissionableStaff={commissionableStaff} 
        />

        <Sheet open={isClientSheetOpen} onOpenChange={setIsClientSheetOpen}>
          <SheetContent className="sm:max-w-5xl w-full flex flex-col p-0 bg-[#020617] border-border overflow-hidden shadow-2xl">
            <SheetHeader className="p-6 border-b border-white/5 bg-white/5 shrink-0 text-left">
              <SheetTitle className="text-white text-2xl font-black font-headline tracking-tight uppercase">
                Completar Cadastro: {editingClient?.firstName}
              </SheetTitle>
              <SheetDescription className="text-slate-400">
                RG, CPF e Endereço são essenciais para a validade jurídica dos documentos.
              </SheetDescription>
            </SheetHeader>
            <ScrollArea className="flex-1">
              <div className="p-6">
                <ClientForm onSave={() => setIsClientSheetOpen(false)} client={editingClient} />
              </div>
            </ScrollArea>
          </SheetContent>
        </Sheet>
      </div>
    </TooltipProvider>
  );
}
