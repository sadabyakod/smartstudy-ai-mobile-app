import { CHAT_ENDPOINTS } from "../config/api";

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
  const response = await fetch(CHAT_ENDPOINTS.send, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      question: payload.question,
      sessionId: payload.sessionId ?? undefined,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to send chat message (${response.status})`);
  }

  const raw = await response.text();
  try {
    return JSON.parse(raw);
  } catch {
    return { reply: raw };
  }
}

export async function fetchMostRecentSessionId(): Promise<string | null> {
  try {
    const response = await fetch(CHAT_ENDPOINTS.mostRecentSession);
    if (!response.ok) {
      return null;
    }
    const data: MostRecentSessionResponse = await response.json();
    if (data?.status === "success" && data.sessionId) {
      return data.sessionId;
    }
    return data?.sessionId ?? null;
  } catch {
    return null;
  }
}

export async function fetchChatHistory(
  sessionId: string,
  limit = 20
): Promise<ChatHistoryItem[]> {
  const response = await fetch(CHAT_ENDPOINTS.history(sessionId, limit));
  if (!response.ok) {
    throw new Error(`Failed to fetch chat history (${response.status})`);
  }
  const data: ChatHistoryResponse = await response.json();
  if (Array.isArray(data?.messages)) {
    return data.messages;
  }
  return [];
}
