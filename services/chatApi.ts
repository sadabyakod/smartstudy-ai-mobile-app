import { CHAT_ENDPOINTS, getUserFriendlyErrorMessage, fetchWithTimeout, ERROR_MESSAGES } from "../config/api";

export interface SendChatRequest {
  question: string;
  sessionId?: string | null;
}

export interface SendChatResponse {
  status?: string;
  sessionId?: string;
  question?: string;
  reply?: string;
  timestamp?: string;
  error?: string;
  answer?: string;
  followUpQuestion?: string;
}

export interface ChatHistoryItem {
  id?: number | string;
  message: string;
  reply?: string | null;
  timestamp?: string;
}

export interface ChatHistoryResponse {
  status?: string;
  sessionId?: string;
  count?: number;
  messages?: ChatHistoryItem[];
}

export interface MostRecentSessionResponse {
  status?: string;
  sessionId?: string;
}

export async function sendChatMessage(
  payload: SendChatRequest
): Promise<SendChatResponse> {
  try {
    const response = await fetchWithTimeout(CHAT_ENDPOINTS.send, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question: payload.question,
        sessionId: payload.sessionId ?? undefined,
      }),
    });

    if (!response.ok) {
      if (response.status >= 500) {
        return { reply: ERROR_MESSAGES.SERVER_ERROR, error: "server_error" };
      }
      return { reply: ERROR_MESSAGES.UNKNOWN_ERROR, error: "request_failed" };
    }

    const raw = await response.text();
    try {
      return JSON.parse(raw);
    } catch {
      return { reply: raw };
    }
  } catch (error) {
    console.error("Chat API error:", error);
    return { reply: getUserFriendlyErrorMessage(error), error: "connection_error" };
  }
}

export async function fetchMostRecentSessionId(): Promise<string | null> {
  try {
    const response = await fetchWithTimeout(CHAT_ENDPOINTS.mostRecentSession, {}, 10000);
    if (!response.ok) {
      return null;
    }
    const data: MostRecentSessionResponse = await response.json();
    if (data?.status === "success" && data.sessionId) {
      return data.sessionId;
    }
    return data?.sessionId ?? null;
  } catch (error) {
    console.error("Failed to fetch recent session:", error);
    return null;
  }
}

export async function fetchChatHistory(
  sessionId: string,
  limit = 20
): Promise<ChatHistoryItem[]> {
  try {
    const response = await fetchWithTimeout(CHAT_ENDPOINTS.history(sessionId, limit), {}, 15000);
    if (!response.ok) {
      console.error("Failed to fetch chat history:", response.status);
      return [];
    }
    const data: ChatHistoryResponse = await response.json();
    if (Array.isArray(data?.messages)) {
      return data.messages;
    }
    return [];
  } catch (error) {
    console.error("Chat history fetch error:", error);
    return [];
  }
}
