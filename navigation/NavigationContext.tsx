import React from "react";

export type Screen = "home" | "chat" | "exam" | "puc-exam";

export const NavigationContext = React.createContext<{
  navigate: (screen: Screen) => void;
}>({
  navigate: () => {},
});
