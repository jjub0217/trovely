"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import { Sidebar } from "./sidebar";

export function Header({
  email,
  totalReels,
  visitedReels,
}: {
  email: string;
  totalReels: number;
  visitedReels: number;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <>
      <div className="flex justify-between items-center px-6 py-4 border-b border-gray-800">
        <Link href="/" aria-label="Trove" className="flex items-center gap-2">
          <img src="/logo.png" alt="" className="h-8 w-8" />
          <span className="text-lg font-bold tracking-tight text-purple-100">
            Trove
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <Link href="/reels/new" className="bg-purple-600 px-4 py-2 rounded-lg text-sm">
            + 추가
          </Link>
          <button onClick={() => setSidebarOpen(true)} className="text-gray-400 hover:text-gray-200">
            <Menu size={22} />
          </button>
        </div>
      </div>
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        email={email}
        totalReels={totalReels}
        visitedReels={visitedReels}
      />
    </>
  );
}
