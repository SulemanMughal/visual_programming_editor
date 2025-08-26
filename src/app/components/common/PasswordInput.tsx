import React from 'react';
import Input from './Input';

import { FiEye, FiEyeOff } from 'react-icons/fi';


interface PasswordInputProps {
  label?: string;
  value?: string;
  error?: string;
  register?: any;
  showPassword: boolean;
  setShowPassword: (show: boolean) => void;
}

const PasswordInput: React.FC<PasswordInputProps> = ({
  label = 'Password',
  error,
  register,
  showPassword,
  setShowPassword,
}) => {
  return (
    <div className="relative">
      <Input
        label={label}
        type={showPassword ? 'text' : 'password'}
        {...register('password', { required: 'Password is required' })}
        error={error}
      />
      <button
        type="button"
        onClick={() => setShowPassword(!showPassword)}
        className="absolute right-3 top-[38px] text-gray-500 dark:text-gray-300"
      >
        {/* {showPassword ? 'Hide' : 'Show'} */}
                {showPassword ? <FiEyeOff size={20} /> : <FiEye size={20} />}

      </button>
    </div>
  );
};

export default PasswordInput;
