import React, { useContext, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  Dimensions,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { NavigationContext } from "../navigation/NavigationContext";
import { checkSubmissionStatus, getExamResults, SubmissionStatusResponse } from "../services/pucExamApi";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// ============================================
// DESIGN SYSTEM - Consistent spacing & typography
// ============================================

const COLORS = {
  // Primary palette
  primary: "#2563EB",
  primaryLight: "#3B82F6",
  primaryDark: "#1D4ED8",

  // Background colors
  background: "#F8FAFC",
  surface: "#FFFFFF",

  // Text colors
  textPrimary: "#0F172A",
  textSecondary: "#475569",
  textTertiary: "#94A3B8",
  textInverse: "#FFFFFF",

  // Semantic colors
  success: "#059669",
  warning: "#D97706",
  error: "#DC2626",

  // Feature gradients
  studyHelp: ["#7C3AED", "#9333EA"] as [string, string],
  mcq: ["#059669", "#10B981"] as [string, string],
  pucExam: ["#DC2626", "#EF4444"] as [string, string],
  modelPapers: ["#EA580C", "#F97316"] as [string, string],

  // Subject colors
  mathematics: "#2563EB",
  physics: "#7C3AED",
  chemistry: "#059669",
  biology: "#16A34A",
  english: "#EA580C",
  computerScience: "#0891B2",

  // Border & divider
  border: "#E2E8F0",
  divider: "#F1F5F9",
};

const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
};

const TYPOGRAPHY = {
  // Headlines
  h1: { fontSize: 24, fontWeight: "700" as const, lineHeight: 32 },
  h2: { fontSize: 20, fontWeight: "600" as const, lineHeight: 28 },
  h3: { fontSize: 18, fontWeight: "600" as const, lineHeight: 26 },

  // Titles
  titleLarge: { fontSize: 16, fontWeight: "600" as const, lineHeight: 24 },
  titleMedium: { fontSize: 15, fontWeight: "500" as const, lineHeight: 22 },
  titleSmall: { fontSize: 14, fontWeight: "500" as const, lineHeight: 20 },

  // Body text
  bodyLarge: { fontSize: 16, fontWeight: "400" as const, lineHeight: 24 },
  bodyMedium: { fontSize: 14, fontWeight: "400" as const, lineHeight: 22 },
  bodySmall: { fontSize: 13, fontWeight: "400" as const, lineHeight: 20 },

  // Labels & captions
  labelMedium: { fontSize: 12, fontWeight: "500" as const, lineHeight: 18 },
  caption: { fontSize: 12, fontWeight: "400" as const, lineHeight: 16 },
};

const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 999,
};

const ICON_SIZE = {
  sm: 20,
  md: 24,
  lg: 28,
  xl: 32,
};

const CARD_WIDTH = (SCREEN_WIDTH - SPACING.xxl * 2 - SPACING.md) / 2;

// ============================================
// COMPONENT DATA
// ============================================

const subjects = [
  { id: 1, name: "Mathematics", icon: "calculator-outline", color: COLORS.mathematics, questions: 500 },
  { id: 2, name: "Physics", icon: "planet-outline", color: COLORS.physics, questions: 450 },
  { id: 3, name: "Chemistry", icon: "flask-outline", color: COLORS.chemistry, questions: 420 },
  { id: 4, name: "Biology", icon: "leaf-outline", color: COLORS.biology, questions: 380 },
  { id: 5, name: "English", icon: "book-outline", color: COLORS.english, questions: 300 },
  { id: 6, name: "Computer Science", icon: "desktop-outline", color: COLORS.computerScience, questions: 280 },
];

// ============================================
// EVALUATION STATUS CONFIG
// ============================================

const STATUS_CONFIG = {
  PendingEvaluation: { icon: "⏳", color: "#F59E0B", message: "Your answer sheet is being processed..." },
  OcrProcessing: { icon: "📄", color: "#3B82F6", message: "Extracting text from your answer sheet..." },
  Evaluating: { icon: "🤖", color: "#8B5CF6", message: "AI is evaluating your answers..." },
  Completed: { icon: "✅", color: "#10B981", message: "Evaluation completed! Your results are ready." },
  Failed: { icon: "❌", color: "#EF4444", message: "Evaluation failed. Please contact support." }
};

// ============================================
// COMPONENT
// ============================================

export default function LearningHub() {
  const { navigate, pendingEvaluation, setPendingEvaluation } = useContext(NavigationContext);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [evaluationStatus, setEvaluationStatus] = useState<SubmissionStatusResponse | null>(null);

  // Get current status config
  const getCurrentStatusConfig = () => {
    const status = evaluationStatus?.status || "PendingEvaluation";
    return STATUS_CONFIG[status] || STATUS_CONFIG.PendingEvaluation;
  };

  const handleCheckStatus = async () => {
    if (!pendingEvaluation) return;
    
    setIsCheckingStatus(true);
    try {
      const status = await checkSubmissionStatus(pendingEvaluation.writtenSubmissionId);
      setEvaluationStatus(status);
      
      if (status.isComplete) {
        if (status.status === "Completed" && status.result) {
          Alert.alert(
            "✅ Evaluation Complete!",
            `Your score: ${status.result.grandScore}/${status.result.grandTotalMarks} (${status.result.percentage.toFixed(1)}%)\nGrade: ${status.result.grade}`,
            [
              {
                text: "View Details",
                onPress: () => {
                  // Navigate to PUC exam to show results
                  navigate("puc-exam");
                },
              },
              {
                text: "Dismiss",
                onPress: () => {
                  setPendingEvaluation(null);
                  setEvaluationStatus(null);
                },
              },
            ]
          );
        } else if (status.status === "Failed") {
          Alert.alert(
            "❌ Evaluation Failed",
            status.statusMessage || "There was an error evaluating your answer sheet. Please contact support.",
            [
              {
                text: "Dismiss",
                onPress: () => {
                  setPendingEvaluation(null);
                  setEvaluationStatus(null);
                },
              },
            ]
          );
        }
      }
    } catch (error: any) {
      console.error("Check status error:", error);
      
      // Check if submission not found - clear the pending evaluation
      const errorMessage = error?.message || error?.userMessage || error?.toString() || "";
      if (errorMessage.toLowerCase().includes("not found") || 
          errorMessage.includes("404") ||
          error?.statusCode === 404) {
        // Auto-clear the stale pending evaluation
        setPendingEvaluation(null);
        setEvaluationStatus(null);
        Alert.alert(
          "Submission Not Found",
          "This evaluation has expired or was already processed. The status has been cleared."
        );
      } else {
        Alert.alert("Error", "Failed to check status. Please try again.");
      }
    } finally {
      setIsCheckingStatus(false);
    }
  };

  const features = [
    {
      id: 3,
      title: "Generate Question Paper",
      description: "Karnataka board papers",
      icon: "clipboard-outline",
      gradient: COLORS.pucExam,
      action: () => navigate("puc-exam"),
    },
    {
      id: 4,
      title: "Download Syllabus",
      description: "Subject-wise syllabus PDF",
      icon: "download-outline",
      gradient: COLORS.modelPapers,
      action: () => navigate("syllabus"),
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      {/* HEADER */}
      <LinearGradient
        colors={[COLORS.primary, COLORS.primaryLight]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <View style={styles.logoContainer}>
              <MaterialCommunityIcons
                name="book-open-page-variant"
                size={ICON_SIZE.lg}
                color={COLORS.textInverse}
              />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.headerTitle}>Study Assistant</Text>
              <Text style={styles.headerSubtitle}>Your learning companion</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.chatIconButton}
            onPress={() => navigate("chat")}
            accessibilityLabel="Go to Chat"
          >
            <Ionicons name="chatbubbles-outline" size={ICON_SIZE.md} color={COLORS.textInverse} />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* WELCOME CARD */}
        <View style={styles.welcomeCard}>
          <View style={styles.welcomeIconWrapper}>
            <LinearGradient
              colors={[COLORS.primary, COLORS.primaryLight]}
              style={styles.welcomeIconGradient}
            >
              <MaterialCommunityIcons
                name="lightbulb-on-outline"
                size={ICON_SIZE.xl}
                color={COLORS.textInverse}
              />
            </LinearGradient>
          </View>
          <View style={styles.welcomeContent}>
            <Text style={styles.welcomeTitle}>Ready to Learn?</Text>
            <Text style={styles.welcomeText}>
              Explore study materials, practice questions, and exam preparation tools.
            </Text>
          </View>
        </View>

        {/* PENDING EVALUATION STATUS CARD */}
        {pendingEvaluation && (
          <View style={styles.evaluationCard}>
            <LinearGradient
              colors={[getCurrentStatusConfig().color, "#8B5CF6"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.evaluationGradient}
            >
              <View style={styles.evaluationHeader}>
                <View style={[styles.evaluationIconContainer, { backgroundColor: getCurrentStatusConfig().color }]}>
                  <Text style={styles.evaluationEmoji}>{getCurrentStatusConfig().icon}</Text>
                </View>
                <View style={styles.evaluationInfo}>
                  <Text style={styles.evaluationTitle}>
                    {evaluationStatus?.status === "Completed" ? "Evaluation Complete" : 
                     evaluationStatus?.status === "Failed" ? "Evaluation Failed" : 
                     "Evaluation in Progress"}
                  </Text>
                  <Text style={styles.evaluationSubject}>{pendingEvaluation.subject}</Text>
                  <Text style={styles.evaluationStatus}>
                    {evaluationStatus?.statusMessage || getCurrentStatusConfig().message}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.checkStatusButton}
                onPress={handleCheckStatus}
                disabled={isCheckingStatus}
              >
                {isCheckingStatus ? (
                  <ActivityIndicator size="small" color={getCurrentStatusConfig().color} />
                ) : (
                  <>
                    <Ionicons name="refresh" size={18} color={getCurrentStatusConfig().color} />
                    <Text style={[styles.checkStatusText, { color: getCurrentStatusConfig().color }]}>Check Status Now</Text>
                  </>
                )}
              </TouchableOpacity>
            </LinearGradient>
          </View>
        )}

        {/* FEATURES SECTION */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Learning Tools</Text>
            <Text style={styles.sectionSubtitle}>Choose what you want to do</Text>
          </View>

          <View style={styles.featuresGrid}>
            {features.map((feature, index) => (
              <TouchableOpacity
                key={feature.id}
                style={[
                  styles.featureCard,
                  index % 2 === 0 ? styles.cardLeft : styles.cardRight,
                ]}
                onPress={feature.action}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={feature.gradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.featureIconContainer}
                >
                  <Ionicons
                    name={feature.icon as any}
                    size={ICON_SIZE.lg}
                    color={COLORS.textInverse}
                  />
                </LinearGradient>
                <Text style={styles.featureTitle} numberOfLines={1}>
                  {feature.title}
                </Text>
                <Text style={styles.featureDescription} numberOfLines={2}>
                  {feature.description}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* SUBJECTS SECTION */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Browse Model Question Paper by Subject</Text>
            <Text style={styles.sectionSubtitle}>Select a subject to practice</Text>
          </View>

          <View style={styles.subjectsList}>
            {subjects.map((subject, index) => (
              <TouchableOpacity
                key={subject.id}
                style={[
                  styles.subjectItem,
                  index === subjects.length - 1 && styles.subjectItemLast,
                ]}
                onPress={() => navigate("exam")}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.subjectIconContainer,
                    { backgroundColor: `${subject.color}15` },
                  ]}
                >
                  <Ionicons
                    name={subject.icon as any}
                    size={ICON_SIZE.md}
                    color={subject.color}
                  />
                </View>
                <View style={styles.subjectContent}>
                  <Text style={styles.subjectName}>{subject.name}</Text>
                  <Text style={styles.subjectMeta}>{subject.questions}+ questions</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* QUICK STATS */}
        <View style={styles.statsCard}>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>2000+</Text>
              <Text style={styles.statLabel}>Questions</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>6</Text>
              <Text style={styles.statLabel}>Subjects</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>PUC</Text>
              <Text style={styles.statLabel}>Board</Text>
            </View>
          </View>
        </View>

        {/* FOOTER SPACING */}
        <View style={styles.footerSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },

  // Header
  header: {
    paddingVertical: SPACING.xl,
    paddingHorizontal: SPACING.xxl,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: SPACING.md,
  },
  logoContainer: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: SPACING.md,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    ...TYPOGRAPHY.h1,
    color: COLORS.textInverse,
  },
  headerSubtitle: {
    ...TYPOGRAPHY.bodyMedium,
    color: "rgba(255, 255, 255, 0.8)",
    marginTop: SPACING.xs,
  },
  chatIconButton: {
    padding: SPACING.sm,
  },

  // Scroll
  scrollView: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    paddingHorizontal: SPACING.xxl,
    paddingTop: SPACING.xxl,
  },

  // Welcome Card
  welcomeCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING.xxxl,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  welcomeIconWrapper: {
    marginRight: SPACING.lg,
  },
  welcomeIconGradient: {
    width: 56,
    height: 56,
    borderRadius: RADIUS.lg,
    justifyContent: "center",
    alignItems: "center",
  },
  welcomeContent: {
    flex: 1,
  },
  welcomeTitle: {
    ...TYPOGRAPHY.titleLarge,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  welcomeText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
  },

  // Section
  section: {
    marginBottom: SPACING.xxxl,
  },
  sectionHeader: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.textPrimary,
  },
  sectionSubtitle: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textTertiary,
    marginTop: SPACING.xs,
  },

  // Features Grid
  featuresGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  featureCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    width: CARD_WIDTH,
    minHeight: 160,
    marginBottom: SPACING.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  cardLeft: {
    marginRight: SPACING.sm / 2,
  },
  cardRight: {
    marginLeft: SPACING.sm / 2,
  },
  featureIconContainer: {
    width: 52,
    height: 52,
    borderRadius: RADIUS.lg,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: SPACING.md,
  },
  featureTitle: {
    ...TYPOGRAPHY.titleMedium,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  featureDescription: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    flex: 1,
  },
  featureArrow: {
    position: "absolute",
    bottom: SPACING.lg,
    right: SPACING.lg,
    width: 28,
    height: 28,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.divider,
    justifyContent: "center",
    alignItems: "center",
  },

  // Subjects List
  subjectsList: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  subjectItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  subjectItemLast: {
    borderBottomWidth: 0,
  },
  subjectIconContainer: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    justifyContent: "center",
    alignItems: "center",
    marginRight: SPACING.md,
  },
  subjectContent: {
    flex: 1,
  },
  subjectName: {
    ...TYPOGRAPHY.titleSmall,
    color: COLORS.textPrimary,
  },
  subjectMeta: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textTertiary,
    marginTop: 2,
  },

  // Stats Card
  statsCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    marginBottom: SPACING.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
  },
  statItem: {
    alignItems: "center",
    flex: 1,
  },
  statValue: {
    ...TYPOGRAPHY.h2,
    color: COLORS.primary,
  },
  statLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: COLORS.divider,
  },

  // Evaluation Status Card
  evaluationCard: {
    marginBottom: SPACING.xxxl,
    borderRadius: RADIUS.xl,
    overflow: "hidden",
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  evaluationGradient: {
    padding: SPACING.xl,
  },
  evaluationHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: SPACING.lg,
  },
  evaluationIconContainer: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: SPACING.md,
  },
  evaluationEmoji: {
    fontSize: 24,
  },
  evaluationInfo: {
    flex: 1,
  },
  evaluationTitle: {
    ...TYPOGRAPHY.titleLarge,
    color: COLORS.textInverse,
    marginBottom: SPACING.xs,
  },
  evaluationSubject: {
    ...TYPOGRAPHY.titleMedium,
    color: "rgba(255, 255, 255, 0.9)",
    marginBottom: SPACING.xs,
  },
  evaluationStatus: {
    ...TYPOGRAPHY.bodySmall,
    color: "rgba(255, 255, 255, 0.8)",
  },
  checkStatusButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.textInverse,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.sm,
  },
  checkStatusText: {
    ...TYPOGRAPHY.titleMedium,
    color: "#6366F1",
    marginLeft: SPACING.sm,
  },
  dismissButton: {
    alignItems: "center",
    paddingVertical: SPACING.sm,
  },
  dismissText: {
    ...TYPOGRAPHY.bodySmall,
    color: "rgba(255, 255, 255, 0.7)",
  },

  // Footer
  footerSpacer: {
    height: SPACING.huge,
  },
});
