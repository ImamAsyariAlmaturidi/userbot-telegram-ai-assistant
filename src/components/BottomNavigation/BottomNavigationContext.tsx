"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

interface BottomNavigationContextType {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const BottomNavigationContext = createContext<
  BottomNavigationContextType | undefined
>(undefined);

export function BottomNavigationProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [activeTab, setActiveTab] = useState("prompt");

  return (
    <BottomNavigationContext.Provider value={{ activeTab, setActiveTab }}>
      {children}
    </BottomNavigationContext.Provider>
  );
}

export function useBottomNavigation() {
  const context = useContext(BottomNavigationContext);
  if (context === undefined) {
    throw new Error(
      "useBottomNavigation must be used within BottomNavigationProvider"
    );
  }
  return context;
}
