import { Dimensions, findNodeHandle, Linking } from "react-native";
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
    text: "👋 Hi!  I'm Smarty — your Smart Study AI Assistant. Ask me anything about your studies, solve doubts and more... What would you like to learn today?",
    sender: "bot",
    time: new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    }),
  },
];

export default function ChatScreen() {
  const [showBotTooltip, setShowBotTooltip] = useState(false);
  const botTooltipAnim = useRef(new Animated.Value(0)).current;
  const [tooltipLeft, setTooltipLeft] = useState(0);
  const botIconRef = useRef(null);
  const botIconNode = useRef(null);

  const handleBotIconPress = () => {
    if (botIconNode.current) {
      const handle = findNodeHandle(botIconNode.current);
      if (handle) {
        botIconNode.current.measureInWindow((x, y, width, height) => {
          const screenWidth = Dimensions.get("window").width;
          const tooltipWidth = 160;
          let left = x + width / 2 - tooltipWidth / 2;
          if (left < 8) left = 8;
          if (left + tooltipWidth > screenWidth - 8)
            left = screenWidth - tooltipWidth - 8;
          setTooltipLeft(left);
          setShowBotTooltip(true);
          Animated.timing(botTooltipAnim, {
            toValue: 1,
            duration: 250,
            useNativeDriver: true,
          }).start();
          setTimeout(() => {
            Animated.timing(botTooltipAnim, {
              toValue: 0,
              duration: 250,
              useNativeDriver: true,
            }).start(() => setShowBotTooltip(false));
          }, 1800);
        });
      }
    }
  };

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const headerAnim = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef(null);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [inputHeight, setInputHeight] = useState(44);
  const [isFirstLoad, setIsFirstLoad] = useState(true);
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

  useEffect(() => {
    if (isFirstLoad) {
      const t = setTimeout(() => setIsFirstLoad(false), 1200);
      return () => clearTimeout(t);
    }
  }, [isFirstLoad]);

  useEffect(() => {
    Animated.timing(headerAnim, {
      toValue: 1,
      duration: 700,
      useNativeDriver: true,
    }).start();
    fadeIn();
    scrollToBottom();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (textToSend) => {
    const finalText = textToSend !== undefined ? textToSend : input.trim();
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

  if (isFirstLoad) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#E0EAFC",
        }}
      >
        <View
          style={{
            padding: 32,
            borderRadius: 24,
            backgroundColor: "#fff",
            elevation: 4,
            shadowColor: "#000",
            shadowOpacity: 0.08,
            shadowRadius: 8,
            alignItems: "center",
          }}
        >
          <Text
            style={{
              fontSize: 28,
              fontWeight: "bold",
              color: "#2563EB",
              textAlign: "center",
              marginBottom: 16,
            }}
          >
            👋 Welcome to Your AI Smart Study Assistant
          </Text>
          <Text
            style={{
              fontSize: 16,
              color: "#333",
              textAlign: "center",
              marginBottom: 18,
            }}
          >
            I’m here to help you with studies, assignments, and more...
          </Text>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              marginTop: 8,
            }}
          >
            <MaterialCommunityIcons
              name="alpha-n-circle"
              size={22}
              color="#2563EB"
              style={{ marginRight: 6 }}
            />
            <Text
              style={{
                fontSize: 14,
                color: "#2563EB",
                textAlign: "center",
                fontWeight: "600",
                marginRight: 4,
              }}
            >
              Powered by Neurozic
            </Text>
            <MaterialCommunityIcons
              name="heart"
              size={18}
              color="#FF3366"
              style={{ marginRight: 6 }}
            />
            <Text
              style={{
                fontSize: 14,
                color: "#2563EB",
                textAlign: "center",
                fontWeight: "600",
              }}
            >
              Software Solutions Pvt Ltd
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

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
              colors={["#007bff", "#00b4d8"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.header}
            >
              {/* ✅ Clickable Logo */}
              <TouchableOpacity
                onPress={() =>
                  Linking.openURL("https://neurozicsoft.vercel.app/")
                }
                activeOpacity={0.8}
              >
                <Image
                  source={require("../assets/company-logo.jpeg")}
                  style={styles.logo}
                />
              </TouchableOpacity>

              <View style={styles.headerTextContainer}>
                <Text style={styles.headerTitle}>My Friend</Text>
                <Text style={styles.headerSubtitle}>
                  Smart Study AI Assistant
                </Text>
              </View>

              <TouchableOpacity onPress={handleBotIconPress} activeOpacity={0.7}>
                <View
                  style={{ position: "relative", alignItems: "center" }}
                  ref={(el) => {
                    botIconRef.current = el;
                    botIconNode.current = el;
                  }}
                >
                  <Image
                    source={require("../assets/chat-bot.jpeg")}
                    style={styles.headerBotLogo}
                  />
                  {showBotTooltip && (
                    <Animated.View
                      style={[
                        styles.botTooltip,
                        {
                          opacity: botTooltipAnim,
                          top: -44,
                          left: tooltipLeft,
                          transform: [
                            {
                              translateY: botTooltipAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [10, -30],
                              }),
                            },
                          ],
                        },
                      ]}
                    >
                      <Text style={styles.botTooltipText}>Ask Smarty 🧠</Text>
                    </Animated.View>
                  )}
                </View>
              </TouchableOpacity>
            </LinearGradient>
          </Animated.View>

          {/* CHAT AREA */}
          <ScrollView
            ref={scrollViewRef}
            contentContainerStyle={styles.messagesContainer}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="always"
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
            <TextInput
              style={[styles.input, { height: Math.max(44, inputHeight) }]}
              placeholder="Ask me anything..."
              value={input}
              onChangeText={setInput}
              onSubmitEditing={() => handleSend(input)}
              placeholderTextColor="#9CA3AF"
              multiline
              onContentSizeChange={(e) =>
                setInputHeight(e.nativeEvent.contentSize.height)
              }
              onFocus={scrollToBottom}
            />

            <TouchableOpacity
              style={[styles.sendBtn, !input.trim() && { opacity: 0.4 }]}
              onPress={() => handleSend(input)}
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
  botTooltip: {
    position: "absolute",
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 6,
    zIndex: 10,
    maxWidth: 160,
    alignItems: "center",
  },
  botTooltipText: {
    color: "#2563EB",
    fontWeight: "600",
    fontSize: 14,
    textAlign: "center",
  },
  headerBotLogo: {
    width: 38,
    height: 38,
    borderRadius: 12,
    marginLeft: 10,
  },
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
    justifyContent: "center",
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
  logo: { width: 42, height: 42, borderRadius: 12, marginRight: 10 },
  headerTextContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#fff",
    textAlign: "center",
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 13,
    color: "#DCEAFE",
    textAlign: "center",
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
  userMessageWrapper: { alignItems: "flex-end", marginVertical: 8 },
  botMessageWrapper: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginVertical: 8,
  },
  userBubble: {
    padding: 12,
    borderRadius: 24,
    maxWidth: "100%",
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
    maxWidth: "100%",
  },
  userText: { color: "#fff", fontSize: 16 },
  botText: { color: "#333", fontSize: 16 },
  timeText: {
    fontSize: 10,
    color: "#888",
    marginTop: 4,
    alignSelf: "flex-end",
  },
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
  sendBtn: {
    backgroundColor: "#2563EB",
    borderRadius: 20,
    padding: 10,
    marginLeft: 4,
  },
});
