
import React, { useState } from 'react';
import { useCart } from '../../contexts/CartContext';
import { useNotification } from '../../contexts/NotificationContext';
import { ChevronLeft, Truck, CreditCard, CheckCircle2, MapPin } from 'lucide-react';

interface CheckoutPageProps {
  onBackToCart: () => void;
  onOrderSuccess: () => void;
}

export const CheckoutPage: React.FC<CheckoutPageProps> = ({ onBackToCart, onOrderSuccess }) => {
  const { totalPrice, totalItems, clearCart } = useCart();
  const { addNotification } = useNotification();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', city: '', department: '', payment: 'card'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (step < 3) {
      setStep(step + 1);
    } else {
      addNotification('Замовлення успішно оформлене!', 'success');
      clearCart();
      onOrderSuccess();
    }
  };

  const updateForm = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      <button 
        onClick={onBackToCart}
        className="flex items-center gap-2 text-slate-500 hover:text-slate-900 mb-8 font-bold transition-colors"
      >
        <ChevronLeft size={20} />
        Назад до кошика
      </button>

      {/* Stepper */}
      <div className="flex justify-between items-center mb-12 px-4">
        {[
          { id: 1, label: 'Особисті дані', icon: CheckCircle2 },
          { id: 2, label: 'Доставка', icon: Truck },
          { id: 3, label: 'Оплата', icon: CreditCard }
        ].map((s) => (
          <div key={s.id} className="flex flex-col items-center gap-2 relative z-10">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors border-2 ${
              step >= s.id ? 'bg-yellow-400 border-yellow-400 text-yellow-950' : 'bg-white border-slate-200 text-slate-300'
            }`}>
              <s.icon size={20} />
            </div>
            <span className={`text-[10px] font-bold uppercase tracking-wider ${
              step >= s.id ? 'text-yellow-600' : 'text-slate-300'
            }`}>{s.label}</span>
          </div>
        ))}
        {/* Progress Line Background */}
        <div className="absolute left-1/2 -translate-x-1/2 top-[185px] w-full max-w-xs h-0.5 bg-slate-100 -z-0"></div>
      </div>

      <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          {step === 1 && (
            <div className="space-y-4 animate-fade-in">
              <h3 className="text-xl font-black text-slate-900 mb-6">Ваші контактні дані</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">ПІБ</label>
                  <input 
                    required
                    type="text" 
                    value={formData.name}
                    onChange={e => updateForm('name', e.target.value)}
                    placeholder="Іван Іванов"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-yellow-400"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Телефон</label>
                  <input 
                    required
                    type="tel" 
                    value={formData.phone}
                    onChange={e => updateForm('phone', e.target.value)}
                    placeholder="+380"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-yellow-400"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Email</label>
                <input 
                  required
                  type="email" 
                  value={formData.email}
                  onChange={e => updateForm('email', e.target.value)}
                  placeholder="example@mail.com"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-yellow-400"
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 animate-fade-in">
              <h3 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-2">
                <MapPin className="text-yellow-500" /> Доставка Новою Поштою
              </h3>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Місто</label>
                <input 
                  required
                  type="text" 
                  value={formData.city}
                  onChange={e => updateForm('city', e.target.value)}
                  placeholder="Введіть місто"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-yellow-400"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Відділення / Поштомат</label>
                <input 
                  required
                  type="text" 
                  value={formData.department}
                  onChange={e => updateForm('department', e.target.value)}
                  placeholder="№ відділення"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-yellow-400"
                />
              </div>
              <div className="p-4 bg-yellow-50 rounded-xl border border-yellow-100 flex gap-3 items-start">
                <Truck className="text-yellow-600 shrink-0 mt-1" size={18} />
                <p className="text-xs text-yellow-800 leading-relaxed font-medium">
                  Орієнтовна дата доставки: завтра, 14:00. <br/>
                  Доставка великогабаритного обладнання безкоштовна!
                </p>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4 animate-fade-in">
              <h3 className="text-xl font-black text-slate-900 mb-6">Метод оплати</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className={`p-4 border-2 rounded-2xl flex items-center gap-3 cursor-pointer transition-all ${
                  formData.payment === 'card' ? 'border-yellow-400 bg-yellow-50/50' : 'border-slate-100 hover:border-slate-200'
                }`}>
                  <input type="radio" name="payment" className="hidden" onChange={() => updateForm('payment', 'card')} checked={formData.payment === 'card'} />
                  <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-slate-600">
                    <CreditCard size={20} />
                  </div>
                  <div>
                    <div className="font-bold text-sm">Оплата карткою</div>
                    <div className="text-[10px] text-slate-400">Visa / Mastercard / ApplePay</div>
                  </div>
                </label>
                <label className={`p-4 border-2 rounded-2xl flex items-center gap-3 cursor-pointer transition-all ${
                  formData.payment === 'cash' ? 'border-yellow-400 bg-yellow-50/50' : 'border-slate-100 hover:border-slate-200'
                }`}>
                  <input type="radio" name="payment" className="hidden" onChange={() => updateForm('payment', 'cash')} checked={formData.payment === 'cash'} />
                  <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-slate-600">
                    <Truck size={20} />
                  </div>
                  <div>
                    <div className="font-bold text-sm">Післяплата</div>
                    <div className="text-[10px] text-slate-400">При отриманні (накладений платіж)</div>
                  </div>
                </label>
              </div>

              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 mt-8">
                <div className="flex justify-between items-end">
                  <div>
                    <div className="text-xs font-bold text-slate-400 uppercase">До сплати</div>
                    <div className="text-3xl font-black text-slate-900">₴{totalPrice.toLocaleString()}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-400 font-bold uppercase">Товарів: {totalItems}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-4 pt-6">
            {step > 1 && (
              <button 
                type="button"
                onClick={() => setStep(step - 1)}
                className="flex-1 border-2 border-slate-200 text-slate-500 py-4 rounded-2xl font-bold hover:bg-slate-50 transition-all"
              >
                Назад
              </button>
            )}
            <button 
              type="submit"
              className="flex-[2] bg-yellow-400 hover:bg-yellow-500 text-yellow-950 py-4 rounded-2xl font-black text-lg transition-all shadow-lg shadow-yellow-100"
            >
              {step === 3 ? 'Завершити' : 'Продовжити'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
