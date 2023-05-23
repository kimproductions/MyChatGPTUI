import { saveConversation } from "./savingConversation.js";


export const resultContainer = document.getElementById("result-container");


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

export function CreateMessageElement(role, content, conversation) {
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

    messageDiv.setAttribute("tabindex", "0");
    // messageDiv.setAttribute("data-index", index);
    messageDiv.addEventListener("click", function () {
        // this.focus();
        console.log("focusing: " + this);
    });
    messageDiv.addEventListener("keydown", function (event) {
        HandleDeleteKeyEvent(event, messageWrapper, conversation);
    });
    resultContainer.appendChild(messageWrapper);

    deleteButton.addEventListener("click", () => DeleteMessage(messageWrapper, conversation));
    editButton.addEventListener("click", () => StartEditingMessage(messageParagraph, conversation, editButton, messageWrapper));


    RefreshMessageIndices();

    return messageDiv;
}

export function StartEditingMessage(messageElement, conversation, editButton, messageWrapper) {
    const messageDiv = messageElement.parentNode;
    let textArea = messageDiv.querySelector("textarea"); // Check if there's a textarea

    if (!textArea) { // If textarea is not present, create and append it
        textArea = document.createElement("textarea");
        textArea.classList.add("edit-textarea");
        messageDiv.appendChild(textArea);

        textArea.addEventListener("keydown", (event) => {
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

    }

    // Update textarea value and show it
    textArea.value = messageElement.innerText;
    textArea.style.display = "block";
    textArea.style.height = 'auto';
    textArea.style.height = textArea.scrollHeight + 'px';

    // Hide message element and edit button
    messageElement.style.display = "none";
    editButton.style.display = "none";
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
    saveConversation(conversation);
}

export function HandleDeleteKeyEvent(event, messageWrapper, conversation) {
    event.stopPropagation();
    // Do something specific when up or down arrow key is pressed
    console.log(event.key);
    switch (event.key) {
        case "ArrowLeft":
            // Left pressed
            scrollTo(true, false);
            break;
        case "ArrowRight":
            // Right pressed
            scrollTo(false, false);
            break;
        case "ArrowUp":
            // Up pressed
            console.log("scrolllgin up");
            event.preventDefault();
            messageWrapper.previousElementSibling.focus({
                preventScroll: false
            });
            const scrollAmount = messageWrapper.previousElementSibling.offsetTop;
            resultContainer.scrollTop = scrollAmount;

            break;
        case "ArrowDown":
            // Down pressed

            event.preventDefault();
            // messageDiv
            messageWrapper.nextElementSibling.focus({
                preventScroll: false
            });
            const scrollAmount1 = messageWrapper.nextElementSibling.offsetTop;
            resultContainer.scrollTop = scrollAmount1;

            break;
        case "Backspace":
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
    resultContainer.removeChild(messageWrapper);
    // Save the updated conversation
    saveConversation(conversation);
    // After deleting the message, update the data-index attribute of the remaining messages
    RefreshMessageIndices();
}