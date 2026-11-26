
"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toaster";
import {
  ArrowLeft,
  MapPin,
  Phone,
  Mail,
  FlaskConical,
  Clock,
  CalendarDays,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";

type PackageStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "SUSPENDED";

type PackageDetails = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  originalPrice: number | null;
  preparationInstructions: string | null;
  sampleType: string | null;
  turnaroundDays: number | null;
  visibility: "PRIVATE" | "SHARED";
  approvalStatus: PackageStatus;
  isActive: boolean;
  reviewedBy: string | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  ownerPartner: {
    id: string;
    name: string;
    slug: string;
    type: string;
    status: string;
    phone: string | null;
    email: string | null;
    addressLine1: string;
    addressLine2: string | null;
    city: string;
    state: string;
    postcode: string;
  } | null;
  packageTests: {
    id: string;
    sortOrder: number;
    notes: string | null;
    labTest: {
      id: string;
      code: string;
      name: string;
      description: string | null;
      category: string | null;
      isActive: boolean;
    };
  }[];
};

const statusVariant: Record<
  PackageStatus,
  "green" | "red" | "yellow" | "gray"
> = {
  APPROVED: "green",
  PENDING: "yellow",
  REJECTED: "red",
  SUSPENDED: "gray",
};

export default function AdminBloodTestPackageDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [packageDetails, setPackageDetails] =
    useState<PackageDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [loadError, setLoadError] = useState("");

  const fetchPackage = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError("");

      const response = await fetch(
        `/api/admin/blood-test-packages/${id}`,
        { cache: "no-store" },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to load package details",
        );
      }

      setPackageDetails(data.package);
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? error.message
          : "Unable to load package details",
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchPackage();
  }, [fetchPackage]);

  async function handleAction(
    action: "approve" | "reject",
  ) {
    if (actionLoading) return;

    if (action === "reject" && !rejectReason.trim()) {
      toast("Please provide a rejection reason", "error");
      return;
    }

    if (
      action === "reject" &&
      rejectReason.trim().length > 1000
    ) {
      toast("Rejection reason must not exceed 1000 characters", "error");
      return;
    }

    const confirmed = window.confirm(
      action === "approve"
        ? "Are you sure you want to approve this blood test package?"
        : "Are you sure you want to reject this blood test package?",
    );

    if (!confirmed) return;

    try {
      setActionLoading(true);

      const response = await fetch(
        `/api/admin/blood-test-packages/${id}/review`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action,
            ...(action === "reject"
              ? { reason: rejectReason.trim() }
              : {}),
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Package review failed",
        );
      }

      toast(
        action === "approve"
          ? "Blood test package approved successfully!"
          : "Blood test package rejected successfully",
        action === "approve" ? "success" : "error",
      );

      router.push("/admin/blood-test-packages");
      router.refresh();
    } catch (error) {
      toast(
        error instanceof Error
          ? error.message
          : "Unable to complete package review",
        "error",
      );

      await fetchPackage();
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="p-8 text-center text-gray-500">
        Loading blood test package details...
      </div>
    );
  }

  if (loadError || !packageDetails) {
    return (
      <div className="max-w-2xl space-y-4">
        <div className="flex items-center gap-2 text-red-600">
          <AlertCircle className="h-5 w-5" />
          <p>{loadError || "Package not found"}</p>
        </div>

        <Button variant="outline" onClick={fetchPackage}>
          Retry
        </Button>

        <Link
          href="/admin/blood-test-packages"
          className="block text-sm text-brand-green hover:underline"
        >
          Back to pending packages
        </Link>
      </div>
    );
  }

  const clinic = packageDetails.ownerPartner;

  return (
    <div className="max-w-4xl space-y-6">
      <Link
        href="/admin/blood-test-packages"
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-brand-navy"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to pending packages
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-brand-navy">
            {packageDetails.name}
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Blood Test Package Review
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge variant={statusVariant[packageDetails.approvalStatus]}>
            {packageDetails.approvalStatus}
          </Badge>

          <Badge variant="blue">
            {packageDetails.visibility}
          </Badge>
        </div>
      </div>

      <Card className="space-y-4 p-5">
        <h2 className="font-bold text-brand-navy">
          Package Information
        </h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs text-gray-500">Package Price</p>
            <p className="text-xl font-bold text-brand-navy">
              RM {(packageDetails.price / 100).toFixed(2)}
            </p>
          </div>

          {packageDetails.originalPrice !== null && (
            <div>
              <p className="text-xs text-gray-500">Original Price</p>
              <p className="text-lg text-gray-500 line-through">
                RM {(packageDetails.originalPrice / 100).toFixed(2)}
              </p>
            </div>
          )}

          <div>
            <p className="text-xs text-gray-500">Sample Type</p>
            <p className="text-sm font-medium text-gray-700">
              {packageDetails.sampleType || "Not specified"}
            </p>
          </div>

          <div>
            <p className="text-xs text-gray-500">Turnaround Time</p>
            <p className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <Clock className="h-4 w-4" />
              {packageDetails.turnaroundDays
                ? `${packageDetails.turnaroundDays} days`
                : "Not specified"}
            </p>
          </div>

          <div>
            <p className="text-xs text-gray-500">Submission Date</p>
            <p className="flex items-center gap-2 text-sm text-gray-700">
              <CalendarDays className="h-4 w-4" />
              {new Date(packageDetails.createdAt).toLocaleDateString(
                "en-MY",
                {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                },
              )}
            </p>
          </div>
        </div>

        {packageDetails.description && (
          <div className="border-t border-gray-100 pt-4">
            <p className="mb-1 text-xs text-gray-500">Description</p>
            <p className="whitespace-pre-wrap text-sm text-gray-700">
              {packageDetails.description}
            </p>
          </div>
        )}

        {packageDetails.preparationInstructions && (
          <div className="border-t border-gray-100 pt-4">
            <p className="mb-1 text-xs text-gray-500">
              Preparation Instructions
            </p>
            <p className="whitespace-pre-wrap text-sm text-gray-700">
              {packageDetails.preparationInstructions}
            </p>
          </div>
        )}
      </Card>

      <Card className="space-y-4 p-5">
        <h2 className="font-bold text-brand-navy">
          Owning Clinic
        </h2>

        {clinic ? (
          <>
            <div>
              <p className="font-medium text-brand-navy">
                {clinic.name}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                {clinic.type.replace("_", " ")} · {clinic.status}
              </p>
            </div>

            <div className="space-y-2 text-sm text-gray-600">
              <p className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                <span>
                  {clinic.addressLine1}
                  {clinic.addressLine2
                    ? `, ${clinic.addressLine2}`
                    : ""}
                  , {clinic.city}, {clinic.state} {clinic.postcode}
                </span>
              </p>

              {clinic.phone && (
                <p className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-gray-400" />
                  {clinic.phone}
                </p>
              )}

              {clinic.email && (
                <p className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-gray-400" />
                  {clinic.email}
                </p>
              )}
            </div>
          </>
        ) : (
          <p className="text-sm text-red-600">
            Owning clinic information is unavailable.
          </p>
        )}
      </Card>

      <Card className="space-y-4 p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-bold text-brand-navy">
            Included Laboratory Tests
          </h2>

          <Badge variant="blue">
            {packageDetails.packageTests.length} tests
          </Badge>
        </div>

        {packageDetails.packageTests.length === 0 ? (
          <p className="text-sm text-gray-500">
            No laboratory tests have been assigned.
          </p>
        ) : (
          <div className="divide-y divide-gray-100">
            {packageDetails.packageTests.map((item, index) => (
              <div
                key={item.id}
                className="flex items-start gap-3 py-3"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-600">
                  {index + 1}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="font-medium text-brand-navy">
                    {item.labTest.name}
                  </p>

                  <p className="mt-1 text-xs text-gray-500">
                    Code: {item.labTest.code}
                    {item.labTest.category
                      ? ` · ${item.labTest.category}`
                      : ""}
                  </p>

                  {item.labTest.description && (
                    <p className="mt-1 text-sm text-gray-600">
                      {item.labTest.description}
                    </p>
                  )}

                  {item.notes && (
                    <p className="mt-1 text-xs text-gray-500">
                      Package notes: {item.notes}
                    </p>
                  )}

                  {!item.labTest.isActive && (
                    <p className="mt-1 text-xs font-medium text-red-600">
                      This laboratory test is currently inactive.
                    </p>
                  )}
                </div>

                <FlaskConical className="h-4 w-4 shrink-0 text-gray-400" />
              </div>
            ))}
          </div>
        )}
      </Card>

      {packageDetails.rejectionReason && (
        <Card className="border-red-200 p-5">
          <h2 className="mb-2 font-bold text-red-700">
            Previous Rejection Reason
          </h2>
          <p className="whitespace-pre-wrap text-sm text-gray-700">
            {packageDetails.rejectionReason}
          </p>
        </Card>
      )}

      {packageDetails.approvalStatus === "PENDING" &&
        packageDetails.isActive && (
          <Card className="space-y-4 p-5">
            <div>
              <h2 className="font-bold text-brand-navy">
                Administrator Review Decision
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Review the package information before approving or
                rejecting this submission.
              </p>
            </div>

            <div>
              <label
                htmlFor="rejectReason"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Rejection Reason
                <span className="text-red-500"> (required if rejecting)</span>
              </label>

              <textarea
                id="rejectReason"
                value={rejectReason}
                onChange={(event) =>
                  setRejectReason(event.target.value)
                }
                maxLength={1000}
                rows={4}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-green focus:outline-none"
                placeholder="Explain why this package does not meet the approval requirements..."
                disabled={actionLoading}
              />

              <p className="mt-1 text-right text-xs text-gray-400">
                {rejectReason.length}/1000 characters
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button
                variant="danger"
                onClick={() => handleAction("reject")}
                loading={actionLoading}
                disabled={
                  actionLoading ||
                  !rejectReason.trim() ||
                  rejectReason.trim().length > 1000
                }
              >
                Reject Package
              </Button>

              <Button
                onClick={() => handleAction("approve")}
                loading={actionLoading}
                disabled={actionLoading}
              >
                Approve Package
              </Button>
            </div>
          </Card>
        )}

      {packageDetails.approvalStatus !== "PENDING" && (
        <Card className="p-5">
          <p className="font-medium text-brand-navy">
            This package is {packageDetails.approvalStatus.toLowerCase()}.
          </p>

          {packageDetails.reviewedAt && (
            <p className="mt-1 text-sm text-gray-500">
              Last reviewed:{" "}
              {new Date(packageDetails.reviewedAt).toLocaleString("en-MY")}
            </p>
          )}
        </Card>
      )}

      {!packageDetails.isActive && (
        <Card className="border-gray-200 p-5">
          <p className="text-sm font-medium text-gray-600">
            This package has been deactivated and cannot be reviewed.
          </p>
        </Card>
      )}
    </div>
  );
}
