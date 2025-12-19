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
  mergeExamQuestions,
  isEvaluationComplete,
  isEvaluationFailed,
} from "../services/pucExamApi";
import { getEvaluationResultsBySubmissionId } from "../services/answerSheetApi";
import { API_BASE_URL, getUserFriendlyErrorMessage, ERROR_MESSAGES } from "../config/api";
import { NavigationContext } from "../navigation/NavigationContext";

type ScreenState = "initial" | "loading" | "exam" | "question" | "questionPaper" | "uploadAnswers" | "submitting" | "results" | "evaluating";
type AnswerMode = "type" | "upload";

// Helper component for MCQ result item
function McqResultItem({ mcqRes, styles }: { mcqRes: any; styles: any }) {
  const [expanded, setExpanded] = useState(false);
  
  // Handle both API field names: studentAnswer/selectedOption, marks/marksAwarded
  const studentAnswer = mcqRes.studentAnswer || mcqRes.selectedOption || '';
  const marks = mcqRes.marks ?? mcqRes.marksAwarded ?? (mcqRes.isCorrect ? 1 : 0);
  const maxMarks = mcqRes.maxMarks ?? 1;
  
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
          <Text style={styles.mcqQNum}>Q{mcqRes.questionNumber || mcqRes.questionId}</Text>
          <Text style={styles.mcqMarksText}>
            {marks}/{maxMarks} mark{maxMarks > 1 ? 's' : ''}
          </Text>
        </View>
        <Text style={styles.expandIcon}>{expanded ? '▼' : '▶'}</Text>
      </TouchableOpacity>
      
      {expanded && (
        <View style={styles.mcqResultDetails}>
          {mcqRes.questionText && (
            <Text style={styles.mcqQuestionText}>{mcqRes.questionText}</Text>
          )}
          
          {/* Only show answer details when wrong */}
          {!mcqRes.isCorrect && (
            <View style={styles.mcqAnswerSummary}>
              <Text style={styles.mcqYourLabel}>
                📝 Your Answer: <Text style={[styles.mcqYourValue, { color: '#EF4444' }]}>{studentAnswer || 'Not answered'}</Text>
              </Text>
              <Text style={styles.mcqCorrectLabel}>
                ✅ Correct Answer: <Text style={styles.mcqCorrectValue}>{mcqRes.correctAnswer}</Text>
              </Text>
            </View>
          )}
          {mcqRes.isCorrect && (
            <View style={styles.mcqAnswerSummary}>
              <Text style={[styles.mcqCorrectLabel, { color: '#22C55E' }]}>
                ✓ Your answer is correct!
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

export default function PUCExamScreen() {
  const { navigate, goBack, canGoBack, setPendingEvaluation, completedEvaluation, setCompletedEvaluation } = useContext(NavigationContext);
  
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
  const [showMcqResults, setShowMcqResults] = useState(true);
  const [showSubjectiveResults, setShowSubjectiveResults] = useState(true);

  // Check for completed evaluation from navigation (e.g., from LearningHub)
  React.useEffect(() => {
    if (completedEvaluation?.result) {
      console.log('\n═══════════════════════════════════════════════════════════');
      console.log('📊 [PUCExamScreen] Received completedEvaluation from LearningHub!');
      console.log('═══════════════════════════════════════════════════════════');
      console.log('📊 [PUCExamScreen] Result keys:', Object.keys(completedEvaluation.result));
      console.log('📊 [PUCExamScreen] grandScore:', completedEvaluation.result.grandScore);
      console.log('📊 [PUCExamScreen] grandTotalMarks:', completedEvaluation.result.grandTotalMarks);
      console.log('📊 [PUCExamScreen] percentage:', completedEvaluation.result.percentage);
      console.log('📊 [PUCExamScreen] grade:', completedEvaluation.result.grade);
      console.log('📊 [PUCExamScreen] MCQ Results:', completedEvaluation.result.mcqResults?.length || 0);
      console.log('📊 [PUCExamScreen] Subjective Results:', completedEvaluation.result.subjectiveResults?.length || 0);
      if (completedEvaluation.result.subjectiveResults?.length > 0) {
        console.log('📊 [PUCExamScreen] First Subjective Result Sample:');
        console.log(JSON.stringify(completedEvaluation.result.subjectiveResults[0], null, 2));
      }
      console.log('═══════════════════════════════════════════════════════════\n');
      
      // Try to merge question text from generatedExam if available
      let resultWithQuestions = completedEvaluation.result as any;
      if (generatedExam && completedEvaluation.result.examId === generatedExam.examId) {
        console.log('✅ [PUCExamScreen] Merging question text from generatedExam');
        resultWithQuestions = mergeExamQuestions(completedEvaluation.result as ExamResult, generatedExam);
        console.log('✅ [PUCExamScreen] Question text merged! Sample question text:', 
          resultWithQuestions.subjectiveResults?.[0]?.questionText?.substring(0, 50) || 'N/A');
      } else {
        console.warn('⚠️ [PUCExamScreen] Cannot merge - generatedExam not available or ID mismatch');
      }
      
      // Set the exam result from completed evaluation
      setExamResult(resultWithQuestions);
      setScore(completedEvaluation.result.grandScore || (completedEvaluation.result as any).GrandScore || 0);
      setWrittenSubmissionId(completedEvaluation.writtenSubmissionId);
      setShowDetailedResults(true);
      setScreenState("results");
      // Clear the completed evaluation after consuming it
      setCompletedEvaluation(null);
    }
  }, [completedEvaluation, generatedExam]);

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
      console.log('📝 [GENERATE EXAM] Starting exam generation...');
      console.log('📝 [GENERATE EXAM] Subject:', selectedSubject, 'Grade:', selectedGrade);
      setScreenState("loading");
      setErrorMessage(null);
      
      // Use the correct backend schema with recommended defaults
      const exam = await generatePUCExam({
        subject: selectedSubject,
        grade: selectedGrade,
        chapter: "All Chapters",
        difficulty: "Medium",
        examType: "Full Paper",
        useCache: true,
        fastMode: true,
      });
      
      console.log('✅ [GENERATE EXAM] Exam generated successfully!');
      console.log('📝 [GENERATE EXAM] ==================== EXAM DETAILS ====================');
      console.log('📝 [GENERATE EXAM] Exam ID:', exam?.examId);
      console.log('📝 [GENERATE EXAM] Subject:', exam?.subject);
      console.log('📝 [GENERATE EXAM] Grade:', exam?.grade);
      console.log('📝 [GENERATE EXAM] Total Marks:', exam?.totalMarks);
      console.log('📝 [GENERATE EXAM] Duration:', exam?.duration, 'minutes');
      console.log('📝 [GENERATE EXAM] Parts count:', exam?.parts?.length);
      console.log('📝 [GENERATE EXAM] Total Questions:', exam?.questionCount);
      exam?.parts?.forEach((part, idx) => {
        console.log(`📝 [GENERATE EXAM] Part ${idx + 1}: ${part.partName} - ${part.questionType} - ${part.totalQuestions} questions`);
      });
      console.log('📝 [GENERATE EXAM] ================================================');
      
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
      console.log('✅ [GENERATE EXAM] Navigated to exam screen');
    } catch (error: any) {
      console.log('❌ [GENERATE EXAM] Error:', error?.message || error);
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
    console.log('▶️ [START EXAM] User clicked Start Exam');
    console.log('▶️ [START EXAM] Exam ID:', generatedExam?.examId);
    console.log('▶️ [START EXAM] Student ID:', studentId);
    console.log('▶️ [START EXAM] Total Parts:', generatedExam?.parts?.length);
    console.log('▶️ [START EXAM] Total Marks:', generatedExam?.totalMarks);
    console.log('▶️ [START EXAM] Duration:', generatedExam?.duration, 'minutes');
    
    // Validate before starting
    if (!generatedExam || !generatedExam.parts || generatedExam.parts.length === 0) {
      console.log('❌ [START EXAM] No exam data available!');
      console.log('📱 [ALERT] Error: No exam data available. Please generate an exam first.');
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
          console.log('▶️ [START EXAM] Starting from part:', part.partName, '(index', i, ')');
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
      console.log('📱 [ALERT] Error: No questions available in the exam. Please try generating again.');
      Alert.alert("Error", "No questions available in the exam. Please try generating again.");
      setScreenState("initial");
      return;
    }
    
    setCurrentPartIndex(startPartIndex);
    setCurrentQuestionIndex(0);
    setScreenState("question");
    console.log('✅ [START EXAM] Exam started successfully! Now showing questions.');
    console.log('📝 [START EXAM] Current Part:', generatedExam.parts[startPartIndex].partName);
    console.log('📝 [START EXAM] Questions in part:', generatedExam.parts[startPartIndex].questions.length);
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
    console.log('➡️ [NAVIGATION] Moving to next question from Q' + (currentQuestionIndex + 1));
    if (!generatedExam || !generatedExam.parts || !currentPart || !currentPart.questions) return;
    
    const questionsLength = currentPart.questions?.length || 0;
    const partsLength = generatedExam.parts?.length || 0;
    
    if (currentQuestionIndex < questionsLength - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      console.log('➡️ [NAVIGATION] Moved to Q' + (currentQuestionIndex + 2) + ' in same part');
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
    
    console.log(`📱 [ALERT] Submit Exam? Answered ${answeredCount}/${totalQuestions}, Skipped: ${skippedCount}`);
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
    
    console.log('📤 [SUBMIT EXAM] Starting submission...');
    console.log('📤 [SUBMIT EXAM] Exam ID:', generatedExam.examId);
    console.log('📤 [SUBMIT EXAM] Student ID:', studentId);
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
      
      console.log('📤 [SUBMIT EXAM] MCQ answers count:', mcqAnswers.length);
      console.log('📤 [SUBMIT EXAM] MCQ answers:', JSON.stringify(mcqAnswers, null, 2));
      console.log('📤 [SUBMIT EXAM] Written images count:', writtenImageUris.length);
      console.log('📤 [SUBMIT EXAM] Total user answers:', Object.keys(userAnswers).length);
      console.log('📤 [SUBMIT EXAM] Total uploaded images:', Object.keys(uploadedImages).length);
      
      if (mcqAnswers.length === 0 && writtenImageUris.length === 0) {
        console.log('📱 [ALERT] No Answers: Please answer at least one question before submitting.');
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
        console.log('📤 [SUBMIT EXAM] Submitting MCQ answers...');
        setSubmissionStatus("Submitting MCQ answers...");
        const mcqRes = await submitMcqAnswers(generatedExam.examId, studentId, mcqAnswers);
        console.log('✅ [SUBMIT EXAM] MCQ submitted! Score:', mcqRes.score, '/', mcqRes.totalMarks);
        setMcqResult(mcqRes);
        setScore(mcqRes.score);
      }
      
      // Step 3: Upload written answers if any - now async, navigates to evaluating screen
      if (writtenImageUris.length > 0) {
        console.log('📤 [SUBMIT EXAM] Uploading written answers...');
        setSubmissionStatus("Uploading written answers for AI evaluation...");
        
        // Convert mcqAnswers array to Record<string, string> format for the API
        const mcqAnswersRecord: Record<string, string> = {};
        for (const mcq of mcqAnswers) {
          mcqAnswersRecord[mcq.questionId] = mcq.selectedOption;
        }
        console.log('📤 [SUBMIT EXAM] MCQ Answers Record:', JSON.stringify(mcqAnswersRecord));
        
        const uploadResult = await uploadWrittenAnswers(generatedExam.examId, studentId, writtenImageUris, mcqAnswersRecord);
        
        console.log('✅ [SUBMIT EXAM] Written answers uploaded!');
        console.log('📤 [SUBMIT EXAM] Submission ID:', uploadResult.writtenSubmissionId);
        
        // Save submission ID and redirect to evaluating screen for polling
        setWrittenSubmissionId(uploadResult.writtenSubmissionId);
        setSubmissionStatus(uploadResult.message || "✅ Answer sheet uploaded successfully!");
        setScreenState("evaluating");
        console.log('📤 [SUBMIT EXAM] Navigated to evaluating screen, starting polling...');
        
        // Start polling for status
        try {
          const finalStatus = await pollSubmissionStatus(
            uploadResult.writtenSubmissionId,
            (status) => {
              console.log('🔄 [POLLING] Status update:', status.status, '-', status.statusMessage);
              setEvaluationStatus(status);
              setSubmissionStatus(status.statusMessage);
            }
          );
          
          console.log('✅ [POLLING] Evaluation complete! isComplete:', finalStatus.isComplete);
          if (finalStatus.isComplete && finalStatus.result) {
            console.log('✅ [POLLING] Result received! Score:', finalStatus.result.grandScore);
            setExamResult(finalStatus.result);
            setScore(finalStatus.result.grandScore || 0);
            setEvaluationStatus(finalStatus);
          }
        } catch (pollError: any) {
          console.log('⚠️ [POLLING] Polling error:', pollError?.message || pollError);
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
        console.log('📱 [ALERT] Already Submitted (409): Duplicate submission not allowed');
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
                    console.log('📱 [ALERT] Results Not Ready: Your previous submission is still being evaluated.');
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
      
      console.log('📱 [ALERT] Submission Failed:', error?.message || 'Failed to submit exam');
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
    console.log('✍️ [ANSWER] Question', questionId + ':', text.length, 'characters');
    setUserAnswers(prev => ({
      ...prev,
      [questionId]: text,
    }));
  };

  const handlePickImage = async (questionId: string) => {
    console.log('📷 [IMAGE] User picking image for question:', questionId);
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        console.log('⚠️ [IMAGE] Permission denied for gallery access');
        console.log('📱 [ALERT] Permission Required: Please allow access to your photo library.');
        Alert.alert("Permission Required", "Please allow access to your photo library to upload images.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        console.log('✅ [IMAGE] Image selected for question:', questionId);
        console.log('📷 [IMAGE] URI:', result.assets[0].uri.substring(0, 50) + '...');
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
      console.log('❌ [IMAGE] Failed to pick image:', error);
      console.log('📱 [ALERT] Error: Failed to pick image. Please try again.');
      Alert.alert("Error", "Failed to pick image. Please try again.");
    }
  };

  const handleTakePhoto = async (questionId: string) => {
    console.log('📸 [CAMERA] User taking photo for question:', questionId);
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      
      if (!permissionResult.granted) {
        console.log('⚠️ [CAMERA] Permission denied for camera access');
        console.log('📱 [ALERT] Permission Required: Please allow access to your camera.');
        Alert.alert("Permission Required", "Please allow access to your camera to take photos.");
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        console.log('✅ [CAMERA] Photo captured for question:', questionId);
        console.log('📸 [CAMERA] URI:', result.assets[0].uri.substring(0, 50) + '...');
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
      console.log('❌ [CAMERA] Failed to take photo:', error);
      console.log('📱 [ALERT] Error: Failed to take photo. Please try again.');
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
      console.log('📱 [ALERT] Permission Required: Camera roll permissions needed for answer sheet.');
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
      console.log('📱 [ALERT] Permission Required: Camera permissions needed to take photos.');
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
    console.log('📄 [QUESTION PAPER] Showing question paper screen');
    console.log('📄 [QUESTION PAPER] Exam ID:', generatedExam.examId);
    const subjectiveParts = getSubjectiveParts();
    console.log('📄 [QUESTION PAPER] Subjective parts count:', subjectiveParts.length);
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
        console.log('📱 [ALERT] No Images: Please upload at least one photo of your answer sheet.');
        Alert.alert("No Images", "Please upload at least one photo of your answer sheet.");
        return;
      }

      // Set to submitting state
      setScreenState("submitting");
      setSubmissionStatus("Preparing submission...");
      
      try {
        // Upload answer sheet images
        setSubmissionStatus("Uploading answer sheets for AI evaluation...");
        
        // Convert userAnswers to MCQ format for the API
        // userAnswers contains MCQ selections like { "A1": "A", "A2": "B" }
        const mcqAnswersRecord: Record<string, string> = {};
        if (generatedExam) {
          for (const part of generatedExam.parts) {
            for (const question of part.questions) {
              if (isMCQ(question) && userAnswers[question.questionId]) {
                // Extract the option letter from the answer (e.g., "A" from "A) Answer")
                const answer = userAnswers[question.questionId];
                const optionMatch = answer.match(/^([A-D])\)/);
                mcqAnswersRecord[question.questionId] = optionMatch ? optionMatch[1] : answer;
              }
            }
          }
        }
        console.log('📤 [UPLOAD SHEETS] MCQ Answers Record:', JSON.stringify(mcqAnswersRecord));
        console.log('═══════════════════════════════════════════════════════════');
        console.log('📤 [UPLOAD SHEETS] ⚠️ EXAM ID CHECK ⚠️');
        console.log('📤 [UPLOAD SHEETS] Exam ID being sent:', generatedExam.examId);
        console.log('📤 [UPLOAD SHEETS] Student ID:', studentId);
        console.log('📤 [UPLOAD SHEETS] Number of images:', answerSheetImages.length);
        console.log('📤 [UPLOAD SHEETS] This exam ID should match the one from exam generation!');
        console.log('═══════════════════════════════════════════════════════════');
        
        const uploadResult = await uploadWrittenAnswers(generatedExam.examId, studentId, answerSheetImages, mcqAnswersRecord);
        
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
        console.log('📱 [ALERT] ✅ Upload Successful! AI evaluation is in progress.');
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
          console.log('📱 [ALERT] Already Submitted (409): Duplicate submission not allowed');
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
                      console.log('📱 [ALERT] Results Not Ready: Previous submission still being evaluated.');
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
        console.log('📱 [ALERT] Submission Error:', error?.message || 'Failed to submit answer sheets');
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
    const isComplete = evaluationStatus?.isComplete || 
      (evaluationStatus?.status && isEvaluationComplete(evaluationStatus.status));
    
    const handleCheckStatus = async () => {
      if (!writtenSubmissionId) return;
      
      console.log('🔍 [CHECK STATUS] Checking status for submission:', writtenSubmissionId);
      try {
        setSubmissionStatus("Checking status...");
        const status = await checkSubmissionStatus(writtenSubmissionId);
        console.log('🔍 [CHECK STATUS] Status response:', JSON.stringify(status));
        console.log('🔍 [CHECK STATUS] Status code:', status.status, 'isComplete:', status.isComplete);
        setEvaluationStatus(status);
        setSubmissionStatus(status.statusMessage);
        
        // Check if evaluation is complete (status = "2" or "Completed")
        if (status.isComplete || isEvaluationComplete(status.status)) {
          console.log('✅ [CHECK STATUS] Evaluation complete! Fetching full results...');
          try {
            const fullResults = await getEvaluationResultsBySubmissionId(writtenSubmissionId);
            console.log('✅ [CHECK STATUS] Full results received! Score:', fullResults.grandScore);
            // Cast to ExamResult type for compatibility
            setExamResult(fullResults as any);
            setScore(fullResults.grandScore || 0);
            
            // Auto-redirect to results screen when evaluation is complete
            console.log('✅ [CHECK STATUS] Redirecting to results screen...');
            setShowDetailedResults(true);
            setScreenState("results");
          } catch (resultError: any) {
            console.log('⚠️ [CHECK STATUS] Failed to fetch full results:', resultError?.message);
            // Fallback to status.result if available
            if (status.result) {
              console.log('🔄 [CHECK STATUS] Using fallback result from status');
              setExamResult(status.result);
              setScore(status.result.grandScore || 0);
              
              // Auto-redirect to results screen when evaluation is complete
              setShowDetailedResults(true);
              setScreenState("results");
            }
          }
        } else if (isEvaluationFailed(status.status)) {
          // Status "3" = OCR Failed, "4" = Evaluation Failed
          const failureMessage = status.status === "3" 
            ? "OCR failed. Please upload clearer images."
            : "Evaluation failed. Please contact support.";
          setSubmissionStatus(failureMessage);
        } else if (status.result) {
          // For backward compatibility, use result from status if available
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
            {!isComplete && !isEvaluationFailed(evaluationStatus?.status || "0") && (
              <View style={styles.evaluatingInfoCard}>
                <Ionicons name="information-circle" size={24} color="#6366f1" />
                <Text style={styles.evaluatingInfoText}>
                  Status updates every 3 seconds{'\n'}
                  This usually takes 2-5 minutes
                </Text>
              </View>
            )}

            {/* Failed Status Message - Status 3 (OCR Failed) or 4 (Evaluation Failed) */}
            {evaluationStatus?.status && isEvaluationFailed(evaluationStatus.status) && (
              <View style={[styles.evaluatingInfoCard, { backgroundColor: '#FEE2E2' }]}>
                <Ionicons name="alert-circle" size={24} color="#EF4444" />
                <Text style={[styles.evaluatingInfoText, { color: '#DC2626' }]}>
                  {evaluationStatus.status === "3" 
                    ? "OCR failed. Please upload clearer images of your answer sheet."
                    : "Evaluation failed. Please contact support or try again."}
                </Text>
              </View>
            )}

            {/* Check Status Button - Show when not complete and not failed */}
            {!isComplete && !isEvaluationFailed(evaluationStatus?.status || "0") && writtenSubmissionId && (
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

            {/* View Results Button - Only show when complete (status = "2" or "Completed") */}
            {isComplete && (evaluationStatus?.result || examResult) && (
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
                  console.log('📱 [ALERT] Cancel Evaluation? User may go back.');
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

  // Results Screen - show if we have examResult (from LearningHub) or generatedExam (from completing exam)
  if (screenState === "results" && (examResult || generatedExam)) {
    console.log('📊 [RESULTS SCREEN] Showing results');
    console.log('📊 [RESULTS DATA] examResult:', JSON.stringify(examResult, null, 2));
    console.log('📊 [RESULTS DATA] mcqResult:', JSON.stringify(mcqResult, null, 2));
    console.log('📊 [RESULTS DATA] generatedExam:', JSON.stringify(generatedExam, null, 2));
    console.log('📊 [RESULTS DATA] userAnswers:', JSON.stringify(userAnswers, null, 2));
    console.log('📊 [RESULTS DATA] uploadedImages count:', Object.keys(uploadedImages).length);
    
    // Check if we have any actual result data
    const hasResultData = examResult && (
      (examResult.mcqResults && examResult.mcqResults.length > 0) ||
      (examResult.subjectiveResults && examResult.subjectiveResults.length > 0) ||
      examResult.grandScore > 0
    );
    
    // If no result data and no generated exam, show error state
    if (!hasResultData && !generatedExam) {
      return (
        <SafeAreaView style={styles.container}>
          <LinearGradient colors={["#E0EAFC", "#CFDEF3"]} style={styles.gradient}>
            <TouchableOpacity 
              style={styles.myChatButton} 
              onPress={() => navigate("chat")}
            >
              <Ionicons name="chatbubbles" size={20} color="#4F46E5" />
              <Text style={styles.myChatButtonText}>My Chat</Text>
            </TouchableOpacity>

            <ScrollView contentContainerStyle={styles.resultsContainer}>
              <View style={[styles.resultIcon, { backgroundColor: '#F97316' }]}>
                <Ionicons name="hourglass" size={60} color="#fff" />
              </View>

              <Text style={styles.resultStatus}>Evaluation In Progress</Text>

              <View style={styles.scoreCard}>
                <Text style={styles.scoreTitle}>⏳ Please Wait</Text>
                <Text style={{ fontSize: 16, color: '#6B7280', textAlign: 'center', marginTop: 12 }}>
                  Your answers are being evaluated. This usually takes 5-6 minutes.
                </Text>
                <Text style={{ fontSize: 14, color: '#6B7280', textAlign: 'center', marginTop: 8 }}>
                  Please check back from the Learning Hub by tapping "Check Results" again.
                </Text>
              </View>

              <TouchableOpacity style={styles.actionButton} onPress={() => navigate("learningHub")}>
                <LinearGradient
                  colors={["#4F46E5", "#7C3AED"]}
                  style={styles.buttonGradient}
                >
                  <Ionicons name="home" size={24} color="#fff" />
                  <Text style={styles.buttonText}>Back to Learning Hub</Text>
                </LinearGradient>
              </TouchableOpacity>
            </ScrollView>
          </LinearGradient>
        </SafeAreaView>
      );
    }
    
    // Build MCQ results from exam data and userAnswers if not provided by backend
    let mcqResultsArray: any[] = [];
    const hasBackendMcqResults = examResult?.mcqResults && examResult.mcqResults.length > 0;
    
    // Only build MCQ results if we have generatedExam (i.e., completed an exam in this session)
    if (!hasBackendMcqResults && generatedExam && userAnswers && Object.keys(userAnswers).length > 0) {
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
    const totalMaxScore = examResult ? examResult.grandTotalMarks : (generatedExam?.totalMarks || 100);
    const percentage = examResult ? Math.round(examResult.percentage) : (mcqResult ? Math.round(mcqResult.percentage) : Math.round((score / (generatedExam?.totalMarks || 100)) * 100));
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

          <ScrollView 
            contentContainerStyle={styles.resultsContainer}
            showsVerticalScrollIndicator={true}
          >
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
            
            {/* Scroll Indicator */}
            <View style={{ alignItems: 'center', paddingVertical: 8 }}>
              <Ionicons name="chevron-down" size={24} color="#4F46E5" />
              <Text style={{ color: '#4F46E5', fontSize: 12, fontWeight: '600' }}>Scroll for detailed results</Text>
            </View>

            {/* Exam Details */}
            <View style={styles.resultDetailsCard}>
              <Text style={styles.detailsTitle}>📋 Exam Summary</Text>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Subject:</Text>
                <Text style={styles.detailValue}>{generatedExam?.subject || examResult?.examTitle?.split('_').slice(2, -3).join(' ') || 'Mathematics'}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Class:</Text>
                <Text style={styles.detailValue}>{generatedExam?.grade || '2nd PUC'}</Text>
              </View>
              
              {/* Show separate scores when using new API */}
              {examResult && (
                <>
                  {/* MCQ Section */}
                  {(examResult.mcqTotalMarks > 0 || (examResult.mcqResults && examResult.mcqResults.length > 0)) && (
                    <>
                      <View style={[styles.detailRow, { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#E5E7EB' }]}>
                        <Text style={[styles.detailLabel, { fontWeight: '700', color: '#4F46E5' }]}>📊 MCQ Section</Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Score:</Text>
                        <Text style={[styles.detailValue, { color: '#4F46E5', fontWeight: '700' }]}>
                          {examResult.mcqScore}/{examResult.mcqTotalMarks}
                        </Text>
                      </View>
                      {examResult.mcqResults && examResult.mcqResults.length > 0 && (
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Correct Answers:</Text>
                          <Text style={[styles.detailValue, { color: '#22C55E' }]}>
                            {examResult.mcqResults.filter((r: any) => r.isCorrect).length}/{examResult.mcqResults.length}
                          </Text>
                        </View>
                      )}
                    </>
                  )}
                  
                  {/* Subjective Section */}
                  {(examResult.subjectiveTotalMarks > 0 || (examResult.subjectiveResults && examResult.subjectiveResults.length > 0)) && (
                    <>
                      <View style={[styles.detailRow, { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#E5E7EB' }]}>
                        <Text style={[styles.detailLabel, { fontWeight: '700', color: '#7C3AED' }]}>📝 Subjective Section</Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Score:</Text>
                        <Text style={[styles.detailValue, { color: '#7C3AED', fontWeight: '700' }]}>
                          {examResult.subjectiveScore}/{examResult.subjectiveTotalMarks}
                        </Text>
                      </View>
                      {examResult.subjectiveResults && examResult.subjectiveResults.length > 0 && (
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Questions Evaluated:</Text>
                          <Text style={[styles.detailValue, { color: '#7C3AED' }]}>
                            {examResult.subjectiveResults.length}
                          </Text>
                        </View>
                      )}
                    </>
                  )}
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
                <TouchableOpacity 
                  style={styles.sectionToggleHeader}
                  onPress={() => setShowMcqResults(!showMcqResults)}
                >
                  <Text style={styles.feedbackTitle}>📊 MCQ Detailed Results</Text>
                  <Text style={styles.toggleIcon}>{showMcqResults ? '▼' : '▶'}</Text>
                </TouchableOpacity>
                {showMcqResults && (
                  <>
                    <Text style={styles.feedbackSubtitle}>
                      Tap each question to see options and correct answer
                    </Text>
                    {finalMcqResults.map((mcqRes: any, index: number) => (
                      <McqResultItem key={mcqRes.questionId || index} mcqRes={mcqRes} styles={styles} />
                    ))}
                  </>
                )}
              </View>
            )}

            {/* Subjective Feedback (if API result available) */}
            {examResult && examResult.subjectiveResults && examResult.subjectiveResults.length > 0 && (() => {
              // Filter out MCQ-type questions from subjective results
              // MCQs have expectedAnswer like "A) option" or single letter answers
              const isMcqQuestion = (result: any): boolean => {
                const expected = result.expectedAnswer || '';
                // Check if expected answer is a single letter option (A, B, C, D) or starts with option pattern
                if (/^[A-D]\)?(\s|$)/i.test(expected.trim())) return true;
                // Check if questionId suggests MCQ (starts with letter only like "A1", "A2")
                const qId = result.questionId || '';
                if (/^[A-E]\d+$/i.test(qId) && result.maxMarks <= 1) return true;
                // Check if question has options in text (A), (B), etc.
                const qText = result.questionText || '';
                if (/\([A-D]\)/i.test(qText) || /\n[A-D]\)/i.test(qText)) return true;
                return false;
              };
              
              const subjectiveOnlyResults = examResult.subjectiveResults.filter((r: any) => !isMcqQuestion(r));
              
              if (subjectiveOnlyResults.length === 0) return null;
              
              return (
              <View style={styles.feedbackCard}>
                <TouchableOpacity 
                  style={styles.sectionToggleHeader}
                  onPress={() => setShowSubjectiveResults(!showSubjectiveResults)}
                >
                  <Text style={styles.feedbackTitle}>📝 Subjective Evaluation</Text>
                  <Text style={styles.toggleIcon}>{showSubjectiveResults ? '▼' : '▶'}</Text>
                </TouchableOpacity>
                {showSubjectiveResults && (
                  <>
                    <Text style={styles.feedbackSubtitle}>
                      Detailed AI evaluation of your handwritten answers
                    </Text>
                    {subjectiveOnlyResults.map((result: any, index: number) => {
                  console.log(`\n📝 [Subjective Q${index + 1}] Rendering result:`, JSON.stringify(result, null, 2));
                  const scoreEarned = result.earnedMarks ?? result.awardedScore ?? 0;
                  const maxMarks = result.maxMarks ?? result.maxScore ?? 0;
                  const scorePercent = maxMarks > 0 ? (scoreEarned / maxMarks) * 100 : 0;
                  const scoreColor = scorePercent >= 80 ? '#22C55E' : scorePercent >= 60 ? '#F97316' : '#EF4444';
                  const isFullMarks = scorePercent >= 100;
                  const studentAnswer = result.studentAnswerEcho || result.studentAnswer || result.extractedAnswer || '';
                  const modelAnswer = result.expectedAnswer || result.modelAnswer || '';
                  const feedback = result.overallFeedback || result.feedback || '';
                  console.log(`📝 [Q${index + 1}] Extracted values - Score: ${scoreEarned}/${maxMarks}, Student: ${studentAnswer ? 'YES' : 'NO'}, Model: ${modelAnswer ? 'YES' : 'NO'}, Feedback: ${feedback ? 'YES' : 'NO'}`);
                  
                  return (
                    <View key={result.questionId || index} style={styles.subjectiveResultCard}>
                      {/* Question Header with Score */}
                      <View style={styles.subjectiveHeader}>
                        <View style={styles.questionBadge}>
                          <Text style={styles.questionBadgeText}>Q{result.questionNumber || index + 1}</Text>
                        </View>
                        <View style={[styles.scoreBadge, { backgroundColor: scoreColor }]}>
                          <Text style={styles.scoreBadgeText}>{scoreEarned}/{maxMarks} marks</Text>
                        </View>
                      </View>

                      {/* Full marks celebration or needs improvement indicator */}
                      {isFullMarks ? (
                        <View style={[styles.incompleteAnswerBanner, { backgroundColor: '#DCFCE7' }]}>
                          <Ionicons name="checkmark-circle" size={16} color="#22C55E" />
                          <Text style={[styles.incompleteAnswerText, { color: '#166534' }]}>
                            Perfect! Full marks awarded 🎉
                          </Text>
                        </View>
                      ) : scorePercent < 50 && (
                        <View style={styles.incompleteAnswerBanner}>
                          <Ionicons name="alert-circle" size={16} color="#D97706" />
                          <Text style={styles.incompleteAnswerText}>
                            Needs improvement - Review model answer below
                          </Text>
                        </View>
                      )}
                      
                      {/* Question Text */}
                      {result.questionText && (
                        <View style={styles.questionSection}>
                          <Text style={styles.sectionLabel}>📌 Question:</Text>
                          <Text style={styles.questionTextSmall}>{result.questionText}</Text>
                        </View>
                      )}
                      
                      {/* Student's Answer (extracted from image via OCR) */}
                      <View style={styles.studentAnswerSection}>
                        <Text style={styles.sectionLabel}>✏️ Your Answer (from image):</Text>
                        <Text style={styles.studentAnswerText}>
                          {studentAnswer || '[Not answered or answer not detected in uploaded image]'}
                        </Text>
                      </View>
                      
                      {/* AI Feedback */}
                      {feedback && (
                        <View style={styles.feedbackSection}>
                          <Text style={styles.sectionLabel}>🤖 AI Feedback:</Text>
                          <Text style={styles.aiFeedbackText}>{feedback}</Text>
                        </View>
                      )}

                      {/* Step-by-Step Rubric Breakdown */}
                      {result.stepAnalysis && result.stepAnalysis.length > 0 && (
                        <View style={styles.stepAnalysisSection}>
                          <Text style={styles.sectionLabel}>📊 Marking Breakdown:</Text>
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
                      
                      {/* Model/Expected Answer - Show prominently if not full marks */}
                      {modelAnswer && !isFullMarks && (
                        <View style={[
                          styles.expectedAnswerSection,
                          scorePercent < 50 && styles.expectedAnswerHighlighted
                        ]}>
                          <Text style={styles.sectionLabel}>✅ Model Answer:</Text>
                          <Text style={styles.expectedAnswerText}>{modelAnswer}</Text>
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
                  </>
                )}
              </View>
              );
            })()}

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
  sectionToggleHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  toggleIcon: {
    fontSize: 16,
    color: "#6B7280",
  },
  feedbackTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 8,
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
