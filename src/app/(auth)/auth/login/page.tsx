import type { Metadata } from 'next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { env } from '@/env';
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
  const google = env.AUTH_GOOGLE === 'true';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading text-2xl">Welcome back</CardTitle>
        <CardDescription>Sign in with your email and password.</CardDescription>
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
        <PasswordForm next={next} />
        {google && (
          <>
            <div className="text-muted-foreground flex items-center gap-3 text-xs">
              <Separator className="flex-1" />
              or
              <Separator className="flex-1" />
            </div>
            <form action={signInWithGoogle}>
              <input type="hidden" name="next" value={next} />
              <Button type="submit" variant="outline" className="w-full">
                Continue with Google
              </Button>
            </form>
          </>
        )}
        <details className="text-sm">
          <summary className="text-muted-foreground cursor-pointer underline-offset-4 hover:underline">
            No password yet, or forgotten it? Email me a sign-in link
          </summary>
          <div className="flex flex-col gap-3 pt-3">
            <p className="text-muted-foreground text-xs">
              Open the link on this device, then set a password under Settings.
            </p>
            <LoginForm next={next} />
          </div>
        </details>
      </CardContent>
    </Card>
  );
}
