import { API_BASE_URL, getUserFriendlyErrorMessage, fetchWithTimeout } from "../config/api";

export interface ShareChatRequest {
  sessionId: string;
  messages: {
    text: string;
    sender: "user" | "bot";
    time: string;
  }[];
}

export interface ShareChatResponse {
  status: string;
  shareId: string;
  shareUrl: string;
}

export interface SharedChatData {
  status: string;
  shareId: string;
  messages: {
    text: string;
    sender: "user" | "bot";
    time: string;
  }[];
  createdAt: string;
}

/**
 * Creates a shareable link for the current chat session
 */
export async function createSharedChat(
  payload: ShareChatRequest
): Promise<ShareChatResponse> {
  try {
    const response = await fetchWithTimeout(
      `${API_BASE_URL}/api/chat/share`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: payload.sessionId,
          messages: payload.messages,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error creating shared chat:", error);
    throw new Error(getUserFriendlyErrorMessage(error));
  }
}

/**
 * Retrieves a shared chat by its shareId
 */
export async function getSharedChat(shareId: string): Promise<SharedChatData> {
  try {
    const response = await fetchWithTimeout(
      `${API_BASE_URL}/api/chat/shared/${shareId}`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error("This shared chat link is invalid or has expired.");
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching shared chat:", error);
    throw new Error(getUserFriendlyErrorMessage(error));
  }
}
