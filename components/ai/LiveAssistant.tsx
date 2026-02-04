import React, { useState, useRef, useEffect } from 'react';
import { X, Zap, Send, Loader2, MessageSquare } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

const KNOWLEDGE_BASE = [
  { keywords: ['price', 'ціна', 'вартість'], response: "Всі актуальні ціни вказані в нашому каталозі. Ви можете обрати валюту (€, $, DKK) у верхній частині сайту." },
  { keywords: ['delivery', 'доставка'], response: "Ми доставляємо обладнання по всій Скандинавії та Європі. Термін доставки зазвичай становить 3-7 робочих днів." },
  { keywords: ['warranty', 'гарантія'], response: "На всі інвертори діє гарантія 5-10 років, на сонячні панелі - до 25 років на продуктивність." },
  { keywords: ['contact', 'контакти', 'телефон'], response: "Ви можете зателефонувати нам за номером +45 31 18 58 19 або напишіть на info@glsolargroup.dk." },
  { keywords: ['victron', 'deye', 'fronius'], response: "Ми працюємо з найкращими брендами: Victron Energy, Deye, BYD та Fronius. Це найнадійніше обладнання на ринку." }
];

export const LiveAssistant: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'ai'; text: string }[]>([
    { role: 'ai', text: "Вітаю! Я експерт Green Light. Як я можу допомогти вам з вибором сонячної системи?" }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;

    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);

    // Expert logic instead of unstable AI
    setTimeout(() => {
      const lowerMsg = userMsg.toLowerCase();
      let foundResponse = "Дякую за запитання! Для детальної технічної консультації, будь ласка, залиште свій номер телефону або напишіть нам на пошту info@glsolargroup.dk.";

      for (const item of KNOWLEDGE_BASE) {
        if (item.keywords.some(k => lowerMsg.includes(k))) {
          foundResponse = item.response;
          break;
        }
      }

      setMessages(prev => [...prev, { role: 'ai', text: foundResponse }]);
      setLoading(false);
    }, 600);
  };

  return (
    <div className="fixed bottom-6 right-6 z-[100]">
      {!isOpen ? (
        <button onClick={() => setIsOpen(true)} className="p-4 rounded-full shadow-2xl hover:scale-110 transition-all flex items-center gap-2 bg-slate-900 text-white">
          <Zap size={18} className="text-yellow-400 fill-yellow-400" />
          <span className="font-bold text-xs pr-2">Volt Expert</span>
        </button>
      ) : (
        <div className="bg-white w-[320px] h-[450px] rounded-[2rem] shadow-3xl border border-slate-100 overflow-hidden animate-fade-in flex flex-col">
          <div className="bg-slate-900 p-5 flex justify-between items-center text-white">
            <div className="flex items-center gap-2">
              <Zap size={14} className="text-yellow-400" />
              <span className="font-black text-[9px] uppercase tracking-widest">Expert Support</span>
            </div>
            <button onClick={() => setIsOpen(false)}><X size={18}/></button>
          </div>
          <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/50">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-3 rounded-xl text-[10px] font-medium ${
                  m.role === 'user' ? 'bg-slate-900 text-white' : 'bg-white border border-slate-100 text-slate-700 shadow-sm'
                }`}>
                  {m.text}
                </div>
              </div>
            ))}
            {loading && <Loader2 size={16} className="animate-spin text-emerald-500 mx-auto" />}
            <div ref={chatEndRef} />
          </div>
          <div className="p-3 bg-white border-t border-slate-100 flex gap-2">
            <input value={input} onChange={e => setInput(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleSend()} placeholder="Запитайте щось..." className="flex-1 bg-slate-50 rounded-lg px-3 py-2 text-[10px] outline-none" />
            <button onClick={handleSend} className="bg-slate-900 text-white p-2 rounded-lg"><Send size={14} /></button>
          </div>
        </div>
      )}
    </div>
  );
};