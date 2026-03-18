import React, { useState, useRef, useEffect } from 'react';
import { FileText, Download, Mail, MessageCircle, Loader2, ChevronDown } from 'lucide-react';
import {
  exportProductDocx, exportKitDocx, exportCartDocx,
  ProductExportData, KitExportData, CartExportItem
} from '../utils/docExport';

type ExportMode = 'product' | 'kit' | 'cart';

interface DocExportButtonProps {
  mode: ExportMode;
  product?: ProductExportData;
  kit?: KitExportData;
  cartItems?: CartExportItem[];
  customerName?: string;
  className?: string;
  variant?: 'light' | 'dark';
}

export const DocExportButton: React.FC<DocExportButtonProps> = ({
  mode, product, kit, cartItems, customerName, className = '', variant = 'light'
}) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const getFileName = () => {
    if (mode === 'product' && product) return `GL_${product.name.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 40)}.docx`;
    if (mode === 'kit' && kit) return `GL_Kit_${kit.title.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 40)}.docx`;
    return `GL_Quote.docx`;
  };

  const handleDownload = async () => {
    setLoading(true);
    setOpen(false);
    try {
      if (mode === 'product' && product) await exportProductDocx(product);
      else if (mode === 'kit' && kit) await exportKitDocx(kit);
      else if (mode === 'cart' && cartItems) await exportCartDocx(cartItems, customerName);
    } catch (e) {
      console.error('[DocExport] Error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleEmail = async () => {
    setLoading(true);
    setOpen(false);
    try {
      // Generate & download first, then open mailto
      if (mode === 'product' && product) await exportProductDocx(product);
      else if (mode === 'kit' && kit) await exportKitDocx(kit);
      else if (mode === 'cart' && cartItems) await exportCartDocx(cartItems, customerName);

      const subject = encodeURIComponent(
        mode === 'product' ? `Product info: ${product?.name}` :
        mode === 'kit'     ? `Solar kit configuration: ${kit?.title}` :
        'Green Light Scandinavia — Quotation'
      );
      const body = encodeURIComponent(
        `Hello,\n\nPlease find the attached document from Green Light Scandinavia.\n\nFile: ${getFileName()}\n\nBest regards,\nGreen Light Scandinavia\nwww.glsolargroup.dk`
      );
      window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
    } finally {
      setLoading(false);
    }
  };

  const handleWhatsApp = async () => {
    setLoading(true);
    setOpen(false);
    try {
      if (mode === 'product' && product) await exportProductDocx(product);
      else if (mode === 'kit' && kit) await exportKitDocx(kit);
      else if (mode === 'cart' && cartItems) await exportCartDocx(cartItems, customerName);

      const text = encodeURIComponent(
        mode === 'product' ? `Green Light Scandinavia — Product info: *${product?.name}*\n\nI've downloaded the product datasheet. Please find it attached.` :
        mode === 'kit'     ? `Green Light Scandinavia — Solar Kit: *${kit?.title}*\n\nTotal: €${kit?.totalPrice.toLocaleString('da-DK')}\n\nSee the attached Word document for full details.` :
        `Green Light Scandinavia — Quotation\n\nTotal: €${cartItems?.reduce((s,i) => s + i.price*i.quantity, 0).toLocaleString('da-DK')}\n\nSee the attached Word document for full details.`
      );
      window.open(`https://wa.me/?text=${text}`, '_blank');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div ref={ref} className={`relative ${className}`}>
      {/* Main button */}
      <button
        onClick={() => setOpen(o => !o)}
        disabled={loading}
        className={`w-full flex items-center justify-center gap-2 px-5 py-4 rounded-2xl font-black uppercase text-[9px] tracking-widest transition-all border disabled:opacity-50
          ${variant === 'dark'
            ? 'bg-emerald-500 hover:bg-emerald-400 text-white border-emerald-400 shadow-lg shadow-emerald-500/20'
            : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200 hover:border-slate-300'
          }`}
      >
        {loading
          ? <Loader2 size={14} className="animate-spin" />
          : <FileText size={14} />
        }
        Word
        <ChevronDown size={11} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute bottom-full mb-2 left-0 w-52 bg-white rounded-2xl border border-slate-100 shadow-2xl overflow-hidden z-50">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
            <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Export as Word (.docx)</div>
          </div>

          {/* Download */}
          <button
            onClick={handleDownload}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-emerald-50 transition-colors text-left group"
          >
            <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center group-hover:bg-emerald-200 transition-colors">
              <Download size={14} className="text-emerald-600" />
            </div>
            <div>
              <div className="text-[10px] font-black text-slate-900 uppercase">Download</div>
              <div className="text-[8px] text-slate-400">Save .docx to device</div>
            </div>
          </button>

          {/* Email */}
          <button
            onClick={handleEmail}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-blue-50 transition-colors text-left group"
          >
            <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition-colors">
              <Mail size={14} className="text-blue-600" />
            </div>
            <div>
              <div className="text-[10px] font-black text-slate-900 uppercase">Email</div>
              <div className="text-[8px] text-slate-400">Download + open email</div>
            </div>
          </button>

          {/* WhatsApp */}
          <button
            onClick={handleWhatsApp}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-green-50 transition-colors text-left group"
          >
            <div className="w-8 h-8 rounded-xl bg-green-100 flex items-center justify-center group-hover:bg-green-200 transition-colors">
              <MessageCircle size={14} className="text-green-600" />
            </div>
            <div>
              <div className="text-[10px] font-black text-slate-900 uppercase">WhatsApp</div>
              <div className="text-[8px] text-slate-400">Download + open WhatsApp</div>
            </div>
          </button>
        </div>
      )}
    </div>
  );
};
