
import Link from 'next/link';

export default function UnauthorizedPage() {
  return (
    <div className="h-screen flex flex-col items-center justify-center bg-surface p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-error-container/10 text-error mb-4">
          <span className="material-symbols-outlined text-5xl">lock</span>
        </div>
        <h1 className="text-3xl font-black text-slate-900 font-headline tracking-tight">Yetkisiz Erişim</h1>
        <p className="text-slate-500 font-body leading-relaxed">
          Bu sayfayı görüntülemek için gerekli yetkilere sahip değilsiniz. Lütfen sistem yöneticinizle iletişime geçin.
        </p>
        <div className="pt-6">
          <Link 
            href="/dashboard"
            className="inline-flex items-center gap-2 bg-primary text-white px-8 py-3 rounded-xl font-bold text-sm shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all"
          >
            Panele Dön
          </Link>
        </div>
      </div>
    </div>
  );
}
