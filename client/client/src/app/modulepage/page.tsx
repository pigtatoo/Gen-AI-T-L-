"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

interface Module {
  module_id: number;
  title: string;
  description: string;
  created_at: string;
  user_id: number;
}

function ModulePage() {
  const [module, setModule] = useState<Module | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({ title: "", description: "" });
  const [isSaving, setIsSaving] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const moduleId = searchParams.get("moduleId");

  useEffect(() => {
    if (moduleId) {
      fetchModuleDetails();
    } else {
      setError("Module ID not found");
      setIsLoading(false);
    }
  }, [moduleId]);

  const fetchModuleDetails = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem("token");

      if (!token) {
        router.push("/loginpage");
        return;
      }

      const response = await fetch(
        `http://localhost:5000/api/modules/${moduleId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch module details");
      }

      const data = await response.json();
      setModule(data);
      setEditData({ title: data.title, description: data.description });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error loading module");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!editData.title.trim()) {
      setError("Title is required");
      return;
    }

    setIsSaving(true);

    try {
      const token = localStorage.getItem("token");

      const response = await fetch(
        `http://localhost:5000/api/modules/${moduleId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(editData),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update module");
      }

      const updatedModule = await response.json();
      setModule(updatedModule);
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error updating module");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteModule = async () => {
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

      router.push("/landingpage");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error deleting module");
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <div className="text-center text-gray-600">Loading module...</div>
      </div>
    );
  }

  if (error && !module) {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <div className="text-center">
          <p className="mb-4 text-red-600 font-semibold">{error}</p>
          <Link
            href="/landingpage"
            className="rounded-lg bg-black px-6 py-3 text-white hover:bg-gray-800"
          >
            Back to Modules
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-4xl px-8 py-6 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-black">Module Details</h1>
          <Link
            href="/landingpage"
            className="rounded-lg bg-gray-200 px-4 py-2 text-sm font-semibold text-black hover:bg-gray-300"
          >
            Back to Modules
          </Link>
        </div>
      </div>

      {/* Main content */}
      <div className="mx-auto max-w-4xl px-8 py-12">
        {error && (
          <div className="mb-6 rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
            {error}
          </div>
        )}

        {module && (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-8">
            {!isEditing ? (
              <>
                {/* Display Mode */}
                <div className="mb-8">
                  <h2 className="mb-6 text-xl font-bold text-black">
                    {module.title}
                  </h2>

                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Title
                      </label>
                      <div className="rounded-lg border border-gray-300 bg-white px-4 py-3 text-black">
                        {module.title}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Description
                      </label>
                      <div className="rounded-lg border border-gray-300 bg-white px-4 py-3 text-black min-h-24">
                        {module.description || "No description provided"}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Module ID
                        </label>
                        <div className="rounded-lg border border-gray-300 bg-white px-4 py-3 text-black">
                          #{module.module_id}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Created Date
                        </label>
                        <div className="rounded-lg border border-gray-300 bg-white px-4 py-3 text-black">
                          {new Date(module.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="mt-8 flex gap-4">
                    <button
                      onClick={() => setIsEditing(true)}
                      className="rounded-lg bg-black px-6 py-3 font-semibold text-white hover:bg-gray-800"
                    >
                      Edit Module
                    </button>
                    <Link
                      href={`/chatpage?moduleId=${module.module_id}`}
                      className="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700 text-center"
                    >
                      Start Chat
                    </Link>
                    <button
                      onClick={handleDeleteModule}
                      className="rounded-lg border border-red-300 px-6 py-3 font-semibold text-red-600 hover:bg-red-50"
                    >
                      Delete Module
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Edit Mode */}
                <h2 className="mb-6 text-xl font-bold text-black">
                  Edit Module
                </h2>

                <form onSubmit={handleSaveChanges} className="space-y-6">
                  <div>
                    <label
                      htmlFor="title"
                      className="block text-sm font-semibold text-gray-700 mb-2"
                    >
                      Title
                    </label>
                    <input
                      id="title"
                      type="text"
                      value={editData.title}
                      onChange={(e) =>
                        setEditData({ ...editData, title: e.target.value })
                      }
                      className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-black focus:border-black focus:outline-none"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="description"
                      className="block text-sm font-semibold text-gray-700 mb-2"
                    >
                      Description
                    </label>
                    <textarea
                      id="description"
                      value={editData.description}
                      onChange={(e) =>
                        setEditData({
                          ...editData,
                          description: e.target.value,
                        })
                      }
                      className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-black focus:border-black focus:outline-none"
                      rows={5}
                    />
                  </div>

                  <div className="flex gap-4">
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="rounded-lg bg-black px-6 py-3 font-semibold text-white hover:bg-gray-800 disabled:opacity-50"
                    >
                      {isSaving ? "Saving..." : "Save Changes"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditing(false);
                        setEditData({
                          title: module.title,
                          description: module.description,
                        });
                      }}
                      className="rounded-lg border border-gray-300 px-6 py-3 font-semibold text-black hover:bg-gray-100"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default ModulePage;