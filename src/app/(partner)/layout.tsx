import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PartnerSidebar } from "@/components/layout/partner-sidebar";

export default async function PartnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) redirect("/login");
  if (session.user.role === "CUSTOMER") redirect("/");
  if (session.user.role === "PARTNER" && session.user.partnerStatus !== "APPROVED") {
    redirect("/partner-pending");
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <PartnerSidebar />
      <main className="flex-1 p-6 overflow-auto">{children}</main>
    </div>
  );
}
