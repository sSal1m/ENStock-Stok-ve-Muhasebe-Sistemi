-- ═══════════════════════════════════════════════════════════════════
-- Invoice TRY karşılıkları
--
-- Amaç: invoices.total_amount, subtotal, tax_total faturanın kendi para
-- biriminde saklanıyor (currency + exchange_rate ile birlikte). Dashboard,
-- raporlar ve liste sayfalarındaki agregasyonların doğru çalışması için
-- TRY karşılıklarını da kalıcı olarak tutuyoruz. Bu sayede:
--   - SUM(total_amount_try) gibi sorgular currency-blind olmaz
--   - Her listede convertFull yapmak yerine doğrudan TRY okunup view'a
--     çevrilir (daha hızlı)
--
-- GÜVENLİK:
--   - Sadece YENİ kolon eklenir, hiçbir mevcut kolona dokunulmaz
--   - Backfill UPDATE'i mevcut total_amount × exchange_rate ile doldurur;
--     yanlış sonuçlanırsa tekrar çalıştırılabilir (idempotent)
--   - Geri alma: ALTER TABLE invoices DROP COLUMN total_amount_try, ...
-- ═══════════════════════════════════════════════════════════════════

-- 1. Kolonları ekle (idempotent)
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS total_amount_try NUMERIC,
  ADD COLUMN IF NOT EXISTS subtotal_try     NUMERIC,
  ADD COLUMN IF NOT EXISTS tax_total_try    NUMERIC;

-- 2. Backfill: mevcut tüm faturalar için TRY karşılığını hesapla.
--    exchange_rate "1 invoice_currency = X TRY" formatında saklanır
--    (createInvoiceAction içinde rates[currency].selling olarak).
--    TRY faturada exchange_rate = 1 olduğundan total_amount_try = total_amount.
UPDATE public.invoices
SET
  total_amount_try = COALESCE(total_amount, 0) * COALESCE(exchange_rate, 1),
  subtotal_try     = COALESCE(subtotal, 0)     * COALESCE(exchange_rate, 1),
  tax_total_try    = COALESCE(tax_total, 0)    * COALESCE(exchange_rate, 1)
WHERE total_amount_try IS NULL
   OR subtotal_try IS NULL
   OR tax_total_try IS NULL;

-- 3. Performans için (raporlama agregasyonları)
CREATE INDEX IF NOT EXISTS idx_invoices_total_amount_try
  ON public.invoices (total_amount_try)
  WHERE deleted_at IS NULL;

-- ═══════════════════════════════════════════════════════════════════
-- Dry-run kontrolü (önce bunu çalıştırın):
--
-- SELECT id, invoice_number, currency, exchange_rate,
--        total_amount,
--        total_amount * COALESCE(exchange_rate, 1) AS yeni_total_try
-- FROM invoices
-- ORDER BY created_at DESC
-- LIMIT 20;
--
-- Geri alma (sorun olursa):
--
-- ALTER TABLE public.invoices
--   DROP COLUMN IF EXISTS total_amount_try,
--   DROP COLUMN IF EXISTS subtotal_try,
--   DROP COLUMN IF EXISTS tax_total_try;
-- ═══════════════════════════════════════════════════════════════════
