import { QUESTION_PAPER_ENDPOINTS, getUserFriendlyErrorMessage, fetchWithTimeout, ERROR_MESSAGES } from "../config/api";

// Types
export interface QuestionPaperFile {
  id: number;
  fileName: string;
  blobUrl: string;
  academicYear?: string;
  paperType?: string;
  fileSize?: number;
  uploadedAt: string;
}

export interface QuestionPaperGroup {
  subject: string;
  grade: string;
  medium?: string;
  state: string;
  paperCount: number;
  latestUpload: string;
  papers: QuestionPaperFile[];
}

export interface QuestionPapersResponse {
  status: string;
  count: number;
  totalPapers: number;
  questionPapers: QuestionPaperGroup[];
}

export interface UploadQuestionPaperRequest {
  file: {
    uri: string;
    name: string;
    type: string;
  };
  subject: string;
  grade: string;
  state: string;
  medium?: string;
  academicYear?: string;
  paperType?: string;
}

export interface UploadQuestionPaperResponse {
  status: string;
  message: string;
  id?: number;
  fileName?: string;
  blobUrl?: string;
  subject?: string;
  grade?: string;
  state?: string;
  academicYear?: string;
}

export interface ListQuestionPapersParams {
  subject?: string;
  grade?: string;
  state?: string;
  year?: string;
  page?: number;
  pageSize?: number;
}

// API Functions

// Get all question papers with optional filters
export async function getQuestionPapers(
  params?: ListQuestionPapersParams
): Promise<QuestionPapersResponse> {
  try {
    const queryParams = new URLSearchParams();
    if (params?.subject) queryParams.append('subject', params.subject);
    if (params?.grade) queryParams.append('grade', params.grade);
    if (params?.state) queryParams.append('state', params.state);
    if (params?.year) queryParams.append('year', params.year);
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.pageSize) queryParams.append('pageSize', params.pageSize.toString());
    
    const url = queryParams.toString() 
      ? `${QUESTION_PAPER_ENDPOINTS.list}?${queryParams}` 
      : QUESTION_PAPER_ENDPOINTS.list;
    
    const response = await fetchWithTimeout(url);
    
    if (!response.ok) {
      if (response.status >= 500) {
        throw new Error(ERROR_MESSAGES.SERVER_ERROR);
      }
      throw new Error(`Failed to fetch question papers (${response.status})`);
    }
    
    return await response.json();
  } catch (error) {
    throw new Error(getUserFriendlyErrorMessage(error));
  }
}

// Upload question paper
export async function uploadQuestionPaper(
  request: UploadQuestionPaperRequest
): Promise<UploadQuestionPaperResponse> {
  try {
    const formData = new FormData();
    
    // Add file
    formData.append('file', {
      uri: request.file.uri,
      name: request.file.name,
      type: request.file.type || 'application/pdf',
    } as any);
    
    // Add required fields
    formData.append('subject', request.subject);
    formData.append('grade', request.grade);
    formData.append('state', request.state);
    
    // Add optional fields
    if (request.medium) formData.append('medium', request.medium);
    if (request.academicYear) formData.append('academicYear', request.academicYear);
    if (request.paperType) formData.append('paperType', request.paperType);
    
    const response = await fetchWithTimeout(QUESTION_PAPER_ENDPOINTS.upload, {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }, 60000); // 60 second timeout for uploads
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.message || `Upload failed (${response.status})`);
    }
    
    return await response.json();
  } catch (error) {
    throw new Error(getUserFriendlyErrorMessage(error));
  }
}

// Get available subjects
export async function getAvailableSubjects(): Promise<string[]> {
  try {
    const response = await fetchWithTimeout(QUESTION_PAPER_ENDPOINTS.subjects);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch subjects (${response.status})`);
    }
    
    const data = await response.json();
    return data.subjects || [];
  } catch (error) {
    throw new Error(getUserFriendlyErrorMessage(error));
  }
}

// Get available grades
export async function getAvailableGrades(): Promise<string[]> {
  try {
    const response = await fetchWithTimeout(QUESTION_PAPER_ENDPOINTS.grades);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch grades (${response.status})`);
    }
    
    const data = await response.json();
    return data.grades || [];
  } catch (error) {
    throw new Error(getUserFriendlyErrorMessage(error));
  }
}

// Get available academic years
export async function getAvailableYears(): Promise<string[]> {
  try {
    const response = await fetchWithTimeout(QUESTION_PAPER_ENDPOINTS.years);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch years (${response.status})`);
    }
    
    const data = await response.json();
    return data.years || [];
  } catch (error) {
    throw new Error(getUserFriendlyErrorMessage(error));
  }
}

// Get question papers by subject
export async function getQuestionPapersBySubject(
  subject: string
): Promise<QuestionPapersResponse> {
  try {
    const response = await fetchWithTimeout(QUESTION_PAPER_ENDPOINTS.bySubject(subject));
    
    if (!response.ok) {
      throw new Error(`Failed to fetch question papers (${response.status})`);
    }
    
    return await response.json();
  } catch (error) {
    throw new Error(getUserFriendlyErrorMessage(error));
  }
}

// Get question papers by grade
export async function getQuestionPapersByGrade(
  grade: string
): Promise<QuestionPapersResponse> {
  try {
    const response = await fetchWithTimeout(QUESTION_PAPER_ENDPOINTS.byGrade(grade));
    
    if (!response.ok) {
      throw new Error(`Failed to fetch question papers (${response.status})`);
    }
    
    return await response.json();
  } catch (error) {
    throw new Error(getUserFriendlyErrorMessage(error));
  }
}

// Download question paper (returns blob URL for viewing)
export async function downloadQuestionPaper(id: number): Promise<Blob> {
  try {
    const response = await fetchWithTimeout(QUESTION_PAPER_ENDPOINTS.download(id), {}, 30000);
    
    if (!response.ok) {
      throw new Error(`Failed to download question paper (${response.status})`);
    }
    
    return await response.blob();
  } catch (error) {
    throw new Error(getUserFriendlyErrorMessage(error));
  }
}

// State/Board options
export const STATE_OPTIONS = [
  'Karnataka',
  'Maharashtra',
  'Tamil Nadu',
  'Kerala',
  'Andhra Pradesh',
  'Telangana',
  'CBSE',
  'ICSE',
];

// Paper type options
export const PAPER_TYPE_OPTIONS = ['Model', 'Previous Year', 'Practice'];

// Generate academic years (last 10 years)
export function getAcademicYears(): string[] {
  const currentYear = new Date().getFullYear();
  return Array.from({ length: 10 }, (_, i) => {
    const year = currentYear - i;
    return `${year}-${(year + 1).toString().slice(2)}`;
  });
}

// Subject options by class
export const SUBJECTS_BY_CLASS: Record<string, string[]> = {
  '12': ['Physics', 'Chemistry', 'Mathematics', 'Biology', 'Kannada', 
         'English', 'Accountancy', 'Business Studies', 'Economics', 
         'Statistics', 'Computer Science', 'History', 'Political Science'],
  '11': ['Physics', 'Chemistry', 'Mathematics', 'Biology', 'Kannada', 
         'English', 'Accountancy', 'Business Studies', 'Economics', 
         'Statistics', 'Computer Science', 'History', 'Political Science'],
  '10': ['English', 'Kannada', 'Hindi', 'Mathematics', 'Science', 
         'Social Science', 'Sanskrit'],
  'default': ['Mathematics', 'Science', 'Social Science', 'English', 
              'Kannada', 'Hindi', 'Sanskrit'],
};

export function getSubjectsForClass(classLevel: string): string[] {
  return SUBJECTS_BY_CLASS[classLevel] || SUBJECTS_BY_CLASS['default'];
}
