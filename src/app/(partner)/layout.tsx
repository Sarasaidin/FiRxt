
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPartnerContext } from "@/lib/active-partner";
import { PartnerSidebar } from "@/components/layout/partner-sidebar";

export default async function PartnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) redirect("/login");
  if (session.user.role === "CUSTOMER") redirect("/");

  const partnerContext = await getPartnerContext();

  if (!partnerContext || partnerContext.partners.length === 0) {
    redirect("/");
  }

  const { partners, activePartner } = partnerContext;


  return (
    <div className="flex min-h-screen bg-gray-50">
      <PartnerSidebar
        partners={partners}
        activePartner={activePartner}
      />

      <main className="flex-1 p-6 overflow-auto">
        {activePartner?.status === "APPROVED" ? (
          children
        ) : activePartner ? (
          <div className="flex min-h-[60vh] items-center justify-center">
            <div className="max-w-md text-center">
              <h1 className="text-xl font-bold text-gray-900">
                Business Application Under Review
              </h1>
              <p className="mt-2 text-sm text-gray-600">
                Your business, {activePartner.name}, is currently awaiting approval.
                You can select another business from the sidebar.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex min-h-[60vh] items-center justify-center">
            <div className="max-w-md text-center">
              <h1 className="text-xl font-bold text-gray-900">
                Select a Business
              </h1>
              <p className="mt-2 text-sm text-gray-600">
                Please select a business from the sidebar to access its dashboard.
              </p>
            </div>
          </div>
          )}
      </main>
    </div>
  );
}
