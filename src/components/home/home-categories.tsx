import Link from "next/link";

const categories = [
  { label: "Pharmacies", icon: "💊", href: "/search?type=PHARMACY" },
  { label: "Clinics", icon: "🏥", href: "/search?type=CLINIC" },
  { label: "Wellness", icon: "🌿", href: "/search?type=WELLNESS_CENTER" },
  { label: "Labs", icon: "🔬", href: "/search?type=LAB" },
  { label: "Promotions", icon: "🏷️", href: "/promotions" },
];

export function HomeCategories() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-6">
      <div className="flex items-center gap-4 overflow-x-auto pb-2 scrollbar-hide">
        {categories.map((cat) => (
          <Link
            key={cat.label}
            href={cat.href}
            className="flex-shrink-0 flex flex-col items-center gap-2 rounded-xl bg-white border border-gray-200 px-6 py-4 shadow-sm hover:border-brand-green hover:shadow-md transition-all"
          >
            <span className="text-2xl">{cat.icon}</span>
            <span className="text-xs font-medium text-gray-700">{cat.label}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
