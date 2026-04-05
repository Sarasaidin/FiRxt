import { Card } from "@/components/ui/card";

export const metadata = { title: "Admin — Design" };

export default function AdminDesignPage() {
  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold text-brand-navy mb-6">Design Settings</h1>
      <Card className="p-6">
        <div className="space-y-6">
          <div>
            <h2 className="font-semibold text-gray-700 mb-3">Brand Colors</h2>
            <div className="flex gap-4">
              {[
                { label: "Navy", color: "#1B2B4B" },
                { label: "Green", color: "#4CAF50" },
                { label: "Red", color: "#C62828" },
                { label: "Teal", color: "#B2EBF2" },
              ].map((c) => (
                <div key={c.label} className="flex flex-col items-center gap-1">
                  <div
                    className="h-10 w-10 rounded-full border-2 border-white shadow"
                    style={{ backgroundColor: c.color }}
                  />
                  <span className="text-xs text-gray-600">{c.label}</span>
                  <span className="text-xs text-gray-400 font-mono">{c.color}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="border-t border-gray-100 pt-4">
            <h2 className="font-semibold text-gray-700 mb-3">Logo Preview</h2>
            <div className="bg-brand-navy rounded-full px-6 py-2 inline-block">
              <span className="font-black text-xl">
                <span className="text-brand-green">Fi</span>
                <span className="text-brand-red">R</span>
                <span className="text-brand-green">xt</span>
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-2">FiRxt brand identity — Live Smart</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
