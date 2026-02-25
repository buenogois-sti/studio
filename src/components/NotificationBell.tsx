'use client';
import * as React from 'react';
import { 
  Bell, 
  Check, 
  Trash2, 
  DollarSign, 
  Timer, 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  Info,
  Clock,
  XCircle,
  Gavel
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useRouter } from 'next/navigation';

import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import type { Notification, NotificationType } from '@/lib/types';
import { cn } from '@/lib/utils';
import { markNotificationAsRead, markAllNotificationsAsRead, clearAllNotifications } from '@/lib/notification-actions';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from './ui/skeleton';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';

const getNotificationIcon = (type?: NotificationType) => {
  switch (type) {
    case 'finance': return <DollarSign className="h-4 w-4 text-emerald-500" />;
    case 'deadline': return <Timer className="h-4 w-4 text-rose-500" />;
    case 'hearing': return <Gavel className="h-4 w-4 text-amber-500" />;
    case 'success': return <CheckCircle2 className="h-4 w-4 text-emerald-400" />;
    case 'warning': return <AlertCircle className="h-4 w-4 text-amber-400" />;
    case 'error': return <XCircle className="h-4 w-4 text-rose-400" />;
    default: return <Info className="h-4 w-4 text-blue-400" />;
  }
};

export function NotificationBell() {
  const { data: session } = useSession();
  const { firestore } = useFirebase();
  const router = useRouter();
  const [isOpen, setIsOpen] = React.useState(false);

  const notificationsQuery = useMemoFirebase(
    () => (firestore && session?.user?.id ? query(
      collection(firestore, `users/${session.user.id}/notifications`), 
      orderBy('createdAt', 'desc'), 
      limit(20)
    ) : null),
    [firestore, session?.user?.id]
  );
  const { data: notifications, isLoading } = useCollection<Notification>(notificationsQuery);

  const unreadCount = React.useMemo(() => {
    return notifications?.filter(n => !n.isRead).length || 0;
  }, [notifications]);

  const handleMarkAllAsRead = async () => {
    if (!session?.user?.id) return;
    await markAllNotificationsAsRead(session.user.id);
  };

  const handleClearAll = async () => {
    if (!session?.user?.id) return;
    if (confirm('Deseja excluir permanentemente todo o histórico de notificações?')) {
      await clearAllNotifications(session.user.id);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.isRead && session?.user?.id) {
      await markNotificationAsRead(session.user.id, notification.id);
    }
    if (notification.href && notification.href !== '#') {
      router.push(notification.href);
    }
    setIsOpen(false);
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-12 w-12 hover:bg-white/5 text-white/70 hover:text-white transition-all rounded-full">
          <Bell className="h-6 w-6" />
          {unreadCount > 0 && (
            <div className="absolute top-2.5 right-2.5 h-4 min-w-4 px-1 rounded-full bg-rose-600 text-[10px] font-black text-white flex items-center justify-center border-2 border-[#020617] animate-in zoom-in">
              {unreadCount}
            </div>
          )}
          <span className="sr-only">Notificações</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80 md:w-[400px] bg-[#0f172a] border-white/10 p-0 shadow-2xl overflow-hidden" align="end">
        <DropdownMenuLabel className="flex items-center justify-between p-4 bg-white/5">
          <div className="flex items-center gap-2">
            <span className="font-headline text-lg text-white">Notificações</span>
            {unreadCount > 0 && <Badge variant="secondary" className="bg-rose-500/20 text-rose-400 border-rose-500/20 px-1.5 h-5 text-[10px]">{unreadCount} Novas</Badge>}
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-white/10 text-emerald-400" onClick={handleMarkAllAsRead} title="Lidas">
              <Check className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-rose-500/10 text-rose-400" onClick={handleClearAll} title="Limpar">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-white/5 m-0" />
        
        <ScrollArea className="h-[450px]">
          {isLoading ? (
            <div className="p-4 space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="h-10 w-10 rounded-lg bg-white/5" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4 bg-white/5" />
                    <Skeleton className="h-3 w-1/2 bg-white/5" />
                  </div>
                </div>
              ))}
            </div>
          ) : notifications && notifications.length > 0 ? (
            <div className="divide-y divide-white/5">
              {notifications.map(notif => (
                <DropdownMenuItem
                  key={notif.id}
                  className={cn(
                    "flex items-start gap-4 p-4 cursor-pointer focus:bg-white/5 transition-all outline-none",
                    !notif.isRead && "bg-primary/5 border-l-2 border-primary"
                  )}
                  onClick={() => handleNotificationClick(notif)}
                >
                    <div className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                      {getNotificationIcon(notif.type)}
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className={cn("text-sm truncate", notif.isRead ? "text-slate-300" : "font-bold text-white")}>
                          {notif.title}
                        </p>
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                          {notif.createdAt && formatDistanceToNow(notif.createdAt.toDate(), { addSuffix: true, locale: ptBR })}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                        {notif.description}
                      </p>
                    </div>
                </DropdownMenuItem>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 px-10 text-center space-y-4 opacity-40">
              <Bell className="h-12 w-12 text-muted-foreground" />
              <div className="space-y-1">
                <p className="font-bold text-white">Tudo em ordem!</p>
                <p className="text-xs text-muted-foreground">Novas atualizações operacionais do Bueno Gois aparecerão aqui.</p>
              </div>
            </div>
          )}
        </ScrollArea>
        
        <DropdownMenuSeparator className="bg-white/5 m-0" />
        <div className="p-2">
          <Button variant="ghost" className="w-full text-[10px] font-black uppercase text-muted-foreground hover:text-white h-8" onClick={() => setIsOpen(false)}>
            Fechar Painel
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
