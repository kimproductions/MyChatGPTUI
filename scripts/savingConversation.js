import { resultContainer, CreateMessageElement } from './messageElement.js';

const convoNameLength = 30;


export const highlightConvoButton = (selectedFileName) => {
    // Clear previous outlines
    const convoButtons = document.querySelectorAll(".convo-btn");
    convoButtons.forEach((btn) => {
        btn.classList.remove("outlined");
    });

    // Outline currently selected button
    const selectedButton = document.getElementById(`convo-btn-${selectedFileName}`);
    if (selectedButton) {
        selectedButton.classList.add("outlined");
    }
};

export const loadConversationList = (conversation) => {
  const conversationHistory = document.getElementById("conversation-history");
  conversationHistory.innerHTML = "";

  for (let i = 0; i < localStorage.length; i++) {
    const conversationName = localStorage.key(i);
    const newConversationDiv = document.createElement("div");
    newConversationDiv.classList.add("conversation");

    const convoBtn = document.createElement("button");
    convoBtn.classList.add("convo-btn");
    convoBtn.innerText = conversationName;
    convoBtn.id = `convo-btn-${conversationName}`; // Set the id for a convoBtn element
      convoBtn.onclick = () => loadConversationFromFile(conversationName, conversation);
    newConversationDiv.appendChild(convoBtn);

    const deleteConvoBtn = document.createElement("button");
    deleteConvoBtn.classList.add("delete-convo-btn");
    deleteConvoBtn.innerText = "X";
    deleteConvoBtn.onclick = () => {
      localStorage.removeItem(conversationName);
        loadConversationList(conversation);
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
          loadConversationList(conversation);
      }
    };
    newConversationDiv.appendChild(renameConvoBtn);

    conversationHistory.appendChild(newConversationDiv);
  }
};

// Load a conversation
export function loadConversationFromFile(fileName, conversation) {
    const storedConversation = JSON.parse(localStorage.getItem(fileName));
    console.log(storedConversation);
    conversation = storedConversation ? storedConversation : [];
    conversation.fileName = fileName; // Add this line to set the fileName property when loading a stored conversation
    updateResultContainer(conversation);
    highlightConvoButton(fileName);
};

export const createFileName = (Conversation) => {

    let fileName = 'Conversation';
    if (Conversation.length > 0) {
        const content = removeHTMLTags(Conversation[1].content);
        fileName = content.length <= convoNameLength ? content : content.slice(0, convoNameLength);
    } else {
        filename = "Empty Conversation";
    }


    let counter = 1;
    while (localStorage.getItem(fileName)) {
        const newContent = removeHTMLTags(Conversation[1].content);
        fileName = newContent.length <= convoNameLength ? `${newContent}_${counter}` : `${newContent.slice(0, convoNameLength)}_${counter}`;
        counter++;
    }
    return fileName;
};

// Save conversation
export const saveConversation = (conversation) => {
    if (conversation.fileName) {
        // Update the existing conversation file
        localStorage.setItem(conversation.fileName, JSON.stringify(conversation));
    } else {
        // Create a new conversation file
        const fileName = createFileName(conversation);
        conversation.fileName = fileName;
        localStorage.setItem(fileName, JSON.stringify(conversation));
    }
    loadConversationList(conversation);
    highlightConvoButton(conversation.fileName);
};

// Update the result container with the loaded conversation
export function updateResultContainer(conversationArray) {
    resultContainer.innerHTML = "";
    for (let i = 0; i < conversationArray.length; i++) {
        if (conversationArray[i].role !== "system") {
            CreateMessageElement(conversationArray[i].role, conversationArray[i].content, conversationArray);
        }
    }
};

const removeHTMLTags = (text) => {
    return text.replace(/(<([^>]+)>)/gi, "");
};