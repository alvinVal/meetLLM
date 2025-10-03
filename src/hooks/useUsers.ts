'use client';

import { useState, useCallback, useEffect } from 'react';
import { User } from '@/types';

// Predefined colors for users
const USER_COLORS = [
  '#3B82F6', // blue
  '#10B981', // emerald  
  '#F59E0B', // amber
  '#EF4444', // red
  '#8B5CF6', // violet
  '#06B6D4', // cyan
  '#F97316', // orange
  '#84CC16', // lime
  '#EC4899', // pink
  '#6B7280', // gray
];

export function useUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load users from database
  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/users');
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
      const data = await response.json();
      setUsers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Error loading users:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load users on mount
  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const addUser = useCallback(async (name: string, email?: string) => {
    try {
      setError(null);
      const userData = {
        name: name.trim(),
        email: email?.trim(),
        color: USER_COLORS[users.length % USER_COLORS.length],
      };

      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        throw new Error('Failed to create user');
      }

      const newUser = await response.json();
      setUsers(prev => [...prev, newUser]);
      return newUser;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Error creating user:', err);
      throw err;
    }
  }, [users.length]);

  const updateUser = useCallback(async (userId: string, updates: Partial<User>) => {
    try {
      setError(null);
      const response = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error('Failed to update user');
      }

      const updatedUser = await response.json();
      setUsers(prev => prev.map(user => 
        user.id === userId ? updatedUser : user
      ));
      return updatedUser;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Error updating user:', err);
      throw err;
    }
  }, []);

  const deleteUser = useCallback(async (userId: string) => {
    try {
      setError(null);
      const response = await fetch(`/api/users?userId=${userId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete user');
      }

      setUsers(prev => prev.filter(user => user.id !== userId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Error deleting user:', err);
      throw err;
    }
  }, []);

  const getUserById = useCallback((userId: string) => {
    return users.find(user => user.id === userId);
  }, [users]);

  const getUserByName = useCallback((name: string) => {
    return users.find(user => user.name.toLowerCase() === name.toLowerCase());
  }, [users]);

  const refreshUsers = useCallback(() => {
    loadUsers();
  }, [loadUsers]);

  return {
    users,
    loading,
    error,
    addUser,
    updateUser,
    deleteUser,
    getUserById,
    getUserByName,
    refreshUsers,
  };
}
