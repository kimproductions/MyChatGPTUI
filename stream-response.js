/**
 * This code demonstrates how to use the OpenAI API to generate chat completions.
 * The generated completions are received as a stream of data from the API
 */

import { scrollIfNearBottom, scrollTo, scrollToPosition } from './scripts/scrolling.js';
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

let activeConversationIndex = 0;
let conversationList = [[]];
initializeConversationList();

fetchConfig();

// Load conversation list on page load
// window.addEventListener("DOMContentLoaded", () => loadConversationList(conversation));

const generate = async () => {
  // Create a new AbortController instance
  controller = new AbortController();
  const signal = controller.signal;
  const conversation = conversationList[activeConversationIndex];
  const conversationIndex = activeConversationIndex;

  const conversationButtonsDiv = document.querySelector(
    `.conversation-btn-wrapper[data-convo-index="${conversationIndex}"]`
  );
  let convoBtn = conversationButtonsDiv.querySelector('.convo-btn');
  console.log(convoBtn);

  try {
    const promptValue = promptInput.value;
    const conversationDiv = document.querySelector(
      `.conversation[data-convo-index="${conversationIndex}"]`
    );
    
    
    SetVariablesOnGenerate();
    UpdateConversationWithSystemAndUserMessage(promptValue, systemMessageTextArea.value, conversation); 
    autoGrow(promptInput); //collapse promptinput ui

    CreateMessageElement("user", promptValue, conversation, conversationDiv);
    scrollIfNearBottom();
    
    // Fetch the response from the OpenAI API with the signal from AbortController
    const response = await fetchResponseFromApi(signal, conversation);
    if (!validateResponse(response)) {
      throw new Error("Invalid Response");
    }

    //get the message div from 
    const messageDiv = CreateMessageElement("assistant", "", conversation, conversationDiv);
    
    let currentResponseParagraph = document.createElement("p");
    messageDiv.appendChild(currentResponseParagraph);

    let fullResult = "";
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
          showLoadingSign(conversationIndex);
        }
      }
    }
    conversation.push({
      role: "assistant",
      content: fullResult
    });

    // run function that makes an api call and changes convoBtn's text to the result of that call.

    console.log(conversation);
    console.log(conversationList);
  } catch (error) {
    // Handle fetch request errors
    if (signal.aborted) {
      console.log("aboorttt");
    } else {
      console.error("Error:", error);
    }
  } finally {
    let lastcontent = conversation[conversation.length-1].content;
    console.log("content: " + lastcontent)
    hideLoadingSign(conversationIndex);
    SetVariablesOnStop();
    const btnTitle = await generateResponse("Summarize the following text in 35 characters or less to be used as a title. Do not use any puncuation! " + lastcontent);
    convoBtn.innerText = btnTitle;
    console.log(btnTitle);
    // saveConversation(conversation);
  }
};

const generateResponse = async (promptValue) => {
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

function setActiveConversation (index) {
  activeConversationIndex = index;

  const allConvoDivs = document.querySelectorAll(".conversation");
  allConvoDivs.forEach((convoDiv, index) => {
    convoDiv.style.display = "none";
  });

  console.log(index);
  const conversationDiv = document.querySelector(
    `.conversation[data-convo-index="${index}"]`
  );
  
  highlightActiveConvoBtn(index);
  
  conversationDiv.style.display = "block";
  scrollTo(false, false);
}

function highlightActiveConvoBtn(index) {
  // Select all buttons with the "convo-btn" class and remove the "outlined" class from them
  const allConvoBtns = document.querySelectorAll(".convo-btn");
  allConvoBtns.forEach((btn) => btn.classList.remove("outlined"));

  // Select the active conversation button with the matching data-convo-index and add the "outlined" class
  const activeConvoBtn = document.querySelector(
    `.conversation-btn-wrapper[data-convo-index="${index}"] .convo-btn`
  );

  if (activeConvoBtn) {
    activeConvoBtn.classList.add("outlined");
  }
}

// New Conversation Button
const newConversationBtn = document.getElementById("new-conversation-btn");
newConversationBtn.onclick = () => {
  // Add new conversation to the conversationList.
  conversationList.push([]);
  console.log(conversationList);
  // Set new conversation as the active one.
  // Create and add the conversation div under the conversation-history.
  const conversationHistory = document.getElementById("conversation-history");
  conversationHistory.appendChild(
    createConversationBtnsElement(conversationList.length - 1)
  );
  createConversationElement(conversationList.length - 1);
  console.log("createConversation");
  setActiveConversation(conversationList.length - 1);
};

function initializeConversationList()
{
  const conversationHistory = document.getElementById("conversation-history");
  conversationHistory.innerHTML = "";
  for (let i = 0; i < conversationList.length; i++)
  {
    conversationHistory.appendChild(
      createConversationBtnsElement(i),
    );
    createConversationElement(i);
  }
  setActiveConversation(0);
}

function createConversationElement(index)
{
  const conversationDiv = document.createElement("div");
  conversationDiv.classList.add("conversation");
  conversationDiv.setAttribute("data-convo-index", index);
  conversationDiv.style.display = "none";
  resultContainer.appendChild(conversationDiv);
}


function createConversationBtnsElement(index) {
  const conversationButtonsDiv = document.createElement("div");
  conversationButtonsDiv.classList.add("conversation-btn-wrapper");

  const convoBtn = document.createElement("button");
  convoBtn.classList.add("convo-btn");
  convoBtn.innerText = "New Conversation";

  const deleteConvoBtn = document.createElement("button");
  deleteConvoBtn.classList.add("delete-convo-btn");
  deleteConvoBtn.innerText = "X";

  const renameConvoBtn = document.createElement("button");
  renameConvoBtn.classList.add("rename-convo-btn");
  renameConvoBtn.innerText = "R";

  const loadingSign = document.createElement("div");
  loadingSign.classList.add("loading-sign");
  loadingSign.style.display = "none";

  conversationButtonsDiv.appendChild(loadingSign);
  conversationButtonsDiv.appendChild(convoBtn);
  conversationButtonsDiv.appendChild(deleteConvoBtn);
  conversationButtonsDiv.appendChild(renameConvoBtn);

  convoBtn.addEventListener("click", (event) => {
    const currentIndex = parseInt(event.currentTarget.parentElement.getAttribute("data-convo-index"));
    setActiveConversation(currentIndex);
  });

  deleteConvoBtn.addEventListener("click", (event) => {
    const currentIndex = parseInt(event.currentTarget.parentElement.getAttribute("data-convo-index"));
    deleteConversation(currentIndex);
    updateConversationsDataIndex();
  });

  conversationButtonsDiv.setAttribute("data-convo-index", index);

  return conversationButtonsDiv;
}

function updateConversationsDataIndex() {
  const conversationBtnDivs = document.querySelectorAll(".conversation-btn-wrapper");
  conversationBtnDivs.forEach((convoDiv, index) => {
    convoDiv.setAttribute("data-convo-index", index);
  });

  const conversationDivs = document.querySelectorAll(".conversation");
  conversationDivs.forEach((convoDiv, index) => {
    convoDiv.setAttribute("data-convo-index", index);
  });
}

function deleteConversation(currentIndex) {
  conversationList.splice(currentIndex, 1);

  // Remove the conversation and conversation button elements.
  const conversationBtnDivToBeRemoved = document.querySelector(
    `.conversation-btn-wrapper[data-convo-index="${currentIndex}"]`
  );
  conversationBtnDivToBeRemoved.remove();

  const conversationDivToBeRemoved = document.querySelector(
    `.conversation[data-convo-index="${currentIndex}"]`
  );
  conversationDivToBeRemoved.remove();

  console.log("deleting " + currentIndex);

  // Setting the active conversation after deletion.
  if (currentIndex === activeConversationIndex) {
    if (currentIndex > 0) {
      setActiveConversation(currentIndex - 1);
    } else if (conversationList.length > 0) {
      setActiveConversation(0);
    } else {
      // resultContainer.innerHTML = "";
      console.log("resultcontainer empty function");
    }
  } else if (currentIndex < activeConversationIndex) {
    activeConversationIndex--;
  }
}

const showLoadingSign = (conversationIndex) => {
  const loadingSign = document.querySelector(`.conversation-btn-wrapper[data-convo-index="${conversationIndex}"] .loading-sign`);
  loadingSign.style.display = 'block';
}

// Hide the loading sign
const hideLoadingSign = (conversationIndex) => {
  const loadingSign = document.querySelector(`.conversation-btn-wrapper[data-convo-index="${conversationIndex}"] .loading-sign`);
  loadingSign.style.display = 'none';
  console.log("hiding");
  console.log("conversationIndex");

}

function UpdateConversationWithSystemAndUserMessage(promptValue, systemMessage, conversation) {
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

async function fetchResponseFromApi(signal, conversation) {
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

promptInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
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
  // conversation = [];
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

function SetVariablesOnGenerate()
{
  tokenLimitErrorMessage.style.display = "none";
  generateBtn.disabled = true;
  stopBtn.disabled = false;
  promptInput.value = "";
}

function SetVariablesOnStop()
{

  generateBtn.disabled = false;
  stopBtn.disabled = true;
  controller = null; // Reset the AbortController instance
}