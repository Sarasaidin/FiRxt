import Link from "next/link";
import { FiRxtLogoDark } from "@/components/layout/firxt-logo";

export default function PartnerPendingPage() {
  return (
    <div className="min-h-screen bg-teal-gradient flex flex-col items-center justify-center p-4">
      <FiRxtLogoDark className="mb-8" />
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
        <div className="text-5xl mb-4">⏳</div>
        <h1 className="text-2xl font-bold text-brand-navy mb-2">Application Under Review</h1>
        <p className="text-gray-600 mb-6">
          Thank you for registering as a FiRxt partner. Our team is reviewing your application and will notify you via email once it&apos;s approved.
        </p>
        <div className="bg-brand-teal/20 rounded-lg p-4 text-sm text-brand-navy mb-6">
          Approval usually takes <strong>1–2 business days</strong>.
        </div>
        <Link
          href="/"
          className="inline-block bg-brand-green text-white px-6 py-2.5 rounded-lg font-medium hover:bg-brand-green-dark transition-colors"
        >
          Return to Homepage
        </Link>
      </div>
    </div>
  );
}
