
'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Loader2, LogIn } from 'lucide-react';

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
import { SignUpSchema, type SignUpInput } from '@/lib/auth/schema';
import { signUp } from '@/lib/auth/actions';
import { useRouter } from 'next/navigation';

export function SignUpForm() {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<SignUpInput>({
    resolver: zodResolver(SignUpSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  async function onSubmit(values: SignUpInput) {
    setIsSubmitting(true);
    try {
      const result = await signUp(values);
      if (result.success) {
        toast({
          title: 'Account Created!',
          description: 'Your account has been successfully created. Please log in.',
        });
        router.push('/login'); // Redirect to login page on successful sign-up
      } else {
        toast({
          variant: 'destructive',
          title: 'Sign Up Failed',
          description: result.error || 'An unexpected error occurred.',
        });
      }
    } catch (error) {
      console.error('Sign up form error:', error);
      toast({
        variant: 'destructive',
        title: 'Sign Up Error',
        description: 'An unexpected error occurred.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating Account...
            </>
          ) : (
            <>
              <LogIn className="mr-2 h-4 w-4" />
              Sign Up
            </>
          )}
        </Button>
      </form>
    </Form>
  );
}
