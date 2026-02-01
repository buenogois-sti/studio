'use client';

import React, { useState, useEffect } from 'react';
import { MessageCircle, X, Send, Paperclip, Smile } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface WhatsAppChatProps {
  phoneNumber: string;
  businessName?: string;
  avatar?: string;
  primaryColor?: string;
}

export function WhatsAppAdvancedChat({
  phoneNumber,
  businessName = 'Dr. Alan',
  avatar,
  primaryColor = '#25D366',
}: WhatsAppChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Array<{
    id: number;
    text: string;
    sender: 'user' | 'bot';
    timestamp: Date;
  }>>([]);
  const [showNotification, setShowNotification] = useState(true);

  useEffect(() => {
    // Add initial message after delay
    setTimeout(() => {
      setMessages([{
        id: 1,
        text: '👋 Olá! Estou aqui para ajudar com seus direitos. Como posso te auxiliar hoje?',
        sender: 'bot',
        timestamp: new Date(),
      }]);
    }, 2000);

    // Auto show notification
    setTimeout(() => {
      setShowNotification(true);
    }, 7000);
  }, []);

  const handleSendMessage = () => {
    if (!message.trim()) return;

    const newMessage = {
      id: messages.length + 1,
      text: message,
      sender: 'user' as const,
      timestamp: new Date(),
    };

    setMessages([...messages, newMessage]);
    setMessage('');

    // Simulate bot response
    setTimeout(() => {
      const botResponse = {
        id: messages.length + 2,
        text: 'Vou te direcionar para o WhatsApp onde podemos conversar melhor! 😊',
        sender: 'bot' as const,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, botResponse]);

      // Redirect to WhatsApp
      setTimeout(() => {
        const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
      }, 1500);
    }, 1000);
  };

  return (
    <>
      {/* Floating Button with Notification */}
      <div className="fixed bottom-6 right-6 z-50">
        {showNotification && !isOpen && (
          <div className="absolute bottom-20 right-0 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-4 w-64 animate-slideInRight mb-2">
            <button
              onClick={() => setShowNotification(false)}
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
            <p className="text-sm text-gray-700 dark:text-gray-300 font-medium pr-6">
              💬 Tem dúvidas sobre direitos trabalhistas? Estou online!
            </p>
          </div>
        )}

        <Button
          onClick={() => {
            setIsOpen(!isOpen);
            setShowNotification(false);
          }}
          className="h-16 w-16 rounded-full shadow-2xl transition-all duration-300 hover:scale-110"
          style={{ backgroundColor: primaryColor }}
        >
          {isOpen ? (
            <X className="h-8 w-8 text-white" />
          ) : (
            <MessageCircle className="h-8 w-8 text-white" />
          )}
        </Button>
      </div>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-28 right-6 z-50 w-96 h-[500px] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden animate-slideInRight flex flex-col">
          {/* Header */}
          <div className="p-4 flex items-center gap-3" style={{ backgroundColor: primaryColor }}>
            <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center text-white font-bold">
              {businessName.split(' ').map(n => n[0]).join('').substring(0, 2)}
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-white">{businessName}</h3>
              <p className="text-xs text-white/80">Online agora</p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 p-4 overflow-y-auto bg-gray-50 dark:bg-gray-800 space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl p-3 ${
                    msg.sender === 'user'
                      ? 'bg-blue-500 text-white'
                      : 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                  }`}
                >
                  <p className="text-sm">{msg.text}</p>
                  <span className="text-xs opacity-70 mt-1 block">
                    {msg.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Input */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex items-center gap-2">
            <Button variant="ghost" size="icon" className="flex-shrink-0">
              <Paperclip className="h-5 w-5" />
            </Button>
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Digite sua mensagem..."
              className="flex-1"
            />
            <Button variant="ghost" size="icon" className="flex-shrink-0">
              <Smile className="h-5 w-5" />
            </Button>
            <Button
              onClick={handleSendMessage}
              size="icon"
              style={{ backgroundColor: primaryColor }}
              className="flex-shrink-0"
            >
              <Send className="h-5 w-5 text-white" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
