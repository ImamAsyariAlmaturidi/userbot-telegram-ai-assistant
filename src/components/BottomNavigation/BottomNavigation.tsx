"use client";

import React from "react";
import {
  Home,
  FileText,
  BookOpen,
  Settings,
  User,
  type LucideIcon,
} from "lucide-react";
import "./BottomNavigation.css";
interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
}

interface BottomNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const navItems: NavItem[] = [
  {
    id: "home",
    label: "Home",
    icon: Home,
  },
  {
    id: "prompt",
    label: "Prompt",
    icon: FileText,
  },
  {
    id: "knowledge",
    label: "Knowledge",
    icon: BookOpen,
  },
  {
    id: "settings",
    label: "Settings",
    icon: Settings,
  },
  {
    id: "profile",
    label: "Profile",
    icon: User,
  },
];

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  activeTab,
  onTabChange,
}) => {
  return (
    <nav
      style={{
        position: "fixed",
        bottom: "20px",
        left: 0,
        right: 0,
        width: "calc(100% - 16px)",
        height: "72px",
        background: "rgba(29,29,29,.85)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        display: "flex",
        justifyContent: "space-around",
        alignItems: "center",
        borderRadius: "24px",
        boxShadow: "0 8px 32px rgba(0,0,0,.15)",
        padding: "0 12px",
        pointerEvents: "auto",
        border: "1px solid hsla(0,0%,100%,.08)",
        isolation: "isolate",
        zIndex: 1000,
        margin: "0 8px",
      }}
    >
      {navItems.map((item) => {
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              padding: "8px 12px",
              background: "none",
              border: "none",
              cursor: "pointer",
              transition: "all 0.2s ease",
              flex: 1,
              minWidth: 0,
              transform: isActive ? "translateY(-2px)" : "translateY(0)",
            }}
            onMouseDown={(e) => {
              if (!isActive) {
                e.currentTarget.style.transform = "translateY(0) scale(0.95)";
              }
            }}
            onMouseUp={(e) => {
              if (!isActive) {
                e.currentTarget.style.transform = "translateY(0) scale(1)";
              }
            }}
            onMouseEnter={(e) => {
              if (!isActive) {
                e.currentTarget.style.transform = "translateY(0) scale(1)";
                const icon = e.currentTarget.querySelector(
                  "[data-icon]"
                ) as HTMLElement;
                const label = e.currentTarget.querySelector(
                  "[data-label]"
                ) as HTMLElement;
                if (icon) icon.style.color = "#ffffff";
                if (label) label.style.color = "#ffffff";
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                e.currentTarget.style.transform = "translateY(0) scale(1)";
                const icon = e.currentTarget.querySelector(
                  "[data-icon]"
                ) as HTMLElement;
                const label = e.currentTarget.querySelector(
                  "[data-label]"
                ) as HTMLElement;
                if (icon) icon.style.color = "#9ca3af";
                if (label) label.style.color = "#9ca3af";
              }
            }}
          >
            <div
              data-icon
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "20px",
                height: "20px",
                color: isActive ? "#ffffff" : "#9ca3af",
                transition: "all 0.2s ease",
              }}
            >
              <item.icon size={20} />
            </div>
            <span
              data-label
              className="tracking-wide"
              style={{
                fontSize: "11px",
                fontWeight: 500,
                color: isActive ? "#ffffff" : "#9ca3af",
                transition: "all 0.2s ease",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
