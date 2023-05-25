/**
 * This code demonstrates how to use the OpenAI API to generate chat completions.
 * The generated completions are received as a stream of data from the API
 */

import { scrollIfNearBottom, scrollTo } from './scripts/scrolling.js';
import { fetchConfig, API_URL, API_KEY } from './scripts/config.js';
import { createNewCodeBlock, resultContainer, CreateMessageElement } from './scripts/messageElement.js';
import { highlightConvoButton, loadConversationList, updateResultContainer, loadConversationFromFile, createFileName, saveConversation } from './scripts/savingConversation.js';

const apiKey = document.getElementById("api-key");
const promptInput = document.getElementById("prompt-input");
const suffixInput = document.getElementById("suffix-input");
const generateBtn = document.getElementById("generate-btn");
const stopBtn = document.getElementById("stop-btn");
const clearBtn = document.getElementById("clear-convo-btn");
const model = document.getElementById("model");
const tokenLimitErrorMessage = document.getElementById("token-limit-error");
const systemMessageTextArea = document.getElementById("system-message");
const shouldHighlightCodeCheckbox = document.getElementById("code-block-checkbox");

let controller = null; // Store the AbortController instance
let conversation = []; // Store the conversation history
let isGenerating; // Store the state of the generator
let fullResult = "";

fetchConfig();

// Load conversation list on page load
window.addEventListener("DOMContentLoaded", () => loadConversationList(conversation));

const generate = async () => {
  // Create a new AbortController instance
  controller = new AbortController();
  const signal = controller.signal;

  try {
    const promptValue = promptInput.value;
    SetVariablesOnGenerate();
    UpdateConversationWithSystemAndUserMessage(promptValue, systemMessageTextArea.value); 
    autoGrow(promptInput); //collapse promptinput ui
    CreateMessageElement("user", promptValue, conversation);
    scrollIfNearBottom();
    
    // Fetch the response from the OpenAI API with the signal from AbortController
    const response = await fetchResponseFromApi(signal);
    if (!validateResponse(response)) {
      throw new Error("Invalid Response");
    }

    //get the message div from 
    const messageDiv = CreateMessageElement("assistant", "", conversation);
    
    let currentResponseParagraph = document.createElement("p");
    messageDiv.appendChild(currentResponseParagraph);

    fullResult = "";
    scrollTo(false, false);

    let isCodeBlock = false;
    let isInlineCodeBlock = false;
    let lastTwoContents = [];
    let currentCodeBlock = null;
    let fullResultData = null;
    let isHighlighted = false;

    // Read the response as a stream of data
    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        // Handle the end of the stream
        break;
      }
      // Massage and parse the chunk of data
      const chunk = decoder.decode(value);
      const parsedLines = processLines(chunk);

      for (const parsedLine of parsedLines) {
        const { choices } = parsedLine;
        const { delta } = choices[0];
        const { content } = delta;

        if (content && shouldHighlightCodeCheckbox.checked) { //
          console.log(content);
          lastTwoContents.push(content);
          
          //check last two for backticks
          if (doesLastTwoContentsContainThreeBackticks(lastTwoContents)) {
            if (!isCodeBlock) {
              isCodeBlock = true;
              isHighlighted = false;
              currentCodeBlock = createNewCodeBlock(messageDiv);
              scrollIfNearBottom();
            } else {
              isCodeBlock = false;
              currentResponseParagraph = document.createElement("p");
              messageDiv.appendChild(currentResponseParagraph);
            }
            
            //take out the backticks from the lastthreecontents array
            lastTwoContents = lastTwoContents.filter((content) => {
              return !(content.includes("```") || content.includes("``") || content.includes("`"));
            });
          } else if (isCodeBlock) {
            if (!content.includes("``")) {
              if (!isHighlighted && content) { //take the first content and use it as the language
                currentCodeBlock.className = `language-${content}`;
                // Prism.highlightElement(currentCodeBlock
                isHighlighted = true;
              }
              else {
                currentCodeBlock.innerText += content;
                currentCodeBlock.innerHTML = currentCodeBlock.innerHTML.replace(/[<]br[/]?[>]/gi, "\n");
                Prism.highlightElement(currentCodeBlock);
              }
              scrollIfNearBottom();
            }
          } else if (!isCodeBlock) { 
            currentResponseParagraph.innerText += content;
          }
        } else if (content && !shouldHighlightCodeCheckbox.checked) {
          currentResponseParagraph.innerText += content;
        } if (content) {
          fullResult += content;
          scrollIfNearBottom();
        }
      }
    }
  } catch (error) {
    // Handle fetch request errors
    if (signal.aborted) {
      console.log("aboorttt");
    } else {
      console.error("Error:", error);
    }
  } finally {
    conversation.push({
      role: "assistant",
      content: fullResult
    });
    SetVariablesOnStop();
    saveConversation(conversation);
  }
};

function processLines(chunk) {
  const lines = chunk.split("\n");
  return lines
    .map((line) => line.replace(/^data: /, "").trim()) // Remove the "data: " prefix
    .filter((line) => line !== "" && line !== "[DONE]") // Remove empty lines and "[DONE]"
    .map((line) => JSON.parse(line)); // Parse the JSON string
}

function doesLastTwoContentsContainThreeBackticks(lastTwoContents)
{ 
  if (lastTwoContents.length > 2) {
    lastTwoContents.shift();
  }
  let combinedContents = lastTwoContents.join("");
  return combinedContents.includes("```");
}

async function fetchResponseFromApi(signal) {
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
          message.content + "Additional Input: " + suffixInput.value : message.content
      })),
      max_tokens: 2000,
      stream: true, // For streaming responses
    }),
    signal, // Pass the signal to the fetch request
  });
}

function validateResponse(response) {
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

function UpdateConversationWithSystemAndUserMessage(promptValue, systemMessage)
{
  if (conversation.length === 0 || conversation[0].role !== "system") {
    conversation.unshift({
      role: "system",
      content: ""
    }); //add the system message to the conversation array
  }
  //always update the system message when we run generate
  conversation[0].content = systemMessage;
  conversation.push({
    role: "user",
    content: promptValue
  }); //add the user message to the conversation array
}

function containsOneBacktick(str) {
  const regex = /^[^]*$/; // regex to match one backtick surrounding any number of characters that are not a backtick
  return regex.test(str);
}

const stop = () => {
  // Abort the fetch request by calling abort() on the AbortController instance
  if (controller) {
    controller.abort();
    controller = null;
  }
};

//button controls and event listeners
document.getElementById("token-range").addEventListener("input", function (event) {
  this.nextElementSibling.value = this.value;
});

promptInput.addEventListener("keyup", (event) => {
  if (event.key === "Enter" && !isGenerating && !event.shiftKey) {
    event.preventDefault();
    generate();
  }
});

generateBtn.disabled = false;
generateBtn.addEventListener("click", generate);
stopBtn.addEventListener("click", stop);
clearBtn.addEventListener("click", clearConvo);
promptInput.addEventListener('input', () => autoGrow(promptInput, 10));
suffixInput.addEventListener('input', () => autoGrow(suffixInput, 10));
systemMessageTextArea.addEventListener('input', () => autoGrow(systemMessageTextArea, 10));

function clearConvo() {
  conversation = [];
  resultContainer.innerHTML = "";
}

function autoGrow(textarea, maxLines) {
  const lineHeight = 1.2 * 16; // Assuming a line-height of 1.2em and a font-size of 16px
  const maxHeight = lineHeight * maxLines;
  textarea.style.height = 'auto'; // Temporarily reduce the height to calculate the scrollHeight
  const newHeight = Math.min(textarea.scrollHeight, maxHeight);
  textarea.style.height = newHeight + 'px';
  textarea.style.overflowY = newHeight < textarea.scrollHeight ? 'scroll' : 'hidden';
}

// New Conversation Button
const newConversationBtn = document.getElementById("new-conversation-btn");
newConversationBtn.onclick = () => {
  conversation = [];
  updateResultContainer(conversation);
};

function SetVariablesOnGenerate()
{
  tokenLimitErrorMessage.style.display = "none";
  generateBtn.disabled = true;
  stopBtn.disabled = false;
  isGenerating = true;
  promptInput.value = "";
}

function SetVariablesOnStop()
{
  //log the conversation array
  console.log(conversation);
  // Enable the generate button and disable the stop button
  generateBtn.disabled = false;
  stopBtn.disabled = true;
  controller = null; // Reset the AbortController instance
  isGenerating = false;
}