
"use client"
import Link from 'next/link';

import { useForm } from 'react-hook-form';
import { useState } from 'react';
import { FiMail } from 'react-icons/fi';
import { ImSpinner2 } from 'react-icons/im';
import { ToastContainer, toast } from 'react-toastify';
import { forgotPassword } from '@/app/services/auth';
import { useRouter } from 'next/navigation';
// import 'react-toastify/dist/ReactToastify.css';

type FormData = {
  username: string;
};

export default function ResetPasswordPage() {
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>();

  const onSubmit = async (data: FormData) => {
    if (!data.username) {
      return;
    }
    setLoading(true);
    try {
      await forgotPassword(data.username);
      toast.success('Reset code sent to your email.');
      setTimeout(() => {
        router.push(`/reset-password?username=${encodeURIComponent(data.username)}`);
      }, 1200);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to send reset code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-htb-bg text-white flex items-center justify-center px-4">
      <ToastContainer theme="dark" />
      <div className="w-full max-w-md bg-htb-input p-6 rounded-xl shadow-md border border-htb-border">
        <h1 className="text-2xl font-bold text-htb-accent text-center mb-6">Reset Password</h1>

        {success ? (
          <p className="text-green-400 text-center mb-4">
            ✅ A password reset code has been sent to your email.
          </p>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Username / Email */}
            <div className="relative">
              <FiMail className="absolute left-3 top-3 text-htb-accent" />
              <input
                type="text"
                placeholder="Email or Username"
                {...register('username', {
                  required: 'Email or Username is required',
                })}
                className={`w-full bg-htb-bg pl-10 pr-4 py-2 rounded-md border ${
                  errors.username ? 'border-red-500' : 'border-htb-border'
                } text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-htb-accent`}
              />
              {errors.username && (
                <p className="text-red-500 text-sm mt-1">{errors.username.message}</p>
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
                  Requesting...
                </>
              ) : (
                'Request Reset Code'
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
