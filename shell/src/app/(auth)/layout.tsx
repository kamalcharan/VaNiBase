/**
 * Auth layout — used for login, register, forgot-password pages.
 * No sidebar, no header. Just centered content on themed background.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      {children}
    </div>
  );
}
