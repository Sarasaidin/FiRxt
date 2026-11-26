
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  FlaskConical,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ToggleLeft,
  ToggleRight,
  X,
} from "lucide-react";

interface LabTest {
  id: string;
  code: string;
  name: string;
  description: string | null;
  category: string | null;
  isActive: boolean;
}

interface LabTestForm {
  code: string;
  name: string;
  description: string;
  category: string;
}

type StatusFilter = "ALL" | "ACTIVE" | "INACTIVE";

const emptyForm: LabTestForm = {
  code: "",
  name: "",
  description: "",
  category: "",
};

export default function AdminLabTestsPage() {
  const [labTests, setLabTests] = useState<LabTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>("ALL");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingTest, setEditingTest] = useState<LabTest | null>(null);
  const [form, setForm] = useState<LabTestForm>(emptyForm);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadLabTests = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        "/api/lab-tests?includeInactive=true",
        { cache: "no-store" }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to load laboratory tests.");
      }

      setLabTests(data.labTests);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load laboratory tests."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadLabTests();
  }, [loadLabTests]);

  const counts = useMemo(
    () => ({
      total: labTests.length,
      active: labTests.filter((test) => test.isActive).length,
      inactive: labTests.filter((test) => !test.isActive).length,
    }),
    [labTests]
  );

  const filteredTests = useMemo(() => {
    const query = search.trim().toLowerCase();

    return labTests.filter((test) => {
      const matchesSearch =
        !query ||
        test.code.toLowerCase().includes(query) ||
        test.name.toLowerCase().includes(query) ||
        (test.category ?? "").toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" && test.isActive) ||
        (statusFilter === "INACTIVE" && !test.isActive);

      return matchesSearch && matchesStatus;
    });
  }, [labTests, search, statusFilter]);

  function openCreateModal() {
    setEditingTest(null);
    setForm(emptyForm);
    setError("");
    setModalOpen(true);
  }

  function openEditModal(test: LabTest) {
    setEditingTest(test);
    setForm({
      code: test.code,
      name: test.name,
      description: test.description ?? "",
      category: test.category ?? "",
    });
    setError("");
    setModalOpen(true);
  }

  function closeModal() {
    if (saving) return;

    setModalOpen(false);
    setEditingTest(null);
    setForm(emptyForm);
  }

  function updateForm(field: keyof LabTestForm, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSaving(true);
    setError("");
    setSuccess("");

    const payload = {
      code: form.code.trim().toUpperCase(),
      name: form.name.trim(),
      ...(form.description.trim()
        ? { description: form.description.trim() }
        : {}),
      ...(form.category.trim()
        ? { category: form.category.trim() }
        : {}),
    };

    try {
      const response = await fetch(
        editingTest
          ? `/api/lab-tests/${editingTest.id}`
          : "/api/lab-tests",
        {
          method: editingTest ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Unable to save laboratory test."
        );
      }

      setModalOpen(false);
      setEditingTest(null);
      setForm(emptyForm);

      setSuccess(
        editingTest
          ? "Laboratory test updated successfully."
          : "Laboratory test created successfully."
      );

      await loadLabTests();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to save laboratory test."
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(test: LabTest) {
    const action = test.isActive ? "deactivate" : "reactivate";

    const confirmed = window.confirm(
      `Are you sure you want to ${action} "${test.name}"?`
    );

    if (!confirmed) return;

    setError("");
    setSuccess("");

    try {
      const response = await fetch(`/api/lab-tests/${test.id}`, {
        method: test.isActive ? "DELETE" : "PUT",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || `Unable to ${action} laboratory test.`
        );
      }

      setSuccess(data.message);
      await loadLabTests();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : `Unable to ${action} laboratory test.`
      );
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-brand-navy">
            Laboratory Test Catalogue
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage the central laboratory test catalogue used by clinics
            when creating blood test packages.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-navy px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-navy/90"
        >
          <Plus className="h-4 w-4" />
          Add Laboratory Test
        </button>
      </div>

      {success && (
        <div className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {success}
          <button onClick={() => setSuccess("")}>
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
          <button onClick={() => setError("")}>
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          {
            label: "Total Tests",
            value: counts.total,
            icon: FlaskConical,
            color: "text-brand-navy",
          },
          {
            label: "Active Tests",
            value: counts.active,
            icon: Activity,
            color: "text-green-600",
          },
          {
            label: "Inactive Tests",
            value: counts.inactive,
            icon: ToggleLeft,
            color: "text-gray-500",
          },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-xl border border-gray-200 bg-white p-5"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{item.label}</p>
                <p className="mt-1 text-2xl font-bold text-brand-navy">
                  {item.value}
                </p>
              </div>
              <item.icon className={`h-8 w-8 ${item.color} opacity-70`} />
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search code, test name or category..."
            className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-brand-navy"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {(
            ["ALL", "ACTIVE", "INACTIVE"] as StatusFilter[]
          ).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                statusFilter === status
                  ? "bg-brand-navy text-white"
                  : "border border-gray-200 bg-white text-gray-600 hover:border-brand-navy"
              }`}
            >
              {status === "ALL"
                ? `All (${counts.total})`
                : status === "ACTIVE"
                  ? `Active (${counts.active})`
                  : `Inactive (${counts.inactive})`}
            </button>
          ))}

          <button
            onClick={() => void loadLabTests()}
            disabled={loading}
            title="Refresh catalogue"
            className="rounded-lg border border-gray-200 bg-white p-2 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw
              className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
            />
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                {[
                  "Test Code",
                  "Test Name",
                  "Category",
                  "Description",
                  "Status",
                  "Actions",
                ].map((heading) => (
                  <th
                    key={heading}
                    className="whitespace-nowrap px-4 py-3 text-left font-medium text-gray-600"
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {filteredTests.map((test) => (
                <tr key={test.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span className="rounded bg-gray-100 px-2 py-1 font-mono text-xs font-semibold text-brand-navy">
                      {test.code}
                    </span>
                  </td>

                  <td className="min-w-48 px-4 py-3">
                    <p className="font-medium text-gray-800">
                      {test.name}
                    </p>
                  </td>

                  <td className="px-4 py-3 text-gray-600">
                    {test.category || "—"}
                  </td>

                  <td className="max-w-xs px-4 py-3 text-gray-500">
                    <p className="line-clamp-2">
                      {test.description || "—"}
                    </p>
                  </td>

                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                        test.isActive
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {test.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => openEditModal(test)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-brand-green hover:underline"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </button>

                      <button
                        onClick={() => void toggleStatus(test)}
                        className={`inline-flex items-center gap-1 text-xs font-medium hover:underline ${
                          test.isActive
                            ? "text-red-600"
                            : "text-green-600"
                        }`}
                      >
                        {test.isActive ? (
                          <>
                            <ToggleLeft className="h-4 w-4" />
                            Deactivate
                          </>
                        ) : (
                          <>
                            <ToggleRight className="h-4 w-4" />
                            Reactivate
                          </>
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {!loading && filteredTests.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-12 text-center text-gray-500"
                  >
                    {search || statusFilter !== "ALL"
                      ? "No laboratory tests match your search or filter."
                      : "No laboratory tests have been added yet. Create your first test to get started."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {loading && (
          <div className="p-8 text-center text-sm text-gray-500">
            Loading laboratory tests...
          </div>
        )}

        <div className="border-t border-gray-100 px-4 py-3 text-xs text-gray-500">
          Showing {filteredTests.length} of {labTests.length} laboratory tests
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4">
          <div className="my-auto w-full max-w-xl rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <div>
                <h2 className="text-lg font-bold text-brand-navy">
                  {editingTest ? "Edit Laboratory Test" : "Add Laboratory Test"}
                </h2>
                <p className="mt-1 text-xs text-gray-500">
                  Enter the laboratory test details below.
                </p>
              </div>

              <button
                onClick={closeModal}
                disabled={saving}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 p-6">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Test Code <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  minLength={2}
                  maxLength={50}
                  value={form.code}
                  onChange={(event) =>
                    updateForm("code", event.target.value.toUpperCase())
                  }
                  placeholder="e.g. FBC"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-brand-navy"
                />
                <p className="mt-1 text-xs text-gray-400">
                  Letters, numbers, underscores and hyphens only.
                </p>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Test Name <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  minLength={2}
                  maxLength={120}
                  value={form.name}
                  onChange={(event) =>
                    updateForm("name", event.target.value)
                  }
                  placeholder="e.g. Full Blood Count"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-brand-navy"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Category
                </label>
                <input
                  maxLength={100}
                  value={form.category}
                  onChange={(event) =>
                    updateForm("category", event.target.value)
                  }
                  placeholder="e.g. Haematology"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-brand-navy"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  maxLength={2000}
                  rows={4}
                  value={form.description}
                  onChange={(event) =>
                    updateForm("description", event.target.value)
                  }
                  placeholder="Describe what this laboratory test measures..."
                  className="w-full resize-y rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-brand-navy"
                />
                <p className="mt-1 text-right text-xs text-gray-400">
                  {form.description.length}/2000
                </p>
              </div>

              {error && (
                <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
                  {error}
                </p>
              )}

              <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-brand-navy px-5 py-2 text-sm font-medium text-white hover:bg-brand-navy/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving
                    ? "Saving..."
                    : editingTest
                      ? "Save Changes"
                      : "Create Test"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
