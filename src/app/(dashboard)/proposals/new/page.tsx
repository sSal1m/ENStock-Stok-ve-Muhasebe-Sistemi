"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import CreateInvoiceForm from "@/components/invoices/CreateInvoiceForm";
import { useSearchParams } from "next/navigation";

interface ProposalData {
  id: string;
  invoice_number: string;
  contact_id: string;
  type: "sales" | "purchase";
  issue_date: string;
  notes?: string;
  line_items?: any[];
  currency?: string;
}

export default function NewProposalPage() {
  const searchParams = useSearchParams();
  const proposalId = searchParams.get("id");
  const [initialData, setInitialData] = useState<ProposalData | undefined>();
  const [loading, setLoading] = useState(!!proposalId);
  const [userId, setUserId] = useState<string>("");

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }

      if (proposalId) {
        const { data: proposal, error } = await supabase
          .from("invoices")
          .select("*")
          .eq("id", proposalId)
          .eq("type", "proposal")
          .single();

        if (proposal) {
          // Fetch line items
          const { data: items } = await supabase
            .from("invoice_items")
            .select("product_id, quantity, unit_price, vat_rate")
            .eq("invoice_id", proposalId);

          setInitialData({
            id: proposal.id,
            invoice_number: proposal.invoice_number,
            contact_id: proposal.contact_id,
            type: proposal.type === "sale" ? "sales" : "purchase",
            issue_date: proposal.issue_date,
            notes: proposal.notes,
            line_items: items || [],
            currency: proposal.currency,
          });
        }
        setLoading(false);
      }
    };

    init();
  }, [proposalId]);

  if (!userId) return <div>Yükleniyor...</div>;
  if (proposalId && loading) return <div>Teklif yükleniyor...</div>;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-extrabold text-slate-900">
          {proposalId ? "Teklifi Düzenle" : "Yeni Teklif Oluştur"}
        </h1>
        <p className="text-slate-600 mt-1">
          {proposalId ? "Teklif detaylarını güncelleyin" : "Müşteri veya tedarikçiye sunacağınız yeni bir teklif oluşturun"}
        </p>
      </div>
      <CreateInvoiceForm userId={userId} initialData={initialData} forceProposalMode={true} />
    </div>
  );
}
