"use client"

import { useForm } from 'react-hook-form';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FiMail, FiLock, FiKey } from 'react-icons/fi';
import { ImSpinner2 } from 'react-icons/im';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { resetPassword } from '@/app/services/auth';

type FormData = {
  username: string;
  code: string;
  new_password: string;
  confirm_password: string;
};

export default function ResetPasswordConfirmPage() {
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [defaultUsername, setDefaultUsername] = useState('');
  const router = useRouter();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    setValue,
  } = useForm<FormData>();

  // Read username from URL and set as default value
  useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const username = params.get('username');
      if (username) {
        setDefaultUsername(username);
        setValue('username', username);
      }
    }
  });

  const onSubmit = async (data: FormData) => {
    if (data.new_password !== data.confirm_password) {
      toast.error('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      const res = await resetPassword(
        data.username,
        data.code,
        data.new_password,
        data.confirm_password
      );
      if (res.status === 'ok') {
        setSuccess(true);
        toast.success(res.message || 'Password reset successful');
        setTimeout(() => {
          router.push('/login');
        }, 1200);
      } else {
        toast.error(res.message || 'Password reset failed');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Password reset failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-htb-bg text-white flex items-center justify-center px-4">
      <ToastContainer theme="dark" />
      <div className="w-full max-w-md bg-htb-input p-6 rounded-xl shadow-md border border-htb-border">
        <h1 className="text-2xl font-bold text-htb-accent text-center mb-6">Set a New Password</h1>

        {success ? (
          <div className="text-center">
            <p className="text-green-400 mb-4">
              ✅ Password reset successful.
            </p>
            <a
              href="/login"
              className="text-htb-accent underline hover:text-green-300 transition-all"
            >
              Go to Login →
            </a>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

            {/* Username / Email */}
            <div className="relative">
              <FiMail className="absolute left-3 top-3 text-htb-accent" />
              <input
                type="text"
                placeholder="Email or Username"
                defaultValue={defaultUsername}
                readOnly={true}
                {...register('username', {
                  required: 'Username or email is required',
                })}
                className={`w-full bg-htb-bg pl-10 pr-4 py-2 rounded-md border ${
                  errors.username ? 'border-red-500' : 'border-htb-border'
                } text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-htb-accent`}
              />
              {errors.username && (
                <p className="text-red-500 text-sm mt-1">{errors.username.message}</p>
              )}
            </div>

            {/* Confirmation Code */}
            <div className="relative">
              <FiKey className="absolute left-3 top-3 text-htb-accent" />
              <input
                type="text"
                placeholder="Confirmation Code"
                maxLength={6}
                {...register('code', {
                  required: 'Confirmation code is required',
                })}
                className={`w-full bg-htb-bg pl-10 pr-4 py-2 rounded-md border ${
                  errors.code ? 'border-red-500' : 'border-htb-border'
                } text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-htb-accent`}
              />
              {errors.code && (
                <p className="text-red-500 text-sm mt-1">{errors.code.message}</p>
              )}
            </div>

            {/* New Password */}
            <div className="relative">
              <FiLock className="absolute left-3 top-3 text-htb-accent" />
              <input
                type="password"
                placeholder="New Password"
                {...register('new_password', {
                  required: 'New password is required',
                  minLength: { value: 6, message: 'Minimum 6 characters' },
                })}
                className={`w-full bg-htb-bg pl-10 pr-4 py-2 rounded-md border ${
                  errors.new_password ? 'border-red-500' : 'border-htb-border'
                } text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-htb-accent`}
              />
              {errors.new_password && (
                <p className="text-red-500 text-sm mt-1">{errors.new_password.message}</p>
              )}
            </div>

            {/* Confirm Password */}
            <div className="relative">
              <FiLock className="absolute left-3 top-3 text-htb-accent" />
              <input
                type="password"
                placeholder="Confirm Password"
                {...register('confirm_password', {
                  required: 'Please confirm your password',
                })}
                className={`w-full bg-htb-bg pl-10 pr-4 py-2 rounded-md border ${
                  errors.confirm_password ? 'border-red-500' : 'border-htb-border'
                } text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-htb-accent`}
              />
              {errors.confirm_password && (
                <p className="text-red-500 text-sm mt-1">{errors.confirm_password.message}</p>
              )}
            </div>

            <button
              type="submit"
              className="w-full bg-htb-accent text-black font-semibold py-2 rounded-md bg-green-400 transition flex items-center justify-center"
              disabled={loading}
            >
              {loading ? (
                <>
                  <ImSpinner2 className="animate-spin mr-2 text-xl" />
                  Resetting...
                </>
              ) : (
                'Reset Password'
              )}
            </button>
          </form>
        )}

        <div className="mt-6 text-center">
          <Link
            href="/"
            className="text-htb-accent hover:underline hover:text-green-300 transition"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
