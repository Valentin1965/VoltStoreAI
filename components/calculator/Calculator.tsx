import React, { useState, useMemo } from 'react';
import { useNotification } from '../../contexts/NotificationContext.tsx';
import { useCart } from '../../contexts/CartContext.tsx';
import { Sparkles, Home, Battery, Sun, Zap, Info, ArrowRight, RotateCcw, RefreshCw, Check, Loader2 } from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";

interface ComponentOption {
  id: string;
  name: string;
  price: number;
}

interface KitComponent extends ComponentOption {
  quantity: number;
  alternatives: ComponentOption[];
}

export const Calculator: React.FC = () => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ title: string; description: string } | null>(null);
  const [activeComponents, setActiveComponents] = useState<KitComponent[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const { addNotification } = useNotification();
  const { addItem } = useCart();
  
  const [config, setConfig] = useState({
    objectType: 'Приватний будинок',
    monthlyUsage: '300-500 кВт·год',
    purpose: 'Резервне живлення',
    budget: 'Стандарт'
  });

  const totalPrice = useMemo(() => {
    return activeComponents.reduce((sum, comp) => sum + (comp.price * comp.quantity), 0);
  }, [activeComponents]);

  const handleGeminiGen = async () => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      addNotification('Ключ API не знайдено. Переконайтеся, що в .env є API_KEY або GEMINI_API_KEY', 'error');
      return;
    }

    setLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey });
      
      const prompt = `Запропонуй оптимальний комплект обладнання для енергонезалежності.
      Об'єкт: ${config.objectType}.
      Споживання: ${config.monthlyUsage}.
      Ціль: ${config.purpose}.
      Бюджет: ${config.budget}.
      
      Ти повинен повернути ТІЛЬКИ чистий JSON об'єкт з наступною структурою:
      {
        "title": "Назва комплекту",
        "description": "Короткий опис переваг",
        "components": [
          {
            "id": "унікальний_id",
            "name": "Назва товару",
            "price": число,
            "quantity": кількість,
            "alternatives": [
              {"id": "alt1", "name": "Альтернатива 1", "price": ціна}
            ]
          }
        ]
      }`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              components: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    name: { type: Type.STRING },
                    price: { type: Type.NUMBER },
                    quantity: { type: Type.NUMBER },
                    alternatives: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          id: { type: Type.STRING },
                          name: { type: Type.STRING },
                          price: { type: Type.NUMBER }
                        },
                        required: ["id", "name", "price"]
                      }
                    }
                  },
                  required: ["id", "name", "price", "quantity", "alternatives"]
                }
              }
            },
            required: ["title", "description", "components"]
          }
        }
      });

      const text = response.text;
      if (!text) throw new Error('Порожня відповідь від моделі');
      
      const data = JSON.parse(text.trim());
      setResult({ title: data.title, description: data.description });
      setActiveComponents(data.components);
      setStep(3);
      addNotification('AI успішно згенерував рішення!', 'success');
    } catch (error: any) {
      console.error('Gemini System Error:', error);
      addNotification(`Помилка: ${error.message || 'Не вдалося згенерувати конфігурацію'}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const swapComponent = (originalId: string, newOption: ComponentOption) => {
    setActiveComponents(prev => prev.map(comp => {
      if (comp.id === originalId) {
        const currentAsOption: ComponentOption = { id: comp.id, name: comp.name, price: comp.price };
        const newAlternatives = [
          currentAsOption,
          ...comp.alternatives.filter(a => a.id !== newOption.id)
        ];
        return { ...newOption, quantity: comp.quantity, alternatives: newAlternatives } as KitComponent;
      }
      return comp;
    }));
    setEditingId(null);
  };

  return (
    <div className="max-w-4xl mx-auto animate-fade-in pb-20">
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 bg-yellow-100 text-yellow-700 px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest mb-4">
          <Sparkles size={14} className="animate-pulse" /> AI Інтелектуальний конфігуратор
        </div>
        <h1 className="text-4xl font-black text-slate-900 mb-4 tracking-tighter">Енергонезалежність за хвилину</h1>
        <p className="text-slate-500 max-w-lg mx-auto">Наш ШІ аналізує ваші потреби та підбирає оптимальне обладнання з актуальної бази.</p>
      </div>

      <div className="bg-white rounded-[3rem] border border-slate-100 shadow-2xl shadow-slate-200/50 overflow-hidden">
        {step === 1 && (
          <div className="p-8 md:p-12 space-y-8 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h3 className="font-black text-xl text-slate-900 flex items-center gap-2"><Home className="text-yellow-500" /> Тип об'єкту</h3>
                <div className="grid grid-cols-2 gap-3">
                  {['Приватний будинок', 'Квартира', 'Офіс', 'Склад'].map(type => (
                    <button 
                      key={type} 
                      onClick={() => setConfig({...config, objectType: type})} 
                      className={`p-4 rounded-2xl border-2 font-bold text-sm transition-all ${config.objectType === type ? 'border-yellow-400 bg-yellow-50 text-yellow-950 shadow-md shadow-yellow-100' : 'border-slate-100 text-slate-500 hover:border-slate-200'}`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-4">
                <h3 className="font-black text-xl text-slate-900 flex items-center gap-2"><Zap className="text-yellow-500" /> Місячне споживання</h3>
                <div className="grid grid-cols-2 gap-3">
                  {['< 200 кВт·год', '200-500 кВт·год', '500-1000 кВт·год', '> 1000 кВт·год'].map(usage => (
                    <button 
                      key={usage} 
                      onClick={() => setConfig({...config, monthlyUsage: usage})} 
                      className={`p-4 rounded-2xl border-2 font-bold text-sm transition-all ${config.monthlyUsage === usage ? 'border-yellow-400 bg-yellow-50 text-yellow-950 shadow-md shadow-yellow-100' : 'border-slate-100 text-slate-500 hover:border-slate-200'}`}
                    >
                      {usage}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <button onClick={() => setStep(2)} className="w-full bg-slate-900 text-white py-5 rounded-3xl font-black text-lg hover:bg-slate-800 transition-all flex items-center justify-center gap-3 shadow-xl">Наступний крок <ArrowRight /></button>
          </div>
        )}

        {step === 2 && (
          <div className="p-8 md:p-12 space-y-8 animate-fade-in">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h3 className="font-black text-xl text-slate-900 flex items-center gap-2"><Battery className="text-yellow-500" /> Пріоритет</h3>
                <div className="grid grid-cols-1 gap-3">
                  {['Повний резерв', 'Економія мережі', 'Еко-френдлі', 'Макс. потужність'].map(item => (
                    <button key={item} onClick={() => setConfig({...config, purpose: item})} className={`p-4 rounded-2xl border-2 text-left font-bold text-sm transition-all ${config.purpose === item ? 'border-yellow-400 bg-yellow-50 text-yellow-950 shadow-md' : 'border-slate-100 text-slate-500 hover:border-slate-200'}`}>{item}</button>
                  ))}
                </div>
              </div>
              <div className="space-y-4">
                <h3 className="font-black text-xl text-slate-900 flex items-center gap-2"><Sun className="text-yellow-500" /> Рівень бюджету</h3>
                <div className="grid grid-cols-1 gap-3">
                  {['Економ', 'Стандарт', 'Преміум'].map(b => (
                    <button key={b} onClick={() => setConfig({...config, budget: b})} className={`p-4 rounded-2xl border-2 text-left font-bold text-sm transition-all ${config.budget === b ? 'border-yellow-400 bg-yellow-50 text-yellow-950 shadow-md' : 'border-slate-100 text-slate-500 hover:border-slate-200'}`}>{b}</button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-4">
              <button onClick={() => setStep(1)} className="flex-1 bg-slate-100 text-slate-500 py-5 rounded-3xl font-black">Назад</button>
              <button onClick={handleGeminiGen} disabled={loading} className="flex-[2] bg-yellow-400 hover:bg-yellow-500 text-yellow-950 py-5 rounded-3xl font-black text-lg transition-all shadow-xl flex items-center justify-center gap-3 disabled:opacity-50">
                {loading ? <Loader2 className="animate-spin" /> : <><Sparkles size={20} /> Згенерувати рішення</>}
              </button>
            </div>
          </div>
        )}

        {step === 3 && result && (
          <div className="p-8 md:p-12 animate-fade-in">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-black text-slate-900 leading-tight">{result.title}</h2>
              <button onClick={() => setStep(1)} className="p-3 bg-slate-100 rounded-full text-slate-400 hover:text-yellow-600 transition-all"><RotateCcw size={20} /></button>
            </div>
            <p className="text-slate-600 mb-8 leading-relaxed text-lg">{result.description}</p>
            <div className="bg-slate-50 rounded-[2.5rem] p-6 mb-8 border border-slate-100">
              <div className="space-y-3">
                {activeComponents.map((item) => (
                  <div key={item.id} className="relative">
                    <div className={`bg-white rounded-2xl p-4 border transition-all ${editingId === item.id ? 'border-yellow-400 shadow-lg' : 'border-slate-200'}`}>
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1">
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mb-1">Компонент</div>
                          <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 shrink-0"></div>
                            {item.name}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">К-сть</div>
                          <div className="font-black text-slate-900 text-sm">x{item.quantity}</div>
                        </div>
                        <div className="text-right w-24">
                          <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Ціна</div>
                          <div className="font-black text-slate-900 text-sm">₴{item.price.toLocaleString()}</div>
                        </div>
                        <button onClick={() => setEditingId(editingId === item.id ? null : item.id)} className={`p-2 rounded-xl transition-all ${editingId === item.id ? 'bg-yellow-400 text-yellow-950' : 'bg-slate-100 text-slate-400 hover:text-slate-900'}`}>
                          <RefreshCw size={16} />
                        </button>
                      </div>
                    </div>
                    {editingId === item.id && (
                      <div className="mt-2 bg-slate-900 rounded-2xl p-3 space-y-2 animate-fade-in shadow-xl z-10 relative">
                        <div className="text-[10px] font-bold text-slate-500 uppercase px-2 py-1">Замінити на:</div>
                        {item.alternatives.map((alt) => (
                          <button key={alt.id} onClick={() => swapComponent(item.id, alt)} className="w-full flex items-center justify-between bg-slate-800 hover:bg-slate-700 p-3 rounded-xl transition-colors text-left">
                            <span className="text-white text-xs font-medium">{alt.name}</span>
                            <span className="text-yellow-400 font-black text-xs">₴{alt.price.toLocaleString()}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-slate-900 p-8 rounded-[2.5rem] text-white">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase block mb-1">Загальна вартість системи</span>
                <span className="text-4xl font-black text-yellow-400">₴{totalPrice.toLocaleString()}</span>
              </div>
              <button 
                onClick={() => {
                  addItem({ 
                    id: 'ai-custom-' + Date.now(), 
                    name: result.title, 
                    description: result.description, 
                    price: totalPrice, 
                    category: 'Kits', 
                    image: 'https://images.unsplash.com/photo-1509391366360-fe5bb58583bb?q=80&w=800&auto=format&fit=crop', 
                    rating: 5, 
                    reviewsCount: 1, 
                    stock: 1, 
                    features: activeComponents.map((c: any) => c.name) 
                  }, activeComponents.map(c => ({ id: c.id, name: c.name, price: c.price, quantity: c.quantity })));
                  addNotification('Комплект додано до кошика', 'success');
                }}
                className="w-full md:w-auto bg-yellow-400 hover:bg-yellow-500 text-yellow-950 px-12 py-5 rounded-2xl font-black text-xl transition-all shadow-xl flex items-center justify-center gap-3"
              >
                <Check size={24} />Додати все в кошик
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};