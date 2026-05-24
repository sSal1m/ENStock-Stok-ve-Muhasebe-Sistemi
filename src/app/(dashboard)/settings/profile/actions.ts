'use server';

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

export async function getAdminBusinessAddress(adminId: string) {
  if (!adminId) return null;
  try {
    const { data, error } = await supabaseAdmin.auth.admin.getUserById(adminId);
    if (error || !data.user) return null;
    return data.user.user_metadata?.business_address || null;
  } catch (error) {
    console.error("Error fetching admin address:", error);
    return null;
  }
}

export async function uploadAvatarAction(base64Data: string, fileName: string, fileType: string, userId: string) {
  if (!userId || !base64Data) {
    return { success: false, error: "Geçersiz parametreler." };
  }
  
  try {
    // Base64 veriyi Buffer'a dönüştür
    const buffer = Buffer.from(base64Data, 'base64');

    const fileExt = fileName.split('.').pop();
    const uniqueFileName = `${userId}-${Math.round(Math.random() * 1000000)}.${fileExt}`;
    const filePath = `avatars/${uniqueFileName}`;

    // Admin istemcisi ile yükleme (RLS politikalarını atlar)
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from("avatars")
      .upload(filePath, buffer, {
        contentType: fileType,
        upsert: true
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      return { success: false, error: uploadError.message };
    }

    const { data: { publicUrl } } = supabaseAdmin.storage
      .from("avatars")
      .getPublicUrl(filePath);

    // Kullanıcı auth metadata'sını admin API ile güncelleme
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      user_metadata: { avatar_url: publicUrl }
    });

    if (authError) {
      console.error("Auth update error:", authError);
      return { success: false, error: authError.message };
    }

    // Profiles tablosunu güncelleme (varsa)
    try {
      await supabaseAdmin
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", userId);
    } catch (dbErr) {
      console.warn("Profiles database update skipped:", dbErr);
    }

    return { success: true, publicUrl };
  } catch (err: any) {
    console.error("Critical upload action error:", err);
    return { success: false, error: err.message || "Fotoğraf yüklenirken bir hata oluştu." };
  }
}

export async function uploadProductImageAction(base64Data: string, fileName: string, fileType: string, userId: string) {
  if (!userId || !base64Data) {
    return { success: false, error: "Geçersiz parametreler." };
  }
  
  try {
    const buffer = Buffer.from(base64Data, 'base64');
    const fileExt = fileName.split('.').pop();
    const uniqueFileName = `${userId}-${Math.round(Math.random() * 1000000)}.${fileExt}`;
    const filePath = `products/${uniqueFileName}`;

    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from("avatars")
      .upload(filePath, buffer, {
        contentType: fileType,
        upsert: true
      });

    if (uploadError) {
      console.error("Product image storage upload error:", uploadError);
      return { success: false, error: uploadError.message };
    }

    const { data: { publicUrl } } = supabaseAdmin.storage
      .from("avatars")
      .getPublicUrl(filePath);

    return { success: true, publicUrl };
  } catch (err: any) {
    console.error("Critical product image upload action error:", err);
    return { success: false, error: err.message || "Görsel yüklenirken bir hata oluştu." };
  }
}
