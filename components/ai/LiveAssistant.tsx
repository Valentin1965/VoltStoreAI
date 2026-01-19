
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { Mic, MicOff, MessageSquare, X, Zap, Loader2 } from 'lucide-react';

export const LiveAssistant: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [transcription, setTranscription] = useState<string[]>([]);
  
  const audioContextRef = useRef<AudioContext | null>(null);
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
            // Безпечна перевірка наявності даних для відтворення аудіо (Fix TS18048)
            const audioData = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audioData) {
              console.log("Отримано аудіо відповідь");
            }

            if (message.serverContent?.outputTranscription) {
              setTranscription(prev => [...prev, message.serverContent!.outputTranscription!.text]);
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
          systemInstruction: 'Ви асистент магазину VoltStore. Допомагайте клієнтам обрати інвертори та акумулятори.',
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
      sessionRef.current.close();
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
          <span className="font-bold text-xs pr-2">AI Асистент</span>
        </button>
      ) : (
        <div className="bg-white w-80 rounded-[2rem] shadow-2xl border border-slate-100 overflow-hidden animate-fade-in">
          <div className="bg-slate-900 p-6 flex justify-between items-center text-white">
            <div className="flex items-center gap-2">
              <Zap size={16} className="text-yellow-400" />
              <span className="font-black text-[10px] uppercase tracking-widest">Volt Voice AI</span>
            </div>
            <button onClick={() => { stopSession(); setIsOpen(false); }} className="text-slate-400 hover:text-white"><X size={18}/></button>
          </div>
          
          <div className="p-8 h-64 overflow-y-auto flex flex-col gap-4 bg-slate-50/50">
            {transcription.length === 0 && !isConnecting && (
              <p className="text-[10px] text-slate-400 text-center font-bold mt-10">Натисніть на мікрофон, щоб почати розмову</p>
            )}
            {isConnecting && (
              <div className="flex flex-col items-center justify-center h-full gap-3">
                <Loader2 className="animate-spin text-yellow-500" />
                <p className="text-[10px] font-black uppercase text-slate-400">Підключення...</p>
              </div>
            )}
            {transcription.map((t, i) => (
              <div key={i} className="bg-white p-3 rounded-2xl text-[11px] font-medium text-slate-700 shadow-sm border border-slate-100">{t}</div>
            ))}
          </div>

          <div className="p-6 bg-white border-t border-slate-100 flex justify-center">
            <button 
              onClick={isActive ? stopSession : startSession}
              disabled={isConnecting}
              className={`w-16 h-16 rounded-full flex items-center justify-center transition-all shadow-xl ${
                isActive ? 'bg-red-500 text-white animate-pulse' : 'bg-yellow-400 text-yellow-950 hover:bg-yellow-500'
              } disabled:opacity-50`}
            >
              {isActive ? <MicOff size={24} /> : <Mic size={24} />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
