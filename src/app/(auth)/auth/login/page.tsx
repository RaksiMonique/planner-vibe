import type { Metadata } from 'next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { signInWithGoogle } from '@/features/auth/actions';
import { sanitizeNext } from '@/features/auth/schema';
import { LoginForm } from './login-form';
import { PasswordForm } from './password-form';

export const metadata: Metadata = { title: 'Sign in' };

const ERRORS: Record<string, string> = {
  callback: "That sign-in link didn't work. Request a new one.",
  oauth: "Google sign-in didn't complete. Try again.",
  not_allowed: 'This planner is private. That account is not on the allow list.',
};

export default async function LoginPage({ searchParams }: PageProps<'/auth/login'>) {
  const params = await searchParams;
  const next = sanitizeNext(typeof params.next === 'string' ? params.next : undefined);
  const error = typeof params.error === 'string' ? ERRORS[params.error] : undefined;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading text-2xl">Welcome back</CardTitle>
        <CardDescription>Sign in to open your planner.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {error && (
          <p
            role="alert"
            className="bg-destructive/10 text-destructive rounded-lg px-3 py-2 text-sm"
          >
            {error}
          </p>
        )}
        <form action={signInWithGoogle}>
          <input type="hidden" name="next" value={next} />
          <Button type="submit" variant="outline" className="w-full">
            Continue with Google
          </Button>
        </form>
        <div className="text-muted-foreground flex items-center gap-3 text-xs">
          <Separator className="flex-1" />
          or
          <Separator className="flex-1" />
        </div>
        <LoginForm next={next} />
        <div className="text-muted-foreground flex items-center gap-3 text-xs">
          <Separator className="flex-1" />
          or
          <Separator className="flex-1" />
        </div>
        <PasswordForm next={next} />
      </CardContent>
    </Card>
  );
}
