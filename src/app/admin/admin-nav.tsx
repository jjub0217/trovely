"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  UserCheck,
  UserX,
  ArrowLeft,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

const iconMap = {
  LayoutDashboard,
  Users,
  UserCheck,
  UserX,
};

type NavItem = {
  href: string;
  label: string;
  icon: keyof typeof iconMap;
} | {
  label: string;
  icon: keyof typeof iconMap;
  children: { href: string; label: string }[];
};

export function AdminSidebar({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [openMenus, setOpenMenus] = useState<string[]>(() => {
    // 현재 경로에 해당하는 부모 메뉴 자동 열기
    return items
      .filter((item): item is Extract<NavItem, { children: unknown }> => "children" in item)
      .filter((item) => item.children.some((child) => pathname.startsWith(child.href)))
      .map((item) => item.label);
  });

  function toggleMenu(label: string) {
    setOpenMenus((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label]
    );
  }

  return (
    <aside
      className={`bg-gray-900 border-r border-gray-800 flex flex-col shrink-0 transition-all duration-300 ${
        collapsed ? "w-16" : "w-60"
      }`}
    >
      <div className={`flex items-center border-b border-gray-800 ${collapsed ? "justify-center p-3" : "justify-between p-5"}`}>
        {!collapsed && <h1 className="text-lg font-bold text-purple-400">Trovely Admin</h1>}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="text-gray-500 hover:text-gray-300 transition-colors cursor-pointer"
        >
          {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        </button>
      </div>

      <nav className="flex-1 p-2 space-y-1">
        {items.map((item) => {
          if ("children" in item) {
            const Icon = iconMap[item.icon];
            const isOpen = openMenus.includes(item.label);
            const isChildActive = item.children.some((child) => pathname.startsWith(child.href));

            if (collapsed) {
              return (
                <div key={item.label}>
                  <Link
                    href={item.children[0].href}
                    title={item.label}
                    className={`flex items-center justify-center px-2 py-2.5 rounded-lg text-sm transition-colors ${
                      isChildActive
                        ? "bg-purple-600/20 text-purple-400"
                        : "text-gray-400 hover:text-gray-200 hover:bg-gray-800"
                    }`}
                  >
                    <Icon size={18} className={isChildActive ? "text-purple-400" : "text-gray-500"} />
                  </Link>
                </div>
              );
            }

            return (
              <div key={item.label}>
                <button
                  onClick={() => toggleMenu(item.label)}
                  className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer ${
                    isChildActive
                      ? "text-purple-400"
                      : "text-gray-400 hover:text-gray-200 hover:bg-gray-800"
                  }`}
                >
                  <Icon size={18} className={isChildActive ? "text-purple-400" : "text-gray-500"} />
                  <span className="flex-1 text-left">{item.label}</span>
                  {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>
                {isOpen && (
                  <div className="ml-7 mt-1 space-y-1">
                    {item.children.map((child) => {
                      const isActive = pathname === child.href;
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          className={`block px-3 py-1.5 rounded-lg text-sm transition-colors ${
                            isActive
                              ? "bg-purple-600/20 text-purple-400"
                              : "text-gray-500 hover:text-gray-200 hover:bg-gray-800"
                          }`}
                        >
                          {child.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          const Icon = iconMap[item.icon];
          const isActive =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={`flex items-center gap-3 rounded-lg text-sm transition-colors ${
                collapsed ? "justify-center px-2 py-2.5" : "px-3 py-2"
              } ${
                isActive
                  ? "bg-purple-600/20 text-purple-400"
                  : "text-gray-400 hover:text-gray-200 hover:bg-gray-800"
              }`}
            >
              <Icon size={18} className={isActive ? "text-purple-400" : "text-gray-500"} />
              {!collapsed && item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-2 border-t border-gray-800">
        <Link
          href="/"
          title={collapsed ? "Trovely" : undefined}
          className={`flex items-center gap-2 rounded-lg text-sm text-gray-400 hover:text-gray-200 hover:bg-gray-800 transition-colors ${
            collapsed ? "justify-center px-2 py-2.5" : "px-3 py-2"
          }`}
        >
          <ArrowLeft size={16} />
          {!collapsed && "Trovely"}
        </Link>
      </div>
    </aside>
  );
}
