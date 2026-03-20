import React, { useMemo } from 'react';
import { X, Package, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { aggregateStockDemand, orderCountsTowardStockDemand } from './stockDemandUtils';

type ProductLike = {
  id: string;
  name: unknown;
  StockLvl?: number;
  stock?: number;
};

interface AdminStockDemandModalProps {
  orders: any[];
  products: ProductLike[];
  onClose: () => void;
}

export const AdminStockDemandModal: React.FC<AdminStockDemandModalProps> = ({
  orders,
  products,
  onClose,
}) => {
  const { t, getLoc } = useLanguage();

  const eligibleOrderCount = useMemo(
    () => (orders || []).filter((o) => orderCountsTowardStockDemand(o)).length,
    [orders]
  );

  const rows = useMemo(() => {
    const byId = new Map(products.map((p) => [String(p.id), p]));
    return aggregateStockDemand(orders, (productId) => {
      const p = byId.get(String(productId));
      if (!p) return { stock: 0, found: false };
      const stock = Number(p.StockLvl ?? p.stock ?? 0);
      const name =
        typeof p.name === 'string'
          ? p.name
          : getLoc(p.name as any);
      return { stock: Number.isFinite(stock) ? stock : 0, found: true, name };
    });
  }, [orders, products, getLoc]);

  const shortRows = useMemo(() => rows.filter((r) => r.shortageQty > 0), [rows]);
  const allOk = shortRows.length === 0 && rows.length > 0;

  return (
    <div className="fixed inset-0 z-[10002] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md animate-fade-in text-left">
      <div className="bg-white w-full max-w-4xl max-h-[min(90vh,720px)] rounded-[2rem] shadow-2xl border border-slate-100 flex flex-col overflow-hidden">
        <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-start gap-4 bg-slate-50 shrink-0">
          <div>
            <h2 className="text-lg font-black uppercase tracking-tight text-slate-900 flex items-center gap-2">
              <Package size={22} className="text-emerald-500" />
              {t('admin_stock_demand_title')}
            </h2>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-2 max-w-xl leading-relaxed">
              {t('admin_stock_demand_hint')}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-3 hover:bg-slate-200 rounded-2xl text-slate-400 transition-all shrink-0"
            aria-label="Close"
          >
            <X size={22} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-8 space-y-6">
          {rows.length === 0 ? (
            <p className="text-center text-[10px] font-black text-slate-400 uppercase tracking-widest py-12 px-4 leading-relaxed">
              {(orders || []).length === 0
                ? t('admin_no_orders_yet')
                : eligibleOrderCount === 0
                  ? t('admin_stock_no_eligible_orders')
                  : t('admin_stock_no_line_items')}
            </p>
          ) : allOk ? (
            <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50/80 p-8 flex flex-col items-center text-center gap-3">
              <CheckCircle2 size={40} className="text-emerald-500" />
              <div className="text-sm font-black uppercase text-emerald-800 tracking-tight">
                {t('admin_stock_all_ok_title')}
              </div>
              <p className="text-[10px] font-bold text-emerald-700/80 uppercase tracking-widest max-w-md">
                {t('admin_stock_all_ok_body')}
              </p>
            </div>
          ) : (
            <>
              <div className="rounded-2xl border-2 border-amber-200 bg-amber-50/90 p-5 flex gap-4 items-start">
                <AlertTriangle size={24} className="text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-black uppercase text-amber-900 tracking-tight">
                    {t('admin_stock_need_restock_title')}
                  </div>
                  <p className="text-[10px] font-bold text-amber-800/90 uppercase tracking-widest mt-1">
                    {t('admin_stock_need_restock_body').replace(
                      '{{n}}',
                      String(shortRows.length)
                    )}
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-100">
                <table className="w-full text-left text-[10px]">
                  <thead>
                    <tr className="bg-slate-50 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                      <th className="p-4">{t('admin_stock_col_product')}</th>
                      <th className="p-4 text-center whitespace-nowrap">{t('admin_stock_col_ordered')}</th>
                      <th className="p-4 text-center whitespace-nowrap">{t('admin_stock_col_warehouse')}</th>
                      <th className="p-4 text-center whitespace-nowrap">{t('admin_stock_col_shortage')}</th>
                      <th className="p-4 text-right whitespace-nowrap">{t('admin_col_status')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {rows.map((r) => (
                      <tr
                        key={r.productId}
                        className={r.shortageQty > 0 ? 'bg-rose-50/40' : 'bg-white'}
                      >
                        <td className="p-4">
                          <div className="font-black text-slate-900 uppercase tracking-tight leading-snug">
                            {r.displayName}
                          </div>
                          <div className="text-[8px] font-bold text-slate-400 mt-1 font-mono">
                            ID: {r.productId.slice(0, 12)}…
                            {r.missingFromCatalog && (
                              <span className="text-rose-500 ml-2">{t('admin_stock_not_in_catalog')}</span>
                            )}
                          </div>
                        </td>
                        <td className="p-4 text-center font-black text-slate-800">{r.orderedQty}</td>
                        <td className="p-4 text-center font-black text-slate-600">{r.stockQty}</td>
                        <td className="p-4 text-center font-black text-rose-600">
                          {r.shortageQty > 0 ? r.shortageQty : '—'}
                        </td>
                        <td className="p-4 text-right">
                          {r.shortageQty > 0 ? (
                            <span className="inline-flex px-2 py-1 rounded-lg bg-rose-100 text-rose-700 text-[8px] font-black uppercase tracking-widest">
                              {t('admin_stock_status_short')}
                            </span>
                          ) : (
                            <span className="inline-flex px-2 py-1 rounded-lg bg-emerald-100 text-emerald-700 text-[8px] font-black uppercase tracking-widest">
                              {t('admin_stock_status_ok')}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="space-y-2">
                <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                  {t('admin_stock_shortage_details_heading')}
                </div>
                <ul className="space-y-2">
                  {shortRows.map((r) => (
                    <li
                      key={r.productId}
                      className="text-[10px] font-bold text-slate-700 bg-slate-50 rounded-xl px-4 py-3 border border-slate-100"
                    >
                      {t('admin_stock_shortage_line')
                        .replace('{{name}}', r.displayName)
                        .replace('{{ordered}}', String(r.orderedQty))
                        .replace('{{stock}}', String(r.stockQty))
                        .replace('{{need}}', String(r.shortageQty))}
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
