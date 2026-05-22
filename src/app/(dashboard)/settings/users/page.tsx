"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import toast from "react-hot-toast";
import { updateUserProfileSecure } from "@/app/(dashboard)/teamActions";

const MODULES = [
  {
    id: "stock",
    title: "Stok Yönetimi",
    description: "Ürün ve Depo Hareketleri",
    icon: "inventory_2",
    color: "blue",
    actions: { view: true, create: true, edit: true, delete: true },
  },
  {
    id: "contacts",
    title: "Cari Kart",
    description: "Müşteri ve Tedarikçi Portföyü",
    icon: "groups",
    color: "indigo",
    actions: { view: true, create: true, edit: true, delete: true },
  },
  {
    id: "invoices",
    title: "Fatura",
    description: "Alış, Satış ve Gider Faturası",
    icon: "receipt_long",
    color: "purple",
    actions: { view: true, create: true, edit: true, delete: true },
  },
  {
    id: "reports",
    title: "Raporlar",
    description: "Finansal Analiz ve Grafik",
    icon: "analytics",
    color: "emerald",
    actions: { view: true, create: true, edit: true, delete: true },
  },
];

const DEFAULT_ROLE_PERMS: Record<string, any> = {
  admin: {
    stock: { view: true, create: true, edit: true, delete: true },
    contacts: { view: true, create: true, edit: false, delete: true },
    invoices: { view: true, create: true, edit: false, delete: true },
    reports: { view: true, create: false, edit: false, delete: false },
  },
  accounting: {
    stock: { view: false, create: false, edit: false, delete: false },
    contacts: { view: true, create: true, edit: false, delete: true },
    invoices: { view: true, create: true, edit: false, delete: true },
    reports: { view: true, create: false, edit: false, delete: false },
  },
  warehouse: {
    stock: { view: true, create: true, edit: true, delete: true },
    contacts: { view: false, create: false, edit: false, delete: false },
    invoices: { view: false, create: false, edit: false, delete: false },
    reports: { view: false, create: false, edit: false, delete: false },
  },
  manager: {
    stock: { view: true, create: true, edit: true, delete: false },
    contacts: { view: true, create: true, edit: false, delete: false },
    invoices: { view: true, create: true, edit: false, delete: false },
    reports: { view: false, create: false, edit: false, delete: false },
  }
};

interface UserProfile {
  id: string;
  full_name: string;
  company_name: string;
  business_id: string | null;
  role: string;
  updated_at: string;
  email?: string;
  status?: 'active' | 'pending' | 'inactive' | string;
  profile_image?: string;
}

export default function UserListPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ full_name: "", role: "" });

  // User Permission Drawer State
  const [selectedUserForPerms, setSelectedUserForPerms] = useState<UserProfile | null>(null);
  const [userPermsMatrix, setUserPermsMatrix] = useState<Record<string, any>>({});
  const [isPermsLoading, setIsPermsLoading] = useState(false);
  const [isPermsSaving, setIsPermsSaving] = useState(false);

  const fetchUserPermissions = async (user: UserProfile) => {
    setIsPermsLoading(true);
    try {
      const { data: userPerms, error: userError } = await supabase
        .from('role_permissions')
        .select('*')
        .eq('role', user.id);

      if (userError) throw userError;

      let matrix: Record<string, any> = {};
      MODULES.forEach(m => {
        matrix[m.id] = { view: false, create: false, edit: false, delete: false };
      });

      if (userPerms && userPerms.length > 0) {
        userPerms.forEach(p => {
          if (matrix[p.module]) {
            matrix[p.module] = {
              view: p.can_view,
              create: p.can_create,
              edit: p.can_edit,
              delete: p.can_delete
            };
          }
        });
        setUserPermsMatrix(matrix);
      } else {
        const roleKey = user.role?.toLowerCase() || 'staff';
        const { data: rolePerms, error: roleError } = await supabase
          .from('role_permissions')
          .select('*')
          .eq('role', roleKey);

        if (roleError) throw roleError;

        if (rolePerms && rolePerms.length > 0) {
          rolePerms.forEach(p => {
            if (matrix[p.module]) {
              matrix[p.module] = {
                view: p.can_view,
                create: p.can_create,
                edit: p.can_edit,
                delete: p.can_delete
              };
            }
          });
        } else {
          const defaults = DEFAULT_ROLE_PERMS[roleKey] || DEFAULT_ROLE_PERMS['staff'];
          matrix = { ...defaults };
        }
        setUserPermsMatrix(matrix);
      }
    } catch (err: any) {
      toast.error("Yetkiler yüklenirken hata oluştu: " + err.message);
    } finally {
      setIsPermsLoading(false);
    }
  };

  const handleTogglePerm = (moduleId: string, actionKey: 'view' | 'create' | 'edit' | 'delete') => {
    setUserPermsMatrix(prev => {
      const updated = { ...prev };
      updated[moduleId] = {
        ...updated[moduleId],
        [actionKey]: !updated[moduleId][actionKey]
      };
      return updated;
    });
  };

  const handleSaveUserPerms = async () => {
    if (!selectedUserForPerms) return;
    setIsPermsSaving(true);
    const toastId = toast.loading("Kullanıcı yetkileri kaydediliyor...");
    try {
      const upsertData: any[] = [];
      Object.entries(userPermsMatrix).forEach(([module, perms]: [string, any]) => {
        upsertData.push({
          role: selectedUserForPerms.id,
          module,
          can_view: perms.view,
          can_create: perms.create,
          can_edit: perms.edit,
          can_delete: perms.delete
        });
      });

      const { error } = await supabase
        .from('role_permissions')
        .upsert(upsertData, { onConflict: 'role,module' });

      if (error) throw error;

      toast.success("Kullanıcı yetkileri başarıyla güncellendi.", { id: toastId });
      setSelectedUserForPerms(null);
    } catch (err: any) {
      toast.error("Kaydetme hatası: " + err.message, { id: toastId });
    } finally {
      setIsPermsSaving(false);
    }
  };

  const handleResetToRoleDefault = async () => {
    if (!selectedUserForPerms) return;
    if (!confirm("Bu kullanıcının tüm özel yetki tanımlamalarını silip varsayılan rol yetkilerine dönmek istediğinize emin misiniz?")) return;
    
    setIsPermsSaving(true);
    const toastId = toast.loading("Varsayılan role dönülüyor...");
    try {
      const { error } = await supabase
        .from('role_permissions')
        .delete()
        .eq('role', selectedUserForPerms.id);

      if (error) throw error;

      toast.success("Kullanıcı yetkileri sıfırlandı (Rol ayarlarına dönüldü).", { id: toastId });
      setSelectedUserForPerms(null);
    } catch (err: any) {
      toast.error("Sıfırlama hatası: " + err.message, { id: toastId });
    } finally {
      setIsPermsSaving(false);
    }
  };

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      // Önce admin'in kendi profilinden business_id'yi al
      const { data: myProfile } = await supabase
        .from("profiles")
        .select("business_id")
        .eq("id", authUser.id)
        .single();

      const businessId = myProfile?.business_id;

      if (!businessId) {
        // Fallback: business_id yoksa sadece kendi profilini göster
        const { data: selfData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", authUser.id);
        setUsers((selfData || []) as UserProfile[]);
        return;
      }

      // business_id eşleşen tüm profilleri getir (cache'siz)
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("business_id", businessId)
        .order("updated_at", { ascending: false });

      if (error) throw error;
      setUsers((data || []) as UserProfile[]);
    } catch (err: any) {
      toast.error("Kullanıcılar yüklenirken hata oluştu: " + err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();

    // Realtime: profiles tablosuna INSERT/UPDATE gelince listeyi yenile
    const channel = supabase
      .channel("public:profiles:realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        () => {
          fetchUsers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchUsers]);

  const handleDelete = async (id: string) => {
    if (id === (await supabase.auth.getUser()).data.user?.id) {
      toast.error("Kendi hesabınızı silemezsiniz.");
      return;
    }
    
    if (!confirm("Bu kullanıcıyı silmek istediğinize emin misiniz? Bu işlem geri alınamaz.")) return;
    
    const toastId = toast.loading("Kullanıcı siliniyor...");
    try {
      const { error, count } = await supabase
        .from("profiles")
        .delete({ count: 'exact' })
        .eq("id", id);
      
      if (error) throw error;
      
      toast.success("Kullanıcı başarıyla silindi.", { id: toastId });
      setUsers(users.filter(u => u.id !== id));
    } catch (err: any) {
      console.error("Delete error:", err);
      toast.error("Silme hatası: " + err.message, { id: toastId });
    }
  };

  const startEdit = (user: UserProfile) => {
    setEditingId(user.id);
    setEditForm({ full_name: user.full_name, role: user.role });
  };

  const handleSaveEdit = async (id: string) => {
    const toastId = toast.loading("Güncelleniyor...");
    try {
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      if (authError || !authUser) throw new Error("Oturum bulunamadı");

      const result = await updateUserProfileSecure(authUser.id, id, {
        full_name: editForm.full_name,
        role: editForm.role
      });
      
      if (!result) throw new Error("Sunucudan yanıt alınamadı.");
      if (!result.success) throw new Error(result.error || "Bilinmeyen bir hata oluştu.");
      
      toast.success("Kullanıcı güncellendi.", { id: toastId });
      setUsers(users.map(u => u.id === id ? { ...u, ...editForm } : u));
      setEditingId(null);
    } catch (err: any) {
      console.error("Save edit error:", err);
      toast.error("Güncelleme hatası: " + (err.message || "Bilinmeyen hata"), { id: toastId });
    }
  };

  const totalUsers = users.length;
  const activeUsers = users.filter(u => u.status !== 'pending').length;
  const pendingInvites = users.filter(u => u.status === 'pending').length;
  const adminCount = users.filter(u => u.role === 'admin' || u.role === 'Yönetici').length;

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header with Action */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 font-headline tracking-tight">Ekip Üyeleri</h2>
          <p className="text-sm text-slate-500 font-body">Sisteme erişimi olan tüm personelleri yönetin.</p>
        </div>
        <Link 
          href="/settings/users/new"
          className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold text-sm shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:scale-[1.02] active:scale-95 transition-all"
        >
          <span className="material-symbols-outlined text-[18px]">person_add</span>
          Yeni Üye Ekle
        </Link>
      </div>
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
                            <option value="warehouse">Depo Personeli</option>
                            <option value="manager">Personel / Müdür</option>
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
                            {new Date(user.updated_at).toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })}'da katıldı
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                          user.role === 'admin' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' :
                          user.role === 'accounting' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                          user.role === 'warehouse' ? 'bg-orange-50 text-orange-700 border border-orange-100' :
                          user.role === 'manager' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                          'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}>
                          {user.role === 'admin' ? 'Yönetici' : user.role === 'accounting' ? 'Muhasebe' : user.role === 'warehouse' ? 'Depo Personeli' : user.role === 'manager' ? 'Personel / Müdür' : 'Personel'}
                        </span>
                      </td>
                      <td className="px-8 py-5">
                        {user.status === 'pending' ? (
                          <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-1 rounded-full border border-amber-100">
                            <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse"></span>
                            Bekliyor
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-xs font-semibold text-green-700 bg-green-50 px-2 py-1 rounded-full border border-green-100">
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                            Aktif
                          </span>
                        )}
                      </td>
                      <td className="px-8 py-5 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
                          <button 
                            onClick={() => {
                              setSelectedUserForPerms(user);
                              fetchUserPermissions(user);
                            }}
                            className="p-2 text-slate-400 hover:text-amber-600 hover:bg-white rounded-lg transition-all shadow-sm hover:shadow-amber-100/50"
                            title="Yetkileri Yönet"
                          >
                            <span className="material-symbols-outlined text-lg">shield_person</span>
                          </button>
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
          <Link href="/settings/users/roles" className="text-xs font-bold text-indigo-600 flex items-center gap-1 group font-body">
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
          <Link href="/settings/users/roles" className="text-xs font-bold text-emerald-600 flex items-center gap-1 group font-body">
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

      {/* User Specific Permissions Drawer */}
      {selectedUserForPerms && (
        <div className="fixed inset-0 z-50 flex justify-end animate-in fade-in duration-200">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => !isPermsSaving && setSelectedUserForPerms(null)}
          ></div>

          {/* Drawer Body */}
          <div className="relative w-full max-w-lg bg-white h-full shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-300">
            {/* Drawer Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-headline text-xl font-extrabold text-slate-900">Yetki Matrisini Düzenle</h3>
                <p className="text-xs text-slate-500 font-body mt-1">
                  <span className="font-bold text-indigo-600">{selectedUserForPerms.full_name}</span> ({
                    selectedUserForPerms.role === 'admin' ? 'Yönetici' : 
                    selectedUserForPerms.role === 'accounting' ? 'Muhasebe' : 
                    selectedUserForPerms.role === 'warehouse' ? 'Depo Personeli' : 
                    selectedUserForPerms.role === 'manager' ? 'Personel / Müdür' : 'Personel'
                  })
                </p>
              </div>
              <button 
                onClick={() => setSelectedUserForPerms(null)}
                disabled={isPermsSaving}
                className="w-10 h-10 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-900 transition-all"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="bg-amber-50 border border-amber-200/50 p-4 rounded-2xl flex items-start gap-3 animate-in fade-in duration-500">
                <span className="material-symbols-outlined text-amber-600 mt-0.5">info</span>
                <p className="text-xs text-amber-800 leading-relaxed font-body">
                  Bu panelden yapacağınız değişiklikler <strong>sadece bu kullanıcıya özel</strong> uygulanacaktır. Diğer ekip üyelerinin yetkilerini etkilemez.
                </p>
              </div>

              {isPermsLoading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-xs text-slate-400 italic">Yetkiler yükleniyor...</span>
                </div>
              ) : (
                <div className="space-y-4">
                  {MODULES.map(module => {
                    const perms = userPermsMatrix[module.id] || { view: false, create: false, edit: false, delete: false };
                    const forceViewOnly = false;

                    return (
                      <div key={module.id} className="bg-slate-50 p-5 rounded-2xl border border-slate-100 hover:shadow-sm transition-all space-y-4">
                        <div className="flex items-center space-x-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                            module.color === 'blue' ? "bg-blue-50 text-blue-600" :
                            module.color === 'indigo' ? "bg-indigo-50 text-indigo-600" :
                            module.color === 'purple' ? "bg-purple-50 text-purple-600" :
                            "bg-emerald-50 text-emerald-600"
                          }`}>
                            <span className="material-symbols-outlined text-lg">{module.icon}</span>
                          </div>
                          <div>
                            <h4 className="font-headline font-bold text-sm text-slate-900">{module.title}</h4>
                            <p className="text-[10px] text-slate-400 font-medium font-label tracking-wide uppercase opacity-70">{module.description}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-4 gap-2 pt-2 border-t border-slate-200/50">
                          {/* Görüntüle */}
                          <div className="flex flex-col items-center justify-center p-2 bg-white rounded-xl border border-slate-100">
                            <span className="text-[9px] font-bold text-slate-400 uppercase mb-2 font-label">Görüntüle</span>
                            <Switch
                              checked={forceViewOnly ? true : perms.view}
                              onChange={() => handleTogglePerm(module.id, 'view')}
                              disabled={forceViewOnly || isPermsSaving}
                            />
                          </div>

                          {/* Ekle */}
                          <div className="flex flex-col items-center justify-center p-2 bg-white rounded-xl border border-slate-100">
                            <span className="text-[9px] font-bold text-slate-400 uppercase mb-2 font-label">Ekle</span>
                            {module.actions.create ? (
                              <Switch
                                checked={perms.create}
                                onChange={() => handleTogglePerm(module.id, 'create')}
                                disabled={isPermsSaving}
                              />
                            ) : (
                              <span className="text-slate-300 text-xs">—</span>
                            )}
                          </div>

                          {/* Düzenle */}
                          <div className="flex flex-col items-center justify-center p-2 bg-white rounded-xl border border-slate-100">
                            <span className="text-[9px] font-bold text-slate-400 uppercase mb-2 font-label">Düzenle</span>
                            {module.actions.edit ? (
                              <Switch
                                checked={perms.edit}
                                onChange={() => handleTogglePerm(module.id, 'edit')}
                                disabled={isPermsSaving}
                              />
                            ) : (
                              <span className="text-slate-300 text-xs">—</span>
                            )}
                          </div>

                          {/* Sil */}
                          <div className="flex flex-col items-center justify-center p-2 bg-white rounded-xl border border-slate-100">
                            <span className="text-[9px] font-bold text-slate-400 uppercase mb-2 font-label">Sil</span>
                            {module.actions.delete ? (
                              <Switch
                                checked={perms.delete}
                                onChange={() => handleTogglePerm(module.id, 'delete')}
                                disabled={isPermsSaving}
                              />
                            ) : (
                              <span className="text-slate-300 text-xs">—</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Drawer Footer */}
            <div className="p-6 border-t border-slate-100 bg-slate-50 flex flex-col gap-2">
              <button 
                onClick={handleSaveUserPerms}
                disabled={isPermsLoading || isPermsSaving}
                className="w-full py-3.5 rounded-xl text-sm font-bold text-white bg-indigo-600 shadow-lg shadow-indigo-100 hover:bg-indigo-700 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed transition-all font-body text-center"
              >
                {isPermsSaving ? "Kaydediliyor..." : "Özel Yetkileri Kaydet"}
              </button>
              <button 
                onClick={handleResetToRoleDefault}
                disabled={isPermsLoading || isPermsSaving}
                className="w-full py-3.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-white hover:text-slate-900 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed transition-all font-body text-center"
              >
                Varsayılan Role Sıfırla
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Switch({ checked, onChange, disabled = false }: { checked: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <div 
      className={`inline-flex items-center relative select-none ${
        disabled ? "cursor-not-allowed opacity-70" : "cursor-pointer"
      }`}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!disabled) onChange();
      }}
      role="switch"
      aria-checked={checked}
      aria-disabled={disabled}
      title={disabled ? "Bu ayar kilitlidir" : undefined}
    >
      <div className={`block w-10 h-5 rounded-full transition-all duration-300 ease-in-out ${
        checked
          ? disabled ? 'bg-indigo-400 shadow-inner' : 'bg-indigo-600 shadow-inner'
          : 'bg-slate-200'
      }`}></div>
      
      <div className={`absolute top-0.5 left-0.5 bg-white w-4 h-4 rounded-full transition-all duration-300 ease-in-out shadow-md transform ${
        checked ? 'translate-x-5 scale-110' : 'translate-x-0 scale-100'
      }`}></div>

      {disabled && (
        <span
          className="absolute -top-1.5 -right-1.5 material-symbols-outlined text-[10px] text-slate-400 font-bold"
          style={{ fontSize: 10 }}
        >lock</span>
      )}
    </div>
  );
}
