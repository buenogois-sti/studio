
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { MessageCircle, X, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface WhatsAppFloatingProps {
  phoneNumber: string;
  message?: string;
  welcomeMessage?: string;
  userName?: string;
  delay?: number;
  autoHideDelay?: number;
}

export const WhatsAppFloating = React.memo(function WhatsAppFloating({
  phoneNumber,
  message = 'Olá! Gostaria de saber mais sobre os serviços.',
  welcomeMessage = 'Olá, posso te ajudar?',
  userName = 'Dr. Alan',
  delay = 3000,
  autoHideDelay = 10000,
}: WhatsAppFloatingProps) {
  const [showPopup, setShowPopup] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  useEffect(() => {
    // Show popup after delay
    const showTimer = setTimeout(() => {
      if (!hasInteracted) {
        setShowPopup(true);
      }
    }, delay);

    // Auto-hide popup
    const hideTimer = setTimeout(() => {
      if (!hasInteracted) {
        setShowPopup(false);
      }
    }, delay + autoHideDelay);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, [delay, autoHideDelay, hasInteracted]);

  const handleOpenWhatsApp = useCallback(() => {
    setHasInteracted(true);
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
    setShowPopup(false);
  }, [phoneNumber, message]);

  const handleTogglePopup = useCallback(() => {
    setShowPopup(prev => !prev);
    setHasInteracted(true);
  }, []);

  const handleClosePopup = useCallback(() => {
    setShowPopup(false);
    setHasInteracted(true);
  }, []);

  const currentTime = useMemo(() => {
    return new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }, []);

  return (
    <>
      {/* Floating Button */}
      <div className="fixed bottom-6 right-6 z-50 transition-all duration-500">
        <Button
          onClick={handleTogglePopup}
          className="group relative h-16 w-16 rounded-full bg-[#25D366] hover:bg-[#20BA5A] shadow-2xl transition-all duration-300 hover:scale-110 p-0"
          aria-label="Abrir WhatsApp"
        >
          {/* Unread Badge */}
          {!hasInteracted && (
            <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center ring-4 ring-background">
              1
            </div>
          )}

          {/* WhatsApp Icon */}
          <MessageCircle className="h-8 w-8 text-white" />

          {/* Ripple Effect - Simplified */}
          <div className="absolute inset-0 rounded-full bg-[#25D366] opacity-20 animate-pulse" />
        </Button>
      </div>

      {/* Popup Message */}
      {showPopup && (
        <div className="fixed bottom-28 right-6 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-80 overflow-hidden border border-gray-200 dark:border-gray-800">
            {/* Header */}
            <div className="bg-[#075E54] p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Avatar */}
                <div className="relative">
                  <div className="h-12 w-12 rounded-full bg-[#152c4b] flex items-center justify-center ring-2 ring-white/20 overflow-hidden p-1">
                    <img 
                      src="/logo.png" 
                      alt="Logo" 
                      className="h-full w-full object-contain"
                    />
                  </div>
                  {/* Online Status */}
                  <div className="absolute bottom-0 right-0 h-3 w-3 bg-[#25D366] rounded-full ring-2 ring-[#075E54]" />
                </div>

                {/* Name and Status */}
                <div className="flex-1">
                  <h3 className="font-semibold text-white text-sm">{userName}</h3>
                  <p className="text-xs text-white/70">
                    Online
                    <span className="ml-2 inline-flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-white/70" />
                      <span className="h-1.5 w-1.5 rounded-full bg-white/70" />
                      <span className="h-1.5 w-1.5 rounded-full bg-white/70" />
                    </span>
                  </p>
                </div>
              </div>

              {/* Close Button */}
              <button
                onClick={handleClosePopup}
                className="text-white/70 hover:text-white transition-colors p-1 hover:bg-white/10 rounded-full"
                aria-label="Fechar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Message Container */}
            <div className="bg-[#ECE5DD] dark:bg-gray-800 p-4 min-h-[120px]">
              {/* Message Bubble */}
              <div className="flex justify-start mb-4">
                <div className="relative max-w-[85%]">
                  {/* Arrow */}
                  <div className="absolute -left-2 top-0 w-0 h-0 border-t-[10px] border-t-white dark:border-t-gray-700 border-r-[10px] border-r-transparent" />
                  
                  {/* Bubble */}
                  <div className="bg-white dark:bg-gray-700 rounded-lg rounded-tl-none p-3 shadow-sm">
                    <p className="text-gray-800 dark:text-gray-200 text-sm leading-relaxed">
                      {welcomeMessage}
                    </p>
                    
                    {/* Time and Status */}
                    <div className="flex items-center justify-end gap-1 mt-1">
                      <span className="text-[10px] text-gray-500 dark:text-gray-400">
                        {currentTime}
                      </span>
                      <CheckCheck className="h-3 w-3 text-[#25D366]" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Suggested Actions */}
              <div className="space-y-2">
                <button
                  onClick={handleOpenWhatsApp}
                  className="w-full bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 rounded-lg p-3 text-left transition-all duration-200 shadow-sm hover:shadow-md group border border-gray-200 dark:border-gray-600"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700 dark:text-gray-200 font-medium">
                      💬 Iniciar conversa
                    </span>
                    <svg className="w-4 h-4 text-gray-400 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>

                <button
                  onClick={handleOpenWhatsApp}
                  className="w-full bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 rounded-lg p-3 text-left transition-all duration-200 shadow-sm hover:shadow-md group border border-gray-200 dark:border-gray-600"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700 dark:text-gray-200 font-medium">
                      ⚖️ Ver serviços
                    </span>
                    <svg className="w-4 h-4 text-gray-400 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
              </div>
            </div>

            {/* Footer - Powered by WhatsApp */}
            <div className="bg-white dark:bg-gray-900 px-4 py-2 border-t border-gray-200 dark:border-gray-800">
              <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
                <MessageCircle className="h-3 w-3 text-[#25D366]" />
                <span>Clique para conversar no WhatsApp</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
});
