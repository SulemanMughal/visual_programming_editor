"use client"

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { FiMail, FiUser, FiLock, FiEye, FiEyeOff } from 'react-icons/fi';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { register as registerApi } from '../services/auth';
import { useRouter } from 'next/navigation';

interface FormValues {
  email: string;
  username?: string;
  password: string;
  confirmPassword: string;
}

export default function RegisterPage() {
  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormValues>();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const onSubmit = async (data: FormValues) => {
    if (data.password !== data.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      await registerApi(data.email, data.password, data.username || "", data.confirmPassword);
      toast.success("Registration Successful!");
      setTimeout(() => {
        router.replace(`/confirm-otp?email=${encodeURIComponent(data.email)}`);
      }, 1200);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const passwordValue = watch('password');

  return (
    <div className="min-h-screen bg-htb-bg text-white flex justify-center items-center p-4">
      <ToastContainer theme="dark" />
      <div className="w-full max-w-md p-8 bg-htb-input rounded-xl border border-htb-border shadow-lg">
        <h2 className="text-3xl font-bold text-htb-accent mb-6 text-center">Sign Up</h2>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Email */}
          <div className="relative">
            <FiMail className="absolute left-3 top-3 text-htb-accent" />
            <input
              type="email"
              placeholder="Email"
              {...register('email', {
                required: 'Email is required',
                pattern: { value: /^\S+@\S+$/i, message: 'Invalid email' }
              })}
              className="w-full bg-htb-bg pl-10 pr-4 py-2 rounded-md border border-htb-border text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-htb-accent"
            />
            {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>}
          </div>

          {/* Username (optional) */}
          <div className="relative">
            <FiUser className="absolute left-3 top-3 text-htb-accent" />
            <input
              type="text"
              placeholder="Username (optional)"
              {...register('username')}
              className="w-full bg-htb-bg pl-10 pr-4 py-2 rounded-md border border-htb-border text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-htb-accent"
            />
          </div>

          {/* Password */}
          <div className="relative">
            <FiLock className="absolute left-3 top-3 text-htb-accent" />
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              {...register('password', {
                required: 'Password is required',
                minLength: { value: 6, message: 'Min 6 characters' },
                pattern: {
                  value: /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])/,
                  message: 'Include uppercase, number & symbol'
                }
              })}
              className="w-full bg-htb-bg pl-10 pr-10 py-2 rounded-md border border-htb-border text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-htb-accent"
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3 text-htb-accent">
              {showPassword ? <FiEyeOff /> : <FiEye />}
            </button>
            {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>}
          </div>

          {/* Confirm Password */}
          <div className="relative">
            <FiLock className="absolute left-3 top-3 text-htb-accent" />
            <input
              type={showConfirm ? 'text' : 'password'}
              placeholder="Confirm Password"
              {...register('confirmPassword', {
                required: 'Confirm your password',
              })}
              className="w-full bg-htb-bg pl-10 pr-10 py-2 rounded-md border border-htb-border text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-htb-accent"
            />
            <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-3 text-htb-accent">
              {showConfirm ? <FiEyeOff /> : <FiEye />}
            </button>
            {errors.confirmPassword && <p className="text-red-500 text-sm mt-1">{errors.confirmPassword.message}</p>}
          </div>

          <button
            type="submit"
            className="w-full py-2 rounded-md bg-htb-accent text-black font-semibold bg-green-400 transition-all"
            disabled={loading}
          >
            {loading ? 'Signing Up...' : 'Sign Up'}
          </button>
        </form>
      </div>
    </div>
  );
}
