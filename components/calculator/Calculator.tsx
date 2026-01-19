import React, { useState, useMemo } from 'react';
import { useNotification } from '../../contexts/NotificationContext';
import { useCart } from '../../contexts/CartContext';
import { Sparkles, ArrowRight, RotateCcw, Check, Loader2, ShieldCheck, Activity, Cpu, Plus, Minus, RefreshCw, Info, ChevronRight } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

interface Alternative {
  id: string;
  name: string;
  price: number;
}

interface KitComponent {
  id: string;
  name: string;
  price: number;
  quantity: number;
  alternatives: Alternative[];
}

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

export const Calculator: React.FC = () => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ title: string; description: string; } | null>(null);
  const [activeComponents, setActiveComponents] = useState<KitComponent[]>([]);
  
  const { addNotification } = useNotification();
  const { addItem } = useCart();
  
  const [config, setConfig] = useState({
    objectType: 'Приватний будинок',
    monthlyUsage: '300-600 кВт·год',
    purpose: 'Резервне живлення',
    budget: 'Оптимальний'
  });

  const handleCalculate = async () => {
    setLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      const prompt = `Ви енергетичний експерт. Створіть набір обладнання для: ${config.objectType}, споживання: ${config.monthlyUsage}. Поверніть ТІЛЬКИ JSON: {"title": "Назва", "description": "Опис", "components": [{"id": "1", "name": "Товар", "price": 100, "quantity": 1, "alternatives": []}]}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });

      const data = JSON.parse(response.text || '{}');
      setResult({ title: data.title, description: data.description });
      setActiveComponents(data.components || []);
      setStep(3);
    } catch (err) {
      useFallback();
    } finally {
      setLoading(false);
    }
  };

  const useFallback = () => {
    const template = OFFLINE_TEMPLATES.optimal;
    setResult({ title: template.title, description: template.description });
    setActiveComponents(template.components);
    setStep(3);
  };

  const totalPrice = useMemo(() => 
    activeComponents.reduce((sum, c) => sum + (c.price * c.quantity), 0)
  , [activeComponents]);

  return (
    <div className="max-w-5xl mx-auto py-6 animate-fade-in relative">
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 bg-slate-900 text-yellow-400 px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-4 shadow-xl">
          <Cpu size={14} className="animate-pulse" /> AI System Architect
        </div>
        <h1 className="text-4xl font-black text-slate-900 tracking-tight">Персональний Конструктор</h1>
      </div>

      <div className="bg-white rounded-[3.5rem] border border-slate-100 shadow-2xl overflow-hidden min-h-[500px] relative">
        {loading && (
          <div className="absolute inset-0 z-[60] bg-white/80 backdrop-blur-md flex flex-col items-center justify-center gap-4">
            <Loader2 className="text-yellow-500 animate-spin" size={48} />
            <p className="text-sm font-black text-slate-900 uppercase tracking-widest animate-pulse">Вольт аналізує склад...</p>
          </div>
        )}

        <div className="p-8 md:p-14">
          {step === 1 && (
            <div className="space-y-12 animate-fade-in">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Мій Об'єкт</label>
                  <div className="grid grid-cols-1 gap-3">
                    {['Приватний будинок', 'Квартира / Офіс', 'Бізнес'].map(t => (
                      <button key={t} onClick={() => setConfig({...config, objectType: t})} className={`p-5 rounded-[2rem] border-2 text-left font-bold transition-all flex justify-between items-center ${config.objectType === t ? 'border-yellow-400 bg-yellow-50 text-yellow-950' : 'border-slate-50 bg-slate-50/50 text-slate-400'}`}>
                        {t} {config.objectType === t && <Check size={16} />}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Споживання</label>
                  <div className="grid grid-cols-1 gap-3">
                    {['< 300 кВт·год', '300-600 кВт·год', '600+ кВт·год'].map(u => (
                      <button key={u} onClick={() => setConfig({...config, monthlyUsage: u})} className={`p-5 rounded-[2rem] border-2 text-left font-bold transition-all flex justify-between items-center ${config.monthlyUsage === u ? 'border-yellow-400 bg-yellow-50 text-yellow-950' : 'border-slate-50 bg-slate-50/50 text-slate-400'}`}>
                        {u} {config.monthlyUsage === u && <Check size={16} />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <button onClick={() => setStep(2)} className="w-full bg-slate-900 text-white py-6 rounded-[2.5rem] font-black flex items-center justify-center gap-4 hover:bg-slate-800 transition-all shadow-xl">Наступний крок <ArrowRight/></button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-10 animate-fade-in text-center">
              <div className="p-10 bg-slate-50 rounded-[3rem] border border-slate-100 max-w-lg mx-auto">
                <div className="bg-yellow-400 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-yellow-100">
                  <Activity size={32} className="text-yellow-950" />
                </div>
                <h3 className="text-xl font-black text-slate-900 mb-4">Майже готово!</h3>
                <p className="text-sm text-slate-500 mb-8 leading-relaxed font-medium">ШІ підбере компоненти з найкращим ККД під ваші умови.</p>
                <div className="flex gap-4">
                  <button onClick={() => setStep(1)} className="flex-1 py-5 rounded-2xl bg-white border border-slate-200 font-bold text-slate-400">Назад</button>
                  <button onClick={handleCalculate} className="flex-[2] py-5 rounded-2xl bg-yellow-400 text-yellow-950 font-black flex items-center justify-center gap-3 shadow-lg hover:bg-yellow-500 transition-all">
                    <Sparkles /> Згенерувати
                  </button>
                </div>
              </div>
            </div>
          )}

          {step === 3 && result && (
            <div className="animate-fade-in space-y-12">
              <div className="flex justify-between items-center">
                <h2 className="text-3xl font-black text-slate-900">{result.title}</h2>
                <button onClick={() => setStep(1)} className="p-4 bg-slate-50 rounded-full text-slate-300 hover:text-yellow-600 transition-all"><RotateCcw size={24}/></button>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                <div className="lg:col-span-2 space-y-4">
                  {activeComponents.map(c => (
                    <div key={c.id} className="p-6 bg-white rounded-[2rem] border border-slate-100 flex justify-between items-center">
                      <div>
                        <div className="font-bold text-slate-900">{c.name}</div>
                        <div className="text-[10px] text-slate-400 font-black uppercase">₴{c.price.toLocaleString()}</div>
                      </div>
                      <div className="font-black text-slate-900">₴{(c.price * c.quantity).toLocaleString()}</div>
                    </div>
                  ))}
                </div>
                <div className="bg-slate-900 p-8 rounded-[3rem] text-center text-white">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Разом</div>
                  <div className="text-4xl font-black text-yellow-400 mb-8">₴{totalPrice.toLocaleString()}</div>
                  <button 
                    onClick={() => {
                      addItem({
                        id: 'custom-' + Date.now(),
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
                      addNotification('Додано до кошика', 'success');
                    }}
                    className="w-full bg-yellow-400 text-yellow-950 py-5 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-yellow-500 transition-all"
                  >
                    Додати набір у кошик
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