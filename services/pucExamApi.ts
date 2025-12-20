import { API_BASE_URL, getUserFriendlyErrorMessage, fetchWithTimeout as baseFetchWithTimeout, ERROR_MESSAGES } from "../config/api";

// Types for Smart Exam Generator

export interface GenerateExamRequest {
  subject: string;
  grade: string;
  chapter?: string;
  difficulty?: string;
  examType?: string;
  useCache?: boolean;
  fastMode?: boolean;
}

export interface SubPart {
  partLabel: string;
  questionText: string;
  correctAnswer: string;
}

export interface ExamQuestion {
  questionId: string;
  questionNumber: number;
  questionText: string;
  options: string[];
  correctAnswer: string;
  topic: string;
  subParts?: SubPart[];
}

export interface ExamPart {
  partName: string;
  partDescription: string;
  questionType: string;
  marksPerQuestion: number;
  totalQuestions: number;
  questionsToAnswer: number;
  questions: ExamQuestion[];
}

export interface GeneratedExam {
  examId: string;
  subject: string;
  grade: string;
  chapter: string;
  difficulty: string;
  examType: string;
  totalMarks: number;
  duration: number;
  instructions: string[];
  parts: ExamPart[];
  questionCount: number;
  questions: ExamQuestion[]; // Root-level questions array (usually empty, questions are in parts)
  createdAt: string;
}

// Answer submission types
export interface McqAnswer {
  questionId: string;
  selectedOption: string;
}

export interface McqSubmissionRequest {
  examId: string;
  studentId: string;
  answers: McqAnswer[];
}

export interface McqSubmissionResult {
  mcqSubmissionId: string;
  score: number;
  totalMarks: number;
  percentage: number;
  results: {
    questionId: string;
    selectedOption: string;
    correctOption: string;
    isCorrect: boolean;
    marksAwarded: number;
  }[];
}

export interface WrittenSubmissionResult {
  submissionId: string;  // Backend returns "submissionId" not "writtenSubmissionId"
  examId: string;
  studentId: string;
  status: "processing" | "PendingEvaluation" | "Completed" | "Failed";
  filesUploaded: number;
  mcqScore?: number;
  mcqTotal?: number;
  message: string;
  correlationId?: string;
  // Alias for backward compatibility
  writtenSubmissionId?: string;
}

// Submission status polling types
// Status codes from API: 0=Uploaded, 1=OCR Complete, 2=Evaluation Complete, 3=OCR Failed, 4=Evaluation Failed
export type SubmissionStatus = 
  | "0" | "1" | "2" | "3" | "4"  // Numeric status codes from API
  | "PendingEvaluation"             // Legacy status
  | "OcrProcessing"                 // Legacy status  
  | "Evaluating"                    // Legacy status
  | "Completed"                     // Legacy status (maps to "2")
  | "Failed";                       // Legacy status (maps to "3" or "4")

// Helper to check if evaluation is complete (status = 2 or "Completed")
export function isEvaluationComplete(status: SubmissionStatus): boolean {
  return status === "2" || status === "Completed";
}

// Helper to check if evaluation failed (status = 3, 4, or "Failed")
export function isEvaluationFailed(status: SubmissionStatus): boolean {
  return status === "3" || status === "4" || status === "Failed";
}

export interface SubmissionStatusResponse {
  writtenSubmissionId: string;
  status: SubmissionStatus;
  statusMessage: string;
  submittedAt: string;
  evaluatedAt: string | null;
  isComplete: boolean;
  examId: string;
  studentId: string;
  result: ExamResult | null;
}

export interface McqQuestionResult {
  questionId: string;
  selectedOption: string;
  correctAnswer: string;
  isCorrect: boolean;
  marksAwarded: number;
  // Optional fields for UI display
  questionNumber?: number;
  questionText?: string;
  options?: string[];
}

// Step-by-step analysis for subjective answers (matches API response)
export interface StepAnalysisItem {
  step: number;              // Step number (1-indexed)
  description: string;       // Step description
  isCorrect: boolean;        // Whether this step is correct
  marksAwarded: number;      // Marks awarded for this step (0 or 1)
  maxMarksForStep: number;   // Max marks for step (always 1.0)
  feedback: string;          // Feedback for this step
}

export interface SubjectiveResult {
  questionId: string;
  questionNumber: number;
  questionText: string;
  earnedMarks: number;           // Marks earned for this question
  maxMarks: number;              // Max marks for this question (number of steps)
  isFullyCorrect: boolean;       // True if all steps are correct
  expectedAnswer: string;        // Expected/correct answer
  studentAnswerEcho: string;     // Extracted student answer from OCR
  stepAnalysis: StepAnalysisItem[]; // Step-by-step evaluation
  overallFeedback: string;       // Overall feedback for the answer
}

export interface ExamResult {
  examId: string;
  studentId: string;
  examTitle: string;              // "Subject - Chapter" format
  
  // MCQ section (scaled to 15 marks)
  mcqScore: number;               // MCQ marks earned
  mcqTotalMarks: number;          // MCQ max marks (15)
  mcqResults: McqQuestionResult[]; // Individual MCQ results
  
  // Subjective section (scaled to 85 marks)
  subjectiveScore: number;        // Subjective marks earned
  subjectiveTotalMarks: number;   // Subjective max marks (85)
  subjectiveResults: SubjectiveResult[]; // Individual subjective results
  
  // Overall results
  grandScore: number;             // Total score (mcq + subjective)
  grandTotalMarks: number;        // Total max marks (100)
  percentage: number;             // Score percentage
  grade: string;                  // A+/A/B/C/D/F
  passed: boolean;                // true if percentage >= 35
  evaluatedAt: string;            // Evaluation timestamp
}

// Legacy types for backward compatibility
export interface AnswerSubmission {
  questionId: string;
  questionNumber: number;
  questionText: string;
  correctAnswer: string;
  maxMarks: number;
  textAnswer?: string;
  imageUri?: string; // Local URI for image file
}

export interface AnswerEvaluationResult {
  questionId: string;
  questionNumber: number;
  score: number;
  maxMarks: number;
  feedback: string;
  isCorrect: boolean;
  extractedText?: string; // Text extracted from image by OCR
}

export interface ExamSubmissionResult {
  examId: string;
  totalScore: number;
  totalMaxScore: number;
  percentage: number;
  grade: string;
  questionsAnswered: number;
  totalQuestions: number;
  results: AnswerEvaluationResult[];
  evaluatedAt: string;
}

// Supported subjects for exams
export const PUC_SUBJECTS = [
  "Mathematics",
  "Physics",
  "Chemistry",
  "Biology",
  "Computer Science",
  "Electronics",
];

// Supported grades
export const PUC_GRADES = [
  "Class 12",
  "Class 11",
  "Class 10",
  "Class 9",
  "Class 8",
  "Class 7",
  "Class 6",
];

// Custom error class for API errors
export class ApiError extends Error {
  public statusCode: number;
  public isNetworkError: boolean;
  public isTimeout: boolean;
  public userMessage: string;
  
  constructor(message: string, statusCode: number = 0, isNetworkError: boolean = false, isTimeout: boolean = false) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.isNetworkError = isNetworkError;
    this.isTimeout = isTimeout;
    // Provide user-friendly message based on error type
    if (isNetworkError) {
      this.userMessage = ERROR_MESSAGES.NETWORK_ERROR;
    } else if (isTimeout) {
      this.userMessage = ERROR_MESSAGES.TIMEOUT_ERROR;
    } else if (statusCode >= 500) {
      this.userMessage = ERROR_MESSAGES.SERVER_ERROR;
    } else {
      this.userMessage = message;
    }
  }
}

// Helper to create fetch with timeout - uses centralized fetchWithTimeout from api.ts
async function pucFetchWithTimeout(url: string, options: RequestInit, timeoutMs: number = 30000): Promise<Response> {
  try {
    return await baseFetchWithTimeout(url, options, timeoutMs);
  } catch (error: any) {
    if (error.message?.includes('timeout') || error.message?.includes('aborted')) {
      throw new ApiError(ERROR_MESSAGES.TIMEOUT_ERROR, 0, false, true);
    }
    throw error;
  }
}

/**
 * Generate a Karnataka 2nd PUC Model Question Paper
 * This endpoint uses AI to generate a complete exam paper with all parts
 */
export async function generatePUCExam(
  request: GenerateExamRequest
): Promise<GeneratedExam> {
  try {
    const apiUrl = `${API_BASE_URL}/api/exam-generator/generate-exam`;
    const requestPayload = {
      subject: request.subject,
      grade: request.grade,
      chapter: request.chapter || "All Chapters",
      difficulty: request.difficulty || "Medium",
      examType: request.examType || "Full Paper",
      useCache: request.useCache !== undefined ? request.useCache : true,
      fastMode: request.fastMode !== undefined ? request.fastMode : true
    };
    
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('🚀 [API REQUEST] Generating PUC Exam');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📍 Endpoint:', 'POST', apiUrl);
    console.log('📦 Request Payload:');
    console.log(JSON.stringify(requestPayload, null, 2));
    console.log('⏰ Timeout:', '120 seconds (2 minutes)');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    const response = await pucFetchWithTimeout(
      apiUrl,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestPayload),
      },
      120000 // 2 minutes timeout for exam generation (AI takes time)
    );

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('📥 [API RESPONSE] Received');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📊 Status:', response.status, response.statusText);
    console.log('🔗 URL:', apiUrl);
    console.log('═══════════════════════════════════════════════════════════\n');
    
    if (!response.ok) {
      // Try to get error details from response body
      let errorDetails = '';
      try {
        const errorBody = await response.text();
        errorDetails = errorBody;
        console.log('\n❌❌❌ [API ERROR] Response Error ❌❌❌');
        console.log('Status:', response.status);
        console.log('Response Body:');
        console.log(errorBody);
      } catch (e) {
        console.log('❌ [API ERROR] Could not read response body');
      }
      
      throw new ApiError(ERROR_MESSAGES.SERVER_ERROR, response.status);
    }

    const examData = await response.json();
    
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('📋 [API RESPONSE] Exam Data Received');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('� Response Keys:', Object.keys(examData || {}));
    console.log('📝 examId field:', examData?.examId);
    console.log('📝 exam_id field:', examData?.exam_id);
    console.log('📝 id field:', examData?.id);
    console.log('📝 ExamId field:', examData?.ExamId);
    console.log('📚 Subject:', examData?.subject || 'MISSING');
    console.log('🎓 Grade:', examData?.grade || 'MISSING');
    console.log('📖 Chapter:', examData?.chapter || 'MISSING');
    console.log('⭐ Difficulty:', examData?.difficulty || 'MISSING');
    console.log('📄 Exam Type:', examData?.examType || 'MISSING');
    console.log('💯 Total Marks:', examData?.totalMarks || 'MISSING');
    console.log('⏱️ Duration:', examData?.duration || 'MISSING', 'minutes');
    console.log('🔢 Parts Count:', examData?.parts?.length || 0);
    console.log('📦 Full Response (JSON):');
    console.log(JSON.stringify(examData, null, 2));
    console.log('═══════════════════════════════════════════════════════════\n');
    
    // Normalize examId field - handle different naming conventions from backend
    if (!examData.examId && examData.exam_id) {
      console.log('⚠️ [NORMALIZE] Converting exam_id to examId');
      examData.examId = examData.exam_id;
    }
    if (!examData.examId && examData.id) {
      console.log('⚠️ [NORMALIZE] Converting id to examId');
      examData.examId = examData.id;
    }
    if (!examData.examId && examData.ExamId) {
      console.log('⚠️ [NORMALIZE] Converting ExamId to examId');
      examData.examId = examData.ExamId;
    }
    
    // Validate response has required data
    if (!examData || Object.keys(examData).length === 0) {
      console.error('\n❌❌❌ VALIDATION ERROR ❌❌❌');
      console.error('Backend returned EMPTY response object!');
      console.error('Expected: Exam object with examId, subject, grade, parts, etc.');
      console.error('Received: {}');
      throw new ApiError('Backend returned empty exam data. The backend service may be initializing or encountering an error.', 500);
    }
    
    if (!examData.examId) {
      console.error('\n❌❌❌ VALIDATION ERROR ❌❌❌');
      console.error('Missing examId in response!');
      console.error('Response data:', JSON.stringify(examData, null, 2));
      throw new ApiError('Backend returned invalid exam data (missing examId). Please check backend logs.', 500);
    }
    
    if (!examData.parts || examData.parts.length === 0) {
      console.error('\n❌❌❌ VALIDATION ERROR ❌❌❌');
      console.error('Missing or empty parts array in response!');
      console.error('Parts value:', examData.parts);
      throw new ApiError('Backend returned exam without questions. Please check backend configuration.', 500);
    }
    
    console.log('\n✅✅✅ SUCCESS ✅✅✅');
    console.log('Exam data validated successfully!');
    console.log('Exam ID:', examData.examId);
    console.log('Parts:', examData.parts.length);
    
    // Backend already returns continuous question numbers (1-9), but normalize for safety
    try {
      examData = normalizeQuestionNumbers(examData);
      console.log('🔢 Question numbers normalized to be continuous across all sections');
    } catch (normalizeError) {
      console.warn('⚠️ Question number normalization skipped:', normalizeError);
      // Continue with original exam data if normalization fails
    }
    
    console.log('═══════════════════════════════════════════════════════════\n');
    return examData;
  } catch (error: any) {
    if (error instanceof ApiError) {
      throw error;
    }
    
    if (error.message?.includes('Network request failed') || 
        error.message?.includes('Failed to fetch') ||
        error.message?.includes('Unable to resolve host')) {
      throw new ApiError(ERROR_MESSAGES.NETWORK_ERROR, 0, true);
    }
    
    throw new ApiError(getUserFriendlyErrorMessage(error));
  }
}

/**
 * Normalize question numbers to be continuous across all parts
 * Instead of resetting per section (Part A: 1-5, Part B: 1-3, Part C: 1-2),
 * questions will be numbered continuously (1, 2, 3, 4, 5, 6, 7, 8, 9, 10, ...)
 */
export function normalizeQuestionNumbers(exam: GeneratedExam): GeneratedExam {
  try {
    let globalQuestionNumber = 1;
    
    const normalizedParts = exam.parts.map(part => ({
      ...part,
      questions: (part.questions || []).map(question => ({
        ...question,
        questionNumber: globalQuestionNumber++,
      })),
    }));
    
    return {
      ...exam,
      parts: normalizedParts,
      questions: exam.questions || [], // Preserve root-level questions array (usually empty)
      questionCount: globalQuestionNumber - 1, // Update total question count
    };
  } catch (error) {
    console.error('Error normalizing question numbers:', error);
    // Return original exam if normalization fails
    return exam;
  }
}

// Helper to check if a question is MCQ
export function isMCQ(question: ExamQuestion): boolean {
  return question.options !== null && question.options !== undefined && question.options.length > 0;
}

// Helper to check if a question has sub-parts
export function hasSubParts(question: ExamQuestion): boolean {
  return question.subParts !== null && question.subParts !== undefined && question.subParts.length > 0;
}

// Format duration in minutes to hours and minutes string
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0 && mins > 0) {
    return `${hours}h ${mins}m`;
  } else if (hours > 0) {
    return `${hours}h`;
  }
  return `${mins}m`;
}

/**
 * Submit exam answers for AI evaluation
 * Supports both text answers and image uploads of handwritten answers
 */
export async function submitExamAnswers(
  examId: string,
  answers: AnswerSubmission[]
): Promise<ExamSubmissionResult> {
  try {
    const formData = new FormData();
    formData.append("examId", examId);
    
    for (let i = 0; i < answers.length; i++) {
      const answer = answers[i];
      formData.append(`answers[${i}].questionId`, answer.questionId);
      formData.append(`answers[${i}].questionNumber`, answer.questionNumber.toString());
      formData.append(`answers[${i}].questionText`, answer.questionText);
      formData.append(`answers[${i}].correctAnswer`, answer.correctAnswer);
      formData.append(`answers[${i}].maxMarks`, answer.maxMarks.toString());
      
      if (answer.textAnswer) {
        formData.append(`answers[${i}].textAnswer`, answer.textAnswer);
      }
      
      if (answer.imageUri) {
        const filename = answer.imageUri.split('/').pop() || `answer_${answer.questionId}.jpg`;
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';
        
        formData.append(`answers[${i}].imageFile`, {
          uri: answer.imageUri,
          name: filename,
          type: type,
        } as any);
      }
    }
    
    const response = await pucFetchWithTimeout(`${API_BASE_URL}/api/exam/submit`, {
      method: "POST",
      body: formData,
    }, 60000);

    if (!response.ok) {
      throw new ApiError(ERROR_MESSAGES.SERVER_ERROR, response.status);
    }

    return await response.json();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(getUserFriendlyErrorMessage(error));
  }
}

/**
 * Get grade color based on grade string
 */
export function getGradeColor(grade: string): string {
  switch (grade) {
    case 'A+':
    case 'A':
      return '#22C55E'; // green
    case 'B+':
    case 'B':
      return '#3B82F6'; // blue
    case 'C':
      return '#F97316'; // orange
    case 'D':
      return '#EA580C'; // deep orange
    default:
      return '#EF4444'; // red
  }
}

/**
 * Get grade description
 */
export function getGradeDescription(grade: string): string {
  switch (grade) {
    case 'A+': return 'Outstanding!';
    case 'A': return 'Excellent!';
    case 'B+': return 'Very Good';
    case 'B': return 'Good';
    case 'C': return 'Average';
    case 'D': return 'Below Average';
    default: return 'Needs Improvement';
  }
}

/**
 * Submit MCQ answers for instant evaluation
 */
export async function submitMcqAnswers(
  examId: string,
  studentId: string,
  answers: McqAnswer[]
): Promise<McqSubmissionResult> {
  try {
    const response = await pucFetchWithTimeout(
      `${API_BASE_URL}/api/exam/submit-mcq`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          examId,
          studentId,
          answers,
        }),
      },
      30000
    );

    if (!response.ok) {
      throw new ApiError(ERROR_MESSAGES.SERVER_ERROR, response.status);
    }

    return await response.json();
  } catch (error: any) {
    if (error instanceof ApiError) {
      throw error;
    }
    
    throw new ApiError(getUserFriendlyErrorMessage(error), 0, 
      error.message?.includes('Network') || error.message?.includes('fetch'));
  }
}

/**
 * Upload written/subjective answers for AI evaluation
 * Supports image uploads of handwritten answers
 * @param examId - The exam ID
 * @param studentId - The student ID
 * @param imageUris - Array of image URIs to upload
 * @param mcqAnswers - Optional MCQ answers object (e.g., {"A1": "B", "A2": "C"})
 */
export async function uploadWrittenAnswers(
  examId: string,
  studentId: string,
  imageUris: string[],
  mcqAnswers?: Record<string, string>
): Promise<WrittenSubmissionResult> {
  try {
    console.log('📤 [UPLOAD] Starting upload...');
    console.log('📤 [UPLOAD] ExamId:', examId);
    console.log('📤 [UPLOAD] StudentId:', studentId);
    console.log('📤 [UPLOAD] Image count:', imageUris.length);
    console.log('📤 [UPLOAD] MCQ Answers:', mcqAnswers ? Object.keys(mcqAnswers).length : 0);
    
    const formData = new FormData();
    formData.append("examId", examId);
    formData.append("studentId", studentId);
    
    // FIX: Convert mcqAnswers from Record<string, string> to array format expected by API
    // API expects: [{"questionId": "A1", "selectedOption": "B"}, ...]
    // Mobile sends: {"A1": "B", "A2": "C"}
    if (mcqAnswers && Object.keys(mcqAnswers).length > 0) {
      const mcqAnswersArray = Object.entries(mcqAnswers).map(([questionId, selectedOption]) => ({
        questionId,
        selectedOption
      }));
      formData.append("mcqAnswers", JSON.stringify(mcqAnswersArray));
      console.log('📤 [UPLOAD] MCQ Answers JSON:', JSON.stringify(mcqAnswersArray));
    }
    
    for (let i = 0; i < imageUris.length; i++) {
      const uri = imageUris[i];
      console.log('📤 [UPLOAD] Processing image', i + 1, ':', uri.substring(0, 50) + '...');
      
      // Get filename from URI
      const uriParts = uri.split('/');
      const originalFilename = uriParts[uriParts.length - 1] || `answer_sheet_${i + 1}.jpg`;
      
      // Determine file extension and MIME type
      const extensionMatch = originalFilename.match(/\.(\w+)$/);
      const extension = extensionMatch ? extensionMatch[1].toLowerCase() : 'jpg';
      
      // Map extension to proper MIME type
      const mimeTypes: Record<string, string> = {
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'webp': 'image/webp',
        'pdf': 'application/pdf',
      };
      const mimeType = mimeTypes[extension] || 'image/jpeg';
      
      // Create proper filename with extension
      const filename = originalFilename.includes('.') 
        ? originalFilename 
        : `answer_sheet_${i + 1}.${extension}`;
      
      console.log('📤 [UPLOAD] File:', filename, 'Type:', mimeType);
      
      // For React Native, append file object directly
      formData.append("files", {
        uri: uri,
        name: filename,
        type: mimeType,
      } as any);
    }
    
    // FIX: Correct endpoint - /api/exam/upload-written (NOT /api/exam-submission/upload-written)
    const uploadUrl = `${API_BASE_URL}/api/exam/upload-written`;
    console.log('📤 [UPLOAD] Sending request to:', uploadUrl);
    
    const response = await pucFetchWithTimeout(
      uploadUrl,
      {
        method: "POST",
        body: formData,
        // Don't set Content-Type header - let fetch set it with boundary for multipart/form-data
      },
      60000 // 60 seconds timeout for file uploads
    );

    console.log('📤 [UPLOAD] Response status:', response.status);

    if (!response.ok) {
      // Try to get error details
      let errorDetails = '';
      try {
        const errorBody = await response.text();
        console.log('📤 [UPLOAD] Error response:', errorBody);
        errorDetails = errorBody;
      } catch {}
      
      // Handle specific error codes
      if (response.status === 409) {
        throw new ApiError(
          'You have already submitted answers for this exam. Duplicate submissions are not allowed.',
          409,
          false,
          false
        );
      }
      if (response.status === 400) {
        let errorMessage = 'Invalid file. Please check file type (jpg, jpeg, png, webp, pdf) and size (max 10MB per file, max 20 files).';
        try {
          const errorJson = JSON.parse(errorDetails);
          if (errorJson?.message || errorJson?.error) {
            errorMessage = errorJson.message || errorJson.error;
          }
        } catch {}
        throw new ApiError(errorMessage, 400);
      }
      if (response.status === 404) {
        throw new ApiError('Exam not found. Please generate a new exam and try again.', 404);
      }
      throw new ApiError(`Upload failed: ${errorDetails || ERROR_MESSAGES.SERVER_ERROR}`, response.status);
    }

    const result = await response.json();
    console.log('\n========================================');
    console.log('✅ [UPLOAD] Written Answer Sheet Uploaded Successfully');
    console.log('📋 Submission ID:', result.submissionId);
    console.log('📚 Exam ID:', result.examId || examId);
    console.log('👤 Student ID:', result.studentId || studentId);
    console.log('📁 Files Uploaded:', result.filesUploaded);
    console.log('📝 MCQ Score:', result.mcqScore, '/', result.mcqTotal);
    console.log('📨 Status:', result.status);
    console.log('💬 Message:', result.message);
    console.log('⏰ Timestamp:', new Date().toISOString());
    console.log('========================================\n');
    
    // Add writtenSubmissionId alias for backward compatibility
    result.writtenSubmissionId = result.submissionId;
    
    return result;
  } catch (error: any) {
    console.log('❌ [UPLOAD] Error:', error?.message || error);
    if (error instanceof ApiError) {
      throw error;
    }
    
    throw new ApiError(getUserFriendlyErrorMessage(error), 0,
      error.message?.includes('Network') || error.message?.includes('fetch'));
  }
}
/**
 * Get full exam results including MCQ and subjective scores
 */
export async function getExamResults(
  examId: string,
  studentId: string
): Promise<ExamResult> {
  try {
    console.log('\n🔍 [GET RESULTS] Fetching exam results...');
    console.log('📚 Exam ID:', examId);
    console.log('👤 Student ID:', studentId);
    
    const response = await pucFetchWithTimeout(
      `${API_BASE_URL}/api/exam/result/${examId}/${studentId}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      },
      30000
    );

    if (!response.ok) {
      console.log('❌ [GET RESULTS] Failed with status:', response.status);
      throw new ApiError(
        "Results are not available yet. Please wait a moment and try again.",
        response.status
      );
    }

    const results: ExamResult = await response.json();
    console.log('✅ [GET RESULTS] Results retrieved successfully');
    console.log('   - Exam Title:', results.examTitle);
    console.log('   - MCQ Score:', results.mcqScore, '/', results.mcqTotalMarks);
    console.log('   - MCQ Questions:', results.mcqResults?.length || 0);
    console.log('   - Subjective Score:', results.subjectiveScore, '/', results.subjectiveTotalMarks);
    console.log('   - Subjective Questions:', results.subjectiveResults?.length || 0);
    console.log('   - Grand Score:', results.grandScore, '/', results.grandTotalMarks);
    console.log('   - Percentage:', results.percentage, '%');
    console.log('   - Grade:', results.grade, '| Passed:', results.passed);
    
    return results;
  } catch (error: any) {
    if (error instanceof ApiError) {
      throw error;
    }
    
    throw new ApiError(getUserFriendlyErrorMessage(error), 0,
      error.message?.includes('Network') || error.message?.includes('fetch'));
  }
}

/**
 * Merge exam question text into evaluation results
 * Call this with the GeneratedExam object to populate question text
 */
export function mergeExamQuestions(results: ExamResult, exam: GeneratedExam): ExamResult {
  // Create a map of questionId to question text
  const questionMap = new Map<string, string>();
  exam.parts.forEach(part => {
    part.questions.forEach(q => {
      questionMap.set(q.questionId, q.questionText);
    });
  });
  
  // Merge question text into results
  return {
    ...results,
    subjectiveResults: results.subjectiveResults?.map(result => ({
      ...result,
      questionText: questionMap.get(result.questionId) || result.questionText || ''
    })) || [],
    mcqResults: results.mcqResults?.map(result => ({
      ...result,
      questionText: questionMap.get(result.questionId) || result.questionText || ''
    })) || []
  };
}

/**
 * Check the status of a written submission evaluation
 * Use this to poll for evaluation progress and get results when complete
 * 
 * @param writtenSubmissionId The ID returned when answer sheet was uploaded
 * @returns Status information, includes full results when isComplete is true
 */
export async function checkSubmissionStatus(
  writtenSubmissionId: string
): Promise<SubmissionStatusResponse> {
  try {
    console.log('🔍 [STATUS CHECK] Checking submission status...');
    console.log('📋 Submission ID:', writtenSubmissionId);
    console.log('⏰ Timestamp:', new Date().toISOString());
    
    const response = await pucFetchWithTimeout(
      `${API_BASE_URL}/api/exam/submission-status/${writtenSubmissionId}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      },
      30000
    );

    if (!response.ok) {
      console.log('❌ [STATUS CHECK] Failed with status:', response.status);
      if (response.status === 404) {
        throw new ApiError(
          'Submission not found. Please check and try again.',
          404
        );
      }
      throw new ApiError(ERROR_MESSAGES.SERVER_ERROR, response.status);
    }

    const statusData = await response.json();
    console.log('✅ [STATUS CHECK] Response received:');
    console.log('   - Status:', statusData.status);
    console.log('   - Is Complete:', statusData.isComplete);
    console.log('   - Message:', statusData.message || 'N/A');
    return statusData;
  } catch (error: any) {
    if (error instanceof ApiError) {
      throw error;
    }
    
    throw new ApiError(getUserFriendlyErrorMessage(error), 0,
      error.message?.includes('Network') || error.message?.includes('fetch'));
  }
}

/**
 * Poll for submission status until evaluation is complete
 * Automatically checks every 5 seconds for up to 10 minutes
 * 
 * @param writtenSubmissionId The ID returned when answer sheet was uploaded
 * @param onStatusUpdate Callback function called on each status update
 * @param pollInterval Interval in milliseconds (default: 5000 = 5 seconds)
 * @param maxAttempts Maximum number of polling attempts (default: 120 = 10 minutes)
 * @returns Promise that resolves when evaluation is complete with full results
 */
export async function pollSubmissionStatus(
  writtenSubmissionId: string,
  onStatusUpdate: (status: SubmissionStatusResponse) => void,
  pollInterval: number = 3000, // Poll every 3 seconds (updated from 5s)
  maxAttempts: number = 100 // 100 attempts × 3s = 5 minutes max (updated from 10 min)
): Promise<SubmissionStatusResponse> {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    
    const poll = async () => {
      try {
        attempts++;
        console.log('\n🔄 [POLLING] Attempt', attempts, 'of', maxAttempts);
        console.log('📋 Submission ID:', writtenSubmissionId);
        
        const statusData = await checkSubmissionStatus(writtenSubmissionId);
        
        console.log('📊 [POLLING] Current Status:', statusData.status);
        console.log('⏳ [POLLING] Is Complete:', statusData.isComplete);
        
        // Call the status update callback
        onStatusUpdate(statusData);
        
        // Check if evaluation is complete
        if (statusData.isComplete) {
          console.log('\n========================================');
          console.log('✅ [POLLING] Evaluation Complete!');
          console.log('📋 Submission ID:', writtenSubmissionId);
          console.log('⏰ Total Attempts:', attempts);
          console.log('⏱️  Total Time:', (attempts * pollInterval / 1000).toFixed(1), 'seconds');
          console.log('========================================\n');
          clearInterval(pollIntervalId);
          resolve(statusData);
          return;
        }
        
        // Check if max attempts reached
        if (attempts >= maxAttempts) {
          clearInterval(pollIntervalId);
          reject(new ApiError(
            'Evaluation is taking longer than expected. Please check back later.',
            0,
            false,
            true
          ));
          return;
        }
        
      } catch (error) {
        clearInterval(pollIntervalId);
        reject(error);
      }
    };
    
    // Start polling immediately
    poll();
    
    // Then poll at regular intervals
    const pollIntervalId = setInterval(poll, pollInterval);
  });
}

/**
 * Generate a unique student ID for the current device/session
 */
export function generateStudentId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 8);
  return `STU-${timestamp}-${randomPart}`.toUpperCase();
}
