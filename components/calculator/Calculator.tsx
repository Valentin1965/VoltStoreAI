import React, { useState, useMemo } from 'react';
import { useNotification } from '../../contexts/NotificationContext';
import { useCart } from '../../contexts/CartContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { 
  RotateCcw, Check, Activity, Zap, Settings2, Target, Wallet, Sparkles, ShoppingCart
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
  const { formatPrice, t } = useLanguage();
  
  const [config, setConfig] = useState({ 
    objectType: 'Private House', 
    monthlyUsage: '300-600 kWh/month', 
    purpose: 'Backup Power', 
    budget: 'Optimal'
  });

  const generateAiSolution = async () => {
    const apiKey = "AIzaSyDhNAK8S9_HQdCQD-y9nkY_d9IaLOmm9tg";
    const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    setLoading(true);
    try {
      const prompt = `
        As a Solar Energy Expert, design a system for:
        Object: ${config.objectType}, Monthly Usage: ${config.monthlyUsage}, 
        Primary Goal: ${config.purpose}, Budget Level: ${config.budget}.
        
        IMPORTANT: Return ONLY a JSON object in this format:
        {
          "title": "Name in Ukrainian",
          "description": "Benefits in Ukrainian",
          "components": [
            {"name": "English Technical Name", "price": number_in_eur, "quantity": number}
          ]
        }
      `;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });

      if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);

      const resData = await response.json();
      const aiText = resData.candidates[0].content.parts[0].text;
      const cleanJson = aiText.replace(/```json|```/gi, '').trim();
      const data = JSON.parse(cleanJson);

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
      addNotification("Solution generated successfully", "success");
    } catch (err: any) {
      console.error('AI Error:', err);
      addNotification("AI Architect is busy. Try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  const totalPrice = useMemo(() => 
    activeComponents.reduce((s, c) => s + (c.price * c.quantity), 0)
  , [activeComponents]);

  const handleAddToCart = () => {
    activeComponents.forEach(comp => {
      addItem({
        id: comp.id,
        name: comp.name,
        price: comp.price,
        image: 'https://images.unsplash.com/photo-1509391366360-feaffa44d51a?auto=format&fit=crop&q=80&w=200',
        category: 'Components'
      });
    });
    addNotification("All components added to cart", "success");
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-[3rem] shadow-3xl border border-slate-100 overflow-hidden">
        {step === 1 ? (
          <div className="p-10 space-y-8">
            <div className="flex items-center gap-4 mb-4">
              <div className="bg-yellow-400 p-3 rounded-2xl">
                <Sparkles className="text-yellow-950" />
              </div>
              <h2 className="text-3xl font-black uppercase tracking-tighter">AI Architect</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 px-2">Object Type</label>
                <select 
                  className="w-full bg-slate-50 p-4 rounded-2xl font-bold border-2 border-transparent focus:border-yellow-400 outline-none"
                  value={config.objectType}
                  onChange={(e) => setConfig({...config, objectType: e.target.value})}
                >
                  <option>Private House</option>
                  <option>Office/Business</option>
                  <option>Industrial</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 px-2">Purpose</label>
                <select 
                  className="w-full bg-slate-50 p-4 rounded-2xl font-bold border-2 border-transparent focus:border-yellow-400 outline-none"
                  value={config.purpose}
                  onChange={(e) => setConfig({...config, purpose: e.target.value})}
                >
                  <option>Backup Power</option>
                  <option>Full Autonomy</option>
                  <option>Savings/Net Metering</option>
                </select>
              </div>
            </div>

            <button 
              onClick={generateAiSolution}
              disabled={loading}
              className="w-full bg-slate-900 text-white py-6 rounded-3xl font-black uppercase tracking-widest hover:bg-yellow-400 hover:text-yellow-950 transition-all shadow-xl disabled:opacity-50"
            >
              {loading ? "Analyzing Data..." : "Generate My Solution"}
            </button>
          </div>
        ) : (
          <div className="p-10 space-y-8 animate-fade-in">
            <div className="bg-yellow-50 p-8 rounded-[2.5rem] border border-yellow-100">
              <h3 className="text-2xl font-black text-yellow-950 mb-2 uppercase tracking-tighter">{result?.title}</h3>
              <p className="text-yellow-800 font-medium leading-relaxed">{result?.description}</p>
            </div>

            <div className="space-y-4">
              {activeComponents.map((comp) => (
                <div key={comp.id} className="flex justify-between items-center p-5 bg-slate-50 rounded-2xl border border-slate-100">
                  <div>
                    <p className="font-black text-slate-900">{comp.name}</p>
                    <p className="text-xs text-slate-400 font-bold uppercase">Qty: {comp.quantity}</p>
                  </div>
                  <p className="font-black text-slate-900 text-lg">{formatPrice(comp.price * comp.quantity)}</p>
                </div>
              ))}
            </div>

            <div className="pt-6 border-t border-slate-100 flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="text-center md:text-left">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Investment</p>
                <p className="text-4xl font-black text-slate-900 tracking-tighter">{formatPrice(totalPrice)}</p>
              </div>
              
              <div className="flex gap-3">
                <button 
                  onClick={() => setStep(1)}
                  className="p-5 bg-slate-100 text-slate-600 rounded-2xl hover:bg-slate-200 transition-all"
                >
                  <RotateCcw size={24} />
                </button>
                <button 
                  onClick={handleAddToCart}
                  className="bg-slate-900 text-white px-8 py-5 rounded-2xl font-black uppercase tracking-widest flex items-center gap-3 hover:bg-yellow-400 hover:text-yellow-950 transition-all shadow-xl"
                >
                  <ShoppingCart size={20} />
                  Add to Cart
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
