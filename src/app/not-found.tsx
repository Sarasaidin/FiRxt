import Link from "next/link";

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-teal-gradient flex flex-col items-center justify-center p-4 text-center">
      <h1 className="text-8xl font-black text-brand-navy opacity-20 mb-4">404</h1>
      <h2 className="text-2xl font-bold text-brand-navy mb-2">Page not found</h2>
      <p className="text-gray-600 mb-6">The page you&apos;re looking for doesn&apos;t exist.</p>
      <Link
        href="/"
        className="bg-brand-green text-white px-6 py-2.5 rounded-lg font-medium hover:bg-brand-green-dark transition-colors"
      >
        Back to Homepage
      </Link>
    </div>
  );
}
