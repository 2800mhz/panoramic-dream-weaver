import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthContext } from '@/hooks/useAuthContext';
import { toast } from 'sonner';
import { useState } from 'react';
import { Loader2, Lock, Eye, EyeOff, CheckCircle } from 'lucide-react';

const confirmResetSchema = z.object({
  password: z.string().min(6, 'Şifre en az 6 karakter olmalıdır'),
  confirmPassword: z.string().min(6, 'Şifre tekrarı gereklidir'),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Şifreler eşleşmiyor',
  path: ['confirmPassword'],
});

type ConfirmResetForm = z.infer<typeof confirmResetSchema>;

export const Route = createFileRoute('/auth/confirm-reset')({
  head: () => ({
    meta: [
      { title: 'Yeni Şifre Belirle — 360° VR Prompt Builder' },
    ],
  }),
  component: ConfirmResetPage,
});

function ConfirmResetPage() {
  const { updatePassword } = useAuthContext();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<ConfirmResetForm>({
    resolver: zodResolver(confirmResetSchema),
  });

  const onSubmit = async (data: ConfirmResetForm) => {
    setSubmitting(true);
    try {
      await updatePassword(data.password);
      setSuccess(true);
      toast.success('Şifreniz başarıyla güncellendi');
      setTimeout(() => navigate({ to: '/' }), 2000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Şifre güncellenemedi';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-foreground">Yeni Şifre Belirle</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Yeni şifrenizi girin
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          {success ? (
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10">
                <CheckCircle className="h-6 w-6 text-green-500" />
              </div>
              <h2 className="text-lg font-semibold text-foreground">Şifre güncellendi!</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Yönlendiriliyorsunuz...
              </p>
              <Link
                to="/"
                className="mt-4 inline-flex text-sm text-primary hover:underline"
              >
                Ana sayfaya git
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-muted-foreground">
                  Yeni Şifre
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    {...register('password')}
                    type={showPassword ? 'text' : 'password'}
                    placeholder="En az 6 karakter"
                    className="w-full rounded-lg border border-border bg-input py-2.5 pl-10 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1 text-xs text-destructive">{errors.password.message}</p>
                )}
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-muted-foreground">
                  Şifre Tekrar
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    {...register('confirmPassword')}
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Şifrenizi tekrar girin"
                    className="w-full rounded-lg border border-border bg-input py-2.5 pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    autoComplete="new-password"
                  />
                </div>
                {errors.confirmPassword && (
                  <p className="mt-1 text-xs text-destructive">{errors.confirmPassword.message}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Şifreyi Güncelle
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
