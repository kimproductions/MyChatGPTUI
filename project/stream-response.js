/**
 * This code demonstrates how to use the OpenAI API to generate chat completions.
 * The generated completions are received as a stream of data from the API and the
 * code includes functionality to handle errors and abort requests using an AbortController.
 * The API_KEY variable needs to be updated with the appropriate value from OpenAI for successful API communication.
 */

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
const maxLines = 10;
const controls = document.getElementsByClassName("controls")[0];
const tokenLimitErrorMessage = document.getElementById("token-limit-error");

let controller = null; // Store the AbortController instance
let conversation = []; // Store the conversation history
let isGenerating; // Store the state of the generator
const pre1 = document.createElement("pre");
const code1 = document.createElement("code");
code1.classList.add("language-js");
code1.textContent = "";
pre1.appendChild(code1);
resultContainer.appendChild(pre1);

const generate = async () => {
  // Alert the user if no prompt value
  if (!promptInput.value) {
    alert("Please enter a prompt.");
    return;
  }
  tokenLimitErrorMessage.style.display = "none";
  // alert(model.value);

  // Disable the generate button and enable the stop button
  generateBtn.disabled = true;
  stopBtn.disabled = false;
  // resultText.innerText = "Generating...";
  // Create a new AbortController instance
  controller = new AbortController();
  const signal = controller.signal;

  try {
    isGenerating = true;
    const promptValue = promptInput.value;
    promptInput.value = "";
    conversation.push({ role: "user", content: promptValue }); //add the user message to the conversation array
    autoGrow(promptInput);
    //create a new paragraph for the user message
    const userMessage = document.createElement("p");
    userMessage.innerText = promptValue;
    userMessage.classList.add("user-text", "message");
    resultContainer.appendChild(userMessage);
    scrollIfNearBottom();
    // promptInput.setAttribute("disabled", true);

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
    // resultText.innerText = "";

    //create a paragraph for the new text

    const paragraph = document.createElement("p");
    paragraph.innerText = "";
    paragraph.classList.add("assistant-text", "message");

    resultContainer.appendChild(paragraph);
    let fullResult = "";

    resultContainer.scrollTop = resultContainer.scrollHeight;

    let isCodeBlock = false;
    let lastThreeContents = [];
    let currentCodeBlock = null;

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
        // Update the UI with the new content
        
        if (content) {
          console.log(content);

          lastThreeContents.push(content);
          if (lastThreeContents.length > 3) {
            lastThreeContents.shift();
          }
          const combinedContents = lastThreeContents.join('');

          if (combinedContents.includes("```"))
          { // Check for backticks
            // alert("backticks detected");
            console.log("backticks detected");
            console.log(combinedContents);
            if (!isCodeBlock) {
              isCodeBlock = true;
              currentCodeBlock = createNewCodeBlock();
            } else {
              isCodeBlock = false;
            }
            
            //take out the backticks from the lastthreecontents array
            lastThreeContents = lastThreeContents.filter((content) => {
                return !(content.includes("```") || content.includes("``") || content.includes("`"));
            });

            // cleanedContent = cleanedContent.replace(/`+/g, '');
            
          }
          else if (isCodeBlock) {
            if (!content.includes("`"))
            {
              currentCodeBlock.textContent += content;
            }
          }
          else {
            // This is not a code block, so just add the content to the paragraph
            if (!content.includes("`"))
            {
              paragraph.innerText += content;
              fullResult += content;
            }
            
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

  } catch (error) {
    // Handle fetch request errors
    if (signal.aborted) {

      // resultText.innerText = "Request aborted.";
    } else {
      console.error("Error:", error);
      // resultText.innerText = "Error occurred while generating.";
    }
  } finally {
    // Enable the generate button and disable the stop button
    generateBtn.disabled = false;
    stopBtn.disabled = true;
    controller = null; // Reset the AbortController instance
    isGenerating = false;
  }
};

function createNewCodeBlock() {
  const pre = document.createElement("pre");
  const code = document.createElement("code");
  code.classList.add("language-js");
  code.textContent = "";
  pre.appendChild(code);
  resultContainer.appendChild(pre);
  Prism.highlightElement(code);
  return code;
}


function hasBackticks(str) {
    return str.includes('`');
}

function scrollIfNearBottom() {
  let buffer = 30; // change this to increase/decrease the buffer
  let isAtBottom = resultContainer.scrollHeight - resultContainer.clientHeight - buffer <= resultContainer.scrollTop;

  if (isAtBottom) {
    resultContainer.scrollTop = resultContainer.scrollHeight - resultContainer.clientHeight;
  }
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

function autoGrow(textarea) {
  const lineHeight = 1.2 * 16;  // Assuming a line-height of 1.2em and a font-size of 16px
  const maxHeight = lineHeight * maxLines;
  textarea.style.height = 'auto';  // Temporarily reduce the height to calculate the scrollHeight
  const newHeight = Math.min(textarea.scrollHeight, maxHeight);
  textarea.style.height = newHeight + 'px';
  textarea.style.overflowY = newHeight < textarea.scrollHeight ? 'scroll' : 'hidden';
}

promptInput.addEventListener('input', () => autoGrow(promptInput));
suffixInput.addEventListener('input', () => autoGrow(suffixInput));