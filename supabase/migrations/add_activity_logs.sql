-- ═══════════════════════════════════════════════════════════════════
-- Activity Logs: Tüm CRUD işlemlerini (kim, ne zaman, hangi modülde, hangi kayıt)
-- merkezi olarak tutar. Dashboard üzerinde izlenir.
-- Bu tablo, modüle özel inventory_logs ve contact_logs tablolarından
-- bağımsız olarak yüksek seviyeli denetim izi (audit trail) sağlar.
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.activity_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email    TEXT,
  user_name     TEXT,
  company_name  TEXT,
  module        TEXT NOT NULL CHECK (module IN ('product', 'contact', 'invoice')),
  action        TEXT NOT NULL CHECK (action IN (
    'create', 'update', 'delete', 'restore', 'permanent_delete',
    'stock_adjust', 'balance_change'
  )),
  entity_id     UUID,
  entity_name   TEXT,
  description   TEXT,
  metadata      JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Sorgu performansı için indeksler
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id     ON public.activity_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_company     ON public.activity_logs (company_name);
CREATE INDEX IF NOT EXISTS idx_activity_logs_module      ON public.activity_logs (module);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at  ON public.activity_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity      ON public.activity_logs (entity_id);

-- RLS: Kullanıcı yalnızca kendi şirketinin loglarını görebilir.
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "activity_logs_select_same_company" ON public.activity_logs;
CREATE POLICY "activity_logs_select_same_company"
  ON public.activity_logs FOR SELECT
  USING (
    company_name IS NOT NULL AND company_name IN (
      SELECT company_name FROM public.profiles WHERE id = auth.uid()
    )
    OR user_id = auth.uid()
  );

-- INSERT/UPDATE/DELETE yalnızca service role'dan yapılır (server action).
-- Kullanıcılar doğrudan yazamaz.
DROP POLICY IF EXISTS "activity_logs_no_user_writes" ON public.activity_logs;
CREATE POLICY "activity_logs_no_user_writes"
  ON public.activity_logs FOR ALL
  USING (false)
  WITH CHECK (false);
