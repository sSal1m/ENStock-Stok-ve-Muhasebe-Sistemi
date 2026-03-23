# Supabase Kullanım Rehberi (Geliştirici Ekip İçin)

Merhaba ekip! Supabase veritabanı projemize başarıyla bağlandı. Sayfaları (komponentleri) oluştururken veritabanına veri eklemek, veri okumak veya kullanıcı girişi yaptırmak için aşağıdaki adımları ve kod örneklerini kullanabilirsiniz.

## 1. İlk Kurulum (Çok Önemli)
Projeyi ilk defa kendi bilgisayarınıza çektiğinizde:
1. Proje dizininde `.env.local` adında bir dosya oluşturun (veya `.env.local` şablonunu kopyalayın).
2. İçerisine size iletilen/projeye ait Supabase URL ve Anon Key değerlerini yapıştırın:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=gercek_url_buraya
   NEXT_PUBLIC_SUPABASE_ANON_KEY=gercek_anon_key_buraya
   ```
3. Terminalde `npm install` komutunu çalıştırarak paketleri yükleyin.

## 2. Supabase İstemcisini (Client) İçeri Aktarma
Veritabanı işlemleri yapacağınız sayfalara şu kodu ekleyin:
```tsx
import { supabase } from "@/lib/supabaseClient";
// Klasör yapısına göre '../lib/supabaseClient' gibi de yazabilirsiniz.
```

## 3. Örnek Kullanımlar

### 3.1. Tablodan Veri Çekme (Select)
Örneğin `stoklar` tablosundan verileri çekip sayfada listelemek:
```tsx
"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function StokListesi() {
  const [stoklar, setStoklar] = useState([]);

  useEffect(() => {
    const fetchStok = async () => {
      // "stoklar" yerine kendi oluşturduğunuz tablonun adını yazın.
      const { data, error } = await supabase.from("stoklar").select("*");
      if (error) {
        console.error("Hata:", error);
      } else {
        setStoklar(data || []);
      }
    };
    fetchStok();
  }, []);

  return (
    <ul>
      {stoklar.map(item => <li key={item.id}>{item.isim}</li>)}
    </ul>
  );
}
```

### 3.2. Tabloya Veri Ekleme (Insert)
```tsx
const veriEkle = async () => {
  const { data, error } = await supabase
    .from("stoklar")
    .insert([{ isim: "Yeni Ürün", miktar: 10 }]);

  if (error) console.error("Ekleme hatası:", error);
  else console.log("Başarıyla eklendi!", data);
};
```

Çalışmalarınızda kolaylıklar dilerim!
