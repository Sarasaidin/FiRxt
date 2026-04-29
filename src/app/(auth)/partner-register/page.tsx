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
  password: string;
  phone: string;
  businessName: string;
  type: string;
  businessEmail: string;
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
      password: "",
      phone: "",
      businessName: "",
      type: "PHARMACY",
      businessEmail: "",
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
  ];

  async function goToNextStep(fields: (keyof PartnerRegisterForm)[], nextStep: number) {
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

  async function onSubmit(data: PartnerRegisterForm) {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/partners", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
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
        Phase 1 partner onboarding is currently open for clinics and pharmacies only.
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

            <Input
              {...register("phone", {
                required: "Phone number is required",
                minLength: {
                  value: 8,
                  message: "Enter a valid phone number",
                },
              })}
              id="phone"
              label="Phone Number"
              placeholder="+60123456789"
              error={errors.phone?.message}
              required
            />

            <Input
              {...register("password", {
                required: "Password is required",
                minLength: {
                  value: 8,
                  message: "Password must be at least 8 characters",
                },
              })}
              id="password"
              label="Password"
              type="password"
              placeholder="Minimum 8 characters"
              error={errors.password?.message}
              required
            />

            <Button
              type="button"
              onClick={() =>
                goToNextStep(["name", "email", "phone", "password"], 1)
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

            <Input
              {...register("businessEmail", {
                required: "Business email is required",
                pattern: {
                  value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                  message: "Enter a valid business email address",
                },
              })}
              id="businessEmail"
              label="Business Email"
              type="email"
              placeholder="business@example.com"
              error={errors.businessEmail?.message}
              required
            />

            <Input
              {...register("businessPhone", {
                required: "Business phone is required",
                minLength: {
                  value: 8,
                  message: "Enter a valid business phone number",
                },
              })}
              id="businessPhone"
              label="Business Phone"
              placeholder="+60312345678"
              error={errors.businessPhone?.message}
              required
            />

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
                    ["businessName", "type", "businessEmail", "businessPhone"],
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
            <h2 className="text-xl font-bold text-brand-navy">
              Location
            </h2>

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

              <Input
                {...register("state", {
                  required: "State is required",
                })}
                id="state"
                label="State"
                placeholder="Federal Territory of KL"
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
                <strong>Business:</strong> {watch("businessName")} (
                {watch("type")})
              </p>

              <p>
                <strong>Business Email:</strong> {watch("businessEmail")}
              </p>

              <p>
                <strong>Business Phone:</strong> {watch("businessPhone")}
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

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(2)}
              >
                Back
              </Button>

              <Button type="submit" loading={loading}>
                Submit Application
              </Button>
            </div>
          </div>
        )}
      </form>
    </Card>
  );
}