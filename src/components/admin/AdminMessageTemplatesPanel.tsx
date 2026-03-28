import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, Plus, Save, Trash2, Mail } from 'lucide-react';
import { supabase } from '../../services/supabase';
import { useNotification } from '../../contexts/NotificationContext';
import { useLanguage } from '../../contexts/LanguageContext';
import type { MessageTemplateRow, AppLang } from '../../utils/messageTemplate';

const LANGS: AppLang[] = ['da', 'en', 'no', 'se'];

function emptyForm(): MessageTemplateRow {
  return {
    id: '',
    code: '',
    title_internal: '',
    subject_da: '',
    subject_en: '',
    subject_no: '',
    subject_se: '',
    body_da: '',
    body_en: '',
    body_no: '',
    body_se: '',
    is_active: true,
    sort_order: 0,
  };
}

export const AdminMessageTemplatesPanel: React.FC = () => {
  const { addNotification } = useNotification();
  const { t, language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rows, setRows] = useState<MessageTemplateRow[]>([]);
  const [form, setForm] = useState<MessageTemplateRow>(emptyForm);
  const [editLang, setEditLang] = useState<AppLang>((language as AppLang) || 'da');

  useEffect(() => {
    setEditLang((language as AppLang) || 'da');
  }, [language]);

  const adminKey = import.meta.env.VITE_ADMIN_PASSWORD as string | undefined;

  const load = useCallback(async () => {
    if (!adminKey) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.rpc('admin_get_message_templates', { p_key: adminKey });
    if (error) {
      addNotification(error.message || t('admin_msg_fetch_error'), 'error');
      setRows([]);
    } else {
      setRows((data as MessageTemplateRow[]) || []);
    }
    setLoading(false);
  }, [adminKey, addNotification, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const selectRow = (r: MessageTemplateRow) => {
    setForm({ ...r });
  };

  const newTemplate = () => {
    setForm({
      ...emptyForm(),
      code: `template_${Date.now()}`,
      title_internal: t('admin_msg_new_internal_title'),
    });
  };

  const save = async () => {
    if (!adminKey) return;
    if (!form.code.trim()) {
      addNotification(t('admin_msg_code_required'), 'error');
      return;
    }
    setSaving(true);
    try {
      const { data, error } = await supabase.rpc('admin_upsert_message_template', {
        p_key: adminKey,
        p_id: form.id || null,
        p_code: form.code.trim(),
        p_title_internal: form.title_internal,
        p_subject_da: form.subject_da,
        p_subject_en: form.subject_en,
        p_subject_no: form.subject_no,
        p_subject_se: form.subject_se,
        p_body_da: form.body_da,
        p_body_en: form.body_en,
        p_body_no: form.body_no,
        p_body_se: form.body_se,
        p_is_active: form.is_active,
        p_sort_order: Number(form.sort_order) || 0,
      });
      if (error) throw error;
      const saved = data as MessageTemplateRow;
      addNotification(t('admin_msg_saved'), 'success');
      await load();
      if (saved?.id) {
        const fresh = (await supabase.rpc('admin_get_message_templates', { p_key: adminKey })).data as MessageTemplateRow[];
        const one = fresh?.find((x) => x.id === saved.id);
        if (one) setForm(one);
      }
    } catch (e: unknown) {
      addNotification(e instanceof Error ? e.message : t('admin_msg_fetch_error'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!adminKey || !form.id) return;
    if (!window.confirm(t('admin_msg_delete_confirm'))) return;
    const { error } = await supabase.rpc('admin_delete_message_template', {
      p_key: adminKey,
      p_id: form.id,
    });
    if (error) {
      addNotification(error.message, 'error');
      return;
    }
    addNotification(t('admin_msg_deleted'), 'success');
    setForm(emptyForm());
    await load();
  };

  const subKey = `subject_${editLang}` as keyof MessageTemplateRow;
  const bodyKey = `body_${editLang}` as keyof MessageTemplateRow;

  return (
    <div className="space-y-6 text-left">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-sm font-black uppercase tracking-widest text-slate-900 flex items-center gap-2">
            <Mail size={18} className="text-emerald-500" /> {t('admin_msg_templates_title')}
          </h2>
          <p className="text-[10px] text-slate-500 font-bold mt-1 max-w-xl">{t('admin_msg_templates_hint')}</p>
          <p className="text-[9px] text-slate-400 font-mono mt-2">{t('admin_msg_placeholders_list')}</p>
        </div>
        <button
          type="button"
          onClick={newTemplate}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl text-[9px] font-black uppercase tracking-widest"
        >
          <Plus size={14} /> {t('admin_msg_new_template')}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 space-y-2 max-h-[min(60vh,520px)] overflow-y-auto border border-slate-100 rounded-2xl p-3 bg-slate-50/50">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="animate-spin text-emerald-500" size={28} />
            </div>
          ) : rows.length === 0 ? (
            <p className="text-[10px] text-slate-400 font-bold p-4">{t('admin_msg_no_templates')}</p>
          ) : (
            rows.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => selectRow(r)}
                className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${
                  form.id === r.id
                    ? 'bg-white border-emerald-400 shadow-md'
                    : 'bg-white/80 border-slate-100 hover:border-slate-200'
                }`}
              >
                <div className="text-[10px] font-black uppercase text-slate-900">{r.title_internal || r.code}</div>
                <div className="text-[8px] font-mono text-slate-400 mt-0.5">{r.code}</div>
                {!r.is_active && (
                  <span className="text-[8px] font-black text-rose-500 uppercase mt-1 inline-block">{t('admin_msg_inactive')}</span>
                )}
              </button>
            ))
          )}
        </div>

        <div className="lg:col-span-8 space-y-4 bg-white border border-slate-100 rounded-2xl p-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mr-2">{t('admin_msg_edit_language')}</span>
            {LANGS.map((L) => (
              <button
                key={L}
                type="button"
                onClick={() => setEditLang(L)}
                className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase ${
                  editLang === L ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                {L}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{t('admin_msg_code')}</label>
              <input
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-[11px] font-mono"
              />
            </div>
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{t('admin_msg_internal_title')}</label>
              <input
                value={form.title_internal}
                onChange={(e) => setForm((f) => ({ ...f, title_internal: e.target.value }))}
                className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-[11px] font-bold"
              />
            </div>
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{t('admin_msg_sort')}</label>
              <input
                type="number"
                value={form.sort_order}
                onChange={(e) => setForm((f) => ({ ...f, sort_order: Number(e.target.value) }))}
                className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-[11px]"
              />
            </div>
            <label className="flex items-center gap-2 mt-6 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                className="rounded border-slate-300"
              />
              <span className="text-[10px] font-black uppercase text-slate-600">{t('admin_msg_active')}</span>
            </label>
          </div>

          <div>
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
              {t('admin_msg_subject')} ({editLang.toUpperCase()})
            </label>
            <input
              value={String(form[subKey] ?? '')}
              onChange={(e) => setForm((f) => ({ ...f, [subKey]: e.target.value }))}
              className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-[11px]"
            />
          </div>
          <div>
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
              {t('admin_msg_body')} ({editLang.toUpperCase()})
            </label>
            <textarea
              value={String(form[bodyKey] ?? '')}
              onChange={(e) => setForm((f) => ({ ...f, [bodyKey]: e.target.value }))}
              rows={12}
              className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-[11px] font-mono leading-relaxed"
            />
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-emerald-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest disabled:opacity-50"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {t('admin_msg_save')}
            </button>
            {form.id && (
              <button
                type="button"
                onClick={() => void remove()}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-[9px] font-black uppercase tracking-widest"
              >
                <Trash2 size={14} /> {t('admin_msg_delete')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
