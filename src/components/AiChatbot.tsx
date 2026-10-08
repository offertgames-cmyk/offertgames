import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Bot, 
  X, 
  Send, 
  Sparkles, 
  Lock, 
  AlertCircle, 
  RefreshCw,
  HelpCircle,
  TrendingDown,
  Award,
  Bell
} from 'lucide-react';
import { ChatMessage } from '../types/game';
import { 
  askOffertGamesAi, 
  getUserDailyChatCount,
  DAILY_MSG_LIMIT,
  stripEmojis 
} from '../services/aiChatService';

const SUGGESTIONS = [
  '¿Cuáles son las mayores ofertas de hoy?',
  '¿Cómo dejar una reseña en la comunidad?',
  '¿Cómo contacto con atención al cliente?',
  '¿Cómo funcionan los avisos de precio?'
];

export const AiChatbot: React.FC = () => {
  const { games, currentUser, openAuthModal } = useApp();

  const [isOpen, setIsOpen] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [dailyCount, setDailyCount] = useState<number>(0);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: 'Hola. Soy el Asistente Inteligente oficial de OffertGames conectado a NVIDIA AI. Puedo buscar precios en tiempo real entre Steam, Epic, GOG, PlayStation y Xbox, informarte sobre las funciones de la web, reseñas de la comunidad y atención al cliente. ¿En qué te puedo ayudar hoy?',
      timestamp: 'Ahora'
    }
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (currentUser) {
      setDailyCount(getUserDailyChatCount(currentUser));
    } else {
      setDailyCount(0);
    }
  }, [currentUser, isOpen]);

  const isQuotaReached = currentUser ? dailyCount >= DAILY_MSG_LIMIT : false;
  const remainingChats = Math.max(0, DAILY_MSG_LIMIT - dailyCount);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    const handleOpenChat = () => setIsOpen(true);
    window.addEventListener('offertgames_open_ai_chat', handleOpenChat);
    return () => window.removeEventListener('offertgames_open_ai_chat', handleOpenChat);
  }, []);

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, messages]);

  const handleSendMessage = async (textToSend?: string) => {
    const rawText = textToSend || inputMessage;
    const text = stripEmojis(rawText.trim());
    if (!text || isLoading) return;

    if (!currentUser) {
      openAuthModal('login', 'Inicia sesión con Google para consultar al asistente de IA.');
      return;
    }

    if (isQuotaReached) {
      return;
    }

    // Add user message
    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await askOffertGamesAi({
        question: text,
        games,
        currentUser
      });

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'assistant',
        text: response.answer,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, aiMsg]);
      if (currentUser) {
        setDailyCount(getUserDailyChatCount(currentUser));
      }
    } catch {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        sender: 'assistant',
        text: 'Ha ocurrido un error al procesar tu consulta. Por favor, inténtalo de nuevo.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
      if (currentUser) {
        setDailyCount(getUserDailyChatCount(currentUser));
      }
    }
  };

  return (
    <>
      {/* Botón Flotante del Asistente IA (Esquina inferior derecha) */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          title="Abrir Asistente de IA de OffertGames"
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2.5 p-3.5 sm:px-4 sm:py-3.5 rounded-2xl bg-[#0f1724] hover:bg-[#162234] border border-[#2a3c54] hover:border-[#38bdf8] text-white shadow-2xl transition-all cursor-pointer group hover:scale-105 active:scale-95 select-none"
        >
          <div className="relative">
            <div className="w-8 h-8 rounded-xl bg-[#38bdf8]/15 border border-[#38bdf8]/40 flex items-center justify-center text-[#38bdf8] group-hover:scale-110 transition-transform">
              <Bot className="w-5 h-5" />
            </div>
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-[#0f1724] animate-pulse" />
          </div>
          <div className="text-left hidden sm:block">
            <span className="text-xs font-black text-white block tracking-tight">Asistente IA</span>
            <span className="text-[10px] text-cyan-400 font-semibold flex items-center gap-1">
              <Sparkles className="w-2.5 h-2.5" />
              Precios en tiempo real
            </span>
          </div>
        </button>
      )}

      {/* Ventana Modal / Drawer del Chatbot IA */}
      {isOpen && (
        <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 w-[calc(100vw-2rem)] sm:w-[420px] max-h-[620px] h-[85vh] bg-[#0c121c] border border-[#233348] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 duration-200 select-none">
          
          {/* 1. Encabezado del Chat */}
          <div className="p-4 bg-[#111926] border-b border-[#1f2c3e] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#38bdf8]/20 border border-[#38bdf8]/40 flex items-center justify-center text-[#38bdf8] shadow-md">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-black text-white tracking-tight">Asistente OffertGames</h3>
                  <span className="text-[9px] font-black uppercase tracking-wider bg-emerald-950 text-emerald-400 border border-emerald-800/40 px-1.5 py-0.5 rounded-md flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    NVIDIA AI
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-[10px] text-gray-400">Catálogo en tiempo real y soporte</p>
                  {currentUser && !isQuotaReached && (
                    <span className="text-[9px] font-bold text-cyan-300 bg-cyan-950/70 border border-cyan-800/50 px-1.5 py-0.2 rounded-md">
                      {remainingChats} {remainingChats === 1 ? 'consulta hoy' : 'consultas hoy'}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-xl text-gray-400 hover:text-white hover:bg-[#182333] transition-colors cursor-pointer"
              title="Minimizar asistente"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* 2. Área de Mensajes */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-[#0a0f17]">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed whitespace-pre-wrap ${
                    m.sender === 'user'
                      ? 'bg-[#38bdf8] text-gray-950 font-bold rounded-tr-xs shadow-md shadow-cyan-500/10'
                      : 'bg-[#131b27] text-gray-200 border border-[#213045] rounded-tl-xs shadow-sm font-normal'
                  }`}
                >
                  {m.text}
                </div>
                <span className="text-[9px] text-gray-500 mt-1 px-1">{m.timestamp}</span>
              </div>
            ))}

            {/* Indicador de escritura animado */}
            {isLoading && (
              <div className="flex items-start">
                <div className="bg-[#131b27] border border-[#213045] rounded-2xl rounded-tl-xs px-4 py-3 flex items-center gap-1.5 shadow-sm">
                  <div className="w-2 h-2 rounded-full bg-[#38bdf8] animate-bounce" />
                  <div className="w-2 h-2 rounded-full bg-[#38bdf8] animate-bounce [animation-delay:0.2s]" />
                  <div className="w-2 h-2 rounded-full bg-[#38bdf8] animate-bounce [animation-delay:0.4s]" />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* 3. Sugerencias Rápidas de Preguntas (Chips interactivos) */}
          {messages.length <= 2 && !isLoading && !isQuotaReached && currentUser && (
            <div className="p-2.5 bg-[#0e1520] border-t border-[#1b2535] flex items-center gap-1.5 overflow-x-auto scrollbar-none">
              {SUGGESTIONS.map((s, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSendMessage(s)}
                  className="shrink-0 text-[10px] font-semibold text-gray-300 hover:text-white bg-[#141d2a] hover:bg-[#1b2738] border border-[#243346] rounded-xl px-2.5 py-1.5 transition-all cursor-pointer text-left"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* 4. Pie de entrada o avisos de estado */}
          <div className="p-3 bg-[#111926] border-t border-[#1e2a3c]">
            {!currentUser ? (
              <div className="text-center py-2 space-y-2">
                <p className="text-xs text-gray-400">
                  Inicia sesión con tu cuenta de Google para consultar precios y ofertas con la IA.
                </p>
                <button
                  type="button"
                  onClick={() => openAuthModal('login')}
                  className="w-full py-2 px-4 rounded-xl bg-white hover:bg-gray-100 text-gray-900 font-extrabold text-xs transition-all cursor-pointer shadow-md"
                >
                  Iniciar sesión con Google
                </button>
              </div>
            ) : isQuotaReached ? (
              <div className="bg-amber-950/40 border border-amber-500/30 p-2.5 rounded-xl text-center space-y-1">
                <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-amber-300">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                  <span>Límite diario alcanzado ({DAILY_MSG_LIMIT}/{DAILY_MSG_LIMIT})</span>
                </div>
                <p className="text-[11px] text-gray-400">
                  Has completado tus {DAILY_MSG_LIMIT} consultas gratuitas de hoy. Tu cuota se reinicia automáticamente mañana a las 00:00 para garantizar la velocidad a toda la comunidad.
                </p>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex items-center gap-2"
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Pregunta sobre precios, ofertas o la web..."
                  disabled={isLoading}
                  className="flex-1 bg-[#090d14] text-xs text-white placeholder-gray-500 rounded-xl px-3.5 py-2.5 border border-[#213044] focus:outline-none focus:border-[#38bdf8] focus:ring-1 focus:ring-[#38bdf8] transition-all disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={!inputMessage.trim() || isLoading}
                  className="p-2.5 rounded-xl bg-[#38bdf8] hover:bg-[#0284c7] text-gray-950 font-bold transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-cyan-500/10 active:scale-95"
                  title="Enviar consulta"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            )}
          </div>

        </div>
      )}
    </>
  );
};
