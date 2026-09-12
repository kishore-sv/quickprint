"use client";

import { useState } from "react";
import { cn } from "cn";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { LinkButton } from "@/components/ui/link-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Spinner } from "@/components/ui/spinner";
import { GoogleIcon } from "mmk-icons";

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const busy = loading || guestLoading || googleLoading;

  const onGoogle = async () => {
    setGoogleLoading(true);
    setError(null);
    const { error: err } = await authClient.signIn.social({
      provider: "google",
      callbackURL: "/home",
    });
    setGoogleLoading(false);
    if (err) setError(err.message ?? "Google sign in failed");
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error: err } = await authClient.signIn.email({ email, password });
    setLoading(false);
    if (err) setError(err.message ?? "Sign in failed");
    else window.location.href = "/home";
  };

  const onGuest = async () => {
    setGuestLoading(true);
    setError(null);
    const { error: err } = await authClient.signIn.anonymous();
    setGuestLoading(false);
    if (err) setError(err.message ?? "Could not continue as guest");
    else window.location.href = "/home";
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Welcome back</CardTitle>
          <CardDescription>Sign in to QuickPrint with Google or email</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit}>
            <FieldGroup>
              <Field>
                <Button
                  variant="outline"
                  type="button"
                  className="w-full"
                  disabled={busy}
                  onClick={() => void onGoogle()}
                >
                  {googleLoading ? (
                    <>
                      <Spinner className="size-4" />
                      Redirecting to Google…
                    </>
                  ) : (
                    <>
                      <GoogleIcon className="text-primary" />
                      Login with Google
                    </>
                  )}
                </Button>
              </Field>
              <FieldSeparator className="*:data-[slot=field-separator-content]:bg-card">
                Or continue with
              </FieldSeparator>
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  disabled={busy}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <PasswordInput
                  id="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  disabled={busy}
                />
              </Field>
              {error && (
                <p className="text-destructive text-center text-sm" role="alert">
                  {error}
                </p>
              )}
              <Field>
                <Button type="submit" className="w-full" disabled={busy}>
                  {loading ? (
                    <>
                      <Spinner className="size-4" />
                      Signing in…
                    </>
                  ) : (
                    "Login"
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="mt-2 w-full normal-case tracking-normal"
                  disabled={busy}
                  onClick={() => void onGuest()}
                >
                  {guestLoading ? (
                    <>
                      <Spinner className="size-4" />
                      Continuing…
                    </>
                  ) : (
                    "Continue as guest"
                  )}
                </Button>
                <FieldDescription className="text-center">
                  Don&apos;t have an account?{" "}
                  <LinkButton href="/sign-up" variant="link" size="sm" className="h-auto p-0">
                    Sign up
                  </LinkButton>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
      <FieldDescription className="px-6 text-center">
        Print documents without waiting in line.
      </FieldDescription>
    </div>
  );
}
