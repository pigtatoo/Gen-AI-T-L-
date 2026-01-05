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
    <div className="flex h-screen w-full bg-white">
      {/* Main content - centered */}
      <div className="flex flex-1 items-center justify-center">
        <div className="w-full max-w-md px-8">
          <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-2">
              <h1 className="text-4xl font-bold text-black">Profile</h1>
              <p className="text-lg text-gray-600">Your account information</p>
            </div>

            {/* User Information */}
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-gray-600">Full Name</label>
                <p className="text-lg text-black">{user?.name}</p>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-gray-600">Email</label>
                <p className="text-lg text-black">{user?.email}</p>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-gray-600">Role</label>
                <p className="text-lg text-black capitalize">{user?.role}</p>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-gray-600">Member Since</label>
                <p className="text-lg text-black">
                  {user?.createdAt
                    ? new Date(user.createdAt).toLocaleDateString()
                    : "N/A"}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3">
              <Link
                href="/landingpage"
                className="rounded-lg bg-black px-8 py-3 text-center text-lg font-semibold text-white transition-colors hover:bg-gray-800"
              >
                Back to Modules
              </Link>
              <button
                onClick={handleLogout}
                className="rounded-lg border border-gray-300 px-8 py-3 text-center text-lg font-semibold text-black transition-colors hover:bg-gray-50"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default UserPage;