import { useState, useEffect, useCallback } from 'react';

export interface WhatsAppState {
  showPopup: boolean;
  showButton: boolean;
  hasInteracted: boolean;
  isTyping: boolean;
  messageStatus: 'sending' | 'sent' | 'read';
  unreadCount: number;
}

export function useWhatsAppWidget(delay: number = 2000, autoHideDelay: number = 8000) {
  const [state, setState] = useState<WhatsAppState>({
    showPopup: false,
    showButton: false,
    hasInteracted: false,
    isTyping: false,
    messageStatus: 'sending',
    unreadCount: 1,
  });

  useEffect(() => {
    // Show button immediately
    setState(prev => ({ ...prev, showButton: true }));

    // Show popup after delay
    const showTimer = setTimeout(() => {
      setState(prev => ({ ...prev, showPopup: true, isTyping: true }));

      // Simulate typing
      setTimeout(() => {
        setState(prev => ({ ...prev, isTyping: false, messageStatus: 'sent' }));

        // Mark as read after 1 second
        setTimeout(() => {
          setState(prev => ({ ...prev, messageStatus: 'read' }));
        }, 1000);
      }, 1500);
    }, delay);

    // Auto-hide popup
    const hideTimer = setTimeout(() => {
      setState(prev => {
        if (!prev.hasInteracted) {
          return { ...prev, showPopup: false };
        }
        return prev;
      });
    }, delay + autoHideDelay);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, [delay, autoHideDelay]);

  const togglePopup = useCallback(() => {
    setState(prev => ({
      ...prev,
      showPopup: !prev.showPopup,
      hasInteracted: true,
      unreadCount: prev.showPopup ? prev.unreadCount : 0,
    }));
  }, []);

  const closePopup = useCallback(() => {
    setState(prev => ({ ...prev, showPopup: false, hasInteracted: true }));
  }, []);

  const markAsRead = useCallback(() => {
    setState(prev => ({ ...prev, unreadCount: 0, hasInteracted: true }));
  }, []);

  return {
    state,
    togglePopup,
    closePopup,
    markAsRead,
  };
}
