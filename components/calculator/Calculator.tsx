import React, { useState } from 'react';
import { useNotification } from '../../contexts/NotificationContext';
import { useCart } from '../../contexts/CartContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { 
  RotateCcw, Check, ShieldCheck, 
  Activity, Cpu, Zap, Settings2, Target, Wallet, Sparkles,
  Loader2, ArrowRight, Layers
} from 'lucide-react';
import { Product } from '../../types';

interface CalculatorProps {
  initialStep?: 1 | 3;
}

interface CalculatedKit {
  title: string;
  description: string;
  totalPrice: number;
  components: {
    name: string;
    quantity: number;
    price: number;
    type: 'Inverter' | 'Battery' | 'Panel' | 'Accessories';
  }[];
  benefits: string[];
}

export const Calculator: React.FC<CalculatorProps> = ({ initialStep = 1 }) => {
  const [step, setStep] = useState<number>(initialStep); 
  const [loading, setLoading] = useState(false);
  
  const [consumption, setConsumption] = useState<string>('300');
  const [phase, setPhase] = useState<'1' | '3'>('1');
  const [goal, setGoal] = useState<'savings' | 'backup' | 'independence'>('savings');
  const [budget, setBudget] = useState<'eco' | 'standard' | 'premium'>('standard');

  const [result, setResult] = useState<CalculatedKit | null>(null);

  const { addNotification } = useNotification();
  const { addItem } = useCart();
  const { formatPrice } = useLanguage();

  const handleGenerate = () => {
    setLoading(true);
    
    setTimeout(() => {
      const monthlyKwh = parseInt(consumption);
      const is3Phase = phase === '3';
      
      let inverterPower = Math.ceil((monthlyKwh / 30 / 4) * 1.5);
      inverterPower = Math.max(is3Phase ? 5 : 3, inverterPower);
      if (is3Phase && inverterPower < 5) inverterPower = 5;
      
      let batteryCap = goal === 'savings' ? 5 : goal === 'backup' ? 10 : 20;
      if (monthlyKwh > 800) batteryCap *= 1.5;

      const panelCount = Math.ceil((inverterPower * 1.2) / 0.45);
      const brand = budget === 'eco' ? 'Deye/Growatt' : budget === 'standard' ? 'Victron/Pylontech' : 'Fronius/BYD';
      const multiplier = budget === 'eco' ? 1 : budget === 'standard' ? 1.4 : 2.1;

      const inverterPrice = (inverterPower * 300) * multiplier;
      const batteryPrice = (batteryCap * 400) * multiplier;
      const panelPrice = (panelCount * 120);
      const extraPrice = 500 * multiplier;

      const kit: CalculatedKit = {
        title: `VoltStore ${brand} ${inverterPower}kW Pro-Kit`,
        description: `High-performance ${phase}-phase configuration optimized for ${goal}. Designed for ${monthlyKwh}kWh load.`,
        totalPrice: Math.round(inverterPrice + batteryPrice + panelPrice + extraPrice),
        components: [
          { name: `${brand} Inverter ${inverterPower}kW`, quantity: 1, price: Math.round(inverterPrice), type: 'Inverter' },
          { name: `${brand} Battery ${batteryCap}kWh`, quantity: 1, price: Math.round(batteryPrice), type: 'Battery' },
          { name: `Solar Panels 450W`, quantity: panelCount, price: 120, type: 'Panel' },
          { name: `Installation Kit`, quantity: 1, price: Math.round(extraPrice), type: 'Accessories' }
        ],
        benefits: [`${goal.toUpperCase()} Mode`, `${phase}-Phase Support`, `Smart App`, `Modular`]
      };

      setResult(kit);
      setStep(3);
      setLoading(false);
      addNotification("System configuration ready", "success");
    }, 800);
  };

  const handleAddToCart = () => {
    if (!result) return;
    const kitProduct: Product = {
      id: `KIT-CALC-${Date.now()}`,
      name: { en: result.title, uk: result.title },
      description: { en: result.description, uk: result.description },
      price: result.totalPrice,
      category: 'Kits',
      image: 'https://images.unsplash.com/photo-1509391366360-fe5bb58583bb?q=80&w=800',
      features: result.benefits,
      is_active: true
    };
    addItem(kitProduct, []);
    addNotification("Kit added to cart", "success");
  };

  return (
    <div className="max-w-5xl mx-auto py-10 px-4" translate="no">
      {step === 1 && (
        <div className="animate-fade-in space-y-12">
          <div className="text-center space-y-4">
            <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-600 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-100">
              <Sparkles size={14} /> <span>System Architect Pro</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 uppercase tracking-tighter leading-none">
              Build Your <span className="text-emerald-500">Independence</span>
            </h2>
          </div>

          <div className="bg-white rounded-[3rem] p-8 md:p-12 border border-slate-100 shadow-2xl relative overflow-hidden">
            {loading && (
              <div className="absolute inset-0 z-50 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center">
                <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mb-4" />
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-900">Calculating...</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="space-y-4">
                <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">
                  <Activity size={14} className="text-emerald-500" /> <span>Monthly Consumption</span>
                </label>
                <input 
                  type="range" min="50" max="2000" step="50" value={consumption}
                  onChange={(e) => setConsumption(e.target.value)}
                  className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
                <div className="text-center text-emerald-600 font-black"><span>{consumption} kWh</span></div>
              </div>

              <div className="space-y-4">
                <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">
                  <Zap size={14} className="text-emerald-500" /> <span>Phase</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => setPhase('1')} className={`p-4 rounded-2xl border-2 transition-all font-black text-[10px] uppercase ${phase === '1' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-50'}`}>1 Phase</button>
                  <button onClick={() => setPhase('3')} className={`p-4 rounded-2xl border-2 transition-all font-black text-[10px] uppercase ${phase === '3' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-50'}`}>3 Phases</button>
                </div>
              </div>

              <div className="space-y-4">
                <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">
                  <Target size={14} className="text-emerald-500" /> <span>Goal</span>
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {['savings', 'backup', 'independence'].map((g) => (
                    <button key={g} onClick={() => setGoal(g as any)} className={`p-4 rounded-xl border-2 transition-all text-left text-[10px] font-black uppercase ${goal === g ? 'border-emerald-500 bg-emerald-50' : 'border-slate-50'}`}>
                      <span>{g}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">
                  <Settings2 size={14} className="text-emerald-500" /> <span>Equipment</span>
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {['eco', 'standard', 'premium'].map((b) => (
                    <button key={b} onClick={() => setBudget(b as any)} className={`p-4 rounded-xl border-2 transition-all text-left text-[10px] font-black uppercase ${budget === b ? 'border-emerald-500 bg-emerald-50' : 'border-slate-50'}`}>
                      <span>{b}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button 
              onClick={handleGenerate} 
              className="w-full mt-10 bg-slate-900 text-white py-6 rounded-3xl font-black uppercase tracking-widest text-xs hover:bg-emerald-600 transition-all flex items-center justify-center gap-4 shadow-xl active:scale-95"
            >
              <span>Generate Architecture</span> <ArrowRight size={20} />
            </button>
          </div>
        </div>
      )}

      {step === 3 && result && (
        <div className="animate-fade-in space-y-10 pb-20">
          <button onClick={() => setStep(1)} className="flex items-center gap-2 text-slate-400 hover:text-slate-900 font-black uppercase text-[10px] tracking-widest transition-all">
            <RotateCcw size={16} /> <span>Back to Form</span>
          </button>

          <div className="bg-white rounded-[4rem] border border-slate-100 shadow-3xl overflow-hidden">
            <div className="bg-slate-900 p-10 md:p-16 text-white">
              <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter leading-none"><span>{result.title}</span></h1>
              <p className="text-slate-400 text-sm max-w-2xl font-medium mt-4"><span>{result.description}</span></p>
            </div>

            <div className="p-10 md:p-16 grid grid-cols-1 lg:grid-cols-3 gap-16">
              <div className="lg:col-span-2 space-y-4">
                {result.components.map((c, i) => (
                  <div key={i} className="flex items-center justify-between p-6 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="font-black text-slate-900 uppercase text-[11px]">
                      <span>{c.name}</span> <span className="text-slate-400 ml-2">x{c.quantity}</span>
                    </div>
                    <div className="font-black text-slate-900"><span>{formatPrice(c.price * c.quantity)}</span></div>
                  </div>
                ))}
              </div>

              <div className="bg-slate-50 p-10 rounded-[3rem] border border-slate-100 h-fit sticky top-10">
                <div className="text-[10px] font-black text-slate-400 uppercase mb-2">Investment</div>
                <div className="text-4xl font-black text-slate-900 mb-8 tracking-tighter"><span>{formatPrice(result.totalPrice)}</span></div>
                <button onClick={handleAddToCart} className="w-full bg-slate-900 text-white hover:bg-emerald-600 py-6 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all shadow-xl flex items-center justify-center gap-3">
                  <Layers size={18} /> <span>Add to Cart</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};