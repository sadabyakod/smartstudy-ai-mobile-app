import { ActivityIndicator, Dimensions, findNodeHandle, Linking, Share, Alert, Modal } from "react-native";
import React, { useReducer, useRef, useEffect, useState, useContext } from "react";
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
import * as Clipboard from 'expo-clipboard';
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import {
  sendChatMessage,
  fetchMostRecentSessionId,
  fetchChatHistory,
  ChatHistoryItem,
} from "../services/chatApi";
import { NavigationContext } from "../navigation/NavigationContext";

type ChatMessage = {
  id: string;
  text: string;
  sender: "user" | "bot";
  time: string;
};

const initialMessages: ChatMessage[] = [
  {
    id: "1",
    text: "Welcome to your Study Dashboard! Select a subject below to begin your learning journey.",
    sender: "bot",
    time: new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    }),
  },
];

export default function ChatScreen() {
  const { navigate } = useContext(NavigationContext);
  const [sessionId, setSessionId] = useState<string | null>(null);
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
  const [isFirstLoad, setIsFirstLoad] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);
  const [followUpQuestion, setFollowUpQuestion] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editText, setEditText] = useState("");
  
  type ChatAction =
    | { type: "add"; payload: ChatMessage }
    | { type: "set"; payload: ChatMessage[] }
    | { type: "update"; payload: { id: string; text: string } }
    | { type: "updateAndRemoveAfter"; payload: { id: string; text: string } };

  const [messages, dispatch] = useReducer((state: ChatMessage[], action: ChatAction) => {
    switch (action.type) {
      case "add":
        return [...state, action.payload];
      case "set":
        return Array.isArray(action.payload) ? action.payload : state;
      case "update":
        return state.map((msg) =>
          msg.id === action.payload.id ? { ...msg, text: action.payload.text } : msg
        );
      case "updateAndRemoveAfter":
        const index = state.findIndex((msg) => msg.id === action.payload.id);
        if (index === -1) return state;
        // Update the message and remove all messages after it
        const updatedMessages = state.slice(0, index + 1);
        updatedMessages[index] = { ...updatedMessages[index], text: action.payload.text };
        return updatedMessages;
      default:
        return state;
    }
  }, initialMessages);

  const formatTimestamp = (value?: string) => {
    if (!value) {
      return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    return parsed.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const mapHistoryToMessages = (items: ChatHistoryItem[]): ChatMessage[] => {
    const mapped: ChatMessage[] = [];
    items.forEach((entry, index) => {
      const baseId = entry.id ?? `history-${index}`;
      if (entry.message) {
        mapped.push({
          id: `${baseId}-user`,
          text: entry.message,
          sender: "user" as const,
          time: formatTimestamp(entry.timestamp),
        });
      }
      if (entry.reply) {
        mapped.push({
          id: `${baseId}-bot`,
          text: entry.reply,
          sender: "bot" as const,
          time: formatTimestamp(entry.timestamp),
        });
      }
    });
    return mapped.length ? mapped : [...initialMessages];
  };

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
    let isMounted = true;
    const loadHistory = async () => {
      const timeoutId = setTimeout(() => {
        if (isMounted) {
          setIsHistoryLoading(false);
        }
      }, 5000);

      try {
        const recentSession = await fetchMostRecentSessionId();
        if (!isMounted) return;
        if (recentSession) {
          setSessionId(recentSession);
          const historyItems = await fetchChatHistory(recentSession, 30);
          if (!isMounted) return;
          const hydrated = mapHistoryToMessages(historyItems);
          dispatch({ type: "set", payload: hydrated });
        }
      } catch {
        // no-op
      } finally {
        clearTimeout(timeoutId);
        if (isMounted) {
          setIsHistoryLoading(false);
        }
      }
    };
    loadHistory();
    return () => {
      isMounted = false;
    };
  }, []);

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
      sender: "user" as const,
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    dispatch({ type: "add", payload: userMsg });
    setInput("");
    setFollowUpQuestion(null);
    Keyboard.dismiss();
    scrollToBottom();
    setIsTyping(true);

    try {
      const response = await sendChatMessage({
        message: userMsg.text,
        language: 'English',
        sessionId,
      });

      if (response?.sessionId) {
        setSessionId(response.sessionId);
      }

      const answer =
        response?.reply ||
        response?.answer ||
        "No response from server.";

      const lowerText = finalText.toLowerCase().trim();
      const isDisagreement = 
        lowerText === "no" ||
        lowerText === "nope" ||
        lowerText === "disagree" ||
        lowerText === "i disagree" ||
        lowerText.startsWith("no ") ||
        lowerText.startsWith("i don't");

      if (response?.followUpQuestion && !isDisagreement) {
        setFollowUpQuestion(response.followUpQuestion);
      } else {
        setFollowUpQuestion(null);
      }

      const botMsg = {
        id: `${Date.now()}-${Math.random()}`,
        text: answer,
        sender: "bot" as const,
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
        text: "😔 Oops! We couldn't connect to our servers right now.\n\nPlease check your internet connection and try again. If the problem persists, our team is working on it!",
        sender: "bot" as const,
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

  const handleCopy = async (text: string) => {
    try {
      await Clipboard.setStringAsync(text);
    } catch (error) {
      // Silent fail
    }
  };

  const handleShare = async (text: string, messageId?: string) => {
    try {
      let shareContent = '';
      
      if (messageId) {
        // Find the message index
        const messageIndex = messages.findIndex(m => m.id === messageId);
        
        if (messageIndex >= 0) {
          const currentMessage = messages[messageIndex];
          
          if (currentMessage.sender === 'bot' && messageIndex > 0) {
            // Sharing a bot message - include the previous user question + bot response
            const userMessage = messages[messageIndex - 1];
            shareContent = `${userMessage.text}\n\n${currentMessage.text}`;
          } else if (currentMessage.sender === 'user' && messageIndex < messages.length - 1) {
            // Sharing a user message - include user message + next bot response (if exists)
            const nextMessage = messages[messageIndex + 1];
            if (nextMessage && nextMessage.sender === 'bot') {
              shareContent = `${currentMessage.text}\n\n${nextMessage.text}`;
            } else {
              shareContent = text;
            }
          } else {
            // Just share the single message
            shareContent = text;
          }
        } else {
          shareContent = text;
        }
      } else {
        shareContent = text;
      }
      
      await Share.share({ message: shareContent });
    } catch (error) {
      Alert.alert("Error", "Failed to share");
    }
  };

  const handleEditMessage = (messageId: string, currentText: string) => {
    setEditingMessageId(messageId);
    setEditText(currentText);
    setEditModalVisible(true);
  };

  const handleSendEditedMessage = async () => {
    if (!editingMessageId || !editText.trim()) return;

    const finalText = editText.trim();
    
    // Close modal
    setEditModalVisible(false);
    
    // Update the message and remove all messages after it (old bot responses)
    dispatch({ 
      type: "updateAndRemoveAfter", 
      payload: { id: editingMessageId, text: finalText } 
    });
    
    // Clear edit state
    setEditingMessageId(null);
    setEditText("");
    setFollowUpQuestion(null);
    scrollToBottom();
    setIsTyping(true);

    // Send the edited message to get new response
    try {
      const response = await sendChatMessage({
        message: finalText,
        language: 'English',
        sessionId,
      });

      if (response?.sessionId) {
        setSessionId(response.sessionId);
      }

      const answer = response?.reply || response?.answer || "No response from server.";
      
      if (response?.followUpQuestion) {
        setFollowUpQuestion(response.followUpQuestion);
      } else {
        setFollowUpQuestion(null);
      }

      const botMsg = {
        id: `${Date.now()}-${Math.random()}`,
        text: answer,
        sender: "bot" as const,
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
        text: "😔 Oops! We couldn't connect to our servers right now.\n\nPlease check your internet connection and try again.",
        sender: "bot" as const,
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

  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isTyping) return;

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

    return () => {
      dot1.stopAnimation();
      dot2.stopAnimation();
      dot3.stopAnimation();
    };
  }, [isTyping, dot1, dot2, dot3]);

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
            Welcome to Study Assistant
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
      <LinearGradient colors={["#f8fafc", "#eef2ff", "#e0e7ff"]} style={styles.gradient}>
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
              colors={["#667eea", "#764ba2"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.header}
            >
              {/* Back Button */}
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => navigate("home")}
                activeOpacity={0.8}
              >
                <Ionicons name="arrow-back" size={22} color="#fff" />
              </TouchableOpacity>

              {/* AI Avatar */}
              <View style={styles.aiAvatarContainer}>
                <LinearGradient
                  colors={["#fff", "#f0f4ff"]}
                  style={styles.aiAvatar}
                >
                  <Ionicons name="sparkles" size={22} color="#667eea" />
                </LinearGradient>
                <View style={styles.onlineIndicator} />
              </View>

              <View style={styles.headerTextContainer}>
                <Text style={styles.headerTitle}>AI Study Assistant</Text>
                <View style={styles.statusContainer}>
                  <View style={styles.statusDot} />
                  <Text style={styles.headerSubtitle}>Online • Ready to help</Text>
                </View>
              </View>

              {/* Menu Button */}
              <TouchableOpacity
                style={styles.menuButton}
                onPress={() => navigate("home")}
                activeOpacity={0.8}
              >
                <Ionicons name="home-outline" size={22} color="#fff" />
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
            {isHistoryLoading && (
              <View style={styles.historyLoader}>
                <ActivityIndicator size="small" color="#2563EB" />
                <Text style={styles.historyLoaderText}>Loading previous messages…</Text>
              </View>
            )}

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
                      colors={["#667eea", "#764ba2"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.userBubble}
                    >
                      <TouchableOpacity 
                        onLongPress={() => handleEditMessage(item.id, item.text)}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.userText}>{item.text}</Text>
                        <View style={styles.messageFooter}>
                          <Text style={[styles.timeText, styles.userTimeText]}>
                            {item.time}
                          </Text>
                          <Ionicons name="checkmark-done" size={14} color="rgba(255,255,255,0.7)" />
                        </View>
                      </TouchableOpacity>
                    </LinearGradient>
                    <View style={styles.actionBar}>
                      <TouchableOpacity onPress={() => handleCopy(item.text)} style={styles.actionButton}>
                        <Ionicons name="copy-outline" size={15} color="#9CA3AF" />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleShare(item.text, item.id)} style={styles.actionButton}>
                        <Ionicons name="share-social-outline" size={15} color="#9CA3AF" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <View style={styles.botMessageWrapper}>
                    <View style={styles.botAvatarSmall}>
                      <Ionicons name="sparkles" size={14} color="#667eea" />
                    </View>
                    <View style={styles.botBubbleContainer}>
                      <View style={styles.botBubble}>
                        <Text style={styles.botText}>{item.text}</Text>
                        <Text style={styles.timeText}>{item.time}</Text>
                      </View>
                      <View style={styles.actionBar}>
                        <TouchableOpacity onPress={() => handleCopy(item.text)} style={styles.actionButton}>
                          <Ionicons name="copy-outline" size={15} color="#9CA3AF" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleShare(item.text, item.id)} style={styles.actionButton}>
                          <Ionicons name="share-social-outline" size={15} color="#9CA3AF" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                )}
              </Animated.View>
            ))}

            {isTyping && (
              <View style={styles.typingContainer}>
                <View style={styles.botAvatarSmall}>
                  <Ionicons name="sparkles" size={14} color="#667eea" />
                </View>
                <View style={styles.typingBubble}>
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
                  <Text style={styles.typingText}>AI is thinking...</Text>
                </View>
              </View>
            )}
          </ScrollView>

          {/* FOLLOW-UP QUESTION CHIP */}
          {followUpQuestion && (
            <View style={styles.followUpContainer}>
              <TouchableOpacity
                style={styles.followUpChip}
                onPress={() => {
                  setFollowUpQuestion(null);
                  handleSend(followUpQuestion);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.followUpText}>{followUpQuestion}</Text>
                <Ionicons name="arrow-forward-circle" size={18} color="#2563EB" />
              </TouchableOpacity>
            </View>
          )}

          {/* EDIT MODAL */}
          <Modal
            visible={editModalVisible}
            transparent={true}
            animationType="fade"
            onRequestClose={() => {
              setEditModalVisible(false);
              setEditingMessageId(null);
              setEditText("");
            }}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.editModalContainer}>
                <TextInput
                  style={styles.editModalInput}
                  value={editText}
                  onChangeText={setEditText}
                  multiline
                  autoFocus
                  placeholder="Edit your message..."
                />
                <View style={styles.editModalButtons}>
                  <TouchableOpacity 
                    style={styles.editModalCancelButton}
                    onPress={() => {
                      setEditModalVisible(false);
                      setEditingMessageId(null);
                      setEditText("");
                    }}
                  >
                    <Text style={styles.editModalCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.editModalSendButton}
                    onPress={handleSendEditedMessage}
                  >
                    <Ionicons name="paper-plane" size={18} color="#fff" />
                    <Text style={styles.editModalSendText}>Send</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>

          {/* INPUT */}
          <View style={styles.inputContainer}>
            <View style={styles.inputWrapper}>
              <View style={styles.inputIconLeft}>
                <Ionicons name="chatbubble-ellipses-outline" size={20} color="#9CA3AF" />
              </View>
              <TextInput
                style={[styles.input, { height: Math.max(44, inputHeight) }]}
                placeholder="Ask me anything about your studies..."
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
                style={[
                  styles.sendBtn,
                  input.trim() ? styles.sendBtnActive : styles.sendBtnInactive
                ]}
                onPress={() => handleSend(input)}
                disabled={!input.trim()}
              >
                <LinearGradient
                  colors={input.trim() ? ["#667eea", "#764ba2"] : ["#E5E7EB", "#E5E7EB"]}
                  style={styles.sendBtnGradient}
                >
                  <Ionicons 
                    name="send" 
                    size={18} 
                    color={input.trim() ? "#fff" : "#9CA3AF"} 
                  />
                </LinearGradient>
              </TouchableOpacity>
            </View>
            <Text style={styles.poweredBy}>Powered by AI • SmartStudy</Text>
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
    height: 70,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    paddingHorizontal: 16,
    shadowColor: "#667eea",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  aiAvatarContainer: {
    position: "relative",
    marginLeft: 12,
  },
  aiAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.5)",
  },
  onlineIndicator: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#22C55E",
    borderWidth: 2,
    borderColor: "#fff",
  },
  headerTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 0.3,
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#22C55E",
    marginRight: 6,
  },
  headerSubtitle: {
    fontSize: 12,
    color: "rgba(255,255,255,0.85)",
    letterSpacing: 0.2,
  },
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  shareConversationButton: {
    backgroundColor: "rgba(255,255,255,0.2)",
    padding: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    marginRight: 8,
  },
  examButtonText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
    marginLeft: 4,
  },
  examLinkButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
    marginRight: 10,
  },
  examLinkText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 13,
  },
  historyLoader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
  historyLoaderText: {
    marginLeft: 8,
    color: "#2563EB",
    fontSize: 13,
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 6,
  },
  userMessageWrapper: { 
    alignItems: "flex-end", 
    marginVertical: 6,
    paddingLeft: 16,
  },
  botMessageWrapper: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginVertical: 6,
    paddingRight: 16,
  },
  botAvatarSmall: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(102, 126, 234, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
    marginTop: 4,
  },
  botBubbleContainer: {
    flex: 1,
  },
  userBubble: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    borderTopRightRadius: 6,
    shadowColor: "#667eea",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  botBubble: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    borderTopLeftRadius: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  userText: { 
    color: "#fff", 
    fontSize: 15,
    lineHeight: 22,
  },
  botText: { 
    color: "#1F2937", 
    fontSize: 15,
    lineHeight: 22,
  },
  messageFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: 6,
    gap: 4,
  },
  timeText: {
    fontSize: 11,
    color: "#9CA3AF",
    alignSelf: "flex-end",
  },
  userTimeText: {
    color: "rgba(255,255,255,0.7)",
  },
  typingContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginVertical: 6,
    paddingRight: 50,
  },
  typingBubble: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    borderTopLeftRadius: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  typingText: {
    fontSize: 13,
    color: "#9CA3AF",
    marginLeft: 8,
    fontStyle: "italic",
  },
  dotContainer: { flexDirection: "row", gap: 4 },
  dot: { width: 8, height: 8, backgroundColor: "#667eea", borderRadius: 4 },
  followUpContainer: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#fff",
  },
  followUpChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(102, 126, 234, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(102, 126, 234, 0.3)",
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
    alignSelf: "flex-start",
  },
  followUpText: {
    color: "#667eea",
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
  },
  inputContainer: {
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    paddingVertical: 6,
    paddingHorizontal: 6,
    shadowColor: "#667eea",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: "rgba(102, 126, 234, 0.15)",
  },
  inputIconLeft: {
    padding: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  input: {
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 10,
    fontSize: 16,
    color: "#1F2937",
    maxHeight: 120,
  },
  sendBtn: {
    marginLeft: 4,
    marginBottom: 2,
  },
  sendBtnActive: {},
  sendBtnInactive: {},
  sendBtnGradient: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: "center",
    alignItems: "center",
  },
  poweredBy: {
    textAlign: "center",
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 8,
    letterSpacing: 0.3,
  },
  actionBar: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    paddingHorizontal: 8,
  },
  actionButton: {
    padding: 4,
    marginRight: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  editModalContainer: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    width: "100%",
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  editModalInput: {
    fontSize: 16,
    color: "#333",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    borderRadius: 12,
    padding: 12,
    minHeight: 80,
    maxHeight: 200,
    backgroundColor: "#F9FAFB",
    marginBottom: 16,
  },
  editModalButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
  },
  editModalCancelButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
  },
  editModalCancelText: {
    color: "#6B7280",
    fontSize: 15,
    fontWeight: "600",
  },
  editModalSendButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "#2563EB",
  },
  editModalSendText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
});