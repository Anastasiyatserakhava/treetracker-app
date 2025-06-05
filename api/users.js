import { supabase, corsHeaders } from '../lib/supabase.js';
import bcrypt from 'bcryptjs';

export default async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).json({});
  }

  // Set CORS headers
  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  if (req.method === 'POST') {
    try {
      const { name, email, graduation, password } = req.body;

      if (!name || !email || !password) {
        return res.status(400).json({
          success: false,
          error: 'Name, email, and password are required'
        });
      }

      // Check if user already exists
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', email.toLowerCase())
        .single();

      if (existingUser) {
        return res.status(409).json({
          success: false,
          error: 'User with this email already exists'
        });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 12);

      // Create user
      const { data: user, error } = await supabase
        .from('users')
        .insert({
          name: name.trim(),
          email: email.toLowerCase().trim(),
          graduation_year: graduation ? parseInt(graduation) : null,
          password_hash: passwordHash
        })
        .select('id, name, email, graduation_year, is_admin')
        .single();

      if (error) {
        console.error('Supabase error:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to create user account'
        });
      }

      return res.status(201).json({
        success: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          graduation: user.graduation_year,
          isAdmin: user.is_admin
        }
      });

    } catch (error) {
      console.error('User creation error:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  if (req.method === 'GET') {
    try {
      const { data: users, error } = await supabase
        .from('users')
        .select('id, name, email, graduation_year, is_admin, created_at')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return res.status(200).json({
        success: true,
        users: users.map(user => ({
          id: user.id,
          name: user.name,
          email: user.email,
          graduation: user.graduation_year,
          isAdmin: user.is_admin,
          createdAt: user.created_at
        }))
      });

    } catch (error) {
      console.error('Get users error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch users'
      });
    }
  }

  return res.status(405).json({
    success: false,
    error: 'Method not allowed'
  });
}
