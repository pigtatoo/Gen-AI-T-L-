"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("http://localhost:5000/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Login failed");
        setIsLoading(false);
        return;
      }

      // Store token and user info
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      // Redirect to chat page
      router.push("/landingpage");
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Login error:", err);
      setError("Network error. Make sure the server is running on http://localhost:5000");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-full bg-white">
      {/* Main content - centered form */}
      <div className="flex flex-1 items-center justify-center">
        <div className="w-full max-w-md px-8">
          <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-2">
              <h1 className="text-4xl font-bold text-black">Welcome Back</h1>
              <p className="text-lg text-gray-600">Sign in to your account</p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
              {error && (
                <div className="rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
                  {error}
                </div>
              )}
              <div className="flex flex-col gap-2">
                <label htmlFor="email" className="text-sm font-semibold text-black">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="rounded-lg border border-gray-300 bg-white px-4 py-3 text-black placeholder-gray-400 transition-colors focus:border-black focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="password" className="text-sm font-semibold text-black">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="rounded-lg border border-gray-300 bg-white px-4 py-3 text-black placeholder-gray-400 transition-colors focus:border-black focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="rounded-lg bg-black px-8 py-3 text-lg font-semibold text-white transition-colors hover:bg-gray-800 disabled:opacity-50"
              >
                {isLoading ? "Signing in..." : "Sign In"}
              </button>
            </form>

            <div className="flex items-center gap-2">
              <span className="text-gray-600">Don't have an account?</span>
              <Link href="/signuppage" className="font-semibold text-black hover:underline">
                Sign up
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;