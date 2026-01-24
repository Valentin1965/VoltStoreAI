
import React, { useState, useMemo, useEffect } from 'react';
import { useNotification } from '../../contexts/NotificationContext';
import { useCart } from '../../contexts/CartContext';
import { useProducts } from '../../contexts/ProductsContext';
import { 
  Sparkles, 
  RotateCcw, 
  Check, 
  Loader2, 
  ShieldCheck, 
  Activity, 
  Cpu, 
  Zap, 
  Settings2,
  RefreshCw,
  ChevronRight,
  Target,
  Wallet
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { KitComponent, Alternative, Product } from '../../types';

const OFFLINE_TEMPLATES = {
  optimal: {
    title: "Оптимальна Енергосистема Pro",
    description: "На основі вашого профілю ми зібрали надійний комплект. Ви можете замінити будь-який компонент на аналог від іншого бренду.",
    components: [
      { 
        id: 'inv-deye-5', name: 'Гібридний інвертор Deye 5кВт', price: 42000, quantity: 1, 
        alternatives: [
          { id: 'inv-lux-5', name: 'Luxpower SNA5000 Eco', price: 34500, quantity: 1 },
          { id: 'inv-must-5', name: 'Must PH18-5248 PRO', price: 22800, quantity: 1 }
        ]
      },
      { 
        id: 'bat-pylon-5', name: 'АКБ Pylontech US5000 4.8кВт', price: 68000, quantity: 1,
        alternatives: [
          { id: 'bat-dyn-5', name: 'Dyness A48100 4.8кВт', price: 59500, quantity: 1 }
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
  const { products } = useProducts();
  
  const [config, setConfig] = useState({
    objectType: 'Приватний будинок',
    monthlyUsage: '300-600 кВт·місяць (~0.4-0.8 кВт·год)',
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
      const inventoryContext = products
        .filter(p => (p.stock || 0) > 0)
        .map(p => `ID: ${p.id}, Назва: ${p.name}, Категорія: ${p.category}, Ціна: ${p.price}`)
        .join('\n');

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Ви енергетичний експерт VoltStore. Створіть оптимальний набір обладнання для: 
      Об'єкт: ${config.objectType}, 
      Місячне споживання: ${config.monthlyUsage}, 
      Мета: ${config.purpose}, 
      Бюджет: ${config.budget}.
      
      ВИКОРИСТОВУЙТЕ ТІЛЬКИ ЦІ ТОВАРИ З НАШОГО СКЛАДУ:
      ${inventoryContext}
      
      Поверніть ТІЛЬКИ чистий JSON без Markdown: {
        "title": "Назва системи", 
        "description": "Чому ці товари підходять під запит", 
        "components": [
          {
            "id": "реальний_id_з_контексту", 
            "name": "реальна_назва", 
            "price": число_ціна, 
            "quantity": 1, 
            "alternatives": [
              {"id": "id_аналога", "name": "назва_аналога", "price": ціна_аналога, "quantity": 1}
            ]
          }
        ]
      }`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { 
          responseMimeType: "application/json"
        }
      });

      const textResult = response.text || '{}';
      const data = JSON.parse(textResult);
      setResult({ title: data.title || 'Система живлення', description: data.description || '' });
      setActiveComponents(data.components || []);
      setStep(3);
      addNotification('AI Architect розрахував систему на основі складу', 'success');
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
        const currentAsAlt = { id: comp.id, name: comp.name, price: comp.price, quantity: comp.quantity };
        const newAlts = [currentAsAlt, ...comp.alternatives.filter(a => a.id !== alt.id)];
        return { 
          ...comp, 
          id: alt.id, 
          name: alt.name, 
          price: alt.price, 
          quantity: alt.quantity || comp.quantity, 
          alternatives: newAlts 
        };
      }
      return comp;
    }));
    setEditingCompId(null);
    addNotification('Компонент замінено', 'success');
  };

  const formatPrice = (price: number) => {
    return price?.toLocaleString('uk-UA') || '0';
  };

  const totalPrice = useMemo(() => 
    activeComponents.reduce((sum, c) => sum + ((c.price || 0) * (c.quantity || 0)), 0)
  , [activeComponents]);

  const Selector = ({ label, icon: Icon, value, options, onChange }: any) => (
    <div className="space-y-3">
      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-2">
        <Icon size={12} className="text-yellow-500" /> {label}
      </label>
      <div className="grid grid-cols-1 gap-2">
        {options.map((opt: string) => (
          <button 
            key={opt} 
            onClick={() => onChange(opt)} 
            className={`p-4 rounded-2xl border-2 text-left font-bold transition-all flex justify-between items-center group ${value === opt ? 'border-yellow-400 bg-yellow-50 text-yellow-950 shadow-sm' : 'border-slate-50 bg-slate-50/50 text-slate-400 hover:border-slate-200'}`}
          >
            <span className="text-[10px] uppercase tracking-tight">{opt}</span>
            {value === opt && <Check size={14} className="text-yellow-600" />}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto py-6 animate-fade-in pb-20 px-4">
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 bg-slate-900 text-yellow-400 px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-4 shadow-xl">
          <Cpu size={14} className="animate-pulse" /> Energy Architect
        </div>
        <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter uppercase mb-4 leading-none">
          Параметри системи
        </h1>
      </div>

      <div className="bg-white rounded-[3rem] border border-slate-100 shadow-[0_32px_120px_-20px_rgba(0,0,0,0.08)] overflow-hidden relative">
        {loading && (
          <div className="absolute inset-0 z-[60] bg-white/95 backdrop-blur-md flex flex-col items-center justify-center gap-6 animate-fade-in">
            <Loader2 className="text-yellow-500 animate-spin" size={56} />
            <div className="text-center">
              <p className="text-xs font-black text-slate-900 uppercase tracking-[0.3em] animate-pulse">Проектування системи...</p>
              <p className="text-[9px] text-slate-400 uppercase mt-2 tracking-widest">Аналізуємо склад та підбираємо сумісні пристрої</p>
            </div>
          </div>
        )}

        <div className="p-8 md:p-12">
          {step === 1 && (
            <div className="space-y-10 animate-fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <Selector 
                  label="Тип об'єкта" 
                  icon={Settings2} 
                  value={config.objectType} 
                  options={['Приватний будинок', 'Квартира / Офіс', 'Бізнес']} 
                  onChange={(v: any) => setConfig({...config, objectType: v})}
                />
                <Selector 
                  label="Споживання" 
                  icon={Activity} 
                  value={config.monthlyUsage} 
                  options={[
                    '< 300 кВт·місяць (~0.4 кВт·год)', 
                    '300-600 кВт·місяць (~0.4-0.8 кВт·год)', 
                    '600+ кВт·місяць (>0.8 кВт·год)'
                  ]} 
                  onChange={(v: any) => setConfig({...config, monthlyUsage: v})}
                />
                <Selector 
                  label="Мета" 
                  icon={Target} 
                  value={config.purpose} 
                  options={['Резервне живлення', 'Автономність', 'Економія']} 
                  onChange={(v: any) => setConfig({...config, purpose: v})}
                />
                <Selector 
                  label="Бюджет" 
                  icon={Wallet} 
                  value={config.budget} 
                  options={['Економ', 'Оптимальний', 'Преміум']} 
                  onChange={(v: any) => setConfig({...config, budget: v})}
                />
              </div>

              <div className="flex justify-center pt-6">
                <button 
                  onClick={handleCalculate} 
                  className="w-full max-w-lg bg-slate-900 text-white py-6 rounded-[2rem] font-black flex items-center justify-center gap-4 hover:bg-yellow-400 hover:text-yellow-950 transition-all shadow-2xl group uppercase tracking-widest text-[13px]"
                >
                  Згенерувати рішення <Sparkles size={20} className="group-hover:rotate-12 transition-transform" />
                </button>
              </div>
            </div>
          )}

          {step === 3 && result && (
            <div className="animate-fade-in space-y-10">
              <div className="flex flex-col md:flex-row justify-between md:items-center gap-6 border-b border-slate-100 pb-8">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter leading-none">{result.title}</h2>
                  <p className="text-[10px] text-slate-500 mt-2 uppercase font-bold tracking-wider max-w-xl">{result.description}</p>
                </div>
                <button 
                  onClick={() => setStep(1)} 
                  className="px-6 py-3 bg-slate-50 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-yellow-600 hover:bg-yellow-50 transition-all shadow-sm flex items-center gap-2"
                >
                  <RotateCcw size={16}/> Змінити параметри
                </button>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                <div className="lg:col-span-2 space-y-4">
                  <div className="flex items-center gap-2 mb-2 px-2">
                    <ShieldCheck className="text-emerald-500" size={16} />
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Конфігурація активів</span>
                  </div>
                  
                  {activeComponents.map(c => (
                    <div key={c.id} className="flex flex-col gap-2">
                      <div className="p-6 bg-white rounded-[2rem] border border-slate-100 flex justify-between items-center group hover:border-yellow-300 transition-all shadow-sm">
                        <div className="flex items-center gap-4">
                          <div className="w-11 h-11 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-yellow-400 group-hover:text-yellow-950 transition-all">
                            <Zap size={20} />
                          </div>
                          <div>
                            <div className="font-black text-slate-900 text-[11px] uppercase truncate max-w-[200px] tracking-tight">{c.name}</div>
                            <div className="text-[9px] text-slate-400 font-bold uppercase tracking-tight mt-0.5">
                              {c.quantity} шт • ₴{formatPrice(c.price)}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-5">
                          {c.alternatives && c.alternatives.length > 0 && (
                            <button 
                              onClick={() => setEditingCompId(editingCompId === c.id ? null : c.id)}
                              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all ${
                                editingCompId === c.id ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                              }`}
                            >
                              <RefreshCw size={12} className={editingCompId === c.id ? 'animate-spin' : ''} />
                              {editingCompId === c.id ? 'Закрити' : 'Змінити'}
                            </button>
                          )}
                          <div className="font-black text-slate-900 text-right w-24 text-[13px] tracking-tighter">₴{formatPrice(c.price * c.quantity)}</div>
                        </div>
                      </div>

                      {editingCompId === c.id && c.alternatives && (
                        <div className="mx-4 p-4 bg-slate-50/50 rounded-3xl border border-slate-100 animate-fade-in space-y-2 shadow-inner">
                          <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2 px-2">Рекомендовані заміни (наявні на складі):</div>
                          {c.alternatives.map(alt => (
                            <button 
                              key={alt.id}
                              onClick={() => replaceComponent(c.id, alt)}
                              className="w-full flex justify-between items-center bg-white p-3.5 rounded-2xl border border-slate-200 hover:border-yellow-400 transition-all text-left group"
                            >
                              <div className="flex-1">
                                <span className="text-[10px] font-bold text-slate-800 uppercase tracking-tight group-hover:text-yellow-600">{alt.name}</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-[10px] font-black text-slate-900">₴{formatPrice(alt.price)}</span>
                                <span className="text-[9px] font-bold text-slate-400">x{alt.quantity}</span>
                                <ChevronRight size={14} className="text-slate-200 group-hover:translate-x-1 transition-transform" />
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="space-y-6">
                  <div className="bg-slate-950 p-10 rounded-[3rem] text-center text-white shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-yellow-400/10 rounded-full -mr-20 -mt-20 blur-3xl"></div>
                    <div className="relative z-10">
                       <div className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] mb-4">Загальний бюджет</div>
                       <div className="text-4xl font-black text-yellow-400 mb-8 tracking-tighter">₴{formatPrice(totalPrice)}</div>
                       <button 
                         onClick={() => {
                           const selectedParts = activeComponents.map(ac => ({
                             id: ac.id,
                             name: ac.name,
                             price: ac.price,
                             quantity: ac.quantity
                           }));

                           addItem({
                             id: 'ai-kit-' + Date.now(),
                             name: result.title,
                             description: result.description,
                             price: totalPrice,
                             category: 'Kits',
                             image: 'https://images.unsplash.com/photo-1509391366360-fe5bb58583bb?auto=format&fit=crop&w=800',
                             stock: 1,
                             features: activeComponents.map(ac => ac.name)
                           }, selectedParts);
                           addNotification('Систему додано до кошика', 'success');
                         }}
                         className="w-full bg-yellow-400 text-yellow-950 py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-white transition-all shadow-xl active:scale-95"
                       >
                         У кошик
                       </button>
                    </div>
                  </div>
                  
                  <div className="bg-emerald-50 p-6 rounded-[2.5rem] border border-emerald-100 flex gap-4 items-start">
                    <div className="bg-emerald-600 p-2.5 rounded-xl text-white shadow-lg">
                      <Activity size={18} />
                    </div>
                    <div>
                      <span className="font-black text-[9px] text-emerald-900 uppercase tracking-widest block mb-1">Грунтування на складі</span>
                      <p className="text-[9px] text-emerald-700 font-bold leading-relaxed uppercase">
                        AI врахував технічні параметри ${products.length} товарів для підбору сумісного обладнання.
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
