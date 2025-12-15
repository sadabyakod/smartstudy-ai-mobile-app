import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { getSharedChat } from "../services/sharedChatApi";

interface SharedChatViewerProps {
  shareId: string;
  onContinueConversation: (messages: ChatMessage[]) => void;
  onClose: () => void;
}

type ChatMessage = {
  id: string;
  text: string;
  sender: "user" | "bot";
  time: string;
};

export default function SharedChatViewer({
  shareId,
  onContinueConversation,
  onClose,
}: SharedChatViewerProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [createdAt, setCreatedAt] = useState<string>("");

  useEffect(() => {
    loadSharedChat();
  }, [shareId]);

  const loadSharedChat = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await getSharedChat(shareId);
      
      // Convert messages to ChatMessage format with unique IDs
      const formattedMessages = data.messages.map((msg, index) => ({
        id: `shared-${index}-${Date.now()}`,
        text: msg.text,
        sender: msg.sender,
        time: msg.time,
      }));
      
      setMessages(formattedMessages);
      setCreatedAt(data.createdAt);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load shared chat");
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = () => {
    if (messages.length === 0) {
      Alert.alert("Error", "No messages to continue with");
      return;
    }
    
    onContinueConversation(messages);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <LinearGradient colors={["#E0EAFC", "#CFDEF3"]} style={styles.gradient}>
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#2563EB" />
            <Text style={styles.loadingText}>Loading shared conversation...</Text>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <LinearGradient colors={["#E0EAFC", "#CFDEF3"]} style={styles.gradient}>
          <View style={styles.centerContainer}>
            <Ionicons name="alert-circle" size={64} color="#EF4444" />
            <Text style={styles.errorTitle}>Unable to Load</Text>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient colors={["#E0EAFC", "#CFDEF3"]} style={styles.gradient}>
        {/* Header */}
        <LinearGradient
          colors={["#007bff", "#00b4d8"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.header}
        >
          <TouchableOpacity onPress={onClose} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Shared Conversation</Text>
            <Text style={styles.headerSubtitle}>Read-only</Text>
          </View>
          
          <View style={{ width: 40 }} />
        </LinearGradient>

        {/* Badge */}
        <View style={styles.readOnlyBadge}>
          <Ionicons name="lock-closed" size={14} color="#2563EB" />
          <Text style={styles.readOnlyText}>
            This is a read-only view of a shared conversation
          </Text>
        </View>

        {/* Messages */}
        <ScrollView
          contentContainerStyle={styles.messagesContainer}
          showsVerticalScrollIndicator={false}
        >
          {messages.map((item) => (
            <View key={item.id}>
              {item.sender === "user" ? (
                <View style={styles.userMessageWrapper}>
                  <LinearGradient
                    colors={["#0078FE", "#5AA9FF"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.userBubble}
                  >
                    <Text style={styles.userText}>{item.text}</Text>
                    <Text style={[styles.timeText, styles.userTimeText]}>
                      {item.time}
                    </Text>
                  </LinearGradient>
                </View>
              ) : (
                <View style={styles.botMessageWrapper}>
                  <View style={styles.botBubble}>
                    <Text style={styles.botText}>{item.text}</Text>
                    <Text style={styles.timeText}>{item.time}</Text>
                  </View>
                </View>
              )}
            </View>
          ))}
        </ScrollView>

        {/* Continue Button */}
        <View style={styles.continueContainer}>
          <TouchableOpacity
            style={styles.continueButton}
            onPress={handleContinue}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={["#2563EB", "#3B82F6"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.continueGradient}
            >
              <Ionicons name="chatbubbles" size={20} color="#fff" />
              <Text style={styles.continueButtonText}>
                Continue this conversation
              </Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
          <Text style={styles.continueHint}>
            Start your own chat with this conversation as context
          </Text>
        </View>

        <View style={{ height: Platform.OS === "ios" ? 10 : 25 }} />
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#E0EAFC",
  },
  gradient: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#2563EB",
    fontWeight: "600",
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1F2937",
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  closeButton: {
    backgroundColor: "#2563EB",
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 24,
  },
  closeButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: 65,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 6,
  },
  backButton: {
    padding: 8,
  },
  headerTextContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#fff",
    textAlign: "center",
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#DCEAFE",
    textAlign: "center",
    marginTop: 2,
  },
  readOnlyBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    paddingHorizontal: 16,
    paddingVertical: 10,
    margin: 12,
    borderRadius: 12,
    gap: 8,
  },
  readOnlyText: {
    flex: 1,
    fontSize: 13,
    color: "#2563EB",
    fontWeight: "600",
  },
  messagesContainer: {
    flexGrow: 1,
    paddingHorizontal: 12,
    paddingBottom: 15,
  },
  userMessageWrapper: {
    alignItems: "flex-end",
    marginVertical: 8,
  },
  botMessageWrapper: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginVertical: 8,
  },
  userBubble: {
    padding: 12,
    borderRadius: 24,
    maxWidth: "85%",
    borderTopRightRadius: 16,
    backgroundColor: "#2563EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  botBubble: {
    backgroundColor: "#F1F5F9",
    borderWidth: 0.8,
    borderColor: "#E5E7EB",
    padding: 12,
    borderRadius: 24,
    borderTopLeftRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
    maxWidth: "85%",
  },
  userText: {
    color: "#fff",
    fontSize: 16,
  },
  botText: {
    color: "#333",
    fontSize: 16,
  },
  timeText: {
    fontSize: 10,
    color: "#888",
    marginTop: 4,
    alignSelf: "flex-end",
  },
  userTimeText: {
    color: "#E0ECFF",
  },
  continueContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  continueButton: {
    borderRadius: 24,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  continueGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 10,
  },
  continueButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  continueHint: {
    fontSize: 12,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 8,
  },
});
