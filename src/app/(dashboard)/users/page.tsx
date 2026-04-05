"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import toast from "react-hot-toast";

interface UserProfile {
  id: string;
  full_name: string;
  company_name: string;
  role: string;
  created_at: string;
  email?: string;
  status?: string;
}

export default function UserListPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ full_name: "", role: "" });

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (err: any) {
      toast.error("Kullanıcılar yüklenirken hata oluştu: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Bu kullanıcıyı silmek istediğinize emin misiniz?")) return;
    
    try {
      const { error } = await supabase
        .from("profiles")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
      
      toast.success("Kullanıcı başarıyla silindi.");
      setUsers(users.filter(u => u.id !== id));
    } catch (err: any) {
      toast.error("Silme hatası: " + err.message);
    }
  };

  const startEdit = (user: UserProfile) => {
    setEditingId(user.id);
    setEditForm({ full_name: user.full_name, role: user.role });
  };

  const handleSaveEdit = async (id: string) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: editForm.full_name,
          role: editForm.role
        })
        .eq("id", id);
      
      if (error) throw error;
      
      toast.success("Kullanıcı güncellendi.");
      setUsers(users.map(u => u.id === id ? { ...u, ...editForm } : u));
      setEditingId(null);
    } catch (err: any) {
      toast.error("Güncelleme hatası: " + err.message);
    }
  };

  // Stats calculation
  const totalUsers = users.length;
  const activeUsers = users.filter(u => u.status !== 'pending').length;
  const pendingInvites = users.filter(u => u.status === 'pending').length;
  const adminCount = users.filter(u => u.role === 'admin' || u.role === 'Yönetici').length;

  return (
    <>
      {/* Page Header Section */}
      <section className="mb-10 flex items-end justify-between">
        <div>
          <nav className="flex items-center gap-2 mb-2">
            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-label">Yönetim</span>
            <span className="material-symbols-outlined text-[12px] text-slate-300">chevron_right</span>
            <span className="text-[11px] uppercase tracking-wider text-indigo-600 font-bold font-label">Ekip Üyeleri</span>
          </nav>
          <h2 className="text-4xl font-extrabold font-headline text-slate-900 tracking-tight">Kullanıcı Yönetimi</h2>
          <p className="text-slate-500 mt-1 max-w-lg font-body">Tüm finans ekibiniz için organizasyonel erişimi, rolleri ve güvenlik izinlerini yönetin.</p>
        </div>
        <Link 
          href="/users/new"
          className="px-6 py-3 bg-gradient-to-br from-primary to-primary-container text-white font-bold rounded-xl shadow-lg shadow-indigo-200 flex items-center gap-2 hover:opacity-95 transition-all active:scale-[0.98]"
        >
          <span className="material-symbols-outlined">person_add</span>
          Üye Davet Et
        </Link>
      </section>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-surface-container-low p-6 rounded-2xl flex flex-col justify-between transition-all hover:shadow-md">
          <span className="text-[11px] uppercase tracking-wider text-slate-500 font-bold font-label">Toplam Kullanıcı</span>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-headline font-extrabold text-slate-900">{isLoading ? "..." : totalUsers.toString().padStart(2, '0')}</span>
            <span className="text-xs text-green-600 font-bold flex items-center gap-1 font-body">Canlı</span>
          </div>
        </div>
        <div className="bg-surface-container-low p-6 rounded-2xl flex flex-col justify-between transition-all hover:shadow-md">
          <span className="text-[11px] uppercase tracking-wider text-slate-500 font-bold font-label">Aktif</span>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-headline font-extrabold text-slate-900">{isLoading ? "..." : activeUsers.toString().padStart(2, '0')}</span>
            <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold font-body">{totalUsers > 0 ? Math.round((activeUsers/totalUsers)*100) : 0}%</span>
          </div>
        </div>
        <div className="bg-surface-container-low p-6 rounded-2xl flex flex-col justify-between transition-all hover:shadow-md">
          <span className="text-[11px] uppercase tracking-wider text-slate-500 font-bold font-label">Bekleyen Davetler</span>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-headline font-extrabold text-slate-900">{isLoading ? "..." : pendingInvites.toString().padStart(2, '0')}</span>
            <span className="text-xs text-slate-400 font-medium font-body">yanıt bekleniyor</span>
          </div>
        </div>
        <div className="bg-surface-container-low p-6 rounded-2xl flex flex-col justify-between border-l-4 border-indigo-500 transition-all hover:shadow-md">
          <span className="text-[11px] uppercase tracking-wider text-indigo-600 font-bold font-label">Yönetici Kotası</span>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-headline font-extrabold text-slate-900">{isLoading ? "..." : `${adminCount}/5`}</span>
            <span className="text-xs text-slate-400 font-medium font-body">Premium Plan</span>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-surface-container-lowest rounded-[2rem] shadow-sm overflow-hidden">
        <div className="overflow-x-auto min-h-[300px]">
          <table className="w-full text-left border-collapse font-body">
            <thead>
              <tr className="bg-surface-container-low">
                <th className="px-8 py-5 text-[11px] uppercase tracking-widest text-slate-500 font-bold font-label">İsim</th>
                <th className="px-8 py-5 text-[11px] uppercase tracking-widest text-slate-500 font-bold font-label">Rol</th>
                <th className="px-8 py-5 text-[11px] uppercase tracking-widest text-slate-500 font-bold font-label">Durum</th>
                <th className="px-8 py-5 text-[11px] uppercase tracking-widest text-slate-500 font-bold font-label text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="px-8 py-10 text-center text-slate-400 italic">Yükleniyor...</td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-8 py-10 text-center text-slate-400 italic">Henüz ekip üyesi bulunamadı.</td>
                </tr>
              ) : (
                users.map(user => (
                  editingId === user.id ? (
                    /* Inline Edit Mode Row */
                    <tr key={user.id} className="bg-indigo-50/30 ring-1 ring-inset ring-indigo-100 relative shadow-sm z-10 animate-in fade-in slide-in-from-top-1 duration-200">
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600 ring-2 ring-white">
                            <span className="material-symbols-outlined italic">edit</span>
                          </div>
                          <div>
                            <input
                              className="font-bold text-slate-900 bg-white border border-slate-200 rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-indigo-500/20"
                              value={editForm.full_name}
                              onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                            />
                            <div className="flex items-center gap-1 mt-1">
                              <span className="text-[9px] bg-indigo-600 text-white px-1.5 py-0.5 rounded font-bold uppercase tracking-widest">DÜZENLENİYOR</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <div className="relative inline-block w-full max-w-[150px]">
                          <select 
                            className="appearance-none w-full bg-white border border-slate-200 rounded-lg py-2 pl-3 pr-10 text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 outline-none"
                            value={editForm.role}
                            onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                          >
                            <option value="admin">Yönetici</option>
                            <option value="accounting">Muhasebe</option>
                            <option value="staff">Personel</option>
                            <option value="sales">Satış</option>
                          </select>
                          <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-sm">unfold_more</span>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <span className="flex items-center gap-1.5 text-xs font-semibold text-green-700">
                          <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                          Aktif
                        </span>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => setEditingId(null)}
                            className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors"
                          >
                            İptal
                          </button>
                          <button 
                            onClick={() => handleSaveEdit(user.id)}
                            className="px-4 py-1.5 text-xs font-bold bg-indigo-600 text-white rounded-lg shadow-sm hover:bg-indigo-700 transition-all font-body active:scale-95"
                          >
                            Kaydet
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    /* Normal Display Row */
                    <tr key={user.id} className="hover:bg-slate-50/50 transition-all group">
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-4">
                          <div className="relative w-10 h-10">
                            <div className="w-full h-full rounded-xl overflow-hidden relative ring-2 ring-slate-100 flex items-center justify-center bg-slate-50">
                              <span className="material-symbols-outlined text-slate-300">person</span>
                            </div>
                            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">{user.full_name}</p>
                            <p className="text-[10px] text-slate-400 uppercase tracking-tighter font-bold">
                              {new Date(user.created_at).toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })}'da katıldı
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                          user.role === 'admin' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' :
                          user.role === 'accounting' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                          'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}>
                          {user.role === 'admin' ? 'Yönetici' : user.role === 'accounting' ? 'Muhasebe' : 'Personel'}
                        </span>
                      </td>
                      <td className="px-8 py-5">
                        <span className="flex items-center gap-1.5 text-xs font-semibold text-green-700">
                          <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                          Aktif
                        </span>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
                          <button 
                            onClick={() => startEdit(user)}
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-lg transition-all shadow-sm hover:shadow-indigo-100/50"
                          >
                            <span className="material-symbols-outlined text-lg">edit</span>
                          </button>
                          <button 
                            onClick={() => handleDelete(user.id)}
                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-white rounded-lg transition-all shadow-sm hover:shadow-red-100/50"
                          >
                            <span className="material-symbols-outlined text-lg">person_remove</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                ))
              )}
            </tbody>
          </table>
        </div>
        {/* Table Footer / Pagination */}
        <div className="px-8 py-6 bg-slate-50/50 flex items-center justify-between border-t border-slate-100">
          <p className="text-xs text-slate-500 font-medium font-body"><span className="text-slate-900 font-bold">{users.length}</span> üyeden <span className="text-slate-900 font-bold">1-{users.length}</span> arası gösteriliyor</p>
          <div className="flex items-center gap-2">
            <button className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 cursor-not-allowed">
              <span className="material-symbols-outlined text-sm">chevron_left</span>
            </button>
            <button className="w-8 h-8 flex items-center justify-center rounded-lg bg-indigo-600 text-white font-bold text-xs shadow-sm">1</button>
            <button className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition-colors hover:bg-white cursor-not-allowed">
              <span className="material-symbols-outlined text-sm">chevron_right</span>
            </button>
          </div>
        </div>
      </div>

      {/* Role Permissions Context Card */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-surface-container-low p-6 rounded-3xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
            <span className="material-symbols-outlined text-6xl">verified_user</span>
          </div>
          <h4 className="font-headline font-bold text-slate-900 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
            Yönetici Kontrolleri
          </h4>
          <p className="text-xs text-slate-500 mt-2 mb-4 leading-relaxed font-body">Finansal kayıtlara, kullanıcı yönetimine, faturalandırmaya ve sistem ayarlarına tam erişim.</p>
          <Link href="/users/roles" className="text-xs font-bold text-indigo-600 flex items-center gap-1 group font-body">
            Politikayı Görüntüle <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">arrow_forward</span>
          </Link>
        </div>
        <div className="bg-surface-container-low p-6 rounded-3xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
            <span className="material-symbols-outlined text-6xl">analytics</span>
          </div>
          <h4 className="font-headline font-bold text-slate-900 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            Muhasebeci Görünümü
          </h4>
          <p className="text-xs text-slate-500 mt-2 mb-4 leading-relaxed font-body">Üye yönetimi olmadan defterlere, vergi raporlarına ve denetim günlüklerine özel erişim.</p>
          <Link href="/users/roles" className="text-xs font-bold text-emerald-600 flex items-center gap-1 group font-body">
            Erişimi Yapılandır <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">arrow_forward</span>
          </Link>
        </div>
        <div className="bg-surface-container-low p-6 rounded-3xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
            <span className="material-symbols-outlined text-6xl">lock</span>
          </div>
          <h4 className="font-headline font-bold text-slate-900 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-slate-400"></span>
            Güvenlik Aktivitesi
          </h4>
          <p className="text-xs text-slate-500 mt-2 mb-4 leading-relaxed font-body">Giriş geçmişini, IP adresi değişikliklerini ve kritik izin modifikasyonlarını inceleyin.</p>
          <button className="text-xs font-bold text-slate-600 flex items-center gap-1 group font-body">
            Denetim Günlükleri <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">arrow_forward</span>
          </button>
        </div>
      </div>
    </>
  );
}
