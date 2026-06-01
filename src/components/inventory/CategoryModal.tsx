"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  userId?: string;  // ✅ RLS policy başarılı olsun diye eklendi
}

export default function CategoryModal({ isOpen, onClose, onSuccess, userId }: Props) {  // ✅ userId eklendi
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  // Modal açıldığında formu sıfırla ve odakla
  useEffect(() => {
    if (isOpen) {
      setName("");
      setDescription("");
      setError(null);
      setSaving(false);
      setTimeout(() => nameRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // ESC tuşu ile kapat
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError("Kategori adı zorunludur."); return; }
    setSaving(true);
    setError(null);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError("Kullanıcı oturum açmamış.");
      setSaving(false);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("business_id")
      .eq("id", user.id)
      .single();
      
    const business_id = profile?.business_id;

    if (!business_id) {
      setError("Yetkisiz işlem");
      setSaving(false);
      return;
    }

    const { error: insertError } = await supabase
      .from("categories")
      .insert({ user_id: userId, business_id, name: name.trim(), description: description.trim() || null });

    if (insertError) {
      if (insertError.code === '23505') {
        setError("Bu isimde bir kategori şirketinizde zaten mevcut");
      } else {
        setError(insertError.message);
      }
      setSaving(false);
      return;
    }
    onSuccess();
    onClose();
  }

  if (!isOpen) return null;

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Blur overlay */}
      <div className="absolute inset-0 bg-on-surface/30 backdrop-blur-sm" />

      {/* Modal kutusu */}
      <div className="relative z-10 w-full max-w-md bg-white rounded-2xl shadow-2xl shadow-indigo-100/50 border border-indigo-50 animate-in fade-in slide-in-from-bottom-4 duration-200">

        {/* Başlık */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-indigo-50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center">
              <span className="material-symbols-outlined text-lg">category</span>
            </div>
            <div>
              <h3 className="text-base font-extrabold text-on-surface">Yeni Kategori</h3>
              <p className="text-[11px] text-slate-400">categories tablosuna eklenecek</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="px-6 py-5 space-y-4">

          {/* Hata */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-error-container/20 border border-error-container/40 rounded-xl text-xs font-semibold text-error">
              <span className="material-symbols-outlined text-sm">error</span>
              {error}
            </div>
          )}

          {/* Kategori Adı */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Kategori Adı <span className="text-error">*</span>
            </label>
            <input
              ref={nameRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-surface-container-low border border-indigo-100 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-primary focus:border-transparent text-sm outline-none transition-all placeholder:text-slate-300"
              placeholder="Örn: Elektronik"
              type="text"
              maxLength={100}
            />
          </div>

          {/* Açıklama */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Açıklama <span className="text-slate-300 font-normal normal-case">(opsiyonel)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-surface-container-low border border-indigo-100 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-primary focus:border-transparent text-sm outline-none transition-all placeholder:text-slate-300 resize-none"
              placeholder="Bu kategori hakkında kısa bir açıklama..."
              rows={3}
              maxLength={300}
            />
          </div>

          {/* Butonlar */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-indigo-100 text-slate-600 font-semibold rounded-xl hover:bg-slate-50 transition-all text-sm"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 bg-primary text-white font-bold rounded-xl hover:bg-primary-container transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-indigo-100"
            >
              {saving ? (
                <>
                  <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                  Kaydediliyor...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>save</span>
                  Kaydet
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
