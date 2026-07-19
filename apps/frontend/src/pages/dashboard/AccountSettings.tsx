import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { useAuthStore } from '../../stores/authStore';
import { Button } from '@wphub/ui';

const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters long')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number')
      .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
    confirmNewPassword: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: 'Passwords do not match',
    path: ['confirmNewPassword'],
  });

type PasswordChangeFields = z.infer<typeof passwordChangeSchema>;

export const AccountSettings: React.FC = () => {
  const navigate = useNavigate();
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PasswordChangeFields>({
    resolver: zodResolver(passwordChangeSchema),
  });

  const onSubmit = async (data: PasswordChangeFields) => {
    setIsSubmitting(true);
    setApiError(null);
    setSuccessMsg(null);
    try {
      await api.put('/users/password', {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      setSuccessMsg('Your account password has been successfully updated.');
      reset();
    } catch (err: any) {
      setApiError(err.response?.data?.error?.message || 'Failed to update account password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (
      !window.confirm(
        'WARNING: Are you sure you want to permanently delete your account? This action cannot be undone.',
      )
    ) {
      return;
    }
    setIsDeleting(true);
    try {
      await api.delete('/users');
      clearAuth();
      navigate('/login');
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to delete account.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Account Settings</h2>
        <p className="text-sm text-slate-400 mt-1">
          Manage credentials, security rules, and account deletion
        </p>
      </div>

      <div className="space-y-8">
        {/* Password Update Panel */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
          <h3 className="font-semibold text-base border-b border-slate-800 pb-3">
            Update Password
          </h3>

          {successMsg && (
            <div className="p-3 text-xs bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg">
              {successMsg}
            </div>
          )}
          {apiError && (
            <div className="p-3 text-xs bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg">
              {apiError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-md">
            <div>
              <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Current Password
              </label>
              <input
                type="password"
                placeholder="••••••••"
                {...register('currentPassword')}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-indigo-500"
              />
              {errors.currentPassword && (
                <p className="text-[10px] text-red-400 mt-1">{errors.currentPassword.message}</p>
              )}
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                New Password
              </label>
              <input
                type="password"
                placeholder="••••••••"
                {...register('newPassword')}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-indigo-500"
              />
              {errors.newPassword && (
                <p className="text-[10px] text-red-400 mt-1">{errors.newPassword.message}</p>
              )}
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Confirm New Password
              </label>
              <input
                type="password"
                placeholder="••••••••"
                {...register('confirmNewPassword')}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-indigo-500"
              />
              {errors.confirmNewPassword && (
                <p className="text-[10px] text-red-400 mt-1">{errors.confirmNewPassword.message}</p>
              )}
            </div>

            <div className="pt-2">
              <Button type="submit" variant="primary" disabled={isSubmitting}>
                {isSubmitting ? 'Updating...' : 'Update Password'}
              </Button>
            </div>
          </form>
        </div>

        {/* Danger Zone */}
        <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-6 space-y-4">
          <h3 className="font-semibold text-base text-red-400 border-b border-red-500/10 pb-3">
            Danger Zone
          </h3>
          <p className="text-xs text-slate-400">
            Deleting your account will immediately terminate all active WordPress instances,
            databases, and backup files. This action cannot be reverted.
          </p>
          <div className="pt-2">
            <Button
              type="button"
              variant="danger"
              onClick={handleDeleteAccount}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold"
            >
              {isDeleting ? 'Deleting Account...' : 'Permanently Delete Account'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
