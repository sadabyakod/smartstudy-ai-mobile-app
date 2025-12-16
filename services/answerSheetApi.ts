import { API_BASE_URL, getUserFriendlyErrorMessage } from '../config/api';

export interface UploadAnswerSheetParams {
  examId: string;
  studentId: string;
  files: {
    uri: string;
    type: string;
    name: string;
  }[];
}

export interface UploadAnswerSheetResponse {
  writtenSubmissionId: string;
  status: 'PendingEvaluation' | 'OcrProcessing' | 'Evaluating' | 'Completed' | 'Failed';
  message: string;
  blobPaths: string[];
  examId: string;
  studentId: string;
  queuedForProcessing: boolean;
}

export interface SubmissionStatus {
  writtenSubmissionId: string;
  status: 'PendingEvaluation' | 'OcrProcessing' | 'Evaluating' | 'Completed' | 'Failed';
  statusMessage: string;
  submittedAt: string;
  evaluatedAt: string | null;
  isComplete: boolean;
  examId: string;
  studentId: string;
  evaluationResultBlobPath: string | null;
  result?: {
    examId: string;
    studentId: string;
    examTitle: string;
    grandScore: number;
    grandTotalMarks: number;
    percentage: number;
    grade: string;
    passed: boolean;
  };
}

export interface StepAnalysis {
  step: number;
  description: string;
  isCorrect: boolean;
  marksAwarded: number;
  maxMarksForStep: number;
  feedback: string;
}

export interface SubjectiveResult {
  questionId: string;
  questionNumber: number;
  questionText: string;
  earnedMarks: number;
  maxMarks: number;
  isFullyCorrect: boolean;
  expectedAnswer: string;
  studentAnswerEcho: string;
  stepAnalysis: StepAnalysis[];
  overallFeedback: string;
}

export interface MCQResult {
  questionId: string;
  selectedOption: string;
  correctAnswer: string;
  isCorrect: boolean;
  marksAwarded: number;
}

export interface EvaluationResult {
  examId: string;
  studentId: string;
  examTitle: string;
  mcqScore: number;
  mcqTotalMarks: number;
  mcqResults: MCQResult[];
  subjectiveScore: number;
  subjectiveTotalMarks: number;
  subjectiveResults: SubjectiveResult[];
  grandScore: number;
  grandTotalMarks: number;
  percentage: number;
  grade: string;
  passed: boolean;
  evaluatedAt: string;
}

/**
 * Upload answer sheet images/PDF for evaluation
 */
export async function uploadAnswerSheet(
  params: UploadAnswerSheetParams
): Promise<UploadAnswerSheetResponse> {
  try {
    const formData = new FormData();
    formData.append('examId', params.examId);
    formData.append('studentId', params.studentId);

    // Add files to form data
    params.files.forEach((file, index) => {
      formData.append('files', {
        uri: file.uri,
        type: file.type || 'image/jpeg',
        name: file.name || `answer${index + 1}.jpg`,
      } as any);
    });

    const response = await fetch(`${API_BASE_URL}/api/exam/upload-written`, {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `Upload failed with status ${response.status}`);
    }

    return data;
  } catch (error) {
    console.error('Upload answer sheet error:', error);
    throw new Error(getUserFriendlyErrorMessage(error));
  }
}

/**
 * Check the evaluation status of a submitted answer sheet
 */
export async function checkSubmissionStatus(
  submissionId: string
): Promise<SubmissionStatus> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/exam/submission-status/${submissionId}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `Status check failed with status ${response.status}`);
    }

    return data;
  } catch (error) {
    console.error('Check submission status error:', error);
    throw new Error(getUserFriendlyErrorMessage(error));
  }
}

/**
 * Get complete evaluation results by examId and studentId
 */
export async function getEvaluationResults(
  examId: string,
  studentId: string
): Promise<EvaluationResult> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/exam/result/${examId}/${studentId}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `Failed to fetch results with status ${response.status}`);
    }

    return data;
  } catch (error) {
    console.error('Get evaluation results error:', error);
    throw new Error(getUserFriendlyErrorMessage(error));
  }
}

/**
 * Get complete evaluation results directly by submissionId
 * This fetches results from blob storage using the submission ID
 */
export async function getEvaluationResultsBySubmissionId(
  submissionId: string
): Promise<EvaluationResult> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/exam/evaluation-result/${submissionId}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `Failed to fetch results with status ${response.status}`);
    }

    return data;
  } catch (error) {
    console.error('Get evaluation results by submission ID error:', error);
    throw new Error(getUserFriendlyErrorMessage(error));
  }
}

/**
 * Poll submission status until evaluation is complete
 * @param submissionId - The submission ID to poll
 * @param onStatusUpdate - Callback for status updates
 * @param maxAttempts - Maximum polling attempts (default: 60)
 * @param intervalMs - Polling interval in milliseconds (default: 3000)
 * @returns Promise<SubmissionStatus> - Final status
 */
export async function pollEvaluationStatus(
  submissionId: string,
  onStatusUpdate?: (status: SubmissionStatus) => void,
  maxAttempts: number = 60,
  intervalMs: number = 3000
): Promise<SubmissionStatus> {
  let attempts = 0;

  while (attempts < maxAttempts) {
    try {
      const status = await checkSubmissionStatus(submissionId);

      if (onStatusUpdate) {
        onStatusUpdate(status);
      }

      if (status.isComplete || status.status === 'Failed') {
        return status;
      }

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, intervalMs));
      attempts++;
    } catch (error) {
      console.error('Polling error:', error);
      
      // If we've tried multiple times and still failing, throw
      if (attempts > 3) {
        throw error;
      }
      
      // Otherwise, wait and retry
      await new Promise(resolve => setTimeout(resolve, intervalMs));
      attempts++;
    }
  }

  throw new Error('Evaluation timeout: Maximum polling attempts reached');
}

/**
 * Get status message for display
 */
export function getStatusMessage(status: string): string {
  switch (status) {
    case 'PendingEvaluation':
      return '⏳ Your answer sheet is being processed...';
    case 'OcrProcessing':
      return '📄 Extracting text from your answer sheet...';
    case 'Evaluating':
      return '🤖 AI is evaluating your answers...';
    case 'Completed':
      return '✅ Evaluation completed! Your results are ready.';
    case 'Failed':
      return '❌ Evaluation failed. Please contact support.';
    default:
      return 'Processing...';
  }
}

/**
 * Get grade color for display
 */
export function getGradeColor(grade: string): string {
  switch (grade) {
    case 'A+':
    case 'A':
      return '#4caf50'; // Green
    case 'B+':
    case 'B':
      return '#2196f3'; // Blue
    case 'C':
      return '#ff9800'; // Orange
    case 'D':
      return '#ff5722'; // Deep Orange
    case 'F':
      return '#f44336'; // Red
    default:
      return '#757575'; // Grey
  }
}

/**
 * Validate file before upload
 */
export function validateFile(file: { uri: string; type?: string; size?: number; name?: string }): {
  valid: boolean;
  error?: string;
} {
  const maxSize = 10 * 1024 * 1024; // 10MB
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];

  // Check file size
  if (file.size && file.size > maxSize) {
    return {
      valid: false,
      error: `File ${file.name || 'selected'} exceeds maximum size of 10MB`,
    };
  }

  // Check file type
  if (file.type && !allowedTypes.includes(file.type.toLowerCase())) {
    return {
      valid: false,
      error: 'Invalid file type. Allowed: JPG, JPEG, PNG, PDF, WEBP',
    };
  }

  return { valid: true };
}

/**
 * Validate multiple files before upload
 */
export function validateFiles(files: any[]): {
  valid: boolean;
  error?: string;
} {
  const maxFiles = 20;

  if (files.length === 0) {
    return {
      valid: false,
      error: 'Please select at least one answer sheet image',
    };
  }

  if (files.length > maxFiles) {
    return {
      valid: false,
      error: `Maximum ${maxFiles} files allowed`,
    };
  }

  // Validate each file
  for (const file of files) {
    const validation = validateFile(file);
    if (!validation.valid) {
      return validation;
    }
  }

  return { valid: true };
}
