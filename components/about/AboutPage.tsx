
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
    'Charging Stations': <Zap size={24} />,
    'Inverters': <Cpu size={24} />,
    'Batteries': <Battery size={24} />,
    'Solar Panels': <Sun size={24} />,
    'Kits': <Layers size={24} />,
    'Heat Pumps': <ThermometerSun size={24} />,
    'Mounting Systems': <Hammer size={24} />
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
    <div className="animate-fade-in pb-24 space-y-20">
      
      {/* 1. HERO SECTION - Reduced height as requested */}
      <section className="relative h-[400px] md:h-[500px] -mt-10 overflow-hidden rounded-[3rem] shadow-3xl">
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-slate-900/20 z-10"></div>
        <img 
          src={HERO_VIBRANT} 
          className="absolute inset-0 w-full h-full object-cover animate-slow-zoom brightness-110" 
          alt="Clean Energy" 
        />
        
        <div className="relative z-20 h-full flex flex-col items-center justify-center text-center px-6">
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-xl border border-white/30 text-white px-6 py-2.5 rounded-full text-[12px] font-black uppercase tracking-[0.4em] mb-8 shadow-xl">
            <Sparkles size={18} className="text-yellow-400" /> The Future is Here
          </div>
          <h1 className="text-5xl md:text-8xl font-black text-white leading-[1.0] tracking-tighter uppercase mb-8 drop-shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
            the energy<br/>
            <span className="text-emerald-400 italic">of your home</span>
          </h1>
          <p className="text-white text-base md:text-xl font-bold max-w-2xl mb-12 tracking-tight leading-snug opacity-95">
            We don't just sell equipment — we create your personal independence from energy grids.
          </p>
          <div className="flex flex-wrap justify-center gap-5">
            <button 
              onClick={() => onNavigateToCatalog(AppView.CATALOG)}
              className="bg-emerald-500 hover:bg-emerald-400 text-white px-10 py-5 rounded-[2rem] font-black uppercase text-[12px] tracking-widest transition-all shadow-2xl active:scale-95 flex items-center gap-3"
            >
              To Catalog <ChevronRight size={20} />
            </button>
            <button 
              onClick={() => onNavigateToCatalog(AppView.CALCULATOR)}
              className="bg-white/10 backdrop-blur-2xl border-2 border-white/40 text-white px-10 py-5 rounded-[2rem] font-black uppercase text-[12px] tracking-widest hover:bg-white hover:text-slate-900 transition-all active:scale-95"
            >
              {t('nav_architect')}
            </button>
          </div>
        </div>
      </section>

      {/* 2. CATEGORIES - Reduced gap with hero by increasing negative margin */}
      <section className="w-full px-4 -mt-40 md:-mt-56 relative z-30">
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3 md:gap-4 max-w-[99%] mx-auto">
          {(['Charging Stations', 'Inverters', 'Batteries', 'Solar Panels', 'Kits', 'Heat Pumps', 'Mounting Systems'] as Category[]).map((cat) => (
            <button
              key={cat}
              onClick={() => handleCategoryClick(cat)}
              className="group bg-white p-5 md:p-6 rounded-[2rem] border-2 border-slate-100 shadow-xl hover:shadow-2xl hover:border-emerald-500 hover:-translate-y-2 transition-all duration-500 flex flex-col items-center text-center gap-3"
            >
              <div className="w-12 h-12 md:w-14 md:h-14 bg-emerald-50 text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white rounded-2xl flex items-center justify-center transition-all duration-500 shadow-sm">
                {categoryIcons[cat]}
              </div>
              <span className="text-xs md:text-sm font-black uppercase tracking-tighter text-black leading-tight group-hover:text-emerald-600 transition-colors px-1">
                {cat === 'Heat Pumps' ? 'Heat Pumps' : cat === 'Mounting Systems' ? 'Mounting' : cat}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* 3. BESTSELLERS PREVIEW */}
      {salesLeaders.length > 0 && (
        <section className="container mx-auto px-4 space-y-10 pt-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-4">
            <div className="space-y-3 text-center md:text-left">
               <div className="inline-flex items-center gap-2 bg-amber-50 text-amber-600 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-amber-100 mx-auto md:mx-0">
                <Crown size={14} className="fill-amber-600" /> Top Rated Equipment
               </div>
               <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tighter leading-none">Sales <span className="text-emerald-500">Leaders</span></h2>
            </div>
            <button 
              onClick={() => onNavigateToCatalog(AppView.CATALOG)}
              className="text-[12px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-emerald-600 transition-colors flex items-center gap-2 group mx-auto md:mx-0"
            >
              View All <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
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

      {/* 4. INTRODUCTION & MISSION */}
      <section className="container mx-auto px-6 pt-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          <div className="space-y-10">
            <div className="space-y-6">
              <h2 className="text-4xl md:text-5xl font-black text-slate-900 uppercase tracking-tighter leading-none">
                Focus on <span className="text-emerald-500">Nature</span>
              </h2>
              <p className="text-slate-600 text-lg leading-relaxed font-medium">
                From the beginning, our focus has been on providing solutions that draw
                energy from nature. We are specialists in photovoltaic installations and our
                aim is to help our customers reduce their electricity bills and take care of the
                environment by popularising renewable energy sources.
              </p>
            </div>

            <div className="bg-slate-50 p-10 rounded-[3rem] border border-slate-100 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full -mr-16 -mt-16 blur-2xl group-hover:scale-150 transition-transform duration-1000"></div>
              <div className="relative z-10 space-y-6">
                <div className="inline-flex items-center gap-2 bg-emerald-500 text-white px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-widest shadow-lg">
                  <Award size={16} /> Our Mission
                </div>
                <p className="text-slate-700 font-bold leading-relaxed">
                  Solar energy is not just about saving money, it is also an investment in the
                  future – yours and the planet’s. We want to make access to green energy
                  simple and accessible to everyone, which is why we offer comprehensive
                  support in the transition to photovoltaics. We believe that together we can
                  build a more sustainable world, starting with small, everyday changes.
                </p>
              </div>
            </div>
          </div>
          <div className="relative">
             <div className="absolute -inset-10 bg-emerald-500/10 blur-[120px] rounded-full"></div>
             <img 
               src={MISSION_IMG} 
               alt="Solar mission" 
               className="relative rounded-[4rem] shadow-3xl border border-white z-10"
             />
          </div>
        </div>
      </section>

      {/* 5. WHY TRUST US? */}
      <section className="bg-slate-900 py-24 rounded-[5rem] mx-4 px-6 overflow-hidden relative">
        <div className="absolute inset-0 opacity-10">
          <img src={INSTALLATION_IMG} className="w-full h-full object-cover" alt="bg" />
        </div>
        <div className="container mx-auto relative z-10">
          <div className="text-center space-y-4 mb-20">
             <h2 className="text-4xl md:text-6xl font-black text-white uppercase tracking-tighter">Why <span className="text-emerald-400 italic">trust</span> us?</h2>
             <div className="w-24 h-1 bg-emerald-500 mx-auto rounded-full"></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                title: "Experience and professionalism",
                icon: <Award className="text-amber-400" size={36} />,
                desc: "Our company has been in the market for many years, providing modern and reliable photovoltaic solutions. We have completed hundreds of projects for individual customers, companies and public institutions. As a result, we know how to tailor our offerings to meet a variety of needs, expectations and budgets."
              },
              {
                title: "Comprehensive service",
                icon: <Settings size={36} className="text-emerald-400" />,
                desc: "We cover everything from A to Z. Our specialists will help you with: Selecting the right panels and inverters to suit your building and energy consumption. Designing the installation in an efficient and cost-effective manner. Installation of the installation with attention to detail."
              },
              {
                title: "Future technologies",
                icon: <Rocket size={36} className="text-blue-400" />,
                desc: "We work exclusively with reputable manufacturers of photovoltaic components. Our installations are based on modern panels and efficient inverters, which guarantee maximum system efficiency. In addition, we also offer energy storage facilities that allow you to store surplus electricity."
              }
            ].map((item, i) => (
              <div key={i} className="bg-white/5 backdrop-blur-xl border border-white/10 p-10 rounded-[3rem] hover:bg-white/10 transition-all group">
                <div className="mb-6 group-hover:scale-110 transition-transform">{item.icon}</div>
                <h3 className="text-xl font-black text-white uppercase tracking-tight mb-4">{item.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed font-medium">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. CORE VALUES */}
      <section className="container mx-auto px-6">
        <div className="flex flex-col lg:flex-row gap-20 items-start">
           <div className="lg:w-1/3 sticky top-32 space-y-6">
              <h2 className="text-5xl font-black text-slate-900 uppercase tracking-tighter leading-none">Our Core <span className="text-emerald-500">Values</span></h2>
              <p className="text-slate-500 font-bold text-lg uppercase tracking-widest leading-relaxed">
                Management of personal assets and access security
              </p>
           </div>
           
           <div className="lg:w-2/3 grid grid-cols-1 sm:grid-cols-2 gap-6">
              {[
                {
                  title: "Sustainable development",
                  icon: <Leaf size={28} />,
                  desc: "We care for the environment by offering solutions that reduce CO₂ emissions and promote the use of renewable energy sources. Each installation is a step towards a better future for us and future generations."
                },
                {
                  title: "Proximity to the customer",
                  icon: <UserCheck size={28} />,
                  desc: "Our relationship with our clients is based on trust and a personalised approach. We tailor solutions to your needs and are with you every step of the way, guaranteeing the highest quality of service."
                },
                {
                  title: "Innovation",
                  icon: <Sparkles size={28} />,
                  desc: "We rely on state-of-the-art technology to ensure reliability, efficiency and aesthetics. As a result, we provide solutions that meet the needs of today and tomorrow."
                },
                {
                  title: "Quality and safety",
                  icon: <ShieldCheck size={28} />,
                  desc: "Our priority is the soundness of workmanship and the safety of use. We work with the best manufacturers and our installations meet the highest standards of quality and durability."
                }
              ].map((val, i) => (
                <div key={i} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl hover:shadow-2xl transition-all">
                   <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-6 shadow-sm border border-emerald-100/50">
                      {val.icon}
                   </div>
                   <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-3">{val.title}</h3>
                   <p className="text-slate-500 text-sm leading-relaxed font-medium">{val.desc}</p>
                </div>
              ))}
           </div>
        </div>
      </section>

      {/* PRODUCT MODAL */}
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
                    {productImages.length > 1 && (
                      <div className="absolute inset-0 flex items-center justify-between px-6 opacity-0 group-hover/img:opacity-100 transition-opacity">
                        <button onClick={() => setActiveImageIdx(prev => (prev > 0 ? prev - 1 : productImages.length - 1))} className="p-4 bg-white/90 backdrop-blur-md rounded-2xl shadow-xl hover:bg-emerald-500 hover:text-white transition-all"><ChevronLeft size={28}/></button>
                        <button onClick={() => setActiveImageIdx(prev => (prev < productImages.length - 1 ? prev + 1 : 0))} className="p-4 bg-white/90 backdrop-blur-md rounded-2xl shadow-xl hover:bg-emerald-500 hover:text-white transition-all"><ChevronRight size={28}/></button>
                      </div>
                    )}
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

              {/* TABS / CONTENT */}
              <div className="max-w-4xl mx-auto space-y-20 pb-24">
                {selectedProduct.description && (
                  <div className="space-y-8">
                    <div className="flex items-center gap-4 border-b-2 border-slate-100 pb-5">
                      <Info size={24} className="text-emerald-500" />
                      <h4 className="text-[14px] font-black text-slate-900 uppercase tracking-[0.2em]">About Product</h4>
                    </div>
                    <p className="text-slate-600 text-xl leading-relaxed font-medium">{getLoc(selectedProduct.description)}</p>
                  </div>
                )}

                {/* TECH SPECS TABLE */}
                {filteredSpecs.length > 0 && (
                  <div className="space-y-8">
                    <div className="flex items-center gap-4 border-b-2 border-slate-100 pb-5">
                      <List size={24} className="text-emerald-500" />
                      <h4 className="text-[14px] font-black text-slate-900 uppercase tracking-[0.2em]">Technical Specifications</h4>
                    </div>
                    <div className="bg-slate-50 rounded-[2.5rem] overflow-hidden border border-slate-100 shadow-inner">
                      <table className="w-full text-left">
                        <tbody className="divide-y divide-slate-100">
                          {filteredSpecs.map((spec: ProductSpec, i: number) => (
                            <tr key={i} className="hover:bg-white transition-colors">
                              <td className="p-7 text-[11px] font-black text-slate-400 uppercase tracking-widest w-1/3 border-r border-slate-100/50">{spec.label}</td>
                              <td className="p-7 text-[12px] font-bold text-slate-900 uppercase">{spec.value}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* DOCUMENTS */}
                {productDocs.length > 0 && (
                  <div className="space-y-8">
                    <div className="flex items-center gap-4 border-b-2 border-slate-100 pb-5">
                      <FileText size={24} className="text-emerald-500" />
                      <h4 className="text-[14px] font-black text-slate-900 uppercase tracking-[0.2em]">Documentation & Files</h4>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      {productDocs.map((doc: ProductDoc, i: number) => (
                        <a 
                          key={i} 
                          href={doc.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="group p-7 bg-white border border-slate-100 rounded-3xl flex items-center justify-between hover:border-emerald-500 hover:shadow-xl transition-all"
                        >
                          <div className="flex items-center gap-5">
                            <div className="bg-emerald-50 text-emerald-600 p-4 rounded-xl group-hover:bg-emerald-500 group-hover:text-white transition-all">
                              <Download size={22} />
                            </div>
                            <span className="text-[12px] font-black text-slate-900 uppercase truncate max-w-[200px]">{doc.title}</span>
                          </div>
                          <ChevronRight size={20} className="text-slate-300 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FOOTER CALL TO ACTION */}
      <section className="container mx-auto px-4">
        <div className="bg-slate-900 rounded-[4rem] p-12 md:p-24 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-1/2 h-full opacity-20 pointer-events-none">
            <img src={INSTALLATION_IMG} className="w-full h-full object-cover" alt="Nature" />
          </div>
          <div className="relative z-10 max-w-2xl space-y-10">
            <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter">Ready for <span className="text-emerald-400 italic">Change</span>?</h2>
            <p className="text-slate-300 text-2xl leading-relaxed">
              We tailor solutions to your needs and are with you every step of the
              way, guaranteeing the highest quality of service.
            </p>
            <button 
              onClick={() => onNavigateToCatalog(AppView.CATALOG)}
              className="bg-emerald-500 hover:bg-emerald-400 text-white px-14 py-7 rounded-[2rem] font-black uppercase text-[14px] tracking-widest transition-all shadow-2xl active:scale-95"
            >
              Start Your Journey
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
