
"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Search,
  Loader2,
  Microscope,
  CheckCircle2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type LabTest = {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  category?: string | null;
};

export default function NewBloodTestPackagePage() {
  const router = useRouter();

  const [labTests, setLabTests] = useState<LabTest[]>([]);
  const [selectedTests, setSelectedTests] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [loadingTests, setLoadingTests] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [originalPrice, setOriginalPrice] = useState("");
  const [preparationInstructions, setPreparationInstructions] =
    useState("");
  const [sampleType, setSampleType] = useState("");
  const [turnaroundDays, setTurnaroundDays] = useState("");
  const [visibility, setVisibility] = useState<"PRIVATE" | "SHARED">(
    "PRIVATE"
  );

  useEffect(() => {
    async function loadLabTests() {
      try {
        const response = await fetch("/api/lab-tests");
        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            result.error || "Unable to load laboratory tests."
          );
        }

        setLabTests(result.labTests ?? []);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load laboratory tests."
        );
      } finally {
        setLoadingTests(false);
      }
    }

    loadLabTests();
  }, []);

  const filteredTests = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return labTests;

    return labTests.filter((test) =>
      [
        test.name,
        test.code,
        test.category ?? "",
        test.description ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
  }, [labTests, search]);

  const groupedTests = useMemo(() => {
    return filteredTests.reduce<Record<string, LabTest[]>>(
      (groups, test) => {
        const category = test.category || "Other Tests";

        if (!groups[category]) groups[category] = [];

        groups[category].push(test);
        return groups;
      },
      {}
    );
  }, [filteredTests]);

  function toggleTest(id: string) {
    setSelectedTests((current) => {
      if (current.includes(id)) {
        return current.filter((item) => item !== id);
      }

      if (current.length >= 100) {
        setError("A package cannot contain more than 100 tests.");
        return current;
      }

      return [...current, id];
    });

    setError("");
  }

  function handlePriceInput(value: string) {
    if (value === "" || /^\d*\.?\d{0,2}$/.test(value)) {
      setPrice(value);
    }
  }

  function handleOriginalPriceInput(value: string) {
    if (value === "" || /^\d*\.?\d{0,2}$/.test(value)) {
      setOriginalPrice(value);
    }
  }

  function convertToSen(value: string): number | null {
    if (!value.trim()) return null;

    const amount = Number(value);

    if (!Number.isFinite(amount) || amount <= 0) {
      return null;
    }

    return Math.round(amount * 100);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (selectedTests.length === 0) {
      setError("Please select at least one laboratory test.");
      return;
    }

    if (selectedTests.length > 100) {
      setError("A package cannot contain more than 100 tests.");
      return;
    }

    const priceInSen = convertToSen(price);

    if (priceInSen === null) {
      setError("Please enter a valid package price.");
      return;
    }

    let originalPriceInSen: number | null = null;

    if (originalPrice.trim()) {
      originalPriceInSen = convertToSen(originalPrice);

      if (originalPriceInSen === null) {
        setError("Please enter a valid original price.");
        return;
      }

      if (originalPriceInSen <= priceInSen) {
        setError(
          "Original price must be greater than the package price."
        );
        return;
      }
    }

    const turnaround = turnaroundDays.trim()
      ? Number(turnaroundDays)
      : null;

    if (
      turnaround !== null &&
      (!Number.isInteger(turnaround) ||
        turnaround < 1 ||
        turnaround > 365)
    ) {
      setError("Turnaround days must be between 1 and 365.");
      return;
    }

    const payload = {
      name: name.trim(),
      description,
      price: priceInSen,
      ...(originalPriceInSen !== null
        ? { originalPrice: originalPriceInSen }
        : {}),
      preparationInstructions,
      sampleType,
      ...(turnaround !== null
        ? { turnaroundDays: turnaround }
        : {}),
      visibility,
      labTestIds: selectedTests,
    };

    setSubmitting(true);

    try {
      const response = await fetch(
        "/api/clinic/blood-test-packages",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        const validationErrors = result.details
          ?.map((issue: { message: string }) => issue.message)
          .filter(Boolean)
          .join(" ");

        throw new Error(
          validationErrors ||
            result.error ||
            "Unable to create package."
        );
      }

      router.push("/partner-dashboard/blood-test-packages");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to create package."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-5xl">
      <div className="mb-6">
        <Link
          href="/partner-dashboard/blood-test-packages"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-brand-green mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Blood Test Packages
        </Link>

        <h1 className="text-2xl font-bold text-brand-navy">
          Create Blood Test Package
        </h1>

        <p className="text-sm text-gray-500 mt-1">
          Create a package using the central laboratory test catalogue.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-brand-navy mb-4">
            1. Package Information
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Package Name *
              </label>

              <input
                required
                minLength={2}
                maxLength={120}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Comprehensive Health Screening"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-green focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Description
              </label>

              <textarea
                maxLength={2000}
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what this package offers..."
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-green focus:outline-none"
              />

              <p className="text-xs text-gray-400 text-right mt-1">
                {description.length}/2000
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-semibold text-brand-navy mb-4">
            2. Package Pricing
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Package Price (RM) *
              </label>

              <input
                required
                type="number"
                min="0.01"
                step="0.01"
                value={price}
                onChange={(e) => handlePriceInput(e.target.value)}
                placeholder="89.90"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-green focus:outline-none"
              />

              <p className="text-xs text-gray-400 mt-1">
                The selling price offered by your clinic.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Original Price (RM)
              </label>

              <input
                type="number"
                min="0.01"
                step="0.01"
                value={originalPrice}
                onChange={(e) =>
                  handleOriginalPriceInput(e.target.value)
                }
                placeholder="120.00"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-green focus:outline-none"
              />

              <p className="text-xs text-gray-400 mt-1">
                Optional. Must be greater than the package price.
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4 gap-3">
            <div>
              <h2 className="text-lg font-semibold text-brand-navy">
                3. Included Laboratory Tests *
              </h2>

              <p className="text-sm text-gray-500 mt-1">
                Select the tests included in this package.
              </p>
            </div>

            <span className="rounded-full bg-brand-green/10 text-brand-green px-3 py-1 text-sm font-semibold whitespace-nowrap">
              {selectedTests.length} selected
            </span>
          </div>

          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />

            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by test name, code or category..."
              className="w-full rounded-lg border border-gray-300 pl-10 pr-3 py-2 text-sm focus:border-brand-green focus:outline-none"
            />
          </div>

          {loadingTests ? (
            <div className="py-10 text-center text-gray-500">
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
              Loading laboratory tests...
            </div>
          ) : labTests.length === 0 ? (
            <div className="rounded-lg bg-gray-50 p-8 text-center">
              <Microscope className="h-8 w-8 text-gray-400 mx-auto mb-2" />

              <p className="font-medium text-gray-700">
                No active laboratory tests available.
              </p>

              <p className="text-sm text-gray-500 mt-1">
                Please contact the administrator to populate the catalogue.
              </p>
            </div>
          ) : filteredTests.length === 0 ? (
            <p className="text-sm text-gray-500 py-6 text-center">
              No laboratory tests match your search.
            </p>
          ) : (
            <div className="space-y-5 max-h-[500px] overflow-y-auto pr-2">
              {Object.entries(groupedTests).map(
                ([category, tests]) => (
                  <div key={category}>
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">
                      {category}
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {tests.map((test) => {
                        const checked = selectedTests.includes(test.id);

                        return (
                          <label
                            key={test.id}
                            className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                              checked
                                ? "border-brand-green bg-brand-green/5"
                                : "border-gray-200 hover:border-gray-300"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleTest(test.id)}
                              className="mt-1 accent-green-600"
                            />

                            <span className="min-w-0 flex-1">
                              <span className="block text-sm font-medium text-brand-navy">
                                {test.name}
                              </span>

                              <span className="block text-xs text-gray-500 mt-1">
                                {test.code}
                              </span>

                              {test.description && (
                                <span className="block text-xs text-gray-400 mt-1">
                                  {test.description}
                                </span>
                              )}
                            </span>

                            {checked && (
                              <CheckCircle2 className="h-4 w-4 text-brand-green flex-shrink-0" />
                            )}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )
              )}
            </div>
          )}

          <p className="text-xs text-gray-400 mt-4">
            Minimum 1 and maximum 100 unique laboratory tests.
          </p>
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-semibold text-brand-navy mb-4">
            4. Additional Information
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Preparation Instructions
              </label>

              <textarea
                rows={4}
                maxLength={5000}
                value={preparationInstructions}
                onChange={(e) =>
                  setPreparationInstructions(e.target.value)
                }
                placeholder="e.g. Fast for 8–10 hours before your appointment."
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-green focus:outline-none"
              />

              <p className="text-xs text-gray-400 text-right mt-1">
                {preparationInstructions.length}/5000
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Sample Type
                </label>

                <input
                  maxLength={100}
                  value={sampleType}
                  onChange={(e) => setSampleType(e.target.value)}
                  placeholder="e.g. Blood, Serum"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-green focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Turnaround Time (Days)
                </label>

                <input
                  type="number"
                  min="1"
                  max="365"
                  step="1"
                  value={turnaroundDays}
                  onChange={(e) => setTurnaroundDays(e.target.value)}
                  placeholder="e.g. 3"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-green focus:outline-none"
                />
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-semibold text-brand-navy mb-4">
            5. Package Visibility
          </h2>

          <div className="space-y-3">
            <label className="flex items-start gap-3 rounded-lg border p-4 cursor-pointer hover:bg-gray-50">
              <input
                type="radio"
                name="visibility"
                value="PRIVATE"
                checked={visibility === "PRIVATE"}
                onChange={() => setVisibility("PRIVATE")}
                className="mt-1 accent-green-600"
              />

              <span>
                <span className="block font-medium text-brand-navy">
                  Private Package
                </span>

                <span className="block text-sm text-gray-500 mt-1">
                  Only your clinic can offer this package.
                </span>
              </span>
            </label>

            <label className="flex items-start gap-3 rounded-lg border p-4 cursor-pointer hover:bg-gray-50">
              <input
                type="radio"
                name="visibility"
                value="SHARED"
                checked={visibility === "SHARED"}
                onChange={() => setVisibility("SHARED")}
                className="mt-1 accent-green-600"
              />

              <span>
                <span className="block font-medium text-brand-navy">
                  Shared Package
                </span>

                <span className="block text-sm text-gray-500 mt-1">
                  Other eligible clinics may offer this package,
                  subject to their own clinic offers.
                </span>
              </span>
            </label>
          </div>
        </Card>

        {error && (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pb-8">
          <Link href="/partner-dashboard/blood-test-packages">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={submitting}
            >
              Cancel
            </Button>
          </Link>

          <Button
            type="submit"
            disabled={submitting || loadingTests || labTests.length === 0}
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              "Submit for Admin Approval"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
