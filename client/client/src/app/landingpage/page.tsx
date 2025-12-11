"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Module {
  module_id: number;
  title: string;
  description: string;
  created_at: string;
}

function LandingPage() {
  const [modules, setModules] = useState<Module[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ title: "", description: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userName, setUserName] = useState("");
  const router = useRouter();

  // Fetch modules on mount
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    setUserName(user.name || "User");
    fetchModules();
  }, []);

  const fetchModules = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem("token");
      const user = JSON.parse(localStorage.getItem("user") || "{}");

      if (!token) {
        router.push("/loginpage");
        return;
      }

      const response = await fetch("http://localhost:5000/api/modules", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch modules");
      }

      const data = await response.json();
      setModules(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error fetching modules");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddModule = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.title.trim()) {
      setError("Title is required");
      return;
    }

    setIsSubmitting(true);

    try {
      const token = localStorage.getItem("token");

      const response = await fetch("http://localhost:5000/api/modules", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create module");
      }

      const newModule = await response.json();
      setModules([newModule, ...modules]);
      setFormData({ title: "", description: "" });
      setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error creating module");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteModule = async (moduleId: number) => {
    if (!window.confirm("Are you sure you want to delete this module?")) {
      return;
    }

    try {
      const token = localStorage.getItem("token");

      const response = await fetch(
        `http://localhost:5000/api/modules/${moduleId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete module");
      }

      setModules(modules.filter((m) => m.module_id !== moduleId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error deleting module");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/");
  };

  const navigateToUserPage = () => {
    router.push("/userpage");
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-6xl px-8 py-6 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-black">My Modules</h1>
          <button
            onClick={navigateToUserPage}
            className="rounded-lg  px-4 py-2 text-sm font-semibold text-black hover:bg-gray-100"
          >
            {userName}
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="mx-auto max-w-6xl px-8 py-12">
        {error && (
          <div className="mb-6 rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
            {error}
          </div>
        )}

        {/* Add Module Button */}
        <div className="mb-8">
          {!showForm ? (
            <button
              onClick={() => setShowForm(true)}
              className="rounded-lg bg-black px-6 py-3 text-lg font-semibold text-white transition-colors hover:bg-gray-800"
            >
              + Add Module
            </button>
          ) : (
            <div className="rounded-lg border border-gray-300 bg-gray-50 p-6">
              <h2 className="mb-4 text-xl font-bold text-black">
                Create New Module
              </h2>
              <form onSubmit={handleAddModule} className="flex flex-col gap-4">
                <div>
                  <label
                    htmlFor="title"
                    className="mb-2 block text-sm font-semibold text-black"
                  >
                    Module Title
                  </label>
                  <input
                    id="title"
                    type="text"
                    placeholder="Enter module title"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-black placeholder-gray-400 focus:border-black focus:outline-none"
                  />
                </div>

                <div>
                  <label
                    htmlFor="description"
                    className="mb-2 block text-sm font-semibold text-black"
                  >
                    Description (Optional)
                  </label>
                  <textarea
                    id="description"
                    placeholder="Enter module description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-black placeholder-gray-400 focus:border-black focus:outline-none"
                    rows={3}
                  />
                </div>

                <div className="flex gap-4">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="rounded-lg bg-black px-6 py-2 font-semibold text-white hover:bg-gray-800 disabled:opacity-50"
                  >
                    {isSubmitting ? "Creating..." : "Create Module"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setFormData({ title: "", description: "" });
                    }}
                    className="rounded-lg border border-gray-300 px-6 py-2 font-semibold text-black hover:bg-gray-100"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Modules List */}
        {isLoading ? (
          <div className="text-center text-gray-600">Loading modules...</div>
        ) : modules.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-12 text-center">
            <p className="text-lg text-gray-600">No modules yet</p>
            <p className="text-sm text-gray-500">
              Create your first module to get started
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {modules.map((module) => (
              <div
                key={module.module_id}
                className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col"
              >
                <h3 className="mb-2 text-lg font-bold text-black">
                  {module.title}
                </h3>
                {module.description && (
                  <p className="mb-4 text-sm text-gray-600">
                    {module.description}
                  </p>
                )}
                <p className="mb-4 text-xs text-gray-500">
                  Created: {new Date(module.created_at).toLocaleDateString()}
                </p>
                <div className="mt-auto flex gap-2">
                  <Link
                    href={`/chatpage?moduleId=${module.module_id}`}
                    className="flex-1 rounded-lg bg-black px-3 py-2 text-center text-sm font-semibold text-white hover:bg-gray-800"
                  >
                    Open
                  </Link>
                  <button
                    onClick={() => handleDeleteModule(module.module_id)}
                    className="rounded-lg border border-red-300 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default LandingPage;