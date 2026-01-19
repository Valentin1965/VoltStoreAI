import React, { useEffect, useRef, useState } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { X, Mic, Volume2, Sparkles, Loader2, HeadphoneOff, MessageCircle } from 'lucide-react';

// Manual Base64 encoding for raw PCM data
function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Manual Base64 decoding for raw PCM data
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

interface LiveAssistantProps {
  onClose: () => void;
}

export const LiveAssistant: React.FC<LiveAssistantProps> = ({ onClose }) => {
  const [isConnecting, setIsConnecting] = useState(true);
  const [transcript, setTranscript] = useState('');
  const [aiStatus, setAiStatus] = useState<'idle' | 'listening' | 'speaking'>('idle');
  const [error, setError] = useState<string | null>(null);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const inputContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const sessionRef = useRef<any>(null);

  useEffect(() => {
    startSession();
    return () => {
      stopSession();
    };
  }, []);

  const stopSession = () => {
    if (sessionRef.current) {
      try { sessionRef.current.close(); } catch (e) {}
    }
    if (audioContextRef.current) audioContextRef.current.close();
    if (inputContextRef.current) inputContextRef.current.close();
    sourcesRef.current.forEach(s => {
      try { s.stop(); } catch (e) {}
    });
    sourcesRef.current.clear();
  };

  const startSession = async () => {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      audioContextRef.current = outputCtx;
      inputContextRef.current = inputCtx;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            setIsConnecting(false);
            setAiStatus('idle');
            setError(null);
            
            const source = inputCtx.createMediaStreamSource(stream);
            const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
            
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const l = inputData.length;
              const int16 = new Int16Array(l);
              for (let i = 0; i < l; i++) {
                int16[i] = Math.max(-1, Math.min(1, inputData[i])) * 32767;
              }
              
              const base64 = encode(new Uint8Array(int16.buffer));
              sessionPromise.then(s => {
                s.sendRealtimeInput({ media: { data: base64, mimeType: 'audio/pcm;rate=16000' } });
              });
            };

            source.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            const audioData = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (audioData) {
              setAiStatus('speaking');
              const bytes = decode(audioData);
              const dataInt16 = new Int16Array(bytes.buffer);
              const frameCount = dataInt16.length;
              const buffer = outputCtx.createBuffer(1, frameCount, 24000);
              const channelData = buffer.getChannelData(0);
              for (let i = 0; i < frameCount; i++) {
                channelData[i] = dataInt16[i] / 32768.0;
              }

              const source = outputCtx.createBufferSource();
              source.buffer = buffer;
              source.connect(outputCtx.destination);
              
              const now = outputCtx.currentTime;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, now);
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += buffer.duration;
              
              sourcesRef.current.add(source);
              source.onended = () => {
                sourcesRef.current.delete(source);
                if (sourcesRef.current.size === 0) setAiStatus('idle');
              };
            }

            if (message.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => {
                try { s.stop(); } catch (e) {}
              });
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
              setAiStatus('idle');
            }

            if (message.serverContent?.outputTranscription) {
              setTranscript(prev => prev + ' ' + message.serverContent!.outputTranscription!.text);
            }
          },
          onerror: (e) => {
            console.error('Live Assistant Error:', e);
            setError('Помилка з\'єднання. Спробуйте ще раз.');
            setIsConnecting(false);
          },
          onclose: () => {
            setIsConnecting(false);
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { 
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } 
          },
          systemInstruction: `Ти — експертний AI-консультант магазину VoltStore Pro. 
          Твоє ім'я — Вольт. Ти допомагаєш клієнтам обрати інвертори, сонячні панелі та акумулятори. 
          Твій стиль: професійний, дружній, лаконічний. Спілкуйся виключно українською мовою. 
          Якщо клієнт запитує про технічні деталі, давай чіткі розрахунки (наприклад, яка ємність батареї потрібна для 5 годин роботи холодильника).`,
          outputAudioTranscription: {}
        }
      });

      sessionRef.current = await sessionPromise;
    } catch (err) {
      console.error('AI Boot Error:', err);
      setError('Не вдалося отримати доступ до мікрофона або API.');
      setIsConnecting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/90 backdrop-blur-xl animate-fade-in">
      <div className="bg-white w-full max-w-xl rounded-[4rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] overflow-hidden relative border border-white/20">
        {/* Header Decor */}
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-yellow-400 to-yellow-200"></div>
        
        <button 
          onClick={onClose}
          className="absolute top-8 right-8 p-4 bg-slate-50 hover:bg-slate-100 rounded-full transition-all text-slate-400 hover:text-slate-900 z-10"
        >
          <X size={24} />
        </button>

        <div className="p-16 flex flex-col items-center text-center">
          {/* Avatar Area */}
          <div className="mb-12 relative">
            <div className={`w-44 h-44 rounded-full flex items-center justify-center transition-all duration-700 relative z-10 ${
              aiStatus === 'speaking' ? 'bg-yellow-400 scale-110' : 
              aiStatus === 'listening' ? 'bg-blue-400' : 'bg-slate-100'
            }`}>
              {isConnecting ? (
                <Loader2 className="text-slate-400 animate-spin" size={64} />
              ) : aiStatus === 'speaking' ? (
                <Volume2 className="text-yellow-950 animate-bounce" size={64} />
              ) : aiStatus === 'listening' ? (
                <Mic className="text-white animate-pulse" size={64} />
              ) : (
                <Sparkles className="text-slate-300" size={64} />
              )}
            </div>
            
            {/* Visualizer Rings */}
            {aiStatus !== 'idle' && !isConnecting && (
              <>
                <div className={`absolute -inset-8 border-2 rounded-full animate-ping opacity-20 ${aiStatus === 'speaking' ? 'border-yellow-400' : 'border-blue-400'}`}></div>
                <div className={`absolute -inset-16 border rounded-full animate-ping opacity-10 delay-300 ${aiStatus === 'speaking' ? 'border-yellow-400' : 'border-blue-400'}`}></div>
              </>
            )}
          </div>

          <h2 className="text-4xl font-black text-slate-900 mb-3 tracking-tighter">
            {isConnecting ? 'Прокидаюсь...' : error ? 'Ой, помилка' : aiStatus === 'speaking' ? 'Вольт говорить...' : 'Слухаю вас'}
          </h2>
          <p className="text-slate-500 font-bold mb-10 text-sm tracking-widest uppercase opacity-60">
            {error ? 'Щось пішло не так' : 'Ваш персональний енерго-експерт'}
          </p>

          {/* Transcript Box */}
          <div className="w-full bg-slate-50 rounded-[2.5rem] p-8 min-h-[160px] mb-12 flex flex-col items-center justify-center border border-slate-100 relative group">
            {isConnecting ? (
              <div className="flex flex-col items-center gap-4">
                <div className="flex gap-2">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce delay-100"></div>
                  <div className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce delay-200"></div>
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Налаштовую нейронні зв'язки...</span>
              </div>
            ) : error ? (
              <div className="text-red-500 flex flex-col items-center gap-4">
                <HeadphoneOff size={40} className="opacity-40" />
                <p className="font-bold text-sm">{error}</p>
                <button onClick={() => window.location.reload()} className="text-xs underline font-black uppercase tracking-widest">Перезавантажити</button>
              </div>
            ) : transcript ? (
              <div className="w-full text-left overflow-y-auto max-h-[120px] pr-2 scrollbar-hide">
                <div className="flex gap-4 items-start">
                  <MessageCircle size={18} className="text-yellow-500 shrink-0 mt-1" />
                  <p className="text-sm leading-relaxed text-slate-700 font-medium italic">"{transcript.trim()}"</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-6">
                <div className="flex gap-1.5 items-end h-10">
                  {[...Array(8)].map((_, i) => (
                    <div 
                      key={i} 
                      className="w-1.5 bg-slate-200 rounded-full animate-pulse h-full" 
                      style={{ 
                        animationDuration: `${1 + Math.random()}s`,
                        height: `${30 + Math.random() * 70}%`
                      }}
                    ></div>
                  ))}
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-300">Очікую на ваше запитання</span>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="flex gap-6 w-full">
            <button 
              onClick={onClose}
              className="flex-1 py-5 rounded-3xl bg-slate-100 font-black text-slate-500 hover:bg-slate-200 transition-all uppercase tracking-widest text-xs"
            >
              Завершити
            </button>
            <button 
              disabled={isConnecting}
              className="flex-[2] py-5 rounded-3xl bg-yellow-400 text-yellow-950 font-black text-lg shadow-2xl shadow-yellow-100 flex items-center justify-center gap-4 active:scale-95 transition-all disabled:opacity-50"
            >
              {aiStatus === 'listening' ? (
                <>
                  <div className="w-2 h-2 bg-yellow-950 rounded-full animate-ping"></div>
                  Говоріть...
                </>
              ) : (
                <>
                  <Mic size={24} /> Натисніть та запитайте
                </>
              )}
            </button>
          </div>
        </div>
      </div>
      
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in {
          animation: fade-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  );
};
