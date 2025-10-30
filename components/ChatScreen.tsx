import React, { useReducer, useRef, useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Image,
  KeyboardAvoidingView,
  ScrollView,
  Keyboard,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

const API_URL = "https://app-wlanqwy7vuwmu.azurewebsites.net/api/chat";

const initialMessages = [
  {
    id: "1",
    text: "👋 Hi! I'm Smarty — your Smart Study AI Assistant. Ask me anything about your studies!",
    sender: "bot",
    time: new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    }),
  },
];

export default function ChatScreen() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const headerAnim = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef();
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [inputHeight, setInputHeight] = useState(44);

  const [messages, dispatch] = useReducer((state, action) => {
    switch (action.type) {
      case "add":
        return [...state, action.payload];
      default:
        return state;
    }
  }, initialMessages);

  const fadeIn = () => {
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 200);
  };

  // ✨ Animate header + fade-in initial message
  useEffect(() => {
    Animated.timing(headerAnim, {
      toValue: 1,
      duration: 700,
      useNativeDriver: true,
    }).start();

    // Fade in initial message on mount
    fadeIn();
    scrollToBottom();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (textToSend) => {
    const finalText = textToSend || input.trim();
    if (!finalText) return;

    const userMsg = {
      id: `${Date.now()}-${Math.random()}`,
      text: finalText,
      sender: "user",
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    dispatch({ type: "add", payload: userMsg });
    setInput("");
    Keyboard.dismiss();
    scrollToBottom();
    setIsTyping(true);

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ Question: userMsg.text }),
      });

      const text = await response.text();
      let answer = "No response from server.";
      try {
        const json = JSON.parse(text);
        answer = json.reply || json.answer || answer;
      } catch {
        answer = text;
      }

      const botMsg = {
        id: `${Date.now()}-${Math.random()}`,
        text: answer,
        sender: "bot",
        time: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };

      setTimeout(() => {
        dispatch({ type: "add", payload: botMsg });
        setIsTyping(false);
        fadeIn();
        scrollToBottom();
      }, 800);
    } catch {
      setIsTyping(false);
      const errorMsg = {
        id: `${Date.now()}-${Math.random()}`,
        text: "⚠️ Connection error. Please try again.",
        sender: "bot",
        time: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
      dispatch({ type: "add", payload: errorMsg });
      fadeIn();
      scrollToBottom();
    }
  };

  const handleMicPress = () => {
    alert("🎙️ Voice input coming soon!");
  };

  // typing animation dots
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animateDot = (dot, delay) => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(dot, {
            toValue: -4,
            duration: 300,
            delay,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ])
      ).start();
    };
    animateDot(dot1, 0);
    animateDot(dot2, 150);
    animateDot(dot3, 300);
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient colors={["#E0EAFC", "#CFDEF3"]} style={styles.gradient}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
        >
          {/* HEADER */}
          <Animated.View
            style={[
              styles.headerWrapper,
              {
                opacity: headerAnim,
                transform: [
                  {
                    translateY: headerAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-20, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <LinearGradient
              colors={["#0066FF", "#00C6FF"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.header}
            >
              <Image
                source={require("../assets/company-logo.jpeg")}
                style={styles.logo}
              />
              <View style={styles.headerTextContainer}>
                <Text style={styles.headerTitle}>My Friend</Text>
                <Text style={styles.headerSubtitle}>
                  Smart Study AI Assistant
                </Text>
              </View>
            </LinearGradient>
          </Animated.View>

          {/* CHAT */}
          <ScrollView
            ref={scrollViewRef}
            contentContainerStyle={styles.messagesContainer}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={scrollToBottom}
          >
            {messages.map((item) => (
              <Animated.View
                key={item.id}
                style={{
                  opacity: fadeAnim,
                  transform: [
                    {
                      translateY: fadeAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [10, 0],
                      }),
                    },
                  ],
                }}
              >
                {item.sender === "user" ? (
                  <View style={styles.userMessageWrapper}>
                    <LinearGradient
                      colors={["#0078FE", "#5AA9FF"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.userBubble}
                    >
                      <Text style={styles.userText}>{item.text}</Text>
                      <Text style={styles.timeText}>{item.time}</Text>
                    </LinearGradient>
                  </View>
                ) : (
                  <View style={styles.botMessageWrapper}>
                    <Image
                      source={require("../assets/chat-bot.jpeg")}
                      style={styles.chatBotImage}
                    />
                    <View style={styles.botBubble}>
                      <Text style={styles.botText}>{item.text}</Text>
                      <Text style={styles.timeText}>{item.time}</Text>
                    </View>
                  </View>
                )}
              </Animated.View>
            ))}

            {isTyping && (
              <View style={styles.typingIndicator}>
                <Image
                  source={require("../assets/chat-bot.jpeg")}
                  style={styles.chatBotImage}
                />
                <View style={styles.dotContainer}>
                  <Animated.View
                    style={[styles.dot, { transform: [{ translateY: dot1 }] }]}
                  />
                  <Animated.View
                    style={[styles.dot, { transform: [{ translateY: dot2 }] }]}
                  />
                  <Animated.View
                    style={[styles.dot, { transform: [{ translateY: dot3 }] }]}
                  />
                </View>
              </View>
            )}
          </ScrollView>

          {/* INPUT */}
          <View style={styles.inputWrapper}>
            <TouchableOpacity onPress={handleMicPress} style={styles.iconBtn}>
              <MaterialCommunityIcons
                name="microphone"
                size={22}
                color="#2563EB"
              />
            </TouchableOpacity>

            <TextInput
              style={[styles.input, { height: Math.max(44, inputHeight) }]}
              placeholder="Ask me anything..."
              value={input}
              onChangeText={setInput}
              onSubmitEditing={() => handleSend()}
              placeholderTextColor="#9CA3AF"
              multiline
              onContentSizeChange={(e) =>
                setInputHeight(e.nativeEvent.contentSize.height)
              }
            />

            <TouchableOpacity
              style={[styles.sendBtn, !input.trim() && { opacity: 0.4 }]}
              onPress={() => handleSend()}
              disabled={!input.trim()}
            >
              <Ionicons name="paper-plane" size={20} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={{ height: Platform.OS === "ios" ? 10 : 25 }} />
        </KeyboardAvoidingView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  gradient: { flex: 1 },
  headerWrapper: {
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    height: 95,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    paddingHorizontal: 16,
  },
  logo: { width: 42, height: 42, borderRadius: 12, marginRight: 10 },
  headerTextContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -6,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#fff",
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#DCEAFE",
    marginTop: 1,
    letterSpacing: 0.3,
  },
  messagesContainer: {
    flexGrow: 1,
    paddingHorizontal: 12,
    paddingBottom: 15,
  },
  chatBotImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 6,
  },
  userMessageWrapper: { alignItems: "flex-end", marginVertical: 6 },
  botMessageWrapper: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginVertical: 8,
  },
  userBubble: {
    padding: 12,
    borderRadius: 18,
    maxWidth: "80%",
    borderTopRightRadius: 4,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  botBubble: {
    backgroundColor: "#fff",
    borderWidth: 0.8,
    borderColor: "#E5E7EB",
    padding: 12,
    borderRadius: 18,
    borderTopLeftRadius: 4,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
    maxWidth: "80%",
  },
  userText: { color: "#fff", fontSize: 16 },
  botText: { color: "#333", fontSize: 16 },
  timeText: { fontSize: 10, color: "#888", marginTop: 4, alignSelf: "flex-end" },
  typingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 10,
    marginTop: 5,
  },
  dotContainer: { flexDirection: "row", marginLeft: 6, gap: 4 },
  dot: { width: 6, height: 6, backgroundColor: "#888", borderRadius: 3 },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: "#FFFFFF",
    marginHorizontal: 10,
    marginBottom: 10,
    borderRadius: 30,
    paddingVertical: 6,
    paddingHorizontal: 10,
    elevation: 5,
  },
  input: {
    flex: 1,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#C7D2FE",
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#F9FAFB",
    fontSize: 16,
    color: "#333",
  },
  iconBtn: {
    padding: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  sendBtn: {
    backgroundColor: "#2563EB",
    borderRadius: 20,
    padding: 10,
    marginLeft: 4,
  },
});
