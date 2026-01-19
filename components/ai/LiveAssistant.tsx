
import React, { useState, useRef } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { Mic, MicOff, X, Zap, Loader2 } from 'lucide-react';

export const LiveAssistant: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [transcription, setTranscription] = useState<string[]>([]);
  
  const sessionRef = useRef<any>(null);

  const startSession = async () => {
    setIsConnecting(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            setIsActive(true);
            setIsConnecting(false);
          },
          onmessage: async (message: LiveServerMessage) => {
            // Безпечна перевірка для усунення помилки TS18048
            const serverContent = message.serverContent;
            if (serverContent && serverContent.modelTurn && serverContent.modelTurn.parts) {
              const parts = serverContent.modelTurn.parts;
              if (parts.length > 0) {
                const audioPart = parts.find(p => p.inlineData);
                if (audioPart && audioPart.inlineData) {
                  console.log("Отримано аудіо дані");
                }
              }
            }

            if (serverContent && serverContent.outputTranscription && serverContent.outputTranscription.text) {
              const text = serverContent.outputTranscription.text;
              setTranscription(prev => [...prev, text]);
            }
          },
          onerror: (e) => {
            console.error("Live Error:", e);
            setIsActive(false);
            setIsConnecting(false);
          },
          onclose: () => {
            setIsActive(false);
            setIsConnecting(false);
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: 'Ви — інтелектуальний асистент магазину VoltStore. Допомагайте клієнтам підібрати енергетичне обладнання.',
        }
      });

      const session = await sessionPromise;
      sessionRef.current = session;
    } catch (err) {
      console.error(err);
      setIsConnecting(false);
    }
  };

  const stopSession = () => {
    if (sessionRef.current) {
      try {
        sessionRef.current.close();
      } catch (e) {
        console.error("Close error:", e);
      }
      sessionRef.current = null;
    }
    setIsActive(false);
  };

  return (
    <div className="fixed bottom-6 right-6 z-[100]">
      {!isOpen ? (
        <button 
          onClick={() => setIsOpen(true)}
          className="bg-slate-900 text-white p-4 rounded-full shadow-2xl hover:scale-110 transition-all flex items-center gap-2 group"
        >
          <div className="bg-yellow-400 p-1.5 rounded-full group-hover:rotate-12 transition-transform">
            <Zap size={18} className="text-yellow-950 fill-yellow-950" />
          </div>
          <span className="font-bold text-xs pr-2">AI Консультант</span>
        </button>
      ) : (
        <div className="bg-white w-80 rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden animate-fade-in">
          <div className="bg-slate-900 p-6 flex justify-between items-center text-white">
            <div className="flex items-center gap-2">
              <div className="bg-yellow-400 p-1 rounded-lg">
                <Zap size={14} className="text-slate-900 fill-slate-900" />
              </div>
              <span className="font-black text-[10px] uppercase tracking-widest">Volt Voice AI</span>
            </div>
            <button onClick={() => { stopSession(); setIsOpen(false); }} className="text-slate-400 hover:text-white transition-colors"><X size={18}/></button>
          </div>
          
          <div className="p-6 h-64 overflow-y-auto flex flex-col gap-3 bg-slate-50/50">
            {transcription.length === 0 && !isConnecting && (
              <p className="text-[10px] text-slate-400 text-center font-bold mt-12 px-4 leading-relaxed uppercase tracking-widest">
                Привіт! Натисніть кнопку нижче, щоб розпочати консультацію
              </p>
            )}
            {isConnecting && (
              <div className="flex flex-col items-center justify-center h-full gap-3">
                <Loader2 className="animate-spin text-yellow-500" size={24} />
                <p className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em]">Підключення...</p>
              </div>
            )}
            {transcription.map((t, i) => (
              <div key={i} className="bg-white p-4 rounded-2xl text-[11px] font-medium text-slate-700 shadow-sm border border-slate-100 animate-fade-in leading-relaxed">
                {t}
              </div>
            ))}
          </div>

          <div className="p-6 bg-white border-t border-slate-100 flex justify-center">
            <button 
              onClick={isActive ? stopSession : startSession}
              disabled={isConnecting}
              className={`w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-xl active:scale-90 ${
                isActive ? 'bg-red-500 text-white animate-pulse' : 'bg-yellow-400 text-yellow-950 hover:bg-yellow-500'
              } disabled:opacity-50`}
            >
              {isActive ? <MicOff size={20} /> : <Mic size={20} />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
