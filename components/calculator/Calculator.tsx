import React, { useState, useMemo } from 'react';
import { useNotification } from '../../contexts/NotificationContext';
import { useCart } from '../../contexts/CartContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { 
  RotateCcw, Check, Zap, Settings2, Target, Wallet, Sparkles, Activity, ShoppingCart 
} from 'lucide-react';
import { KitComponent } from '../../types';

export const Calculator: React.FC<{ initialStep?: 1 | 3 }> = ({ initialStep = 1 }) => {
  const [step, setStep] = useState<1 | 3>(initialStep as 1 | 3); 
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ title: string; description: string; } | null>(null);
  const [activeComponents, setActiveComponents] = useState<KitComponent[]>([]);
  
  const { addNotification } = useNotification();
  const { addItem } = useCart();
  const { formatPrice } = useLanguage();
  
  const [config, setConfig] = useState({ 
    objectType: 'Приватний будинок', 
    monthlyUsage: '300-600 кВт*год', 
    purpose: 'Резерв', 
    budget: 'Оптимальний'
  });

  const generateAiSolution = async () => {
    const apiKey = "AIzaSyDhNAK8S9_HQdCQD-y9nkY_d9IaLOmm9tg";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    setLoading(true);
    try {
      const prompt = `Експерт із сонячної енергії. Спроектуй систему: Об'єкт: ${config.objectType}, Споживання: ${config.monthlyUsage}, Мета: ${config.purpose}. Поверни ТІЛЬКИ JSON: { "title": "назва", "description": "опис", "components": [{"name": "item", "price": 100, "quantity": 1}] }`;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json", temperature: 0.1 }
        })
      });

      if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);

      const resData = await response.json();
      const rawText = resData.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) throw new Error("Empty AI response");
      
      const data = JSON.parse(rawText);
      setResult({ title: data.title, description: data.description });
      
      const components: KitComponent[] = (data.components || []).map((c: any) => ({
        id: `ai-${Math.random().toString(36).substr(2, 9)}`,
        name: c.name,
        price: Number(c.price),
        quantity: Number(c.quantity),
        alternatives: []
      }));

      setActiveComponents(components);
      setStep(3);
    } catch (err: any) {
      console.error('AI Error:', err);
      addNotification("Помилка ШІ. Спробуйте ще раз.", "error");
    } finally {
      setLoading(false);
    }
  };

  const totalPrice = useMemo(() => 
    activeComponents.reduce((s, c) => s + (c.price * c.quantity), 0)
  , [activeComponents]);

  const Selector = ({ label, icon: Icon, value, options, onChange }: any) => (
    <div className="space-y-3">
      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
        <Icon size={12} className="text-yellow-500" /> {label}
      </label>
      <div className="flex flex-col gap-2">
        {options.map((opt: string) => (
          <button 
            key={opt} 
            onClick={() => onChange(opt)} 
            className={`p-4 rounded-2xl border-2 text-left font-bold transition-all flex justify-between items-center ${value === opt ? 'border-yellow-400 bg-yellow-50 text-yellow-950' : 'border-slate-50 bg-slate-50 text-slate-400'}`}
          >
            <span className="text-[11px] uppercase tracking-tight">{opt}</span>
            {value === opt && <Check size={14} className="text-yellow-600" />}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto py-6 px-4 pb-20">
      <div className="bg-white rounded-[3rem] border border-slate-100 shadow-2xl relative min-h-[500px] overflow-hidden">
        {loading && (
          <div className="absolute inset-0 z-[60] bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center">
            <div className="w-12 h-12 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-[10px] font-black uppercase tracking-widest">Архітектор працює...</p>
          </div>
        )}
        <div className="p-8 md:p-12">
          {step === 1 ? (
            <div className="space-y-10">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <Selector label="Об'єкт" icon={Settings2} value={config.objectType} options={['Приватний будинок', 'Бізнес', 'Квартира']} onChange={(v:any)=>setConfig({...config, objectType:v})}/>
                <Selector label="Споживання" icon={Activity} value={config.monthlyUsage} options={['< 300 кВт*год', '300-600 кВт*год', '600+ кВт*год']} onChange={(v:any)=>setConfig({...config, monthlyUsage:v})}/>
                <Selector label="Ціль" icon={Target} value={config.purpose} options={['Резерв', 'Автономність', 'Економія']} onChange={(v:any)=>setConfig({...config, purpose:v})}/>
                <Selector label="Бюджет" icon={Wallet} value={config.budget} options={['Економ', 'Оптимальний', 'Преміум']} onChange={(v:any)=>setConfig({...config, budget:v})}/>
              </div>
              <button onClick={generateAiSolution} className="w-full bg-slate-900 text-white py-6 rounded-3xl font-black uppercase tracking-widest hover:bg-yellow-400 hover:text-yellow-950 transition-all flex items-center justify-center gap-4">
                Розрахувати систему <Zap size={20} className="text-yellow-400" />
              </button>
            </div>
          ) : (
            <div className="space-y-10">
              <div className="flex justify-between items-center border-b pb-8">
                <div>
                  <h2 className="text-2xl font-black uppercase tracking-tighter">{result?.title}</h2>
                  <p className="text-[10px] text-slate-500 font-bold mt-2">{result?.description}</p>
                </div>
                <button onClick={() => setStep(1)} className="px-6 py-3 bg-slate-50 rounded-2xl text-[10px] font-black uppercase text-slate-400 hover:text-yellow-600">
                  <RotateCcw size={12}/> Назад
                </button>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                <div className="lg:col-span-2 space-y-4">
                  {activeComponents.map((c, i) => (
                    <div key={i} className="p-6 bg-slate-50 rounded-2xl flex justify-between items-center">
                      <div>
                        <div className="font-black text-slate-900 text-[11px] uppercase">{c.name}</div>
                        <div className="text-[9px] text-slate-400 font-bold uppercase">{c.quantity} од.</div>
                      </div>
                      <div className="font-black text-slate-900">{formatPrice(c.price * c.quantity)}</div>
                    </div>
                  ))}
                </div>
                <div className="bg-slate-950 p-10 rounded-[3rem] text-center text-white">
                   <div className="text-[9px] font-black text-slate-500 uppercase mb-4">Разом</div>
                   <div className="text-4xl font-black text-yellow-400 mb-8">{formatPrice(totalPrice)}</div>
                   <button onClick={() => addItem({ id: 'ai-'+Date.now(), name: result?.title || '', price: totalPrice, category: 'Kits', image: '', stock: 1 })} className="w-full bg-yellow-400 text-yellow-950 py-5 rounded-2xl font-black uppercase text-[10px] hover:bg-white">
                      В кошик
                   </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
