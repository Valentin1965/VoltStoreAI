
import React, { useState, useRef, useEffect } from 'react';
import { X, Zap, Send, Loader2 } from 'lucide-react';

const LOCAL_RESPONSES: Record<string, string> = {
  default: "I'm the Volt Expert assistant. How can I help you today? You can ask about prices, delivery, or warranty.",
  price: "Current prices are available in our catalog. You can switch between EUR, DKK, NOK, and SEK using the currency selector in the header.",
  delivery: "We provide delivery across Scandinavia and Europe. Typical delivery time is 3-7 business days depending on your location.",
  warranty: "All our inverters come with a 5-10 year warranty. Solar panels have a performance warranty of up to 25 years.",
  contact: "You can reach our team at +45 31 18 58 19 or via email at info@glsolargroup.dk.",
  victron: "We are official distributors of Victron Energy equipment. Their products are known for extreme reliability in off-grid systems.",
  battery: "We recommend Pylontech or BYD batteries for home storage. They offer high cycle life and deep discharge capabilities.",
  calculation: "I recommend using our 'Constructor' tool in the main navigation to build a custom system based on your consumption."
};

export const LiveAssistant: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'model'; text: string }[]>([
    { role: 'model', text: "Hello! I am a Green Light expert. How can I help you choose a solar system?" }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim() || loading) return;

    const userMsg = input.toLowerCase();
    setMessages(prev => [...prev, { role: 'user', text: input }]);
    setInput('');
    setLoading(true);

    // Simulate local processing delay for realism
    setTimeout(() => {
      let botText = LOCAL_RESPONSES.default;

      if (userMsg.includes('price') || userMsg.includes('cost') || userMsg.includes('much')) {
        botText = LOCAL_RESPONSES.price;
      } else if (userMsg.includes('deliver') || userMsg.includes('ship')) {
        botText = LOCAL_RESPONSES.delivery;
      } else if (userMsg.includes('warranty') || userMsg.includes('guarantee')) {
        botText = LOCAL_RESPONSES.warranty;
      } else if (userMsg.includes('contact') || userMsg.includes('call') || userMsg.includes('email')) {
        botText = LOCAL_RESPONSES.contact;
      } else if (userMsg.includes('victron') || userMsg.includes('deye')) {
        botText = LOCAL_RESPONSES.victron;
      } else if (userMsg.includes('battery') || userMsg.includes('storage')) {
        botText = LOCAL_RESPONSES.battery;
      } else if (userMsg.includes('calculate') || userMsg.includes('help') || userMsg.includes('build')) {
        botText = LOCAL_RESPONSES.calculation;
      }

      setMessages(prev => [...prev, { role: 'model', text: botText }]);
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
            <input 
              value={input} 
              onChange={e => setInput(e.target.value)} 
              onKeyPress={e => e.key === 'Enter' && handleSend()} 
              placeholder="Ask something..." 
              className="flex-1 bg-slate-50 rounded-lg px-3 py-2 text-[10px] outline-none" 
              disabled={loading}
            />
            <button 
              onClick={handleSend} 
              className="bg-slate-900 text-white p-2 rounded-lg hover:bg-emerald-600 transition-all disabled:opacity-50"
              disabled={loading}
            >
              <Send size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
