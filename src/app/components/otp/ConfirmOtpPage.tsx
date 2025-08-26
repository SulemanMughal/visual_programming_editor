"use client"

import { useForm } from 'react-hook-form';
import { FiMail, FiKey } from 'react-icons/fi';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { confirmOtp } from '@/app/services/auth';
import { ImSpinner2 } from 'react-icons/im';

type FormData = {
  username: string;
  otp: string;
};

export default function ConfirmOtpPage() {
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [defaultUsername, setDefaultUsername] = useState('');
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<FormData>();

  // Read username from URL and set as default value
  useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const username = params.get('email');
      if (username) {
        setDefaultUsername(username);
        setValue('username', username);
      }
    }
  });

  const onSubmit = async (data: FormData) => {
    if (data.otp.length !== 6) {
      toast.error('OTP must be 6 digits');
      return;
    }
    setLoading(true);
    try {
      const res = await confirmOtp(data.username, data.otp);
      if (res.status === 'ok') {
        setSuccess(true);
        toast.success(res.message || 'Account confirmed.');
        setTimeout(() => {
          router.push('/login');
        }, 1200);
      } else {
        toast.error(res.message || 'Confirmation failed.');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Confirmation failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-htb-bg text-white flex items-center justify-center px-4">
      <ToastContainer theme="dark" />
      <div className="w-full max-w-md bg-htb-input p-6 rounded-xl shadow-md border border-htb-border">
        <h1 className="text-2xl font-bold text-htb-accent text-center mb-6">Confirm Your Account</h1>

        {success ? (
          <div className="text-center">
            <p className="text-green-400 mb-4">✅ Account confirmed successfully.</p>
            <a
              href="/login"
              className="text-htb-accent underline hover:text-green-300 transition-all"
            >
              Go to Login →
            </a>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Email / Username */}
            <div className="relative">
              <FiMail className="absolute left-3 top-3 text-htb-accent" />
              <input
                type="text"
                placeholder="Email or Username"
                defaultValue={defaultUsername}
                readOnly={!!defaultUsername}
                {...register('username', {
                  required: 'Username or email is required',
                  minLength: {
                    value: 3,
                    message: 'Must be at least 3 characters',
                  },
                })}
                className={`w-full bg-htb-bg pl-10 pr-4 py-2 rounded-md border ${
                  errors.username ? 'border-red-500' : 'border-htb-border'
                } text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-htb-accent`}
              />
              {errors.username && (
                <p className="text-red-500 text-sm mt-1">{errors.username.message}</p>
              )}
            </div>

            {/* OTP */}
            <div className="relative">
              <FiKey className="absolute left-3 top-3 text-htb-accent" />
              <input
                type="text"
                placeholder="Enter 6-digit code"
                maxLength={6}
                inputMode="numeric"
                pattern="\d{6}"
                {...register('otp', {
                  required: 'OTP is required',
                  minLength: {
                    value: 6,
                    message: 'OTP must be 6 digits',
                  },
                  maxLength: {
                    value: 6,
                    message: 'OTP must be 6 digits',
                  },
                  pattern: {
                    value: /^\d{6}$/,
                    message: 'Only 6 digits allowed',
                  },
                })}
                className={`w-full bg-htb-bg pl-10 pr-4 py-2 rounded-md border ${
                  errors.otp ? 'border-red-500' : 'border-htb-border'
                } text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-htb-accent tracking-wider`}
              />
              {errors.otp && (
                <p className="text-red-500 text-sm mt-1">{errors.otp.message}</p>
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
                  Confirming...
                </>
              ) : (
                'Confirm'
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
