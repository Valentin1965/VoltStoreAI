import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Blob } from '@google/genai';
import { Mic, MicOff, X, Zap, Loader2 } from 'lucide-react';

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function createBlob(data: Float32Array): Blob {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}

export const LiveAssistant: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [transcription, setTranscription] = useState<string[]>([]);
  
  const audioContextsRef = useRef<{ input: AudioContext; output: AudioContext } | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const sessionRef = useRef<any>(null);

  const stopSession = () => {
    if (sessionRef.current) {
      try { sessionRef.current.close(); } catch (e) {}
      sessionRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (audioContextsRef.current) {
      audioContextsRef.current.input.close();
      audioContextsRef.current.output.close();
      audioContextsRef.current = null;
    }
    for (const source of sourcesRef.current) {
      try { source.stop(); } catch (e) {}
    }
    sourcesRef.current.clear();
    setIsActive(false);
    setIsConnecting(false);
  };

  const startSession = async () => {
    setIsConnecting(true);
    try {
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      audioContextsRef.current = { input: inputCtx, output: outputCtx };
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            setIsActive(true);
            setIsConnecting(false);
            
            const source = inputCtx.createMediaStreamSource(stream);
            const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmBlob = createBlob(inputData);
              sessionPromise.then(session => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio && audioContextsRef.current) {
              const { output: ctx } = audioContextsRef.current;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              const audioBuffer = await decodeAudioData(decode(base64Audio), ctx, 24000, 1);
              const source = ctx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(ctx.destination);
              source.addEventListener('ended', () => sourcesRef.current.delete(source));
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              sourcesRef.current.add(source);
            }

            if (message.serverContent?.outputTranscription?.text) {
              const text = message.serverContent.outputTranscription.text;
              setTranscription(prev => [...prev, text]);
            }

            if (message.serverContent?.interrupted) {
              for (const source of sourcesRef.current) {
                try { source.stop(); } catch (e) {}
              }
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
          },
          onerror: () => stopSession(),
          onclose: () => stopSession(),
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } },
          },
          outputAudioTranscription: {},
          systemInstruction: 'Ви — інтелектуальний асистент магазину VoltStore. Допомагайте клієнтам підібрати енергетичне обладнання.',
        }
      });

      sessionRef.current = await sessionPromise;
    } catch (err) {
      console.error("Failed to connect:", err);
      stopSession();
    }
  };

  useEffect(() => {
    return () => stopSession();
  }, []);

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
                Привіт! Натисніть кнопку нижче, щоб розпочати голосову консультацію
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