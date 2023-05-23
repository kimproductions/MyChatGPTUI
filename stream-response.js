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
  tokenLimitErrorMessage.style.display = "none";
  // Disable the generate button and enable the stop button
  generateBtn.disabled = true;
  stopBtn.disabled = false;
  // Create a new AbortController instance
  controller = new AbortController();
  const signal = controller.signal;

  try {
    isGenerating = true;
    const promptValue = promptInput.value;
    promptInput.value = "";
    if (conversation.length === 0 || conversation[0].role !== "system") {
      conversation.push({
        role: "system",
        content: ""
      }); //add the system message to the conversation array
    }
    //always add the system message when we run generate
    conversation[0].content = systemMessageTextArea.value;

    conversation.push({
      role: "user",
      content: promptValue
    }); //add the user message to the conversation array
    autoGrow(promptInput);

    CreateMessageElement("user", promptValue, conversation);

    scrollIfNearBottom();
    // Fetch the response from the OpenAI API with the signal from AbortController
    const response = await fetch(API_URL, {
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

    //check the server response, if it's 400 
    if (!response.ok) {
      if (response.status === 400) {
        // Handle the case when the server returns a status of 400
        console.log("Server returned a status of 400, most likely over the token limit");
        tokenLimitErrorMessage.style.display = "block";
        // You can add more specific error handling code here, if needed
        throw new Error("Server returned a status of 400");
      } else {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    }

    // Read the response as a stream of data
    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");

    //get the message div from 
    const messageWrapper = CreateMessageElement("assistant", "", conversation);
    
    //the assistant message div is the first child element. Not ideal, but it works
    let assistantMessageDiv = messageWrapper.firstElementChild;

    let currentResponseParagraph = document.createElement("p");
    assistantMessageDiv.appendChild(currentResponseParagraph);
    

    fullResult = "";
    scrollTo(false, false);

    let isCodeBlock = false;
    let isInlineCodeBlock = false;

    let lastTwoContents = [];
    let currentCodeBlock = null;
    let fullResultData = null;


    while (true) {
      const {
        done,
        value
      } = await reader.read();
      if (done) {
        // Handle the end of the stream
        break;
      }
      // Massage and parse the chunk of data
      const chunk = decoder.decode(value);
      const lines = chunk.split("\n");
      const parsedLines = lines
        .map((line) => line.replace(/^data: /, "").trim()) // Remove the "data: " prefix
        .filter((line) => line !== "" && line !== "[DONE]") // Remove empty lines and "[DONE]"
        .map((line) => JSON.parse(line)); // Parse the JSON string

      for (const parsedLine of parsedLines) {
        const { choices } = parsedLine;
        const { delta } = choices[0];
        const { content } = delta;

        if (content && shouldHighlightCodeCheckbox.checked) {
          console.log(content);

          lastTwoContents.push(content);
          if (lastTwoContents.length > 2) {
            lastTwoContents.shift();
          }
          let combinedContents = lastTwoContents.join("");

          //check last two for backticks
          if (combinedContents.includes("```")) {
            console.log("backticks detected");
            console.log(combinedContents);

            if (!isCodeBlock) {
              isCodeBlock = true;
              currentCodeBlock = createNewCodeBlock(assistantMessageDiv);
              scrollIfNearBottom();
            } else {
              isCodeBlock = false;
              currentResponseParagraph = document.createElement("p");
              assistantMessageDiv.appendChild(currentResponseParagraph);
            }

            //take out the backticks from the lastthreecontents array
            lastTwoContents = lastTwoContents.filter((content) => {
              return !(content.includes("```") || content.includes("``") || content.includes("`"));
            });
          } else if (isCodeBlock) {
            if (!content.includes("``")) {
              currentCodeBlock.innerText += content;
              if (currentCodeBlock.innerText.length > 20) {
                var result = hljs.highlightAuto(currentCodeBlock.innerText);
                if (result) {
                  currentCodeBlock.innerHTML = currentCodeBlock.innerHTML.replace(/[<]br[/]?[>]/gi, "\n");
                  currentCodeBlock.className = `language-${result.language}`;
                  Prism.highlightElement(currentCodeBlock);
                }
              }

              scrollIfNearBottom();
            }
          } else if (!isCodeBlock) { //check for single backticks to bold the text.
            // // This is not a code block, so just add the content to the paragraph
            // if (containsOneBacktick(content) && !isInlineCodeBlock) {
            //   isInlineCodeBlock = true;
            //   currentResponseParagraph.innerHTML += "<strong>";
            // } else {
            //   isInlineCodeBlock = false;
            //   currentResponseParagraph.innerHTML += "</strong>";
            // }

            currentResponseParagraph.innerText += content;
          }

        } else if (content && !shouldHighlightCodeCheckbox.checked) {
          currentResponseParagraph.innerText += content;
        }

        if (content) {
          fullResult += content;
          scrollIfNearBottom();
        }
      }
    }

  } catch (error) {
    // Handle fetch request errors
    if (signal.aborted) {
      console.log("aboorttt");
      // resultText.innerText = "Request aborted.";
    } else {
      console.error("Error:", error);
    }
  } finally {
    
    conversation.push({
      role: "assistant",
      content: fullResult
    });
    //log the conversation array
    console.log(conversation);
    // Prism.highlightAll();
    // Enable the generate button and disable the stop button
    generateBtn.disabled = false;
    stopBtn.disabled = true;
    controller = null; // Reset the AbortController instance
    isGenerating = false;
    saveConversation(conversation);
  }
};


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