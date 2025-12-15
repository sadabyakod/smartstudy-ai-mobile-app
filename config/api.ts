export const API_BASE_URL = "https://smartstudy-api-athtbtapcvdjesbe.centralindia-01.azurewebsites.net";
// Local URL: http://192.168.1.77:8080
// Azure URL: https://smartstudy-api-athtbtapcvdjesbe.centralindia-01.azurewebsites.net

// User-friendly error messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: "Unable to connect to the server. Please check your internet connection and try again.",
  SERVER_ERROR: "Our servers are temporarily unavailable. Please try again in a few moments.",
  TIMEOUT_ERROR: "The request is taking too long. Please check your connection and try again.",
  UNKNOWN_ERROR: "Something went wrong. Please try again later.",
  SERVICE_UNAVAILABLE: "This service is currently unavailable. Our team is working on it!",
} as const;

// Helper function to get user-friendly error message
export function getUserFriendlyErrorMessage(error: unknown): string {
  if (error instanceof TypeError && error.message.includes("Network request failed")) {
    return ERROR_MESSAGES.NETWORK_ERROR;
  }
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (message.includes("network") || message.includes("fetch") || message.includes("connection")) {
      return ERROR_MESSAGES.NETWORK_ERROR;
    }
    if (message.includes("timeout") || message.includes("aborted")) {
      return ERROR_MESSAGES.TIMEOUT_ERROR;
    }
    if (message.includes("500") || message.includes("502") || message.includes("503") || message.includes("504")) {
      return ERROR_MESSAGES.SERVER_ERROR;
    }
  }
  return ERROR_MESSAGES.UNKNOWN_ERROR;
}

// Wrapper for fetch with timeout and better error handling
export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = 30000
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(ERROR_MESSAGES.TIMEOUT_ERROR);
    }
    throw error;
  }
}

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
