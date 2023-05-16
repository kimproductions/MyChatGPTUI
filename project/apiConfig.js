export const API_URL = "https://api.openai.com/v1/chat/completions";
export const API_KEY = "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";

export function fetchAPIResponse(signal, model, conversation, suffixInput) {
  return fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: model.value,
      messages: conversation.map((message) => ({
        role: message.role,
        content: message === conversation[conversation.length - 1]
          ? message.content + "Additional Input: " + suffixInput.value
          : message.content
      })),
      max_tokens: 2000,
      stream: true,
    }),
    signal,
  });
}
