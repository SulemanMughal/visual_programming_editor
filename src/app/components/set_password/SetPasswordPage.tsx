"use client"

import { useForm } from 'react-hook-form';
import { FiLock, FiMail } from 'react-icons/fi';
import { useState } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { setPassword } from '@/app/services/auth';
import { useRouter } from 'next/navigation';

type FormData = {
  username: string;
  new_password: string;
  confirm_password: string;
};

export default function SetPasswordPage() {
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [defaultUsername, setDefaultUsername] = useState('');
  const [session, setSession] = useState('');
  const router = useRouter();
  // const [success, setSuccess] = useState(false);
  // const [loading, setLoading] = useState(false);
  // const [defaultUsername, setDefaultUsername] = useState('');
  // const [session, setSession] = useState('');

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    setValue,
  } = useForm<FormData>({
    defaultValues: {
      username: '',
    },
  });

  // Read email from URL and set as default value
  useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const email = params.get('email');
      const sessionParam = params.get('session');
      if (email) {
        setDefaultUsername(email);
        setValue('username', email);
      }
      if (sessionParam) {
        setSession(sessionParam);
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
      const res = await setPassword(
        data.username,
        data.new_password,
        data.confirm_password,
        session
      );
      if (res.status === 'ok') {
        setSuccess(true);
        toast.success(res.message || 'Password set successfully');
        setTimeout(() => {
          router.push('/login');
        }, 1200);
      } else {
        toast.error(res.message || 'Password set failed');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Password set failed');
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
            <p className="text-green-400 mb-4">✅ Password set successfully.</p>
            <a
              href="/login"
              className="text-htb-accent underline hover:text-green-300 transition-all"
            >
              Go to Login →
            </a>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

            {/* Username (read-only) */}
            <div className="relative">
              <FiMail className="absolute left-3 top-3 text-htb-accent" />
              <input
                type="text"
                readOnly
                defaultValue={defaultUsername}
                {...register('username')}
                className="w-full bg-htb-bg pl-10 pr-4 py-2 rounded-md border border-htb-border text-gray-400 focus:outline-none"
              />
            </div>

            {/* New Password */}
            <div className="relative">
              <FiLock className="absolute left-3 top-3 text-htb-accent" />
              <input
                type="password"
                placeholder="New Password"
                {...register('new_password', {
                  required: 'New password is required',
                  minLength: {
                    value: 6,
                    message: 'Minimum 6 characters',
                  },
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
              className="w-full bg-htb-accent text-black font-semibold py-2 rounded-md bg-green-400 transition"
              disabled={loading}
            >
              {loading ? 'Setting...' : 'Set Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
