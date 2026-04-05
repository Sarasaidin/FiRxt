import Link from "next/link";
import { FiRxtLogoDark } from "@/components/layout/firxt-logo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-teal-gradient flex flex-col items-center justify-center p-4">
      <Link href="/" className="mb-8">
        <FiRxtLogoDark />
      </Link>
      {children}
    </div>
  );
}
