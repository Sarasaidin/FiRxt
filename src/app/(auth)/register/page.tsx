"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

type RegisterForm = {
  name: string;
  email: string;
  emailVerificationCode: string;
  countryCode: string;
  phone: string;
  password: string;
  confirmPassword: string;
};

export default function RegisterPage() {
  const router = useRouter();

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [verificationCodeSent, setVerificationCodeSent] = useState(false);
  const [verificationLoading, setVerificationLoading] = useState(false);
  const [verificationMessage, setVerificationMessage] = useState("");
  const [emailVerified, setEmailVerified] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    trigger,
    formState: { errors },
  } = useForm<RegisterForm>({
    mode: "onTouched",
    defaultValues: {
      name: "",
      email: "",
      emailVerificationCode: "",
      countryCode: "+60",
      phone: "",
      password: "",
      confirmPassword: "",
    },
  });

  async function sendVerificationCode() {
    setError("");
    setVerificationMessage("");

    const emailValid = await trigger("email", {
      shouldFocus: true,
    });

    if (!emailValid) return;

    setVerificationLoading(true);

    try {
      const response = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: watch("email"),
          action: "send",
        }),
      });

      const json = await response.json();

      if (!response.ok) {
        setError(json.error ?? "Failed to send verification code.");
        return;
      }

      setVerificationCodeSent(true);
      setEmailVerified(false);
      setVerificationMessage(
        json.message ?? "Verification code sent to your email."
      );
    } catch {
      setError("Something went wrong while sending the verification code.");
    } finally {
      setVerificationLoading(false);
    }
  }

  async function verifyEmailCode() {
    setError("");
    setVerificationMessage("");

    const codeValid = await trigger("emailVerificationCode", {
      shouldFocus: true,
    });

    if (!codeValid) return;

    setVerificationLoading(true);

    try {
      const response = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: watch("email"),
          code: watch("emailVerificationCode"),
          action: "verify",
        }),
      });

      const json = await response.json();

      if (!response.ok) {
        setEmailVerified(false);
        setError(json.error ?? "Invalid verification code.");
        return;
      }

      setEmailVerified(true);
      setVerificationMessage(json.message ?? "Email verified successfully.");
    } catch {
      setEmailVerified(false);
      setError("Something went wrong while verifying the code.");
    } finally {
      setVerificationLoading(false);
    }
  }

  async function onSubmit(data: RegisterForm) {
    if (!emailVerified) {
      setError("Please verify your email before creating an account.");
      return;
    }

    setLoading(true);
    setError("");

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: data.name,
        email: data.email,
        phone: `${data.countryCode}${data.phone}`,
        password: data.password,
      }),
    });

    const json = await res.json();

    if (!res.ok) {
      setError(json.error ?? "Registration failed");
      setLoading(false);
      return;
    }

    await signIn("credentials", {
      email: data.email,
      password: data.password,
      redirect: false,
    });

    router.push("/");
    router.refresh();
  }

  return (
    <Card className="w-full max-w-md p-8">
      <h1 className="mb-6 text-2xl font-bold text-brand-navy">
        Create account
      </h1>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-brand-red">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Input
          {...register("name", {
            required: "Full name is required",
          })}
          id="name"
          label="Full Name"
          placeholder="Ahmad bin Ali"
          error={errors.name?.message}
          required
        />

        <Input
          {...register("email", {
            required: "Email address is required",
            pattern: {
              value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
              message: "Enter a valid email address",
            },
          })}
          id="email"
          type="email"
          label="Email"
          placeholder="you@example.com"
          error={errors.email?.message}
          required
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[140px_1fr]">
          <Input
            {...register("countryCode", {
              required: "Country code is required",
              pattern: {
                value: /^\+\d{1,4}$/,
                message: "Use format like +60",
              },
            })}
            id="countryCode"
            label="Country Code"
            placeholder="+60"
            error={errors.countryCode?.message}
            required
          />

          <Input
            {...register("phone", {
              required: "Phone number is required",
              pattern: {
                value: /^\d{7,12}$/,
                message: "Enter phone number without country code",
              },
            })}
            id="phone"
            label="Contact No."
            placeholder="123456789"
            error={errors.phone?.message}
            required
          />
        </div>

        <Input
          {...register("password", {
            required: "Password is required",
            validate: (value) => {
              if (value.length < 12) {
                return "Password must be at least 12 characters";
              }

              if (!/[A-Z]/.test(value)) {
                return "Password must include at least one uppercase letter";
              }

              if (!/[a-z]/.test(value)) {
                return "Password must include at least one lowercase letter";
              }

              if (!/\d/.test(value)) {
                return "Password must include at least one number";
              }

              if (!/[^A-Za-z0-9]/.test(value)) {
                return "Password must include at least one special character";
              }

              return true;
            },
          })}
          id="password"
          type="password"
          label="Password"
          placeholder="Minimum 12 characters"
          error={errors.password?.message}
          required
        />

        <Input
          {...register("confirmPassword", {
            required: "Please confirm your password",
            validate: (value) =>
              value === watch("password") || "Passwords do not match",
          })}
          id="confirmPassword"
          type="password"
          label="Confirm Password"
          placeholder="Re-enter your password"
          error={errors.confirmPassword?.message}
          required
        />

        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <h2 className="mb-2 text-sm font-semibold text-brand-navy">
            Email Verification
          </h2>

          <p className="mb-3 text-sm text-gray-600">
            Before creating your account, please verify your email address using
            a 6-digit code.
          </p>

          <div className="mb-3 flex flex-col gap-3 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={sendVerificationCode}
              loading={verificationLoading}
              disabled={emailVerified}
            >
              {verificationCodeSent ? "Resend Code" : "Send Verification Code"}
            </Button>

            {emailVerified && (
              <span className="flex items-center text-sm font-medium text-green-700">
                Email verified
              </span>
            )}
          </div>

          {verificationCodeSent && !emailVerified && (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <Input
                {...register("emailVerificationCode", {
                  required: "Verification code is required",
                  pattern: {
                    value: /^\d{6}$/,
                    message: "Verification code must be 6 digits",
                  },
                })}
                id="emailVerificationCode"
                label="6-digit verification code"
                placeholder="123456"
                error={errors.emailVerificationCode?.message}
              />

              <Button
                type="button"
                variant="outline"
                onClick={verifyEmailCode}
                loading={verificationLoading}
                className="shrink-0"
              >
                Verify Code
              </Button>
            </div>
          )}

          {verificationMessage && (
            <p className="mt-3 text-sm text-brand-navy">
              {verificationMessage}
            </p>
          )}
        </div>

        <Button
          type="submit"
          loading={loading}
          disabled={!emailVerified}
          className="mt-2 w-full"
        >
          Create account
        </Button>
      </form>

      <p className="mt-4 text-center text-sm text-gray-600">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium text-brand-green hover:underline"
        >
          Sign in
        </Link>
      </p>
    </Card>
  );
}