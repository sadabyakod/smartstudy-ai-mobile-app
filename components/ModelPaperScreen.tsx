import React, { useState, useContext } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import {
  generateRandomModelPaperRequest,
  createExamTemplate,
  startExam,
  submitAnswer,
  getExamSummary,
  ExamTemplate,
  ExamQuestion,
  ExamSummary,
} from "../services/modelPaperApi";
import { NavigationContext } from "../navigation/NavigationContext";

type ScreenState = "initial" | "loading" | "exam" | "results";

export default function ModelPaperScreen() {
  const { navigate } = useContext(NavigationContext);
  const [screenState, setScreenState] = useState<ScreenState>("initial");
  const [attemptId, setAttemptId] = useState<number | null>(null);
  const [template, setTemplate] = useState<ExamTemplate | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<ExamQuestion | null>(null);
  const [selectedOptionId, setSelectedOptionId] = useState<number | null>(null);
  const [questionsAnswered, setQuestionsAnswered] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [results, setResults] = useState<ExamSummary | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastAnswerCorrect, setLastAnswerCorrect] = useState<boolean | null>(null);

  const handleGenerateModelPaper = async () => {
    try {
      setScreenState("loading");
      
      // Step 1: Generate random request
      const request = generateRandomModelPaperRequest();
      console.log("Generated request:", request);
      
      // Step 2: Create template
      const templateResult = await createExamTemplate(request);
      setTemplate(templateResult);
      
      // Step 3: Start exam
      const examResult = await startExam(templateResult.id);
      setAttemptId(examResult.attemptId);
      
      // Check if backend returned a question
      if (!examResult.firstQuestion) {
        Alert.alert(
          "No Questions Available",
          "The exam was created but no questions are available for this subject/chapter combination. Please try a different topic or contact support.",
          [{ text: "OK", onPress: () => setScreenState("initial") }]
        );
        return;
      }
      
      setCurrentQuestion(examResult.firstQuestion);
      setQuestionsAnswered(0);
      setCorrectCount(0);
      setWrongCount(0);
      setSelectedOptionId(null);
      setLastAnswerCorrect(null);
      
      setScreenState("exam");
    } catch (error) {
      console.error("Generation error:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      Alert.alert(
        "Error", 
        `Failed to generate model paper.\n\n${errorMessage}\n\nPlease check your internet connection and try again.`
      );
      setScreenState("initial");
    }
  };

  const handleSelectOption = (optionId: number) => {
    setSelectedOptionId(optionId);
  };

  const handleSubmitAnswer = async () => {
    if (!attemptId || !currentQuestion || selectedOptionId === null) return;

    try {
      setIsSubmitting(true);
      
      const result = await submitAnswer(
        attemptId,
        currentQuestion.id,
        selectedOptionId,
        30 // Default time taken
      );
      
      setLastAnswerCorrect(result.isCorrect);
      setQuestionsAnswered(result.currentStats.answeredCount);
      setCorrectCount(result.currentStats.correctCount);
      setWrongCount(result.currentStats.wrongCount);
      
      if (result.isCompleted) {
        // Exam completed - get summary
        const summary = await getExamSummary(attemptId);
        setResults(summary);
        setScreenState("results");
      } else {
        // Move to next question
        setCurrentQuestion(result.nextQuestion);
        setSelectedOptionId(null);
        setLastAnswerCorrect(null);
      }
    } catch (error) {
      console.error("Submit answer error:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      Alert.alert("Error", `Failed to submit answer.\n\n${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartNew = () => {
    setScreenState("initial");
    setAttemptId(null);
    setTemplate(null);
    setCurrentQuestion(null);
    setSelectedOptionId(null);
    setQuestionsAnswered(0);
    setCorrectCount(0);
    setWrongCount(0);
    setResults(null);
    setLastAnswerCorrect(null);
  };

  // Initial Screen
  if (screenState === "initial") {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient colors={["#1E3A8A", "#3B82F6", "#60A5FA"]} style={styles.gradient}>
          {/* Back Button */}
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => navigate("chat")}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
            <Text style={styles.backButtonText}>Back to Chat</Text>
          </TouchableOpacity>

          <ScrollView contentContainerStyle={styles.initialScrollContent}>
            {/* Hero Section */}
            <View style={styles.heroSection}>
              <View style={styles.heroIconContainer}>
                <Ionicons name="document-text" size={80} color="#fff" />
              </View>
              <Text style={styles.heroTitle}>Model Question Paper</Text>
              <Text style={styles.heroSubtitle}>
                Practice with AI-generated exam questions tailored to your curriculum
              </Text>
            </View>

            {/* Features Grid */}
            <View style={styles.featuresGrid}>
              <View style={styles.featureCard}>
                <Ionicons name="flash" size={28} color="#F59E0B" />
                <Text style={styles.featureTitle}>Instant Generation</Text>
                <Text style={styles.featureDesc}>Get questions in seconds</Text>
              </View>
              <View style={styles.featureCard}>
                <Ionicons name="analytics" size={28} color="#10B981" />
                <Text style={styles.featureTitle}>Adaptive Difficulty</Text>
                <Text style={styles.featureDesc}>Questions adjust to your level</Text>
              </View>
              <View style={styles.featureCard}>
                <Ionicons name="checkmark-done" size={28} color="#3B82F6" />
                <Text style={styles.featureTitle}>Instant Feedback</Text>
                <Text style={styles.featureDesc}>Know immediately if correct</Text>
              </View>
              <View style={styles.featureCard}>
                <Ionicons name="trophy" size={28} color="#8B5CF6" />
                <Text style={styles.featureTitle}>Track Progress</Text>
                <Text style={styles.featureDesc}>See your performance stats</Text>
              </View>
            </View>

            {/* Info Section */}
            <View style={styles.infoSection}>
              <View style={styles.infoItem}>
                <Ionicons name="school" size={20} color="#fff" />
                <Text style={styles.infoText}>Grade 10 Mathematics</Text>
              </View>
              <View style={styles.infoItem}>
                <Ionicons name="help-circle" size={20} color="#fff" />
                <Text style={styles.infoText}>5-10 Questions per session</Text>
              </View>
              <View style={styles.infoItem}>
                <Ionicons name="time" size={20} color="#fff" />
                <Text style={styles.infoText}>One question at a time</Text>
              </View>
            </View>

            {/* Generate Button */}
            <TouchableOpacity
              style={styles.generateButton}
              onPress={handleGenerateModelPaper}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={["#F97316", "#EA580C"]}
                style={styles.generateButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Ionicons name="sparkles" size={28} color="#fff" />
                <Text style={styles.generateButtonText}>Generate Model Paper</Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* PUC Exam Button */}
            <TouchableOpacity
              style={styles.pucExamButton}
              onPress={() => navigate("puc-exam")}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={["#7C3AED", "#4F46E5"]}
                style={styles.generateButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Ionicons name="school" size={28} color="#fff" />
                <Text style={styles.generateButtonText}>Karnataka 2nd PUC Paper</Text>
              </LinearGradient>
            </TouchableOpacity>

            <Text style={styles.pucNoteText}>
              📝 Full 80-mark model paper with 5 parts
            </Text>
          </ScrollView>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  // Loading Screen
  if (screenState === "loading") {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient colors={["#1E3A8A", "#3B82F6"]} style={styles.gradient}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.loadingText}>Generating your exam...</Text>
            <Text style={styles.loadingSubtext}>Creating template and fetching questions</Text>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  // Error state: Exam mode but no question available
  if (screenState === "exam" && !currentQuestion) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient colors={["#1E3A8A", "#3B82F6"]} style={styles.gradient}>
          <View style={styles.loadingContainer}>
            <Ionicons name="alert-circle" size={80} color="#fff" />
            <Text style={styles.loadingText}>No Questions Available</Text>
            <Text style={styles.loadingSubtext}>
              No questions found for this subject/chapter. Please try again.
            </Text>
            <TouchableOpacity 
              style={styles.retryButton} 
              onPress={() => setScreenState("initial")}
            >
              <Text style={styles.retryButtonText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  // Exam Screen (One Question at a Time)
  if (screenState === "exam" && currentQuestion && template) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient colors={["#F0F4FF", "#E0EAFC"]} style={styles.gradient}>
          {/* My Chat Button */}
          <TouchableOpacity 
            style={styles.myChatButton} 
            onPress={() => navigate("chat")}
          >
            <Ionicons name="chatbubbles" size={20} color="#2563EB" />
            <Text style={styles.myChatButtonText}>My Chat</Text>
          </TouchableOpacity>

          {/* Header */}
          <View style={styles.examHeader}>
            <View>
              <Text style={styles.examSubject}>{template.subject}</Text>
              <Text style={styles.examChapter}>{template.chapter}</Text>
            </View>
            <View style={styles.progressContainer}>
              <Text style={styles.progressText}>
                {questionsAnswered + 1} / {template.totalQuestions}
              </Text>
              <View style={styles.statsRow}>
                <Text style={styles.correctStat}>✓ {correctCount}</Text>
                <Text style={styles.wrongStat}>✗ {wrongCount}</Text>
              </View>
            </View>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressBarContainer}>
            <View 
              style={[
                styles.progressBar, 
                { width: `${((questionsAnswered) / template.totalQuestions) * 100}%` }
              ]} 
            />
          </View>

          <ScrollView style={styles.examContent}>
            {/* Question Card */}
            <View style={styles.questionCard}>
              <View style={styles.questionHeader}>
                <View style={[styles.difficultyBadge, 
                  currentQuestion.difficulty === "Easy" ? styles.easyBadge :
                  currentQuestion.difficulty === "Medium" ? styles.mediumBadge :
                  styles.hardBadge
                ]}>
                  <Text style={styles.difficultyText}>{currentQuestion.difficulty}</Text>
                </View>
                <Text style={styles.topicText}>{currentQuestion.topic}</Text>
              </View>

              <Text style={styles.questionText}>{currentQuestion.text}</Text>

              {/* Options */}
              <View style={styles.optionsContainer}>
                {currentQuestion.options.map((option, index) => {
                  const isSelected = selectedOptionId === option.id;
                  return (
                    <TouchableOpacity
                      key={option.id}
                      style={[
                        styles.optionButton,
                        isSelected && styles.optionButtonSelected,
                      ]}
                      onPress={() => handleSelectOption(option.id)}
                      disabled={isSubmitting}
                    >
                      <View style={[
                        styles.optionIndex,
                        isSelected && styles.optionIndexSelected,
                      ]}>
                        <Text style={[
                          styles.optionIndexText,
                          isSelected && styles.optionIndexTextSelected,
                        ]}>
                          {String.fromCharCode(65 + index)}
                        </Text>
                      </View>
                      <Text style={[
                        styles.optionText,
                        isSelected && styles.optionTextSelected,
                      ]}>
                        {option.optionText}
                      </Text>
                      {isSelected && (
                        <Ionicons name="checkmark-circle" size={24} color="#2563EB" />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Submit Answer Button */}
            <TouchableOpacity
              style={[
                styles.submitAnswerButton,
                selectedOptionId === null && styles.submitAnswerButtonDisabled,
              ]}
              onPress={handleSubmitAnswer}
              disabled={selectedOptionId === null || isSubmitting}
            >
              <LinearGradient
                colors={selectedOptionId !== null ? ["#2563EB", "#1E40AF"] : ["#94A3B8", "#64748B"]}
                style={styles.buttonGradient}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="arrow-forward" size={24} color="#fff" />
                    <Text style={styles.buttonText}>
                      {questionsAnswered + 1 === template.totalQuestions ? "Submit & Finish" : "Submit Answer"}
                    </Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  // Results Screen
  if (screenState === "results" && results) {
    const isPassed = results.scorePercent >= 50;
    const grade = results.scorePercent >= 90 ? "A" : 
                  results.scorePercent >= 80 ? "B" :
                  results.scorePercent >= 70 ? "C" :
                  results.scorePercent >= 50 ? "D" : "F";
    
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient colors={["#E0EAFC", "#CFDEF3"]} style={styles.gradient}>
          {/* My Chat Button */}
          <TouchableOpacity 
            style={styles.myChatButton} 
            onPress={() => navigate("chat")}
          >
            <Ionicons name="chatbubbles" size={20} color="#2563EB" />
            <Text style={styles.myChatButtonText}>My Chat</Text>
          </TouchableOpacity>

          <ScrollView contentContainerStyle={styles.resultsContainer}>
            {/* Result Icon */}
            <View style={[styles.resultIcon, isPassed ? styles.passIcon : styles.failIcon]}>
              <Ionicons
                name={isPassed ? "trophy" : "close-circle"}
                size={60}
                color="#fff"
              />
            </View>

            {/* Result Status */}
            <Text style={styles.resultStatus}>{isPassed ? "Passed!" : "Keep Practicing"}</Text>

            {/* Score Card */}
            <View style={styles.scoreCard}>
              <Text style={styles.scoreTitle}>Your Score</Text>
              <Text style={styles.scoreValue}>
                {results.correctCount}/{results.totalQuestions}
              </Text>
              <Text style={styles.percentage}>{results.scorePercent.toFixed(1)}%</Text>
              <Text style={styles.grade}>Grade: {grade}</Text>
            </View>

            {/* Statistics */}
            <View style={styles.statsContainer}>
              <View style={styles.statBox}>
                <Ionicons name="checkmark-circle" size={32} color="#10B981" />
                <Text style={styles.statValue}>{results.correctCount}</Text>
                <Text style={styles.statLabel}>Correct</Text>
              </View>
              <View style={styles.statBox}>
                <Ionicons name="close-circle" size={32} color="#EF4444" />
                <Text style={styles.statValue}>{results.wrongCount}</Text>
                <Text style={styles.statLabel}>Wrong</Text>
              </View>
            </View>

            {/* Exam Info */}
            <View style={styles.examInfoCard}>
              <Text style={styles.examInfoTitle}>Exam Details</Text>
              <View style={styles.examInfoRow}>
                <Text style={styles.examInfoLabel}>Subject:</Text>
                <Text style={styles.examInfoValue}>{results.template.subject}</Text>
              </View>
              <View style={styles.examInfoRow}>
                <Text style={styles.examInfoLabel}>Chapter:</Text>
                <Text style={styles.examInfoValue}>{results.template.chapter}</Text>
              </View>
              <View style={styles.examInfoRow}>
                <Text style={styles.examInfoLabel}>Status:</Text>
                <Text style={[styles.examInfoValue, { color: isPassed ? "#10B981" : "#EF4444" }]}>
                  {results.status}
                </Text>
              </View>
            </View>

            {/* Action Buttons */}
            <TouchableOpacity style={styles.actionButton} onPress={handleStartNew}>
              <LinearGradient
                colors={["#2563EB", "#1E40AF"]}
                style={styles.buttonGradient}
              >
                <Ionicons name="refresh" size={24} color="#fff" />
                <Text style={styles.buttonText}>Try Another Paper</Text>
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  gradient: { flex: 1 },
  
  // Back Button
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },

  // My Chat Button (for exam and results screens)
  myChatButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#fff",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    marginLeft: 16,
    marginTop: 12,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  myChatButtonText: {
    color: "#2563EB",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 6,
  },

  // Initial Screen Styles
  initialScrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  heroSection: {
    alignItems: "center",
    marginBottom: 30,
  },
  heroIconContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
    textAlign: "center",
    marginBottom: 10,
  },
  heroSubtitle: {
    fontSize: 16,
    color: "rgba(255,255,255,0.9)",
    textAlign: "center",
    lineHeight: 22,
  },
  featuresGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 30,
  },
  featureCard: {
    width: "48%",
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: "center",
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1E293B",
    marginTop: 8,
    textAlign: "center",
  },
  featureDesc: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 4,
    textAlign: "center",
  },
  infoSection: {
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 30,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  infoText: {
    fontSize: 14,
    color: "#fff",
    marginLeft: 10,
  },
  generateButton: {
    borderRadius: 16,
    overflow: "hidden",
    elevation: 6,
    shadowColor: "#F97316",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  generateButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    paddingHorizontal: 32,
    gap: 12,
  },
  generateButtonText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
  },
  pucExamButton: {
    borderRadius: 16,
    overflow: "hidden",
    marginTop: 16,
    elevation: 6,
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  pucNoteText: {
    color: "rgba(255,255,255,0.8)",
    textAlign: "center",
    marginTop: 12,
    fontSize: 14,
  },

  // Loading Screen
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 20,
    color: "#fff",
    marginTop: 20,
    fontWeight: "600",
  },
  loadingSubtext: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
    marginTop: 8,
    textAlign: "center",
    paddingHorizontal: 20,
  },
  retryButton: {
    marginTop: 24,
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },

  // Exam Screen
  examHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  examSubject: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1E293B",
  },
  examChapter: {
    fontSize: 14,
    color: "#64748B",
    marginTop: 2,
  },
  progressContainer: {
    alignItems: "flex-end",
  },
  progressText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2563EB",
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  correctStat: {
    fontSize: 12,
    color: "#10B981",
    fontWeight: "600",
  },
  wrongStat: {
    fontSize: 12,
    color: "#EF4444",
    fontWeight: "600",
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: "#E2E8F0",
  },
  progressBar: {
    height: 4,
    backgroundColor: "#2563EB",
  },
  examContent: {
    flex: 1,
    padding: 16,
  },
  questionCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  questionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 10,
  },
  difficultyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  easyBadge: {
    backgroundColor: "#D1FAE5",
  },
  mediumBadge: {
    backgroundColor: "#FEF3C7",
  },
  hardBadge: {
    backgroundColor: "#FEE2E2",
  },
  difficultyText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1E293B",
  },
  topicText: {
    fontSize: 12,
    color: "#64748B",
    flex: 1,
  },
  questionText: {
    fontSize: 18,
    color: "#1E293B",
    lineHeight: 26,
    marginBottom: 20,
  },
  optionsContainer: {
    gap: 12,
  },
  optionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: "#E2E8F0",
  },
  optionButtonSelected: {
    backgroundColor: "#EFF6FF",
    borderColor: "#2563EB",
  },
  optionIndex: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#E2E8F0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  optionIndexSelected: {
    backgroundColor: "#2563EB",
  },
  optionIndexText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748B",
  },
  optionIndexTextSelected: {
    color: "#fff",
  },
  optionText: {
    flex: 1,
    fontSize: 16,
    color: "#334155",
  },
  optionTextSelected: {
    color: "#1E293B",
    fontWeight: "500",
  },
  submitAnswerButton: {
    borderRadius: 12,
    overflow: "hidden",
    marginTop: 8,
    marginBottom: 20,
  },
  submitAnswerButtonDisabled: {
    opacity: 0.7,
  },
  buttonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 10,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
  },

  // Results Screen
  resultsContainer: {
    padding: 20,
    alignItems: "center",
  },
  resultIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 40,
  },
  passIcon: {
    backgroundColor: "#10B981",
  },
  failIcon: {
    backgroundColor: "#EF4444",
  },
  resultStatus: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#1E293B",
    marginTop: 20,
  },
  scoreCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    marginTop: 30,
    width: "100%",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  scoreTitle: {
    fontSize: 16,
    color: "#64748B",
    marginBottom: 8,
  },
  scoreValue: {
    fontSize: 48,
    fontWeight: "bold",
    color: "#2563EB",
  },
  percentage: {
    fontSize: 28,
    fontWeight: "600",
    color: "#10B981",
    marginTop: 8,
  },
  grade: {
    fontSize: 20,
    fontWeight: "600",
    color: "#64748B",
    marginTop: 8,
  },
  statsContainer: {
    flexDirection: "row",
    gap: 16,
    marginTop: 30,
    width: "100%",
  },
  statBox: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1E293B",
    marginTop: 8,
  },
  statLabel: {
    fontSize: 14,
    color: "#64748B",
    marginTop: 4,
  },
  examInfoCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    width: "100%",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  examInfoTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 12,
  },
  examInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  examInfoLabel: {
    fontSize: 14,
    color: "#64748B",
  },
  examInfoValue: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1E293B",
  },
  actionButton: {
    marginTop: 30,
    borderRadius: 12,
    overflow: "hidden",
    width: "100%",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
});
