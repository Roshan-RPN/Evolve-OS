import Link from "next/link";
import { UserPlus, ChevronLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { CoachAvatar } from "@/components/coach-avatar";
import { APP_NAME } from "@/lib/brand";

export const dynamic = "force-dynamic";

const ERRORS: Record<string, string> = {
  "1": "Email or password is wrong.",
  taken: "That email or name is already taken.",
  name: "Pick a name (40 characters max).",
  email: "That email doesn't look right.",
  short: "Password needs at least 4 characters.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string; mode?: string }>;
}) {
  const { next = "/", error, mode } = await searchParams;
  const creating = mode === "signup";

  return (
    <div className="bg-app flex min-h-screen items-center justify-center p-6">
      <div className="card-elevated w-full max-w-sm p-7">
        <div className="mb-6 flex flex-col items-center text-center">
          <CoachAvatar mood="happy" size={88} />
          <h1 className="mt-4 font-display text-2xl font-semibold">{APP_NAME}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {creating ? "Create your account" : "Sign in to continue"}
          </p>
        </div>

        {creating ? (
          <form action="/api/auth/register" method="POST" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" autoFocus required maxLength={40} placeholder="Your name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required placeholder="you@example.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" required minLength={4} placeholder="••••••••" />
            </div>
            {error && <p className="text-sm text-destructive">{ERRORS[error] ?? ERRORS["1"]}</p>}
            <Button type="submit" className="w-full grad-violet border-0 text-white">
              Create account
            </Button>
            <Link
              href="/login"
              className="flex items-center justify-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ChevronLeft className="size-4" /> Back to sign in
            </Link>
          </form>
        ) : (
          <form action="/api/auth/login" method="POST" className="space-y-4">
            <input type="hidden" name="next" value={next} />
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" autoFocus required placeholder="you@example.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" required placeholder="••••••••" />
            </div>
            {error && <p className="text-sm text-destructive">{ERRORS[error] ?? ERRORS["1"]}</p>}
            <Button type="submit" className="w-full grad-violet border-0 text-white">
              Sign in
            </Button>
            <Link
              href="/login?mode=signup"
              className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <UserPlus className="size-4" /> Create an account
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
