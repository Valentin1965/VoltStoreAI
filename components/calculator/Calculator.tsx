
import React, { useState } from 'react';
import { useNotification } from '../../contexts/NotificationContext';
import { useCart } from '../../contexts/CartContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { 
  RotateCcw, Check, ShieldCheck, 
  Activity, Cpu, Zap, Settings2, Target, Wallet, Sparkles,
  Loader2, ArrowRight, Info, Layers, CheckCircle2
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
  const { formatPrice, t } = useLanguage();

  const handleGenerate = () => {
    setLoading(true);
    
    // Simulate thinking for UX
    setTimeout(() => {
      const monthlyKwh = parseInt(consumption);
      const is3Phase = phase === '3';
      
      // Basic Engineering Logic
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
        description: `High-performance ${phase}-phase solar configuration optimized for ${goal}. Designed for ${monthlyKwh}kWh monthly load using premium ${brand} components.`,
        totalPrice: Math.round(inverterPrice + batteryPrice + panelPrice + extraPrice),
        components: [
          { name: `${brand} Hybrid Inverter ${inverterPower}kW`, quantity: 1, price: Math.round(inverterPrice), type: 'Inverter' },
          { name: `${brand} LiFePO4 Module ${batteryCap}kWh`, quantity: 1, price: Math.round(batteryPrice), type: 'Battery' },
          { name: `Bifacial N-Type Panels 450W`, quantity: panelCount, price: 120, type: 'Panel' },
          { name: `Mounting & Smart Monitor Kit`, quantity: 1, price: Math.round(extraPrice), type: 'Accessories' }
        ],
        benefits: [
          `${goal.toUpperCase()} Optimization`,
          `${phase}-Phase Balanced Load`,
          `Smart App Monitoring Included`,
          `Expandable Modular Design`
        ]
      };

      setResult(kit);
      setStep(3);
      setLoading(false);
      addNotification("System configuration calculated", "success");
    }, 1000);
  };

  const handleAddToCart = () => {
    if (!result) return;
    
    const kitProduct: Product = {
      id: `KIT-CALC-${Date.now()}`,
      name: { en: result.title },
      description: { en: result.description },
      price: result.totalPrice,
      category: 'Kits',
      image: 'https://images.unsplash.com/photo-1509391366360-fe5bb58583bb?q=80&w=800&auto=format&fit=crop',
      features: result.benefits,
      is_active: true
    };

    const kitParts = result.components.map(c => ({
      id: `part-${Math.random().toString(36).substr(2, 9)}`,
      name: c.name,
      price: c.price,
      quantity: c.quantity
    }));

    addItem(kitProduct, kitParts);
    addNotification("Custom Kit added to cart", "success");
  };

  const reset = () => {
    setStep(1);
    setResult(null);
  };

  return (
    <div className="max-w-5xl mx-auto py-10 px-4">
      {step === 1 && (
        <div className="animate-fade-in space-y-12">
          <div className="text-center space-y-4">
            <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-600 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-100">
              <Sparkles size={14} /> System {t('nav_architect')}
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 uppercase tracking-tighter leading-none">
              Build Your <span className="text-emerald-500">Independence</span>
            </h2>
          </div>

          <div className="bg-white rounded-[3rem] p-8 md:p-12 border border-slate-100 shadow-2xl grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="space-y-4">
              <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">
                <Activity size={14} className="text-emerald-500" /> Monthly Consumption (kWh)
              </label>
              <div className="relative">
                <input 
                  type="range" 
                  min="50" 
                  max="2000" 
                  step="50"
                  value={consumption}
                  onChange={(e) => setConsumption(e.target.value)}
                  className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
                <div className="flex justify-between mt-2 text-[10px] font-black text-slate-900 uppercase">
                  <span>50 kWh</span>
                  <span className="text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-100">{consumption} kWh</span>
                  <span>2000 kWh</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">
                <Zap size={14} className="text-emerald-500" /> Grid Configuration
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setPhase('1')} className={`p-4 rounded-2xl border-2 transition-all ${phase === '1' ? 'border-emerald-500 bg-emerald-50 shadow-md' : 'border-slate-50'}`}>1-Phase</button>
                <button onClick={() => setPhase('3')} className={`p-4 rounded-2xl border-2 transition-all ${phase === '3' ? 'border-emerald-500 bg-emerald-50 shadow-md' : 'border-slate-50'}`}>3-Phase</button>
              </div>
            </div>

            <div className="space-y-4">
              <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">
                <Target size={14} className="text-emerald-500" /> Goal
              </label>
              <div className="grid grid-cols-1 gap-2">
                {['savings', 'backup', 'independence'].map((g) => (
                  <button key={g} onClick={() => setGoal(g as any)} className={`p-4 rounded-xl border-2 transition-all text-left text-[10px] font-black uppercase ${goal === g ? 'border-emerald-500 bg-emerald-50 shadow-sm' : 'border-slate-50'}`}>
                    {g}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">
                <Wallet size={14} className="text-emerald-500" /> Budget Level
              </label>
              <div className="grid grid-cols-1 gap-2">
                {['eco', 'standard', 'premium'].map((b) => (
                  <button key={b} onClick={() => setBudget(b as any)} className={`p-4 rounded-xl border-2 transition-all text-left text-[10px] font-black uppercase ${budget === b ? 'border-emerald-500 bg-emerald-50 shadow-sm' : 'border-slate-50'}`}>
                    {b}
                  </button>
                ))}
              </div>
            </div>

            <div className="md:col-span-2 pt-6">
              <button 
                onClick={handleGenerate}
                disabled={loading}
                className="w-full bg-slate-900 text-white hover:bg-emerald-600 py-6 rounded-3xl font-black uppercase tracking-widest text-xs transition-all shadow-2xl flex items-center justify-center gap-4 group active:scale-95"
              >
                {loading ? <Loader2 className="animate-spin" /> : <><Cpu size={20} /> Generate {t('nav_architect')} <ArrowRight size={20} /></>}
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 3 && result && (
        <div className="animate-fade-in space-y-10 pb-20">
          <button onClick={reset} className="flex items-center gap-2 text-slate-400 hover:text-slate-900 font-black uppercase text-[10px] tracking-widest transition-all">
            <RotateCcw size={16} /> Re-Calculate
          </button>

          <div className="bg-white rounded-[4rem] border border-slate-100 shadow-3xl overflow-hidden">
            <div className="bg-slate-900 p-10 md:p-16 text-white relative">
              <div className="relative z-10 space-y-4">
                 <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter leading-none">{result.title}</h1>
                 <p className="text-slate-400 text-sm max-w-2xl font-medium leading-relaxed">{result.description}</p>
              </div>
            </div>

            <div className="p-10 md:p-16 grid grid-cols-1 lg:grid-cols-3 gap-16">
              <div className="lg:col-span-2 space-y-8">
                 {result.components.map((c, i) => (
                    <div key={i} className="flex items-center justify-between p-6 bg-slate-50 rounded-2xl border border-slate-100">
                      <div>
                        <div className="text-[10px] font-black text-slate-900 uppercase">{c.name}</div>
                        <div className="text-[8px] font-bold text-slate-400 uppercase mt-1">Qty: {c.quantity}</div>
                      </div>
                      <div className="text-[10px] font-black text-slate-900">{formatPrice(c.price * c.quantity)}</div>
                    </div>
                 ))}
              </div>

              <div className="lg:col-span-1">
                 <div className="bg-slate-50 p-10 rounded-[3rem] border border-slate-100 sticky top-32 space-y-8">
                    <div className="space-y-2 text-center">
                       <h4 className="text-[10px] font-black text-slate-400 uppercase">Investment</h4>
                       <div className="text-4xl font-black text-slate-900 tracking-tighter">{formatPrice(result.totalPrice)}</div>
                    </div>
                    <button 
                      onClick={handleAddToCart}
                      className="w-full bg-slate-900 text-white hover:bg-emerald-500 py-6 rounded-[2rem] font-black uppercase text-[10px] tracking-widest transition-all shadow-xl flex items-center justify-center gap-3 active:scale-95"
                    >
                      <Layers size={18} /> Add Kit to Cart
                    </button>
                 </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
