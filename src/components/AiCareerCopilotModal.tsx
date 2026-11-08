import React, { useState } from 'react';
import { 
  X, 
  Sparkles, 
  Send, 
  Bot, 
  User, 
  Loader2, 
  Search, 
  TrendingUp, 
  BrainCircuit, 
  HelpCircle,
  Building2
} from 'lucide-react';
import { useInternTrack } from '../context/InternTrackContext';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export const AiCareerCopilotModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Ciao Alex! Sono il tuo Career Copilot alimentato da Gemini. Conosco il tuo percorso (Ingegneria Gestionale e MSc Innovation & Entrepreneurship presso una business school europea) e il tuo obiettivo di entrare come Founder Associate, Growth Manager o Venture Builder da gennaio 2027.\n\nCome posso aiutarti oggi? Posso analizzare un annuncio, prepararti per un case study, cercare nuove scale-up europee o simulare una negoziazione d\'offerta.'
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSend = async (customPrompt?: string) => {
    const textToSend = customPrompt || inputValue;
    if (!textToSend.trim() || isLoading) return;

    const userMsg: Message = { role: 'user', content: textToSend };
    setMessages(prev => [...prev, userMsg]);
    if (!customPrompt) setInputValue('');
    setIsLoading(true);

    try {
      // If it looks like a company discovery prompt
      if (textToSend.toLowerCase().includes('cerca') || textToSend.toLowerCase().includes('scale-up') || textToSend.toLowerCase().includes('aziende')) {
        const res = await fetch('/api/ai/search-companies', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: 'Founder Associate', country: 'Europa' }),
        });
        const data = await res.json();
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: data.text || 'Ecco le informazioni trovate tramite Google Search grounding.'
        }]);
      } else {
        const res = await fetch('/api/ai/copilot-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [...messages, userMsg],
            question: textToSend
          }),
        });
        const data = await res.json();
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: data.text || 'Ho elaborato la tua richiesta considerando il tuo profilo e i tuoi obiettivi.'
        }]);
      }
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Si è verificato un errore durante la connessione con Gemini. Riprova tra poco.'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-md overflow-y-auto">
      <div className="max-w-2xl w-full my-auto rounded-[28px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-white/60 dark:border-white/10 shadow-2xl overflow-hidden flex flex-col h-[80vh]">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Gemini AI Career Copilot
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                  Gemini 2.5 Flash
                </span>
              </h2>
              <p className="text-[11px] text-slate-500">
                Assistente strategico integrato per il tuo percorso di carriera
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Suggestion Chips */}
        <div className="px-4 py-2 bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2 overflow-x-auto text-[11px]">
          <button
            onClick={() => handleSend('Cerca nuove scale-up in Italia e Germania con posizioni Founder Associate aperte')}
            className="px-3 py-1 rounded-full bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-blue-50 whitespace-nowrap shrink-0"
          >
            🔍 Cerca scale-up con Google Search
          </button>
          <button
            onClick={() => handleSend('Come posso valorizzare al massimo il mio progetto di venture studio per un colloquio in Bending Spoons?')}
            className="px-3 py-1 rounded-full bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-blue-50 whitespace-nowrap shrink-0"
          >
            💡 Valorizza progetto venture studio
          </button>
          <button
            onClick={() => handleSend('Quali sono le metriche unit economics più richieste per un ruolo di Growth Manager?')}
            className="px-3 py-1 rounded-full bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-blue-50 whitespace-nowrap shrink-0"
          >
            📊 Metriche chiave Growth
          </button>
        </div>

        {/* Messages Stream */}
        <div className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-4 text-xs">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-[85%] p-3.5 rounded-2xl whitespace-pre-line leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white rounded-tr-xs'
                    : 'bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 border border-slate-200/60 dark:border-slate-700/60 rounded-tl-xs'
                }`}
              >
                {msg.content}
              </div>

              {msg.role === 'user' && (
                <div className="w-7 h-7 rounded-lg bg-orange-500 text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                  MB
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex items-center gap-2 text-slate-400 text-xs py-2">
              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
              <span>Gemini sta analizzando ed elaborando la risposta...</span>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="p-3.5 border-t border-slate-100 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 flex items-center gap-2">
          <input
            type="text"
            placeholder="Chiedi un consiglio strategico, chiedi di analizzare un'offerta o un annuncio..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            className="flex-1 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={() => handleSend()}
            disabled={!inputValue.trim() || isLoading}
            className="w-9 h-9 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white flex items-center justify-center shrink-0 shadow-xs transition-all"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
};
