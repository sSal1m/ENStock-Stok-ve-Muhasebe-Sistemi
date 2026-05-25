'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { toast } from 'sonner';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { validateInvitation, activateAccount } from '@/app/(auth)/actions';

const formSchema = z.object({
  password: z.string().min(8, 'Şifre en az 8 karakter olmalıdır'),
  confirmPassword: z.string().min(8, 'Şifre onayı en az 8 karakter olmalıdır'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Şifreler eşleşmiyor",
  path: ["confirmPassword"],
});

function ActivateAccountForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isVerifying, setIsVerifying] = useState(true);
  const [isValid, setIsValid] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const email = searchParams.get('email');
  const code = searchParams.get('code');
  const supabase = createClientComponentClient();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  useEffect(() => {
    async function verify() {
      if (!email || !code) {
        toast.error('Geçersiz aktivasyon bağlantısı');
        setIsVerifying(false);
        return;
      }

      try {
        const result = await validateInvitation(email, code);
        if (result.success) {
          setIsValid(true);
        } else {
          toast.error(result.error || 'Davetiye doğrulanırken bir hata oluştu');
        }
      } catch (error) {
        toast.error('Bir hata oluştu');
      } finally {
        setIsVerifying(false);
      }
    }

    verify();
  }, [email, code]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!email || !code) return;
    
    setIsSubmitting(true);
    try {
      const result = await activateAccount(email, code, values.password);
      
      if (result.success) {
        toast.success('Hesabınız başarıyla aktifleştirildi. Giriş yapılıyor...');
        
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password: values.password,
        });

        if (signInError) {
          toast.error('Giriş yapılırken bir hata oluştu. Lütfen manuel giriş yapın.');
          router.push('/login');
        } else {
          router.push('/dashboard');
        }
      } else {
        toast.error(result.error || 'Hesap aktifleştirilemedi');
      }
    } catch (error) {
      toast.error('Bir hata oluştu');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isVerifying) {
    return <div className="flex justify-center p-8">Doğrulanıyor...</div>;
  }

  if (!isValid) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Geçersiz Bağlantı</CardTitle>
          <CardDescription>
            Bu aktivasyon bağlantısı geçersiz veya süresi dolmuş olabilir.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Hesabınızı Aktifleştirin</CardTitle>
        <CardDescription>
          {email} adresi için şifrenizi belirleyerek hesabınızı aktifleştirin.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Yeni Şifre</FormLabel>
                  <FormControl>
                    <Input type="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Şifre Tekrar</FormLabel>
                  <FormControl>
                    <Input type="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Aktifleştiriliyor...' : 'Hesabı Aktifleştir'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

export default function ActivateAccountPage() {
  return (
    <div className="container flex items-center justify-center min-h-screen py-10">
      <Suspense fallback={<div className="flex justify-center p-8">Yükleniyor...</div>}>
        <ActivateAccountForm />
      </Suspense>
    </div>
  );
}
