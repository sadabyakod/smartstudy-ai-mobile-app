import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import LearningHub from "./components/LearningHub";
import ChatScreen from "./components/ChatScreen";
import ModelPaperScreen from "./components/ModelPaperScreen";
import PUCExamScreen from "./components/PUCExamScreen";
import SyllabusScreen from "./components/SyllabusScreen";
import DownloadModelPapersScreen from "./components/DownloadModelPapersScreen";
import { NavigationContext, Screen, PendingEvaluation } from "./navigation/NavigationContext";

export default function App() {
  const [stack, setStack] = useState<Screen[]>(["home"]);
  const [pendingEvaluation, setPendingEvaluation] = useState<PendingEvaluation | null>(null);

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
      default:
        return <LearningHub />;
    }
  };

  return (
    <SafeAreaProvider>
      <NavigationContext.Provider value={{ 
        currentScreen, 
        navigate, 
        goBack, 
        canGoBack,
        pendingEvaluation,
        setPendingEvaluation 
      }}>
        <View style={styles.container}>
          <View style={styles.content}>
            {renderScreen()}
          </View>
        </View>
      </NavigationContext.Provider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F1F5F9",
  },
  content: {
    flex: 1,
  },
});
