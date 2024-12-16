let currentEmail: string | null = null;


chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
    if (message.type === "EMAIL_UPDATE") {
        currentEmail = message.email;
        console.log(`Email updated to: ${currentEmail}`);
    } else if (message.type === "GET_EMAIL") {
        sendResponse({ email: currentEmail });
    } else if (message.type === 'GET_PUB_KEYS') {
        const data = await chrome.storage.local.get('keyring');
        const keyring = data.keyring || {};
        const pub_keys = keyring[message.id]?.pub_keys || [];
        console.log(message.id)
        console.log(pub_keys)
        sendResponse({public: pub_keys})
    }
});