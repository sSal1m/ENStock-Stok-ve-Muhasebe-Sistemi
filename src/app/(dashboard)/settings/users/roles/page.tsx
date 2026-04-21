"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";
import toast from "react-hot-toast";

const MODULES = [
  { id: "stock", title: "Stok Yönetimi", description: "Ürün ve Depo Hareketleri", icon: "inventory_2", color: "blue" },
  { id: "contacts", title: "Cari Hesaplar", description: "Müşteri ve Tedarikçi Portföyü", icon: "groups", color: "indigo" },
  { id: "invoices", title: "Faturalar", description: "Alış, Satış ve Gider Faturası", icon: "receipt_long", color: "purple" },
  { id: "reports", title: "Raporlar", description: "Finansal Analiz ve Grafik", icon: "analytics", color: "emerald" },
];

const ROLES = [
  { id: "admin", label: "Admin" },
  { id: "accounting", label: "Muhasebe" },
  { id: "staff", label: "Personel" },
  { id: "sales", label: "Satış" },
];

export default function RolesPermissionsPage() {
  const [activeRoleId, setActiveRoleId] = useState("admin");
  const [matrix, setMatrix] = useState<Record<string, any>>({});
  const [roleCounts, setRoleCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);

  const fetchRoleCounts = async () => {
    try {
      const { data, error } = await supabase.from("profiles").select("role");
      if (error) throw error;
      const counts: Record<string, number> = {};
      data.forEach(p => {
        const r = p.role?.toLowerCase() || 'staff';
        counts[r] = (counts[r] || 0) + 1;
      });
      setRoleCounts(counts);
    } catch (e) {
      console.error("Error fetching counts:", e);
    }
  };

  const loadMatrix = () => {
    const saved = localStorage.getItem("roles_permission_matrix");
    if (saved) {
      try {
        setMatrix(JSON.parse(saved));
      } catch (e) {
        console.error("Matrix load error:", e);
      }
    } else {
      // Default initial matrix
      const initial: Record<string, any> = {};
      ROLES.forEach(r => {
        initial[r.id] = {};
        MODULES.forEach(m => {
          initial[r.id][m.id] = { view: true, create: r.id === 'admin', edit: r.id === 'admin', delete: r.id === 'admin' };
        });
      });
      setMatrix(initial);
    }
  };

  useEffect(() => {
    setIsLoading(true);
    fetchRoleCounts();
    loadMatrix();
    setIsLoading(false);
  }, []);

  const togglePermission = (moduleId: string, permKey: string) => {
    setMatrix(prev => {
      const newMatrix = { ...prev };
      const rolePerms = { ...(newMatrix[activeRoleId] || {}) };
      const modulePerms = { ...(rolePerms[moduleId] || { view: false, create: false, edit: false, delete: false }) };
      
      modulePerms[permKey] = !modulePerms[permKey];
      rolePerms[moduleId] = modulePerms;
      newMatrix[activeRoleId] = rolePerms;
      
      return newMatrix;
    });
  };

  const handleSave = () => {
    localStorage.setItem("roles_permission_matrix", JSON.stringify(matrix));
    toast.success("Yetki matrisi başarıyla kaydedildi.");
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
      toast.success("Rol izinleri sıfırlandı.");
    }
  };

  const activeRolePerms = matrix[activeRoleId] || {};

  return (
    <>
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
                className={`px-6 py-2 transition-all font-body rounded-lg text-sm whitespace-nowrap ${
                  activeRoleId === role.id 
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
                <th className="py-4 px-6 font-label text-[11px] uppercase tracking-widest font-bold opacity-70">Modül Adı</th>
                <th className="py-4 px-6 font-label text-[11px] uppercase tracking-widest font-bold opacity-70 text-center">Görüntüle</th>
                <th className="py-4 px-6 font-label text-[11px] uppercase tracking-widest font-bold opacity-70 text-center">Ekle</th>
                <th className="py-4 px-6 font-label text-[11px] uppercase tracking-widest font-bold opacity-70 text-center">Düzenle</th>
                <th className="py-4 px-6 font-label text-[11px] uppercase tracking-widest font-bold opacity-70 text-center">Sil</th>
                <th className="py-4 px-6 font-label text-[11px] uppercase tracking-widest font-bold opacity-70 text-right">Durum</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50/50">
              {MODULES.map(module => {
                const perms = activeRolePerms[module.id] || { view: false, create: false, edit: false, delete: false };
                const isFullAccess = perms.view && perms.create && perms.edit && perms.delete;
                
                return (
                  <tr key={module.id} className="group hover:bg-slate-50/20 transition-all duration-200">
                    <td className="py-5 px-6 rounded-l-2xl">
                      <div className="flex items-center space-x-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 ${
                          module.color === 'blue' ? "bg-blue-50 text-blue-600" :
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
                    <td className="py-5 px-6 text-center">
                      <Switch checked={perms.view} onChange={() => togglePermission(module.id, 'view')} />
                    </td>
                    <td className="py-5 px-6 text-center">
                      <Switch checked={perms.create} onChange={() => togglePermission(module.id, 'create')} />
                    </td>
                    <td className="py-5 px-6 text-center">
                      <Switch checked={perms.edit} onChange={() => togglePermission(module.id, 'edit')} />
                    </td>
                    <td className="py-5 px-6 text-center">
                      <Switch checked={perms.delete} onChange={() => togglePermission(module.id, 'delete')} />
                    </td>
                    <td className="py-5 px-6 rounded-r-2xl text-right">
                      <span className={`text-[9px] font-bold px-3 py-1.5 rounded-full border transition-all ${
                        isFullAccess 
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
              role.id === 'staff' ? "person" : "point_of_sale"
            }
            label={`${role.label} Kullanıcı`} 
            count={roleCounts[role.id] || 0} 
          />
        ))}
      </div>
    </>
  );
}

function Switch({ checked, onChange }: { checked: boolean, onChange: () => void }) {
  return (
    <div 
      className="inline-flex items-center cursor-pointer relative select-none"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onChange();
      }}
      role="button"
      aria-pressed={checked}
    >
      {/* Switch Background */}
      <div className={`block w-10 h-5 rounded-full transition-all duration-300 ease-in-out ${
        checked ? 'bg-indigo-600 shadow-inner' : 'bg-slate-200'
      }`}></div>
      
      {/* Switch Dot */}
      <div className={`absolute top-0.5 left-0.5 bg-white w-4 h-4 rounded-full transition-all duration-300 ease-in-out shadow-md transform ${
        checked ? 'translate-x-5 scale-110' : 'translate-x-0 scale-100'
      }`}></div>
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
