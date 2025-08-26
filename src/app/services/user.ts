// src/app/services/user.ts
import http from './http';

export const getUser = async (id: string) => {
  const response = await http.get(`/users/${id}`);
  return response.data;
};

export const updateUser = async (id: string, data: any) => {
  const response = await http.put(`/users/${id}`, data);
  return response.data;
};

export const deleteUser = async (id: string) => {
  const response = await http.delete(`/users/${id}`);
  return response.data;
};

export const listUsers = async () => {
  const response = await http.get('/users');
  return response.data;
};
