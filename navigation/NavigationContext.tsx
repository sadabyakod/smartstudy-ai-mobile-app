import React from "react";

export type Screen = "home" | "chat" | "exam" | "puc-exam" | "syllabus" | "download-papers";

export interface PendingEvaluation {
  writtenSubmissionId: string;
  examId: string;
  studentId: string;
  subject: string;
  submittedAt: Date;
}

// Evaluation result to pass when navigating to results screen
export interface CompletedEvaluationResult {
  writtenSubmissionId: string;
  result: any; // The full evaluation result from API
}

export const NavigationContext = React.createContext<{
  currentScreen: Screen;
  navigate: (screen: Screen) => void;
  goBack: () => void;
  canGoBack: boolean;
  pendingEvaluation: PendingEvaluation | null;
  setPendingEvaluation: (evaluation: PendingEvaluation | null) => void;
  completedEvaluation: CompletedEvaluationResult | null;
  setCompletedEvaluation: (evaluation: CompletedEvaluationResult | null) => void;
}>({
  currentScreen: "home",
  navigate: () => {},
  goBack: () => {},
  canGoBack: false,
  pendingEvaluation: null,
  setPendingEvaluation: () => {},
  completedEvaluation: null,
  setCompletedEvaluation: () => {},
});
