"use client";

import { usePathname } from "next/navigation";
import { BottomNavigation } from "./BottomNavigation";
import { useBottomNavigation } from "./BottomNavigationContext";

export function BottomNavigationWrapper() {
  const pathname = usePathname();
  const { activeTab, setActiveTab } = useBottomNavigation();

  // Hanya tampilkan di halaman dashboard
  const isDashboard = pathname === "/dashboard";

  if (!isDashboard) {
    return null;
  }

  return <BottomNavigation activeTab={activeTab} onTabChange={setActiveTab} />;
}
