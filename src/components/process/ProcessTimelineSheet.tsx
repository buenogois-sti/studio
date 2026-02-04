'use client';

import * as React from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  History, 
  Plus, 
  MessageSquare, 
  Gavel, 
  FileUp, 
  Calendar,
  Loader2,
  Trash2,
  User,
  Timer
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useFirebase } from '@/firebase';
import { doc, updateDoc, arrayUnion, arrayRemove, Timestamp } from 'firebase/firestore';
import type { Process, TimelineEvent } from '@/lib/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { v4 as uuidv4 } from 'uuid';
import { useSession } from 'next-auth/react';
import { cn } from '@/lib/utils';

interface ProcessTimelineSheetProps {
  process: Process | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProcessTimelineSheet({ process, open, onOpenChange }: ProcessTimelineSheetProps) {
  const { firestore } = useFirebase();
  const { data: session } = useSession();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState<string | null>(null);
  
  const [newNote, setNewNote] = React.useState('');
  const [eventType, setEventType] = React.useState<TimelineEvent['type']>('note');

  const timeline = React.useMemo(() => {
    if (!process?.timeline) return [];
    return [...process.timeline].sort((a, b) => b.date.seconds - a.date.seconds);
  }, [process?.timeline]);

  const handleAddEvent = async () => {
    if (!newNote.trim() || !process || !firestore || !session?.user?.name) return;

    setIsSaving(true);
    try {
      const event: TimelineEvent = {
        id: uuidv4(),
        type: eventType,
        description: newNote.trim(),
        date: Timestamp.now(),
        authorName: session.user.name,
      };

      const processRef = doc(firestore, 'processes', process.id);
      await updateDoc(processRef, {
        timeline: arrayUnion(event),
        updatedAt: Timestamp.now(),
      });

      setNewNote('');
      toast({ title: "Evento registrado!", description: "O andamento foi adicionado à linha do tempo." });
    } catch (error: any) {
      toast({ variant: 'destructive', title: "Erro ao salvar", description: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteEvent = async (event: TimelineEvent) => {
    if (!process || !firestore) return;
    setIsDeleting(event.id);
    try {
      const processRef = doc(firestore, 'processes', process.id);
      await updateDoc(processRef, {
        timeline: arrayRemove(event),
      });
      toast({ title: "Evento removido." });
    } catch (error: any) {
      toast({ variant: 'destructive', title: "Erro ao excluir", description: error.message });
    } finally {
      setIsDeleting(null);
    }
  };

  const getIcon = (type: TimelineEvent['type']) => {
    switch (type) {
      case 'decision': return <Gavel className="h-4 w-4 text-amber-500" />;
      case 'petition': return <FileUp className="h-4 w-4 text-blue-500" />;
      case 'hearing': return <Calendar className="h-4 w-4 text-emerald-500" />;
      case 'deadline': return <Timer className="h-4 w-4 text-rose-500" />;
      default: return <MessageSquare className="h-4 w-4 text-muted-foreground" />;
    }
  };

  if (!process) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-2xl w-full flex flex-col p-0 bg-[#020617] border-border">
        <SheetHeader className="p-6 border-b border-border/50 bg-muted/10">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            <SheetTitle className="font-headline text-xl text-white">Andamentos do Processo</SheetTitle>
          </div>
          <SheetDescription className="text-slate-400">Histórico cronológico de eventos para: {process.name}</SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Form Section */}
          <div className="p-6 border-b border-border/50 bg-[#0f172a] space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button 
                variant={eventType === 'note' ? 'default' : 'outline'} 
                size="sm" 
                onClick={() => setEventType('note')}
                className="text-[10px] h-7 uppercase font-bold"
              >Nota</Button>
              <Button 
                variant={eventType === 'petition' ? 'default' : 'outline'} 
                size="sm" 
                onClick={() => setEventType('petition')}
                className="text-[10px] h-7 uppercase font-bold"
              >Petição</Button>
              <Button 
                variant={eventType === 'decision' ? 'default' : 'outline'} 
                size="sm" 
                onClick={() => setEventType('decision')}
                className="text-[10px] h-7 uppercase font-bold"
              >Decisão</Button>
              <Button 
                variant={eventType === 'hearing' ? 'default' : 'outline'} 
                size="sm" 
                onClick={() => setEventType('hearing')}
                className="text-[10px] h-7 uppercase font-bold"
              >Audiência</Button>
            </div>
            <div className="flex gap-2">
              <Textarea 
                placeholder="Descreva o andamento ou observação..." 
                value={newNote} 
                onChange={(e) => setNewNote(e.target.value)}
                className="min-h-[80px] resize-none text-sm bg-background border-border text-white"
              />
              <Button 
                className="h-auto" 
                disabled={!newNote.trim() || isSaving}
                onClick={handleAddEvent}
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <ScrollArea className="flex-1 p-6">
            <div className="relative space-y-8 before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border/30 before:to-transparent">
              {timeline.length > 0 ? (
                timeline.map((event) => (
                  <div key={event.id} className="relative flex items-start gap-6 group">
                    <div className={cn(
                        "flex items-center justify-center w-10 h-10 rounded-full bg-[#0f172a] border-2 border-border/50 z-10 shadow-sm transition-colors",
                        "group-hover:border-primary",
                        event.type === 'deadline' && "border-rose-500/50"
                    )}>
                      {getIcon(event.type)}
                    </div>
                    <div className={cn(
                      "flex-1 p-4 rounded-xl border border-transparent transition-all",
                      event.type === 'deadline' ? "bg-rose-500/5 hover:border-rose-500/30" : "bg-muted/30 hover:border-border/50"
                    )}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[10px] font-black uppercase text-muted-foreground bg-background px-2 py-0.5 rounded border border-border/50">
                                {format(event.date.toDate(), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                            </span>
                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-bold">
                                <User className="h-3 w-3 text-primary" />
                                {event.authorName}
                            </div>
                            {event.endDate && (
                              <Badge variant="outline" className="text-[9px] font-black uppercase bg-rose-500/10 text-rose-400 border-rose-500/20">
                                <Timer className="h-2.5 w-2.5 mr-1" /> Vence em {format(event.endDate.toDate(), 'dd/MM/yyyy')}
                              </Badge>
                            )}
                        </div>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
                            onClick={() => handleDeleteEvent(event)}
                            disabled={isDeleting === event.id}
                        >
                            {isDeleting === event.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                        </Button>
                      </div>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap text-slate-300">{event.description}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center opacity-30">
                    <History className="h-12 w-12 mb-4" />
                    <p className="font-bold text-white">Sem andamentos</p>
                    <p className="text-xs text-slate-400">Registre o primeiro evento acima.</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
}