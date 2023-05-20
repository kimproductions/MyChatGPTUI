javascript
//! (this code should be placed in conversationhistory.js)

// Helper function to create a file name
const createFileName = (Conversation) => {
  let fileName = Conversation[0].content.slice(0, 20);
  let counter = 1;
  while (localStorage.getItem(fileName)) {
    fileName = `${Conversation[0].content.slice(0, 20)}_${counter}`;
    counter++;
  }
  return fileName;
};

// Save conversation
const saveConversation = () => {
  const fileName = conversation.fileName || createFileName(conversation);
  conversation.fileName = fileName;
  localStorage.setItem(fileName, JSON.stringify(conversation));
  loadConversationList();
};

// Load a conversation
const loadConversationFromFile = (fileName) => {
  const storedConversation = JSON.parse(localStorage.getItem(fileName));
  conversation = storedConversation ? storedConversation : [];
  updateResultContainer(conversation);
};

// Update the result container with the loaded conversation
const updateResultContainer = (conversationArray) => {
  resultContainer.innerHTML = "";
  for (const message of conversationArray) {
    const messageDiv = document.createElement("div");
    const messageParagraph = document.createElement("p");

    messageDiv.appendChild(messageParagraph);
    messageParagraph.innerText = message.content;

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

// New Conversation Button
const newConversationBtn = document.getElementById("new-conversation-btn");
newConversationBtn.onclick = () => {
  conversation = [];
  updateResultContainer(conversation);
};

// Load conversation list on page load
window.addEventListener("DOMContentLoaded", loadConversationList);
