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

// Message handler logic specific to email state
export function handleSetEmail(email: string) {
    console.log('Handling SET_EMAIL request');
    globalVars.setEmail(email);
    // Typically, SET operations might not need a response,
    // but return success if the frontend expects it.
    return { success: true };
}

export function handleGetEmail() {
    console.log('Handling GET_EMAIL request');
    const email = globalVars.getEmail();
    console.log(`Returning email: ${email}`);
    return { success: true, email: email };
}

// Logic for handling email detected from content script
export function handleGmailEmailDetected(email: string) {
    console.log(`Email detected from content script: ${email}`);
    globalVars.setEmail(email);
    // No response needed for this type of message usually
} 