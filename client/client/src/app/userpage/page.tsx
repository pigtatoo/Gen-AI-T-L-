"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

function UserPage() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    fetchUserInfo();
  }, []);

  const fetchUserInfo = async () => {
    try {
      setIsLoading(true);
      const storedUser = localStorage.getItem("user");
      const token = localStorage.getItem("token");

      if (!token || !storedUser) {
        router.push("/loginpage");
        return;
      }

      const parsedUser = JSON.parse(storedUser);
      
      // In a real app, you'd fetch fresh data from the backend
      // For now, we'll use the stored user data
      const userData: User = {
        id: parsedUser.id,
        name: parsedUser.name,
        email: parsedUser.email,
        role: parsedUser.role || "student",
        createdAt: new Date().toISOString(),
      };

      setUser(userData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error loading user info");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/");
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <div className="text-center text-gray-600">Loading user info...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <div className="text-center">
          <p className="mb-4 text-red-600 font-semibold">{error}</p>
          <Link
            href="/loginpage"
            className="rounded-lg bg-black px-6 py-3 text-white hover:bg-gray-800"
          >
            Back to Login
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
          <h1 className="text-2xl font-bold text-black">Profile</h1>
          <div className="flex gap-4">
            <Link
              href="/landingpage"
              className="rounded-lg bg-gray-200 px-4 py-2 text-sm font-semibold text-black hover:bg-gray-300"
            >
              Back to Modules
            </Link>
            <button
              onClick={handleLogout}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="mx-auto max-w-4xl px-8 py-12">
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-8">
          <h2 className="mb-8 text-xl font-bold text-black">User Information</h2>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Name */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Full Name
              </label>
              <div className="rounded-lg border border-gray-300 bg-white px-4 py-3 text-black">
                {user?.name}
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Email
              </label>
              <div className="rounded-lg border border-gray-300 bg-white px-4 py-3 text-black">
                {user?.email}
              </div>
            </div>

            {/* Role */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Role
              </label>
              <div className="rounded-lg border border-gray-300 bg-white px-4 py-3">
                <span className="inline-block rounded-full bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-800 capitalize">
                  {user?.role}
                </span>
              </div>
            </div>

            {/* Account Status */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Account Status
              </label>
              <div className="rounded-lg border border-gray-300 bg-white px-4 py-3">
                <span className="inline-block rounded-full bg-green-100 px-3 py-1 text-sm font-semibold text-green-800">
                  Active
                </span>
              </div>
            </div>
          </div>

          {/* Account Details Section */}
          <div className="mt-8 border-t border-gray-300 pt-8">
            <h3 className="mb-6 text-lg font-bold text-black">Account Details</h3>

            <div className="space-y-4">
              <div className="flex justify-between rounded-lg border border-gray-300 bg-white p-4">
                <span className="font-semibold text-gray-700">User ID</span>
                <span className="text-gray-900">#{user?.id}</span>
              </div>

              <div className="flex justify-between rounded-lg border border-gray-300 bg-white p-4">
                <span className="font-semibold text-gray-700">Member Since</span>
                <span className="text-gray-900">
                  {user?.createdAt
                    ? new Date(user.createdAt).toLocaleDateString()
                    : "N/A"}
                </span>
              </div>

              <div className="flex justify-between rounded-lg border border-gray-300 bg-white p-4">
                <span className="font-semibold text-gray-700">Account Type</span>
                <span className="text-gray-900 capitalize">{user?.role}</span>
              </div>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="mt-8 border-t border-gray-300 pt-8">
            <h3 className="mb-6 text-lg font-bold text-red-600">Danger Zone</h3>
            <button className="rounded-lg border border-red-300 px-6 py-3 font-semibold text-red-600 hover:bg-red-50">
              Delete Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default UserPage;