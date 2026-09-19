"use client";

import Link from "next/link";
import { useState } from "react";
import { cn } from "cn";
import { appCallbackUrl, authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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

export function SignupForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const busy = loading || googleLoading;

  const onGoogle = async () => {
    if (!termsAccepted) {
      setError("Please accept the Terms of Service and Privacy Policy to continue.");
      return;
    }
    setGoogleLoading(true);
    setError(null);
    const { error: err } = await authClient.signIn.social({
      provider: "google",
      callbackURL: appCallbackUrl("/home"),
    });
    setGoogleLoading(false);
    if (err) setError(err.message ?? "Google sign up failed");
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!termsAccepted) {
      setError("Please accept the Terms of Service and Privacy Policy to continue.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setLoading(true);
    const { error: err } = await authClient.signUp.email({ email, password, name });
    setLoading(false);
    if (err) setError(err.message ?? "Sign up failed");
    else window.location.href = "/home";
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Create your account on QuickPrint</CardTitle>
          <CardDescription>Join QuickPrint with Google or email</CardDescription>
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
                      Sign up with Google
                    </>
                  )}
                </Button>
              </Field>
              <FieldSeparator className="*:data-[slot=field-separator-content]:bg-card">
                Or continue with
              </FieldSeparator>
              <Field>
                <FieldLabel htmlFor="name">Full Name</FieldLabel>
                <Input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  disabled={busy}
                />
              </Field>
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
                <Field className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="password">Password</FieldLabel>
                    <PasswordInput
                      id="password"
                      required
                      minLength={8}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="new-password"
                      disabled={busy}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="confirm-password">Confirm Password</FieldLabel>
                    <PasswordInput
                      id="confirm-password"
                      required
                      minLength={8}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      autoComplete="new-password"
                      disabled={busy}
                    />
                  </Field>
                </Field>
                <FieldDescription>Must be at least 8 characters long.</FieldDescription>
              </Field>
              <Field className="gap-3">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="terms-accepted"
                    checked={termsAccepted}
                    onCheckedChange={(checked) => setTermsAccepted(checked === true)}
                    disabled={busy}
                    aria-describedby="terms-accepted-description"
                  />
                  <label
                    id="terms-accepted-description"
                    htmlFor="terms-accepted"
                    className="text-muted-foreground text-sm leading-relaxed"
                  >
                    By creating an account, you agree to our{" "}
                    <Link className="text-primary underline-offset-4 hover:underline" href="/terms">
                      Terms of Service
                    </Link>
                    ,{" "}
                    <Link className="text-primary underline-offset-4 hover:underline" href="/refunds">
                      Refunds Policy
                    </Link>
                    , and acknowledge our{" "}
                    <Link className="text-primary underline-offset-4 hover:underline" href="/policy">
                      Privacy Policy
                    </Link>
                    .
                  </label>
                </div>
              </Field>
              {error && (
                <p className="text-destructive text-center text-sm" role="alert">
                  {error}
                </p>
              )}
              <Field>
                <Button type="submit" className="w-full" disabled={busy || !termsAccepted}>
                  {loading ? (
                    <>
                      <Spinner className="size-4" />
                      Creating account…
                    </>
                  ) : (
                    "Create Account"
                  )}
                </Button>
                <FieldDescription className="text-center">
                  Already have an account?{" "}
                  <LinkButton href="/sign-in" variant="link" size="sm" className="h-auto p-0 shadow-none">
                    Sign in
                  </LinkButton>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
