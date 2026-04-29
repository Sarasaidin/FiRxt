import Link from "next/link";

const categories = [
  {
    label: "Pharmacies",
    icon: "💊",
    href: "/search?type=PHARMACY",
  },
  {
    label: "Clinics",
    icon: "🏥",
    href: "/search?type=CLINIC",
  },
  {
    label: "Blood Tests",
    icon: "🩸",
    href: "/search?q=blood%20test",
  },
  {
    label: "Vaccinations",
    icon: "💉",
    href: "/search?q=vaccination",
  },
  {
    label: "Health Screening",
    icon: "🩺",
    href: "/search?q=health%20screening",
  },
  {
    label: "Promotions",
    icon: "🏷️",
    href: "/promotions",
  },
];

export function HomeCategories() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-brand-navy">
            Browse by category
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            Quickly find healthcare products and services near you.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {categories.map((cat) => (
          <Link
            key={cat.label}
            href={cat.href}
            className="group flex h-32 flex-col items-center justify-center rounded-xl border border-gray-200 bg-white p-4 text-center shadow-sm transition-all hover:-translate-y-0.5 hover:border-brand-green hover:shadow-md"
          >
            <span className="text-3xl" aria-hidden="true">
              {cat.icon}
            </span>

            <span className="mt-3 text-sm font-semibold text-brand-navy group-hover:text-brand-green">
              {cat.label}
            </span>

            <span className="mt-1 text-xs text-gray-400">
              Search now
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}