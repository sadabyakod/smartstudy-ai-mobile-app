import React from "react";

export type Screen = "home" | "chat" | "exam" | "puc-exam" | "syllabus" | "download-papers";

export interface PendingEvaluation {
  writtenSubmissionId: string;
  examId: string;
  studentId: string;
  subject: string;
  submittedAt: Date;
}

export const NavigationContext = React.createContext<{
  currentScreen: Screen;
  navigate: (screen: Screen) => void;
  goBack: () => void;
  canGoBack: boolean;
  pendingEvaluation: PendingEvaluation | null;
  setPendingEvaluation: (evaluation: PendingEvaluation | null) => void;
}>({
  currentScreen: "home",
  navigate: () => {},
  goBack: () => {},
  canGoBack: false,
  pendingEvaluation: null,
  setPendingEvaluation: () => {},
});
