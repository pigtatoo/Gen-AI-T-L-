"use client";

import { useState } from "react";
import Link from "next/link";

export default function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(true);

  return (
    <>
      {/* Left Sidebar */}
      <div className={`flex flex-col border-r border-gray-200 bg-white p-4 ${isCollapsed ? "w-20" : "w-64"}`}>
        {/* Header - Team/Workspace */}
        <div className="mb-4 flex items-center justify-between flex-shrink-0">
          {!isCollapsed && (
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded bg-purple-600 text-white font-bold text-xs">
                W
              </div>
              <div>
                <p className="text-sm font-semibold text-black">widelab</p>
                <p className="text-xs text-gray-500">Team Plan</p>
              </div>
            </div>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="text-gray-400 hover:text-gray-600 flex-shrink-0 ml-auto"
          >
            {isCollapsed ? "→" : "←"}
          </button>
        </div>

        {/* Search */}
        {!isCollapsed && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 flex-shrink-0">
            <input
              type="text"
              placeholder="Search"
              className="flex-1 bg-transparent text-sm outline-none"
            />
          </div>
        )}

        {/* Main Menu */}
        <div className={`mb-4 ${isCollapsed ? "space-y-3" : "space-y-2"} flex-shrink-0`}>
          <Link href="/quizpage">
            <div className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-gray-100 cursor-pointer">
              {!isCollapsed && <span className="text-sm text-gray-700">Quiz</span>}
            </div>
          </Link>
          <Link href="/feedspage">
            <div className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-gray-100 cursor-pointer">
              {!isCollapsed && <span className="text-sm text-gray-700">📡 Feeds</span>}
            </div>
          </Link>
          <div className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-gray-100 cursor-pointer">
            {!isCollapsed && <span className="text-sm text-gray-700">Flashcards</span>}
          </div>
          <div className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-gray-100 cursor-pointer">
            {!isCollapsed && <span className="text-sm text-gray-700">Newsletter</span>}
          </div>
        </div>

        {/* Shared Section */}
        {!isCollapsed && (
          <div className="mb-4 flex-shrink-0">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-xs font-semibold text-gray-600 uppercase">Shared</h3>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-gray-100 cursor-pointer">
                <span className="text-sm text-gray-700">Boosts</span>
              </div>
              <div className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-gray-100 cursor-pointer">
                <span className="text-sm text-gray-700">Documents</span>
              </div>
            </div>
          </div>
        )}

        {/* Classes Section */}
        {!isCollapsed && (
          <div className="mb-4 flex-shrink-0">
            <h3 className="mb-2 text-xs font-semibold text-gray-600 uppercase">Classes</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-gray-100 cursor-pointer">
                <div className="h-3 w-3 rounded-full bg-green-400"></div>
                <span className="text-sm text-gray-700">DIT2303</span>
              </div>
              <div className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-gray-100 cursor-pointer">
                <div className="h-3 w-3 rounded-full bg-blue-400"></div>
                <span className="text-sm text-gray-700">DIT2404</span>
              </div>
              <div className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-gray-100 cursor-pointer">
                <div className="h-3 w-3 rounded-full bg-purple-400"></div>
                <span className="text-sm text-gray-700">DIT2505</span>
              </div>
              <div className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-gray-100 cursor-pointer text-gray-500">
                <span className="text-sm">+</span>
                <span className="text-sm">Add New Class</span>
              </div>
            </div>
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1"></div>

        {/* Bottom Menu */}
        <div className={`mb-4 border-t border-gray-200 pt-4 ${isCollapsed ? "space-y-3" : "space-y-2"} flex-shrink-0`}>
          <div className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-gray-100 cursor-pointer">
            {!isCollapsed && <span className="text-sm text-gray-700">Settings</span>}
          </div>
          <div className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-gray-100 cursor-pointer">
            {!isCollapsed && <span className="text-sm text-gray-700">Help</span>}
          </div>
        </div>

        {/* User Profile */}
        <div className="border-t border-gray-200 pt-4 flex-shrink-0">
          {isCollapsed ? (
            <div className="flex justify-center">
              <img src="https://via.placeholder.com/32" alt="User" className="h-8 w-8 rounded-full" />
            </div>
          ) : (
            <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3 hover:bg-gray-100 cursor-pointer">
              <div className="flex items-center gap-2 min-w-0">
                <img src="user.png" alt="User" className="h-8 w-8 rounded-full flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-black truncate">Teacher</p>
                  <p className="text-xs text-gray-500 truncate">teacher@gmail.com</p>
                </div>
              </div>
              <button className="text-gray-400 hover:text-gray-600 flex-shrink-0">⋯</button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
