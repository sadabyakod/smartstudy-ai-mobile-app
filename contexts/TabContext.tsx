import React from "react";

export type TabKey = "chat" | "exam";

export interface TabContextValue {
  activeTab: TabKey;
  setActiveTab: (tab: TabKey) => void;
}

export const TabContext = React.createContext<TabContextValue | null>(null);
