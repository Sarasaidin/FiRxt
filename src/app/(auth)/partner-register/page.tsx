"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card } from "@/components/ui/card";

const STEPS = ["Account", "Business", "Location", "Review"];

type PartnerRegisterForm = {
  name: string;
  email: string;
  emailVerificationCode: string;
  password: string;
  confirmPassword: string;
  countryCode: string;
  phone: string;
  businessName: string;
  businessSsmNumber: string;
  type: string;
  otherBusinessType: string;
  businessCountryCode: string;
  businessPhone: string;
  website: string;
  description: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postcode: string;
  latitude: number;
  longitude: number;
};

export default function PartnerRegisterPage() {
  const router = useRouter();

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [verificationCodeSent, setVerificationCodeSent] = useState(false);
  const [verificationLoading, setVerificationLoading] = useState(false);
  const [verificationMessage, setVerificationMessage] = useState("");
  const [emailVerified, setEmailVerified] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    trigger,
    formState: { errors },
  } = useForm<PartnerRegisterForm>({
    mode: "onTouched",
    defaultValues: {
      name: "",
      email: "",
      emailVerificationCode: "",
      password: "",
      confirmPassword: "",
      countryCode: "+60",
      phone: "",
      businessName: "",
      businessSsmNumber: "",
      type: "PHARMACY",
      otherBusinessType: "",
      businessCountryCode: "+60",
      businessPhone: "",
      website: "",
      description: "",
      addressLine1: "",
      addressLine2: "",
      city: "",
      state: "",
      postcode: "",
      latitude: 3.139,
      longitude: 101.6869,
    },
  });

  const typeOptions = [
    { value: "PHARMACY", label: "Community Pharmacy" },
    { value: "CLINIC", label: "Medical Clinic" },
    { value: "OTHERS", label: "Others" },
  ];

  const stateOptions = [
    { value: "Johor", label: "Johor" },
    { value: "Kedah", label: "Kedah" },
    { value: "Kelantan", label: "Kelantan" },
    { value: "Melaka", label: "Melaka" },
    { value: "Negeri Sembilan", label: "Negeri Sembilan" },
    { value: "Pahang", label: "Pahang" },
    { value: "Penang", label: "Penang" },
    { value: "Perak", label: "Perak" },
    { value: "Perlis", label: "Perlis" },
    { value: "Sabah", label: "Sabah" },
    { value: "Sarawak", label: "Sarawak" },
    { value: "Selangor", label: "Selangor" },
    { value: "Terengganu", label: "Terengganu" },
    { value: "Kuala Lumpur", label: "Kuala Lumpur" },
    { value: "Labuan", label: "Labuan" },
    { value: "Putrajaya", label: "Putrajaya" },
  ];

  async function goToNextStep(
    fields: (keyof PartnerRegisterForm)[],
    nextStep: number
  ) {
    const isValid = await trigger(fields, {
      shouldFocus: true,
    });

    if (isValid) {
      setStep(nextStep);
    }
  }

  function handleLocateMe() {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition((pos) => {
      setValue("latitude", pos.coords.latitude);
      setValue("longitude", pos.coords.longitude);
    });
  }

  async function sendVerificationCode() {
    setError("");
    setVerificationMessage("");

    const emailValid = await trigger("email", {
      shouldFocus: true,
    });

    if (!emailValid) return;

    setVerificationLoading(true);

    try {
      const response = await fetch("/api/partners/verify-email", {
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
      const response = await fetch("/api/partners/verify-email", {
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
      setVerificationMessage(
        json.message ?? "Email verified successfully."
      );
    } catch {
      setEmailVerified(false);
      setError("Something went wrong while verifying the code.");
    } finally {
      setVerificationLoading(false);
    }
  }

  async function onSubmit(data: PartnerRegisterForm) {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/partners", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...data,
          phone: `${data.countryCode}${data.phone}`,
          businessPhone: `${data.businessCountryCode}${data.businessPhone}`,
        }),
      });

      const json = await response.json();

      if (!response.ok) {
        setError(json.error ?? "Registration failed. Please try again.");
        return;
      }

      router.push("/partner-pending");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-3xl p-6">
      {/* Steps indicator */}
      <div className="mb-8 flex items-center justify-between">
        {STEPS.map((stepLabel, index) => (
          <div key={stepLabel} className="flex flex-1 items-center">
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold ${
                index <= step
                  ? "bg-brand-green text-white"
                  : "bg-gray-200 text-gray-500"
              }`}
            >
              {index + 1}
            </div>

            <span
              className={`ml-2 hidden text-sm font-medium sm:inline ${
                index <= step ? "text-brand-navy" : "text-gray-400"
              }`}
            >
              {stepLabel}
            </span>

            {index < STEPS.length - 1 && (
              <div className="mx-4 h-px flex-1 bg-gray-200" />
            )}
          </div>
        ))}
      </div>

      <p className="mb-6 text-sm text-gray-600">
        Phase 1 partner onboarding is currently open for clinics and pharmacies
        only.
      </p>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)}>
        {/* Step 0: Account */}
        {step === 0 && (
          <div className="flex flex-col gap-4">
            <h2 className="text-xl font-bold text-brand-navy">
              Account Details
            </h2>

            <Input
              {...register("name", {
                required: "Full name is required",
              })}
              id="name"
              label="Your Full Name"
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
              label="Email Address"
              type="email"
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
                label="Phone Number"
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
              label="Password"
              type="password"
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
              label="Confirm Password"
              type="password"
              placeholder="Re-enter your password"
              error={errors.confirmPassword?.message}
              required
            />

            <Button
              type="button"
              onClick={() =>
                goToNextStep(
                  [
                    "name",
                    "email",
                    "countryCode",
                    "phone",
                    "password",
                    "confirmPassword",
                  ],
                  1
                )
              }
              className="mt-2"
            >
              Next
            </Button>
          </div>
        )}

        {/* Step 1: Business */}
        {step === 1 && (
          <div className="flex flex-col gap-4">
            <h2 className="text-xl font-bold text-brand-navy">
              Business Information
            </h2>

            <Input
              {...register("businessName", {
                required: "Business name is required",
              })}
              id="businessName"
              label="Business Name"
              placeholder="Poliklinik Example"
              error={errors.businessName?.message}
              required
            />

            <Input
              {...register("businessSsmNumber", {
                required: "Business SSM number is required",
                pattern: {
                  value: /^\d{12}$/,
                  message: "Enter a valid 12-digit SSM number",
                },
              })}
              id="businessSsmNumber"
              label="Business SSM Number"
              placeholder="202601234567"
              error={errors.businessSsmNumber?.message}
              required
            />

            <Select
              {...register("type", {
                required: "Business type is required",
              })}
              id="type"
              label="Business Type"
              options={typeOptions}
              error={errors.type?.message}
              required
            />

            {watch("type") === "OTHERS" && (
              <Input
                {...register("otherBusinessType", {
                  required: "Please specify your business type",
                })}
                id="otherBusinessType"
                label="Please specify"
                placeholder="Enter your business type"
                error={errors.otherBusinessType?.message}
                required
              />
            )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[140px_1fr]">

            <Input
              {...register("businessCountryCode", {
                required: "Business country code is required",
                pattern: {
                  value: /^\+\d{1,4}$/,
                  message: "Use format like +60",
                },
              })}
              id="businessCountryCode"
              label="Country Code"
              placeholder="+60"
              error={errors.businessCountryCode?.message}
              required
            />
            
            <Input
              {...register("businessPhone", {
                required: "Business phone is required",
                pattern: {
                  value: /^\d{7,12}$/,
                  message: "Enter business phone number without country code",
                },
              })}
              id="businessPhone"
              label="Business Phone Number"
              placeholder="312345678"
              error={errors.businessPhone?.message}
              required
            />
          </div>
            <Input
              {...register("website")}
              id="website"
              label="Website (optional)"
              placeholder="https://example.com"
              error={errors.website?.message}
            />

            <div>
              <label
                htmlFor="description"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Description
              </label>

              <textarea
                {...register("description")}
                id="description"
                rows={4}
                placeholder="Briefly describe your business"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-green focus:outline-none focus:ring-1 focus:ring-brand-green"
              />
            </div>

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(0)}
              >
                Back
              </Button>

              <Button
                type="button"
                onClick={() =>
                  goToNextStep(
                    ["businessName", "businessSsmNumber", "type", "businessCountryCode", "businessPhone"],
                    2
                  )
                }
              >
                Next
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Location */}
        {step === 2 && (
          <div className="flex flex-col gap-4">
            <h2 className="text-xl font-bold text-brand-navy">Location</h2>

            <Input
              {...register("addressLine1", {
                required: "Address line 1 is required",
              })}
              id="addressLine1"
              label="Address Line 1"
              placeholder="No. 1, Jalan Example"
              error={errors.addressLine1?.message}
              required
            />

            <Input
              {...register("addressLine2")}
              id="addressLine2"
              label="Address Line 2 (optional)"
              placeholder="Taman Example"
              error={errors.addressLine2?.message}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                {...register("city", {
                  required: "City is required",
                })}
                id="city"
                label="City"
                placeholder="Kuala Lumpur"
                error={errors.city?.message}
                required
              />

              <Select
                {...register("state", {
                  required: "State is required",
                })}
                id="state"
                label="State"
                options={stateOptions}
                error={errors.state?.message}
                required
              />
            </div>

            <Input
              {...register("postcode", {
                required: "Postcode is required",
                minLength: {
                  value: 4,
                  message: "Enter a valid postcode",
                },
              })}
              id="postcode"
              label="Postcode"
              placeholder="50000"
              error={errors.postcode?.message}
              required
            />

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                GPS Coordinates
              </label>

              <p className="mb-3 text-xs text-gray-500">
                Click the Locate Me button to automatically fill in your current GPS coordinates.
              </p>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                <Input
                  {...register("latitude", {
                    valueAsNumber: true,
                  })}
                  id="latitude"
                  label="Latitude"
                  placeholder="3.1390"
                  type="number"
                  step="any"
                />

                <Input
                  {...register("longitude", {
                    valueAsNumber: true,
                  })}
                  id="longitude"
                  label="Longitude"
                  placeholder="101.6869"
                  type="number"
                  step="any"
                />

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleLocateMe}
                  className="shrink-0"
                >
                  Locate Me
                </Button>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(1)}
              >
                Back
              </Button>

              <Button
                type="button"
                onClick={() =>
                  goToNextStep(
                    ["addressLine1", "city", "state", "postcode"],
                    3
                  )
                }
              >
                Next
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Review */}
        {step === 3 && (
          <div className="flex flex-col gap-4">
            <h2 className="text-xl font-bold text-brand-navy">
              Review & Submit
            </h2>

            <div className="space-y-2 rounded-lg border border-brand-teal bg-brand-teal/20 p-4 text-sm">
              <p>
                <strong>Name:</strong> {watch("name")}
              </p>

              <p>
                <strong>Email:</strong> {watch("email")}
              </p>

              <p>
                <strong>Phone:</strong> {watch("countryCode")}
                {watch("phone")}
              </p>

              <p>
                <strong>Business:</strong> {watch("businessName")} (
                {watch("type")})
              </p>

              <p>
                <strong>Business Phone:</strong> {watch("businessCountryCode")}
                {watch("businessPhone")}
              </p>

              <p>
                <strong>Address:</strong> {watch("addressLine1")},{" "}
                {watch("city")}, {watch("state")} {watch("postcode")}
              </p>
            </div>

            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
              <strong>Note:</strong> Your application will be reviewed by our
              admin team. You&apos;ll receive an email once approved.
            </div>

            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <h3 className="mb-2 text-sm font-semibold text-brand-navy">
                Email Verification
              </h3>

              <p className="mb-3 text-sm text-gray-600">
                Before submitting your application, please verify your email address using a
                6-digit code.
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
                <p className="mt-3 text-sm text-brand-navy">{verificationMessage}</p>
              )}
            </div>

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(2)}
              >
                Back
              </Button>

              <Button type="submit" loading={loading} disabled={!emailVerified}>
                Submit Application
              </Button>
            </div>
          </div>
        )}
      </form>
    </Card>
  );
}