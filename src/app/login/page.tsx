"use client"

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import Input from '../components/common/Input';
import Link from 'next/link';
import PasswordInput from '../components/common/PasswordInput';
import Button from '../components/common/Button';
// import DarkModeToggle from '../components/common/DarkModeToggle';
import { login } from '../services/auth';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { notifyError, notifySuccess } from '../utils/toast';
import { ToastContainer } from 'react-toastify';

interface LoginFormInputs {
  email: string;
  password: string;
}

export default function Login() {
  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormInputs>();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const { setToken } = useAuth();

  const onSubmit = async (data: LoginFormInputs) => {
    setLoading(true);
    try {
      const res = await login(data.email, data.password);
      if (res.challenge === 'NEW_PASSWORD_REQUIRED') {
        router.replace(`/set-password?email=${encodeURIComponent(data.email)}&session=${encodeURIComponent(res.session)}`);
        return;
      }
      if (res.tokens?.access_token) {
        setToken(res.tokens.access_token);
      }
      notifySuccess('Login Successful!');
      setTimeout(() => {
        router.push('/dashboard');
      }, 1200);
      console.log(res);
    } catch (err: any) {
      notifyError(err.response?.data?.message || 'Login Failed!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 transition-colors duration-300">
      <ToastContainer />
      {/* <DarkModeToggle /> */}
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="w-full max-w-md bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg animate-fadeIn transition-colors duration-300"
      >
        <h2 className="text-2xl font-bold mb-6 text-center text-gray-800 dark:text-gray-100">
          Login
        </h2>

        <Input
          label="Email"
          type="email"
          {...register('email', { required: 'Email is required' })}
          error={errors.email?.message}
        />

        <PasswordInput
          label="Password"
          error={errors.password?.message}
          register={register}
          showPassword={showPassword}
          setShowPassword={setShowPassword}
        />

        <Button type="submit" loading={loading}>
          {loading ? 'Logging in...' : 'Login'}
        </Button>

        <div className="mt-4 text-center">
          <Link
            href="/forgot-password"
            className="text-htb-accent hover:underline hover:text-green-400 transition"
          >
            Forgot Password?
          </Link>
        </div>
      </form>
    </div>
  );
}
