import React, { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { api } from '../../api/client';
import { useAuthStore } from '../../stores/authStore';
import { Button } from '@wphub/ui';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean(),
});

type LoginFields = z.infer<typeof loginSchema>;

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const passwordRef = useRef<HTMLInputElement | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFields>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      rememberMe: false,
    },
  });

  const { ref: formPasswordRef, ...passwordRest } = register('password');

  const togglePasswordVisibility = () => {
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

  const onSubmit = async (data: LoginFields) => {
    setIsSubmitting(true);
    setApiError(null);
    try {
      const response = await api.post('/auth/login', data);
      const { user, accessToken, profile } = response.data.data;
      setAuth(user, accessToken, profile);
      navigate('/');
    } catch (err: any) {
      setApiError(err.response?.data?.error?.message || 'Invalid email or password credentials');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-100">Welcome Back</h2>
        <p className="text-xs text-slate-400 mt-1">
          Sign in to manage your cloud hosting environments
        </p>
      </div>

      {apiError && (
        <div className="p-3 text-xs bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg animate-fade-in">
          {apiError}
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
          <div className="flex justify-between items-center mb-1.5">
            <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              Password
            </label>
            <Link to="/forgot-password" className="text-[10px] text-indigo-400 hover:underline">
              Forgot Password?
            </Link>
          </div>
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
              onClick={togglePasswordVisibility}
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

        {/* Remember Me Checkbox */}
        <div className="flex items-center">
          <input
            id="rememberMe"
            type="checkbox"
            disabled={isSubmitting}
            {...register('rememberMe')}
            className="h-4 w-4 rounded border-slate-800 bg-slate-950 text-indigo-600 focus:ring-indigo-500/20 focus:ring-2 disabled:opacity-50 cursor-pointer"
          />
          <label
            htmlFor="rememberMe"
            className="ml-2 block text-xs text-slate-300 select-none cursor-pointer disabled:opacity-50"
          >
            Remember me
          </label>
        </div>

        <Button type="submit" variant="primary" className="w-full mt-2" disabled={isSubmitting}>
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 size={16} className="animate-spin" />
              Verifying...
            </span>
          ) : (
            'Sign In'
          )}
        </Button>
      </form>

      <div className="text-center text-xs text-slate-400 pt-2 border-t border-slate-800/60">
        New to WPHub?{' '}
        <Link to="/register" className="text-indigo-400 hover:underline font-medium">
          Create Account
        </Link>
      </div>
    </div>
  );
};
