import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useProducts } from '../../contexts/ProductsContext';
import { useCart } from '../../contexts/CartContext';
import { useNotification } from '../../contexts/NotificationContext';
import { 
  ShieldCheck, Zap, Globe, Heart, Award, CheckCircle2, 
  ChevronRight, Mail, Phone, MapPin, Sparkles, Crown,
  Layers, Battery, Sun, Cpu, X, ShoppingCart, Info, ArrowRight,
  ChevronLeft
} from 'lucide-react';
import { AppView, Category, Product } from '../../types';
import { ProductCard, useLocalizedText } from '../catalog/CatalogSection';

interface AboutPageProps {
  onNavigateToCatalog: (view: AppView) => void;
}

const IMAGE_FALLBACK = 'https://images.unsplash.com/photo-1509391366360-fe5bb58583bb?q=80&w=600&auto=format&fit=crop';

export const AboutPage: React.FC<AboutPageProps> = ({ onNavigateToCatalog }) => {
  const { t, formatPrice } = useLanguage();
  const { products, setSelectedCategory } = useProducts();
  const { addItem } = useCart();
  const { addNotification } = useNotification();
  const getLoc = useLocalizedText();

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [activeImageIdx, setActiveImageIdx] = useState(0);

  // Вибираємо лідерів продажів (Bestsellers)
  const salesLeaders = products.filter(p => p.is_leader === true).slice(0, 4);

  const handleCategoryClick = (cat: Category) => {
    setSelectedCategory(cat);
    onNavigateToCatalog(AppView.CATALOG);
  };

  const categoryIcons = {
    'Charging Stations': <Zap size={28} />,
    'Inverters': <Cpu size={28} />,
    'Batteries': <Battery size={28} />,
    'Solar Panels': <Sun size={28} />,
    'Kits': <Layers size={28} />
  };

  // Блокування скролу при відкритій модалці
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

  const selectedProductNameStr = selectedProduct ? getLoc(selectedProduct.name) : "";
  const isSelectedInactive = selectedProduct ? (selectedProduct.stock === 0 || selectedProduct.stock === null || selectedProduct.is_active === false) : false;

  return (
    <div className="animate-fade-in pb-24 space-y-16">
      
      {/* 1. ГОЛОВНА КАРТИНА */}
      <section className="relative h-[400px] md:h-[480px] -mt-10 overflow-hidden rounded-[3rem] shadow-2xl">
        <div className="absolute inset-0 bg-slate-900/30 z-10"></div>
        <img 
          src="https://images.unsplash.com/photo-1470770841072-f978cf4d019e?q=80&w=2000&auto=format&fit=crop" 
          className="absolute inset-0 w-full h-full object-cover animate-slow-zoom" 
          alt="Nature Energy Background" 
        />
        
        <div className="relative z-20 h-full flex flex-col items-center justify-center text-center px-6">
          <div className="inline-flex items-center gap-2 bg-emerald-500/30 backdrop-blur-md border border-white/20 text-white px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.3em] mb-6">
            <Sparkles size={14} className="text-emerald-400" /> Енергія Природи
          </div>
          <h1 className="text-5xl md:text-7xl font-black text-white leading-[0.8] tracking-tighter uppercase mb-6 drop-shadow-2xl">
            VOLT<br/>
            <span className="text-emerald-400 italic">STORE</span>
          </h1>
          <p className="text-white/90 text-sm md:text-lg font-medium max-w-xl mb-10 tracking-tight leading-snug">
            Професійне обладнання для енергонезалежності. 
            Використовуйте силу сонця для свого дому та бізнесу.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <button 
              onClick={() => onNavigateToCatalog(AppView.CATALOG)}
              className="bg-white text-slate-900 px-8 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-emerald-500 hover:text-white transition-all shadow-2xl active:scale-95"
            >
              Переглянути Каталог
            </button>
            <button 
              onClick={() => onNavigateToCatalog(AppView.CALCULATOR)}
              className="bg-emerald-600/30 backdrop-blur-xl border border-white/20 text-white px-8 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-emerald-500 hover:text-white transition-all active:scale-95"
            >
              AI Архітектор
            </button>
          </div>
        </div>
      </section>

      {/* 2. ВИБІР МЕНЮ */}
      <section className="container mx-auto px-4 -mt-10 relative z-30">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {(['Charging Stations', 'Inverters', 'Batteries', 'Solar Panels', 'Kits'] as Category[]).map((cat) => (
            <button
              key={cat}
              onClick={() => handleCategoryClick(cat)}
              className="group bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border-2 border-slate-100 shadow-lg hover:shadow-2xl hover:border-emerald-400 hover:-translate-y-2 transition-all duration-300 flex flex-col items-center text-center gap-4"
            >
              <div className="w-16 h-16 bg-emerald-50 text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white rounded-2xl flex items-center justify-center transition-all duration-500 shadow-sm border border-emerald-100/50">
                {categoryIcons[cat]}
              </div>
              <span className="text-[10px] md:text-[11px] font-black uppercase tracking-widest text-slate-700 group-hover:text-emerald-600 transition-colors">
                {cat}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* 3. ЛІДЕРИ ПРОДАЖІВ */}
      {salesLeaders.length > 0 && (
        <section className="container mx-auto px-4 space-y-10 pt-4">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-4">
            <div className="space-y-3 text-center md:text-left">
               <div className="inline-flex items-center gap-2 bg-amber-50 text-amber-600 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border border-amber-100 mx-auto md:mx-0">
                <Crown size={12} className="fill-amber-600" /> Bestsellers
               </div>
               <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tighter leading-none">Лідери <span className="text-emerald-500">Продажів</span></h2>
            </div>
            <button 
              onClick={() => onNavigateToCatalog(AppView.CATALOG)}
              className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-emerald-600 transition-colors flex items-center gap-2 group mx-auto md:mx-0"
            >
              Переглянути все <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
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

      {/* 4. ПРО НАС */}
      <section className="container mx-auto px-4 pt-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-600 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-100">
              <Sparkles size={14} /> Спеціалісти з Енергії
            </div>
            <h2 className="text-5xl md:text-6xl font-black text-slate-900 leading-[0.9] tracking-tighter uppercase">
              Про <span className="text-emerald-500">Нас</span>
            </h2>
            <p className="text-slate-600 text-lg leading-relaxed font-medium">
              З самого початку нашою метою було надання рішень, які використовують енергію природи. Ми є фахівцями у сфері відновлювальної енергетики, і наша місія — допомогти клієнтам стати енергонезалежними, зменшити витрати та зберегти навколишнє середовище.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                <div className="w-12 h-12 bg-emerald-500 text-white rounded-xl flex items-center justify-center shrink-0 shadow-lg">
                  <Award size={24} />
                </div>
                <div>
                  <div className="text-[12px] font-black text-slate-900 uppercase tracking-tighter leading-none">Сертифіковано</div>
                  <div className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">Офіційний дистриб'ютор</div>
                </div>
              </div>
              <div className="flex items-center gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                <div className="w-12 h-12 bg-slate-900 text-emerald-400 rounded-xl flex items-center justify-center shrink-0 shadow-lg">
                  <ShieldCheck size={24} />
                </div>
                <div>
                  <div className="text-[12px] font-black text-slate-900 uppercase tracking-tighter leading-none">Безпека</div>
                  <div className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">Гарантія до 25 років</div>
                </div>
              </div>
            </div>
          </div>
          <div className="relative">
            <div className="absolute -inset-10 bg-emerald-500/10 blur-[100px] rounded-full"></div>
            <img 
              src="https://images.unsplash.com/photo-1509391366360-fe5bb58583bb?q=80&w=1200&auto=format&fit=crop" 
              alt="Solar Panels Installation" 
              className="relative rounded-[3rem] shadow-2xl border border-white"
            />
          </div>
        </div>
      </section>

      {/* МОДАЛЬНЕ ВІКНО ТОВАРУ */}
      {selectedProduct && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 md:p-10 bg-slate-900/40 backdrop-blur-md overflow-y-auto animate-fade-in">
          <div className="bg-white w-full max-w-6xl rounded-[2.5rem] shadow-3xl border border-white flex flex-col my-auto max-h-[95vh] overflow-hidden">
            
            <div className="px-8 py-5 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
              <div className="flex items-center gap-4">
                <div className="bg-emerald-600 p-2 rounded-xl text-white">
                  <Zap size={18} />
                </div>
                <h2 className="text-lg font-black text-slate-900 uppercase tracking-tighter leading-none">{selectedProductNameStr}</h2>
              </div>
              <button onClick={() => setSelectedProduct(null)} className="p-2 hover:bg-slate-100 rounded-xl transition-all"><X size={20} /></button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
              <div className="flex flex-col lg:flex-row gap-10 mb-12">
                <div className="lg:w-[58%] space-y-4">
                  <div className="aspect-video bg-slate-50 rounded-3xl overflow-hidden border border-slate-100 relative group/img p-6 flex items-center justify-center">
                    <img 
                      src={productImages[activeImageIdx] || IMAGE_FALLBACK} 
                      className="max-w-full max-h-full object-contain" 
                      alt={selectedProductNameStr} 
                      onError={(e) => { (e.target as HTMLImageElement).src = IMAGE_FALLBACK; }}
                    />
                    {productImages.length > 1 && (
                      <div className="absolute inset-0 flex items-center justify-between px-3 opacity-0 group-hover/img:opacity-100 transition-opacity">
                        <button onClick={() => setActiveImageIdx(prev => (prev > 0 ? prev - 1 : productImages.length - 1))} className="p-2 bg-white/80 rounded-xl shadow-md"><ChevronLeft size={18}/></button>
                        <button onClick={() => setActiveImageIdx(prev => (prev < productImages.length - 1 ? prev + 1 : 0))} className="p-2 bg-white/80 rounded-xl shadow-md"><ChevronRight size={18}/></button>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    {productImages.map((img, idx) => (
                      <button 
                        key={idx} 
                        onClick={() => setActiveImageIdx(idx)}
                        className={`w-20 h-20 rounded-xl overflow-hidden border-2 shrink-0 transition-all ${activeImageIdx === idx ? 'border-emerald-500 scale-95' : 'border-slate-100 opacity-60 hover:opacity-100'}`}
                      >
                        <img src={img || IMAGE_FALLBACK} className="w-full h-full object-cover" alt="" onError={(e) => { (e.target as HTMLImageElement).src = IMAGE_FALLBACK; }} />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="lg:w-[42%] flex flex-col gap-6">
                  <div className="bg-slate-50/50 rounded-3xl border border-slate-100 p-8 flex flex-col gap-6 shadow-sm">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 mb-2">
                        {selectedProduct.is_leader && (
                          <span className="bg-amber-400 text-yellow-950 text-[8px] font-black uppercase px-2 py-1 rounded-md flex items-center gap-1">
                            <Crown size={10} className="fill-yellow-950" /> {t('sales_leader')}
                          </span>
                        )}
                        {selectedProduct.is_new && (
                          <span className="bg-emerald-500 text-white text-[8px] font-black uppercase px-2 py-1 rounded-md">New</span>
                        )}
                      </div>
                      <h3 className="font-black text-slate-900 text-sm uppercase tracking-tight leading-tight mb-2">{selectedProductNameStr}</h3>
                    </div>

                    <div className="space-y-0.5">
                      <div className="text-3xl font-black text-slate-900 tracking-tighter">
                        {formatPrice(selectedProduct.price)} <span className="text-[10px] text-slate-400 uppercase font-black tracking-widest ml-1">{t('inc_vat')}</span>
                      </div>
                    </div>

                    <div className="space-y-4 py-6 border-y border-slate-200/60">
                      <div className="flex items-center justify-between">
                         <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('availability')}:</span>
                         <div className="flex items-center gap-1.5">
                            <div className={`w-2 h-2 rounded-full shadow-sm ${isSelectedInactive ? 'bg-amber-500' : 'bg-emerald-500'}`}></div>
                            <span className="text-[10px] font-black text-slate-900 uppercase tracking-tight">
                              {isSelectedInactive ? 'Замовлення' : t('in_stock')}
                            </span>
                         </div>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button 
                        onClick={() => { addItem(selectedProduct); addNotification(t('item_added'), 'success'); }}
                        className={`flex-1 rounded-xl font-black text-[11px] uppercase tracking-widest transition-all shadow-lg py-5 flex items-center justify-center gap-3 active:scale-95 group ${
                          isSelectedInactive 
                            ? 'bg-amber-500 hover:bg-amber-600 text-white' 
                            : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                        }`}
                      >
                        {isSelectedInactive ? <ArrowRight size={18} /> : <ShoppingCart size={18} />} 
                        {isSelectedInactive ? 'Замовити' : t('add_to_cart')}
                      </button>
                    </div>
                  </div>
                  <button onClick={() => setSelectedProduct(null)} className="w-full py-4 rounded-2xl bg-slate-100 text-slate-500 font-black text-[9px] uppercase tracking-widest hover:bg-slate-200 transition-all">{t('close')}</button>
                </div>
              </div>

              <div className="max-w-4xl space-y-16 pb-20">
                {selectedProduct.description && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                      <Info size={16} className="text-emerald-500" />
                      <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">{t('about_product')}</h4>
                    </div>
                    <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">{getLoc(selectedProduct.description)}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Наша Місія */}
      <section className="container mx-auto px-4">
        <div className="bg-slate-900 rounded-[4rem] p-12 md:p-20 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-1/2 h-full opacity-20 pointer-events-none">
            <img src="https://images.unsplash.com/photo-1497435334941-8c899ee9e8e9?q=80&w=800&auto=format&fit=crop" className="w-full h-full object-cover" alt="Nature" />
          </div>
          <div className="relative z-10 max-w-2xl space-y-6">
            <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tighter">Наша Місія</h2>
            <p className="text-slate-300 text-lg leading-relaxed">
              Сонячна енергія — це не просто економія коштів, це інвестиція в майбутнє. Ми робимо зелену енергію простою та доступною для кожного, забезпечуючи повний цикл підтримки: від розрахунку до запуску системи.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};