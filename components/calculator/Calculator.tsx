
import React, { useState, useMemo, useEffect } from 'react';
import { useNotification } from '../../contexts/NotificationContext';
import { useCart } from '../../contexts/CartContext';
import { 
  Sparkles, 
  ArrowRight, 
  RotateCcw, 
  Check, 
  Loader2, 
  ShieldCheck, 
  Activity, 
  Cpu, 
  Zap, 
  Settings2,
  RefreshCw,
  ChevronRight
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { KitComponent, Alternative } from '../../types';

const OFFLINE_TEMPLATES = {
  optimal: {
    title: "Оптимальна Енергосистема Pro",
    description: "На основі вашого профілю ми зібрали надійний комплект. Ви можете замінити будь-який компонент на аналог від іншого бренду.",
    components: [
      { 
        id: 'inv-deye-5', name: 'Гібридний інвертор Deye 5кВт', price: 42000, quantity: 1, 
        alternatives: [
          { id: 'inv-lux-5', name: 'Luxpower SNA5000 Eco', price: 34500 },
          { id: 'inv-must-5', name: 'Must PH18-5248 PRO', price: 22800 }
        ]
      },
      { 
        id: 'bat-pylon-5', name: 'АКБ Pylontech US5000 4.8кВт', price: 68000, quantity: 1,
        alternatives: [
          { id: 'bat-dyn-5', name: 'Dyness A48100 4.8кВт', price: 59500 }
        ]
      },
      { 
        id: 'panel-jinko-450', name: 'Панель Jinko Solar 450Вт MBB', price: 8500, quantity: 4,
        alternatives: [
          { id: 'panel-longi-540', name: 'Longi Solar 540Вт Hi-MO 5', price: 9400 }
        ]
      }
    ]
  }
};

export interface CalculatorProps {
  initialStep?: 1 | 2;
}

export const Calculator: React.FC<CalculatorProps> = ({ initialStep }) => {
  const [step, setStep] = useState<1 | 3>(1); 
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ title: string; description: string; } | null>(null);
  const [activeComponents, setActiveComponents] = useState<KitComponent[]>([]);
  const [editingCompId, setEditingCompId] = useState<string | null>(null);
  
  const { addNotification } = useNotification();
  const { addItem } = useCart();
  
  const [config, setConfig] = useState({
    objectType: 'Приватний будинок',
    monthlyUsage: '300-600 кВт·год',
    purpose: 'Резервне живлення',
    budget: 'Оптимальний'
  });

  useEffect(() => {
    if (initialStep === 2) {
      useFallback();
    }
  }, [initialStep]);

  const handleCalculate = async () => {
    setLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Ви енергетичний експерт. Створіть оптимальний набір обладнання для: ${config.objectType}, середнє споживання: ${config.monthlyUsage}. 
      Об'єкт потребує: ${config.purpose}.
      Поверніть ТІЛЬКИ чистий JSON без Markdown розмітки: {
        "title": "Персональна система живлення", 
        "description": "Комплект підібраний під профіль ${config.objectType}", 
        "components": [
          {
            "id": "ai-inv-1", 
            "name": "Гібридний інвертор 5кВт Premium", 
            "price": 48500, 
            "quantity": 1, 
            "alternatives": [
              {"id": "alt-inv-1", "name": "Standard Inverter 5kW", "price": 36000}
            ]
          },
          {
            "id": "ai-bat-1", 
            "name": "Акумулятор LiFePO4 5кВт*год Pro", 
            "price": 68000, 
            "quantity": 1, 
            "alternatives": [
              {"id": "alt-bat-1", "name": "Eco Battery 5kW", "price": 54000}
            ]
          }
        ]
      }`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });

      const data = JSON.parse(response.text || '{}');
      setResult({ title: data.title, description: data.description });
      setActiveComponents(data.components || []);
      setStep(3);
      addNotification('AI сформував пропозицію', 'success');
    } catch (err) {
      console.error("AI Error:", err);
      useFallback();
    } finally {
      setLoading(false);
    }
  };

  const useFallback = () => {
    const template = OFFLINE_TEMPLATES.optimal;
    setResult({ title: template.title, description: template.description });
    setActiveComponents(template.components as any);
    setStep(3);
    addNotification('Використано стандартний шаблон', 'info');
  };

  const replaceComponent = (componentId: string, alt: Alternative) => {
    setActiveComponents(prev => prev.map(comp => {
      if (comp.id === componentId) {
        // Swap: existing becomes an alternative
        const currentAsAlt = { id: comp.id, name: comp.name, price: comp.price };
        const newAlts = [currentAsAlt, ...comp.alternatives.filter(a => a.id !== alt.id)];
        return { ...comp, id: alt.id, name: alt.name, price: alt.price, alternatives: newAlts };
      }
      return comp;
    }));
    setEditingCompId(null);
    addNotification('Конфігурацію оновлено', 'success');
  };

  const totalPrice = useMemo(() => 
    activeComponents.reduce((sum, c) => sum + (c.price * c.quantity), 0)
  , [activeComponents]);

  return (
    <div className="max-w-5xl mx-auto py-6 animate-fade-in relative pb-20 px-4">
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 bg-slate-900 text-yellow-400 px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-4 shadow-xl">
          <Cpu size={14} className="animate-pulse" /> Energy Architect
        </div>
        <h1 className="text-5xl font-black text-slate-900 tracking-tighter uppercase mb-4 leading-none">
          підбір комплекту
        </h1>
      </div>

      <div className="bg-white rounded-[3.5rem] border border-slate-100 shadow-[0_32px_120px_-20px_rgba(0,0,0,0.1)] overflow-hidden min-h-[500px] relative">
        {loading && (
          <div className="absolute inset-0 z-[60] bg-white/90 backdrop-blur-xl flex flex-col items-center justify-center gap-6 animate-fade-in">
            <Loader2 className="text-yellow-500 animate-spin" size={64} />
            <p className="text-sm font-black text-slate-900 uppercase tracking-[0.3em] animate-pulse">Проектування системи...</p>
          </div>
        )}

        <div className="p-8 md:p-14">
          {step === 1 && (
            <div className="max-w-3xl mx-auto space-y-12 animate-fade-in">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-2">
                    <Settings2 size={12} /> Мій Об'єкт
                  </label>
                  <div className="grid grid-cols-1 gap-3">
                    {['Приватний будинок', 'Квартира / Офіс', 'Бізнес'].map(t => (
                      <button 
                        key={t} 
                        onClick={() => setConfig({...config, objectType: t})} 
                        className={`p-6 rounded-[2rem] border-2 text-left font-bold transition-all flex justify-between items-center ${config.objectType === t ? 'border-yellow-400 bg-yellow-50 text-yellow-950 shadow-sm' : 'border-slate-50 bg-slate-50/50 text-slate-400 hover:border-slate-200'}`}
                      >
                        <span className="text-sm uppercase tracking-tight">{t}</span>
                        {config.objectType === t && <Check size={18} className="text-yellow-600" />}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-2">
                    <Activity size={12} /> Споживання
                  </label>
                  <div className="grid grid-cols-1 gap-3">
                    {['< 300 кВт·год', '300-600 кВт·год', '600+ кВт·год'].map(u => (
                      <button 
                        key={u} 
                        onClick={() => setConfig({...config, monthlyUsage: u})} 
                        className={`p-6 rounded-[2rem] border-2 text-left font-bold transition-all flex justify-between items-center ${config.monthlyUsage === u ? 'border-yellow-400 bg-yellow-50 text-yellow-950 shadow-sm' : 'border-slate-50 bg-slate-50/50 text-slate-400 hover:border-slate-200'}`}
                      >
                        <span className="text-sm uppercase tracking-tight">{u}</span>
                        {config.monthlyUsage === u && <Check size={18} className="text-yellow-600" />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button 
                onClick={handleCalculate} 
                className="w-full bg-slate-900 text-white py-6 rounded-[2.5rem] font-black flex items-center justify-center gap-4 hover:bg-slate-800 transition-all shadow-2xl mt-10 group uppercase tracking-widest"
              >
                пропозиція <Sparkles size={20} className="text-yellow-400 group-hover:rotate-12 transition-transform" />
              </button>
            </div>
          )}

          {step === 3 && result && (
            <div className="animate-fade-in space-y-12">
              <div className="flex justify-between items-center gap-6 border-b border-slate-100 pb-8">
                <div>
                  <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter leading-none">{result.title}</h2>
                  <p className="text-[10px] text-slate-500 mt-2 uppercase font-bold tracking-wider max-w-xl">{result.description}</p>
                </div>
                <button 
                  onClick={() => setStep(1)} 
                  className="p-4 bg-slate-50 rounded-2xl text-slate-300 hover:text-yellow-600 hover:bg-yellow-50 transition-all shadow-sm"
                >
                  <RotateCcw size={24}/>
                </button>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
                <div className="lg:col-span-2 space-y-4">
                  <div className="flex items-center gap-2 mb-4 px-2">
                    <ShieldCheck className="text-green-500" size={18} />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Персоналізована збірка</span>
                  </div>
                  
                  {activeComponents.map(c => (
                    <div key={c.id} className="flex flex-col gap-2">
                      <div className="p-7 bg-white rounded-[2.5rem] border border-slate-100 flex justify-between items-center group hover:border-yellow-300 transition-all shadow-sm">
                        <div className="flex items-center gap-5">
                          <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-yellow-400 group-hover:text-yellow-950 transition-all">
                            <Zap size={22} />
                          </div>
                          <div>
                            <div className="font-black text-slate-900 text-[12px] uppercase truncate max-w-[220px] tracking-tight">{c.name}</div>
                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tight mt-0.5">
                              {c.quantity} шт • ₴{c.price.toLocaleString()}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          {c.alternatives && c.alternatives.length > 0 && (
                            <button 
                              onClick={() => setEditingCompId(editingCompId === c.id ? null : c.id)}
                              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                                editingCompId === c.id ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                              }`}
                            >
                              <RefreshCw size={14} className={editingCompId === c.id ? 'animate-spin' : ''} />
                              {editingCompId === c.id ? 'Закрити' : 'Змінити'}
                            </button>
                          )}
                          <div className="font-black text-slate-900 text-right w-28 text-sm tracking-tighter">₴{(c.price * c.quantity).toLocaleString()}</div>
                        </div>
                      </div>

                      {editingCompId === c.id && c.alternatives && (
                        <div className="mx-6 p-5 bg-slate-50/50 rounded-[2rem] border border-slate-100 animate-fade-in space-y-3 shadow-inner">
                          <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 px-2">Виберіть аналог:</div>
                          {c.alternatives.map(alt => (
                            <button 
                              key={alt.id}
                              onClick={() => replaceComponent(c.id, alt)}
                              className="w-full flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200 hover:border-yellow-400 transition-all text-left group"
                            >
                              <span className="text-[11px] font-bold text-slate-800 uppercase tracking-tight group-hover:text-yellow-600">{alt.name}</span>
                              <div className="flex items-center gap-3">
                                <span className="text-[11px] font-black text-slate-900">₴{alt.price.toLocaleString()}</span>
                                <ChevronRight size={14} className="text-slate-300 group-hover:translate-x-1 transition-transform" />
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="space-y-8">
                  <div className="bg-slate-950 p-10 rounded-[3.5rem] text-center text-white shadow-3xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-yellow-400/5 rounded-full -mr-24 -mt-24 blur-3xl group-hover:bg-yellow-400/10 transition-all"></div>
                    <div className="relative z-10">
                       <div className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-3">Бюджет Системи</div>
                       <div className="text-5xl font-black text-yellow-400 mb-10 tracking-tighter">₴{totalPrice.toLocaleString()}</div>
                       <button 
                         onClick={() => {
                           addItem({
                             id: 'custom-kit-' + Date.now(),
                             name: result.title,
                             description: result.description,
                             price: totalPrice,
                             category: 'Kits',
                             image: 'https://images.unsplash.com/photo-1509391366360-fe5bb58583bb?auto=format&fit=crop&w=800',
                             rating: 5,
                             reviewsCount: 1,
                             stock: 1,
                             features: activeComponents.map(ac => ac.name)
                           }, activeComponents.map(ac => ({ id: ac.id, name: ac.name, price: ac.price, quantity: ac.quantity })));
                           addNotification('Набір додано до кошика', 'success');
                         }}
                         className="w-full bg-yellow-400 text-yellow-950 py-6 rounded-2xl font-black uppercase text-[11px] tracking-[0.2em] hover:bg-white transition-all shadow-xl shadow-yellow-400/10 active:scale-95"
                       >
                         Додати у кошик
                       </button>
                    </div>
                  </div>
                  
                  <div className="bg-blue-50/50 p-8 rounded-[2.5rem] border border-blue-100 flex gap-4 items-start">
                    <div className="bg-blue-600 p-2.5 rounded-xl text-white shadow-lg shadow-blue-200">
                      <Activity size={20} />
                    </div>
                    <div>
                      <span className="font-black text-[10px] text-blue-900 uppercase tracking-widest block mb-1">Прогноз Автономності</span>
                      <p className="text-[10px] text-blue-700 font-bold leading-relaxed uppercase">
                        Система забезпечить критичне живлення об'єкта протягом 10-14 годин при середньому навантаженні.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
