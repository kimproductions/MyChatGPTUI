/**
 * This code demonstrates how to use the OpenAI API to generate chat completions.
 * The generated completions are received as a stream of data from the API and the
 * code includes functionality to handle errors and abort requests using an AbortController.
 * The API_KEY variable needs to be updated with the appropriate value from OpenAI for successful API communication.
 */
// Prism.plugins.autoloader.languages_path = 'prism-components/';

let API_URL = null;
let API_KEY = null;
const apiKey = document.getElementById("api-key");
const promptInput = document.getElementById("prompt-input");
const suffixInput = document.getElementById("suffix-input");
const generateBtn = document.getElementById("generate-btn");
const stopBtn = document.getElementById("stop-btn");
const clearBtn = document.getElementById("clear-convo-btn");
// const resultText = document.getElementById("resultText");
const resultContainer = document.getElementById("result-container");
const model = document.getElementById("model");
const controls = document.getElementsByClassName("controls")[0];
const tokenLimitErrorMessage = document.getElementById("token-limit-error");
const messagesContainer = document.getElementById("messages-container");
const systemMessageTextArea = document.getElementById("system-message");
const shouldHighlightCodeCheckbox = document.getElementById("code-block-checkbox");
const convoNameLength = 30;

let controller = null; // Store the AbortController instance
let conversation = []; // Store the conversation history
let isGenerating; // Store the state of the generator

fetch('config.json')
  .then(response => {
    if (!response.ok) {
      throw new Error('Failed to load config file');
    }
    return response.json();
  })
  .then(config => {
    // Use the config data
    console.log(config.apiUrl);
    console.log(config.apiKey);
    API_KEY = config.API_KEY;
    API_URL = config.API_URL;
  })
  .catch(error => {
    console.error('Error fetching config:', error);
  });

const createFileName = (Conversation) => {
  console.log('Conversation: ', Conversation);

  let fileName = 'Conversation';
  if (Conversation.length > 0) {
    const content = removeHTMLTags(Conversation[1].content);
    fileName = content.length <= convoNameLength ? content : content.slice(0, convoNameLength);
  } else {
    filename = "Empty Conversation";
  }

  console.log('Initial fileName: ', fileName);

  let counter = 1;
  while (localStorage.getItem(fileName)) {
    const newContent = removeHTMLTags(Conversation[1].content);
    fileName = newContent.length <= convoNameLength ? `${newContent}_${counter}` : `${newContent.slice(0, convoNameLength)}_${counter}`;
    counter++;
  }

  console.log('Final fileName: ', fileName);
  return fileName;
};

// Save conversation
const saveConversation = () => {
  if (conversation.fileName) {
    // Update the existing conversation file
    localStorage.setItem(conversation.fileName, JSON.stringify(conversation));
  } else {
    // Create a new conversation file
    const fileName = createFileName(conversation);
    conversation.fileName = fileName;
    localStorage.setItem(fileName, JSON.stringify(conversation));
  }

  loadConversationList();
};

// Load a conversation
const loadConversationFromFile = (fileName) => {
  const storedConversation = JSON.parse(localStorage.getItem(fileName));
  conversation = storedConversation ? storedConversation : [];
  conversation.fileName = fileName; // Add this line to set the fileName property when loading a stored conversation
  updateResultContainer(conversation);
};

// Update the result container with the loaded conversation
const updateResultContainer = (conversationArray) => {
  resultContainer.innerHTML = "";
  for (const message of conversationArray) {
    const messageDiv = document.createElement("div");
    let messageParagraph = document.createElement("p");
    messageParagraph.innerText = message.content;
    messageDiv.appendChild(messageParagraph);
    messageDiv.classList.add(`${message.role}-text`, "message");
    resultContainer.appendChild(messageDiv);
  }
};

// Load Conversation List
const loadConversationList = () => {
  const conversationHistory = document.getElementById("conversation-history");
  conversationHistory.innerHTML = "";

  for (let i = 0; i < localStorage.length; i++) {
    const conversationName = localStorage.key(i);
    const newConversationDiv = document.createElement("div");
    newConversationDiv.classList.add("conversation");

    const convoBtn = document.createElement("button");
    convoBtn.classList.add("convo-btn");
    convoBtn.innerText = conversationName;
    convoBtn.onclick = () => loadConversationFromFile(conversationName);
    newConversationDiv.appendChild(convoBtn);

    const deleteConvoBtn = document.createElement("button");
    deleteConvoBtn.classList.add("delete-convo-btn");
    deleteConvoBtn.innerText = "X";
    deleteConvoBtn.onclick = () => {
      localStorage.removeItem(conversationName);
      loadConversationList();
    };
    newConversationDiv.appendChild(deleteConvoBtn);

    const renameConvoBtn = document.createElement("button");
    renameConvoBtn.classList.add("rename-convo-btn");
    renameConvoBtn.innerText = "R";
    renameConvoBtn.onclick = () => {
      const newName = prompt("Enter new name:");
      if (newName) {
        const updatedConversation = JSON.parse(localStorage.getItem(conversationName));
        updatedConversation.fileName = newName;
        localStorage.setItem(newName, JSON.stringify(updatedConversation));
        localStorage.removeItem(conversationName);
        loadConversationList();
      }
    };
    newConversationDiv.appendChild(renameConvoBtn);

    conversationHistory.appendChild(newConversationDiv);
  }
};

const removeHTMLTags = (text) => {
  return text.replace(/(<([^>]+)>)/gi, "");
};

// New Conversation Button
const newConversationBtn = document.getElementById("new-conversation-btn");
newConversationBtn.onclick = () => {
  conversation = [];
  updateResultContainer(conversation);
};

// Load conversation list on page load
window.addEventListener("DOMContentLoaded", loadConversationList);

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
    conversation.push({
      role: "system",
      content: systemMessageTextArea.value
    }); //add the system message to the conversation array
    conversation.push({
      role: "user",
      content: promptValue
    }); //add the user message to the conversation array
    autoGrow(promptInput);

    //create a new paragraph for the user message
    const userMessageDiv = document.createElement("div");
    const userMessageParagraph = document.createElement("p");
    userMessageDiv.appendChild(userMessageParagraph);
    userMessageParagraph.innerText = promptValue;
    userMessageDiv.classList.add("user-text", "message");
    resultContainer.appendChild(userMessageDiv);

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

    const assistantMessageDiv = document.createElement("div");
    assistantMessageDiv.classList.add("assistant-text", "message");
    resultContainer.appendChild(assistantMessageDiv);
    let currentResponseParagraph = document.createElement("p");
    assistantMessageDiv.appendChild(currentResponseParagraph);


    let fullResult = "";


    scrollToBottom();

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
        // console.log(parsedLine);
        const {
          choices
        } = parsedLine;
        const {
          delta
        } = choices[0];
        const {
          content
        } = delta;

        if (content && shouldHighlightCodeCheckbox.checked) {
          console.log(content);

          lastTwoContents.push(content);
          if (lastTwoContents.length > 2) {
            lastTwoContents.shift();

          }
          let combinedContents = lastTwoContents.join("");

          //check last two for backticks
          if (combinedContents.includes("```")) {
            // alert("backticks detected");
            console.log("backticks detected");
            console.log(combinedContents);
            // const lengthToDelete = lastTwoContents[0].length;


            if (!isCodeBlock) {
              isCodeBlock = true;
              currentCodeBlock = createNewCodeBlock(assistantMessageDiv);
              scrollIfNearBottom();
              // textDiv.innerHTML = 
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
              // hljs.highlightAuto(currentCodeBlock);
              if (currentCodeBlock.innerText.length > 20) {
                var result = hljs.highlightAuto(currentCodeBlock.innerText);
                console.log(result);
                if (result) {
                  currentCodeBlock.innerHTML = currentCodeBlock.innerHTML.replace(/[<]br[/]?[>]/gi, "\n");
                  currentCodeBlock.className = `language-${result.language}`;
                  Prism.highlightElement(currentCodeBlock);
                }
              }

              // Prism.highlightElement(currentCodeBlock);
              scrollIfNearBottom();
            }
          } else if (!isCodeBlock) { //check for single backticks to bold the text.
            // This is not a code block, so just add the content to the paragraph
            if (containsOneBacktick(content) && !isInlineCodeBlock) {
              isInlineCodeBlock = true;
              currentResponseParagraph.innerHTML += "<strong>";
            } else {
              isInlineCodeBlock = false;
              currentResponseParagraph.innerHTML += "</strong>";
            }

            if (isInlineCodeBlock) {}
            currentResponseParagraph.innerHTML += content;
            // currentParagraph.innerText += content;
          }

        } else if (content && !shouldHighlightCodeCheckbox.checked) {
          currentResponseParagraph.innerText += content;
        }

        if (content) {
          fullResult += content;
          requestAnimationFrame(() => {
            requestAnimationFrame(scrollIfNearBottom);
          });
        }

      }
    }

    conversation.push({
      role: "assistant",
      content: fullResult
    });
    //log the conversation array
    console.log(conversation);
    isGenerating = false;
    // Prism.highlightAll();

  } catch (error) {
    // Handle fetch request errors
    if (signal.aborted) {
      // resultText.innerText = "Request aborted.";
    } else {
      console.error("Error:", error);
    }
  } finally {
    // Enable the generate button and disable the stop button
    generateBtn.disabled = false;
    stopBtn.disabled = true;
    controller = null; // Reset the AbortController instance
    isGenerating = false;
    saveConversation();
  }
};

function createFencedCodeDiv(divElement) {
  // Extract existing text content
  const content = divElement.innerText;

  // Split text content by lines
  const lines = content.split('\n');

  // Create a new div element
  const newDiv = document.createElement('div');

  // Loop through the lines and process backtick-blocks and non-code text
  let isInCodeBlock = false;
  let codeLanguage = null;
  let codeContent = null;

  lines.forEach((line) => {
    if (line.startsWith('```')) {
      if (isInCodeBlock) {
        isInCodeBlock = false;

        // Create <pre><code> element with the code content
        const pre = document.createElement('pre');
        const code = document.createElement('code');
        code.classList.add(codeLanguage);
        code.innerText = codeContent;
        pre.appendChild(code);
        newDiv.appendChild(pre);

        codeLanguage = null;
        codeContent = null;
      } else {
        isInCodeBlock = true;
        codeLanguage = line.substring(3); // Extract language after backticks, if specified
        codeContent = '';
      }
    } else if (isInCodeBlock) {
      codeContent += line + '\n';
    } else {
      // For non-code lines, create a paragraph element
      const p = document.createElement('p');
      p.innerText = line;
      newDiv.appendChild(p);
    }
  });

  // Append new div element to the DOM
  return newDiv;
}

function createNewCodeBlock(textDiv) {
  const pre = document.createElement("pre");
  const code = document.createElement("code");
  code.className = "language-js";
  code.textContent = "";
  pre.appendChild(code);

  // Append pre to paragraph instead of resultContainer
  textDiv.appendChild(pre);
  Prism.highlightElement(code);

  return code;
}

function arrayIncludes(array, target) {
  return array.some(element => element.includes(target));
}

function includesAny(array, targetStrings) {
  return targetStrings.some(target => array.some(element => element.includes(target)));
}

function hasBackticks(str) {
  return str.includes('`');
}

function scrollIfNearBottom() {
  let buffer = 65; // change this to increase/decrease the buffer
  let isAtBottom = messagesContainer.scrollHeight - messagesContainer.clientHeight - buffer <= messagesContainer.scrollTop;

  if (isAtBottom) {
    messagesContainer.scrollTop = messagesContainer.scrollHeight - messagesContainer.clientHeight;
  }
}

function scrollToBottom() {
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
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

document.getElementById("token-range").addEventListener("input", function (event) {
  this.nextElementSibling.value = this.value;
});

promptInput.addEventListener("keyup", (event) => {
  if (event.key === "Enter" && !isGenerating && !event.shiftKey) {
    generate();
  }
});
generateBtn.addEventListener("click", generate);
stopBtn.addEventListener("click", stop);

generateBtn.disabled = false;

clearBtn.addEventListener("click", clearConvo);

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

promptInput.addEventListener('input', () => autoGrow(promptInput, 10));
suffixInput.addEventListener('input', () => autoGrow(suffixInput, 10));
systemMessageTextArea.addEventListener('input', () => autoGrow(systemMessageTextArea, 10));