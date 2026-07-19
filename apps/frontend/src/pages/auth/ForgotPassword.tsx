import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { api } from '../../api/client';
import { Button } from '@wphub/ui';

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

type ForgotPasswordFields = z.infer<typeof forgotPasswordSchema>;

export const ForgotPassword: React.FC = () => {
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFields>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordFields) => {
    setIsSubmitting(true);
    setApiError(null);
    setSuccessMsg(null);
    try {
      await api.post('/auth/forgot-password', data);
      setSuccessMsg('If the email is registered, a password recovery link has been dispatched.');
    } catch (err: any) {
      setApiError(err.response?.data?.error?.message || 'Failed to submit recovery request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-100">Recover Password</h2>
        <p className="text-xs text-slate-400 mt-1">
          Enter your email to receive a password reset link
        </p>
      </div>

      {apiError && (
        <div className="p-3 text-xs bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg">
          {apiError}
        </div>
      )}

      {successMsg && (
        <div className="p-3 text-xs bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg">
          {successMsg}
        </div>
      )}

      {!successMsg && (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Email Address
            </label>
            <input
              type="email"
              placeholder="name@company.com"
              disabled={isSubmitting}
              {...register('email')}
              className={`w-full bg-slate-950/60 border ${
                errors.email
                  ? 'border-red-500/50 focus:border-red-500'
                  : 'border-slate-800 focus:border-indigo-500'
              } rounded-lg px-4 py-2.5 text-sm focus:outline-none transition-colors disabled:opacity-50`}
            />
            {errors.email && (
              <p className="text-[10px] text-red-400 mt-1">{errors.email.message}</p>
            )}
          </div>

          <Button type="submit" variant="primary" className="w-full mt-2" disabled={isSubmitting}>
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 size={16} className="animate-spin" />
                Sending Request...
              </span>
            ) : (
              'Send Recovery Email'
            )}
          </Button>
        </form>
      )}

      <div className="text-center text-xs text-slate-400 pt-2 border-t border-slate-800/60">
        Remember your details?{' '}
        <Link to="/login" className="text-indigo-400 hover:underline font-medium">
          Sign In
        </Link>
      </div>
    </div>
  );
};
