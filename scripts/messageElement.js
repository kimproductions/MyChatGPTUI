import { saveConversationHistory } from "./savingConversation.js";
import { scrollToPosition, scrollTo } from "./scrolling.js";


export const resultContainer = document.getElementById("result-container");
const messageContainer = document.getElementById("messages-container");


export function createNewCodeBlock(textDiv) {
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

export function CreateMessageElement(role, content, conversation, divToAppend) {
    const messageWrapper = document.createElement("div");
    messageWrapper.classList.add("message-wrapper");

    const deleteButton = document.createElement("button");
    deleteButton.classList.add("delete-message-btn");

    const editButton = document.createElement("button");
    editButton.classList.add("edit-message-btn");

    messageWrapper.appendChild(editButton);

    const messageDiv = document.createElement("div");
    messageWrapper.appendChild(messageDiv);

    messageWrapper.appendChild(deleteButton);
    let messageParagraph = document.createElement("p");
    messageParagraph.innerText = content;

    messageDiv.appendChild(messageParagraph);
    messageDiv.classList.add(`${role}-text`, "message");

    messageWrapper.setAttribute("tabindex", "0");
    // messageDiv.setAttribute("data-index", index);
    messageDiv.addEventListener("click", function () {
        // this.focus();
        console.log("focusing: " + this);
    });
    messageDiv.addEventListener("keydown", function (event) {
        HandleDeleteKeyEvent(event, messageWrapper, conversation);
    });

    messageWrapper.addEventListener("keydown", (event) => {
        console.log(event.key);

        if (event.key === "ArrowUp" || event.key === "w")
        {
            event.preventDefault();
            event.stopPropagation();
            if (messageWrapper.previousElementSibling)
            {
                messageWrapper.previousElementSibling.focus({
                    preventScroll: true
                });
                const scrollAmount = messageWrapper.previousElementSibling.offsetTop;
                scrollToPosition(messageWrapper.previousElementSibling.offsetTop - 100, 250, false);
            }
        }
        else if (event.key === "ArrowDown" || event.key === "s")
        {
            event.preventDefault();
            event.stopPropagation();
            if (messageWrapper.nextElementSibling)
            {
                messageWrapper.nextElementSibling.focus({
                    preventScroll: true
                });
                const scrollAmount = messageWrapper.nextElementSibling.offsetTop;
                scrollToPosition(messageWrapper.nextElementSibling.offsetTop - 100, 250, false);
            }
        }
        else if (event.key === "ArrowLeft" || event.key === "a")
        {
            console.log("yeah");
         
            scrollTo(true, false);
        }
        else if (event.key === "ArrowRight" || event.key === "d")
        {
            console.log("yeah");
    
            scrollTo(false, false);
        }
    });

    divToAppend.appendChild(messageWrapper);

    deleteButton.addEventListener("click", () => DeleteMessage(messageWrapper, conversation));
    editButton.addEventListener("click", () => StartEditingMessage(messageParagraph, conversation, editButton, messageWrapper));


    RefreshMessageIndices();

    return messageDiv;
}

export function StartEditingMessage(messageElement, conversation, editButton, messageWrapper) {
    const messageDiv = messageElement.parentNode;
    // let textArea = messageDiv.querySelector("textarea"); // Check if there's a textarea
    const paragraphs = messageDiv.querySelectorAll("p");
    paragraphs.forEach((paragraph) => {

        paragraph.style.display = "none";

        const textArea = document.createElement("textarea");
        textArea.classList.add("edit-textarea");
        messageDiv.appendChild(textArea);
        textArea.value = paragraph.innerText;
        textArea.style.display = "block";
        textArea.style.height = 'auto';
        textArea.style.height = textArea.scrollHeight + 'px';
        editButton.style.display = "none";

        textArea.addEventListener("keydown", (event) => {
            event.stopPropagation();
            if (event.key === "Enter" && !event.shiftKey) {
                FinishEditingMessage(textArea, messageDiv, editButton, messageElement, messageWrapper, conversation);
            }
            textArea.style.height = 'auto';
            textArea.style.height = textArea.scrollHeight + 'px';
        });
        textArea.addEventListener("keydown", (event) => {
            if (event.key === "Backspace") {
                event.stopPropagation();
            }
        });
    });
}

export function FinishEditingMessage(textArea, messageDiv, editButton, messageElement, messageWrapper, conversation) {
    // Update the message element content
    messageElement.innerText = textArea.value;

    // Hide the textarea
    textArea.style.display = "none";

    // Show the message element and edit button
    messageElement.style.display = "block";
    editButton.style.display = "block";

    //update conversation and save
    const index = parseInt(messageWrapper.getAttribute("data-index"));
    conversation[index + 1].content = messageElement.innerText;
    // saveConversation(conversation);
}

export function HandleDeleteKeyEvent(event, messageWrapper, conversation) {
    // Do something specific when up or down arrow key is pressed
    // console.log(event.key);
    switch (event.key) {
        case "ArrowLeft":
            // Left pressed
            // event.stopPropagation();
            
            break;
        case "ArrowRight":
            // Right pressed
            
            break;
        case "ArrowUp":
            break;
        case "ArrowDown":
            break;
        case "Backspace":
            event.stopPropagation();
            DeleteMessage(messageWrapper, conversation);
            break;
    }
}

export function RefreshMessageIndices()
{
    // const index = parseInt(messageDiv.getAttribute("data-index"));
    const messageWrapperElements = resultContainer.getElementsByClassName("message-wrapper");
    for (let i = 0; i < messageWrapperElements.length; i++) {
        // Update the data-index attribute with the new index
        messageWrapperElements[i].setAttribute("data-index", i);
        // console.log("index: " + i);
    }
}

export function DeleteMessage(messageWrapper, conversation) {
    console.log("deleting");
    // Get the index from the messageDiv's data-index attribute
    const index = parseInt(messageWrapper.getAttribute("data-index"));
    // Remove the message from the conversation and add one to index to ignore the system message
    conversation.splice(index + 1, 1);
    console.log("deleting index: " + index);
    // Remove the messageDiv from the DOM
    messageWrapper.parentNode.removeChild(messageWrapper);
    // After deleting the message, update the data-index attribute of the remaining messages
    RefreshMessageIndices();
}