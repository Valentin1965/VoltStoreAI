import React, { useCallback, useMemo, useState } from 'react';
import { Edit, Loader2, Plus, Save, Trash2, X, Image as ImageIcon, LayoutGrid } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { useProducts } from '../../contexts/ProductsContext';
import { useNotification } from '../../contexts/NotificationContext';
import { useLanguage, Language } from '../../contexts/LanguageContext';
import { supabase } from '../../services/supabase';
import { Product } from '../../types';
import { DualPrice } from '../PriceDisplay';
import { emptyLoc, IMAGE_FALLBACK } from './adminTypes';

const realIdFromProduct = (p: Product) => {
  const raw = String(p.id);
  return raw.includes('-') ? raw.split('-').slice(1).join('-') : raw;
};

type NameLoc = { da: string; en: string; no: string; se: string };

const mergeFiles = (prev: File[], next: File[]) => {
  const key = (f: File) => `${f.name}__${f.size}__${f.lastModified}`;
  const seen = new Set(prev.map(key));
  const merged = [...prev];
  for (const f of next) {
    const k = key(f);
    if (seen.has(k)) continue;
    seen.add(k);
    merged.push(f);
  }
  return merged;
};

export const AdminMountingSystemsPanel: React.FC = () => {
  const { products, fetchProducts } = useProducts();
  const { addNotification } = useNotification();
  const { t, getLoc } = useLanguage();
  const [editLang, setEditLang] = useState<Language>('da');
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<{
    name: NameLoc;
    description: NameLoc;
    price_eur_ex_vat: number;
    stock_lvl: number;
    image: string;
    galleryUrls: string[];
    is_active: boolean;
    is_leader: boolean;
  }>({
    name: emptyLoc(),
    description: emptyLoc(),
    price_eur_ex_vat: 0,
    stock_lvl: 999,
    image: '',
    galleryUrls: [],
    is_active: true,
    is_leader: false,
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);

  const rows = useMemo(
    () => products.filter((p) => p.category === 'Monteringssystemer'),
    [products],
  );

  const uploadImage = async (file: File): Promise<string | null> => {
    const ext = file.name.split('.').pop();
    const path = `images/${uuidv4()}.${ext}`;
    const { error } = await supabase.storage.from('product-assets').upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    });
    if (error) {
      addNotification(`${error.message}`, 'error');
      return null;
    }
    const { data } = supabase.storage.from('product-assets').getPublicUrl(path);
    return data.publicUrl;
  };

  const openCreate = () => {
    setEditing(null);
    setForm({
      name: emptyLoc(),
      description: emptyLoc(),
      price_eur_ex_vat: 0,
      stock_lvl: 999,
      image: '',
      galleryUrls: [],
      is_active: true,
      is_leader: false,
    });
    setImageFile(null);
    setGalleryFiles([]);
    setModalOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    const nm = typeof p.name === 'object' && p.name ? { ...emptyLoc(), ...p.name } : emptyLoc();
    const dc =
      typeof p.description === 'object' && p.description
        ? { ...emptyLoc(), ...p.description }
        : emptyLoc();
    const rawList = (Array.isArray(p.images) ? p.images : []).map((u) => String(u).trim()).filter(Boolean);
    const main = (p.image || rawList[0] || '').trim();
    const galleryOnly = rawList.filter((u) => u !== main);
    setForm({
      name: nm,
      description: dc,
      price_eur_ex_vat: Number(p.PriceEurExVat ?? p.price ?? 0),
      stock_lvl: Number(p.stock ?? 999),
      image: main,
      galleryUrls: galleryOnly.length ? galleryOnly : [],
      is_active: p.is_active !== false,
      is_leader: !!p.is_leader,
    });
    setImageFile(null);
    setGalleryFiles([]);
    setModalOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      let imageUrl = form.image.trim();
      if (imageFile) {
        const up = await uploadImage(imageFile);
        if (up) imageUrl = up;
      }
      const uploadedGallery =
        galleryFiles.length > 0
          ? ((await Promise.all(galleryFiles.map((f) => uploadImage(f)))).filter(Boolean) as string[])
          : [];
      const extraUrls = form.galleryUrls.map((u) => u.trim()).filter(Boolean);
      const imagesArr = Array.from(new Set([...(imageUrl ? [imageUrl] : []), ...extraUrls, ...uploadedGallery]));
      const payload = {
        name: form.name,
        description: form.description,
        price_eur_ex_vat: Number(form.price_eur_ex_vat) || 0,
        stock_lvl: Math.max(0, Number(form.stock_lvl) || 0),
        image: imageUrl || null,
        images: imagesArr.length ? imagesArr : [],
        is_active: form.is_active,
        is_leader: form.is_leader,
      };

      if (editing) {
        const id = realIdFromProduct(editing);
        const { error } = await supabase.from('mounting_systems').update(payload).eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('mounting_systems').insert([payload]);
        if (error) throw error;
      }
      addNotification(t('admin_mounting_saved'), 'success');
      setModalOpen(false);
      await fetchProducts();
    } catch (e: any) {
      addNotification(e?.message || String(e), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = useCallback(
    async (p: Product) => {
      if (!window.confirm(t('admin_mounting_delete_confirm'))) return;
      try {
        const id = realIdFromProduct(p);
        const { error } = await supabase.from('mounting_systems').delete().eq('id', id);
        if (error) throw error;
        addNotification(t('removed'), 'success');
        await fetchProducts();
      } catch (e: any) {
        addNotification(e?.message || String(e), 'error');
      }
    },
    [addNotification, fetchProducts, t],
  );

  return (
    <div className="space-y-6 text-left">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-2">
        <div>
          <h3 className="text-sm font-black uppercase tracking-widest text-slate-900">{t('admin_mounting_title')}</h3>
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1 max-w-xl">
            {t('admin_mounting_hint')}
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="btn-action !bg-emerald-500 !py-3 !px-6 !text-[9px] !rounded-2xl inline-flex items-center gap-2 shrink-0"
        >
          <Plus size={16} /> {t('admin_mounting_add')}
        </button>
      </div>

      <div className="overflow-x-auto rounded-[2rem] border border-slate-100 bg-white shadow-sm">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50/80 text-[9px] font-black text-slate-400 uppercase tracking-widest">
              <th className="p-5">{t('admin_mounting_col_name')}</th>
              <th className="p-5 text-center">{t('admin_col_stock')}</th>
              <th className="p-5 text-center">{t('admin_col_base_price')}</th>
              <th className="p-5 text-center">{t('admin_col_status')}</th>
              <th className="p-5 text-right">{t('admin_col_commands')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="p-12 text-center text-[10px] font-black text-slate-300 uppercase tracking-widest">
                  {t('admin_mounting_empty')}
                </td>
              </tr>
            )}
            {rows.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50/40 transition-colors">
                <td className="p-5 flex items-center gap-4">
                  <img
                    src={p.image || IMAGE_FALLBACK}
                    alt=""
                    className="w-12 h-12 rounded-2xl object-cover border border-slate-100"
                    loading="lazy"
                  />
                  <div>
                    <div className="text-[11px] font-black uppercase text-slate-900">{getLoc(p.name)}</div>
                    <div className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                      ID: {realIdFromProduct(p).slice(0, 8)}
                    </div>
                  </div>
                </td>
                <td className="p-5 text-center text-[11px] font-black text-slate-700">{p.stock ?? 0}</td>
                <td className="p-5 text-center">
                  <DualPrice priceExVat={p.PriceEurExVat ?? p.price} align="center" />
                </td>
                <td className="p-5 text-center">
                  <div
                    className={`w-2 h-2 rounded-full mx-auto ${
                      p.is_active !== false ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'bg-rose-500'
                    }`}
                  />
                </td>
                <td className="p-5 text-right space-x-2">
                  <button
                    type="button"
                    onClick={() => openEdit(p)}
                    className="p-2.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-all"
                  >
                    <Edit size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(p)}
                    className="p-2.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-[200000] flex items-end md:items-start md:justify-center justify-center p-0 md:p-6 pt-0 md:pt-10 bg-slate-900/90 backdrop-blur-md overflow-y-auto">
          <div className="bg-white w-full md:max-w-4xl rounded-t-[2rem] md:rounded-[2rem] shadow-2xl border border-slate-200 max-h-[min(78vh,720px)] md:max-h-[min(82vh,760px)] flex flex-col">
            <div className="px-5 py-3 border-b border-slate-100 flex justify-between items-center shrink-0">
              <h4 className="text-xs font-black uppercase tracking-widest text-slate-900">
                {editing ? t('admin_mounting_edit') : t('admin_mounting_add')}
              </h4>
              <button type="button" onClick={() => setModalOpen(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-xl">
                <X size={22} />
              </button>
            </div>
            <div className="px-5 py-4 overflow-y-auto custom-scrollbar space-y-4 flex-1 min-h-0 overscroll-contain">
              <div className="flex justify-end gap-1">
                {(['da', 'en', 'no', 'se'] as Language[]).map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => setEditLang(l)}
                    className={`w-9 h-9 rounded-xl text-[9px] font-black uppercase ${
                      editLang === l ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
                <div className="space-y-3">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-500 uppercase ml-1">
                      {t('admin_mounting_field_name')} ({editLang})
                    </label>
                    <input
                      className="input-premium w-full text-sm !py-2"
                      value={form.name[editLang] || ''}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, name: { ...f.name, [editLang]: e.target.value } }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-500 uppercase ml-1">
                      {t('admin_mounting_field_desc')} ({editLang})
                    </label>
                    <textarea
                      className="input-premium w-full min-h-[72px] max-h-40 py-2 text-sm resize-y"
                      value={form.description[editLang] || ''}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          description: { ...f.description, [editLang]: e.target.value },
                        }))
                      }
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-500 uppercase ml-1">{t('admin_mounting_field_price')}</label>
                      <input
                        type="number"
                        step="0.01"
                        min={0}
                        className="input-premium w-full text-sm !py-2"
                        value={form.price_eur_ex_vat}
                        onChange={(e) => setForm((f) => ({ ...f, price_eur_ex_vat: Number(e.target.value) }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-500 uppercase ml-1">{t('admin_modal_stock')}</label>
                      <input
                        type="number"
                        min={0}
                        className="input-premium w-full text-sm !py-2"
                        value={form.stock_lvl}
                        onChange={(e) => setForm((f) => ({ ...f, stock_lvl: Number(e.target.value) }))}
                      />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-4 pt-1">
                    <label className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.is_active}
                        onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                        className="rounded border-slate-300"
                      />
                      {t('admin_modal_visibility')}
                    </label>
                    <label className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.is_leader}
                        onChange={(e) => setForm((f) => ({ ...f, is_leader: e.target.checked }))}
                        className="rounded border-slate-300"
                      />
                      {t('admin_modal_sales_leader')}
                    </label>
                  </div>
                </div>
                <div className="space-y-4 border-t lg:border-t-0 lg:border-l border-slate-100 pt-4 lg:pt-0 lg:pl-6">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-500 uppercase ml-1 flex items-center gap-2">
                      <ImageIcon size={12} className="text-emerald-500 shrink-0" /> {t('admin_modal_main_image')}
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                      className="input-premium w-full text-xs"
                    />
                    <input
                      className="input-premium w-full text-xs !py-2"
                      placeholder="https://..."
                      value={form.image}
                      onChange={(e) => setForm((f) => ({ ...f, image: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-500 uppercase ml-1 flex items-center gap-2">
                      <LayoutGrid size={12} className="text-emerald-500 shrink-0" /> {t('admin_mounting_gallery_label')}
                    </label>
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wide leading-relaxed">
                      {t('admin_mounting_gallery_hint')}
                    </p>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) =>
                        setGalleryFiles((prev) => mergeFiles(prev, Array.from(e.target.files || [])))
                      }
                      className="input-premium w-full text-xs"
                    />
                    {galleryFiles.length > 0 && (
                      <ul className="text-[9px] text-slate-500 font-medium space-y-1 max-h-20 overflow-y-auto">
                        {galleryFiles.map((f, i) => (
                          <li key={`${f.name}-${i}`} className="truncate flex justify-between gap-2">
                            <span className="truncate">{f.name}</span>
                            <button
                              type="button"
                              className="text-rose-500 shrink-0 font-black uppercase"
                              onClick={() => setGalleryFiles((prev) => prev.filter((_, j) => j !== i))}
                            >
                              ×
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                    <div className="space-y-2">
                      {(form.galleryUrls.length ? form.galleryUrls : ['']).map((url, idx) => (
                        <div key={idx} className="flex gap-2 items-center">
                          <input
                            className="input-premium flex-1 text-xs !py-2"
                            placeholder={t('admin_mounting_gallery_url_ph')}
                            value={url}
                            onChange={(e) => {
                              const v = e.target.value;
                              setForm((f) => {
                                const next = [...(f.galleryUrls.length ? f.galleryUrls : [''])];
                                next[idx] = v;
                                return { ...f, galleryUrls: next };
                              });
                            }}
                          />
                          <button
                            type="button"
                            className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl shrink-0"
                            onClick={() =>
                              setForm((f) => {
                                const base = f.galleryUrls.length ? [...f.galleryUrls] : [''];
                                base.splice(idx, 1);
                                return { ...f, galleryUrls: base.length ? base : [] };
                              })
                            }
                            aria-label="Remove"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, galleryUrls: [...(f.galleryUrls.length ? f.galleryUrls : []), ''] }))}
                        className="w-full py-2 border border-dashed border-slate-200 rounded-xl text-[9px] font-black uppercase text-slate-400 hover:border-emerald-400 hover:text-emerald-600 transition-colors"
                      >
                        + {t('admin_mounting_gallery_add_url')}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="px-5 py-3 border-t border-slate-100 flex justify-end gap-3 shrink-0 bg-slate-50/50">
              <button type="button" onClick={() => setModalOpen(false)} className="px-5 py-3 text-[10px] font-black uppercase text-slate-400">
                {t('admin_btn_cancel')}
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleSave}
                className="btn-action !bg-slate-900 !py-3 !px-8 !rounded-xl !text-xs inline-flex items-center gap-2"
              >
                {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                {t('admin_modal_commit')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
