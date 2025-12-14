import { API_BASE_URL, SYLLABUS_ENDPOINTS, getUserFriendlyErrorMessage, fetchWithTimeout, ERROR_MESSAGES } from "../config/api";

// Types
export interface SyllabusFile {
  id?: number;
  fileName: string;
  blobUrl?: string;
  subject: string;
  grade: string;
  medium?: string;
  uploadedAt?: string;
  totalChunks?: number;
  size?: number;
}

export interface TextbookFile {
  fileName: string;
  size: number;
}

export interface SubjectTextbook {
  subject: string;
  fileCount: number;
  files: TextbookFile[];
}

export interface TextbooksResponse {
  success: boolean;
  message: string;
  totalTextbooks: number;
  subjects: SubjectTextbook[];
  timestamp: string;
}

export interface UploadSyllabusRequest {
  file: {
    uri: string;
    name: string;
    type: string;
  };
  medium: string;
  className: string;
  subject: string;
}

export interface UploadSyllabusResponse {
  status: string;
  message: string;
  fileId?: number;
  fileName?: string;
  blobUrl?: string;
}

export interface SubjectSyllabus {
  subject: string;
  grade: string;
  medium: string;
  fileCount: number;
  latestUpload: string;
  files: SyllabusFile[];
}

export interface SubjectInfo {
  subject: string;
  fileCount: number;
  latestUpload: string;
}

export interface GradeInfo {
  grade: string;
  subjectCount: number;
  fileCount: number;
}

// Helper to handle API responses
async function handleResponse<T>(response: Response, errorMessage: string): Promise<T> {
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Syllabus service is not available yet. Please try again later.');
    }
    throw new Error(`${errorMessage} (${response.status})`);
  }
  
  const text = await response.text();
  if (!text) {
    throw new Error('Empty response from server');
  }
  
  try {
    return JSON.parse(text);
  } catch {
    throw new Error('Invalid response from server');
  }
}

// Get all syllabi grouped by subject
export async function getAvailableSyllabi(
  grade?: string,
  medium?: string
): Promise<SubjectSyllabus[]> {
  const params = new URLSearchParams();
  if (grade) params.append('grade', grade);
  if (medium) params.append('medium', medium);
  
  const url = `${API_BASE_URL}/api/file/syllabus${params.toString() ? '?' + params : ''}`;
  const response = await fetch(url);
  const data = await handleResponse<{ status: string; syllabi: SubjectSyllabus[]; message?: string }>(
    response, 
    'Failed to fetch syllabi'
  );
  
  if (data.status === 'success') {
    return data.syllabi;
  }
  throw new Error(data.message || 'Failed to fetch syllabi');
}

// Get subjects for a grade
export async function getSubjectsForGrade(
  grade?: string,
  medium?: string
): Promise<SubjectInfo[]> {
  const params = new URLSearchParams();
  if (grade) params.append('grade', grade);
  if (medium) params.append('medium', medium);
  
  const url = `${API_BASE_URL}/api/file/syllabus/subjects?${params}`;
  const response = await fetch(url);
  const data = await handleResponse<{ status: string; subjects: SubjectInfo[]; message?: string }>(
    response,
    'Failed to fetch subjects'
  );
  
  if (data.status === 'success') {
    return data.subjects;
  }
  throw new Error(data.message || 'Failed to fetch subjects');
}

// Get files for a subject
export async function getSyllabusForSubject(
  subject: string,
  grade?: string,
  medium?: string
): Promise<SyllabusFile[]> {
  const params = new URLSearchParams();
  if (grade) params.append('grade', grade);
  if (medium) params.append('medium', medium);
  
  const url = `${API_BASE_URL}/api/file/syllabus/${encodeURIComponent(subject)}?${params}`;
  const response = await fetch(url);
  const data = await handleResponse<{ status: string; files: SyllabusFile[]; message?: string }>(
    response,
    'Failed to fetch syllabus files'
  );
  
  if (data.status === 'success') {
    return data.files;
  }
  throw new Error(data.message || 'Failed to fetch syllabus files');
}

// Get available grades
export async function getAvailableGrades(medium?: string): Promise<GradeInfo[]> {
  const params = medium ? `?medium=${encodeURIComponent(medium)}` : '';
  const url = `${API_BASE_URL}/api/file/syllabus/grades${params}`;
  const response = await fetch(url);
  const data = await handleResponse<{ status: string; grades: GradeInfo[]; message?: string }>(
    response,
    'Failed to fetch grades'
  );
  
  if (data.status === 'success') {
    return data.grades;
  }
  throw new Error(data.message || 'Failed to fetch grades');
}

// Get download URL for specific file
export async function getDownloadUrl(fileId: number): Promise<{
  fileName: string;
  downloadUrl: string;
  subject: string;
  grade: string;
}> {
  const url = `${API_BASE_URL}/api/file/syllabus/download/${fileId}`;
  const response = await fetch(url);
  const data = await handleResponse<{ 
    status: string; 
    fileName: string; 
    downloadUrl: string; 
    subject: string; 
    grade: string;
    message?: string;
  }>(response, 'Failed to get download URL');
  
  if (data.status === 'success') {
    return data;
  }
  throw new Error(data.message || 'Failed to get download URL');
}

// Upload syllabus PDF
export async function uploadSyllabus(
  request: UploadSyllabusRequest
): Promise<UploadSyllabusResponse> {
  try {
    const formData = new FormData();
    
    // Add file
    formData.append('file', {
      uri: request.file.uri,
      name: request.file.name,
      type: request.file.type || 'application/pdf',
    } as any);
    
    // Add metadata
    formData.append('medium', request.medium);
    formData.append('className', request.className);
    formData.append('subject', request.subject);
    
    const response = await fetchWithTimeout(SYLLABUS_ENDPOINTS.upload, {
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
    console.error('Upload syllabus error:', error);
    throw new Error(getUserFriendlyErrorMessage(error));
  }
}

// Get all textbooks from blob storage
export async function getTextbooks(): Promise<TextbooksResponse> {
  try {
    const response = await fetchWithTimeout(SYLLABUS_ENDPOINTS.listTextbooks);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch textbooks (${response.status})`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Get textbooks error:', error);
    throw new Error(getUserFriendlyErrorMessage(error));
  }
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

// Medium options
export const MEDIUM_OPTIONS = ['English', 'Kannada'];

// Class options
export const CLASS_OPTIONS = ['6', '7', '8', '9', '10', '11', '12'];
