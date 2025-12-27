
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { User } from './types';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';

// Prevent the 'supabaseUrl is required' error by only initializing if keys are present
export const supabase: SupabaseClient | null = SUPABASE_URL && SUPABASE_ANON_KEY 
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) 
  : null;

if (!supabase) {
  console.warn("VitalTrack: Supabase keys missing. Falling back to Mock Auth (Local Storage).");
}

const MOCK_USERS_KEY = 'vt_mock_users_db';
const MOCK_SESSION_KEY = 'vt_mock_session';

export const authService = {
  register: async (email: string, pass: string, name: string): Promise<User | string> => {
    if (supabase) {
      try {
        const { data, error } = await supabase.auth.signUp({
          email,
          password: pass,
          options: { data: { full_name: name } },
        });
        if (error) return error.message;
        if (!data.user) return "An unexpected error occurred.";
        return {
          id: data.user.id,
          email: data.user.email || '',
          name: data.user.user_metadata?.full_name || name,
        };
      } catch (e: any) {
        return e.message || "Registration failed.";
      }
    } else {
      // Mock Implementation
      const users = JSON.parse(localStorage.getItem(MOCK_USERS_KEY) || '[]');
      if (users.find((u: any) => u.email === email)) return "Email already exists (Mock).";
      const newUser = { id: 'mock-' + Math.random().toString(36).substr(2, 9), email, pass, name };
      users.push(newUser);
      localStorage.setItem(MOCK_USERS_KEY, JSON.stringify(users));
      const publicUser = { id: newUser.id, email: newUser.email, name: newUser.name };
      localStorage.setItem(MOCK_SESSION_KEY, JSON.stringify(publicUser));
      return publicUser;
    }
  },

  login: async (email: string, pass: string): Promise<User | string> => {
    if (supabase) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
        if (error) return error.message;
        if (!data.user) return "Invalid credentials.";
        return {
          id: data.user.id,
          email: data.user.email || '',
          name: data.user.user_metadata?.full_name || 'User',
        };
      } catch (e: any) {
        return e.message || "Login failed.";
      }
    } else {
      // Mock Implementation
      const users = JSON.parse(localStorage.getItem(MOCK_USERS_KEY) || '[]');
      const user = users.find((u: any) => u.email === email && u.pass === pass);
      if (!user) return "Invalid email or password (Mock).";
      const publicUser = { id: user.id, email: user.email, name: user.name };
      localStorage.setItem(MOCK_SESSION_KEY, JSON.stringify(publicUser));
      return publicUser;
    }
  },

  logout: async () => {
    if (supabase) {
      await supabase.auth.signOut();
    } else {
      localStorage.removeItem(MOCK_SESSION_KEY);
    }
  },

  getCurrentUser: async (): Promise<User | null> => {
    if (supabase) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      return {
        id: user.id,
        email: user.email || '',
        name: user.user_metadata?.full_name || 'User',
      };
    } else {
      const session = localStorage.getItem(MOCK_SESSION_KEY);
      return session ? JSON.parse(session) : null;
    }
  }
};
