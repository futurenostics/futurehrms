'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  AlertCircle,
  ArrowRight,
  Briefcase,
  Calendar,
  CreditCard,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  LogIn,
  Mail,
  MessageCircle,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { loginInputSchema, type LoginInput } from '@futurenostics/types';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Logo } from '@/components/brand/logo';
import { classifyLoginError, login, type LoginError } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { ForgotPasswordDialog } from './forgot-password-dialog';

const LAST_EMAIL_STORAGE_KEY = 'fn:login:lastEmail';
const DEFAULT_REDIRECT = '/dashboard';

/**
 * Internal-only redirect target. Defends against open-redirect via the
 * ?from query param — anything that isn't a relative path rooted at "/"
 * falls back to the dashboard.
 */
function safeReturnTo(value: string | null | undefined): string {
  if (!value) return DEFAULT_REDIRECT;
  if (!value.startsWith('/')) return DEFAULT_REDIRECT;
  if (value.startsWith('//')) return DEFAULT_REDIRECT;
  if (value.includes('://')) return DEFAULT_REDIRECT;
  if (value.startsWith('/\\')) return DEFAULT_REDIRECT;
  return value;
}

export function LoginCard() {
  return (
    <div
      className="border-fn-border bg-fn-bg-panel rounded-fn-xl grid w-full max-w-[1280px] grid-cols-1 overflow-hidden border md:grid-cols-2"
      style={{ boxShadow: 'var(--fn-auth-card-shadow)' }}
    >
      <LoginForm />
      <PromoPanel />
    </div>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rememberCheckboxId = useId();

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<LoginError | null>(null);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const [forgotOpen, setForgotOpen] = useState(false);

  // Refs for programmatic focus after pre-fill hydrates from localStorage.
  const emailInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const hydratedRef = useRef(false);

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginInputSchema),
    mode: 'onBlur',
    defaultValues: { email: '', password: '', rememberMe: false },
  });
  const { isSubmitting } = form.formState;

  // Hydrate the email pre-fill + remember-me checkbox from localStorage
  // once on mount, then focus the right field. Wrapped in a ref guard so
  // strict-mode double-effects don't double-focus.
  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;
    let stored: string | null = null;
    try {
      stored = window.localStorage.getItem(LAST_EMAIL_STORAGE_KEY);
    } catch {
      // localStorage can throw under quota/privacy modes — ignore.
    }
    if (stored) {
      form.reset({ email: stored, password: '', rememberMe: true });
      passwordInputRef.current?.focus();
    } else {
      emailInputRef.current?.focus();
    }
  }, [form]);

  // Drive a 1s tick while the form is in a cooldown so the countdown
  // re-renders. Stops itself when the cooldown clears.
  useEffect(() => {
    if (!error?.retryAt) return;
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [error?.retryAt]);

  const cooldownActive = Boolean(error?.retryAt && error.retryAt.getTime() > nowMs);
  const submitDisabled = isSubmitting || cooldownActive;

  const onSubmit = useCallback(
    async (values: LoginInput) => {
      setError(null);
      try {
        const user = await login(values);

        try {
          if (values.rememberMe) {
            window.localStorage.setItem(LAST_EMAIL_STORAGE_KEY, values.email);
          } else {
            window.localStorage.removeItem(LAST_EMAIL_STORAGE_KEY);
          }
        } catch {
          // ignore — see above
        }

        toast.success(`Welcome back${user.fullName ? `, ${user.fullName.split(' ')[0]}` : ''}.`);

        const target = safeReturnTo(searchParams.get('from'));
        router.replace(target);
        router.refresh();
      } catch (err) {
        const classified = classifyLoginError(err);
        setError(classified);
        setNowMs(Date.now());
        // Clear the password so the user retypes — never the email, so
        // remember-me'd users don't have to type it again on a typo.
        form.setValue('password', '');
        passwordInputRef.current?.focus();
      }
    },
    [form, router, searchParams],
  );

  return (
    <div className="bg-fn-bg-panel px-fn-8 py-fn-10 md:px-fn-16 md:py-fn-12 flex flex-col">
      <Logo size="sm" />

      <div className="mx-auto flex w-full max-w-[380px] flex-1 flex-col justify-center">
        <HeroIcon />
        <h1 className="text-fn-fg font-fn-semibold tracking-fn-tight text-center text-[24px]">
          Login to your account!
        </h1>
        <p className="text-fn-fg-muted mt-fn-2 leading-fn-relaxed mx-auto max-w-[320px] text-center text-[13.5px]">
          Enter your registered email address and password to login.
        </p>

        {/* aria-live region is always rendered so the role is announced
            consistently when an error appears or updates. */}
        <div aria-live="polite" aria-atomic="true" className="mt-fn-6 empty:hidden">
          {error && <ErrorBanner error={error} nowMs={nowMs} />}
        </div>

        <Form {...form}>
          <form
            noValidate
            onSubmit={form.handleSubmit(onSubmit)}
            className={cn('mt-fn-4 gap-fn-4 flex flex-col', error ? 'mt-fn-3' : 'mt-fn-8')}
          >
            <FormField
              control={form.control}
              name="email"
              render={({ field: { ref, ...field } }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <InputWithIcon
                      icon={<Mail className="text-fn-fg-faint h-fn-4 w-fn-4" />}
                      type="email"
                      autoComplete="email"
                      placeholder="eg. asma.ali@futurenostics.com"
                      disabled={isSubmitting}
                      ref={(node) => {
                        ref(node);
                        emailInputRef.current = node;
                      }}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field: { ref, ...field } }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <InputWithIcon
                      icon={<Lock className="text-fn-fg-faint h-fn-4 w-fn-4" />}
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      placeholder="••••••••••••"
                      disabled={isSubmitting}
                      ref={(node) => {
                        ref(node);
                        passwordInputRef.current = node;
                      }}
                      suffix={
                        <button
                          type="button"
                          tabIndex={-1}
                          onClick={() => setShowPassword((v) => !v)}
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                          className="text-fn-fg-faint hover:text-fn-fg-muted cursor-pointer"
                        >
                          {showPassword ? (
                            <EyeOff className="h-fn-3_5 w-fn-3_5" />
                          ) : (
                            <Eye className="h-fn-3_5 w-fn-3_5" />
                          )}
                        </button>
                      }
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="mt-fn-0_5 flex items-center justify-between">
              <FormField
                control={form.control}
                name="rememberMe"
                render={({ field }) => (
                  <label
                    htmlFor={rememberCheckboxId}
                    className="text-fn-fg-muted gap-fn-2 inline-flex cursor-pointer select-none items-center text-[13px]"
                  >
                    <Checkbox
                      id={rememberCheckboxId}
                      checked={field.value}
                      onCheckedChange={(v) => field.onChange(v === true)}
                      disabled={isSubmitting}
                    />
                    Remember me
                  </label>
                )}
              />
              <button
                type="button"
                onClick={() => setForgotOpen(true)}
                className="text-fn-accent-soft-fg focus-visible:ring-fn-accent rounded-fn-xs font-fn-semibold cursor-pointer text-[13px] hover:underline focus-visible:outline-none focus-visible:ring-2"
              >
                Forgot Password?
              </button>
            </div>

            <Button
              type="submit"
              size="lg"
              disabled={submitDisabled}
              className="rounded-fn-sm mt-fn-1_5 font-fn-semibold tracking-fn-tight h-[46px] text-[14px]"
              style={{
                boxShadow: '0 4px 10px -2px color-mix(in oklch, var(--fn-accent) 45%, transparent)',
              }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-fn-4 w-fn-4 animate-spin" />
                  Signing in…
                </>
              ) : (
                <>
                  Login
                  <ArrowRight className="h-fn-4 w-fn-4" />
                </>
              )}
            </Button>

            <div className="text-fn-fg-faint mt-fn-1_5 gap-fn-3 flex items-center text-[12px]">
              <div className="bg-fn-divider h-px flex-1" />
              Or login with
              <div className="bg-fn-divider h-px flex-1" />
            </div>

            <div className="gap-fn-2_5 grid grid-cols-3">
              <SocialStub kind="google" />
              <SocialStub kind="apple" />
              <SocialStub kind="microsoft" />
            </div>
          </form>
        </Form>
      </div>

      <div className="text-fn-fg-faint flex justify-between text-[11.5px]">
        <span>© 2026 Futurenostics</span>
        <span className="gap-fn-3_5 flex">
          <button type="button" className="hover:text-fn-fg-muted cursor-pointer">
            Privacy
          </button>
          <button type="button" className="hover:text-fn-fg-muted cursor-pointer">
            Status
          </button>
          <span className="font-mono">v0.7.2-beta</span>
        </span>
      </div>

      <ForgotPasswordDialog open={forgotOpen} onOpenChange={setForgotOpen} />
    </div>
  );
}

/* ---------- Error banner ---------- */

function ErrorBanner({ error, nowMs }: { error: LoginError; nowMs: number }) {
  const detail = formatCooldownSuffix(error.retryAt, nowMs);
  const message = detail ? `${error.message} ${detail}` : error.message;
  return (
    <div
      role="alert"
      className="bg-fn-danger-soft text-fn-danger-soft-fg rounded-fn-sm gap-fn-2 px-fn-3 py-fn-2_5 leading-fn-snug flex items-start text-[12px]"
    >
      <AlertCircle className="h-fn-3_5 w-fn-3_5 mt-px shrink-0" />
      <span>{message}</span>
    </div>
  );
}

function formatCooldownSuffix(retryAt: Date | undefined, nowMs: number): string | null {
  if (!retryAt) return null;
  const msLeft = retryAt.getTime() - nowMs;
  if (msLeft <= 0) return null;
  if (msLeft > 60_000) {
    const time = retryAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return `Try again at ${time}.`;
  }
  const seconds = Math.ceil(msLeft / 1000);
  return `Try again in ${seconds}s.`;
}

function HeroIcon() {
  return (
    <div className="mb-fn-7 relative flex flex-col items-center">
      <div
        aria-hidden
        className="-top-fn-2_5 pointer-events-none absolute left-1/2 h-[140px] w-[360px] -translate-x-1/2 opacity-50"
        style={{
          backgroundImage: `
            linear-gradient(to right, color-mix(in oklch, var(--fn-accent) 18%, transparent) 1px, transparent 1px),
            linear-gradient(to bottom, color-mix(in oklch, var(--fn-accent) 18%, transparent) 1px, transparent 1px)
          `,
          backgroundSize: '32px 32px',
          maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 70%)',
          WebkitMaskImage: 'radial-gradient(ellipse at center, black 30%, transparent 70%)',
        }}
      />
      <div
        className="rounded-fn-lg h-fn-16 w-fn-16 relative z-[1] flex items-center justify-center"
        style={{
          background: 'linear-gradient(135deg, var(--fn-accent) 0%, oklch(0.45 0.20 280) 100%)',
          boxShadow:
            '0 12px 24px -6px color-mix(in oklch, var(--fn-accent) 50%, transparent), 0 4px 8px -2px rgba(40, 30, 70, 0.12)',
        }}
      >
        {/* Brand mark stays white in both themes — it sits on the accent-gradient
            tile which is dark in both modes. fn-fg-invert flips with the theme
            and wouldn't read against the gradient in dark mode. */}
        {/* eslint-disable-next-line fn-tokens/no-default-utilities */}
        <LogIn className="h-fn-7 w-fn-7 text-white" strokeWidth={2} />
      </div>
    </div>
  );
}

interface InputWithIconProps extends React.ComponentProps<typeof Input> {
  icon: React.ReactNode;
  suffix?: React.ReactNode;
}

function InputWithIcon({ icon, suffix, className, ...props }: InputWithIconProps) {
  return (
    <div className="relative">
      <span className="left-fn-3 pointer-events-none absolute top-1/2 -translate-y-1/2">
        {icon}
      </span>
      <Input className={cn('pl-fn-9 h-[42px]', suffix ? 'pr-fn-10' : '', className)} {...props} />
      {suffix && <span className="right-fn-3 absolute top-1/2 -translate-y-1/2">{suffix}</span>}
    </div>
  );
}

function SocialStub({ kind }: { kind: 'google' | 'apple' | 'microsoft' }) {
  return (
    <button
      type="button"
      onClick={() => toast.info('Single sign-on integrations coming soon.')}
      className="rounded-fn-sm border-fn-border-strong bg-fn-bg-panel hover:bg-fn-bg-subtle focus-visible:ring-fn-accent inline-flex h-[50px] cursor-pointer items-center justify-center border transition-colors focus-visible:outline-none focus-visible:ring-2"
      aria-label={`Sign in with ${kind}`}
    >
      {kind === 'google' && <GoogleGlyph />}
      {kind === 'apple' && <AppleGlyph />}
      {kind === 'microsoft' && <MicrosoftGlyph />}
    </button>
  );
}

function GoogleGlyph() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

function AppleGlyph() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="currentColor"
      style={{ color: 'var(--fn-fg)' }}
      aria-hidden
    >
      <path d="M17.05 12.04c-.03-3.07 2.5-4.54 2.61-4.61-1.42-2.08-3.64-2.37-4.43-2.4-1.89-.19-3.68 1.11-4.64 1.11-.97 0-2.44-1.08-4-1.05-2.06.03-3.96 1.2-5.02 3.04-2.14 3.72-.55 9.21 1.54 12.22 1.02 1.47 2.24 3.13 3.85 3.07 1.55-.06 2.13-1 4-1 1.86 0 2.4 1 4.03.97 1.66-.03 2.71-1.5 3.73-2.98 1.17-1.71 1.65-3.37 1.68-3.45-.04-.02-3.22-1.24-3.35-4.92zM14.36 3.61c.86-1.04 1.43-2.48 1.27-3.92-1.23.05-2.71.82-3.6 1.85-.8.92-1.49 2.39-1.3 3.79 1.37.11 2.77-.7 3.63-1.72z" />
    </svg>
  );
}

function MicrosoftGlyph() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
      <path fill="#F25022" d="M1 1h10v10H1z" />
      <path fill="#7FBA00" d="M13 1h10v10H13z" />
      <path fill="#00A4EF" d="M1 13h10v10H1z" />
      <path fill="#FFB900" d="M13 13h10v10H13z" />
    </svg>
  );
}

function PromoPanel() {
  // Satellites in compass order. r is the orbit radius from center; the
  // top + bottom satellites sit slightly closer in than the diagonals,
  // matching the design's vertical compression.
  // Each satellite picks a semantic colorway from the token palette so
  // the tile background and icon foreground both adapt to dark mode.
  type SatTone = 'neutral' | 'mint' | 'teal' | 'blue' | 'coral' | 'violet';
  const sats: Array<{
    angle: number;
    r: number;
    tone: SatTone;
    Icon: typeof Calendar;
    delay: number;
  }> = [
    { angle: -90, r: 130, tone: 'neutral', Icon: Calendar, delay: 0 },
    { angle: -150, r: 155, tone: 'mint', Icon: Mail, delay: 0.6 },
    { angle: 150, r: 155, tone: 'blue', Icon: MessageCircle, delay: 1.2 },
    { angle: -30, r: 155, tone: 'coral', Icon: CreditCard, delay: 1.8 },
    { angle: 30, r: 155, tone: 'teal', Icon: Briefcase, delay: 2.4 },
    { angle: 90, r: 130, tone: 'violet', Icon: Users, delay: 3.0 },
  ];

  // Three concentric rings, matching the design shape progression:
  //   inner = perfect circle (just clears the F mark),
  //   middle = strongly-rounded squircle (~30% radius of side),
  //   outer = lightly-rounded squircle (~18% radius of side, more square-like).
  // `radius: 'circle'` is rendered as 50% so the shape is always a circle
  // regardless of size; numeric radii are absolute pixel corner radii.
  const rings: Array<{ size: number; radius: number | 'circle'; opacity: number }> = [
    { size: 220, radius: 'circle', opacity: 0.24 },
    { size: 310, radius: 92, opacity: 0.18 },
    { size: 400, radius: 72, opacity: 0.12 },
  ];

  return (
    <div
      className="p-fn-11 relative hidden flex-col overflow-hidden md:flex"
      style={{ background: 'var(--fn-auth-promo-bg)' }}
    >
      <h2 className="text-fn-fg font-fn-semibold tracking-fn-tight text-center text-[30px]">
        One place for <span style={{ color: 'var(--fn-accent)' }}>everyone</span>
      </h2>

      <div className="relative flex min-h-[480px] flex-1 items-center justify-center">
        <div className="relative h-[480px] w-[480px]">
          {/* Concentric rings: circle, then two squircles with decreasing roundness. */}
          {rings.map((ring, i) => (
            <div
              key={ring.size}
              className="fn-ring-breathe absolute left-1/2 top-1/2"
              style={{
                width: ring.size,
                height: ring.size,
                marginLeft: -ring.size / 2,
                marginTop: -ring.size / 2,
                borderRadius: ring.radius === 'circle' ? '50%' : ring.radius,
                border: `1px solid color-mix(in oklch, var(--fn-auth-ring-color) ${ring.opacity * 100}%, transparent)`,
                animationDelay: `${i * 1.2}s`,
              }}
            />
          ))}

          {/* Center logo with breathing glow */}
          <div
            className="fn-center-glow rounded-fn-xl absolute left-1/2 top-1/2 z-[2] flex h-[100px] w-[100px] -translate-x-1/2 -translate-y-1/2 items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, var(--fn-accent) 0%, oklch(0.42 0.20 280) 100%)',
            }}
          >
            {/* Same rationale as the LogIn glyph above — brand mark stays
                white on the accent gradient in both themes. */}
            {/* eslint-disable-next-line fn-tokens/no-default-utilities */}
            <span className="font-display font-fn-bold tracking-fn-tight relative text-[36px] text-white">
              F
              <span
                aria-hidden
                className="-right-fn-2_5 bottom-fn-1_5 h-fn-2 w-fn-2 rounded-fn-full absolute"
                style={{ background: 'oklch(0.94 0.06 175)' }}
              />
            </span>
          </div>

          {/* Orbit rotor — rotates the entire satellite arrangement. */}
          <div className="fn-orbit absolute inset-0">
            {sats.map((s, i) => {
              const rad = (s.angle * Math.PI) / 180;
              const x = Math.cos(rad) * s.r;
              const y = Math.sin(rad) * s.r;
              return (
                <div
                  key={i}
                  className="absolute z-[3]"
                  style={{
                    top: `calc(50% + ${y}px)`,
                    left: `calc(50% + ${x}px)`,
                    width: 64,
                    height: 64,
                    marginLeft: -32,
                    marginTop: -32,
                  }}
                >
                  {/* Counter-rotates at the same rate so the icon stays upright. */}
                  <div className="fn-orbit-counter h-full w-full">
                    <div
                      className="fn-satellite-float rounded-fn-lg flex h-full w-full items-center justify-center"
                      style={{
                        background: `var(--fn-sat-${s.tone}-bg)`,
                        color: `var(--fn-sat-${s.tone}-fg)`,
                        boxShadow:
                          '0 8px 20px -4px rgb(0 0 0 / 0.18), 0 0 0 1px var(--fn-sat-tile-ring)',
                        animationDelay: `${s.delay}s`,
                      }}
                    >
                      <s.Icon className="h-[24px] w-[24px]" strokeWidth={1.8} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-auto">
        <p className="text-fn-fg-muted leading-fn-relaxed text-center text-[14px] italic">
          Built for{' '}
          <strong className="text-fn-fg font-fn-semibold not-italic">
            HR, finance, and engineering
          </strong>{' '}
          — one source of truth for every person, project, and payout.
        </p>
      </div>
    </div>
  );
}
