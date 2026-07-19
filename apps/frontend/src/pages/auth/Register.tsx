import React, { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2, Check, X } from 'lucide-react';
import { api } from '../../api/client';
import { Button } from '@wphub/ui';

const registerSchema = z
  .object({
    email: z.string().email('Please enter a valid email address'),
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

type RegisterFields = z.infer<typeof registerSchema>;

export const Register: React.FC = () => {
  const navigate = useNavigate();
  const [apiError, setApiError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const passwordRef = useRef<HTMLInputElement | null>(null);
  const confirmPasswordRef = useRef<HTMLInputElement | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFields>({
    resolver: zodResolver(registerSchema),
  });

  const passwordValue = watch('password', '');
  const confirmPasswordValue = watch('confirmPassword', '');

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

  const onSubmit = async (data: RegisterFields) => {
    setIsSubmitting(true);
    setApiError(null);
    setSuccessMsg(null);
    try {
      await api.post('/auth/register', {
        email: data.email,
        password: data.password,
      });
      setSuccessMsg(
        'Account registered successfully! A verification email link has been sent to your inbox.',
      );
      setTimeout(() => navigate('/login'), 5000);
    } catch (err: any) {
      setApiError(err.response?.data?.error?.message || 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Real-time password rules
  const validationRules = [
    { label: 'At least 8 characters', isValid: passwordValue.length >= 8 },
    { label: 'One uppercase letter (A-Z)', isValid: /[A-Z]/.test(passwordValue) },
    { label: 'One lowercase letter (a-z)', isValid: /[a-z]/.test(passwordValue) },
    { label: 'One number (0-9)', isValid: /[0-9]/.test(passwordValue) },
    { label: 'One special character (!@#...)', isValid: /[^A-Za-z0-9]/.test(passwordValue) },
    {
      label: 'Passwords match',
      isValid: passwordValue !== '' && passwordValue === confirmPasswordValue,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-100">Get Started</h2>
        <p className="text-xs text-slate-400 mt-1">
          Create your developer hosting account instantly
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
          {errors.email && <p className="text-[10px] text-red-400 mt-1">{errors.email.message}</p>}
        </div>

        <div>
          <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
            Password
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
            Confirm Password
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

        {/* Real-time Checklist Grid */}
        <div className="p-3 bg-slate-900/40 border border-slate-800/80 rounded-lg space-y-2">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Password Requirements
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-[11px]">
            {validationRules.map((rule, idx) => (
              <div key={idx} className="flex items-center gap-1.5">
                {rule.isValid ? (
                  <Check size={12} className="text-emerald-500 stroke-[3]" />
                ) : (
                  <X size={12} className="text-slate-500 stroke-[3]" />
                )}
                <span className={rule.isValid ? 'text-emerald-400/90' : 'text-slate-400'}>
                  {rule.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        <Button type="submit" variant="primary" className="w-full mt-2" disabled={isSubmitting}>
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 size={16} className="animate-spin" />
              Registering...
            </span>
          ) : (
            'Sign Up'
          )}
        </Button>
      </form>

      <div className="text-center text-xs text-slate-400 pt-2 border-t border-slate-800/60">
        Already have an account?{' '}
        <Link to="/login" className="text-indigo-400 hover:underline font-medium">
          Sign In
        </Link>
      </div>
    </div>
  );
};
