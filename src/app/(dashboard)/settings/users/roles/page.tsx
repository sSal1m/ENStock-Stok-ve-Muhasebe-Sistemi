"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";
import toast, { Toaster } from "react-hot-toast";
import { updateRolePermissionAction } from "./actions";


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
    id: "quotes",
    title: "Teklifler",
    description: "Teklif ve Fiyatlandırma Yönetimi",
    icon: "description",
    color: "amber",
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
    actions: { view: true, create: false, edit: false, delete: false },
  },
];

const ROLES = [
  { id: "admin", label: "Yönetici" },
  { id: "accounting", label: "Muhasebe" },
  { id: "warehouse", label: "Depo Personeli" },
  { id: "manager", label: "Personel" },
];

export default function RolesPermissionsPage() {
  const [activeRoleId, setActiveRoleId] = useState("admin");
  const [matrix, setMatrix] = useState<Record<string, any>>({});
  const [roleCounts, setRoleCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);

  const fetchRoleCounts = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      const { fetchTeamScopedData } = await import("@/app/(dashboard)/teamActions");
      const { data } = await fetchTeamScopedData(authUser.id, "profiles", "role", {
        excludeDeleted: false,
        teamFilterColumn: "id"
      });

      const counts: Record<string, number> = {};
      (data || []).forEach(p => {
        // Fallback to warehouse or manager if needed, but usually it matches ROLES exactly
        let r = p.role?.toLowerCase() || 'warehouse'; 
        if (r === 'sales' || r === 'staff') r = 'manager';
        counts[r] = (counts[r] || 0) + 1;
      });
      setRoleCounts(counts);
    } catch (e: any) {
      console.error("Error fetching role counts detail:", e);
    }
  };

  const loadMatrix = async () => {
    try {
      const { data, error } = await supabase.from("role_permissions").select("*");
      if (error) throw error;

      if (data && data.length > 0) {
        const newMatrix: Record<string, any> = {};
        // Initialize with default empty structures for all roles
        ROLES.forEach(r => {
          newMatrix[r.id] = {};
          MODULES.forEach(m => {
            newMatrix[r.id][m.id] = { view: false, create: false, edit: false, delete: false };
          });
        });

        // Fill with DB data
        data.forEach(p => {
          if (newMatrix[p.role]) {
            newMatrix[p.role][p.module] = {
              view: p.can_view,
              create: p.can_create,
              edit: p.can_edit,
              delete: p.can_delete
            };
          }
        });
        setMatrix(newMatrix);
      } else {
        // Default initial matrix if DB is empty
        const initial: Record<string, any> = {};
        ROLES.forEach(r => {
          initial[r.id] = {};
          MODULES.forEach(m => {
            let canView = false;
            let canAll = false;

            if (r.id === 'admin') {
              canView = true;
              canAll = true;
            } else if (r.id === 'accounting') {
              if (['invoices', 'reports', 'contacts', 'quotes'].includes(m.id)) {
                canView = true;
                canAll = true;
              }
            } else if (r.id === 'warehouse') {
              if (m.id === 'stock') {
                canView = true;
                canAll = true;
              }
            } else if (r.id === 'manager') {
              if (['stock', 'contacts', 'invoices', 'quotes'].includes(m.id)) {
                canView = true;
                // Manager can create/edit but not delete usually
                if (m.id !== 'reports') canAll = true;
              }
            }

            initial[r.id][m.id] = {
              view: canView,
              create: canAll,
              edit: canAll,
              delete: r.id === 'admin' // Only admin deletes by default
            };
          });
        });
        setMatrix(initial);
      }
    } catch (e) {
      console.error("Matrix load error:", e);
      toast.error("Yetkiler yüklenirken bir hata oluştu.");
    }
  };

  useEffect(() => {
    async function init() {
      setIsLoading(true);
      await Promise.all([fetchRoleCounts(), loadMatrix()]);
      setIsLoading(false);
    }
    init();
  }, []);

  const togglePermission = async (moduleId: string, permKey: 'view' | 'create' | 'edit' | 'delete') => {
    // 1. Optimistic UI - Ekranda anında değişsin
    const previousMatrix = { ...matrix };
    let newPerms: any = {};

    setMatrix(prev => {
      const newMatrix = { ...prev };
      const rolePerms = { ...(newMatrix[activeRoleId] || {}) };
      const modulePerms = { ...(rolePerms[moduleId] || { view: false, create: false, edit: false, delete: false }) };

      const newValue = !modulePerms[permKey];
      modulePerms[permKey] = newValue;

      // "Görüntüle" kapatılırsa diğer yetkiler de kapatılsın
      if (permKey === 'view' && !newValue && moduleId !== 'reports') {
        modulePerms.create = false;
        modulePerms.edit = false;
        modulePerms.delete = false;
      }

      newPerms = { ...modulePerms }; // Sunucuya göndermek için kopyala

      rolePerms[moduleId] = modulePerms;
      newMatrix[activeRoleId] = rolePerms;
      return newMatrix;
    });

    // 2. Server Action ile veritabanına anında yaz (Auto-Save)
    const result = await updateRolePermissionAction(activeRoleId, moduleId, {
      can_view: newPerms.view,
      can_create: newPerms.create,
      can_edit: newPerms.edit,
      can_delete: newPerms.delete
    });

    if (!result.success) {
      toast.error(result.error || "Yetki güncellenirken hata oluştu.");
      // Hata olursa UI'ı eski haline döndür
      setMatrix(previousMatrix);
    }
  };

  const handleSave = async () => {
    const toastId = toast.loading("Yetkiler kaydediliyor...");
    try {
      const upsertData: any[] = [];

      Object.entries(matrix).forEach(([role, modules]) => {
        Object.entries(modules as any).forEach(([module, perms]: [string, any]) => {
          upsertData.push({
            role,
            module,
            can_view: perms.view,
            can_create: perms.create,
            can_edit: perms.edit,
            can_delete: perms.delete
          });
        });
      });

      const { error } = await supabase
        .from("role_permissions")
        .upsert(upsertData, { onConflict: 'role,module' });

      if (error) throw error;

      toast.success("Yetki matrisi veritabanına başarıyla kaydedildi.", { id: toastId });
    } catch (e: any) {
      console.error("Save error full details:", e);
      let errorMsg = e.message || "Bilinmeyen bir hata oluştu.";

      if (e.code === 'PGRST116' || e.message?.includes('relation "role_permissions" does not exist')) {
        errorMsg = "Veritabanında 'role_permissions' tablosu bulunamadı. Lütfen SQL kodunu çalıştırın.";
      }

      toast.error("Hata: " + errorMsg, { id: toastId, duration: 5000 });
    }
  };

  const handleReset = () => {
    if (confirm("Bu rolün yetkilerini varsayılan değerlere sıfırlamak istiyor musunuz?")) {
      setMatrix(prev => {
        const newMatrix = { ...prev };
        newMatrix[activeRoleId] = {};
        MODULES.forEach(m => {
          newMatrix[activeRoleId][m.id] = { view: true, create: activeRoleId === 'admin', edit: activeRoleId === 'admin', delete: activeRoleId === 'admin' };
        });
        return newMatrix;
      });
      toast.success("Rol izinleri sıfırlandı. Kaydetmeyi unutmayın.");
    }
  };

  const activeRolePerms = matrix[activeRoleId] || {};

  return (
    <>
      <Toaster position="top-right" />
      {/* Header Section with Bento Elements */}
      <div className="grid grid-cols-12 gap-6 mb-8">
        <div className="col-span-12 lg:col-span-8 bg-surface-container-low p-8 rounded-3xl relative overflow-hidden">
          <div className="relative z-10">
            <h3 className="font-headline text-3xl font-extrabold text-on-surface mb-2 tracking-tight">Erişim Kontrolü</h3>
            <p className="text-on-surface-variant max-w-md font-body">Kullanıcı rollerini ve bu rollere bağlı modül bazlı yetkileri buradan yönetebilirsiniz. Güvenlik için yetkileri periyodik olarak kontrol edin.</p>
          </div>
          <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none">
            <span className="material-symbols-outlined text-[160px]" style={{ fontVariationSettings: "'FILL' 1" }}>admin_panel_settings</span>
          </div>
        </div>
        <div className="col-span-12 lg:col-span-4 bg-primary rounded-3xl p-8 text-white flex flex-col justify-between shadow-xl shadow-indigo-100">
          <div className="flex justify-between items-start">
            <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md">
              <span className="material-symbols-outlined text-3xl">verified_user</span>
            </div>
            <span className="text-xs font-bold tracking-widest uppercase bg-white/10 px-3 py-1 rounded-full font-label">Güvenli</span>
          </div>
          <div>
            <div className="text-4xl font-headline font-black mb-1">{isLoading ? "..." : ROLES.length} Aktif</div>
            <div className="text-sm opacity-80 font-medium uppercase tracking-wider font-label tracking-widest">Kullanıcı Rolü Tanımlı</div>
          </div>
        </div>
      </div>

      {/* Role Permissions Table */}
      <div className="bg-surface-container-low rounded-3xl overflow-hidden shadow-sm">
        {/* Table Header Controls */}
        <div className="p-6 bg-surface-container flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <div className="w-1 h-8 bg-primary rounded-full"></div>
            <h4 className="font-headline font-bold text-lg px-2 text-on-surface">Yetki Matrisi</h4>
          </div>
          <div className="flex items-center bg-surface-container-lowest p-1 rounded-xl shadow-sm overflow-x-auto max-w-full">
            {ROLES.map(role => (
              <button
                key={role.id}
                onClick={() => setActiveRoleId(role.id)}
                className={`px-6 py-2 transition-all font-body rounded-lg text-sm whitespace-nowrap ${activeRoleId === role.id
                  ? "bg-primary text-white font-bold shadow-md"
                  : "text-slate-500 font-semibold hover:bg-slate-50"
                  }`}
              >
                {role.label}
              </button>
            ))}
          </div>
        </div>

        {/* Permission Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-separate border-spacing-y-4 px-6 font-body">
            <thead>
              <tr className="text-on-surface-variant">
                <th className="py-4 px-6 font-label text-[11px] uppercase tracking-widest font-bold opacity-70">Modul Adı</th>
                <th className="py-4 px-6 font-label text-[11px] uppercase tracking-widest font-bold opacity-70 text-center">Görüntüle</th>
                {/* Ekleme: en az bir modülün create aksiyonu varsa sütunu göster */}
                {MODULES.some(m => m.actions.create) && (
                  <th className="py-4 px-6 font-label text-[11px] uppercase tracking-widest font-bold opacity-70 text-center">Ekle</th>
                )}
                {/* Düzenleme: en az bir modülün edit aksiyonu varsa sütunu göster */}
                {MODULES.some(m => m.actions.edit) && (
                  <th className="py-4 px-6 font-label text-[11px] uppercase tracking-widest font-bold opacity-70 text-center">Düzenleme</th>
                )}
                {/* Silme: en az bir modülün delete aksiyonu varsa sütunu göster */}
                {MODULES.some(m => m.actions.delete) && (
                  <th className="py-4 px-6 font-label text-[11px] uppercase tracking-widest font-bold opacity-70 text-center">Sil</th>
                )}
                <th className="py-4 px-6 font-label text-[11px] uppercase tracking-widest font-bold opacity-70 text-right">Durum</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50/50">
              {MODULES.map(module => {
                const perms = activeRolePerms[module.id] || { view: false, create: false, edit: false, delete: false };
                const forceViewOnly = false;
                // Kural gereği "tam erişim" badge'i: sadece müvcut aksiyonlar değerlendirilir
                const availableActions = (Object.keys(module.actions) as Array<keyof typeof module.actions>)
                  .filter(k => module.actions[k]);
                const isFullAccess = availableActions.every(k => perms[k]);

                return (
                  <tr key={module.id} className="group hover:bg-slate-50/20 transition-all duration-200">
                    <td className="py-5 px-6 rounded-l-2xl">
                      <div className="flex items-center space-x-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 ${module.color === 'blue' ? "bg-blue-50 text-blue-600" :
                          module.color === 'indigo' ? "bg-indigo-50 text-indigo-600" :
                            module.color === 'purple' ? "bg-purple-50 text-purple-600" :
                              "bg-emerald-50 text-emerald-600"
                          }`}>
                          <span className="material-symbols-outlined text-xl">{module.icon}</span>
                        </div>
                        <div>
                          <div className="font-headline font-bold text-on-surface">{module.title}</div>
                          <div className="text-[11px] text-on-surface-variant font-medium font-label tracking-wide uppercase opacity-70">{module.description}</div>
                        </div>
                      </div>
                    </td>

                    {/* Görüntüleme — her modülün var */}
                    <td className="py-5 px-6 text-center">
                      <Switch
                        checked={forceViewOnly ? true : perms.view}
                        onChange={() => togglePermission(module.id, 'view')}
                        disabled={forceViewOnly}
                      />
                    </td>

                    {/* Ekleme — modül kuralına göre hücre gösterilir ya da boş kalır */}
                    {MODULES.some(m => m.actions.create) && (
                      <td className="py-5 px-6 text-center">
                        {module.actions.create ? (
                          <Switch
                            checked={perms.create}
                            onChange={() => togglePermission(module.id, 'create')}
                            disabled={!perms.view}
                          />
                        ) : (
                          <span className="text-slate-200 text-lg select-none" title="Bu modül için mevcut değil">—</span>
                        )}
                      </td>
                    )}

                    {/* Düzenleme — modül kuralına göre hücre gösterilir ya da boş kalır */}
                    {MODULES.some(m => m.actions.edit) && (
                      <td className="py-5 px-6 text-center">
                        {module.actions.edit ? (
                          <Switch
                            checked={perms.edit}
                            onChange={() => togglePermission(module.id, 'edit')}
                            disabled={!perms.view}
                          />
                        ) : (
                          <span className="text-slate-200 text-lg select-none" title="Bu modül için mevcut değil">—</span>
                        )}
                      </td>
                    )}

                    {/* Silme — modül kuralına göre hücre gösterilir ya da boş kalır */}
                    {MODULES.some(m => m.actions.delete) && (
                      <td className="py-5 px-6 text-center">
                        {module.actions.delete ? (
                          <Switch
                            checked={perms.delete}
                            onChange={() => togglePermission(module.id, 'delete')}
                            disabled={!perms.view}
                          />
                        ) : (
                          <span className="text-slate-200 text-lg select-none" title="Bu modül için mevcut değil">—</span>
                        )}
                      </td>
                    )}

                    <td className="py-5 px-6 rounded-r-2xl text-right">
                      <span className={`text-[9px] font-bold px-3 py-1.5 rounded-full border transition-all ${isFullAccess
                        ? "bg-tertiary-container/10 text-on-tertiary-fixed-variant border-tertiary-container/20 tracking-widest"
                        : "bg-slate-100 text-slate-500 border-slate-200 tracking-tighter"
                        }`}>
                        {isFullAccess ? "TAM ERİŞİM" : "KISITLI"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        <div className="p-8 border-t border-outline-variant/10 flex justify-end space-x-4 bg-surface-container-low/50">
          <button
            onClick={handleReset}
            className="px-8 py-3 rounded-xl text-sm font-semibold text-on-surface hover:bg-white transition-all font-body active:scale-95"
          >
            Sıfırla
          </button>
          <button
            onClick={handleSave}
            className="px-10 py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-br from-primary to-primary-container shadow-lg shadow-indigo-200 active:scale-95 transition-all font-body hover:opacity-95"
          >
            Değişiklikleri Kaydet
          </button>
        </div>
      </div>

      {/* Role Summary Cards (Bento Style) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-12 pb-12">
        {ROLES.map(role => (
          <SummaryCard
            key={role.id}
            icon={
              role.id === 'admin' ? "manage_accounts" :
                role.id === 'accounting' ? "payments" :
                  role.id === 'warehouse' ? "inventory_2" : "supervisor_account"
            }
            label={`${role.label} Kullanıcı`}
            count={roleCounts[role.id] || 0}
          />
        ))}
      </div>
    </>
  );
}

function Switch({ checked, onChange, disabled = false }: { checked: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <div
      className={`inline-flex items-center relative select-none ${disabled ? "cursor-not-allowed opacity-70" : "cursor-pointer"
        }`}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!disabled) onChange();
      }}
      role="switch"
      aria-checked={checked}
      aria-disabled={disabled}
      title={disabled ? "Bu ayar şimdilik kilitlidir" : undefined}
    >
      {/* Switch Background */}
      <div className={`block w-10 h-5 rounded-full transition-all duration-300 ease-in-out ${checked
        ? disabled ? 'bg-indigo-400 shadow-inner' : 'bg-indigo-600 shadow-inner'
        : 'bg-slate-200'
        }`}></div>

      {/* Switch Dot */}
      <div className={`absolute top-0.5 left-0.5 bg-white w-4 h-4 rounded-full transition-all duration-300 ease-in-out shadow-md transform ${checked ? 'translate-x-5 scale-110' : 'translate-x-0 scale-100'
        }`}></div>

      {/* Kilit ikonu — disabled ise */}
      {disabled && (
        <span
          className="absolute -top-1.5 -right-1.5 material-symbols-outlined text-[10px] text-slate-400"
          style={{ fontSize: 10 }}
        >lock</span>
      )}
    </div>
  );
}

function SummaryCard({ icon, label, count }: { icon: string, label: string, count: number }) {
  return (
    <div className="bg-surface-container-lowest p-6 rounded-3xl shadow-sm border border-outline-variant/5 flex items-center space-x-4 transition-all hover:shadow-md hover:scale-[1.02]">
      <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-primary">
        <span className="material-symbols-outlined text-2xl">{icon}</span>
      </div>
      <div>
        <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold font-label">{label}</div>
        <div className="text-xl font-headline font-extrabold text-slate-900">{count.toString().padStart(2, '0')}</div>
      </div>
    </div>
  );
}
