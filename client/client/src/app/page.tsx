"use client";

import Link from "next/link";
import ServerMessage from "./ServerMessage";

export default function Home() {
  return (
    <div className="flex h-screen w-full bg-white">
      {/* Main content - centered button */}
      <div className="flex flex-1 items-center justify-center">
        <div className="flex flex-col items-center gap-8">
          <h1 className="text-4xl font-bold text-black">Welcome</h1>
          <p className="text-lg text-gray-600">Start your conversation</p>
          <Link
            href="/loginpage"
            className="rounded-lg bg-black px-8 py-3 text-lg font-semibold text-white transition-colors hover:bg-gray-800"
          >
            Go to Chat
          </Link>
        </div>
      </div>

      {/* ServerMessage at bottom right */}
      <div className="absolute bottom-8 right-8">
        <ServerMessage />
      </div>
    </div>
  );
}
