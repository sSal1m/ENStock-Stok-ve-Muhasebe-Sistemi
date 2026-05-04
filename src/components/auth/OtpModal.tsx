'use client';

import React, { useState, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';

interface OtpModalProps {
  email: string;
  isOpen: boolean;
  isLoading: boolean;
  error?: string;
  onVerify: (otp: string) => Promise<void>;
  onCancel: () => void;
}

export default function OtpModal({ 
  email, 
  isOpen, 
  isLoading, 
  error, 
  onVerify, 
  onCancel 
}: OtpModalProps) {
  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
  const [localError, setLocalError] = useState<string>('');
  const [timeLeft, setTimeLeft] = useState(900); // 15 minutes = 900 seconds
  const [isTimedOut, setIsTimedOut] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Countdown timer effect
  useEffect(() => {
    if (!isOpen || isTimedOut) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      return;
    }

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
          }
          setIsTimedOut(true);
          setLocalError('Kodun geçerlilik süresi doldu. Lütfen yeni bir kod isteyin.');
          toast.error('Kodun geçerlilik süresi doldu. Lütfen yeni bir kod isteyin.');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isOpen, isTimedOut]);

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    if (error) {
      setLocalError(error);
    }
  }, [error]);

  const handleInputChange = (index: number, value: string) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) {
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setLocalError('');

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const otpCode = otp.join('');

    if (otpCode.length !== 6) {
      setLocalError('Lütfen tüm 6 hanesi girin');
      return;
    }

    await onVerify(otpCode);
  };

  const handleCancel = () => {
    setOtp(['', '', '', '', '', '']);
    setLocalError('');
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    onCancel();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-surface rounded-2xl shadow-2xl max-w-md w-full space-y-6 p-8 animate-in fade-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary text-3xl">mail_lock</span>
            </div>
          </div>
          <h2 className="text-2xl font-headline font-bold text-on-surface">
            E-postanızı Doğrulayın
          </h2>
          <p className="text-on-surface-variant text-sm font-medium">
            {email} adresine gönderilen 6 haneli kodu girin
          </p>
        </div>

        {/* Countdown Timer */}
        <div className={`text-center py-3 rounded-lg font-headline font-bold text-lg ${
          timeLeft <= 60 
            ? 'bg-error/10 text-error border border-error/30' 
            : 'bg-primary/10 text-primary border border-primary/30'
        }`}>
          Kodun geçerlilik süresi: {formatTime(timeLeft)}
        </div>

        {/* OTP Input */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex justify-center gap-3">
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={(el) => {
                  inputRefs.current[index] = el;
                }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleInputChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                disabled={isLoading || isTimedOut}
                className={`w-12 h-14 text-center text-xl font-headline font-bold rounded-lg border-2 transition-all duration-200 ${
                  digit
                    ? 'bg-primary/5 border-primary/30'
                    : 'bg-surface-container-low border-outline'
                } ${
                  localError
                    ? 'border-error'
                    : 'focus:border-primary focus:ring-2 focus:ring-primary/20'
                } outline-none disabled:opacity-50 disabled:cursor-not-allowed`}
              />
            ))}
          </div>

          {/* Error Message */}
          {localError && (
            <div className="bg-error/10 border border-error/30 rounded-lg p-3 flex items-start gap-2">
              <span className="material-symbols-outlined text-error text-xl flex-shrink-0 mt-0.5">error</span>
              <p className="text-error text-sm font-medium">{localError}</p>
            </div>
          )}

          {/* Timeout Message */}
          {isTimedOut && (
            <div className="bg-warning/10 border border-warning/30 rounded-lg p-3 flex items-start gap-2">
              <span className="material-symbols-outlined text-warning text-xl flex-shrink-0 mt-0.5">schedule</span>
              <p className="text-warning text-sm font-medium">Süre doldu, lütfen yeni bir kod isteyin</p>
            </div>
          )}

          {/* Verify Button */}
          <button
            type="submit"
            disabled={isLoading || otp.join('').length !== 6 || isTimedOut}
            className="w-full signature-gradient text-on-primary py-3 px-6 rounded-xl font-headline font-bold text-base shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <span className="inline-block animate-spin">⏳</span>
                Doğrulanıyor...
              </>
            ) : isTimedOut ? (
              <>
                <span className="material-symbols-outlined">schedule</span>
                Süre Doldu
              </>
            ) : (
              <>
                <span className="material-symbols-outlined">check_circle</span>
                Doğrula
              </>
            )}
          </button>
        </form>

        {/* Help Text */}
        <div className="space-y-3 pt-2 border-t border-outline-variant/15">
          <p className="text-center text-xs text-on-surface-variant font-medium">
            Kodu almadınız mı? Sayfayı yenileyin veya daha sonra tekrar deneyin.
          </p>
          <button
            type="button"
            onClick={handleCancel}
            disabled={isLoading}
            className="w-full py-2 px-4 rounded-lg font-medium text-sm text-primary hover:bg-primary/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ← Geri Dön
          </button>
        </div>
      </div>
    </div>
  );
}
