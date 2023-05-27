export const showLoadingSign = (conversationIndex) => {
    const loadingSign = document.querySelector(`.conversation-btn-wrapper[data-convo-index="${conversationIndex}"] .loading-sign`);
    loadingSign.style.display = 'block';
}

// Hide the loading sign
export const hideLoadingSign = (conversationIndex) => {
    const loadingSign = document.querySelector(`.conversation-btn-wrapper[data-convo-index="${conversationIndex}"] .loading-sign`);
    loadingSign.style.display = 'none';
}