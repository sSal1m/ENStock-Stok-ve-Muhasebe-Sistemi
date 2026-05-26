'use client';

import {
  useState,
  useRef,
  useCallback,
  type ChangeEvent,
  type ClipboardEvent,
  type KeyboardEvent,
  type FormEvent,
} from 'react';
import { useRouter } from 'next/navigation';
import toast, { Toaster } from 'react-hot-toast';
import Link from 'next/link';
import { registerInvitedUserAction } from '../actions';

// ─── OTP input helper ────────────────────────────────────────────────────────

function OtpInputs({
  otp,
  onChange,
  onKeyDown,
  onPaste,
  inputRefs,
  disabled,
}: {
  otp: string[];
  onChange: (index: number, value: string) => void;
  onKeyDown: (index: number, e: KeyboardEvent<HTMLInputElement>) => void;
  onPaste: (index: number, e: ClipboardEvent<HTMLInputElement>) => void;
  inputRefs: React.MutableRefObject<(HTMLInputElement | null)[]>;
  disabled: boolean;
}) {
  return (
    <div className="flex justify-center gap-3">
      {otp.map((digit, i) => (
        <input
          key={i}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digit}
          disabled={disabled}
          onChange={(e) => onChange(i, e.target.value)}
          onKeyDown={(e) => onKeyDown(i, e)}
          onPaste={(e) => onPaste(i, e)}
          ref={(el) => {
            inputRefs.current[i] = el;
          }}
          className="w-12 h-14 text-center text-xl font-headline font-bold rounded-lg border-2 transition-all duration-200 bg-surface-container-low border-outline outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
        />
      ))}
    </div>
  );
}

// ─── Client Form ─────────────────────────────────────────────────────────────

export default function InviteRegisterForm({ emailFromUrl }: { emailFromUrl: string }) {
  const router = useRouter();

  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{
    fullName?: string;
    password?: string;
    otp?: string;
  }>({});

  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // OTP handlers
  const handleOtpChange = useCallback((index: number, value: string) => {
    if (value && !/^[0-9]$/.test(value)) return;
    setOtp((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
  }, []);

  const handleOtpKeyDown = useCallback(
    (index: number, e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Backspace' && !otp[index] && index > 0) {
        otpRefs.current[index - 1]?.focus();
      }
    },
    [otp],
  );

  const handleOtpPaste = useCallback((index: number, e: ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '');
    if (!pasted) return;
    e.preventDefault();
    const chars = pasted.slice(0, 6).split('');
    setOtp((prev) => {
      const next = [...prev];
      chars.forEach((ch, i) => {
        if (index + i < 6) next[index + i] = ch;
      });
      return next;
    });
    const nextFocus = Math.min(index + chars.length, 5);
    otpRefs.current[nextFocus]?.focus();
  }, []);

  // Form submit
  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();

      const errors: typeof fieldErrors = {};
      if (!fullName.trim()) errors.fullName = 'Ad Soyad gereklidir.';
      if (!password || password.length < 6) errors.password = 'Şifre en az 6 karakter olmalıdır.';
      const otpCode = otp.join('');
      if (otpCode.length !== 6) errors.otp = 'Lütfen 6 haneli kodu eksiksiz girin.';

      if (Object.keys(errors).length) {
        setFieldErrors(errors);
        return;
      }
      setFieldErrors({});

      if (!emailFromUrl) {
        toast.error('Geçersiz davet bağlantısı — e-posta adresi eksik.');
        return;
      }

      setIsLoading(true);
      try {
        const result = await registerInvitedUserAction(emailFromUrl, fullName, password, otpCode);
        if (!result.success) {
          toast.error(result.error ?? 'Kayıt başarısız.');
        } else {
          toast.success('Hesabınız oluşturuldu! Yönlendiriliyorsunuz…');
          setTimeout(() => router.push('/login'), 1500);
        }
      } catch {
        toast.error('Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.');
      } finally {
        setIsLoading(false);
      }
    },
    [emailFromUrl, fullName, otp, password, router],
  );

  return (
    <div className="bg-surface font-body text-on-surface antialiased min-h-screen flex">
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: { borderRadius: '12px', fontFamily: 'inherit', fontSize: '14px' },
        }}
      />

      {/* ── Sol dekoratif panel ── */}
      <section className="hidden md:flex md:w-[40%] signature-gradient relative overflow-hidden flex-col justify-between p-12 text-on-primary-container">
        <div className="relative z-10 text-2xl font-headline font-extrabold tracking-tight flex items-center gap-2">
          <div className="w-6 h-6 rounded-md overflow-hidden flex items-center justify-center bg-white shadow-sm">
            <img src="/favicon.png" alt="ENStock" className="w-full h-full object-cover" />
          </div>
          ENStock
        </div>

        <div className="relative z-10 space-y-6">
          <h1 className="text-5xl font-headline font-extrabold leading-tight">
            Takıma Katılın.<br />Hemen Başlayın.
          </h1>
          <p className="text-lg font-medium opacity-90 max-w-sm">
            Yöneticiniz sizi davet etti. Hesabınızı oluşturun ve ekiple çalışmaya başlayın.
          </p>

          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-5 border border-white/20 space-y-3">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-3xl">mail</span>
              <div>
                <p className="text-xs uppercase tracking-widest opacity-70 font-bold">Davet edilen</p>
                <p className="font-bold truncate max-w-[200px]">{emailFromUrl || '—'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-3xl">key</span>
              <div>
                <p className="text-xs uppercase tracking-widest opacity-70 font-bold">OTP Kodu</p>
                <p className="font-bold">Mailinizi kontrol edin</p>
              </div>
            </div>
          </div>
        </div>

        <p className="relative z-10 text-sm font-label tracking-wider opacity-70">
          © ENStock
        </p>
      </section>

      {/* ── Sağ form paneli ── */}
      <section className="w-full md:w-[60%] flex items-center justify-center p-6 md:p-12 lg:p-20 bg-surface">
        <div className="w-full max-w-md space-y-8">
          <header className="space-y-2">
            <span className="text-xs font-label uppercase tracking-widest text-primary font-bold">
              Davet ile Kayıt
            </span>
            <h2 className="text-3xl font-headline font-bold text-on-surface">
              Hesabınızı Oluşturun
            </h2>
            <p className="text-on-surface-variant font-medium text-sm">
              Davet kodunuz ve bilgilerinizle hesabınızı aktive edin.
            </p>
          </header>

          <form className="space-y-5" onSubmit={handleSubmit} noValidate>
            {/* E-posta — kilitli */}
            <div className="space-y-1.5">
              <label
                htmlFor="invite-email"
                className="text-xs font-label uppercase tracking-wider text-on-surface-variant font-bold"
              >
                E-posta Adresi
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline">
                  mail
                </span>
                <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-outline text-base">
                  lock
                </span>
                <input
                  type="email"
                  id="invite-email"
                  value={emailFromUrl}
                  readOnly
                  disabled
                  className="w-full pl-12 pr-10 py-4 bg-surface-container border-none rounded-xl text-on-surface-variant font-medium outline-none cursor-not-allowed opacity-70"
                />
              </div>
              <p className="text-[11px] text-on-surface-variant">
                Bu alan davet bağlantısından otomatik doldurulmuştur ve değiştirilemez.
              </p>
            </div>

            {/* Ad Soyad */}
            <div className="space-y-1.5">
              <label
                htmlFor="invite-fullName"
                className="text-xs font-label uppercase tracking-wider text-on-surface-variant font-bold"
              >
                Ad Soyad
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline">
                  person
                </span>
                <input
                  type="text"
                  id="invite-fullName"
                  placeholder="Adınız Soyadınız"
                  value={fullName}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setFullName(e.target.value)}
                  disabled={isLoading}
                  className={`w-full pl-12 pr-4 py-4 bg-surface-container-low border-none rounded-xl text-on-surface font-medium placeholder:text-outline outline-none focus:ring-2 focus:ring-primary/20 transition-all focus:bg-surface-container-lowest disabled:opacity-50 ${fieldErrors.fullName ? 'ring-2 ring-error' : ''}`}
                />
              </div>
              {fieldErrors.fullName && (
                <p className="text-xs text-error font-medium">{fieldErrors.fullName}</p>
              )}
            </div>

            {/* Şifre */}
            <div className="space-y-1.5">
              <label
                htmlFor="invite-password"
                className="text-xs font-label uppercase tracking-wider text-on-surface-variant font-bold"
              >
                Şifre
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline">
                  lock
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="invite-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                  disabled={isLoading}
                  className={`w-full pl-12 pr-12 py-4 bg-surface-container-low border-none rounded-xl text-on-surface font-medium placeholder:text-outline outline-none focus:ring-2 focus:ring-primary/20 transition-all focus:bg-surface-container-lowest disabled:opacity-50 ${fieldErrors.password ? 'ring-2 ring-error' : ''}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-outline hover:text-primary transition-colors"
                >
                  <span className="material-symbols-outlined">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
              {fieldErrors.password && (
                <p className="text-xs text-error font-medium">{fieldErrors.password}</p>
              )}
              <p className="text-[11px] text-on-surface-variant">En az 6 karakter gereklidir.</p>
            </div>

            {/* 6 Haneli OTP */}
            <div className="space-y-3">
              <label className="text-xs font-label uppercase tracking-wider text-on-surface-variant font-bold block">
                Davet Kodu (6 Haneli)
              </label>
              <OtpInputs
                otp={otp}
                onChange={handleOtpChange}
                onKeyDown={handleOtpKeyDown}
                onPaste={handleOtpPaste}
                inputRefs={otpRefs}
                disabled={isLoading}
              />
              {fieldErrors.otp && (
                <p className="text-xs text-error font-medium text-center">{fieldErrors.otp}</p>
              )}
              <p className="text-[11px] text-on-surface-variant text-center">
                Bu kod davet e-postanızda bulunmaktadır.
              </p>
            </div>

            {/* Submit */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full signature-gradient text-on-primary py-4 px-8 rounded-xl font-headline font-bold text-lg shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {isLoading ? (
                  <>
                    <span className="inline-block animate-spin">⏳</span>
                    Kayıt Yapılıyor…
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined">how_to_reg</span>
                    Hesabımı Oluştur
                  </>
                )}
              </button>
            </div>
          </form>

          <footer className="pt-6 border-t border-outline-variant/15 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-on-surface-variant opacity-60">
              <span
                className="material-symbols-outlined text-sm"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                verified_user
              </span>
              <span className="text-[11px] font-label uppercase tracking-widest">Güvenli Veri Şifreleme</span>
            </div>
            <p className="text-sm font-medium text-on-surface-variant">
              Hesabınız var mı?{' '}
              <Link href="/login" className="text-primary font-bold hover:underline underline-offset-4">
                Giriş Yapın
              </Link>
            </p>
          </footer>
        </div>
      </section>
    </div>
  );
}
