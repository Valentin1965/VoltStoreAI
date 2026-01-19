
import React, { useState } from 'react';
import { useCart } from '../../contexts/CartContext';
import { useNotification } from '../../contexts/NotificationContext';
import { ChevronLeft, Truck, CreditCard, CheckCircle2, MapPin, Loader2 } from 'lucide-react';
import { supabase } from '../../services/supabase';

interface CheckoutPageProps {
  onBackToCart: () => void;
  onOrderSuccess: () => void;
}

export const CheckoutPage: React.FC<CheckoutPageProps> = ({ onBackToCart, onOrderSuccess }) => {
  const { items, totalPrice, totalItems, clearCart } = useCart();
  const { addNotification } = useNotification();
  const [step, setStep] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', city: '', department: '', payment: 'card'
  });

  const processPayment = async () => {
    return new Promise((resolve) => {
      setTimeout(() => resolve({ success: true, transactionId: 'TX-' + Math.random().toString(36).substr(2, 9) }), 2000);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step < 3) {
      setStep(step + 1);
      return;
    }

    setIsProcessing(true);
    try {
      let paymentStatus = 'pending';
      if (formData.payment === 'card') {
        const paymentResult: any = await processPayment();
        if (!paymentResult.success) throw new Error('Payment rejected by bank');
        paymentStatus = 'paid';
      }

      const { data: order, error } = await supabase
        .from('orders')
        .insert([{
          customer_name: formData.name,
          customer_email: formData.email,
          customer_phone: formData.phone,
          city: formData.city,
          department: formData.department,
          total_price: totalPrice,
          items: items,
          payment_method: formData.payment,
          status: paymentStatus === 'paid' ? 'processing' : 'pending'
        }])
        .select();

      if (error) throw error;

      addNotification('Order saved! Thank you for your purchase.', 'success');
      clearCart();
      onOrderSuccess();
    } catch (err: any) {
      addNotification('Checkout error: ' + err.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const updateForm = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="max-w-3xl mx-auto animate-fade-in pb-20">
      <button 
        disabled={isProcessing}
        onClick={onBackToCart}
        className="flex items-center gap-2 text-slate-500 hover:text-slate-900 mb-8 font-bold transition-colors disabled:opacity-50"
      >
        <ChevronLeft size={20} />
        Back to Cart
      </button>

      {/* Stepper */}
      <div className="flex justify-between items-center mb-12 px-4 relative">
        <div className="absolute left-1/2 -translate-x-1/2 top-5 w-full max-w-[280px] h-0.5 bg-slate-100 -z-0"></div>
        {[
          { id: 1, label: 'Details', icon: CheckCircle2 },
          { id: 2, label: 'Shipping', icon: Truck },
          { id: 3, label: 'Payment', icon: CreditCard }
        ].map((s) => (
          <div key={s.id} className="flex flex-col items-center gap-2 relative z-10 bg-white px-2">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all border-2 ${
              step >= s.id ? 'bg-yellow-400 border-yellow-400 text-yellow-950 scale-110' : 'bg-white border-slate-200 text-slate-300'
            }`}>
              <s.icon size={20} />
            </div>
            <span className={`text-[10px] font-black uppercase tracking-wider ${
              step >= s.id ? 'text-yellow-600' : 'text-slate-300'
            }`}>{s.label}</span>
          </div>
        ))}
      </div>

      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          {step === 1 && (
            <div className="space-y-4 animate-fade-in">
              <h3 className="text-2xl font-black text-slate-900 mb-6">Contact Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Full Name</label>
                  <input required type="text" value={formData.name} onChange={e => updateForm('name', e.target.value)} placeholder="John Doe" className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-yellow-400" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Phone</label>
                  <input required type="tel" value={formData.phone} onChange={e => updateForm('phone', e.target.value)} placeholder="+380" className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-yellow-400" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Email for Receipt</label>
                <input required type="email" value={formData.email} onChange={e => updateForm('email', e.target.value)} placeholder="example@mail.com" className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-yellow-400" />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 animate-fade-in">
              <h3 className="text-2xl font-black text-slate-900 mb-6 flex items-center gap-3">
                <MapPin className="text-yellow-500" /> Shipping
              </h3>
              <div className="space-y-1">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">City</label>
                <input required type="text" value={formData.city} onChange={e => updateForm('city', e.target.value)} placeholder="Enter city" className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-yellow-400" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Post Office / Address</label>
                <input required type="text" value={formData.department} onChange={e => updateForm('department', e.target.value)} placeholder="Branch number or address" className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-yellow-400" />
              </div>
              <div className="p-5 bg-blue-50 rounded-2xl border border-blue-100 flex gap-4 items-start">
                <Truck className="text-blue-600 shrink-0 mt-1" size={24} />
                <p className="text-xs text-blue-800 leading-relaxed font-bold">
                  Free shipping for your order! <br/>
                  We will send the tracking number via SMS after dispatch.
                </p>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4 animate-fade-in">
              <h3 className="text-2xl font-black text-slate-900 mb-6">Choose Payment Method</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className={`p-6 border-2 rounded-[2rem] flex items-center gap-4 cursor-pointer transition-all ${
                  formData.payment === 'card' ? 'border-yellow-400 bg-yellow-50/50 shadow-lg shadow-yellow-100' : 'border-slate-100 hover:border-slate-200'
                }`}>
                  <input type="radio" name="payment" className="hidden" onChange={() => updateForm('payment', 'card')} checked={formData.payment === 'card'} />
                  <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-slate-900 shadow-sm">
                    <CreditCard size={24} />
                  </div>
                  <div>
                    <div className="font-black text-slate-900">Pay Now</div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase">Stripe / Apple Pay / Card</div>
                  </div>
                </label>
                <label className={`p-6 border-2 rounded-[2rem] flex items-center gap-4 cursor-pointer transition-all ${
                  formData.payment === 'cash' ? 'border-yellow-400 bg-yellow-50/50 shadow-lg shadow-yellow-100' : 'border-slate-100 hover:border-slate-200'
                }`}>
                  <input type="radio" name="payment" className="hidden" onChange={() => updateForm('payment', 'cash')} checked={formData.payment === 'cash'} />
                  <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-slate-900 shadow-sm">
                    <Truck size={24} />
                  </div>
                  <div>
                    <div className="font-black text-slate-900">COD</div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase">Cash on delivery</div>
                  </div>
                </label>
              </div>

              <div className="bg-slate-900 p-8 rounded-[2.5rem] mt-8 text-white relative overflow-hidden">
                <div className="relative z-10 flex justify-between items-center">
                  <div>
                    <div className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Total to Pay</div>
                    <div className="text-4xl font-black text-yellow-400">₴{totalPrice.toLocaleString()}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-400 font-black uppercase mb-1">Items</div>
                    <div className="text-2xl font-black">{totalItems} units</div>
                  </div>
                </div>
                <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-400/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
              </div>
            </div>
          )}

          <div className="flex gap-4 pt-6">
            {step > 1 && (
              <button 
                type="button"
                disabled={isProcessing}
                onClick={() => setStep(step - 1)}
                className="flex-1 bg-slate-100 text-slate-500 py-5 rounded-[2rem] font-black hover:bg-slate-200 transition-all disabled:opacity-50"
              >
                Back
              </button>
            )}
            <button 
              type="submit"
              disabled={isProcessing}
              className="flex-[2] bg-yellow-400 hover:bg-yellow-500 text-yellow-950 py-5 rounded-[2rem] font-black text-xl transition-all shadow-xl shadow-yellow-100 flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="animate-spin" /> {formData.payment === 'card' ? 'Processing payment...' : 'Saving order...'}
                </>
              ) : (
                step === 3 ? (formData.payment === 'card' ? 'Pay & Checkout' : 'Confirm Order') : 'Next Step'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
