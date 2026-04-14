import { createFileRoute, Link } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthContext } from '@/hooks/useAuthContext';
import { toast } from 'sonner';
import { useState } from 'react';
import { Loader2, Mail, ArrowLeft } from 'lucide-react';

const resetSchema = z.object({
  email: z.string().email('Geçerli bir email adresi girin'),
});

type ResetForm = z.infer<typeof resetSchema>;

export const Route = createFileRoute('/auth/reset-password')({
  head: () => ({
    meta: [
      { title: 'Şifre Sıfırla — 360° VR Prompt Builder' },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const { resetPassword } = useAuthContext();
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<ResetForm>({
    resolver: zodResolver(resetSchema),
  });

  const onSubmit = async (data: ResetForm) => {
    setSubmitting(true);
    try {
      await resetPassword(data.email);
      setSent(true);
      toast.success('Şifre sıfırlama linki gönderildi');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'İstek gönderilemedi';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-foreground">Şifre Sıfırlama</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Email adresinize bir sıfırlama linki göndereceğiz
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          {sent ? (
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Mail className="h-6 w-6 text-primary" />
              </div>
              <h2 className="text-lg font-semibold text-foreground">Email gönderildi!</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Şifre sıfırlama linkini email adresinizde bulabilirsiniz. Spam klasörünü de kontrol edin.
              </p>
              <Link
                to="/auth/login"
                className="mt-6 inline-flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <ArrowLeft className="h-4 w-4" /> Giriş sayfasına dön
              </Link>
            </div>
          ) : (
            <>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-muted-foreground">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      {...register('email')}
                      type="email"
                      placeholder="ornek@email.com"
                      className="w-full rounded-lg border border-border bg-input py-2.5 pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      autoComplete="email"
                    />
                  </div>
                  {errors.email && (
                    <p className="mt-1 text-xs text-destructive">{errors.email.message}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Sıfırlama Linki Gönder
                </button>
              </form>

              <div className="mt-6 text-center">
                <Link
                  to="/auth/login"
                  className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="h-4 w-4" /> Giriş sayfasına dön
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
