/**
 * This code demonstrates how to use the OpenAI API to generate chat completions.
 * The generated completions are received as a stream of data from the API and the
 * code includes functionality to handle errors and abort requests using an AbortController.
 * The API_KEY variable needs to be updated with the appropriate value from OpenAI for successful API communication.
 */
// Prism.plugins.autoloader.languages_path = 'prism-components/';

const API_URL = "https://api.openai.com/v1/chat/completions";
const API_KEY = "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";

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

let controller = null; // Store the AbortController instance
let conversation = []; // Store the conversation history
let isGenerating; // Store the state of the generator

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
    conversation.push({ role: "system", content: systemMessageTextArea.value }); //add the system message to the conversation array
    conversation.push({ role: "user", content: promptValue }); //add the user message to the conversation array
    autoGrow(promptInput);
    //create a new paragraph for the user message
    const userMessage = document.createElement("p");
    userMessage.innerText = promptValue;
    userMessage.classList.add("user-text", "message");
    resultContainer.appendChild(userMessage);

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
          content: message === conversation[conversation.length - 1]
            ? message.content + "Additional Input: " + suffixInput.value
            : message.content
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

    const messageDiv = document.createElement("div");
    messageDiv.innerText = "";
    messageDiv.classList.add("assistant-text", "message");
    resultContainer.appendChild(messageDiv);

    let currentParagraph = document.createElement("p");
    messageDiv.appendChild(currentParagraph);


    let fullResult = "";

    
    scrollToBottom();

    let isCodeBlock = false;
    let isInlineCodeBlock = false;

    let lastTwoContents = [];
    let currentCodeBlock = null;
    let fullResultData = null;
    

    while (true) {
      const { done, value } = await reader.read();
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
        const { choices } = parsedLine;
        const { delta } = choices[0];
        const { content } = delta;

        if (content) {
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
            const lengthToDelete = lastTwoContents[0].length;
            

            if (!isCodeBlock) {
              isCodeBlock = true;
              currentCodeBlock = createNewCodeBlock(messageDiv);
              scrollIfNearBottom();
              // textDiv.innerHTML = 
            } else {
              isCodeBlock = false;
              currentParagraph = document.createElement("p");
              messageDiv.appendChild(currentParagraph);
            }
            
            //take out the backticks from the lastthreecontents array
            lastTwoContents = lastTwoContents.filter((content) => {
                return !(content.includes("```") || content.includes("``") || content.includes("`"));
            });            
          }
          else if (isCodeBlock) {
            if (!content.includes("`"))
            {
              currentCodeBlock.innerText += content;
              // hljs.highlightAuto(currentCodeBlock);
              if (currentCodeBlock.innerText.length > 20)
              {
                var result = hljs.highlightAuto(currentCodeBlock.innerText);
                console.log(result);
                if (result)
                {
                  currentCodeBlock.innerHTML = currentCodeBlock.innerHTML.replace(/[<]br[/]?[>]/gi,"\n");
                  currentCodeBlock.className = `language-${result.language}`;
                  Prism.highlightElement(currentCodeBlock);
                }

              }
              
              // Prism.highlightElement(currentCodeBlock);
              scrollIfNearBottom();
            }
          }
          else if (!isCodeBlock) { //check for single backticks to bold the text.
            // This is not a code block, so just add the content to the paragraph
            if (containsOneBacktick(content) && !isInlineCodeBlock)
            {
              isInlineCodeBlock = true;
              currentParagraph.innerHTML += "<strong>";
            }
            else
            {
              isInlineCodeBlock = false;
              currentParagraph.innerHTML += "</strong>";
            }

            if (isInlineCodeBlock)
            {
            }
            currentParagraph.innerHTML += content;

            // currentParagraph.innerText += content;
              
            fullResult += content;
            
            requestAnimationFrame(() => {
              requestAnimationFrame(scrollIfNearBottom);
            });
          }
        }
      }
    }

    conversation.push({ role: "assistant", content: fullResult });
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
  }
};

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

function scrollToBottom()
{
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function containsOneBacktick(str) {
  const regex = /^[^]*$/;  // regex to match one backtick surrounding any number of characters that are not a backtick
  return regex.test(str);
}

const stop = () => {
  // Abort the fetch request by calling abort() on the AbortController instance
  if (controller) {
    controller.abort();
    controller = null;
  }
};

promptInput.addEventListener("keyup", (event) => {
  if (event.key === "Enter" && !isGenerating && !event.shiftKey) {
    generate();
  }
});
generateBtn.addEventListener("click", generate);
stopBtn.addEventListener("click", stop);

promptInput.addEventListener("input", () => {
  if (promptInput.value) {
    generateBtn.disabled = false;
  } else {
    generateBtn.disabled = true;
  }
})
generateBtn.disabled = true;

clearBtn.addEventListener("click", clearConvo);

function clearConvo() {
  conversation = [];
  resultContainer.innerHTML = "";
}

function autoGrow(textarea, maxLines) {
  const lineHeight = 1.2 * 16;  // Assuming a line-height of 1.2em and a font-size of 16px
  const maxHeight = lineHeight * maxLines;
  textarea.style.height = 'auto';  // Temporarily reduce the height to calculate the scrollHeight
  const newHeight = Math.min(textarea.scrollHeight, maxHeight);
  textarea.style.height = newHeight + 'px';
  textarea.style.overflowY = newHeight < textarea.scrollHeight ? 'scroll' : 'hidden';
}

promptInput.addEventListener('input', () => autoGrow(promptInput, 10));
suffixInput.addEventListener('input', () => autoGrow(suffixInput, 10));
systemMessageTextArea.addEventListener('input', () => autoGrow(systemMessageTextArea, 10));