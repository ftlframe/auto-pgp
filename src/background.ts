let currentEmail: string | null = null;


chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
    if (message.type === "EMAIL_UPDATE") {
        currentEmail = message.email;
        console.log(`Email updated to: ${currentEmail}`);
    } else if (message.type === "GET_EMAIL") {
        sendResponse({ email: currentEmail });
    } else if (message.type === 'GET_VAULT') {
        const data = await chrome.storage.local.get('keyring');
        
        if(Object.keys(data).length == 0){
            sendResponse({vault: {keyring: {}}})
        }
        else {
            console.log(data)
            sendResponse({vault: data})
        }
    }
});