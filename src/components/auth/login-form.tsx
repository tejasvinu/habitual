
'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Loader2, LogIn } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { SignInSchema, type SignInInput, type User } from '@/lib/auth/schema';
import { signIn } from '@/lib/auth/actions';
import { useAuth } from '@/context/auth-context'; // Import useAuth

export function LoginForm() {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const { loginUser } = useAuth(); // Get loginUser from AuthContext

  const form = useForm<SignInInput>({
    resolver: zodResolver(SignInSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  async function onSubmit(values: SignInInput) {
    setIsSubmitting(true);
    try {
      const result = await signIn(values);
      if (result.success && result.user) {
        // Cast result.user to User type expected by loginUser
        const userToLogin: User = {
            id: result.user.id,
            email: result.user.email,
            // These fields are not returned by signIn action but are part of User schema
            // For client-side session, only id and email are strictly necessary from signIn result
            // Set dummy/default values or adjust User type for client session if needed
            hashedPassword: '', // Not stored client-side
            createdAt: new Date(), // Placeholder
            updatedAt: new Date(), // Placeholder
        };
        loginUser(userToLogin); // Set user in AuthContext
        toast({
          title: 'Signed In!',
          description: `Welcome back, ${result.user.email}!`,
        });
        router.push('/'); 
      } else {
        toast({
          variant: 'destructive',
          title: 'Sign In Failed',
          description: result.error || 'Invalid credentials or an unexpected error occurred.',
        });
      }
    } catch (error) {
      console.error('Sign in form error:', error);
      toast({
        variant: 'destructive',
        title: 'Sign In Error',
        description: 'An unexpected error occurred.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4"> {/* Adjusted space-y from 6 to 4 */}
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="name@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input type="password" placeholder="********" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full !mt-6" disabled={isSubmitting}> {/* Added !mt-6 for specific spacing */}
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Signing In...
            </>
          ) : (
            <>
              <LogIn className="mr-2 h-4 w-4" />
              Sign In
            </>
          )}
        </Button>
      </form>
    </Form>
  );
}
