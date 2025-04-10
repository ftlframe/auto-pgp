// Import all handler functions
import { handleUnlock, handleInit, handleEncryptAndStoreVault } from './vault';
import { handleLock } from './session';
import { handleKeyGenerate, handleGetKeys, handleDeleteKey } from './keys';
import { handleAddContact, handleGetContacts, handleDeleteContact } from './contacts';
import { handleSetEmail, handleGetEmail, handleGmailEmailDetected } from './userState';
// Import resetActivityTimer if using timeout-based auto-lock and want to reset on activity
// import { resetActivityTimer } from './session';

// Placeholder for PGP Encrypt Request Handler
async function handlePgpEncryptRequest(payload: { recipients: string[], content: string }) {
    console.log("PGP_ENCRYPT_REQUEST received");
    console.log("Recipients:", payload.recipients);
    console.log("Content:", payload.content);
    // TODO: Implement actual PGP encryption logic using recipient public keys
    // This will involve:
    // 1. Getting the sender's key pair (handle potential need for decryption password).
    // 2. Getting recipient public keys (from vault contacts or elsewhere).
    // 3. Calling an OpenPGP library function to encrypt and sign.
    return { success: false, error: "PGP encryption not implemented yet." };
}


export function routeMessage(request: any, sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void): boolean | undefined {
    // console.log("Received message:", request.type, "Payload:", request.payload || request);

    // If using activity timer, reset it on any relevant message
    // resetActivityTimer(); // Be selective about which messages reset the timer

    switch (request.type) {
        /**
         * ==================
         * Basic Vault Ops
         * ==================
         */
        case "UNLOCK":
            handleUnlock(request.password).then(sendResponse);
            return true; // Indicates asynchronous response

        case "LOCK":
            handleLock().then(sendResponse);
            return true;

        case "INIT_VAULT":
            handleInit(request.password).then(sendResponse);
            return true;

        // Note: ENCRYPT_DATA might be better handled internally by LOCK or auto-save
        // If it's meant for encrypting *arbitrary* data with the vault key, reconsider security.
        // Assuming it meant "save current vault state"
        case "ENCRYPT_STORE_VAULT": // Renamed for clarity
            handleEncryptAndStoreVault().then(sendResponse);
            return true;

        /**
         * =================
         * User State (Email)
         * =================
         */
        case "SET_EMAIL":
            // Use synchronous return if the handler is sync
            sendResponse(handleSetEmail(request.payload.email));
            return false; // Sync response

        case "GET_EMAIL":
            sendResponse(handleGetEmail());
            return false; // Sync response


        /**
         * ==================
         * Key Operations
         * ==================
         */
        case "GENERATE_KEYS":
            // Pass email from payload if present
            handleKeyGenerate(request.email).then(sendResponse);
            return true;

        case "GET_KEYS":
            // Pass optional email filter
            handleGetKeys(request.email).then(sendResponse);
            return true;

        case "DELETE_KEY":
            handleDeleteKey(request.email, request.keyId).then(sendResponse);
            return true;

        /**
         * ==================
         * Contact Operations
         * ==================
         */
        case "ADD_CONTACT":
            handleAddContact(request.email, request.contact).then(sendResponse);
            return true;

        case "GET_CONTACTS":
            handleGetContacts(request.email).then(sendResponse);
            return true;

        case "DELETE_CONTACT":
            handleDeleteContact(request.email, request.contactId).then(sendResponse);
            return true;

        /**
         * ==================
         * Content Script Messages
         * ==================
         */
        case "GMAIL_EMAIL_DETECTED":
            // This usually doesn't need a response back to the content script
            handleGmailEmailDetected(request.email);
            // No return true needed if no sendResponse is called
            break; // Exit switch

        case "PGP_ENCRYPT_REQUEST":
            handlePgpEncryptRequest(request.payload).then(sendResponse);
            return true;

        /**
         * ==================
         * Default / Unknown
         * ==================
         */
        default:
            console.warn("Unknown message type received:", request.type);
            // Optionally send an error response
            sendResponse({ success: false, error: `Unknown message type: ${request.type}` });
            return false; // Indicate synchronous handling (or no response)
    }

    // Return undefined or false if sendResponse wasn't called asynchronously
    return undefined;
}