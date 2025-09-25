// Manages volatile user state, like the currently detected email

export const globalVars = {
    _email: "",

    getEmail(): string {
        return this._email;
    },

    setEmail(email: string): void {
        if (typeof email === 'string') {
            this._email = email;
            console.log(`User email state set to: ${email}`);
        } else {
            console.warn("Attempted to set non-string email:", email);
        }
    },

    clearEmail(): void {
        this._email = "";
        console.log("User email state cleared.");
    }
};

// --- HANDLERS WITH VERBOSE LOGGING ---

export function handleSetEmail(email: string) {
    console.groupCollapsed("[UserState] handleSetEmail");
    console.log("Received email to set:", email);
    globalVars.setEmail(email);
    console.groupEnd();
    return { success: true };
}

export async function handleGetEmail() {
    console.groupCollapsed("[UserState] handleGetEmail");
    let email = globalVars.getEmail();

    if (email) {
        console.log("Returning email from memory:", email);
        console.groupEnd();
        return { success: true, email: email };
    }

    // If email is not in memory, try to get it from an active Gmail tab
    console.log("Email not in memory, querying active content script...");
    try {
        const tabs = await chrome.tabs.query({ url: "https://mail.google.com/*", active: true, currentWindow: true });

        if (tabs.length > 0 && tabs[0].id) {
            const response = await chrome.tabs.sendMessage(tabs[0].id, { type: "REQUEST_EMAIL_ADDRESS" });
            if (response && response.email) {
                console.log("Successfully recovered email from content script:", response.email);
                globalVars.setEmail(response.email);
                console.groupEnd();
                return { success: true, email: response.email };
            }
        }

        console.warn("Could not find an active Gmail tab to recover email from.");
        console.groupEnd();
        return { success: true, email: "" }; // Fail gracefully
    } catch (error) {
        console.error("Failed to query content script for email:", error.message);
        console.groupEnd();
        return { success: true, email: "" }; // Fail gracefully
    }
}

export function handleGmailEmailDetected(email: string) {
    console.groupCollapsed("[UserState] handleGmailEmailDetected (from content script)");
    console.log("Detected email:", email);
    globalVars.setEmail(email);
    console.groupEnd();
}