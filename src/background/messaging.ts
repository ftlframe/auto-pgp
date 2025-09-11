// Import all handler functions
import { handleUnlock, handleInit, handleEncryptAndStoreVault } from './vault';
import { handleLock, resetActivityTimer } from './session';
import { handleKeyGenerate, handleGetKeys, handleDeleteKey } from './keys';
import { handleAddContact, handleGetContacts, handleDeleteContact } from './contacts';
import { handleSetEmail, handleGetEmail, handleGmailEmailDetected } from './userState';
import { handlePgpEncryptRequest } from './pgp';
// Import resetActivityTimer if using timeout-based auto-lock and want to reset on activity
// import { resetActivityTimer } from './session';


let pendingRequestInfo: { payload: any, tabId: number } | null = null;

export function routeMessage(request: any, sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void): boolean | undefined {
    // console.log("Received message:", request.type, "Payload:", request.payload || request);

    // If using activity timer, reset it on any relevant message
    resetActivityTimer();

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
        // It's meant to "save current vault state"
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
            handleDeleteKey(request.keyId, request.email).then(sendResponse);
            return true;

        /**
         * ==================
         * Contact Operations
         * ==================
         */
        case "ADD_CONTACT":
            handleAddContact(request.payload.currentUserEmail, request.payload.newContact).then(sendResponse);
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

        case "OPEN_POPUP_FOR_UNLOCK":
            console.log("[Background] Received request from content script to open popup.");
            chrome.action.openPopup();
            break;

        case "PGP_ENCRYPT_REQUEST":
            const senderTabId = sender.tab?.id;
            handlePgpEncryptRequest(request.payload).then(response => {
                if (response.error === "vault_locked" && senderTabId) {
                    console.log(`[Background] Vault is locked. Storing pending request from tab ${senderTabId}.`);
                    pendingRequestInfo = { payload: request.payload, tabId: senderTabId };
                }
                sendResponse(response);
            });
            return true;

        case "RETRY_PENDING_ACTION":
            console.log("[Background] Received RETRY_PENDING_ACTION from popup.");
            if (pendingRequestInfo) {
                // We use the tabId we saved from the ORIGINAL request.
                // The sender of THIS message is the popup, which has no tab.
                const { payload, tabId } = pendingRequestInfo;
                pendingRequestInfo = null; // Clear the pending request

                console.log(`[Background] Retrying encryption for tab ${tabId}.`);
                handlePgpEncryptRequest(payload)
                    .then(response => {
                        console.log("[Background] Retry finished. Sending result to tab:", response);
                        // Check if the saved tabId is valid before sending.
                        if (tabId) {
                            chrome.tabs.sendMessage(tabId, {
                                type: "ENCRYPTION_RESULT",
                                payload: response
                            });
                        }
                    });
            } else {
                console.log("[Background] No pending action to retry.");
            }
            // This message from the popup does not need a response back to the popup.
            break;

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