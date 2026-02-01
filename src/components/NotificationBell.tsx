'use client';
import * as React from 'react';
import { Bell, Check } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useRouter } from 'next/navigation';

import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit, doc, writeBatch } from 'firebase/firestore';
import type { Notification } from '@/lib/types';
import { cn } from '@/lib/utils';
import { markNotificationAsRead } from '@/lib/notification-actions';

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

export function NotificationBell() {
  const { data: session } = useSession();
  const { firestore } = useFirebase();
  const router = useRouter();
  const [isOpen, setIsOpen] = React.useState(false);

  const notificationsQuery = useMemoFirebase(
    () => (firestore && session?.user?.id ? query(collection(firestore, `users/${session.user.id}/notifications`), orderBy('createdAt', 'desc'), limit(10)) : null),
    [firestore, session?.user?.id]
  );
  const { data: notifications, isLoading } = useCollection<Notification>(notificationsQuery);

  const unreadCount = React.useMemo(() => {
    return notifications?.filter(n => !n.isRead).length || 0;
  }, [notifications]);

  const markAllAsRead = async () => {
    if (!firestore || !session?.user?.id || !notifications) return;
    
    const batch = writeBatch(firestore);
    notifications.forEach(notification => {
      if (!notification.isRead) {
        const notifRef = doc(firestore, `users/${session.user.id}/notifications`, notification.id);
        batch.update(notifRef, { isRead: true });
      }
    });
    
    try {
      await batch.commit();
    } catch (error) {
      console.error("Error marking notifications as read:", error);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead && session?.user?.id) {
      markNotificationAsRead(session.user.id, notification.id);
    }
    if (notification.href && notification.href !== '#') {
      router.push(notification.href);
    }
    setIsOpen(false);
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <div className="absolute top-1 right-1 h-2.5 w-2.5 rounded-full bg-destructive animate-pulse" />
          )}
          <span className="sr-only">Toggle notifications</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80 md:w-96" align="end">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span className="font-semibold">Notificações</span>
          {unreadCount > 0 && <Badge variant="secondary">{unreadCount} nova(s)</Badge>}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <ScrollArea className="h-[300px]">
          {isLoading ? (
            <div className="p-2 space-y-2">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : notifications && notifications.length > 0 ? (
            notifications.map(notif => (
              <DropdownMenuItem
                key={notif.id}
                className={cn("flex-col items-start gap-1 p-3 whitespace-normal cursor-pointer", !notif.isRead && "bg-accent/50")}
                onClick={() => handleNotificationClick(notif)}
              >
                  <div className="flex items-center justify-between w-full">
                    <p className="text-sm font-semibold">{notif.title}</p>
                    {!notif.isRead && <div className="h-2 w-2 rounded-full bg-primary" />}
                  </div>
                  <p className="text-xs text-muted-foreground">{notif.description}</p>
                  <p className="text-xs text-muted-foreground/80 mt-1">
                    {notif.createdAt && formatDistanceToNow(notif.createdAt.toDate(), { addSuffix: true, locale: ptBR })}
                  </p>
              </DropdownMenuItem>
            ))
          ) : (
            <div className="text-center text-sm text-muted-foreground p-8">
              Nenhuma notificação por aqui.
            </div>
          )}
        </ScrollArea>
        
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled={unreadCount === 0} onClick={markAllAsRead} className="cursor-pointer">
          <Check className="mr-2 h-4 w-4" />
          <span>Marcar todas como lidas</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
