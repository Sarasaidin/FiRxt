"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card } from "@/components/ui/card";

const STEPS = ["Account", "Business", "Location", "Review"];

export default function PartnerRegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const { register, handleSubmit, watch, setValue, getValues } = useForm({
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
      latitude: 3.1390,
      longitude: 101.6869,
    },
  });

  function handleLocateMe() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      setValue("latitude", pos.coords.latitude);
      setValue("longitude", pos.coords.longitude);
    });
  }

  async function onSubmit(data: any) {
    setLoading(true);
    setError("");

    const res = await fetch("/api/partners", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const json = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(json.error ?? "Registration failed");
      return;
    }

    router.push("/partner-pending");
  }

  const typeOptions = [
    { value: "PHARMACY", label: "Community Pharmacy" },
    { value: "CLINIC", label: "Medical Clinic" },
    { value: "WELLNESS_CENTER", label: "Wellness Center" },
    { value: "LAB", label: "Diagnostic Lab" },
  ];

  return (
    <Card className="w-full max-w-2xl p-8">
      {/* Steps indicator */}
      <div className="flex items-center mb-8">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors ${
                i <= step
                  ? "bg-brand-green text-white"
                  : "bg-gray-200 text-gray-500"
              }`}
            >
              {i + 1}
            </div>
            <span
              className={`ml-2 text-sm font-medium hidden sm:block ${
                i <= step ? "text-brand-navy" : "text-gray-400"
              }`}
            >
              {s}
            </span>
            {i < STEPS.length - 1 && (
              <div
                className={`mx-3 h-0.5 w-8 sm:w-16 ${
                  i < step ? "bg-brand-green" : "bg-gray-200"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-brand-red">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)}>
        {/* Step 0: Account */}
        {step === 0 && (
          <div className="flex flex-col gap-4">
            <h2 className="text-xl font-bold text-brand-navy">Account Details</h2>
            <Input {...register("name")} id="name" label="Your Full Name" placeholder="Ahmad bin Ali" required />
            <Input {...register("email")} id="email" type="email" label="Email Address" placeholder="you@example.com" required />
            <Input {...register("phone")} id="phone" label="Phone Number" placeholder="+60123456789" required />
            <Input {...register("password")} id="password" type="password" label="Password (min 8 characters)" placeholder="••••••••" required />
            <Button type="button" onClick={() => setStep(1)} className="mt-2">Next</Button>
          </div>
        )}

        {/* Step 1: Business */}
        {step === 1 && (
          <div className="flex flex-col gap-4">
            <h2 className="text-xl font-bold text-brand-navy">Business Information</h2>
            <Input {...register("businessName")} id="businessName" label="Business Name" placeholder="My Pharmacy Sdn Bhd" required />
            <Select
              {...register("type")}
              id="type"
              label="Business Type"
              options={typeOptions}
            />
            <Input {...register("businessEmail")} id="businessEmail" type="email" label="Business Email (optional)" placeholder="contact@mybusiness.com" />
            <Input {...register("businessPhone")} id="businessPhone" label="Business Phone (optional)" placeholder="+60312345678" />
            <Input {...register("website")} id="website" label="Website (optional)" placeholder="https://mybusiness.com" />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                {...register("description")}
                rows={3}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/20"
                placeholder="Brief description of your business..."
              />
            </div>
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={() => setStep(0)}>Back</Button>
              <Button type="button" onClick={() => setStep(2)}>Next</Button>
            </div>
          </div>
        )}

        {/* Step 2: Location */}
        {step === 2 && (
          <div className="flex flex-col gap-4">
            <h2 className="text-xl font-bold text-brand-navy">Location</h2>
            <Input {...register("addressLine1")} id="addressLine1" label="Address Line 1" placeholder="No. 1, Jalan Example" required />
            <Input {...register("addressLine2")} id="addressLine2" label="Address Line 2 (optional)" placeholder="Taman Example" />
            <div className="grid grid-cols-2 gap-4">
              <Input {...register("city")} id="city" label="City" placeholder="Kuala Lumpur" required />
              <Input {...register("state")} id="state" label="State" placeholder="Federal Territory of KL" required />
            </div>
            <Input {...register("postcode")} id="postcode" label="Postcode" placeholder="50000" required />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">GPS Coordinates</label>
              <div className="flex gap-3 items-end">
                <Input {...register("latitude", { valueAsNumber: true })} id="latitude" label="Latitude" placeholder="3.1390" type="number" step="any" />
                <Input {...register("longitude", { valueAsNumber: true })} id="longitude" label="Longitude" placeholder="101.6869" type="number" step="any" />
                <Button type="button" variant="outline" onClick={handleLocateMe} className="flex-shrink-0">
                  Locate Me
                </Button>
              </div>
            </div>
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={() => setStep(1)}>Back</Button>
              <Button type="button" onClick={() => setStep(3)}>Next</Button>
            </div>
          </div>
        )}

        {/* Step 3: Review */}
        {step === 3 && (
          <div className="flex flex-col gap-4">
            <h2 className="text-xl font-bold text-brand-navy">Review & Submit</h2>
            <div className="rounded-lg bg-brand-teal/20 border border-brand-teal p-4 space-y-2 text-sm">
              <p><strong>Name:</strong> {watch("name")}</p>
              <p><strong>Email:</strong> {watch("email")}</p>
              <p><strong>Business:</strong> {watch("businessName")} ({watch("type")})</p>
              <p><strong>Address:</strong> {watch("addressLine1")}, {watch("city")}, {watch("state")}</p>
            </div>
            <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-4 text-sm text-yellow-800">
              <strong>Note:</strong> Your application will be reviewed by our admin team. You&apos;ll receive an email once approved (usually within 1-2 business days).
            </div>
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={() => setStep(2)}>Back</Button>
              <Button type="submit" loading={loading}>Submit Application</Button>
            </div>
          </div>
        )}
      </form>
    </Card>
  );
}
