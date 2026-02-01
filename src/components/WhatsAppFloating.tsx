'use client';

import React, { useState, useEffect } from 'react';
import { MessageCircle, X, Check, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface WhatsAppFloatingProps {
  phoneNumber: string;
  message?: string;
  welcomeMessage?: string;
  userName?: string;
  delay?: number;
  autoHideDelay?: number;
}

export function WhatsAppFloating({
  phoneNumber,
  message = 'Olá! Gostaria de saber mais sobre os serviços.',
  welcomeMessage = 'Olá, posso te ajudar?',
  userName = 'Dr. Alan',
  delay = 3000,
  autoHideDelay = 10000,
}: WhatsAppFloatingProps) {
  const [showPopup, setShowPopup] = useState(false);
  const [showButton, setShowButton] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [messageStatus, setMessageStatus] = useState<'sending' | 'sent' | 'read'>('sending');
  const [unreadCount, setUnreadCount] = useState(1);

  useEffect(() => {
    // Primeiro mostra o botão imediatamente
    setShowButton(true);

    // Depois de um delay, mostra o popup
    const showTimer = setTimeout(() => {
      setShowPopup(true);
      setIsTyping(true);

      // Simula digitação
      setTimeout(() => {
        setIsTyping(false);
        setMessageStatus('sent');

        // Marca como lida após 1 segundo
        setTimeout(() => {
          setMessageStatus('read');
        }, 1000);
      }, 1500);
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

  const handleOpenWhatsApp = () => {
    setHasInteracted(true);
    setUnreadCount(0);
    
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
    
    setShowPopup(false);
  };

  const handleTogglePopup = () => {
    setShowPopup(!showPopup);
    if (!showPopup) {
      setUnreadCount(0);
      setHasInteracted(true);
    }
  };

  const handleClosePopup = () => {
    setShowPopup(false);
    setHasInteracted(true);
  };

  const formatTime = () => {
    const now = new Date();
    return now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <>
      {/* Floating Button */}
      <div
        className={`fixed bottom-6 right-6 z-50 transition-all duration-500 ${
          showButton ? 'scale-100 opacity-100' : 'scale-0 opacity-0'
        }`}
      >
        <Button
          onClick={handleTogglePopup}
          className="group relative h-16 w-16 rounded-full bg-[#25D366] hover:bg-[#20BA5A] shadow-2xl hover:shadow-[0_20px_60px_rgba(37,211,102,0.5)] transition-all duration-300 hover:scale-110 p-0"
        >
          {/* Unread Badge */}
          {unreadCount > 0 && !hasInteracted && (
            <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center animate-pulse ring-4 ring-background">
              {unreadCount}
            </div>
          )}

          {/* WhatsApp Icon */}
          <MessageCircle className="h-8 w-8 text-white group-hover:scale-110 transition-transform" />

          {/* Ripple Effect */}
          <div className="absolute inset-0 rounded-full bg-[#25D366] animate-ping opacity-20" />
        </Button>
      </div>

      {/* Popup Message */}
      {showPopup && (
        <div
          className={`fixed bottom-28 right-6 z-50 transition-all duration-500 ${
            showPopup ? 'scale-100 opacity-100 translate-y-0' : 'scale-95 opacity-0 translate-y-4'
          }`}
        >
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
                  <p className="text-xs text-white/70 flex items-center gap-1">
                    {isTyping ? (
                      <>
                        <span className="flex gap-1">
                          <span className="w-1.5 h-1.5 bg-white/70 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                          <span className="w-1.5 h-1.5 bg-white/70 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                          <span className="w-1.5 h-1.5 bg-white/70 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                        </span>
                        <span className="ml-1">digitando...</span>
                      </>
                    ) : (
                      'online'
                    )}
                  </p>
                </div>
              </div>

              {/* Close Button */}
              <button
                onClick={handleClosePopup}
                className="text-white/70 hover:text-white transition-colors p-1 hover:bg-white/10 rounded-full"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Message Container */}
            <div className="bg-[#ECE5DD] dark:bg-gray-800 p-4 min-h-[120px] max-h-[300px] overflow-y-auto bg-whatsapp-pattern">
              {/* Message Bubble */}
              <div className="flex justify-start mb-4 animate-slideInLeft">
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
                        {formatTime()}
                      </span>
                      {messageStatus === 'sent' && (
                        <Check className="h-3 w-3 text-gray-400" />
                      )}
                      {messageStatus === 'read' && (
                        <CheckCheck className="h-3 w-3 text-[#25D366]" />
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Suggested Actions */}
              {!isTyping && (
                <div className="space-y-2 animate-fadeIn">
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
              )}
            </div>

            {/* Footer - Powered by WhatsApp */}
            <div className="bg-white dark:bg-gray-900 px-4 py-2 border-t border-gray-200 dark:border-gray-800">
              <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
                <MessageCircle className="h-3 w-3 text-[#25D366]" />
                <span>Clique para conversar no WhatsApp</span>
              </div>
            </div>
          </div>

          {/* Arrow pointing to button */}
          <div className="absolute -bottom-4 right-6 w-0 h-0 border-l-8 border-l-transparent border-r-8 border-r-transparent border-t-8 border-t-white dark:border-t-gray-900 drop-shadow-lg" />
        </div>
      )}

      {/* WhatsApp Background Pattern Style */}
      <style jsx>{`
        .bg-whatsapp-pattern {
          background-image: url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z' fill='%23000000' fill-opacity='0.02' fill-rule='evenodd'/%3E%3C/svg%3E");
        }
        
        @keyframes slideInLeft {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        .animate-slideInLeft {
          animation: slideInLeft 0.5s ease-out forwards;
        }
        
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out forwards;
          animation-delay: 0.3s;
          opacity: 0;
        }
      `}</style>
    </>
  );
}
