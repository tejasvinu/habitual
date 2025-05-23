
'use server';

import { revalidatePath } from 'next/cache';
import { getDb } from '@/lib/mongodb';
import { SignUpSchema, SignInSchema, type SignUpInput, type User } from './schema';
import { hashPassword, verifyPassword } from './utils';
import { ObjectId } from 'mongodb';


export async function signUp(input: SignUpInput): Promise<{ success: boolean; error?: string; userId?: string }> {
  const validation = SignUpSchema.safeParse(input);
  if (!validation.success) {
    return { success: false, error: validation.error.errors.map(e => e.message).join(', ') };
  }

  const { email, password } = validation.data;

  try {
    const db = await getDb();
    const usersCollection = db.collection<Omit<User, 'id'>>('users');

    const existingUser = await usersCollection.findOne({ email });
    if (existingUser) {
      return { success: false, error: 'User with this email already exists.' };
    }

    const hashedPassword = await hashPassword(password);
    const now = new Date();

    const result = await usersCollection.insertOne({
      email,
      hashedPassword,
      createdAt: now,
      updatedAt: now,
      points: 0, // Initialize points
    });

    if (!result.insertedId) {
        return { success: false, error: 'Failed to create user account.' };
    }
    
    return { success: true, userId: result.insertedId.toHexString() };

  } catch (error) {
    console.error('Sign up error:', error);
    return { success: false, error: 'An unexpected error occurred during sign up.' };
  }
}

export async function signIn(input: { email: string, password: string }): Promise<{ success: boolean; error?: string; user?: Pick<User, 'id' | 'email' | 'points'> }> {
  const validation = SignInSchema.safeParse(input);
  if (!validation.success) {
    return { success: false, error: validation.error.errors.map(e => e.message).join(', ') };
  }
  
  const { email, password } = validation.data;

  try {
    const db = await getDb();
    const usersCollection = db.collection<Omit<User, 'id'> & { _id: ObjectId, points?: number }>('users');
    const user = await usersCollection.findOne({ email });

    if (!user) {
      return { success: false, error: 'Invalid email or password.' };
    }

    const isValidPassword = await verifyPassword(password, user.hashedPassword);
    if (!isValidPassword) {
      return { success: false, error: 'Invalid email or password.' };
    }
    
    return { success: true, user: { id: user._id.toHexString(), email: user.email, points: user.points ?? 0 } };

  } catch (error) {
    console.error('Sign in error:', error);
    return { success: false, error: 'An unexpected error occurred during sign in.' };
  }
}
