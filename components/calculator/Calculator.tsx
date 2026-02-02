import React, { useState, useMemo } from 'react';
import { useNotification } from '../../contexts/NotificationContext';
import { useCart } from '../../contexts/CartContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { 
  RotateCcw, Check, Zap, Settings2, Target, Wallet, Sparkles, Activity, ShoppingCart 
} from 'lucide-react';
import { KitComponent } from '../../types';

interface CalculatorProps {
  initialStep?: 1 | 3;
}

export const Calculator: React.FC<CalculatorProps> = ({ initialStep = 1 }) => {
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
    purpose: 'Резервне живлення', 
    budget: 'Оптимальний'
  });

  const generateAiSolution = async () => {
    // Прямий ключ для гарантії роботи
    const apiKey = "AIzaSyDhNAK8S9_HQdCQD-y9nkY_d9IaLOmm9tg";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    setLoading(true);
    try {
      const prompt = `
        Дій як експерт із сонячної енергетики. Спроектуй систему для таких параметрів:
        Об'єкт: ${config.objectType}, Місячне споживання: ${config.monthlyUsage}, 
        Основна мета: ${config.purpose}, Бюджет: ${config.budget}.
        
        Поверни ТІЛЬКИ JSON об'єкт у такому форматі:
        {
          "title": "Назва системи українською",
          "description": "Короткий опис переваг українською (2 речення)",
          "components": [
            {"name": "Назва компонента (English/Ukrainian)", "price": ціна_в_євро_числом, "quantity": кількість_числом}
          ]
        }
      `;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.2
          }
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        console.error('API Error Details:', errData);
        throw new Error(`HTTP Error: ${response.status}`);
      }

      const resData = await response.json();
      const rawText = resData.candidates[0].content.parts[0].text;
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
      addNotification("Рішення успішно згенеровано", "success");
    } catch (err: any) {
      console.error('AI Architect Error:', err);
      addNotification("ШІ-Архітектор тимчасово недоступний. Спробуйте ще раз.", "error");
    } finally {
      setLoading(false);
    }
  };

  const totalPrice = useMemo(() => 
    activeComponents.reduce((s, c) => s + (c.price * c.quantity), 0)
  , [activeComponents]);

  const handleAddToCart = () => {
    if (!result) return;
    activeComponents.forEach(comp => {
      addItem({
        id: comp.id,
        name: comp.name,
        price: comp.price,
        image: 'https://images.unsplash.com/photo-1509391366360-feaffa44d51a?auto=format&fit=crop&q=80&w=200',
        category: 'Components'
      });
    });
    addNotification("Всі компоненти додано до кошика", "success");
  };

  const Selector = ({ label, icon: Icon, value, options, onChange }: any) => (
    <div className="space-y-3">
      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-2">
        <Icon size={12} className="text-yellow-500" /> {label}
      </label>
      <div className="flex flex-col gap-2">
        {options.map((opt: string) => (
          <button 
            key={opt} 
            onClick={() => onChange(opt)} 
            className={`p-4 rounded-2xl border-2 text-left font-bold transition-all flex justify-between items-center ${
              value === opt 
                ? 'border-yellow-400 bg-yellow-50 text-yellow-950 shadow-sm' 
                : 'border-slate-50 bg-slate-50 text-slate-400 hover:border-slate-200'
            }`}
          >
            <span className="text-[11px] uppercase tracking-tight">{opt}</span>
            {value === opt && <Check size={14} className="text-yellow-600" />}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto py-6 animate-fade-in pb-20 px-4">
      <div className="bg-white rounded-[3rem] border border-slate-100 shadow-2xl overflow-hidden relative min-h-[500px]">
        {loading && (
          <div className="absolute inset-0 z-[60] bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center gap-4">
            <div className="w-12 h-12 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-[10px] font-black uppercase text-slate-900 tracking-widest">Архітектор аналізує дані...</p>
          </div>
        )}

        <div className="p-8 md:p-12">
          {step === 1 ? (
            <div className="space-y-10">
              <div className="flex items-center gap-4 mb-4">
                <div className="bg-yellow-400 p-3 rounded-2xl">
                  <Sparkles className="text-yellow-950" />
                </div>
                <h2 className="text-3xl font-black uppercase tracking-tighter">AI Architect</h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <Selector label="Об'єкт" icon={Settings2} value={config.objectType} options={['Приватний будинок', 'Бізнес', 'Квартира']} onChange={(v:any)=>setConfig({...config, objectType:v})}/>
                <Selector label="Споживання" icon={Activity} value={config.monthlyUsage} options={['< 300 кВт*год', '300-600 кВт*год', '600+ кВт*год']} onChange={(v:any)=>setConfig({...config, monthlyUsage:v})}/>
                <Selector label="Ціль" icon={Target} value={config.purpose} options={['Резерв', 'Автономність', 'Економія']} onChange={(v:any)=>setConfig({...config, purpose:v})}/>
                <Selector label="Бюджет" icon={Wallet} value={config.budget} options={['Економ', 'Оптимальний', 'Преміум']} onChange={(v:any)=>setConfig({...config, budget:v})}/>
              </div>
              
              <div className="flex flex-col items-center pt-6">
                <button onClick={generateAiSolution} className="w-full max-w-lg bg-slate-900 text-white py-6 rounded-3xl font-black uppercase tracking-widest text-[13px] hover:bg-yellow-400 hover:text-yellow-950 transition-all shadow-2xl flex items-center justify-center gap-4 group">
                  Сгенерувати рішення <Zap size={20} className="text-yellow-400" />
                </button>
              </div>
            </div>
          ) : result && (
            <div className="animate-fade-in space-y-10">
              <div className="flex flex-col md:flex-row justify-between md:items-center gap-6 border-b border-slate-100 pb-8">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter leading-none">{result.title}</h2>
                  <p className="text-[11px] text-slate-500 font-bold mt-2 max-w-xl">{result.description}</p>
                </div>
                <button onClick={() => setStep(1)} className="px-6 py-3 bg-slate-50 rounded-2xl text-[10px] font-black uppercase text-slate-400 hover:text-yellow-600 transition-all flex items-center gap-2">
                  <RotateCcw size={12}/> Новий розрахунок
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                <div className="lg:col-span-2 space-y-4">
                  {activeComponents.map((c, i) => (
                    <div key={i} className="p-6 bg-white rounded-[2rem] border border-slate-100 flex justify-between items-center group hover:border-yellow-400 transition-all">
                      <div className="flex items-center gap-4">
                        <div className="w-11 h-11 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-yellow-400 group-hover:text-yellow-950 transition-all">
                          <Zap size={20} />
                        </div>
                        <div>
                          <div className="font-black text-slate-900 text-[11px] uppercase">{c.name}</div>
                          <div className="text-[9px] text-slate-400 font-bold uppercase tracking-tight mt-0.5">{c.quantity} од.</div>
                        </div>
                      </div>
                      <div className="font-black text-slate-900 text-[13px] tracking-tighter">{formatPrice(c.price * c.quantity)}</div>
                    </div>
                  ))}
                </div>

                <div className="bg-slate-950 p-10 rounded-[3rem] text-center text-white shadow-2xl h-fit">
                   <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-4">Загальна вартість</div>
                   <div className="text-4xl font-black text-yellow-400 mb-8 tracking-tighter leading-none">{formatPrice(totalPrice)}</div>
                   <button onClick={handleAddToCart} className="w-full bg-yellow-400 text-yellow-950 py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-white hover:text-slate-950 transition-all shadow-xl flex items-center justify-center gap-2">
                      <ShoppingCart size={16} /> В кошик
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

export default Calculator;
