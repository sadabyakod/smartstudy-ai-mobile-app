import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import ChatScreen from "./components/ChatScreen";
import ExamScreen from "./components/ExamScreen";
import { TabContext, TabKey } from "./contexts/TabContext";

export default function App() {
  const [activeTab, setActiveTab] = useState<TabKey>("chat");

  return (
    <SafeAreaProvider>
      <TabContext.Provider value={{ activeTab, setActiveTab }}>
        <View style={styles.container}>
          <View style={styles.content}>
            {activeTab === "chat" ? <ChatScreen /> : <ExamScreen />}
          </View>
        </View>
      </TabContext.Provider>
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
