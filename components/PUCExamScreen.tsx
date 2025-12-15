import React, { useState, useContext } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal,
  FlatList,
  TextInput,
  Image,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import {
  generatePUCExam,
  submitMcqAnswers,
  uploadWrittenAnswers,
  getExamResults,
  generateStudentId,
  GeneratedExam,
  ExamPart,
  ExamQuestion,
  ExamResult,
  McqAnswer,
  McqSubmissionResult,
  PUC_SUBJECTS,
  PUC_GRADES,
  formatDuration,
  isMCQ,
  hasSubParts,
  getGradeColor,
  getGradeDescription,
  pollSubmissionStatus,
  checkSubmissionStatus,
  SubmissionStatusResponse,
} from "../services/pucExamApi";
import { API_BASE_URL, getUserFriendlyErrorMessage, ERROR_MESSAGES } from "../config/api";
import { NavigationContext } from "../navigation/NavigationContext";

type ScreenState = "initial" | "loading" | "exam" | "question" | "questionPaper" | "uploadAnswers" | "submitting" | "results" | "evaluating";
type AnswerMode = "type" | "upload";

// Helper component for MCQ result item
function McqResultItem({ mcqRes, styles }: { mcqRes: any; styles: any }) {
  const [expanded, setExpanded] = useState(false);
  
  return (
    <View style={styles.mcqResultCard}>
      <TouchableOpacity
        style={styles.mcqResultHeader}
        onPress={() => setExpanded(!expanded)}
      >
        <View style={styles.mcqResultLeft}>
          <View style={[
            styles.mcqStatusIcon,
            { backgroundColor: mcqRes.isCorrect ? '#22C55E' : '#EF4444' }
          ]}>
            <Text style={styles.mcqStatusText}>
              {mcqRes.isCorrect ? '✓' : '✗'}
            </Text>
          </View>
          <Text style={styles.mcqQNum}>Q{mcqRes.questionNumber}</Text>
          <Text style={styles.mcqMarksText}>
            {mcqRes.marks} mark{mcqRes.marks > 1 ? 's' : ''}
          </Text>
        </View>
        <Text style={styles.expandIcon}>{expanded ? '▼' : '▶'}</Text>
      </TouchableOpacity>
      
      {expanded && (
        <View style={styles.mcqResultDetails}>
          <Text style={styles.mcqQuestionText}>{mcqRes.questionText}</Text>
          
          <View style={styles.mcqOptionsContainer}>
            {mcqRes.options && mcqRes.options.map((option: string, optIdx: number) => {
              const isCorrect = option === mcqRes.correctAnswer;
              const isStudentAnswer = option === mcqRes.studentAnswer;
              
              return (
                <View key={optIdx} style={[
                  styles.mcqOption,
                  isCorrect && styles.mcqOptionCorrect,
                  isStudentAnswer && !isCorrect && styles.mcqOptionWrong
                ]}>
                  <Text style={[
                    styles.mcqOptionText,
                    isCorrect && styles.mcqOptionTextCorrect,
                    isStudentAnswer && !isCorrect && styles.mcqOptionTextWrong
                  ]}>
                    {String.fromCharCode(65 + optIdx)}. {option}
                    {isCorrect && ' ✓ Correct'}
                    {isStudentAnswer && !isCorrect && ' ← Your answer'}
                  </Text>
                </View>
              );
            })}
          </View>
          
          {!mcqRes.isCorrect && (
            <View style={styles.mcqAnswerSummary}>
              <Text style={styles.mcqCorrectLabel}>
                Correct Answer: <Text style={styles.mcqCorrectValue}>{mcqRes.correctAnswer}</Text>
              </Text>
              <Text style={styles.mcqYourLabel}>
                Your Answer: <Text style={styles.mcqYourValue}>{mcqRes.studentAnswer}</Text>
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

export default function PUCExamScreen() {
  const { navigate, goBack, canGoBack, setPendingEvaluation } = useContext(NavigationContext);
  
  // Form state
  const [selectedSubject, setSelectedSubject] = useState(PUC_SUBJECTS[0]);
  const [selectedGrade, setSelectedGrade] = useState(PUC_GRADES[0]);
  const [showSubjectPicker, setShowSubjectPicker] = useState(false);
  const [showGradePicker, setShowGradePicker] = useState(false);
  
  // Exam state
  const [screenState, setScreenState] = useState<ScreenState>("initial");
  const [generatedExam, setGeneratedExam] = useState<GeneratedExam | null>(null);
  const [currentPartIndex, setCurrentPartIndex] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [uploadedImages, setUploadedImages] = useState<Record<string, string>>({});
  const [examResult, setExamResult] = useState<ExamResult | null>(null);
  const [mcqResult, setMcqResult] = useState<McqSubmissionResult | null>(null);
  const [answerMode, setAnswerMode] = useState<Record<string, AnswerMode>>({});
  const [skippedQuestions, setSkippedQuestions] = useState<Set<string>>(new Set());
  const [studentId] = useState<string>(() => generateStudentId());
  const [submissionStatus, setSubmissionStatus] = useState<string>("");
  const [score, setScore] = useState(0);
  const [answerSheetImages, setAnswerSheetImages] = useState<string[]>([]);
  const [writtenSubmissionId, setWrittenSubmissionId] = useState<string | null>(null);
  const [evaluationStatus, setEvaluationStatus] = useState<SubmissionStatusResponse | null>(null);
  const [showDetailedResults, setShowDetailedResults] = useState(false);

  const currentPart = generatedExam?.parts[currentPartIndex];
  const currentQuestion = currentPart?.questions[currentQuestionIndex];
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleBackNavigation = () => {
    if (canGoBack) {
      goBack();
    } else {
      navigate("home");
    }
  };

  const handleGenerateExam = async () => {
    try {
      setScreenState("loading");
      setErrorMessage(null);
      
      const exam = await generatePUCExam({
        subject: selectedSubject,
        grade: selectedGrade,
        chapter: "All Chapters", // Can be made dynamic later
        difficulty: "Medium", // Can be made dynamic later
        examType: "Full Paper", // Full Karnataka 2nd PUC paper
      });
      
      // Validate exam has parts and questions
      if (!exam || !exam.parts || exam.parts.length === 0) {
        throw new Error("Generated exam has no parts. Please try again.");
      }
      
      // Validate each part has questions
      for (const part of exam.parts) {
        if (!part.questions || part.questions.length === 0) {
          // Part has no questions - will be handled gracefully
        }
      }
      
      setGeneratedExam(exam);
      setUserAnswers({});
      setCurrentPartIndex(0);
      setCurrentQuestionIndex(0);
      setScore(0);
      setAnswerSheetImages([]);
      setScreenState("exam");
    } catch (error: any) {
      const message = getUserFriendlyErrorMessage(error) || ERROR_MESSAGES.UNKNOWN_ERROR;
      setErrorMessage(message);
      
      // Show alert with retry option
      Alert.alert(
        "Connection Issue",
        message,
        [
          {
            text: "Go Back",
            style: "cancel",
            onPress: () => setScreenState("initial"),
          },
          {
            text: "Retry",
            onPress: () => handleGenerateExam(),
          },
        ]
      );
      setScreenState("initial");
    }
  };

  const handleStartExam = () => {
    // Validate before starting
    if (!generatedExam || !generatedExam.parts || generatedExam.parts.length === 0) {
      Alert.alert("Error", "No exam data available. Please generate an exam first.");
      setScreenState("initial");
      return;
    }
    
    // Check if there are MCQ parts
    const mcqParts = getMcqParts();
    const subjectiveParts = getSubjectiveParts();
    
    // If no MCQ parts, go directly to question paper view
    if (mcqParts.length === 0 && subjectiveParts.length > 0) {
      setScreenState("questionPaper");
      return;
    }
    
    // Find first MCQ part with questions
    let startPartIndex = 0;
    for (let i = 0; i < generatedExam.parts.length; i++) {
      const part = generatedExam.parts[i];
      if (part.questions && part.questions.length > 0) {
        const partIsMcq = part.partName.toLowerCase().includes("part a") || 
                         part.questionType.toLowerCase().includes("mcq") ||
                         part.questionType.toLowerCase().includes("multiple choice");
        if (partIsMcq) {
          startPartIndex = i;
          break;
        }
      }
    }
    
    const firstPart = generatedExam.parts[startPartIndex];
    if (!firstPart || !firstPart.questions || firstPart.questions.length === 0) {
      // No MCQ questions found, check for subjective
      if (subjectiveParts.length > 0) {
        setScreenState("questionPaper");
        return;
      }
      Alert.alert("Error", "No questions available in the exam. Please try generating again.");
      setScreenState("initial");
      return;
    }
    
    setCurrentPartIndex(startPartIndex);
    setCurrentQuestionIndex(0);
    setScreenState("question");
  };

  const handleSelectOption = (option: string) => {
    if (currentQuestion) {
      setUserAnswers(prev => ({
        ...prev,
        [currentQuestion.questionId]: option,
      }));
    }
  };

  const handleNext = () => {
    if (!generatedExam || !generatedExam.parts || !currentPart || !currentPart.questions) return;
    
    const questionsLength = currentPart.questions?.length || 0;
    const partsLength = generatedExam.parts?.length || 0;
    
    if (currentQuestionIndex < questionsLength - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else if (currentPartIndex < partsLength - 1) {
      // Check if current part is MCQ and next parts are subjective
      const subjectiveParts = getSubjectiveParts();
      if (isCurrentQuestionMcq() && !hasMoreMcqParts() && subjectiveParts.length > 0) {
        // Done with MCQs, show subjective question paper
        setScreenState("questionPaper");
        return;
      }
      
      // Move to next part that has questions
      let nextPartIndex = currentPartIndex + 1;
      while (nextPartIndex < partsLength) {
        const nextPart = generatedExam.parts[nextPartIndex];
        if (nextPart?.questions && nextPart.questions.length > 0) {
          // Check if next part is subjective and we were in MCQ
          if (isCurrentQuestionMcq()) {
            const nextPartIsMcq = nextPart.partName.toLowerCase().includes("part a") || 
                                  nextPart.questionType.toLowerCase().includes("mcq") ||
                                  nextPart.questionType.toLowerCase().includes("multiple choice");
            if (!nextPartIsMcq) {
              // Transition to question paper view for subjective questions
              setScreenState("questionPaper");
              return;
            }
          }
          setCurrentPartIndex(nextPartIndex);
          setCurrentQuestionIndex(0);
          return;
        }
        nextPartIndex++;
      }
      // No more parts with questions, check for subjective
      if (subjectiveParts.length > 0 && isCurrentQuestionMcq()) {
        setScreenState("questionPaper");
      } else {
        showSubmitConfirmation();
      }
    } else {
      // Last question in last part
      const subjectiveParts = getSubjectiveParts();
      if (isCurrentQuestionMcq() && subjectiveParts.length > 0) {
        setScreenState("questionPaper");
      } else {
        showSubmitConfirmation();
      }
    }
  };

  const handleSkip = () => {
    if (!generatedExam || !currentQuestion) return;
    
    // Mark question as skipped
    setSkippedQuestions(prev => new Set(prev).add(currentQuestion.questionId));
    
    // Move to next question
    if (!generatedExam.parts || !currentPart || !currentPart.questions) return;
    
    const questionsLength = currentPart.questions?.length || 0;
    const partsLength = generatedExam.parts?.length || 0;
    
    if (currentQuestionIndex < questionsLength - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else if (currentPartIndex < partsLength - 1) {
      // Check if current part is MCQ and next parts are subjective
      const subjectiveParts = getSubjectiveParts();
      if (isCurrentQuestionMcq() && !hasMoreMcqParts() && subjectiveParts.length > 0) {
        setScreenState("questionPaper");
        return;
      }
      
      // Move to next part that has questions
      let nextPartIndex = currentPartIndex + 1;
      while (nextPartIndex < partsLength) {
        const nextPart = generatedExam.parts[nextPartIndex];
        if (nextPart?.questions && nextPart.questions.length > 0) {
          if (isCurrentQuestionMcq()) {
            const nextPartIsMcq = nextPart.partName.toLowerCase().includes("part a") || 
                                  nextPart.questionType.toLowerCase().includes("mcq") ||
                                  nextPart.questionType.toLowerCase().includes("multiple choice");
            if (!nextPartIsMcq) {
              setScreenState("questionPaper");
              return;
            }
          }
          setCurrentPartIndex(nextPartIndex);
          setCurrentQuestionIndex(0);
          return;
        }
        nextPartIndex++;
      }
      // No more parts with questions
      if (subjectiveParts.length > 0 && isCurrentQuestionMcq()) {
        setScreenState("questionPaper");
      } else {
        showSubmitConfirmation();
      }
    } else {
      // Last question
      const subjectiveParts = getSubjectiveParts();
      if (isCurrentQuestionMcq() && subjectiveParts.length > 0) {
        setScreenState("questionPaper");
      } else {
        showSubmitConfirmation();
      }
    }
  };

  const showSubmitConfirmation = () => {
    const answeredCount = Object.keys(userAnswers).length + Object.keys(uploadedImages).length;
    const totalQuestions = generatedExam?.questionCount || 0;
    const skippedCount = skippedQuestions.size;
    
    Alert.alert(
      "Submit Exam?",
      `You have answered ${answeredCount} out of ${totalQuestions} questions.${skippedCount > 0 ? `\n\nSkipped: ${skippedCount} questions` : ''}\n\nDo you want to submit your exam for evaluation?`,
      [
        {
          text: "Continue Exam",
          style: "cancel",
        },
        {
          text: "Submit",
          onPress: handleSubmitExam,
        },
      ]
    );
  };

  const handleSubmitExam = async () => {
    if (!generatedExam) return;
    
    setScreenState("submitting");
    
    try {
      // Step 1: Collect MCQ answers
      const mcqAnswers: McqAnswer[] = [];
      const writtenImageUris: string[] = [];
      
      for (const part of generatedExam.parts) {
        for (const question of part.questions) {
          const answer = userAnswers[question.questionId];
          const imageUri = uploadedImages[question.questionId];
          
          // Check if this is an MCQ question with a selected option
          if (isMCQ(question) && answer) {
            // Extract option letter (e.g., "A" from "A) Answer text")
            const optionMatch = answer.match(/^([A-D])\)/);
            if (optionMatch) {
              mcqAnswers.push({
                questionId: question.questionId,
                selectedOption: optionMatch[1],
              });
            } else {
              mcqAnswers.push({
                questionId: question.questionId,
                selectedOption: answer,
              });
            }
          }
          
          // Collect written answer images
          if (imageUri) {
            writtenImageUris.push(imageUri);
          }
        }
      }
      
      if (mcqAnswers.length === 0 && writtenImageUris.length === 0) {
        Alert.alert(
          "No Answers",
          "Please answer at least one question before submitting.",
          [{ text: "OK", onPress: () => setScreenState("question") }]
        );
        return;
      }
      
      let finalResult: ExamResult | null = null;
      
      // Step 2: Submit MCQ answers if any
      if (mcqAnswers.length > 0) {
        setSubmissionStatus("Submitting MCQ answers...");
        const mcqRes = await submitMcqAnswers(generatedExam.examId, studentId, mcqAnswers);
        setMcqResult(mcqRes);
        setScore(mcqRes.score);
      }
      
      // Step 3: Upload written answers if any - now async, navigates to evaluating screen
      if (writtenImageUris.length > 0) {
        setSubmissionStatus("Uploading written answers for AI evaluation...");
        const uploadResult = await uploadWrittenAnswers(generatedExam.examId, studentId, writtenImageUris);
        
        // Save submission ID and redirect to evaluating screen for polling
        setWrittenSubmissionId(uploadResult.writtenSubmissionId);
        setSubmissionStatus(uploadResult.message || "✅ Answer sheet uploaded successfully!");
        setScreenState("evaluating");
        
        // Start polling for status
        try {
          const finalStatus = await pollSubmissionStatus(
            uploadResult.writtenSubmissionId,
            (status) => {
              setEvaluationStatus(status);
              setSubmissionStatus(status.statusMessage);
            }
          );
          
          if (finalStatus.isComplete && finalStatus.result) {
            setExamResult(finalStatus.result);
            setScore(finalStatus.result.grandScore || 0);
            setEvaluationStatus(finalStatus);
          }
        } catch (pollError) {
          // Polling failed silently, status will be checked on next refresh
        }
        return; // Exit here, results will be shown from evaluating screen
      }
      
      // Step 4: Get final results (only if no written answers - MCQ only)
      setSubmissionStatus("Fetching final results...");
      try {
        finalResult = await getExamResults(generatedExam.examId, studentId);
        setExamResult(finalResult);
        setScore(finalResult.grandScore);
      } catch (resultError) {
        // Results may not be ready yet
        if (mcqResult) {
          setScore(mcqResult.score);
        }
      }
      
      setScreenState("results");
    } catch (error: any) {
      // Handle 409 Conflict - duplicate submission
      if (error?.status === 409) {
        Alert.alert(
          "Already Submitted",
          "⚠️ You have already submitted answers for this exam. Duplicate submissions are not allowed.",
          [
            { text: "View Results", onPress: () => {
              if (generatedExam) {
                setScreenState("loading");
                getExamResults(generatedExam.examId, studentId)
                  .then((result) => {
                    setExamResult(result);
                    setScore(result.grandScore || 0);
                    setScreenState("results");
                  })
                  .catch(() => {
                    Alert.alert("Results Not Ready", "Your previous submission is still being evaluated. Please try again later.");
                    setScreenState("initial");
                  });
              }
            }},
            { text: "Go Back", onPress: () => setScreenState("question") }
          ]
        );
        return;
      }
      
      Alert.alert(
        "Submission Failed",
        error?.message || "Failed to submit exam. Would you like to try again or calculate score locally?",
        [
          {
            text: "Try Again",
            onPress: handleSubmitExam,
          },
          {
            text: "Calculate Locally",
            onPress: () => {
              calculateScoreLocally();
              setScreenState("results");
            },
          },
        ]
      );
    }
  };

  const calculateScoreLocally = () => {
    if (!generatedExam || !generatedExam.parts) return;
    
    let totalScore = 0;
    generatedExam.parts.forEach(part => {
      if (part.questions) {
        part.questions.forEach(q => {
          if (userAnswers[q.questionId] === q.correctAnswer) {
            totalScore += part.marksPerQuestion;
          }
        });
      }
    });
    setScore(totalScore);
  };

  const handlePrevious = () => {
    if (!generatedExam || !generatedExam.parts) return;
    
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    } else if (currentPartIndex > 0) {
      // Move to previous part that has questions
      let prevPartIndex = currentPartIndex - 1;
      while (prevPartIndex >= 0) {
        const prevPart = generatedExam.parts[prevPartIndex];
        if (prevPart?.questions && prevPart.questions.length > 0) {
          setCurrentPartIndex(prevPartIndex);
          setCurrentQuestionIndex(prevPart.questions.length - 1);
          return;
        }
        prevPartIndex--;
      }
    }
  };

  const calculateScore = () => {
    if (!generatedExam || !generatedExam.parts) return;
    
    let totalScore = 0;
    generatedExam.parts.forEach(part => {
      if (part.questions) {
        part.questions.forEach(q => {
          if (userAnswers[q.questionId] === q.correctAnswer) {
            totalScore += part.marksPerQuestion;
          }
        });
      }
    });
    setScore(totalScore);
  };

  const handleStartNew = () => {
    setScreenState("initial");
    setGeneratedExam(null);
    setUserAnswers({});
    setUploadedImages({});
    setAnswerMode({});
    setSkippedQuestions(new Set());
    setScore(0);
    setExamResult(null);
    setMcqResult(null);
    setSubmissionStatus("");
  };

  const handleWrittenAnswerChange = (questionId: string, text: string) => {
    setUserAnswers(prev => ({
      ...prev,
      [questionId]: text,
    }));
  };

  const handlePickImage = async (questionId: string) => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert("Permission Required", "Please allow access to your photo library to upload images.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setUploadedImages(prev => ({
          ...prev,
          [questionId]: result.assets[0].uri,
        }));
        setAnswerMode(prev => ({
          ...prev,
          [questionId]: "upload",
        }));
      }
    } catch (error) {
      Alert.alert("Error", "Failed to pick image. Please try again.");
    }
  };

  const handleTakePhoto = async (questionId: string) => {
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert("Permission Required", "Please allow access to your camera to take photos.");
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setUploadedImages(prev => ({
          ...prev,
          [questionId]: result.assets[0].uri,
        }));
        setAnswerMode(prev => ({
          ...prev,
          [questionId]: "upload",
        }));
      }
    } catch (error) {
      Alert.alert("Error", "Failed to take photo. Please try again.");
    }
  };

  const handleRemoveImage = (questionId: string) => {
    setUploadedImages(prev => {
      const newImages = { ...prev };
      delete newImages[questionId];
      return newImages;
    });
  };

  const setCurrentAnswerMode = (questionId: string, mode: AnswerMode) => {
    setAnswerMode(prev => ({
      ...prev,
      [questionId]: mode,
    }));
  };

  // Helper: Get all MCQ parts (Part A)
  const getMcqParts = () => {
    if (!generatedExam) return [];
    return generatedExam.parts.filter(part => 
      part.partName.toLowerCase().includes("part a") || 
      part.questionType.toLowerCase().includes("mcq") ||
      part.questionType.toLowerCase().includes("multiple choice")
    );
  };

  // Helper: Get all subjective parts (Part B, C, D, E)
  const getSubjectiveParts = () => {
    if (!generatedExam) return [];
    return generatedExam.parts.filter(part => 
      !part.partName.toLowerCase().includes("part a") && 
      !part.questionType.toLowerCase().includes("mcq") &&
      !part.questionType.toLowerCase().includes("multiple choice")
    );
  };

  // Helper: Check if we finished all MCQ questions
  const isCurrentQuestionMcq = () => {
    if (!currentPart) return false;
    return currentPart.partName.toLowerCase().includes("part a") || 
           currentPart.questionType.toLowerCase().includes("mcq") ||
           currentPart.questionType.toLowerCase().includes("multiple choice");
  };

  // Helper: Find if there are more MCQ parts after current
  const hasMoreMcqParts = () => {
    if (!generatedExam) return false;
    for (let i = currentPartIndex + 1; i < generatedExam.parts.length; i++) {
      const part = generatedExam.parts[i];
      if (part.partName.toLowerCase().includes("part a") || 
          part.questionType.toLowerCase().includes("mcq") ||
          part.questionType.toLowerCase().includes("multiple choice")) {
        return true;
      }
    }
    return false;
  };

  // Handle picking answer sheet image
  const handlePickAnswerSheet = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Required", "Please grant camera roll permissions to upload your answer sheet.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets.length > 0) {
      setAnswerSheetImages(prev => [...prev, ...result.assets.map(a => a.uri)]);
    }
  };

  // Handle taking photo of answer sheet
  const handleTakeAnswerSheetPhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Required", "Please grant camera permissions to take photos.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      quality: 0.8,
    });

    if (!result.canceled) {
      setAnswerSheetImages(prev => [...prev, result.assets[0].uri]);
    }
  };

  // Remove answer sheet image
  const handleRemoveAnswerSheetImage = (index: number) => {
    setAnswerSheetImages(prev => prev.filter((_, i) => i !== index));
  };

  // Initial Screen - Subject & Grade Selection
  if (screenState === "initial") {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient colors={["#4F46E5", "#7C3AED", "#A855F7"]} style={styles.gradient}>
          {/* Top Bar */}
          <View style={styles.topBar}>
            <TouchableOpacity 
              style={styles.backButton} 
              onPress={handleBackNavigation}
            >
              <Ionicons name="arrow-back" size={24} color="#fff" />
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.chatIconButton}
              onPress={() => navigate("chat")}
              accessibilityLabel="Go to Chat"
            >
              <Ionicons name="chatbubbles-outline" size={22} color="#fff" />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.initialScrollContent}>
            {/* Hero Section */}
            <View style={styles.heroSection}>
              <View style={styles.heroIconContainer}>
                <Ionicons name="school" size={70} color="#fff" />
              </View>
              <Text style={styles.heroTitle}>Karnataka 2nd PUC</Text>
              <Text style={styles.heroSubtitle}>
                AI-Powered Model Question Paper Generator
              </Text>
            </View>

            {/* Info Cards */}
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Ionicons name="document-text" size={20} color="#4F46E5" />
                <Text style={styles.infoText}>Full 80-mark paper with 5 parts</Text>
              </View>
              <View style={styles.infoRow}>
                <Ionicons name="time" size={20} color="#4F46E5" />
                <Text style={styles.infoText}>3 hours 15 minutes duration</Text>
              </View>
              <View style={styles.infoRow}>
                <Ionicons name="checkmark-circle" size={20} color="#4F46E5" />
                <Text style={styles.infoText}>Karnataka State Board format</Text>
              </View>
            </View>

            {/* Subject Selector */}
            <View style={styles.pickerContainer}>
              <Text style={styles.pickerLabel}>Select Subject</Text>
              <TouchableOpacity 
                style={styles.dropdownButton}
                onPress={() => setShowSubjectPicker(true)}
              >
                <Text style={styles.dropdownText}>{selectedSubject}</Text>
                <Ionicons name="chevron-down" size={20} color="#4F46E5" />
              </TouchableOpacity>
            </View>

            {/* Grade Selector */}
            <View style={styles.pickerContainer}>
              <Text style={styles.pickerLabel}>Select Grade</Text>
              <TouchableOpacity 
                style={styles.dropdownButton}
                onPress={() => setShowGradePicker(true)}
              >
                <Text style={styles.dropdownText}>{selectedGrade}</Text>
                <Ionicons name="chevron-down" size={20} color="#4F46E5" />
              </TouchableOpacity>
            </View>

            {/* Generate Button */}
            <TouchableOpacity style={styles.generateButton} onPress={handleGenerateExam}>
              <LinearGradient
                colors={["#10B981", "#059669"]}
                style={styles.buttonGradient}
              >
                <Ionicons name="sparkles" size={24} color="#fff" />
                <Text style={styles.buttonText}>Generate Model Paper</Text>
              </LinearGradient>
            </TouchableOpacity>

            <Text style={styles.noteText}>
              ⏱️ AI generation may take 30-60 seconds
            </Text>

            {errorMessage && (
              <View style={styles.errorBanner}>
                <Ionicons name="warning" size={18} color="#B91C1C" />
                <Text style={styles.errorBannerText}>{errorMessage}</Text>
              </View>
            )}
          </ScrollView>

          {/* Subject Picker Modal */}
          <Modal
            visible={showSubjectPicker}
            transparent
            animationType="fade"
            onRequestClose={() => setShowSubjectPicker(false)}
          >
            <TouchableOpacity 
              style={styles.modalOverlay} 
              activeOpacity={1}
              onPress={() => setShowSubjectPicker(false)}
            >
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Select Subject</Text>
                <FlatList
                  data={PUC_SUBJECTS}
                  keyExtractor={(item) => item}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[
                        styles.modalOption,
                        selectedSubject === item && styles.modalOptionSelected
                      ]}
                      onPress={() => {
                        setSelectedSubject(item);
                        setShowSubjectPicker(false);
                      }}
                    >
                      <Text style={[
                        styles.modalOptionText,
                        selectedSubject === item && styles.modalOptionTextSelected
                      ]}>{item}</Text>
                      {selectedSubject === item && (
                        <Ionicons name="checkmark" size={20} color="#4F46E5" />
                      )}
                    </TouchableOpacity>
                  )}
                />
              </View>
            </TouchableOpacity>
          </Modal>

          {/* Grade Picker Modal */}
          <Modal
            visible={showGradePicker}
            transparent
            animationType="fade"
            onRequestClose={() => setShowGradePicker(false)}
          >
            <TouchableOpacity 
              style={styles.modalOverlay} 
              activeOpacity={1}
              onPress={() => setShowGradePicker(false)}
            >
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Select Grade</Text>
                <FlatList
                  data={PUC_GRADES}
                  keyExtractor={(item) => item}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[
                        styles.modalOption,
                        selectedGrade === item && styles.modalOptionSelected
                      ]}
                      onPress={() => {
                        setSelectedGrade(item);
                        setShowGradePicker(false);
                      }}
                    >
                      <Text style={[
                        styles.modalOptionText,
                        selectedGrade === item && styles.modalOptionTextSelected
                      ]}>{item}</Text>
                      {selectedGrade === item && (
                        <Ionicons name="checkmark" size={20} color="#4F46E5" />
                      )}
                    </TouchableOpacity>
                  )}
                />
              </View>
            </TouchableOpacity>
          </Modal>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  // Loading Screen
  if (screenState === "loading") {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient colors={["#4F46E5", "#7C3AED"]} style={styles.gradient}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.loadingText}>Generating Your Exam Paper...</Text>
            <Text style={styles.loadingSubtext}>
              AI is creating {selectedSubject} questions for {selectedGrade}
            </Text>
            <Text style={styles.loadingSubtext}>This may take 30-60 seconds</Text>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setScreenState("initial")}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  // Exam Overview Screen
  if (screenState === "exam" && generatedExam) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient colors={["#F0F4FF", "#E0EAFC"]} style={styles.gradient}>
          {/* My Chat Button */}
          <TouchableOpacity 
            style={styles.myChatButton} 
            onPress={() => navigate("chat")}
          >
            <Ionicons name="chatbubbles" size={20} color="#4F46E5" />
            <Text style={styles.myChatButtonText}>My Chat</Text>
          </TouchableOpacity>

          <ScrollView contentContainerStyle={styles.examOverviewContent}>
            {/* Success Header */}
            <View style={styles.successHeader}>
              <View style={styles.successIconContainer}>
                <Ionicons name="checkmark-circle" size={60} color="#10B981" />
              </View>
              <Text style={styles.successTitle}>Exam Generated!</Text>
              <Text style={styles.examId}>ID: {generatedExam.examId}</Text>
            </View>

            {/* Exam Info Card */}
            <View style={styles.examInfoCard}>
              <Text style={styles.examInfoTitle}>{generatedExam.subject}</Text>
              <Text style={styles.examInfoSubtitle}>{generatedExam.grade} - {generatedExam.examType}</Text>
              
              <View style={styles.examStats}>
                <View style={styles.statItem}>
                  <Ionicons name="trophy" size={24} color="#F59E0B" />
                  <Text style={styles.statValue}>{generatedExam.totalMarks}</Text>
                  <Text style={styles.statLabel}>Marks</Text>
                </View>
                <View style={styles.statItem}>
                  <Ionicons name="time" size={24} color="#3B82F6" />
                  <Text style={styles.statValue}>{formatDuration(generatedExam.duration)}</Text>
                  <Text style={styles.statLabel}>Duration</Text>
                </View>
                <View style={styles.statItem}>
                  <Ionicons name="help-circle" size={24} color="#8B5CF6" />
                  <Text style={styles.statValue}>{generatedExam.questionCount}</Text>
                  <Text style={styles.statLabel}>Questions</Text>
                </View>
              </View>
            </View>

            {/* Parts Summary */}
            <View style={styles.partsCard}>
              <Text style={styles.partsTitle}>Exam Structure</Text>
              {generatedExam.parts.map((part, index) => (
                <View key={index} style={styles.partRow}>
                  <View style={styles.partInfo}>
                    <Text style={styles.partName}>{part.partName}</Text>
                    <Text style={styles.partType}>{part.questionType}</Text>
                  </View>
                  <Text style={styles.partMarks}>
                    {(part.questions?.length || 0)} × {part.marksPerQuestion}m
                  </Text>
                </View>
              ))}
            </View>

            {/* Instructions */}
            <View style={styles.instructionsCard}>
              <Text style={styles.instructionsTitle}>Instructions</Text>
              {generatedExam.instructions.map((instruction, index) => (
                <View key={index} style={styles.instructionRow}>
                  <Text style={styles.instructionBullet}>•</Text>
                  <Text style={styles.instructionText}>{instruction}</Text>
                </View>
              ))}
            </View>

            {/* Start Button */}
            <TouchableOpacity style={styles.startExamButton} onPress={handleStartExam}>
              <LinearGradient
                colors={["#4F46E5", "#7C3AED"]}
                style={styles.buttonGradient}
              >
                <Ionicons name="play" size={24} color="#fff" />
                <Text style={styles.buttonText}>Start Exam</Text>
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  // Question Screen
  if (screenState === "question" && generatedExam && currentPart && currentQuestion) {
    const totalQuestions = generatedExam.parts.reduce((sum, p) => sum + (p.questions?.length || 0), 0);
    const answeredQuestions = generatedExam.parts.slice(0, currentPartIndex).reduce((sum, p) => sum + (p.questions?.length || 0), 0) + currentQuestionIndex;
    const progress = (answeredQuestions / totalQuestions) * 100;
    const isFirstQuestion = currentPartIndex === 0 && currentQuestionIndex === 0;
    const isLastQuestion = currentPartIndex === generatedExam.parts.length - 1 && 
                          currentQuestionIndex === (currentPart.questions?.length || 1) - 1;

    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient colors={["#F0F4FF", "#E0EAFC"]} style={styles.gradient}>
          {/* Header */}
          <View style={styles.questionHeader}>
            <View>
              <Text style={styles.partLabel}>{currentPart.partName}</Text>
              <Text style={styles.partDesc}>{currentPart.marksPerQuestion} marks</Text>
            </View>
            <View style={styles.questionProgress}>
              <Text style={styles.progressText}>
                Q{currentQuestion.questionNumber}/{generatedExam.questionCount}
              </Text>
              {skippedQuestions.size > 0 && (
                <Text style={styles.skippedCount}>
                  {skippedQuestions.size} skipped
                </Text>
              )}
            </View>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBar, { width: `${progress}%` }]} />
          </View>

          <ScrollView style={styles.questionContent}>
            {/* Question Card */}
            <View style={styles.questionCard}>
              <View style={styles.badgeRow}>
                <View style={styles.questionTopicBadge}>
                  <Text style={styles.topicText}>{currentQuestion.topic}</Text>
                </View>
                {skippedQuestions.has(currentQuestion.questionId) && (
                  <View style={styles.skippedBadge}>
                    <Ionicons name="play-skip-forward" size={12} color="#D97706" />
                    <Text style={styles.skippedBadgeText}>Skipped</Text>
                  </View>
                )}
              </View>

              <Text style={styles.questionText}>
                {currentQuestion.questionNumber}. {currentQuestion.questionText}
              </Text>

              {/* MCQ Options */}
              {isMCQ(currentQuestion) && currentQuestion.options && (
                <View style={styles.optionsContainer}>
                  {currentQuestion.options.map((option, index) => {
                    const isSelected = userAnswers[currentQuestion.questionId] === option;
                    return (
                      <TouchableOpacity
                        key={index}
                        style={[
                          styles.optionButton,
                          isSelected && styles.optionButtonSelected,
                        ]}
                        onPress={() => handleSelectOption(option)}
                      >
                        <View style={[
                          styles.optionRadio,
                          isSelected && styles.optionRadioSelected,
                        ]}>
                          {isSelected && <View style={styles.optionRadioInner} />}
                        </View>
                        <Text style={[
                          styles.optionText,
                          isSelected && styles.optionTextSelected,
                        ]}>
                          {option}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {/* Sub-parts for Part E */}
              {hasSubParts(currentQuestion) && currentQuestion.subParts && (
                <View style={styles.subPartsContainer}>
                  {currentQuestion.subParts.map((subPart, index) => (
                    <View key={index} style={styles.subPartCard}>
                      <Text style={styles.subPartLabel}>({subPart.partLabel})</Text>
                      <Text style={styles.subPartText}>{subPart.questionText}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Written Answer Input for Non-MCQ Questions */}
              {!isMCQ(currentQuestion) && !hasSubParts(currentQuestion) && (
                <View style={styles.writtenAnswerContainer}>
                  <Text style={styles.writtenAnswerTitle}>Your Answer</Text>
                  
                  {/* Answer Mode Tabs */}
                  <View style={styles.answerModeTabs}>
                    <TouchableOpacity
                      style={[
                        styles.answerModeTab,
                        (answerMode[currentQuestion.questionId] !== "upload") && styles.answerModeTabActive
                      ]}
                      onPress={() => setCurrentAnswerMode(currentQuestion.questionId, "type")}
                    >
                      <Ionicons 
                        name="create-outline" 
                        size={18} 
                        color={(answerMode[currentQuestion.questionId] !== "upload") ? "#4F46E5" : "#6B7280"} 
                      />
                      <Text style={[
                        styles.answerModeTabText,
                        (answerMode[currentQuestion.questionId] !== "upload") && styles.answerModeTabTextActive
                      ]}>Type Answer</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.answerModeTab,
                        answerMode[currentQuestion.questionId] === "upload" && styles.answerModeTabActive
                      ]}
                      onPress={() => setCurrentAnswerMode(currentQuestion.questionId, "upload")}
                    >
                      <Ionicons 
                        name="camera-outline" 
                        size={18} 
                        color={answerMode[currentQuestion.questionId] === "upload" ? "#4F46E5" : "#6B7280"} 
                      />
                      <Text style={[
                        styles.answerModeTabText,
                        answerMode[currentQuestion.questionId] === "upload" && styles.answerModeTabTextActive
                      ]}>Upload Written</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Type Answer Mode */}
                  {answerMode[currentQuestion.questionId] !== "upload" && (
                    <TextInput
                      style={styles.writtenAnswerInput}
                      placeholder="Type your answer here..."
                      placeholderTextColor="#9CA3AF"
                      multiline
                      textAlignVertical="top"
                      value={userAnswers[currentQuestion.questionId] || ""}
                      onChangeText={(text) => handleWrittenAnswerChange(currentQuestion.questionId, text)}
                    />
                  )}

                  {/* Upload Mode */}
                  {answerMode[currentQuestion.questionId] === "upload" && (
                    <View style={styles.uploadContainer}>
                      {uploadedImages[currentQuestion.questionId] ? (
                        <View style={styles.uploadedImageContainer}>
                          <Image
                            source={{ uri: uploadedImages[currentQuestion.questionId] }}
                            style={styles.uploadedImage}
                            resizeMode="contain"
                          />
                          <TouchableOpacity
                            style={styles.removeImageButton}
                            onPress={() => handleRemoveImage(currentQuestion.questionId)}
                          >
                            <Ionicons name="close-circle" size={28} color="#EF4444" />
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <View style={styles.uploadButtons}>
                          <TouchableOpacity
                            style={styles.uploadButton}
                            onPress={() => handleTakePhoto(currentQuestion.questionId)}
                          >
                            <Ionicons name="camera" size={32} color="#4F46E5" />
                            <Text style={styles.uploadButtonText}>Take Photo</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.uploadButton}
                            onPress={() => handlePickImage(currentQuestion.questionId)}
                          >
                            <Ionicons name="images" size={32} color="#4F46E5" />
                            <Text style={styles.uploadButtonText}>Choose from Gallery</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                      <Text style={styles.uploadHint}>
                        Upload a photo of your handwritten answer
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          </ScrollView>

          {/* Navigation Buttons */}
          <View style={styles.navigationButtons}>
            <TouchableOpacity
              style={[styles.navButton, isFirstQuestion && styles.navButtonDisabled]}
              onPress={handlePrevious}
              disabled={isFirstQuestion}
            >
              <Ionicons name="arrow-back" size={20} color={isFirstQuestion ? "#9CA3AF" : "#4F46E5"} />
              <Text style={[styles.navButtonText, isFirstQuestion && styles.navButtonTextDisabled]}>
                Previous
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.navButton, styles.navButtonSkip]}
              onPress={handleSkip}
            >
              <Ionicons name="play-skip-forward" size={18} color="#F59E0B" />
              <Text style={styles.navButtonTextSkip}>Skip</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.navButton, styles.navButtonPrimary]}
              onPress={handleNext}
            >
              <Text style={styles.navButtonTextPrimary}>
                {isLastQuestion ? (getSubjectiveParts().length > 0 ? "View Subjective" : "Submit") : "Next"}
              </Text>
              <Ionicons name={isLastQuestion ? (getSubjectiveParts().length > 0 ? "document-text" : "checkmark") : "arrow-forward"} size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  // Question Paper Screen - Board Exam Style View for Subjective Questions
  if (screenState === "questionPaper" && generatedExam) {
    const subjectiveParts = getSubjectiveParts();
    let questionNumber = 0;

    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient colors={["#F9FAFB", "#FFFFFF"]} style={styles.gradient}>
          {/* Header */}
          <View style={styles.questionPaperHeader}>
            <View style={styles.questionPaperHeaderContent}>
              <Text style={styles.questionPaperTitle}>{generatedExam.subject}</Text>
              <Text style={styles.questionPaperSubtitle}>{generatedExam.grade} - Subjective Section</Text>
            </View>
            <View style={styles.questionPaperBadge}>
              <Text style={styles.questionPaperBadgeText}>
                {subjectiveParts.reduce((sum, p) => sum + (p.questions?.length || 0), 0)} Questions
              </Text>
            </View>
          </View>

          <ScrollView contentContainerStyle={styles.questionPaperContent}>
            {/* Instructions Card */}
            <View style={styles.boardInstructionsCard}>
              <View style={styles.boardInstructionsHeader}>
                <Ionicons name="information-circle" size={24} color="#4F46E5" />
                <Text style={styles.boardInstructionsTitle}>Instructions</Text>
              </View>
              <Text style={styles.boardInstructionsText}>
                • Write your answers on paper{"\n"}
                • Number your answers clearly as shown{"\n"}
                • Take photos of your answer sheet when done{"\n"}
                • Ensure all pages are captured clearly
              </Text>
            </View>

            {/* Questions organized by Parts */}
            {subjectiveParts.map((part, partIndex) => (
              <View key={partIndex} style={styles.boardPartContainer}>
                {/* Part Header */}
                <View style={styles.boardPartHeader}>
                  <Text style={styles.boardPartName}>{part.partName}</Text>
                  <View style={styles.boardPartMeta}>
                    <Text style={styles.boardPartType}>{part.questionType}</Text>
                    <Text style={styles.boardPartMarks}>
                      {part.marksPerQuestion} marks each
                    </Text>
                  </View>
                </View>

                {/* Part Description */}
                {part.partDescription && (
                  <Text style={styles.boardPartInstructions}>{part.partDescription}</Text>
                )}

                {/* Questions */}
                {part.questions?.map((question, qIndex) => {
                  questionNumber++;
                  return (
                    <View key={question.questionId} style={styles.boardQuestionCard}>
                      {/* Question Number & Marks */}
                      <View style={styles.boardQuestionHeader}>
                        <View style={styles.boardQuestionNumberBadge}>
                          <Text style={styles.boardQuestionNumber}>Q{questionNumber}</Text>
                        </View>
                        <View style={styles.boardMarksBadge}>
                          <Text style={styles.boardMarksText}>{part.marksPerQuestion}M</Text>
                        </View>
                      </View>

                      {/* Question Text */}
                      <Text style={styles.boardQuestionText}>{question.questionText}</Text>

                      {/* Sub-parts if any */}
                      {hasSubParts(question) && question.subParts && (
                        <View style={styles.boardSubPartsContainer}>
                          {question.subParts.map((subPart, spIndex) => (
                            <View key={spIndex} style={styles.boardSubPartItem}>
                              <Text style={styles.boardSubPartLabel}>({String.fromCharCode(97 + spIndex)})</Text>
                              <View style={styles.boardSubPartContent}>
                                <Text style={styles.boardSubPartText}>{subPart.questionText}</Text>
                              </View>
                            </View>
                          ))}
                        </View>
                      )}

                      {/* Options if present (for short answer from options) */}
                      {question.options && question.options.length > 0 && !isMCQ(question) && (
                        <View style={styles.boardOptionsContainer}>
                          {question.options.map((opt, optIndex) => (
                            <Text key={optIndex} style={styles.boardOptionText}>
                              {String.fromCharCode(65 + optIndex)}) {opt}
                            </Text>
                          ))}
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            ))}

            {/* Space for scrolling */}
            <View style={{ height: 100 }} />
          </ScrollView>

          {/* Bottom Action Bar */}
          <View style={styles.questionPaperFooter}>
            <TouchableOpacity
              style={styles.uploadAnswerSheetButton}
              onPress={() => setScreenState("uploadAnswers")}
            >
              <LinearGradient
                colors={["#4F46E5", "#7C3AED"]}
                style={styles.buttonGradient}
              >
                <Ionicons name="camera" size={22} color="#fff" />
                <Text style={styles.buttonText}>Upload Answer Sheet</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  // Upload Answer Sheet Screen
  if (screenState === "uploadAnswers" && generatedExam) {
    const handleSubmitAnswerSheets = async () => {
      if (answerSheetImages.length === 0) {
        Alert.alert("No Images", "Please upload at least one photo of your answer sheet.");
        return;
      }

      // Set to submitting state
      setScreenState("submitting");
      setSubmissionStatus("Preparing submission...");
      
      try {
        // Upload answer sheet images
        setSubmissionStatus("Uploading answer sheets for AI evaluation...");
        
        const uploadResult = await uploadWrittenAnswers(generatedExam.examId, studentId, answerSheetImages);
        
        // Save submission ID for tracking
        setWrittenSubmissionId(uploadResult.writtenSubmissionId);
        
        // Set pending evaluation in global context
        setPendingEvaluation({
          writtenSubmissionId: uploadResult.writtenSubmissionId,
          examId: generatedExam.examId,
          studentId: studentId,
          subject: generatedExam.subject || selectedSubject,
          submittedAt: new Date(),
        });
        
        // Show success message and navigate to home
        Alert.alert(
          "✅ Upload Successful!",
          "Your answer sheet has been uploaded successfully. AI evaluation is in progress. You can check the status from the home screen.",
          [
            {
              text: "Go to Home",
              onPress: () => {
                // Reset exam state
                setScreenState("initial");
                setAnswerSheetImages([]);
                setGeneratedExam(null);
                // Navigate to home
                navigate("home");
              },
            },
          ]
        );
        
      } catch (error: any) {
        // Handle 409 Conflict - duplicate submission
        if (error?.status === 409) {
          Alert.alert(
            "Already Submitted",
            "⚠️ You have already submitted answers for this exam. Duplicate submissions are not allowed.",
            [
              { text: "View Results", onPress: () => {
                // Try to fetch existing results
                if (generatedExam) {
                  setScreenState("loading");
                  getExamResults(generatedExam.examId, studentId)
                    .then((result) => {
                      setExamResult(result);
                      setScore(result.grandScore || 0);
                      setScreenState("results");
                    })
                    .catch(() => {
                      Alert.alert("Results Not Ready", "Your previous submission is still being evaluated. Please try again later.");
                      setScreenState("initial");
                    });
                }
              }},
              { text: "Go Back", onPress: () => setScreenState("initial") }
            ]
          );
          return;
        }
        
        // Handle other errors
        Alert.alert(
          "Submission Error",
          error?.message || "Failed to submit answer sheets. Please try again.",
          [{ text: "OK", onPress: () => setScreenState("uploadAnswers") }]
        );
      }
    };

    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient colors={["#F0F4FF", "#E0EAFC"]} style={styles.gradient}>
          {/* Header */}
          <View style={styles.uploadHeader}>
            <TouchableOpacity
              style={styles.backButtonSmall}
              onPress={() => setScreenState("questionPaper")}
            >
              <Ionicons name="arrow-back" size={24} color="#4F46E5" />
            </TouchableOpacity>
            <Text style={styles.uploadHeaderTitle}>Upload Answer Sheet</Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView contentContainerStyle={styles.uploadContent}>
            {/* Instructions */}
            <View style={styles.uploadInstructionsCard}>
              <Ionicons name="bulb" size={32} color="#F59E0B" />
              <Text style={styles.uploadInstructionsTitle}>Tips for Best Results</Text>
              <Text style={styles.uploadInstructionsText}>
                • Ensure good lighting{"\n"}
                • Keep pages flat and straight{"\n"}
                • Capture all written content{"\n"}
                • Number your answers clearly
              </Text>
            </View>

            {/* Image Upload Options */}
            <View style={styles.uploadOptionsRow}>
              <TouchableOpacity
                style={styles.uploadOptionButton}
                onPress={handleTakeAnswerSheetPhoto}
              >
                <View style={styles.uploadOptionIcon}>
                  <Ionicons name="camera" size={32} color="#4F46E5" />
                </View>
                <Text style={styles.uploadOptionText}>Take Photo</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.uploadOptionButton}
                onPress={handlePickAnswerSheet}
              >
                <View style={styles.uploadOptionIcon}>
                  <Ionicons name="images" size={32} color="#4F46E5" />
                </View>
                <Text style={styles.uploadOptionText}>Choose from Gallery</Text>
              </TouchableOpacity>
            </View>

            {/* Uploaded Images */}
            {answerSheetImages.length > 0 && (
              <View style={styles.uploadedImagesContainer}>
                <Text style={styles.uploadedImagesTitle}>
                  Uploaded Pages ({answerSheetImages.length})
                </Text>
                <View style={styles.uploadedImagesGrid}>
                  {answerSheetImages.map((uri, index) => (
                    <View key={index} style={styles.uploadedImageItem}>
                      <Image source={{ uri }} style={styles.uploadedImageThumb} />
                      <TouchableOpacity
                        style={styles.removeAnswerSheetButton}
                        onPress={() => handleRemoveAnswerSheetImage(index)}
                      >
                        <Ionicons name="close-circle" size={24} color="#EF4444" />
                      </TouchableOpacity>
                      <Text style={styles.uploadedImageLabel}>Page {index + 1}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Empty State */}
            {answerSheetImages.length === 0 && (
              <View style={styles.emptyUploadState}>
                <Ionicons name="document-text-outline" size={64} color="#D1D5DB" />
                <Text style={styles.emptyUploadText}>No answer sheets uploaded yet</Text>
                <Text style={styles.emptyUploadSubtext}>
                  Take photos or choose from gallery
                </Text>
              </View>
            )}
          </ScrollView>

          {/* Bottom Action */}
          <View style={styles.uploadFooter}>
            <TouchableOpacity
              style={[
                styles.submitAnswerSheetButton,
                answerSheetImages.length === 0 && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmitAnswerSheets}
              disabled={answerSheetImages.length === 0}
            >
              <LinearGradient
                colors={answerSheetImages.length > 0 ? ["#10B981", "#059669"] : ["#9CA3AF", "#6B7280"]}
                style={styles.buttonGradient}
              >
                <Ionicons name="checkmark-circle" size={22} color="#fff" />
                <Text style={styles.buttonText}>
                  Submit {answerSheetImages.length > 0 ? `(${answerSheetImages.length} pages)` : ""}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  // Submitting Screen
  if (screenState === "submitting") {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient colors={["#4F46E5", "#7C3AED", "#A855F7"]} style={styles.gradient}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.loadingText}>Uploading your answer sheet...</Text>
            <Text style={styles.loadingSubtext}>
              {submissionStatus || "Processing your answers..."}
            </Text>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  // Evaluating Screen - Waiting for AI evaluation
  if (screenState === "evaluating") {
    const isComplete = evaluationStatus?.isComplete || false;
    
    const handleCheckStatus = async () => {
      if (!writtenSubmissionId) return;
      
      try {
        setSubmissionStatus("Checking status...");
        const status = await checkSubmissionStatus(writtenSubmissionId);
        setEvaluationStatus(status);
        setSubmissionStatus(status.statusMessage);
        
        if (status.isComplete && status.result) {
          setExamResult(status.result);
          setScore(status.result.grandScore || 0);
        }
      } catch (error) {
        setSubmissionStatus("Failed to check status. Please try again.");
      }
    };
    
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient colors={["#F0F4FF", "#E0EAFC"]} style={styles.gradient}>
          <ScrollView contentContainerStyle={styles.evaluatingContainer}>
            {/* Status Icon */}
            <View style={styles.evaluatingIconContainer}>
              {!isComplete ? (
                <ActivityIndicator size={80} color="#6366f1" />
              ) : (
                <Ionicons name="checkmark-circle" size={80} color="#22C55E" />
              )}
            </View>

            {/* Status Message */}
            <Text style={styles.evaluatingTitle}>
              {isComplete ? '✅ Evaluation Complete!' : '🤖 AI Evaluation in Progress'}
            </Text>
            <Text style={styles.evaluatingMessage}>
              {submissionStatus || '⏳ Your answer sheet is being processed...'}
            </Text>

            {/* Progress Info */}
            {!isComplete && (
              <View style={styles.evaluatingInfoCard}>
                <Ionicons name="information-circle" size={24} color="#6366f1" />
                <Text style={styles.evaluatingInfoText}>
                  Status updates every 3 seconds{'\n'}
                  This usually takes 2-5 minutes
                </Text>
              </View>
            )}

            {/* Failed Status Message */}
            {isComplete && evaluationStatus?.status === 'Failed' && (
              <View style={[styles.evaluatingInfoCard, { backgroundColor: '#FEE2E2' }]}>
                <Ionicons name="alert-circle" size={24} color="#EF4444" />
                <Text style={[styles.evaluatingInfoText, { color: '#DC2626' }]}>
                  Evaluation failed. Please contact support or try again.
                </Text>
              </View>
            )}

            {/* Check Status Button - Show when not complete */}
            {!isComplete && writtenSubmissionId && (
              <TouchableOpacity
                style={styles.checkStatusButton}
                onPress={handleCheckStatus}
              >
                <LinearGradient
                  colors={["#3B82F6", "#2563EB"]}
                  style={styles.checkStatusButtonGradient}
                >
                  <Ionicons name="refresh" size={20} color="#fff" />
                  <Text style={styles.checkStatusButtonText}>Check Status Now</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}

            {/* View Results Button - Only show when complete AND status is Completed */}
            {isComplete && evaluationStatus?.status === 'Completed' && evaluationStatus?.result && (
              <TouchableOpacity
                style={styles.viewResultsButton}
                onPress={() => {
                  setShowDetailedResults(true);
                  setScreenState("results");
                }}
              >
                <LinearGradient
                  colors={["#6366f1", "#8b5cf6"]}
                  style={styles.viewResultsButtonGradient}
                >
                  <Ionicons name="document-text" size={22} color="#fff" />
                  <Text style={styles.viewResultsButtonText}>View Detailed Results</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}

            {/* Quick Summary - Show when complete */}
            {isComplete && evaluationStatus?.result && (
              <View style={styles.quickSummaryCard}>
                <Text style={styles.quickSummaryTitle}>Quick Summary</Text>
                <View style={styles.quickSummaryRow}>
                  <Text style={styles.quickSummaryLabel}>Total Score:</Text>
                  <Text style={styles.quickSummaryValue}>
                    {evaluationStatus.result.grandScore} / {evaluationStatus.result.grandTotalMarks}
                  </Text>
                </View>
                <View style={styles.quickSummaryRow}>
                  <Text style={styles.quickSummaryLabel}>Percentage:</Text>
                  <Text style={styles.quickSummaryValue}>
                    {evaluationStatus.result.percentage.toFixed(1)}%
                  </Text>
                </View>
                <View style={styles.quickSummaryRow}>
                  <Text style={styles.quickSummaryLabel}>Grade:</Text>
                  <Text style={[
                    styles.quickSummaryGrade,
                    { color: getGradeColor(evaluationStatus.result.grade) }
                  ]}>
                    {evaluationStatus.result.grade}
                  </Text>
                </View>
              </View>
            )}

            {/* Cancel Button */}
            {!isComplete && (
              <TouchableOpacity
                style={styles.cancelWaitingButton}
                onPress={() => {
                  Alert.alert(
                    'Cancel Evaluation?',
                    'Your answer sheet will continue to be evaluated in the background. You can check results later.',
                    [
                      { text: 'Continue Waiting', style: 'cancel' },
                      { text: 'Go Back', onPress: () => setScreenState('initial') }
                    ]
                  );
                }}
              >
                <Text style={styles.cancelWaitingButtonText}>Go Back</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  // Results Screen
  if (screenState === "results" && generatedExam) {
    // Build MCQ results from exam data and userAnswers if not provided by backend
    let mcqResultsArray: any[] = [];
    const hasBackendMcqResults = examResult?.mcqResults && examResult.mcqResults.length > 0;
    
    if (!hasBackendMcqResults && userAnswers && Object.keys(userAnswers).length > 0) {
      let questionNumber = 1;
      for (const part of generatedExam.parts) {
        for (const question of part.questions) {
          if (isMCQ(question) && userAnswers[question.questionId]) {
            const studentAnswer = userAnswers[question.questionId];
            const isCorrect = studentAnswer === question.correctAnswer;
            mcqResultsArray.push({
              questionId: question.questionId,
              questionNumber: questionNumber++,
              questionText: question.questionText,
              options: question.options || [],
              correctAnswer: question.correctAnswer,
              studentAnswer: studentAnswer,
              isCorrect: isCorrect,
              marks: isCorrect ? part.marksPerQuestion : 0,
            });
          }
        }
      }
    }
    
    // Merge MCQ results with examResult if needed
    if (examResult && mcqResultsArray.length > 0) {
      // Only use backend results if they exist and are not empty
      if (!examResult.mcqResults || examResult.mcqResults.length === 0) {
        examResult.mcqResults = mcqResultsArray;
      }
    }
    
    const finalMcqResults = examResult?.mcqResults || mcqResultsArray;
    
    // Use API result if available, otherwise calculate locally
    const totalScore = examResult ? examResult.grandScore : (mcqResult ? mcqResult.score : score);
    const totalMaxScore = examResult ? examResult.grandTotalMarks : generatedExam.totalMarks;
    const percentage = examResult ? Math.round(examResult.percentage) : (mcqResult ? Math.round(mcqResult.percentage) : Math.round((score / generatedExam.totalMarks) * 100));
    const isPassed = examResult ? examResult.passed : percentage >= 35; // Karnataka passing percentage
    const grade = examResult ? examResult.grade : (mcqResult ? (
      mcqResult.percentage >= 90 ? "A+" :
      mcqResult.percentage >= 80 ? "A" :
      mcqResult.percentage >= 70 ? "B+" :
      mcqResult.percentage >= 60 ? "B" :
      mcqResult.percentage >= 50 ? "C+" :
      mcqResult.percentage >= 40 ? "C" :
      mcqResult.percentage >= 35 ? "D" : "F"
    ) : (
      percentage >= 90 ? "A+" :
      percentage >= 80 ? "A" :
      percentage >= 70 ? "B+" :
      percentage >= 60 ? "B" :
      percentage >= 50 ? "C+" :
      percentage >= 40 ? "C" :
      percentage >= 35 ? "D" : "F"
    ));
    const gradeColor = getGradeColor(grade);
    const gradeDescription = getGradeDescription(grade);

    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient colors={["#E0EAFC", "#CFDEF3"]} style={styles.gradient}>
          {/* My Chat Button */}
          <TouchableOpacity 
            style={styles.myChatButton} 
            onPress={() => navigate("chat")}
          >
            <Ionicons name="chatbubbles" size={20} color="#4F46E5" />
            <Text style={styles.myChatButtonText}>My Chat</Text>
          </TouchableOpacity>

          <ScrollView contentContainerStyle={styles.resultsContainer}>
            {/* Result Icon */}
            <View style={[styles.resultIcon, { backgroundColor: gradeColor }]}>
              <Ionicons
                name={isPassed ? "trophy" : "sad"}
                size={60}
                color="#fff"
              />
            </View>

            <Text style={styles.resultStatus}>
              {gradeDescription}
            </Text>

            {/* Score Card */}
            <View style={styles.scoreCard}>
              <Text style={styles.scoreTitle}>Your Score</Text>
              <Text style={styles.scoreValue}>{totalScore}/{totalMaxScore}</Text>
              <Text style={styles.percentage}>{percentage}%</Text>
              <View style={[styles.gradeBadge, { backgroundColor: gradeColor }]}>
                <Text style={styles.gradeText}>Grade: {grade}</Text>
              </View>
            </View>

            {/* Exam Details */}
            <View style={styles.resultDetailsCard}>
              <Text style={styles.detailsTitle}>Exam Details</Text>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Subject:</Text>
                <Text style={styles.detailValue}>{generatedExam.subject}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Class:</Text>
                <Text style={styles.detailValue}>{generatedExam.grade}</Text>
              </View>
              
              {/* Show separate scores when using new API */}
              {examResult && (
                <>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>MCQ Score:</Text>
                    <Text style={[styles.detailValue, { color: '#4F46E5' }]}>
                      {examResult.mcqScore}/{examResult.mcqTotalMarks}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Subjective Score:</Text>
                    <Text style={[styles.detailValue, { color: '#7C3AED' }]}>
                      {examResult.subjectiveScore}/{examResult.subjectiveTotalMarks}
                    </Text>
                  </View>
                </>
              )}
              
              {/* Show MCQ result if only MCQ was submitted */}
              {!examResult && mcqResult && (
                <>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>MCQ Score:</Text>
                    <Text style={[styles.detailValue, { color: '#4F46E5' }]}>
                      {mcqResult.score}/{mcqResult.totalMarks}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Correct Answers:</Text>
                    <Text style={[styles.detailValue, { color: '#22C55E' }]}>
                      {mcqResult.results.filter(r => r.isCorrect).length}
                    </Text>
                  </View>
                </>
              )}
              
              {!examResult && !mcqResult && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Questions Attempted:</Text>
                  <Text style={styles.detailValue}>
                    {Object.keys(userAnswers).length + Object.keys(uploadedImages).length}
                  </Text>
                </View>
              )}
            </View>

            {/* MCQ Detailed Results - Only show if we have MCQ data */}
            {finalMcqResults.length > 0 && (
              <View style={styles.feedbackCard}>
                <Text style={styles.feedbackTitle}>📊 MCQ Detailed Results</Text>
                <Text style={styles.feedbackSubtitle}>
                  Tap each question to see options and correct answer
                </Text>
                {finalMcqResults.map((mcqRes: any, index: number) => (
                  <McqResultItem key={mcqRes.questionId || index} mcqRes={mcqRes} styles={styles} />
                ))}
              </View>
            )}

            {/* Subjective Feedback (if API result available) */}
            {examResult && examResult.subjectiveResults && examResult.subjectiveResults.length > 0 && (
              <View style={styles.feedbackCard}>
                <Text style={styles.feedbackTitle}>📝 AI Subjective Evaluation</Text>
                <Text style={styles.feedbackSubtitle}>
                  Tap each question to see detailed feedback
                </Text>
                {examResult.subjectiveResults.map((result, index) => {
                  const scoreEarned = result.earnedMarks ?? result.score ?? 0;
                  const maxMarks = result.maxMarks ?? 0;
                  const scorePercent = maxMarks > 0 ? (scoreEarned / maxMarks) * 100 : 0;
                  const scoreColor = scorePercent >= 80 ? '#22C55E' : scorePercent >= 60 ? '#F97316' : '#EF4444';
                  // Use API's isFullyCorrect field or fallback to percentage check
                  const isIncomplete = (result.isFullyCorrect === false) || (scorePercent < 100 && result.expectedAnswer);
                  
                  return (
                    <View key={result.questionId || index} style={styles.subjectiveResultCard}>
                      {/* Question Header */}
                      <View style={styles.subjectiveHeader}>
                        <View style={styles.questionBadge}>
                          <Text style={styles.questionBadgeText}>Q{result.questionNumber || index + 1}</Text>
                        </View>
                        <View style={[styles.scoreBadge, { backgroundColor: scoreColor }]}>
                          <Text style={styles.scoreBadgeText}>{scoreEarned}/{maxMarks}</Text>
                        </View>
                      </View>

                      {/* Incomplete Answer Indicator */}
                      {isIncomplete && (
                        <View style={styles.incompleteAnswerBanner}>
                          <Ionicons name="warning" size={16} color="#D97706" />
                          <Text style={styles.incompleteAnswerText}>
                            Incomplete - See expected answer below
                          </Text>
                        </View>
                      )}
                      
                      {/* Question Text */}
                      {result.questionText && (
                        <View style={styles.questionSection}>
                          <Text style={styles.sectionLabel}>Question:</Text>
                          <Text style={styles.questionTextSmall}>{result.questionText}</Text>
                        </View>
                      )}
                      
                      {/* AI Feedback */}
                      <View style={styles.feedbackSection}>
                        <Text style={styles.sectionLabel}>🤖 AI Feedback:</Text>
                        <Text style={styles.aiFeedbackText}>
                          {result.overallFeedback || result.feedback || "Evaluation completed."}
                        </Text>
                      </View>
                      
                      {/* Student's Answer (extracted from image) */}
                      {(result.studentAnswer || result.studentAnswerEcho) && (
                        <View style={styles.studentAnswerSection}>
                          <Text style={styles.sectionLabel}>📝 Your Answer:</Text>
                          <Text style={styles.studentAnswerText}>{result.studentAnswer || result.studentAnswerEcho}</Text>
                        </View>
                      )}

                      {/* Step Analysis if available - PRIORITIZED for step-wise marks */}
                      {result.stepAnalysis && result.stepAnalysis.length > 0 && (
                        <View style={styles.stepAnalysisSection}>
                          <Text style={styles.sectionLabel}>📊 Step-by-Step Marking:</Text>
                          {result.stepAnalysis.map((step: any, stepIndex: number) => {
                            // Handle both API field names: marks/marksAwarded and maxMarks/maxMarksForStep
                            const stepMarks = step.marksAwarded ?? step.marks ?? 0;
                            const stepMaxMarks = step.maxMarksForStep ?? step.maxMarks;
                            const stepNum = step.step ?? step.stepNumber ?? (stepIndex + 1);
                            const isStepCorrect = step.isCorrect !== false && stepMarks > 0;
                            
                            return (
                              <View key={stepIndex} style={[
                                styles.stepItem,
                                { backgroundColor: isStepCorrect ? '#F0FDF4' : '#FEF2F2' }
                              ]}>
                                <View style={styles.stepHeader}>
                                  <Ionicons 
                                    name={isStepCorrect ? "checkmark-circle" : "close-circle"} 
                                    size={18} 
                                    color={isStepCorrect ? '#22C55E' : '#EF4444'} 
                                  />
                                  <Text style={styles.stepText}>
                                    Step {stepNum}: {step.description || step.feedback || 'Step analysis'}
                                  </Text>
                                </View>
                                <View style={styles.stepMarksContainer}>
                                  <Text style={[styles.stepMarks, { color: isStepCorrect ? '#22C55E' : '#EF4444' }]}>
                                    {stepMarks > 0 ? '+' : ''}{stepMarks}{stepMaxMarks ? `/${stepMaxMarks}` : ''} marks
                                  </Text>
                                </View>
                                {step.feedback && step.feedback !== step.description && (
                                  <Text style={styles.stepFeedback}>{step.feedback}</Text>
                                )}
                              </View>
                            );
                          })}
                        </View>
                      )}
                      
                      {/* Expected Answer - Show prominently if incomplete */}
                      {result.expectedAnswer && (
                        <View style={[
                          styles.expectedAnswerSection,
                          isIncomplete && styles.expectedAnswerHighlighted
                        ]}>
                          <Text style={styles.sectionLabel}>✅ Expected Answer:</Text>
                          <Text style={styles.expectedAnswerText}>{result.expectedAnswer}</Text>
                        </View>
                      )}
                      
                      {/* Improvement Suggestions */}
                      {result.improvementSuggestions && (
                        <View style={styles.improvementSection}>
                          <Text style={styles.improvementLabel}>💡 Suggestions for Improvement:</Text>
                          <Text style={styles.improvementText}>{result.improvementSuggestions}</Text>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            )}

            {/* MCQ Results feedback */}
            {mcqResult && mcqResult.results && mcqResult.results.length > 0 && (
              <View style={styles.feedbackCard}>
                <Text style={styles.feedbackTitle}>MCQ Results</Text>
                {mcqResult.results.slice(0, 15).map((result, index) => (
                  <View key={result.questionId} style={styles.feedbackItem}>
                    <View style={styles.feedbackHeader}>
                      <Text style={styles.feedbackQuestion}>{result.questionId}</Text>
                      <View style={[
                        styles.feedbackScore,
                        { backgroundColor: result.isCorrect ? '#DCFCE7' : '#FEE2E2' }
                      ]}>
                        <Text style={[
                          styles.feedbackScoreText,
                          { color: result.isCorrect ? '#166534' : '#991B1B' }
                        ]}>
                          {result.isCorrect ? '✓' : '✗'}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.feedbackText}>
                      Your answer: {result.selectedOption} | Correct: {result.correctOption}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Action Buttons */}
            <TouchableOpacity style={styles.actionButton} onPress={handleStartNew}>
              <LinearGradient
                colors={["#4F46E5", "#7C3AED"]}
                style={styles.buttonGradient}
              >
                <Ionicons name="refresh" size={24} color="#fff" />
                <Text style={styles.buttonText}>Generate New Paper</Text>
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

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

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

  chatIconButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },

  // My Chat Button
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
    color: "#4F46E5",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 6,
  },

  // Initial Screen
  initialScrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  heroSection: {
    alignItems: "center",
    marginBottom: 24,
  },
  heroIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
    textAlign: "center",
  },
  heroSubtitle: {
    fontSize: 16,
    color: "rgba(255,255,255,0.9)",
    textAlign: "center",
    marginTop: 8,
  },

  // Info Card
  infoCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
  },
  infoText: {
    fontSize: 14,
    color: "#374151",
    marginLeft: 12,
  },

  // Picker / Dropdown
  pickerContainer: {
    marginBottom: 16,
  },
  pickerLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 8,
  },
  dropdownButton: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dropdownText: {
    fontSize: 16,
    color: "#1F2937",
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    width: "100%",
    maxHeight: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 16,
    textAlign: "center",
  },
  modalOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 4,
  },
  modalOptionSelected: {
    backgroundColor: "#EDE9FE",
  },
  modalOptionText: {
    fontSize: 16,
    color: "#374151",
  },
  modalOptionTextSelected: {
    color: "#4F46E5",
    fontWeight: "600",
  },

  // Buttons
  generateButton: {
    marginTop: 16,
    borderRadius: 16,
    overflow: "hidden",
  },
  buttonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 10,
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  noteText: {
    color: "rgba(255,255,255,0.8)",
    textAlign: "center",
    marginTop: 16,
    fontSize: 14,
  },
  errorBanner: {
    marginTop: 12,
    backgroundColor: "#FEE2E2",
    borderColor: "#FCA5A5",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  errorBannerText: {
    color: "#B91C1C",
    fontSize: 14,
    flex: 1,
    marginLeft: 8,
  },

  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
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
  },
  cancelButton: {
    marginTop: 30,
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.5)",
  },
  cancelButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },

  // Exam Overview
  examOverviewContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  successHeader: {
    alignItems: "center",
    marginBottom: 24,
  },
  successIconContainer: {
    marginBottom: 12,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1F2937",
  },
  examId: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
  },

  // Exam Info Card
  examInfoCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  examInfoTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#1F2937",
    textAlign: "center",
  },
  examInfoSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 4,
  },
  examStats: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 20,
  },
  statItem: {
    alignItems: "center",
  },
  statValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1F2937",
    marginTop: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "#6B7280",
  },

  // Parts Card
  partsCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  partsTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 12,
  },
  partRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  partInfo: {
    flex: 1,
  },
  partName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
  partType: {
    fontSize: 12,
    color: "#6B7280",
  },
  partMarks: {
    fontSize: 14,
    color: "#4F46E5",
    fontWeight: "600",
  },

  // Instructions
  instructionsCard: {
    backgroundColor: "#FEF3C7",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#92400E",
    marginBottom: 12,
  },
  instructionRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  instructionBullet: {
    fontSize: 14,
    color: "#92400E",
    marginRight: 8,
  },
  instructionText: {
    flex: 1,
    fontSize: 13,
    color: "#78350F",
  },

  startExamButton: {
    marginTop: 8,
    borderRadius: 16,
    overflow: "hidden",
  },

  // Question Screen
  questionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  partLabel: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#4F46E5",
  },
  partDesc: {
    fontSize: 12,
    color: "#6B7280",
  },
  questionProgress: {
    backgroundColor: "#4F46E5",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  progressText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },

  progressBarContainer: {
    height: 4,
    backgroundColor: "#E5E7EB",
  },
  progressBar: {
    height: "100%",
    backgroundColor: "#4F46E5",
  },

  questionContent: {
    flex: 1,
    padding: 20,
  },
  questionCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  questionTopicBadge: {
    backgroundColor: "#EDE9FE",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  skippedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  skippedBadgeText: {
    fontSize: 12,
    color: "#D97706",
    fontWeight: "600",
  },
  skippedCount: {
    fontSize: 11,
    color: "#F59E0B",
    fontWeight: "500",
    marginTop: 2,
  },
  topicText: {
    fontSize: 12,
    color: "#7C3AED",
    fontWeight: "600",
  },
  questionText: {
    fontSize: 16,
    color: "#1F2937",
    lineHeight: 24,
    marginBottom: 20,
  },

  // Options
  optionsContainer: {
    gap: 12,
  },
  optionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: "#E5E7EB",
  },
  optionButtonSelected: {
    backgroundColor: "#EDE9FE",
    borderColor: "#7C3AED",
  },
  optionRadio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    marginRight: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  optionRadioSelected: {
    borderColor: "#7C3AED",
  },
  optionRadioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#7C3AED",
  },
  optionText: {
    flex: 1,
    fontSize: 15,
    color: "#374151",
  },
  optionTextSelected: {
    color: "#4F46E5",
    fontWeight: "600",
  },

  // Sub-parts
  subPartsContainer: {
    gap: 12,
  },
  subPartCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#7C3AED",
  },
  subPartLabel: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#7C3AED",
    marginBottom: 8,
  },
  subPartText: {
    fontSize: 14,
    color: "#374151",
    lineHeight: 20,
  },

  // Written answer styles
  writtenAnswerContainer: {
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
    padding: 16,
    marginTop: 8,
  },
  writtenAnswerTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 12,
  },
  answerModeTabs: {
    flexDirection: "row",
    backgroundColor: "#E5E7EB",
    borderRadius: 10,
    padding: 4,
    marginBottom: 16,
  },
  answerModeTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
  },
  answerModeTabActive: {
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  answerModeTabText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#6B7280",
  },
  answerModeTabTextActive: {
    color: "#4F46E5",
  },
  writtenAnswerInput: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: "#374151",
    minHeight: 150,
    lineHeight: 22,
  },
  uploadContainer: {
    alignItems: "center",
  },
  uploadButtons: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 12,
  },
  uploadButton: {
    backgroundColor: "#EDE9FE",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    minWidth: 130,
    borderWidth: 2,
    borderColor: "#C4B5FD",
    borderStyle: "dashed",
  },
  uploadButtonText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#4F46E5",
    marginTop: 8,
    textAlign: "center",
  },
  uploadedImageContainer: {
    width: "100%",
    position: "relative",
    marginBottom: 12,
  },
  uploadedImage: {
    width: "100%",
    height: 250,
    borderRadius: 12,
    backgroundColor: "#fff",
  },
  removeImageButton: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "#fff",
    borderRadius: 14,
  },
  uploadHint: {
    fontSize: 12,
    color: "#9CA3AF",
    textAlign: "center",
  },

  // Legacy written answer note (kept for compatibility)
  writtenAnswerNote: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  writtenAnswerText: {
    flex: 1,
    fontSize: 14,
    color: "#6B7280",
  },

  // Navigation
  navigationButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  navButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  navButtonDisabled: {
    opacity: 0.5,
  },
  navButtonText: {
    fontSize: 16,
    color: "#4F46E5",
    fontWeight: "600",
  },
  navButtonTextDisabled: {
    color: "#9CA3AF",
  },
  navButtonSkip: {
    backgroundColor: "#FEF3C7",
    borderWidth: 1,
    borderColor: "#F59E0B",
  },
  navButtonTextSkip: {
    fontSize: 14,
    color: "#D97706",
    fontWeight: "600",
  },
  navButtonPrimary: {
    backgroundColor: "#4F46E5",
  },
  navButtonTextPrimary: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "600",
  },

  // Results
  resultsContainer: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 20,
    alignItems: "center",
  },
  resultIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  passIcon: {
    backgroundColor: "#10B981",
  },
  failIcon: {
    backgroundColor: "#EF4444",
  },
  resultStatus: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 24,
  },

  scoreCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    width: "100%",
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  scoreTitle: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 8,
  },
  scoreValue: {
    fontSize: 48,
    fontWeight: "bold",
    color: "#1F2937",
  },
  percentage: {
    fontSize: 24,
    color: "#4F46E5",
    fontWeight: "600",
    marginTop: 8,
  },
  gradeBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 12,
  },
  gradeText: {
    fontSize: 18,
    color: "#fff",
    fontWeight: "bold",
    textAlign: "center",
  },

  resultDetailsCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    width: "100%",
    marginBottom: 20,
  },
  detailsTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  detailLabel: {
    fontSize: 14,
    color: "#6B7280",
  },
  detailValue: {
    fontSize: 14,
    color: "#1F2937",
    fontWeight: "600",
  },

  // Feedback styles
  feedbackCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    width: "100%",
    marginBottom: 20,
  },
  feedbackTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 16,
  },
  feedbackItem: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  feedbackHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  feedbackQuestion: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#4F46E5",
  },
  feedbackScore: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  feedbackScoreText: {
    fontSize: 12,
    fontWeight: "600",
  },
  feedbackText: {
    fontSize: 13,
    color: "#4B5563",
    lineHeight: 18,
  },
  extractedText: {
    fontSize: 12,
    color: "#6B7280",
    fontStyle: "italic",
    marginTop: 6,
    backgroundColor: "#F3F4F6",
    padding: 8,
    borderRadius: 8,
  },
  moreResults: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 8,
    fontStyle: "italic",
  },

  actionButton: {
    width: "100%",
    borderRadius: 16,
    overflow: "hidden",
  },

  // Question Paper (Board Exam Style) Styles
  questionPaperHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  questionPaperHeaderContent: {
    flex: 1,
  },
  questionPaperTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1F2937",
  },
  questionPaperSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 2,
  },
  questionPaperBadge: {
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  questionPaperBadgeText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#4F46E5",
  },
  questionPaperContent: {
    padding: 16,
  },
  boardInstructionsCard: {
    backgroundColor: "#EEF2FF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: "#4F46E5",
  },
  boardInstructionsHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    gap: 8,
  },
  boardInstructionsTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#4F46E5",
  },
  boardInstructionsText: {
    fontSize: 14,
    color: "#4B5563",
    lineHeight: 22,
  },
  boardPartContainer: {
    marginBottom: 24,
  },
  boardPartHeader: {
    backgroundColor: "#4F46E5",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  boardPartName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 4,
  },
  boardPartMeta: {
    flexDirection: "row",
    gap: 12,
  },
  boardPartType: {
    fontSize: 13,
    color: "rgba(255,255,255,0.8)",
  },
  boardPartMarks: {
    fontSize: 13,
    color: "#FCD34D",
    fontWeight: "600",
  },
  boardPartInstructions: {
    fontSize: 13,
    color: "#6B7280",
    fontStyle: "italic",
    marginBottom: 12,
    paddingLeft: 8,
  },
  boardQuestionCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  boardQuestionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  boardQuestionNumberBadge: {
    backgroundColor: "#4F46E5",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  boardQuestionNumber: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#fff",
  },
  boardMarksBadge: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  boardMarksText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#D97706",
  },
  boardQuestionText: {
    fontSize: 16,
    color: "#1F2937",
    lineHeight: 24,
  },
  boardSubPartsContainer: {
    marginTop: 16,
    paddingLeft: 8,
    borderLeftWidth: 2,
    borderLeftColor: "#E5E7EB",
  },
  boardSubPartItem: {
    flexDirection: "row",
    marginBottom: 10,
  },
  boardSubPartLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4F46E5",
    marginRight: 8,
    width: 24,
  },
  boardSubPartContent: {
    flex: 1,
  },
  boardSubPartText: {
    fontSize: 15,
    color: "#374151",
    lineHeight: 22,
  },
  boardSubPartMarks: {
    fontSize: 12,
    color: "#D97706",
    fontWeight: "500",
    marginTop: 2,
  },
  boardOptionsContainer: {
    marginTop: 12,
    paddingLeft: 12,
  },
  boardOptionText: {
    fontSize: 14,
    color: "#4B5563",
    marginBottom: 6,
  },
  questionPaperFooter: {
    padding: 16,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  uploadAnswerSheetButton: {
    borderRadius: 16,
    overflow: "hidden",
  },

  // Upload Answer Sheet Styles
  uploadHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  backButtonSmall: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  uploadHeaderTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1F2937",
  },
  uploadContent: {
    padding: 20,
    alignItems: "center",
  },
  uploadInstructionsCard: {
    backgroundColor: "#FEF3C7",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    marginBottom: 24,
    width: "100%",
  },
  uploadInstructionsTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#92400E",
    marginTop: 12,
    marginBottom: 8,
  },
  uploadInstructionsText: {
    fontSize: 14,
    color: "#78350F",
    lineHeight: 22,
    textAlign: "center",
  },
  uploadOptionsRow: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 24,
    width: "100%",
  },
  uploadOptionButton: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#E5E7EB",
    borderStyle: "dashed",
  },
  uploadOptionIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  uploadOptionText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    textAlign: "center",
  },
  uploadedImagesContainer: {
    width: "100%",
  },
  uploadedImagesTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 12,
  },
  uploadedImagesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  uploadedImageItem: {
    position: "relative",
    width: 100,
    alignItems: "center",
  },
  uploadedImageThumb: {
    width: 100,
    height: 140,
    borderRadius: 8,
    backgroundColor: "#E5E7EB",
  },
  removeAnswerSheetButton: {
    position: "absolute",
    top: -8,
    right: -8,
    backgroundColor: "#fff",
    borderRadius: 12,
  },
  uploadedImageLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
  },
  emptyUploadState: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyUploadText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#9CA3AF",
    marginTop: 16,
  },
  emptyUploadSubtext: {
    fontSize: 14,
    color: "#D1D5DB",
    marginTop: 4,
  },
  uploadFooter: {
    padding: 16,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  submitAnswerSheetButton: {
    borderRadius: 16,
    overflow: "hidden",
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  
  // Enhanced Subjective Results Styles
  feedbackSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 16,
    textAlign: "center",
  },
  subjectiveResultCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  subjectiveHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  questionBadge: {
    backgroundColor: "#4F46E5",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  questionBadgeText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
  scoreBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  scoreBadgeText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
  questionSection: {
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
    textTransform: "uppercase",
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  questionTextSmall: {
    fontSize: 14,
    color: "#334155",
    lineHeight: 20,
  },
  feedbackSection: {
    marginBottom: 12,
  },
  aiFeedbackText: {
    fontSize: 14,
    color: "#1E293B",
    lineHeight: 22,
    fontWeight: "500",
  },
  studentAnswerSection: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  studentAnswerText: {
    fontSize: 14,
    color: "#334155",
    lineHeight: 20,
  },
  expectedAnswerSection: {
    backgroundColor: "#F0FDF4",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  expectedAnswerText: {
    fontSize: 14,
    color: "#166534",
    lineHeight: 20,
  },
  improvementSection: {
    backgroundColor: "#FEF3C7",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  improvementLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#92400E",
    marginBottom: 8,
  },
  improvementText: {
    fontSize: 14,
    color: "#78350F",
    lineHeight: 20,
  },
  stepAnalysisSection: {
    backgroundColor: "#EEF2FF",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  stepItem: {
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  stepHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  stepText: {
    flex: 1,
    fontSize: 13,
    color: "#374151",
    lineHeight: 18,
    marginLeft: 8,
  },
  stepMarksContainer: {
    marginTop: 6,
    alignItems: 'flex-end',
  },
  stepMarks: {
    fontSize: 13,
    fontWeight: "bold",
  },
  stepFeedback: {
    fontSize: 12,
    color: "#6B7280",
    fontStyle: "italic",
    marginTop: 4,
    marginLeft: 26,
  },
  incompleteAnswerBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF3C7",
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#FCD34D",
  },
  incompleteAnswerText: {
    fontSize: 13,
    color: "#D97706",
    fontWeight: "600",
    marginLeft: 8,
  },
  expectedAnswerHighlighted: {
    backgroundColor: "#FEF3C7",
    borderColor: "#FCD34D",
    borderWidth: 2,
  },
  
  // MCQ Results Styles
  mcqResultCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  mcqResultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    backgroundColor: '#F8FAFC',
  },
  mcqResultLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  mcqStatusIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mcqStatusText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  mcqQNum: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
  },
  mcqMarksText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  mcqResultDetails: {
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  mcqQuestionText: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 20,
    fontWeight: '500',
    marginBottom: 12,
  },
  mcqOptionsContainer: {
    marginBottom: 12,
  },
  mcqOption: {
    padding: 10,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  mcqOptionCorrect: {
    backgroundColor: '#F0FDF4',
    borderColor: '#22C55E',
    borderWidth: 2,
  },
  mcqOptionWrong: {
    backgroundColor: '#FEF2F2',
    borderColor: '#EF4444',
    borderWidth: 2,
  },
  mcqOptionText: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 19,
  },
  mcqOptionTextCorrect: {
    color: '#15803D',
    fontWeight: '600',
  },
  mcqOptionTextWrong: {
    color: '#DC2626',
    fontWeight: '600',
  },
  mcqAnswerSummary: {
    backgroundColor: '#FEF2F2',
    padding: 10,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#EF4444',
  },
  mcqCorrectLabel: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 4,
  },
  mcqCorrectValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#22C55E',
  },
  mcqYourLabel: {
    fontSize: 13,
    color: '#64748B',
  },
  mcqYourValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#EF4444',
  },
  // Evaluating Screen Styles
  evaluatingContainer: {
    flexGrow: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  evaluatingIconContainer: {
    marginBottom: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  evaluatingTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1E293B',
    textAlign: 'center',
    marginBottom: 12,
  },
  evaluatingMessage: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 32,
    paddingHorizontal: 24,
  },
  evaluatingInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 32,
    gap: 12,
  },
  evaluatingInfoText: {
    flex: 1,
    fontSize: 14,
    color: '#4F46E5',
    lineHeight: 20,
  },
  checkStatusButton: {
    width: '100%',
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  checkStatusButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 8,
  },
  checkStatusButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  viewResultsButton: {
    width: '100%',
    marginBottom: 24,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  viewResultsButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 10,
  },
  viewResultsButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  quickSummaryCard: {
    width: '100%',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  quickSummaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 16,
  },
  quickSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  quickSummaryLabel: {
    fontSize: 15,
    color: '#64748B',
  },
  quickSummaryValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
  },
  quickSummaryGrade: {
    fontSize: 20,
    fontWeight: '700',
  },
  cancelWaitingButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  cancelWaitingButtonText: {
    color: '#64748B',
    fontSize: 15,
    fontWeight: '600',
  },
});
