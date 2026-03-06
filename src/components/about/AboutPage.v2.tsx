import React, { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useProducts } from '../../contexts/ProductsContext';
import { useCart } from '../../contexts/CartContext';
import { useNotification } from '../../contexts/NotificationContext';
import { 
  Zap, Award, ChevronRight, Sparkles, Crown, Layers, Battery, Sun, Cpu, X, 
  Info, ShoppingBag, List, Rocket, Settings, Hammer, PlusCircle, 
  PlusSquare, ShieldCheck, FileText, Download, Activity, Loader2,
  ChevronLeft, ThermometerSun, Trash2
} from 'lucide-react';
import { AppView, Category, Product, LocalizedText, KitComponent } from '../../types';
import { ProductCard, useLocalizedText } from '../catalog/CatalogSection';

interface AboutPageProps {
  onNavigateToCatalog: (view: AppView) => void;
}

const IMAGE_FALLBACK = 'https://images.unsplash.com/photo-1509391366360-fe5bb58583bb?q=80&w=600&auto=format&fit=crop';
const HERO_VIBRANT = 'https://images.unsplash.com/photo-1542332213-31f87348057f?q=80&w=2000&auto=format&fit=crop';
const MISSION_IMG = 'https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?q=80&w=1200&auto=format&fit=crop';

export const AboutPage: React.FC<AboutPageProps> = ({ onNavigateToCatalog }) => {
  const { t, formatPrice } = useLanguage();
  const { products, setSelectedCategory, categories, isLoading } = useProducts();
  const { addItem } = useCart();
  const { addNotification } = useNotification();
  const getLoc = useLocalizedText();

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [kitComponents, setKitComponents] = useState<KitComponent[]>([]);
  const [selectedAddCat, setSelectedAddCat] = useState<Category | ''>('');
  const [selectedAddProdId, setSelectedAddProdId] = useState<string>('');

  const salesLeaders = useMemo(() => 
    products.filter(p => p.is_leader === true).slice(0, 5), 
  [products]);

  const currentTotal = useMemo(() => {
    if (!selectedProduct) return 0;
    if (selectedProduct.category !== 'Sæt') return selectedProduct.price;
    return kitComponents.reduce((sum, c) => sum + (c.price * (c.quantity || 1)), 0);
  }, [selectedProduct, kitComponents]);

  const addableProducts = useMemo(() => {
    if (!selectedAddCat) return [];
    return products.filter(p => p.category === selectedAddCat && p.category !== 'Sæt');
  }, [selectedAddCat, products]);

  const safeParse = (input: any) => {
    if (!input) return [];
    if (Array.isArray(input)) return input;
    try {
      const data = typeof input === 'string' ? JSON.parse(input) : input;
      return Array.isArray(data) ? data : [];
    } catch (e) { return []; }
  };

  useEffect(() => {
    if (selectedProduct) {
      document.body.style.overflow = 'hidden';
      if (selectedProduct.category === 'Sæt') {
        setKitComponents(Array.isArray(selectedProduct.kitComponents) ? selectedProduct.kitComponents : []);
      }
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [selectedProduct]);

  const addNewComp = () => {
    const prod = products.find(p => p.id === selectedAddProdId);
    if (!prod) return;
    setKitComponents(prev => [...prev, { id: prod.id, name: getLoc(prod.name), price: prod.price, quantity: 1 }]);
    setSelectedAddProdId('');
    addNotification("Hardware integreret", "success");
  };

  const handleFinalAddToCart = () => {
    if (!selectedProduct) return;
    if (selectedProduct.category === 'Sæt') {
      addItem({ ...selectedProduct, price: currentTotal }, [...kitComponents]);
    } else {
      addItem(selectedProduct);
    }
    addNotification(t('item_added'), 'success');
    setSelectedProduct(null);
  };

  const categoryIcons: Record<string, React.ReactNode> = {
    'Ladestationer': <Zap size={18} />,
    'Invertere': <Cpu size={18} />,
    'Batterier': <Battery size={18} />,
    'Solpaneler': <Sun size={18} />,
    'Sæt': <Layers size={18} />,
    'Varmepumper': <ThermometerSun size={18} />,
    'Monteringssystemer': <Hammer size={18} />
  };

  return (
    <div className="animate-fade-in pb-16 space-y-14 max-w-7xl mx-auto text-slate-900">
      
      {/* 1. HERO SECTION */}
      <section className="relative h-[300px] md:h-[420px] -mt-10 overflow-hidden rounded-[2.5rem] shadow-2xl text-center">
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-slate-900/30 z-10"></div>
        <img src={HERO_VIBRANT} className="absolute inset-0 w-full h-full object-cover animate-slow-zoom brightness-110" alt="Clean Energy" />
        <div className="relative z-20 h-full flex flex-col items-center justify-center text-center px-6">
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-xl border border-white/30 text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.3em] mb-6 shadow-xl">
            <Sparkles size={14} className="text-yellow-400" /> Fremtiden er her
          </div>
          <h1 className="text-3xl md:text-6xl font-black text-white leading-[1.0] tracking-tighter uppercase mb-6 drop-shadow-[0_8px_20px_rgba(0,0,0,0.5)]">
            energien i<br/>
            <span className="text-emerald-400 italic">dit hjem</span>
          </h1>
          <p className="text-white text-sm md:text-base font-bold max-w-lg mb-8 tracking-tight leading-snug opacity-95">
            Vi sælger ikke bare udstyr — vi skaber din personlige uafhængighed fra elnettet.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <button onClick={() => onNavigateToCatalog(AppView.CATALOG)} className="bg-emerald-500 hover:bg-emerald-400 text-white px-8 py-3.5 rounded-[1.5rem] font-black uppercase text-[10px] tracking-widest transition-all shadow-xl active:scale-95 flex items-center gap-2">Til Katalog <ChevronRight size={16} /></button>
            <button onClick={() => onNavigateToCatalog(AppView.CALCULATOR)} className="bg-white/10 backdrop-blur-2xl border border-white/40 text-white px-8 py-3.5 rounded-[1.5rem] font-black uppercase text-[10px] tracking-widest hover:bg-white hover:text-slate-900 transition-all active:scale-95">{t('nav_architect')}</button>
          </div>
        </div>
      </section>

      {/* 2. CATEGORIES */}
      <section className="w-full px-4 -mt-24 md:-mt-32 relative z-30">
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2 md:gap-3 max-w-[95%] mx-auto">
          {(['Ladestationer', 'Invertere', 'Batterier', 'Solpaneler', 'Sæt', 'Varmepumper', 'Monteringssystemer'] as Category[]).map((cat) => (
            <button
              key={cat}
              onClick={() => { setSelectedCategory(cat); onNavigateToCatalog(AppView.CATALOG); }}
              className="group bg-white p-2.5 md:p-3 rounded-[1.8rem] border border-slate-100 shadow-lg hover:shadow-xl hover:border-emerald-500 hover:-translate-y-1 transition-all duration-500 flex flex-col items-center text-center gap-1.5"
            >
              <div className="w-10 h-10 md:w-11 md:h-11 bg-emerald-50 text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white rounded-xl flex items-center justify-center transition-all duration-500 shadow-sm shrink-0">
                {categoryIcons[cat]}
              </div>
              <span className="text-[11px] md:text-[13px] font-black uppercase tracking-tighter text-black leading-[1.1] group-hover:text-emerald-600 px-1 line-clamp-2">{cat}</span>
            </button>
          ))}
        </div>
      </section>

      {/* 3. SALES LEADERS */}
      {salesLeaders.length > 0 && (
        <section className="container mx-auto px-4 space-y-8 pt-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 px-4 text-left">
            <div className="space-y-2">
               <div className="inline-flex items-center gap-2 bg-amber-50 text-amber-600 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border border-amber-100">
                <Crown size={12} className="fill-amber-600" /> Topvurderet udstyr
               </div>
               <h2 className="text-3xl font-black uppercase tracking-tighter leading-none">Bedst <span className="text-emerald-500">sælgende</span></h2>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {salesLeaders.map((p, idx) => (
              <ProductCard key={p.id} product={p} index={idx} onSelect={setSelectedProduct} onAddToCart={(e, prod) => { e.stopPropagation(); addItem(prod); addNotification(t('item_added'), 'success'); }} />
            ))}
          </div>
        </section>
      )}

      {/* 4. EXTENDED ABOUT US */}
      <section className="container mx-auto px-6 pt-12 text-slate-900 text-left">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">
          <div className="space-y-8">
            <div className="space-y-4">
              <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tighter leading-none">
                Hvem <span className="text-emerald-500">er vi?</span>
              </h2>
              <p className="text-slate-600 text-base leading-relaxed font-medium">
                GL Solar Group blev grundlagt med en vision om at gøre vedvarende energi tilgængelig for alle. Vi er et team af dedikerede eksperter med mange års erfaring inden for solenergi, batterisystemer og energieffektivisering.
              </p>
              <p className="text-slate-600 text-base leading-relaxed font-medium">
                Vores passion er at levere løsninger, der henter energi fra naturen. Vi er specialister i professionelle solcelleanlæg og hjælper dig med at reducere dine elregninger markant.
              </p>
            </div>
            <div className="bg-slate-50 p-7 rounded-[2rem] border border-slate-100">
               <div className="flex items-center gap-2 bg-emerald-500 text-white px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest w-fit mb-4 shadow-lg"><Award size={14} /> Vores Mission</div>
               <p className="text-slate-700 text-sm font-bold leading-relaxed">
                 Vores mission er at gøre rejsen mod grøn energi enkel, gennemsigtig og rentabel для enhver husstand og virksomhed.
               </p>
            </div>
          </div>
          <div className="relative">
             <div className="absolute -inset-8 bg-emerald-500/10 blur-[100px] rounded-full"></div>
             <img src={MISSION_IMG} alt="Sol mission" className="relative rounded-[3rem] shadow-2xl border border-white z-10 max-h-[350px] w-full object-cover" />
          </div>
        </div>
      </section>

      {/* 5. WHY TRUST US? */}
      <section className="bg-slate-900 py-16 rounded-[4rem] mx-4 px-6 overflow-hidden relative text-left">
        <div className="container mx-auto relative z-10 text-white">
          <div className="space-y-3 mb-14 text-center">
             <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter">Hvorfor <span className="text-emerald-400 italic">stole</span> på os?</h2>
             <div className="w-16 h-1 bg-emerald-500 mx-auto rounded-full"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-7 rounded-[2rem] hover:bg-white/10 transition-all group">
              <Award className="text-amber-400 mb-4" size={28} />
              <h3 className="text-lg font-black uppercase tracking-tight mb-3">Erfaring</h3>
              <p className="text-slate-400 text-[12px] leading-relaxed">Vi har gennemført hundredvis af projekter for familier, virksomheder og offentlige institutioner over hele landet.</p>
            </div>
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-7 rounded-[2rem] hover:bg-white/10 transition-all group">
              <Settings className="text-emerald-400 mb-4" size={28} />
              <h3 className="text-lg font-black uppercase tracking-tight mb-3">Fuld Service</h3>
              <p className="text-slate-400 text-[12px] leading-relaxed">Vi håndterer alt: fra rådgivning og valg af højeffektive invertere til teknisk support og vedligeholdelse.</p>
            </div>
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-7 rounded-[2rem] hover:bg-white/10 transition-all group">
              <Rocket className="text-blue-400 mb-4" size={28} />
              <h3 className="text-lg font-black uppercase tracking-tight mb-3">Teknologi</h3>
              <p className="text-slate-400 text-[12px] leading-relaxed">Vi tilbyder kun avanceret udstyr med de højeste effektivitetsrater på markedet i dag.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. ENHANCED MODAL FOR BESTSELLERS */}
      {selectedProduct && (
        <div className="fixed inset-0 z-[10000] flex flex-col items-center pt-[5vh] px-4 bg-slate-900/90 backdrop-blur-xl animate-fade-in overflow-y-auto text-left">
          <div className={`bg-white w-full ${selectedProduct.category === 'Sæt' ? 'max-w-6xl' : 'max-w-5xl'} rounded-[3rem] shadow-2xl flex flex-col mb-10 max-h-[90vh] overflow-hidden text-slate-900`}>
            
            {/* Modal Header */}
            <div className="px-10 py-6 border-b flex items-center justify-between bg-white shrink-0">
              <div className="flex items-center gap-4 text-left">
                <div className="bg-emerald-600 p-3 rounded-2xl text-white shadow-lg shadow-emerald-600/20"><Zap size={22} /></div>
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-lg font-black uppercase tracking-tight leading-none">{getLoc(selectedProduct.name)}</h2>
                    <span className="bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest flex items-center gap-1">
                       <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Ready to Ship
                    </span>
                  </div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">{selectedProduct.category} • Certified Asset</p>
                </div>
              </div>
              <button onClick={() => setSelectedProduct(null)} className="p-3 hover:bg-slate-50 rounded-full transition-all text-slate-400"><X size={32} /></button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-8 md:p-12">
              {selectedProduct.category === 'Sæt' ? (
                /* --- KIT MODAL --- */
                <div className="space-y-10">
                  <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white shadow-2xl space-y-8">
                    <div className="flex items-center gap-3 border-b border-white/10 pb-5">
                      <PlusCircle className="text-emerald-400" size={24} />
                      <h3 className="text-[11px] font-black uppercase tracking-[0.2em]">Hardware Integration</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10 text-left">
                      <select value={selectedAddCat} onChange={e => setSelectedAddCat(e.target.value as Category)} className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-[11px] font-black uppercase text-white outline-none focus:border-emerald-400">
                         <option value="" className="text-slate-900">Kategori...</option>
                         {categories.filter(c => c !== 'Sæt').map(c => <option key={c} value={c} className="text-slate-900">{c}</option>)}
                      </select>
                      <select disabled={!selectedAddCat} value={selectedAddProdId} onChange={e => setSelectedAddProdId(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-[11px] font-black uppercase text-white outline-none focus:border-emerald-400 disabled:opacity-20">
                         <option value="" className="text-slate-900">Vælg produkt...</option>
                         {addableProducts.map(p => <option key={p.id} value={p.id} className="text-slate-900">{getLoc(p.name)} ({formatPrice(p.price)})</option>)}
                      </select>
                      <button onClick={addNewComp} disabled={!selectedAddProdId} className="bg-emerald-500 py-4.5 rounded-2xl font-black uppercase text-[11px] tracking-widest shadow-xl flex items-center justify-center gap-3 active:scale-95 disabled:opacity-20">Integrer</button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {kitComponents.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                        <div className="text-left"><p className="text-[12px] font-black uppercase">{item.name}</p><p className="text-[10px] font-bold text-emerald-600">{formatPrice(item.price)}</p></div>
                        <button onClick={() => setKitComponents(kitComponents.filter((_, i) => i !== idx))} className="p-3 text-slate-300 hover:text-rose-500"><Trash2 size={22}/></button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                /* --- PRODUCT MODAL (FULL WIDTH OVERVIEW) --- */
                <div className="flex flex-col space-y-12">
                  {/* TOP ROW: Image & Quick Status */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
                    <div className="lg:col-span-5">
                      <div className="aspect-square bg-slate-50 rounded-[3rem] p-10 flex items-center justify-center border border-slate-100 relative shadow-inner">
                        <img src={selectedProduct.image || IMAGE_FALLBACK} className="max-w-full max-h-full object-contain drop-shadow-3xl" alt="" />
                      </div>
                    </div>
                    
                    <div className="lg:col-span-7 space-y-6 text-left">
                       <div className="bg-emerald-50/50 p-8 rounded-[2.5rem] border border-emerald-100/50">
                          <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-emerald-500 flex items-center gap-2 mb-4">
                            <ShieldCheck size={16}/> Quick Status
                          </h4>
                          <div className="flex flex-wrap gap-8">
                             <div className="flex flex-col">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Availability</span>
                                <span className="text-sm font-black text-slate-900 uppercase">Ready for Dispatch</span>
                             </div>
                             <div className="flex flex-col border-l border-emerald-200 pl-8">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Warranty</span>
                                <span className="text-sm font-black text-slate-900 uppercase">10-15 Years</span>
                             </div>
                          </div>
                       </div>
                    </div>
                  </div>

                  {/* FULL WIDTH: Asset Overview (Scrollable) */}
                  <div className="space-y-4 text-left border-t border-slate-100 pt-8">
                    <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-emerald-500 flex items-center gap-2">
                      <Info size={18} /> Asset Overview
                    </h4>
                    <div className="max-h-[140px] overflow-y-auto pr-4 custom-scrollbar">
                      <p className="text-base font-medium text-slate-600 leading-relaxed italic">
                        {getLoc(selectedProduct.description)}
                      </p>
                    </div>
                  </div>

                  {/* BOTTOM ROW: Metrics & Documentation parallel columns */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 text-left border-t border-slate-100 pt-8">
                    {/* Specs Column */}
                    <div className="space-y-6">
                      <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400 flex items-center gap-2">
                        <List size={18} className="text-emerald-500" /> Technical Metrics
                      </h4>
                      <div className="bg-slate-50 rounded-[2rem] border border-slate-100 overflow-hidden shadow-sm">
                        {safeParse(selectedProduct.specs).length > 0 ? safeParse(selectedProduct.specs).map((s: any, i: number) => (
                          <div key={i} className="flex justify-between p-4 text-[10px] border-b border-white last:border-0 hover:bg-white transition-all">
                            <span className="font-black text-slate-400 uppercase tracking-tighter">{s.label}</span>
                            <span className="font-bold text-slate-900">{s.value}</span>
                          </div>
                        )) : <p className="p-8 text-[9px] font-bold text-slate-300 uppercase italic text-center">Specifications loading...</p>}
                      </div>
                    </div>

                    {/* PDF Column */}
                    <div className="space-y-6">
                      <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400 flex items-center gap-2">
                        <FileText size={18} className="text-emerald-500" /> Documentation (PDF)
                      </h4>
                      <div className="space-y-3">
                        {safeParse(selectedProduct.docs).length > 0 ? safeParse(selectedProduct.docs).map((doc: any, i: number) => (
                          <a key={i} href={doc.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-5 bg-white border border-slate-100 rounded-2xl hover:border-emerald-500 hover:shadow-xl transition-all group shadow-sm">
                            <div className="flex items-center gap-4">
                              <Download size={18} className="text-emerald-500 group-hover:scale-110 transition-transform" />
                              <span className="text-[10px] font-black uppercase text-slate-900 truncate max-w-[200px]">{doc.title || 'Technical Manual'}</span>
                            </div>
                            <ChevronRight size={18} className="text-slate-200 group-hover:text-emerald-500 transition-colors" />
                          </a>
                        )) : (
                          <div className="p-10 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200 text-center">
                            <p className="text-[9px] font-black text-slate-300 uppercase">No Data Sheets available</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-10 py-10 bg-slate-900 flex items-center justify-between shadow-3xl border-t border-white/5 shrink-0 rounded-b-[3rem]">
              <div className="flex flex-col text-white text-left">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-1.5">Samlet værdi</span>
                <span className="text-4xl font-black text-emerald-400 tracking-tighter">{formatPrice(currentTotal)}</span>
              </div>
              <button onClick={handleFinalAddToCart} className="px-14 py-6 bg-emerald-500 hover:bg-emerald-400 text-white rounded-[2rem] font-black uppercase text-[12px] tracking-[0.4em] shadow-lg flex items-center gap-4 active:scale-95 transition-all">
                <ShoppingBag size={24} /> {selectedProduct.category === 'Sæt' ? 'Godkend' : t('add_to_cart')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};