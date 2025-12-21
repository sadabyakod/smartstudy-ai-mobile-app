import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import LearningHub from "./components/LearningHub";
import ChatScreen from "./components/ChatScreen";
import ModelPaperScreen from "./components/ModelPaperScreen";
import PUCExamScreen from "./components/PUCExamScreen";
import SyllabusScreen from "./components/SyllabusScreen";
import DownloadModelPapersScreen from "./components/DownloadModelPapersScreen";
import ResultsScreen from "./components/ResultsScreen";
import EvaluationHistoryScreen from "./components/EvaluationHistoryScreen";
import { NavigationContext, Screen, PendingEvaluation, CompletedEvaluationResult, ResultsScreenData } from "./navigation/NavigationContext";
import { ThemeProvider, useTheme } from "./contexts/ThemeContext";

function AppContent() {
  const { theme } = useTheme();
  const [stack, setStack] = useState<Screen[]>(["home"]);
  const [pendingEvaluation, setPendingEvaluation] = useState<PendingEvaluation | null>(null);
  const [completedEvaluation, setCompletedEvaluation] = useState<CompletedEvaluationResult | null>(null);
  const [resultsScreenData, setResultsScreenData] = useState<ResultsScreenData | null>(null);

  const currentScreen = stack[stack.length - 1];
  const canGoBack = stack.length > 1;

  const navigate = (screen: Screen) => {
    setStack((prev) => [...prev, screen]);
  };

  const goBack = () => {
    setStack((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case "home":
        return <LearningHub />;
      case "chat":
        return <ChatScreen />;
      case "exam":
        return <ModelPaperScreen />;
      case "puc-exam":
        return <PUCExamScreen />;
      case "syllabus":
        return <SyllabusScreen />;
      case "download-papers":
        return <DownloadModelPapersScreen />;
      case "results":
        return (
          <ResultsScreen 
            examResult={resultsScreenData?.examResult}
            examId={resultsScreenData?.examId}
            studentId={resultsScreenData?.studentId}
            examTitle={resultsScreenData?.examTitle}
            onBack={() => {
              setResultsScreenData(null);
              goBack();
            }}
          />
        );
      case "evaluation-history":
        return (
          <EvaluationHistoryScreen 
            onBack={() => goBack()}
          />
        );
      default:
        return <LearningHub />;
    }
  };

  return (
    <NavigationContext.Provider value={{ 
      currentScreen, 
      navigate, 
      goBack, 
      canGoBack,
      pendingEvaluation,
      setPendingEvaluation,
      completedEvaluation,
      setCompletedEvaluation,
      resultsScreenData,
      setResultsScreenData
    }}>
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.content}>
          {renderScreen()}
        </View>
      </View>
    </NavigationContext.Provider>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
});
