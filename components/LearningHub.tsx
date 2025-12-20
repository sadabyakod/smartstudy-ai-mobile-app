import React, { useContext, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  Dimensions,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { NavigationContext } from "../navigation/NavigationContext";
import { checkSubmissionStatus, SubmissionStatusResponse, isEvaluationComplete, isEvaluationFailed } from "../services/pucExamApi";
import { getEvaluationResultsBySubmissionId } from "../services/answerSheetApi";
import { saveEvaluationToHistory } from "../services/evaluationHistoryService";
import { 
  SPACING, 
  TYPOGRAPHY, 
  COLORS as DESIGN_COLORS, 
  RADIUS, 
  ICON_SIZES 
} from "../styles/designSystem";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// ============================================
// APP-SPECIFIC COLORS (extends design system)
// ============================================
const COLORS = {
  // Primary palette
  primary: DESIGN_COLORS.primary[600],
  primaryLight: DESIGN_COLORS.primary[500],
  primaryDark: DESIGN_COLORS.primary[700],

  // Background colors
  background: DESIGN_COLORS.neutral[50],
  surface: DESIGN_COLORS.neutral[0],

  // Text colors
  textPrimary: DESIGN_COLORS.neutral[900],
  textSecondary: DESIGN_COLORS.neutral[600],
  textTertiary: DESIGN_COLORS.neutral[400],
  textInverse: DESIGN_COLORS.neutral[0],

  // Semantic colors
  success: DESIGN_COLORS.success[600],
  warning: DESIGN_COLORS.warning[600],
  error: DESIGN_COLORS.error[600],

  // Feature gradients
  studyHelp: ["#7C3AED", "#9333EA"] as [string, string],
  mcq: ["#059669", "#10B981"] as [string, string],
  pucExam: ["#DC2626", "#EF4444"] as [string, string],
  modelPapers: ["#EA580C", "#F97316"] as [string, string],

  // Subject colors
  mathematics: DESIGN_COLORS.subjects.mathematics,
  physics: "#7C3AED",
  chemistry: DESIGN_COLORS.subjects.science,
  biology: "#16A34A",
  english: DESIGN_COLORS.subjects.english,
  computerScience: DESIGN_COLORS.subjects.computer,

  // Border & divider
  border: DESIGN_COLORS.neutral[200],
  divider: DESIGN_COLORS.neutral[100],
};

// Icon size mapping for local use
const ICON_SIZE = {
  sm: ICON_SIZES.sm,
  md: ICON_SIZES.md,
  lg: ICON_SIZES.lg,
  xl: ICON_SIZES.xl,
};

const CARD_WIDTH = (SCREEN_WIDTH - SPACING.xxl * 2 - SPACING.md) / 2;

// ============================================
// TYPOGRAPHY SHORTCUTS
// ============================================
const TEXT = {
  h1: { fontSize: TYPOGRAPHY.displaySmall.fontSize, fontWeight: TYPOGRAPHY.displaySmall.fontWeight, lineHeight: TYPOGRAPHY.displaySmall.lineHeight },
  h2: { fontSize: TYPOGRAPHY.headlineMedium.fontSize, fontWeight: TYPOGRAPHY.headlineMedium.fontWeight, lineHeight: TYPOGRAPHY.headlineMedium.lineHeight },
  h3: { fontSize: TYPOGRAPHY.headlineSmall.fontSize, fontWeight: TYPOGRAPHY.headlineSmall.fontWeight, lineHeight: TYPOGRAPHY.headlineSmall.lineHeight },
  titleLarge: TYPOGRAPHY.titleLarge,
  titleMedium: TYPOGRAPHY.titleMedium,
  titleSmall: TYPOGRAPHY.titleSmall,
  bodyLarge: TYPOGRAPHY.bodyLarge,
  bodyMedium: TYPOGRAPHY.bodyMedium,
  bodySmall: TYPOGRAPHY.bodySmall,
  labelMedium: TYPOGRAPHY.labelMedium,
  caption: TYPOGRAPHY.caption,
};

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
// Status codes: 0=Uploaded, 1=OCR Complete, 2=Evaluation Complete, 3=OCR Failed, 4=Evaluation Failed
// ============================================

const STATUS_CONFIG: Record<string, { icon: string; color: string; message: string }> = {
  // Numeric status codes from API
  "0": { icon: "⏳", color: "#F59E0B", message: "Uploaded. Waiting for OCR..." },
  "1": { icon: "📄", color: "#3B82F6", message: "OCR Complete. Evaluation starting..." },
  "2": { icon: "✅", color: "#10B981", message: "Evaluation completed! Your results are ready." },
  "3": { icon: "❌", color: "#EF4444", message: "OCR Failed. Please upload clearer images." },
  "4": { icon: "❌", color: "#EF4444", message: "Evaluation failed. Please contact support." },
  // Legacy status names (backward compatibility)
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
  const { navigate, pendingEvaluation, setPendingEvaluation, setCompletedEvaluation, setResultsScreenData } = useContext(NavigationContext);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [evaluationStatus, setEvaluationStatus] = useState<SubmissionStatusResponse | null>(null);

  // Get current status config
  const getCurrentStatusConfig = () => {
    const status = evaluationStatus?.status || "PendingEvaluation";
    return STATUS_CONFIG[status] || STATUS_CONFIG["0"];
  };

  const handleCheckStatus = async () => {
    if (!pendingEvaluation) return;
    
    console.log('🔍 [LearningHub] Checking status for submission:', pendingEvaluation.writtenSubmissionId);
    setIsCheckingStatus(true);
    try {
      const status = await checkSubmissionStatus(pendingEvaluation.writtenSubmissionId);
      console.log('🔍 [LearningHub] Status response:', JSON.stringify(status));
      setEvaluationStatus(status);
      
      // Check if evaluation is complete using helper function
      // Status "2" = Evaluation Complete OR legacy "Completed" status
      if (status.isComplete || isEvaluationComplete(status.status)) {
        console.log('✅ [LearningHub] Evaluation complete! Fetching full results...');
        // Fetch full results using new endpoint and auto-redirect to results
        // Retry up to 10 times with 5 second delay (50 seconds total)
        // Backend may take time to write results to blob storage after marking complete
        const fullResults = await getEvaluationResultsBySubmissionId(pendingEvaluation.writtenSubmissionId, 10, 5000);
        
        // Check if results are still pending (grandScore = -1 is special marker)
        console.log('📊 [LearningHub] Checking results - grandScore:', fullResults.grandScore, '_isPending:', (fullResults as any)._isPending);
        if ((fullResults as any)._isPending || fullResults.grandScore === -1) {
          console.log('📊 [LearningHub] Results still being prepared...');
          // Check if we have result in status response as fallback
          if (status.result) {
            console.log('🔄 [LearningHub] Using fallback result from status');
            // Save to history
            await saveEvaluationToHistory(
              pendingEvaluation.examId,
              pendingEvaluation.studentId,
              pendingEvaluation.subject,
              `${pendingEvaluation.subject} Exam`,
              status.result
            );
            setCompletedEvaluation({
              writtenSubmissionId: pendingEvaluation.writtenSubmissionId,
              result: status.result
            });
            // Navigate directly to results screen
            setResultsScreenData({
              examResult: status.result,
              examTitle: `${pendingEvaluation.subject} - Results`,
            });
            setPendingEvaluation(null);
            setEvaluationStatus(null);
            navigate("results");
          } else {
            // Results not ready yet - show friendly message
            Alert.alert(
              "🎉 Great News!",
              "Your answers have been checked! We're preparing your detailed feedback - this usually takes just 5-6 minutes. Tap 'Check Results' again in a moment!",
              [{ text: "Got it!" }]
            );
          }
        } else {
          console.log('✅ [LearningHub] Full results received! Navigating to results...');
          // Save to history
          await saveEvaluationToHistory(
            pendingEvaluation.examId,
            pendingEvaluation.studentId,
            pendingEvaluation.subject,
            `${pendingEvaluation.subject} Exam`,
            fullResults as any
          );
          // Set completed evaluation data and navigate directly to results screen
          setCompletedEvaluation({
            writtenSubmissionId: pendingEvaluation.writtenSubmissionId,
            result: fullResults
          });
          setResultsScreenData({
            examResult: fullResults as any,
            examTitle: `${pendingEvaluation.subject} - Results`,
          });
          setPendingEvaluation(null);
          setEvaluationStatus(null);
          navigate("results");
        }
      } else if (isEvaluationFailed(status.status)) {
        console.log('❌ [LearningHub] Evaluation failed! Status:', status.status);
        // Status "3" = OCR Failed, "4" = Evaluation Failed, or legacy "Failed"
        const failureMessage = status.status === "3" 
          ? "OCR failed. Please upload clearer images of your answer sheet."
          : "Evaluation failed. Please contact support.";
        Alert.alert(
          "❌ Evaluation Failed",
          status.statusMessage || failureMessage,
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
      } else {
        console.log('⏳ [LearningHub] Still processing... Status:', status.status);
      }
    } catch (error: any) {
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
    {
      id: 5,
      title: "My Results",
      description: "View past evaluations",
      icon: "trophy-outline",
      gradient: ["#7C3AED", "#9333EA"] as [string, string],
      action: () => navigate("evaluation-history"),
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
    ...TEXT.h1,
    color: COLORS.textInverse,
  },
  headerSubtitle: {
    ...TEXT.bodyMedium,
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
    ...TEXT.titleLarge,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  welcomeText: {
    ...TEXT.bodySmall,
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
    ...TEXT.h3,
    color: COLORS.textPrimary,
  },
  sectionSubtitle: {
    ...TEXT.bodySmall,
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
    ...TEXT.titleMedium,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  featureDescription: {
    ...TEXT.caption,
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
    ...TEXT.titleSmall,
    color: COLORS.textPrimary,
  },
  subjectMeta: {
    ...TEXT.caption,
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
    ...TEXT.h2,
    color: COLORS.primary,
  },
  statLabel: {
    ...TEXT.caption,
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
    ...TEXT.titleLarge,
    color: COLORS.textInverse,
    marginBottom: SPACING.xs,
  },
  evaluationSubject: {
    ...TEXT.titleMedium,
    color: "rgba(255, 255, 255, 0.9)",
    marginBottom: SPACING.xs,
  },
  evaluationStatus: {
    ...TEXT.bodySmall,
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
    ...TEXT.titleMedium,
    color: "#6366F1",
    marginLeft: SPACING.sm,
  },
  dismissButton: {
    alignItems: "center",
    paddingVertical: SPACING.sm,
  },
  dismissText: {
    ...TEXT.bodySmall,
    color: "rgba(255, 255, 255, 0.7)",
  },

  // Footer
  footerSpacer: {
    height: SPACING.huge,
  },
});
