-- ═══════════════════════════════════════════════════════════════════
-- Default Currency: İşletmenin "Finansal Yapılandırma" altında
-- seçtiği varsayılan para birimi profiles tablosuna kaydedilir.
-- Tüm sayfalardaki initial view currency ve form default'ları
-- buradan beslenir. Kullanıcı sayfa bazlı override yaptığında
-- localStorage öncelikli olur.
--
-- Notlar:
--   - DEFAULT 'TRY' verildiği için mevcut satırlar otomatik 'TRY' olur,
--     NOT NULL constraint'i ihlal edilmez.
--   - CHECK ayrı ALTER ile eklenir; eski PG sürümlerinde inline CHECK
--     bazen sorun çıkarabiliyor.
--   - IF NOT EXISTS / IF EXISTS pattern'leri ile script tekrar
--     çalıştırılabilir (idempotent).
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS default_currency TEXT NOT NULL DEFAULT 'TRY';

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_default_currency_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_default_currency_check
  CHECK (default_currency IN ('TRY', 'USD', 'EUR', 'GBP'));
