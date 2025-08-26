
// src/app/services/auth.ts
import http from './http';

export const login = async (email: string, password: string) => {
  const response = await http.post('/auth/login/', { email, password });
  if (response.data.tokens) {
    localStorage.setItem('token', response.data.tokens.access_token);
    localStorage.setItem('id_token', response.data.tokens.id_token);
  }
  return response.data;
};

export const logout = () => {
  localStorage.removeItem('token');
};

export const register = async (email: string, password: string, name: string, confirm_password: string) => {
  const response = await http.post('/auth/register/', { email, password, name, confirm_password });
  return response.data;
};


export const forgotPassword = async (username: string) => {
  const response = await http.post('/auth/forgot-password/', { username });
  return response.data;
};


export const resetPassword = async (username: string, code: string, new_password: string, confirm_password: string) => {
  const response = await http.post('/auth/reset-password/', {
    username,
    code,
    new_password,
    confirm_password,
  });
  return response.data;
};


export const confirmOtp = async (username: string, otp: string) => {
  const response = await http.post('/auth/confirm-otp/', {
    username,
    otp,
  });
  return response.data;
};


export const setPassword = async (username: string, new_password: string, confirm_password: string, session: string) => {
  const response = await http.post('/auth/set-password/', {
    username,
    new_password,
    confirm_password,
    session,
  });
  return response.data;
};



export const getProfile = async () => {
  const response = await http.get('/auth/profile');
  return response.data;
};


