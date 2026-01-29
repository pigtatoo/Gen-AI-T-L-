"use client";

import React, { useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

interface AddFeedComponentProps {
  onFeedAdded?: () => void;
  compact?: boolean;
}

interface FormData {
  url: string;
  name: string;
}

export default function AddFeedComponent({
  onFeedAdded,
  compact = false,
}: AddFeedComponentProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState<FormData>({ url: "", name: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [error, setError] = useState("");

  const handleAddFeed = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.url.trim() || !formData.name.trim()) {
      setError("Both URL and name are required");
      return;
    }

    try {
      setIsSubmitting(true);
      const token = localStorage.getItem("token");

      if (!token) {
        setError("Not authenticated");
        return;
      }

      const response = await fetch(`${API_URL}/api/feeds`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          url: formData.url.trim(),
          name: formData.name.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to add feed");
      }

      setFormData({ url: "", name: "" });
      setIsAdding(false);
      setSuccessMessage("Feed added successfully!");
      setError("");

      setTimeout(() => setSuccessMessage(""), 3000);
      onFeedAdded?.();
    } catch (err) {
      console.error("Error adding feed:", err);
      setError(err instanceof Error ? err.message : "Failed to add feed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
          {error}
        </div>
      )}
      {successMessage && (
        <div className="mb-4 rounded-lg bg-green-50 px-4 py-3 text-sm font-semibold text-green-600">
          {successMessage}
        </div>
      )}

      {!isAdding ? (
        <button
          onClick={() => setIsAdding(true)}
          className={`rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-blue-700 ${
            compact ? "text-sm py-2 px-4" : "text-base"
          }`}
        >
          + Add RSS Feed
        </button>
      ) : (
        <div className={`rounded-lg border border-gray-300 bg-gray-50 p-6 ${
          compact ? "p-4" : ""
        }`}>
          <h3 className={`mb-4 font-bold text-black ${
            compact ? "text-base" : "text-lg"
          }`}>
            Add Custom RSS Feed
          </h3>
          <form onSubmit={handleAddFeed} className="flex flex-col gap-4">
            <div>
              <label className="mb-2 block text-sm font-semibold text-black">
                Feed Name
              </label>
              <input
                type="text"
                placeholder="e.g., TechCrunch, HackerNews"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-black placeholder-gray-400 focus:border-black focus:outline-none"
                disabled={isSubmitting}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-black">
                Feed URL (RSS/Atom)
              </label>
              <input
                type="url"
                placeholder="e.g., https://feeds.example.com/rss"
                value={formData.url}
                onChange={(e) =>
                  setFormData({ ...formData, url: e.target.value })
                }
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-black placeholder-gray-400 focus:border-black focus:outline-none"
                disabled={isSubmitting}
              />
            </div>

            <div className="flex gap-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-lg bg-green-600 px-6 py-2 font-semibold text-white hover:bg-green-700 disabled:opacity-50"
              >
                {isSubmitting ? "Adding..." : "Add Feed"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsAdding(false);
                  setFormData({ url: "", name: "" });
                  setError("");
                }}
                className="rounded-lg border border-gray-300 px-6 py-2 font-semibold text-black hover:bg-gray-100"
                disabled={isSubmitting}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
