import React, { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { api } from '../../api/client';
import { Button } from '@wphub/ui';

const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters long')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number')
      .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type ResetPasswordFields = z.infer<typeof resetPasswordSchema>;

export const ResetPassword: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const passwordRef = useRef<HTMLInputElement | null>(null);
  const confirmPasswordRef = useRef<HTMLInputElement | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFields>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const { ref: formPasswordRef, ...passwordRest } = register('password');
  const { ref: formConfirmPasswordRef, ...confirmPasswordRest } = register('confirmPassword');

  const togglePassword = () => {
    const input = passwordRef.current;
    if (input) {
      const start = input.selectionStart;
      const end = input.selectionEnd;
      setShowPassword((prev) => !prev);
      requestAnimationFrame(() => {
        input.focus();
        input.setSelectionRange(start, end);
      });
    }
  };

  const toggleConfirmPassword = () => {
    const input = confirmPasswordRef.current;
    if (input) {
      const start = input.selectionStart;
      const end = input.selectionEnd;
      setShowConfirmPassword((prev) => !prev);
      requestAnimationFrame(() => {
        input.focus();
        input.setSelectionRange(start, end);
      });
    }
  };

  const onSubmit = async (data: ResetPasswordFields) => {
    if (!token) {
      setApiError('Reset token query parameter is missing in URL');
      return;
    }
    setIsSubmitting(true);
    setApiError(null);
    setSuccessMsg(null);
    try {
      await api.post('/auth/reset-password', {
        token,
        password: data.password,
      });
      setSuccessMsg('Your password has been successfully reset! Redirecting to login page...');
      setTimeout(() => navigate('/login'), 3000);
    } catch (err: any) {
      setApiError(err.response?.data?.error?.message || 'Failed to reset password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-100">Reset Password</h2>
        <p className="text-xs text-slate-400 mt-1">Configure your new secure account password</p>
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

      {!successMsg && !token && (
        <div className="p-3 text-xs bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg">
          Verification token is invalid or missing in your URL address. Please request a new
          recovery link.
        </div>
      )}

      {!successMsg && token && (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              New Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                disabled={isSubmitting}
                {...passwordRest}
                ref={(e) => {
                  formPasswordRef(e);
                  passwordRef.current = e;
                }}
                className={`w-full bg-slate-950/60 border ${
                  errors.password
                    ? 'border-red-500/50 focus:border-red-500'
                    : 'border-slate-800 focus:border-indigo-500'
                } rounded-lg pl-4 pr-10 py-2.5 text-sm focus:outline-none transition-colors disabled:opacity-50`}
              />
              <button
                type="button"
                onClick={togglePassword}
                disabled={isSubmitting}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors focus:outline-none disabled:opacity-50"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.password && (
              <p className="text-[10px] text-red-400 mt-1">{errors.password.message}</p>
            )}
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Confirm New Password
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="••••••••"
                disabled={isSubmitting}
                {...confirmPasswordRest}
                ref={(e) => {
                  formConfirmPasswordRef(e);
                  confirmPasswordRef.current = e;
                }}
                className={`w-full bg-slate-950/60 border ${
                  errors.confirmPassword
                    ? 'border-red-500/50 focus:border-red-500'
                    : 'border-slate-800 focus:border-indigo-500'
                } rounded-lg pl-4 pr-10 py-2.5 text-sm focus:outline-none transition-colors disabled:opacity-50`}
              />
              <button
                type="button"
                onClick={toggleConfirmPassword}
                disabled={isSubmitting}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors focus:outline-none disabled:opacity-50"
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
              >
                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="text-[10px] text-red-400 mt-1">{errors.confirmPassword.message}</p>
            )}
          </div>

          <Button type="submit" variant="primary" className="w-full mt-2" disabled={isSubmitting}>
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 size={16} className="animate-spin" />
                Updating...
              </span>
            ) : (
              'Update Password'
            )}
          </Button>
        </form>
      )}
    </div>
  );
};
