// Auth layout — sadece children döndürür.
// Oturum kontrolü middleware (src/middleware.ts) ve sayfa bileşenlerinde yapılır.
// Çift sarma (h-screen wrapper) login sayfasının kendi layoutuyla çakışıyordu.

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
