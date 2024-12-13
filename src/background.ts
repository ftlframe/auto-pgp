let currentEmail: string | null = null;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "EMAIL_UPDATE") {
        currentEmail = message.email;
        console.log(`Email updated to: ${currentEmail}`);
    } else if (message.type === "GET_EMAIL") {
        sendResponse({ email: currentEmail });
    }
});