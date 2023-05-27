import { API_URL, API_KEY } from './config.js';

export const generateResponse = async (promptValue) => {
    let controller = new AbortController();
    const signal = controller.signal;
    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${API_KEY}`,
            },
            body: JSON.stringify({
                model: "gpt-3.5-turbo",
                messages: [{ role: "user", content: promptValue }],
                max_tokens: 100,
            }),
            signal, // Pass the signal to the fetch request
        });

        const data = await response.json();
        return data.choices[0].message.content;
    } catch (error) {
        if (signal.aborted) {
            console.error("Request aborted");
        } else {
            console.error("Error:", error);
        }
        return ""; // Return an empty string if an error occurs
    } finally {
        // Enable the generate button and disable the stop button

        controller = null; // Reset the AbortController instance
    }
};

export async function fetchResponseFromApi(signal, conversation, additionalInput) {
    return await fetch(API_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${API_KEY}`,
        },
        body: JSON.stringify({
            model: model.value,
            messages: conversation.map((message) => ({
                role: message.role,
                content: message === conversation[conversation.length - 1] ?
                    message.content + " (Additional Input: '" + additionalInput + "' If there's no additional input, ignore this)": message.content
            })),
            max_tokens: 2000,
            stream: true, // For streaming responses
        }),
        signal, // Pass the signal to the fetch request
    });
}

export function validateResponse(response) {
    if (!response.ok) {
        if (response.status === 400) {
            console.log("Server returned a status of 400, most likely over the token limit");
            tokenLimitErrorMessage.style.display = "block";
            throw new Error("Server returned a status of 400");
        } else {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
    }
    return true;
}