import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../config/database';
import config from '../config';
import { User, UserResponse, JWTPayload } from '../types';

/**
 * Register a new user
 */
export const registerUser = async (
  email: string,
  password: string,
  name: string
): Promise<{ user: UserResponse; token: string }> => {
  // Check if user already exists
  const existingUser = await query('SELECT id FROM users WHERE email = $1', [email]);

  if (existingUser.rows.length > 0) {
    throw new Error('User already exists with this email');
  }

  // Hash password
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  // Insert user with explicit storage_used = 0
  const result = await query(
    `INSERT INTO users (email, password_hash, name, storage_quota, storage_used)
     VALUES ($1, $2, $3, $4, 0)
     RETURNING id, email, name, role, storage_quota, storage_used, is_active, created_at, updated_at`,
    [email, passwordHash, name, config.quota.defaultUserQuota]
  );

  const user: UserResponse = result.rows[0];

  // Generate JWT token
  const token = generateToken(user);

  return { user, token };
};

/**
 * Login user
 */
export const loginUser = async (
  email: string,
  password: string
): Promise<{ user: UserResponse; token: string }> => {
  // Find user
  const result = await query(
    'SELECT * FROM users WHERE email = $1',
    [email]
  );

  if (result.rows.length === 0) {
    throw new Error('Invalid credentials');
  }

  const user: User = result.rows[0];

  // Check if user is active
  if (!user.is_active) {
    throw new Error('Account is deactivated');
  }

  // Verify password
  const isPasswordValid = await bcrypt.compareSync(password, user.password_hash);

  if (!isPasswordValid) {
    throw new Error('Invalid credentials');
  }

  // Update last login
  await query('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1', [user.id]);

  // Remove password from response
  const userResponse: UserResponse = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    storage_quota: user.storage_quota,
    storage_used: user.storage_used,
    is_active: user.is_active,
    created_at: user.created_at,
    updated_at: user.updated_at,
  };

  // Generate JWT token
  const token = generateToken(userResponse);

  return { user: userResponse, token };
};

/**
 * Generate JWT token
 */
const generateToken = (user: UserResponse): string => {
  const payload: JWTPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
  };

  return jwt.sign(payload, config.jwt.secret, { expiresIn: config.jwt.expiresIn } as any);
};

/**
 * Get user by ID
 */
export const getUserById = async (userId: string): Promise<UserResponse | null> => {
  const result = await query(
    'SELECT id, email, name, role, storage_quota, storage_used, is_active, created_at, updated_at FROM users WHERE id = $1',
    [userId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0];
};

/**
 * Update user profile
 */
export const updateUserProfile = async (
  userId: string,
  updates: { name?: string; email?: string }
): Promise<UserResponse> => {
  const fields: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (updates.name) {
    fields.push(`name = $${paramIndex++}`);
    values.push(updates.name);
  }

  if (updates.email) {
    // Check if email already exists
    const existingUser = await query(
      'SELECT id FROM users WHERE email = $1 AND id != $2',
      [updates.email, userId]
    );

    if (existingUser.rows.length > 0) {
      throw new Error('Email already in use');
    }

    fields.push(`email = $${paramIndex++}`);
    values.push(updates.email);
  }

  if (fields.length === 0) {
    throw new Error('No fields to update');
  }

  values.push(userId);

  const result = await query(
    `UPDATE users SET ${fields.join(', ')}
     WHERE id = $${paramIndex}
     RETURNING id, email, name, role, storage_quota, storage_used, is_active, created_at, updated_at`,
    values
  );

  return result.rows[0];
};

/**
 * Change user password
 */
export const changePassword = async (
  userId: string,
  oldPassword: string,
  newPassword: string
): Promise<void> => {
  // Get current password hash
  const result = await query('SELECT password_hash FROM users WHERE id = $1', [userId]);

  if (result.rows.length === 0) {
    throw new Error('User not found');
  }

  const user = result.rows[0];

  // Verify old password
  const isPasswordValid = await bcrypt.compare(oldPassword, user.password_hash);

  if (!isPasswordValid) {
    throw new Error('Current password is incorrect');
  }

  // Hash new password
  const salt = await bcrypt.genSalt(10);
  const newPasswordHash = await bcrypt.hash(newPassword, salt);

  // Update password
  await query('UPDATE users SET password_hash = $1 WHERE id = $2', [
    newPasswordHash,
    userId,
  ]);
};
