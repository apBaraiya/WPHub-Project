import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '../../stores/authStore';
import { api } from '../../api/client';
import { Button } from '@wphub/ui';

const profileSchema = z.object({
  firstName: z.string().max(50, 'Max 50 characters').nullable().optional(),
  lastName: z.string().max(50, 'Max 50 characters').nullable().optional(),
  avatarUrl: z.string().url('Please enter a valid URL').or(z.literal('')).nullable().optional(),
});

type ProfileFields = z.infer<typeof profileSchema>;

export const Profile: React.FC = () => {
  const { user, profile, setAuth } = useAuthStore();
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileFields>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: profile?.firstName || '',
      lastName: profile?.lastName || '',
      avatarUrl: profile?.avatarUrl || '',
    },
  });

  const onSubmit = async (data: ProfileFields) => {
    setIsSubmitting(true);
    setApiError(null);
    setSuccessMsg(null);
    try {
      const response = await api.put('/users/profile', {
        firstName: data.firstName || null,
        lastName: data.lastName || null,
        avatarUrl: data.avatarUrl || null,
      });

      // Update auth store profile state
      if (user) {
        const token = useAuthStore.getState().accessToken || '';
        setAuth(user, token, response.data.data);
      }
      setSuccessMsg('Your profile details have been successfully updated.');
    } catch (err: any) {
      setApiError(err.response?.data?.error?.message || 'Failed to update profile details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Profile Details</h2>
        <p className="text-sm text-slate-400 mt-1">
          Review credentials and update account metadata
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Details Card */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
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

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  First Name
                </label>
                <input
                  type="text"
                  placeholder="Jane"
                  {...register('firstName')}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-indigo-500"
                />
                {errors.firstName && (
                  <p className="text-[10px] text-red-400 mt-1">{errors.firstName.message}</p>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Last Name
                </label>
                <input
                  type="text"
                  placeholder="Doe"
                  {...register('lastName')}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-indigo-500"
                />
                {errors.lastName && (
                  <p className="text-[10px] text-red-400 mt-1">{errors.lastName.message}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Avatar Image URL
              </label>
              <input
                type="text"
                placeholder="https://example.com/avatar.jpg"
                {...register('avatarUrl')}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-indigo-500"
              />
              {errors.avatarUrl && (
                <p className="text-[10px] text-red-400 mt-1">{errors.avatarUrl.message}</p>
              )}
            </div>

            <div className="pt-2">
              <Button type="submit" variant="primary" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </div>

        {/* Credentials Box */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
          <h3 className="font-semibold text-base border-b border-slate-800 pb-3">Identity Card</h3>

          <div className="space-y-4">
            <div>
              <span className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                Email Address
              </span>
              <span className="text-sm font-medium text-slate-200 mt-1 block">{user?.email}</span>
            </div>

            <div>
              <span className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                Account Status
              </span>
              <span
                className={`inline-block text-[10px] px-2.5 py-0.5 rounded-full font-semibold mt-1.5 ${
                  user?.isEmailVerified
                    ? 'bg-emerald-500/10 text-emerald-400'
                    : 'bg-amber-500/10 text-amber-400'
                }`}
              >
                {user?.isEmailVerified ? 'Verified Account' : 'Pending Verification'}
              </span>
            </div>

            <div>
              <span className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                Assigned Role
              </span>
              <span className="text-xs font-semibold text-indigo-400 mt-1.5 block bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded w-max">
                {user?.role}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
