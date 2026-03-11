import React, { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useProducts } from '../../contexts/ProductsContext';
import { useCart } from '../../contexts/CartContext';
import { useUser } from '../../contexts/UserContext';
import { useWishlist } from '../../contexts/WishlistContext';
import { useNotification } from '../../contexts/NotificationContext';
import { 
  Zap, X, Info, ShoppingBag, ShieldCheck, 
  FileText, Download, Activity, PlayCircle, ExternalLink, Crown,
  Cpu, Battery, Sun, Layers, ThermometerSun, Hammer, Award, Target, Globe, Heart, ArrowRight,
  CheckCircle2, Star, Package
} from 'lucide-react';
import { AppView, Product, KitComponent, Category } from '../../types';
import { ProductCard } from '../catalog/CatalogSection';

interface AboutPageProps {
  onNavigateToCatalog: (view: AppView) => void;
}

const IMAGE_FALLBACK = 'https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?q=80&w=600&auto=format&fit=crop';
const HERO_FULLSCREEN = 'https://images.unsplash.com/photo-1542332213-31f87348057f?q=90&w=2560&auto=format&fit=crop';
const ABOUT_BG = 'https://images.unsplash.com/photo-1497435334941-8c899ee9e8e9?q=80&w=1500&auto=format&fit=crop';

const getYoutubeEmbedUrl = (url?: string) => {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? `https://www.youtube.com/embed/${match[2]}` : null;
};

export const AboutPage: React.FC<AboutPageProps> = ({ onNavigateToCatalog }) => {
  const { t, formatPrice, getLoc } = useLanguage();
  const { products, setSelectedCategory } = useProducts();
  const { addItem } = useCart();
  const { getDiscountedPrice } = useUser();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const { addNotification } = useNotification();

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [kitComponents, setKitComponents] = useState<KitComponent[]>([]);

  const isKit = (cat: string) => cat === 'Sæt' || cat === 'Kits';
  const topProducts = useMemo(
    () => products.filter(p => p.is_leader && !isKit(p.category)).slice(0, 4),
    [products]
  );

  const safeParse = (input: any) => {
    if (!input) return [];
    if (Array.isArray(input)) return input;
    try { return typeof input === 'string' ? JSON.parse(input) : input; } catch (e) { return []; }
  };

  const currentTotal = useMemo(() => {
    if (!selectedProduct) return 0;
    const baseTotal = isKit(selectedProduct.category)
      ? kitComponents.reduce((sum, c) => sum + (c.price * (c.quantity || 1)), 0)
      : selectedProduct.price;
    return getDiscountedPrice(baseTotal);
  }, [selectedProduct, kitComponents, getDiscountedPrice]);

  useEffect(() => {
    if (selectedProduct) {
      document.body.style.overflow = 'hidden';
      if (isKit(selectedProduct.category)) {
        setKitComponents(Array.isArray(selectedProduct.kitComponents) ? selectedProduct.kitComponents : []);
      }
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [selectedProduct]);

  const handleFinalAddToCart = () => {
    if (!selectedProduct) return;
    const discountedItem = { ...selectedProduct, price: currentTotal };
    addItem(discountedItem, kitComponents);
    addNotification(t('item_added'), 'success');
    setSelectedProduct(null);
  };

  const onAddToCart = (e: React.MouseEvent, prod: Product) => {
    e.stopPropagation();
    const finalPrice = getDiscountedPrice(prod.price);
    addItem({ ...prod, price: finalPrice });
    addNotification(t('item_added'), 'success');
  };

  const categoryIcons: Record<string, React.ReactNode> = {
    'Power Station': <Zap size={18} />, 'Invertere': <Cpu size={18} />, 'Batterier': <Battery size={18} />,
    'Solpaneler': <Sun size={18} />, 'Sæt': <Layers size={18} />, 'Kits': <Layers size={18} />,
    'Varmepumper': <ThermometerSun size={18} />, 'Monteringssystemer': <Hammer size={18} />
  };

  return (
    <>
      {/* ══════════════════════════════════════════
          HERO — 50% width, compact height, centered
      ══════════════════════════════════════════ */}
      <section className="w-full flex flex-col items-center justify-center py-8 px-4 bg-slate-50">

        {/* Image block — 50% wide, rounded, with overlay and text */}
        <div className="relative w-full md:w-[72.6%] overflow-hidden rounded-[2.5rem] shadow-2xl" style={{height: '477px'}}>

          <img
            src={HERO_FULLSCREEN}
            className="absolute inset-0 w-full h-full object-cover object-center scale-[1.03] animate-[zoomIn_12s_ease-out_forwards]"
            alt="Solar panels"
          />

          {/* Overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/60 z-10" />

          {/* Badge + title inside image */}
          <div className="relative z-20 flex flex-col items-center justify-center h-full px-6 text-center">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-xl border border-white/20 px-4 py-1.5 rounded-full text-emerald-300 text-[16px] font-black uppercase tracking-[0.3em] mb-4 shadow-lg">
              <ShieldCheck size={11} /> Green Light Scandinavia
            </div>
            <h1 className="text-4xl sm:text-7xl font-black text-white uppercase tracking-tighter leading-[0.95] drop-shadow-2xl">
              {t('language') === 'da' ? 'Energi til' : 'Energy for'}
              {' '}
              <span className="text-emerald-400 italic">
                {t('language') === 'da' ? 'fremtiden' : 'the future'}
              </span>
            </h1>
          </div>
        </div>

        {/* Category quick-nav — below image, full width */}
        <div className="w-full max-w-5xl mt-6">
          <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
            {(['Power Station', 'Invertere', 'Batterier', 'Solpaneler', 'Sæt', 'Varmepumper', 'Monteringssystemer'] as Category[]).map((cat) => (
              <button
                key={cat}
                onClick={() => { setSelectedCategory(cat); onNavigateToCatalog(AppView.CATALOG); }}
                className="group bg-slate-100 hover:bg-slate-200 border-2 border-slate-900 hover:border-yellow-400 p-3 rounded-2xl transition-all duration-300 flex flex-col items-center gap-2 text-center hover:-translate-y-1 shadow-sm hover:shadow-[0_0_14px_rgba(250,204,21,0.3)]"
              >
                <div className="w-9 h-9 bg-slate-100 group-hover:bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-500 group-hover:text-emerald-600 transition-all">
                  {categoryIcons[cat]}
                </div>
                <span className="text-[9px] md:text-[11px] font-black uppercase text-slate-900 group-hover:text-yellow-600 leading-tight tracking-wide">
                  {t(`cat_${cat}`)}
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <div id="about-main" className="animate-fade-in space-y-12 md:space-y-16 pb-16 max-w-7xl mx-auto px-4 pt-12">

        {/* BEST SELLERS SECTION */}
        <section className="container mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-6 text-left">
            <div className="space-y-1">
              <h2 className="text-2xl md:text-5xl font-black uppercase tracking-tighter text-slate-900 leading-none" dangerouslySetInnerHTML={{ __html: t('best_sellers_title') }} />
              <p className="text-slate-400 text-[9px] md:text-[10px] font-bold uppercase tracking-widest">{t('best_sellers_subtitle')}</p>
            </div>
            <button onClick={() => onNavigateToCatalog(AppView.CATALOG)} className="text-emerald-500 font-black uppercase text-[9px] md:text-[10px] tracking-[0.2em] flex items-center gap-3 group self-start sm:self-auto">
              {t('see_all_products')} <ExternalLink size={14} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 px-0 text-left text-slate-900">
            {topProducts.map(p => (
              <ProductCard key={p.id} product={p} onSelect={setSelectedProduct} onAddToCart={onAddToCart} />
            ))}
          </div>
        </section>

        {/* INTRODUCTION SECTION */}
        <section id="about-intro" className="container mx-auto px-4 py-12 md:py-16 scroll-mt-24">
          <div className="max-w-4xl mx-auto text-center space-y-6">
            <div className="inline-flex items-center gap-2 text-emerald-500 text-[9px] font-black uppercase tracking-[0.4em]">
              <Info size={14} /> {t('about_intro_badge')}
            </div>
            <h2 className="text-2xl md:text-5xl font-black uppercase tracking-tighter text-slate-900 leading-none" dangerouslySetInnerHTML={{ __html: t('about_intro_title') }} />
            <p className="text-slate-600 text-sm md:text-lg font-medium leading-relaxed italic border-x-2 border-emerald-500/10 px-4 md:px-6">
              {t('about_intro_text')}
            </p>
          </div>
        </section>

        {/* CORE VALUES */}
        <section className="bg-slate-900 py-12 md:py-16 -mx-4 px-6 md:px-8 overflow-hidden relative md:rounded-[4rem]">
          <div className="container mx-auto relative z-10 space-y-12 text-left">
            <div className="text-center space-y-2">
              <h2 className="text-2xl md:text-4xl font-black text-white uppercase tracking-tighter">{t('about_values_title')}</h2>
              <div className="w-16 h-1 bg-emerald-500 mx-auto rounded-full"></div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              {[
                { icon: <Globe />, title: t('about_value_eco_title'), desc: t('about_value_eco_text') },
                { icon: <Heart />, title: t('about_value_client_title'), desc: t('about_value_client_text') },
                { icon: <Zap />, title: t('about_value_innov_title'), desc: t('about_value_innov_text') },
                { icon: <ShieldCheck />, title: t('about_value_quality_title'), desc: t('about_value_quality_text') }
              ].map((val, i) => (
                <div key={i} className="space-y-4 group p-6 md:p-8 rounded-[2rem] bg-white/5 border border-white/5 hover:bg-white/10 transition-all duration-500">
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-emerald-500 text-white rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    {React.cloneElement(val.icon as React.ReactElement<any>, { size: 20 })}
                  </div>
                  <h4 className="text-[12px] md:text-sm font-black text-white uppercase tracking-tight">{val.title}</h4>
                  <p className="text-slate-400 text-[9px] md:text-[10px] font-medium leading-relaxed italic opacity-80">{val.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      {/* PRODUCT MODAL (SYNCHRONIZED WITH CATALOG) */}
      {selectedProduct && (
        <div className="fixed inset-0 z-[1000000] flex items-end md:items-center justify-center md:p-10 bg-slate-900/95 backdrop-blur-xl animate-fade-in text-left overflow-y-auto">
          <div className="absolute inset-0" onClick={() => setSelectedProduct(null)} />
          <div className="relative bg-white w-full md:max-w-7xl md:max-h-[90vh] rounded-t-[2.5rem] md:rounded-[3rem] shadow-[0_30px_100px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden text-slate-900 border border-white/20 min-h-0">
            
            {/* Modal Header */}
            <div className="px-6 md:px-12 py-6 md:py-8 border-b flex items-center justify-between bg-white shrink-0 sticky top-0 z-10">
              <div className="flex items-center gap-4 md:gap-6 text-left">
                <div className="bg-emerald-600 p-3 md:p-4 rounded-xl md:rounded-2xl text-white shadow-xl shadow-emerald-500/20 ring-4 ring-emerald-50"><Zap size={22} className="md:w-7 md:h-7" /></div>
                <div>
                  <h2 className="text-xl md:text-3xl font-black uppercase text-slate-900 leading-tight tracking-tighter truncate max-w-[150px] sm:max-w-none">{getLoc(selectedProduct.name)}</h2>
                  <div className="flex items-center gap-2 md:gap-4 mt-1 md:mt-2">
                    <span className="flex items-center gap-1.5 text-[8px] md:text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 md:px-3 py-0.5 md:py-1 rounded-lg uppercase tracking-widest border border-emerald-100">
                      <ShieldCheck size={10} className="md:w-3 md:h-3"/> {t(`cat_${selectedProduct.category}`)}
                    </span>
                    <span className="hidden sm:flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      <Package size={12}/> ID: {selectedProduct.id.slice(0, 8)}
                    </span>
                    {selectedProduct.category === 'Invertere' && selectedProduct.inverter_type && (
                      <span className="flex items-center gap-1.5 text-[8px] md:text-[10px] font-black text-amber-600 bg-amber-50 px-2 md:px-3 py-0.5 md:py-1 rounded-lg uppercase tracking-widest border border-amber-100">
                        <Activity size={10} className="md:w-3 md:h-3"/> {selectedProduct.inverter_type}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 md:gap-3">
                <button 
                  onClick={() => toggleWishlist(selectedProduct)}
                  className={`p-3 md:p-4 rounded-xl md:rounded-2xl transition-all border shadow-sm ${
                    isInWishlist(selectedProduct.id) 
                      ? 'bg-rose-50 border-rose-100 text-rose-500 shadow-inner' 
                      : 'bg-slate-50 border-slate-100 text-slate-300 hover:text-rose-500'
                  }`}
                  title={t('nav_wishlist')}
                >
                  <Heart size={20} fill={isInWishlist(selectedProduct.id) ? "currentColor" : "none"} className="md:w-6 md:h-6" />
                </button>
                <button 
                  onClick={() => setSelectedProduct(null)} 
                  className="p-2 md:p-3 hover:bg-slate-100 rounded-xl md:rounded-2xl text-slate-400 transition-all"
                >
                  <X size={28} className="md:w-8 md:h-8" />
                </button>
              </div>
            </div>
            
            {/* Modal Content */}
            <div className="flex-1 md:min-h-0 md:overflow-y-auto custom-scrollbar p-6 md:p-12 text-left text-slate-900">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12">
                
                {/* Left Side: Media */}
                <div className="lg:col-span-5 space-y-6 md:space-y-8">
                  <div className="bg-slate-50 rounded-[2.5rem] md:rounded-[4rem] p-8 md:p-12 flex items-center justify-center border border-slate-100 h-[300px] md:h-[400px] shadow-inner relative group">
                    <img 
                      src={selectedProduct.image || IMAGE_FALLBACK} 
                      className="max-w-full max-h-full object-contain drop-shadow-[0_20px_40px_rgba(0,0,0,0.15)] transition-transform duration-700 group-hover:scale-110" 
                      alt="" 
                    />
                  </div>

                  {selectedProduct.video_url && getYoutubeEmbedUrl(selectedProduct.video_url) && (
                    <div className="space-y-4">
                      <h4 className="text-[10px] md:text-[11px] font-black uppercase text-slate-400 flex items-center gap-2 tracking-widest px-1">
                        <PlayCircle size={16} className="text-emerald-500" /> Video Demonstration
                      </h4>
                      <div className="aspect-video rounded-[2rem] md:rounded-[2.5rem] overflow-hidden bg-black border border-slate-100 shadow-2xl relative">
                        <iframe 
                          className="absolute inset-0 w-full h-full"
                          src={getYoutubeEmbedUrl(selectedProduct.video_url)!}
                          title="YouTube video player"
                          frameBorder="0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        ></iframe>
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Side: Details */}
                <div className="lg:col-span-7 space-y-8 md:space-y-12 pb-24 md:pb-0">
                  
                  {/* Quick Info (Status Only) */}
                  <div className="flex flex-wrap items-center gap-4 md:gap-6">
                    <div className="flex items-center gap-2 px-5 py-2.5 bg-emerald-50 text-emerald-700 rounded-xl md:rounded-2xl text-[10px] md:text-[12px] font-black uppercase border border-emerald-100 shadow-sm">
                      <CheckCircle2 size={14} className="text-emerald-500"/> {t('active_status') || 'I Lager'}
                    </div>
                    {selectedProduct.is_leader && (
                      <div className="flex items-center gap-2 px-5 py-2.5 bg-amber-50 text-amber-700 rounded-xl md:rounded-2xl text-[10px] md:text-[12px] font-black uppercase border border-amber-100 shadow-sm">
                        <Star size={14} className="text-amber-500 fill-amber-500"/> {t('sales_leader')}
                      </div>
                    )}
                  </div>

                  {/* Description */}
                  <div className="space-y-4">
                    <h4 className="text-[10px] md:text-[11px] font-black uppercase text-emerald-500 flex items-center gap-2 tracking-widest">
                      <Info size={16} /> {t('about_product')}
                    </h4>
                    <div className="bg-slate-50/50 p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border border-slate-100 leading-relaxed text-slate-600 font-medium">
                      <p className="text-sm md:text-base italic">{getLoc(selectedProduct.description)}</p>
                    </div>
                  </div>

                  {/* Specs & Docs Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 md:gap-8">
                    <div className="space-y-4">
                      <h4 className="text-[10px] md:text-[11px] font-black uppercase text-slate-900 flex items-center gap-2 tracking-widest">
                        <Layers size={16} className="text-emerald-500" /> {t('specs_title') || 'Key Features'}
                      </h4>
                      <div className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm divide-y divide-slate-50">
                        {safeParse(selectedProduct.specs).map((s: any, i: number) => (
                          <div key={i} className="flex items-center justify-between py-3 md:py-3.5 first:pt-0 last:pb-0">
                            <span className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">{s.label}</span>
                            <span className="text-[11px] md:text-xs font-bold text-slate-900 text-right">{s.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="text-[10px] md:text-[11px] font-black uppercase text-slate-900 flex items-center gap-2 tracking-widest">
                        <FileText size={16} className="text-emerald-500" /> {t('documentation_title') || 'Technical Assets'}
                      </h4>
                      <div className="space-y-3">
                        {selectedProduct.docs && safeParse(selectedProduct.docs).length > 0 ? (
                          safeParse(selectedProduct.docs).map((doc: any, i: number) => (
                            <a key={i} href={doc.url} target="_blank" rel="noopener noreferrer" 
                               className="flex items-center justify-between p-4 md:p-5 bg-white border border-slate-100 rounded-xl md:rounded-2xl hover:border-emerald-500 transition-all group shadow-sm">
                              <div className="flex items-center gap-3">
                                <Download size={14} className="text-slate-400 group-hover:text-emerald-500" />
                                <span className="text-[9px] md:text-[10px] font-black uppercase text-slate-900">{doc.title}</span>
                              </div>
                              <ArrowRight size={12} className="text-slate-300" />
                            </a>
                          ))
                        ) : (
                          <div className="p-8 md:p-10 border-2 border-dashed border-slate-100 rounded-[2rem] flex flex-col items-center justify-center text-center">
                            <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">No documentation available</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 md:px-12 py-6 md:py-10 bg-slate-900 flex flex-col sm:flex-row items-center justify-between gap-6 md:gap-8 shrink-0 md:rounded-b-[3rem] border-t border-white/5 sticky bottom-0 z-10">
              <div className="flex items-center gap-6 md:gap-8 w-full sm:w-auto justify-between sm:justify-start">
                <div className="text-left">
                  <span className="text-[8px] md:text-[10px] font-black text-slate-500 uppercase block mb-1 tracking-widest">{t('total')}</span>
                  <div className="flex items-baseline gap-2 md:gap-4">
                    <span className="text-2xl md:text-4xl font-black text-emerald-400 tracking-tighter">{formatPrice(currentTotal)}</span>
                    {selectedProduct.old_price && (
                      <span className="text-slate-500 line-through text-sm md:text-lg font-bold opacity-50">
                        {formatPrice(getDiscountedPrice(selectedProduct.old_price))}
                      </span>
                    )}
                  </div>
                </div>
                <div className="hidden md:flex flex-col gap-1 border-l border-white/10 pl-8 text-white/40 font-bold text-[9px] uppercase tracking-widest">
                  <div className="flex items-center gap-2"><Star size={10} className="text-amber-500 fill-amber-500" /> Top Rated Solution</div>
                  <div className="flex items-center gap-2"><ShieldCheck size={10} className="text-emerald-500" /> 10 Year Warranty</div>
                </div>
              </div>
              <button 
                onClick={handleFinalAddToCart} 
                className="w-full sm:w-auto px-10 md:px-16 py-4 md:py-6 bg-emerald-500 text-white rounded-2xl md:rounded-[2rem] font-black uppercase text-xs md:text-sm tracking-[0.2em] flex items-center justify-center gap-3 md:gap-5 active:scale-95 shadow-2xl transition-all"
              >
                <ShoppingBag size={22} className="md:w-7 md:h-7" /> 
                {t('add_to_cart')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};