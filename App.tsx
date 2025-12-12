import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import LearningHub from "./components/LearningHub";
import ChatScreen from "./components/ChatScreen";
import ModelPaperScreen from "./components/ModelPaperScreen";
import PUCExamScreen from "./components/PUCExamScreen";
import { NavigationContext, Screen } from "./navigation/NavigationContext";

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>("home");

  const navigate = (screen: Screen) => {
    setCurrentScreen(screen);
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
      default:
        return <LearningHub />;
    }
  };

  return (
    <SafeAreaProvider>
      <NavigationContext.Provider value={{ navigate }}>
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
