import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useProducts } from '../../contexts/ProductsContext';
import { useCart } from '../../contexts/CartContext';
import { useNotification } from '../../contexts/NotificationContext';
import { 
  ShieldCheck, Zap, Globe, Heart, Award, CheckCircle2, 
  ChevronRight, Mail, Phone, MapPin, Sparkles, Crown,
  Layers, Battery, Sun, Cpu, X, ShoppingCart, Info, ArrowRight,
  ChevronLeft, FileText, Download, List, Check, Rocket, Leaf, UserCheck,
  Settings, ThermometerSun, Hammer
} from 'lucide-react';
import { AppView, Category, Product, ProductSpec, ProductDoc } from '../../types';
import { ProductCard, useLocalizedText } from '../catalog/CatalogSection';

interface AboutPageProps {
  onNavigateToCatalog: (view: AppView) => void;
}

const IMAGE_FALLBACK = 'https://images.unsplash.com/photo-1509391366360-fe5bb58583bb?q=80&w=600&auto=format&fit=crop';
const HERO_VIBRANT = 'https://images.unsplash.com/photo-1542332213-31f87348057f?q=80&w=2000&auto=format&fit=crop';
const MISSION_IMG = 'https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?q=80&w=1200&auto=format&fit=crop';
const INSTALLATION_IMG = 'https://images.unsplash.com/photo-1558444479-c84826091ec2?q=80&w=1200&auto=format&fit=crop';

export const AboutPage: React.FC<AboutPageProps> = ({ onNavigateToCatalog }) => {
  const { t, formatPrice } = useLanguage();
  const { products, setSelectedCategory } = useProducts();
  const { addItem } = useCart();
  const { addNotification } = useNotification();
  const getLoc = useLocalizedText();

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [activeImageIdx, setActiveImageIdx] = useState(0);

  const salesLeaders = products.filter(p => p.is_leader === true).slice(0, 4);

  const handleCategoryClick = (cat: Category) => {
    setSelectedCategory(cat);
    onNavigateToCatalog(AppView.CATALOG);
  };

  const categoryIcons = {
    'Charging Stations': <Zap size={18} />,
    'Inverters': <Cpu size={18} />,
    'Batteries': <Battery size={18} />,
    'Solar Panels': <Sun size={18} />,
    'Kits': <Layers size={18} />,
    'Heat Pumps': <ThermometerSun size={18} />,
    'Mounting Systems': <Hammer size={18} />
  };

  useEffect(() => {
    if (selectedProduct) {
      document.body.style.overflow = 'hidden';
      setActiveImageIdx(0);
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [selectedProduct]);

  const productImages = selectedProduct 
    ? (Array.isArray(selectedProduct.images) && selectedProduct.images.length > 0
        ? selectedProduct.images.filter(img => img && typeof img === 'string' && img.trim() !== '')
        : (selectedProduct.image && typeof selectedProduct.image === 'string' && selectedProduct.image.trim() !== '' ? [selectedProduct.image] : [IMAGE_FALLBACK]))
    : [IMAGE_FALLBACK];

  const parseJsonData = (data: any): any[] => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    try { return typeof data === 'string' ? JSON.parse(data) : []; } catch { return []; }
  };

  const selectedProductNameStr = selectedProduct ? getLoc(selectedProduct.name) : "";
  const isSelectedInactive = selectedProduct ? (selectedProduct.stock === 0 || selectedProduct.stock === null || selectedProduct.is_active === false) : false;
  const filteredSpecs = selectedProduct ? parseJsonData(selectedProduct.specs) : [];
  const productDocs = selectedProduct ? parseJsonData(selectedProduct.docs) : [];

  return (
    <div className="animate-fade-in pb-16 space-y-14 max-w-7xl mx-auto">
      
      {/* 1. HERO SECTION - Compacted */}
      <section className="relative h-[300px] md:h-[380px] -mt-10 overflow-hidden rounded-[2.5rem] shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-slate-900/20 z-10"></div>
        <img 
          src={HERO_VIBRANT} 
          className="absolute inset-0 w-full h-full object-cover animate-slow-zoom brightness-110" 
          alt="Clean Energy" 
        />
        
        <div className="relative z-20 h-full flex flex-col items-center justify-center text-center px-6">
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-xl border border-white/30 text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.3em] mb-6 shadow-xl">
            <Sparkles size={14} className="text-yellow-400" /> The Future is Here
          </div>
          <h1 className="text-3xl md:text-6xl font-black text-white leading-[1.0] tracking-tighter uppercase mb-6 drop-shadow-[0_8px_20px_rgba(0,0,0,0.5)]">
            the energy<br/>
            <span className="text-emerald-400 italic">of your home</span>
          </h1>
          <p className="text-white text-sm md:text-base font-bold max-w-lg mb-8 tracking-tight leading-snug opacity-95">
            We don't just sell equipment — we create your personal independence from energy grids.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <button 
              onClick={() => onNavigateToCatalog(AppView.CATALOG)}
              className="bg-emerald-500 hover:bg-emerald-400 text-white px-8 py-3.5 rounded-[1.5rem] font-black uppercase text-[10px] tracking-widest transition-all shadow-xl active:scale-95 flex items-center gap-2"
            >
              To Catalog <ChevronRight size={16} />
            </button>
            <button 
              onClick={() => onNavigateToCatalog(AppView.CALCULATOR)}
              className="bg-white/10 backdrop-blur-2xl border border-white/40 text-white px-8 py-3.5 rounded-[1.5rem] font-black uppercase text-[10px] tracking-widest hover:bg-white hover:text-slate-900 transition-all active:scale-95"
            >
              {t('nav_architect')}
            </button>
          </div>
        </div>
      </section>

      {/* 2. CATEGORIES - Increased font size, kept button size by adjusting padding and gap */}
      <section className="w-full px-4 -mt-24 md:-mt-32 relative z-30">
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2 md:gap-3 max-w-[95%] mx-auto">
          {(['Charging Stations', 'Inverters', 'Batteries', 'Solar Panels', 'Kits', 'Heat Pumps', 'Mounting Systems'] as Category[]).map((cat) => (
            <button
              key={cat}
              onClick={() => handleCategoryClick(cat)}
              className="group bg-white p-2.5 md:p-3 rounded-[1.8rem] border border-slate-100 shadow-lg hover:shadow-xl hover:border-emerald-500 hover:-translate-y-1 transition-all duration-500 flex flex-col items-center text-center gap-1.5"
            >
              <div className="w-10 h-10 md:w-11 md:h-11 bg-emerald-50 text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white rounded-xl flex items-center justify-center transition-all duration-500 shadow-sm shrink-0">
                {categoryIcons[cat]}
              </div>
              <span className="text-[11px] md:text-[13px] font-black uppercase tracking-tighter text-black leading-[1.1] group-hover:text-emerald-600 transition-colors px-1 line-clamp-2">
                {cat === 'Heat Pumps' ? 'Heat Pumps' : cat === 'Mounting Systems' ? 'Mounting' : cat}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* 3. BESTSELLERS PREVIEW - Scaled down cards & spacing */}
      {salesLeaders.length > 0 && (
        <section className="container mx-auto px-4 space-y-8 pt-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 px-4">
            <div className="space-y-2 text-center md:text-left">
               <div className="inline-flex items-center gap-2 bg-amber-50 text-amber-600 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border border-amber-100 mx-auto md:mx-0">
                <Crown size={12} className="fill-amber-600" /> Top Rated Equipment
               </div>
               <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter leading-none">Sales <span className="text-emerald-500">Leaders</span></h2>
            </div>
            <button 
              onClick={() => onNavigateToCatalog(AppView.CATALOG)}
              className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-emerald-600 transition-colors flex items-center gap-2 group mx-auto md:mx-0"
            >
              View All <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {salesLeaders.map((p, idx) => (
              <ProductCard 
                key={p.id} 
                product={p} 
                index={idx} 
                onSelect={setSelectedProduct}
                onAddToCart={(e, prod) => { 
                  e.stopPropagation(); 
                  addItem(prod); 
                  addNotification(t('item_added'), 'success'); 
                }} 
              />
            ))}
          </div>
        </section>
      )}

      {/* 4. INTRODUCTION & MISSION - More compact text and layout */}
      <section className="container mx-auto px-6 pt-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">
          <div className="space-y-8">
            <div className="space-y-4">
              <h2 className="text-3xl md:text-4xl font-black text-slate-900 uppercase tracking-tighter leading-none">
                Focus on <span className="text-emerald-500">Nature</span>
              </h2>
              <p className="text-slate-600 text-base leading-relaxed font-medium">
                From the beginning, our focus has been on providing solutions that draw
                energy from nature. We are specialists in photovoltaic installations and our
                aim is to help our customers reduce their electricity bills and take care of the
                environment.
              </p>
            </div>

            <div className="bg-slate-50 p-7 rounded-[2rem] border border-slate-100 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full -mr-12 -mt-12 blur-2xl group-hover:scale-150 transition-transform duration-1000"></div>
              <div className="relative z-10 space-y-4">
                <div className="inline-flex items-center gap-2 bg-emerald-500 text-white px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shadow-lg">
                  <Award size={14} /> Our Mission
                </div>
                <p className="text-slate-700 text-sm font-bold leading-relaxed">
                  Solar energy is an investment in the future. We want to make access to green energy
                  simple and accessible to everyone, which is why we offer comprehensive
                  support in the transition to photovoltaics.
                </p>
              </div>
            </div>
          </div>
          <div className="relative">
             <div className="absolute -inset-8 bg-emerald-500/10 blur-[100px] rounded-full"></div>
             <img 
               src={MISSION_IMG} 
               alt="Solar mission" 
               className="relative rounded-[3rem] shadow-2xl border border-white z-10 max-h-[350px] w-full object-cover"
             />
          </div>
        </div>
      </section>

      {/* 5. WHY TRUST US? - Reduced padding and text size */}
      <section className="bg-slate-900 py-16 rounded-[4rem] mx-4 px-6 overflow-hidden relative">
        <div className="absolute inset-0 opacity-5">
          <img src={INSTALLATION_IMG} className="w-full h-full object-cover" alt="bg" />
        </div>
        <div className="container mx-auto relative z-10">
          <div className="text-center space-y-3 mb-14">
             <h2 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tighter">Why <span className="text-emerald-400 italic">trust</span> us?</h2>
             <div className="w-16 h-1 bg-emerald-500 mx-auto rounded-full"></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                title: "Experience",
                icon: <Award className="text-amber-400" size={28} />,
                desc: "Our company has been in the market for many years, providing modern and reliable photovoltaic solutions. We know how to tailor our offerings to meet a variety of needs."
              },
              {
                title: "Full Service",
                icon: <Settings size={28} className="text-emerald-400" />,
                desc: "We cover everything from A to Z. Our specialists help with selecting the right panels and inverters, designing the installation, and professional setup."
              },
              {
                title: "Tech Focus",
                icon: <Rocket size={28} className="text-blue-400" />,
                desc: "We work exclusively with reputable manufacturers. Our installations guarantee maximum efficiency. We also offer energy storage facilities."
              }
            ].map((item, i) => (
              <div key={i} className="bg-white/5 backdrop-blur-xl border border-white/10 p-7 rounded-[2rem] hover:bg-white/10 transition-all group">
                <div className="mb-4 group-hover:scale-110 transition-transform">{item.icon}</div>
                <h3 className="text-lg font-black text-white uppercase tracking-tight mb-3">{item.title}</h3>
                <p className="text-slate-400 text-[12px] leading-relaxed font-medium">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. CORE VALUES - Scaled layout */}
      <section className="container mx-auto px-6">
        <div className="flex flex-col lg:flex-row gap-14 items-start">
           <div className="lg:w-1/3 sticky top-32 space-y-4">
              <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tighter leading-none">Our Core <span className="text-emerald-500">Values</span></h2>
              <p className="text-slate-500 font-bold text-sm uppercase tracking-widest leading-relaxed">
                Management of personal assets and access security
              </p>
           </div>
           
           <div className="lg:w-2/3 grid grid-cols-1 sm:grid-cols-2 gap-5">
              {[
                {
                  title: "Sustainability",
                  icon: <Leaf size={22} />,
                  desc: "We care for the environment by offering solutions that reduce CO₂ emissions and promote the use of renewable energy sources."
                },
                {
                  title: "Client Care",
                  icon: <UserCheck size={22} />,
                  desc: "Our relationship with our clients is based on trust. We tailor solutions to your needs and are with you every step of the way."
                },
                {
                  title: "Innovation",
                  icon: <Sparkles size={22} />,
                  desc: "We rely on state-of-the-art technology to ensure reliability, efficiency and aesthetics for today and tomorrow."
                },
                {
                  title: "Quality",
                  icon: <ShieldCheck size={22} />,
                  desc: "Our priority is soundness and safety. We work with the best manufacturers and our installations meet the highest standards."
                }
              ].map((val, i) => (
                <div key={i} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-lg hover:shadow-xl transition-all">
                   <div className="w-11 h-11 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-4 shadow-sm border border-emerald-100/50">
                      {val.icon}
                   </div>
                   <h3 className="text-base font-black text-slate-900 uppercase tracking-tight mb-2">{val.title}</h3>
                   <p className="text-slate-500 text-[12px] leading-relaxed font-medium">{val.desc}</p>
                </div>
              ))}
           </div>
        </div>
      </section>

      {/* FOOTER CALL TO ACTION - Compacted */}
      <section className="container mx-auto px-4">
        <div className="bg-slate-900 rounded-[3rem] p-10 md:p-16 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-1/2 h-full opacity-10 pointer-events-none">
            <img src={INSTALLATION_IMG} className="w-full h-full object-cover" alt="Nature" />
          </div>
          <div className="relative z-10 max-w-xl space-y-6">
            <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter">Ready for <span className="text-emerald-400 italic">Change</span>?</h2>
            <p className="text-slate-300 text-lg leading-relaxed">
              We tailor solutions to your needs and are with you every step of the
              way, guaranteeing the highest quality of service.
            </p>
            <button 
              onClick={() => onNavigateToCatalog(AppView.CATALOG)}
              className="bg-emerald-500 hover:bg-emerald-400 text-white px-10 py-5 rounded-[1.5rem] font-black uppercase text-[12px] tracking-widest transition-all shadow-xl active:scale-95"
            >
              Start Your Journey
            </button>
          </div>
        </div>
      </section>

      {/* MODAL - Remained unchanged as it's common across the app, but could be adjusted if needed */}
      {selectedProduct && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 md:p-10 bg-slate-900/40 backdrop-blur-md overflow-y-auto animate-fade-in">
          <div className="bg-white w-full max-w-6xl rounded-[3rem] shadow-3xl border border-white flex flex-col my-auto max-h-[95vh] overflow-hidden">
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
              <div className="flex items-center gap-4">
                <div className="bg-emerald-600 p-3 rounded-2xl text-white shadow-lg shadow-emerald-200">
                  <Zap size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter leading-none">{selectedProductNameStr}</h2>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Detailed Asset Overview</p>
                </div>
              </div>
              <button onClick={() => setSelectedProduct(null)} className="p-3 hover:bg-slate-100 rounded-2xl transition-all"><X size={28} /></button>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-8 md:p-12">
               <div className="flex flex-col lg:flex-row gap-12 mb-16">
                <div className="lg:w-[55%] space-y-6">
                  <div className="aspect-video bg-slate-50 rounded-[2.5rem] overflow-hidden border border-slate-100 relative group/img p-10 flex items-center justify-center shadow-inner">
                    <img 
                      src={productImages[activeImageIdx] || IMAGE_FALLBACK} 
                      className="max-w-full max-h-full object-contain drop-shadow-2xl" 
                      alt={selectedProductNameStr} 
                      onError={(e) => { (e.target as HTMLImageElement).src = IMAGE_FALLBACK; }}
                    />
                  </div>
                  <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide px-2">
                    {productImages.map((img, idx) => (
                      <button 
                        key={idx} 
                        onClick={() => setActiveImageIdx(idx)}
                        className={`w-28 h-28 rounded-2xl overflow-hidden border-2 shrink-0 transition-all ${activeImageIdx === idx ? 'border-emerald-500 scale-95 shadow-lg' : 'border-slate-100 opacity-60 hover:opacity-100'}`}
                      >
                        <img src={img || IMAGE_FALLBACK} className="w-full h-full object-cover" alt="" onError={(e) => { (e.target as HTMLImageElement).src = IMAGE_FALLBACK; }} />
                      </button>
                    ))}
                  </div>
                </div>
                <div className="lg:w-[45%] flex flex-col gap-8">
                  <div className="bg-slate-50/50 rounded-[3rem] border border-slate-100 p-10 flex flex-col gap-8 shadow-sm">
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        {selectedProduct.is_leader && (
                          <span className="bg-amber-400 text-yellow-950 text-[10px] font-black uppercase px-4 py-1.5 rounded-lg flex items-center gap-2 shadow-sm">
                            <Crown size={14} className="fill-yellow-950" /> {t('sales_leader')}
                          </span>
                        )}
                        {selectedProduct.is_new && (
                          <span className="bg-emerald-500 text-white text-[10px] font-black uppercase px-4 py-1.5 rounded-lg shadow-sm">New</span>
                        )}
                      </div>
                      <h3 className="font-black text-slate-900 text-3xl uppercase tracking-tighter leading-tight">{selectedProductNameStr}</h3>
                    </div>
                    <div className="text-5xl font-black text-slate-900 tracking-tighter">{formatPrice(selectedProduct.price)}</div>
                    <div className="py-10 border-y border-slate-200/60 flex flex-col gap-5">
                      <div className="flex items-center justify-between">
                         <span className="text-[12px] font-black text-slate-400 uppercase tracking-widest">Stock Status:</span>
                         <div className="flex items-center gap-3">
                            <div className={`w-3 h-3 rounded-full ${isSelectedInactive ? 'bg-amber-500' : 'bg-emerald-500'} shadow-sm animate-pulse`}></div>
                            <span className="text-[12px] font-black text-slate-900 uppercase">
                              {isSelectedInactive ? 'On Order' : 'In Stock'}
                            </span>
                         </div>
                      </div>
                    </div>
                    <button 
                      onClick={() => { addItem(selectedProduct); addNotification(t('item_added'), 'success'); }}
                      className={`w-full rounded-2xl font-black text-[14px] uppercase tracking-widest transition-all shadow-xl py-7 flex items-center justify-center gap-5 active:scale-95 group ${
                        isSelectedInactive ? 'bg-amber-500 hover:bg-amber-600 text-white' : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                      }`}
                    >
                      {isSelectedInactive ? <ArrowRight size={24} /> : <ShoppingCart size={24} />} 
                      {isSelectedInactive ? 'Place Special Order' : t('add_to_cart')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
