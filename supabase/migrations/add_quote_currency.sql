-- ═══════════════════════════════════════════════════════════════════
-- Quotes Currency Support
--
-- Amaç: Teklifler de tıpkı faturalar gibi farklı para birimlerinde
-- kesilebilsin. Şu an quotes tablosunda currency yok, her şey TRY
-- varsayılıyor. Bu migration teklifi multi-currency yapar.
--
-- GÜVENLİK:
--   - Sadece YENİ kolon eklenir (additive)
--   - Default 'TRY' / 1 ile mevcut satırlar otomatik dolar
--   - Geri alma: ALTER TABLE quotes DROP COLUMN currency, exchange_rate
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'TRY',
  ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC NOT NULL DEFAULT 1;

ALTER TABLE public.quotes
  DROP CONSTRAINT IF EXISTS quotes_currency_check;

ALTER TABLE public.quotes
  ADD CONSTRAINT quotes_currency_check
  CHECK (currency IN ('TRY', 'USD', 'EUR', 'GBP'));

-- ═══════════════════════════════════════════════════════════════════
-- Geri alma (sorun olursa):
--
-- ALTER TABLE public.quotes
--   DROP CONSTRAINT IF EXISTS quotes_currency_check,
--   DROP COLUMN IF EXISTS currency,
--   DROP COLUMN IF EXISTS exchange_rate;
-- ═══════════════════════════════════════════════════════════════════
