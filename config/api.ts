export const API_BASE_URL = "https://app-wlanqwy7vuwmu.azurewebsites.net";

export const CHAT_ENDPOINTS = {
  send: `${API_BASE_URL}/api/chat`,
  history: (sessionId: string, limit = 20) =>
    `${API_BASE_URL}/api/chat/history?sessionId=${encodeURIComponent(sessionId)}&limit=${limit}`,
  mostRecentSession: `${API_BASE_URL}/api/chat/most-recent-session`,
} as const;

export const EXAM_ENDPOINTS = {
  createTemplate: `${API_BASE_URL}/api/exam/templates`,
  startExam: `${API_BASE_URL}/api/exam/start`,
  submitAnswer: (attemptId: number | string) =>
    `${API_BASE_URL}/api/exam/${attemptId}/answer`,
  getSummary: (attemptId: number | string) =>
    `${API_BASE_URL}/api/exam/${attemptId}/summary`,
  getHistory: (studentId: string) =>
    `${API_BASE_URL}/api/exam/history?studentId=${encodeURIComponent(studentId)}`,
} as const;
