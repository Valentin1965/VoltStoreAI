
import React, { useState, useMemo } from 'react';
import { useNotification } from '../../contexts/NotificationContext';
import { useCart } from '../../contexts/CartContext';
import { Sparkles, RotateCcw, Check, Loader2, ShieldCheck, Activity, Cpu, Zap, Settings2, RefreshCw } from 'lucide-react';
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
    title: "Optimal Energy System Pro",
    description: "Based on your profile, we have assembled a reliable set. You can swap any component for an analogue from another brand.",
    components: [
      { 
        id: 'inv-deye-5', name: 'Hybrid Inverter Deye 5kW', price: 42000, quantity: 1, 
        alternatives: [
          { id: 'inv-lux-5', name: 'Luxpower SNA5000 Eco', price: 34500 },
          { id: 'inv-must-5', name: 'Must PH18-5248 PRO', price: 22800 }
        ]
      },
      { 
        id: 'bat-pylon-5', name: 'Pylontech US5000 4.8kW Battery', price: 68000, quantity: 1,
        alternatives: [
          { id: 'bat-dyn-5', name: 'Dyness A48100 4.8kW', price: 59500 }
        ]
      },
      { 
        id: 'panel-jinko-450', name: 'Jinko Solar 450W MBB Panel', price: 8500, quantity: 4,
        alternatives: [
          { id: 'panel-longi-540', name: 'Longi Solar 540W Hi-MO 5', price: 9400 }
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
  const [configuringId, setConfiguringId] = useState<string | null>(null);
  
  const { addNotification } = useNotification();
  const { addItem } = useCart();
  
  const [config, setConfig] = useState({
    objectType: 'Private House',
    monthlyUsage: '300-600 kWh',
    purpose: 'Backup Power',
    budget: 'Optimal'
  });

  const handleCalculate = async () => {
    setLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `You are an energy expert. Create an optimal equipment set for: ${config.objectType}, average consumption: ${config.monthlyUsage}. 
      The object needs: ${config.purpose}.
      Return ONLY clean JSON without Markdown: {"title": "Kit Name", "description": "Short description", "components": [{"id": "1", "name": "Exact product name", "price": 100, "quantity": 1, "alternatives": [{"id": "alt1", "name": "Analog", "price": 95}]}]}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { 
          responseMimeType: "application/json"
        }
      });

      const responseText = response.text;
      if (!responseText) throw new Error("Empty response");
      
      const data = JSON.parse(responseText);
      setResult({ title: data.title, description: data.description });
      setActiveComponents(data.components || []);
      setStep(3);
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
    setActiveComponents(template.components);
    setStep(3);
  };

  const replaceComponent = (componentId: string, alt: Alternative) => {
    setActiveComponents(prev => prev.map(c => 
      c.id === componentId 
        ? { 
            ...c, 
            id: alt.id, 
            name: alt.name, 
            price: alt.price,
            alternatives: [
              { id: c.id, name: c.name, price: c.price },
              ...c.alternatives.filter(a => a.id !== alt.id)
            ]
          } 
        : c
    ));
    setConfiguringId(null);
    addNotification('Component replaced', 'info');
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
        <h1 className="text-4xl font-black text-slate-900 tracking-tight">System Configuration</h1>
      </div>

      <div className="bg-white rounded-[3.5rem] border border-slate-100 shadow-2xl overflow-hidden min-h-[500px] relative">
        {loading && (
          <div className="absolute inset-0 z-[60] bg-white/80 backdrop-blur-md flex flex-col items-center justify-center gap-4">
            <Loader2 className="text-yellow-500 animate-spin" size={48} />
            <p className="text-sm font-black text-slate-900 uppercase tracking-widest animate-pulse">Analyzing your needs...</p>
          </div>
        )}

        <div className="p-8 md:p-14">
          {step === 1 && (
            <div className="space-y-12 animate-fade-in">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Property Type</label>
                  <div className="grid grid-cols-1 gap-3">
                    {['Private House', 'Apartment / Office', 'Business'].map(t => (
                      <button key={t} onClick={() => setConfig({...config, objectType: t})} className={`p-5 rounded-[2rem] border-2 text-left font-bold transition-all flex justify-between items-center ${config.objectType === t ? 'border-yellow-400 bg-yellow-50 text-yellow-950' : 'border-slate-50 bg-slate-50/50 text-slate-400'}`}>
                        {t} {config.objectType === t && <Check size={16} />}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Monthly Usage</label>
                  <div className="grid grid-cols-1 gap-3">
                    {['< 300 kWh', '300-600 kWh', '600+ kWh'].map(u => (
                      <button key={u} onClick={() => setConfig({...config, monthlyUsage: u})} className={`p-5 rounded-[2rem] border-2 text-left font-bold transition-all flex justify-between items-center ${config.monthlyUsage === u ? 'border-yellow-400 bg-yellow-50 text-yellow-950' : 'border-slate-50 bg-slate-50/50 text-slate-400'}`}>
                        {u} {config.monthlyUsage === u && <Check size={16} />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <button 
                onClick={handleCalculate} 
                className="w-full bg-slate-900 text-white py-6 rounded-[2.5rem] font-black flex items-center justify-center gap-4 hover:bg-slate-800 transition-all shadow-xl active:scale-[0.98]"
              >
                Get Proposal <Sparkles size={20} className="text-yellow-400" />
              </button>
            </div>
          )}

          {step === 3 && result && (
            <div className="animate-fade-in space-y-12">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-3xl font-black text-slate-900">{result.title}</h2>
                  <p className="text-sm text-slate-500 mt-2">{result.description}</p>
                </div>
                <button onClick={() => setStep(1)} className="p-4 bg-slate-50 rounded-full text-slate-300 hover:text-yellow-600 transition-all shadow-inner"><RotateCcw size={24}/></button>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                <div className="lg:col-span-2 space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <ShieldCheck className="text-green-500" size={16} />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Certified Components</span>
                  </div>
                  {activeComponents.map(c => (
                    <div key={c.id} className="flex flex-col gap-3">
                      <div className="p-6 bg-white rounded-[2rem] border border-slate-100 flex justify-between items-center group hover:border-yellow-200 transition-all shadow-sm">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-yellow-50 group-hover:text-yellow-600 transition-colors">
                            <Zap size={20} />
                          </div>
                          <div>
                            <div className="font-bold text-slate-900">{c.name}</div>
                            <div className="text-[10px] text-slate-400 font-black uppercase">
                              {c.quantity} pcs × ₴{c.price.toLocaleString()}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          {c.alternatives && c.alternatives.length > 0 && (
                            <button 
                              onClick={() => setConfiguringId(configuringId === c.id ? null : c.id)}
                              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                                configuringId === c.id 
                                ? 'bg-slate-900 text-white' 
                                : 'bg-slate-50 text-slate-400 hover:text-slate-900 border border-slate-100'
                              }`}
                            >
                              <Settings2 size={12} />
                              Config
                            </button>
                          )}
                          <div className="font-black text-slate-900 text-right w-24">₴{(c.price * c.quantity).toLocaleString()}</div>
                        </div>
                      </div>

                      {configuringId === c.id && c.alternatives && (
                        <div className="px-6 pb-4 pt-2 bg-slate-50/50 rounded-[2rem] border border-slate-100 animate-fade-in space-y-3">
                          <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 px-2">Available alternatives:</div>
                          {c.alternatives.map(alt => (
                            <button 
                              key={alt.id}
                              onClick={() => replaceComponent(c.id, alt)}
                              className="w-full flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200 hover:border-yellow-400 transition-all text-left group"
                            >
                              <div className="flex items-center gap-3">
                                <RefreshCw size={12} className="text-slate-300 group-hover:text-yellow-600 transition-colors" />
                                <span className="text-xs font-bold text-slate-700">{alt.name}</span>
                              </div>
                              <span className="text-xs font-black text-slate-900">₴{alt.price.toLocaleString()}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <div className="space-y-6">
                  <div className="bg-slate-900 p-8 rounded-[3rem] text-center text-white shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-400/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 relative z-10">Total Value</div>
                    <div className="text-4xl font-black text-yellow-400 mb-8 relative z-10">₴{totalPrice.toLocaleString()}</div>
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
                        addNotification('Kit added to cart', 'success');
                      }}
                      className="w-full bg-yellow-400 text-yellow-950 py-5 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-yellow-500 transition-all shadow-lg active:scale-95"
                    >
                      Add to Cart
                    </button>
                  </div>
                  
                  <div className="bg-blue-50 p-6 rounded-[2rem] border border-blue-100">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="bg-blue-600 p-2 rounded-lg text-white">
                        <Activity size={16} />
                      </div>
                      <span className="font-black text-xs text-blue-900 uppercase">Reliability Analysis</span>
                    </div>
                    <p className="text-[10px] text-blue-700 font-medium leading-relaxed">
                      This configuration ensures stable operation of your devices based on the selected object parameters.
                    </p>
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
