
import { LoginForm } from '@/components/auth/login-form';
import Link from 'next/link';

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8">
        <div>
          <h1 className="text-center text-3xl font-bold tracking-tight text-foreground">
            Sign in to your account
          </h1>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            Or{' '}
            <Link href="/signup" className="font-medium text-primary hover:underline">
              create a new account
            </Link>
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
