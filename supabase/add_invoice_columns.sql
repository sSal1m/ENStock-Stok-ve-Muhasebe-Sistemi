-- ====================================
-- invoices tablosuna eksik sütunları ekle
-- ====================================

-- Para birimi sütunu
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'TRY';

-- Kur değeri sütunu
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC DEFAULT 1;
