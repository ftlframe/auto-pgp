import {
    handlePgpEncryptRequest,
    handlePgpDecryptRequest,
    handlePerformDecryption,
    storePendingDecryption,
    getPendingDecryption
} from './pgp';
import { resetActivityTimer } from './session';
import { handleUnlock, handleInit, handleEncryptAndStoreVault } from './vault';
import { handleLock } from './session';
import { handleKeyGenerate, handleGetKeys, handleDeleteKey } from './keys';
import { handleAddContact, handleGetContacts, handleDeleteContactKey } from './contacts';
import { handleSetEmail, handleGetEmail } from './userState';

// State for pending requests that need the vault to be unlocked.
let pendingEncryptionRequest: { payload: any, tabId: number } | null = null;

export function routeMessage(request: any, sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void): boolean | undefined {
    resetActivityTimer();

    switch (request.type) {
        // --- Basic Vault & User Ops ---
        case "UNLOCK":
            handleUnlock(request.payload.password).then(sendResponse);
            return true;
        case "LOCK":
            handleLock().then(sendResponse);
            return true;
        case "INIT_VAULT":
            handleInit(request.payload.password).then(sendResponse);
            return true;
        case "SET_EMAIL":
            sendResponse(handleSetEmail(request.payload.email));
            return false;
        case "GET_EMAIL":
            sendResponse(handleGetEmail());
            return false;

        // =======================================================================
        // --- Key & Contact Operations (Fully Implemented) ---
        // =======================================================================
        case "GENERATE_KEYS":
            handleKeyGenerate(request.payload.email).then(sendResponse);
            return true;
        case "GET_KEYS":
            handleGetKeys().then(sendResponse);
            return true;
        case "DELETE_KEY":
            handleDeleteKey(request.payload.keyId, request.payload.email).then(sendResponse);
            return true;
        case "ADD_CONTACT":
            handleAddContact(request.payload.currentUserEmail, request.payload.newContact).then(sendResponse);
            return true;
        case "GET_CONTACTS":
            handleGetContacts().then(sendResponse);
            return true;
        case "DELETE_CONTACT_KEY":
            handleDeleteContactKey(request.payload.currentUserEmail, request.payload.contactEmail, request.payload.keyFingerprint)
                .then(sendResponse);
            return true;
        // =======================================================================

        // --- Encryption Flow ---
        case "PGP_ENCRYPT_REQUEST":
            const senderTabId_encrypt = sender.tab?.id;
            handlePgpEncryptRequest(request.payload).then(response => {
                if (response.error === "vault_locked" && senderTabId_encrypt) {
                    pendingEncryptionRequest = { payload: request.payload, tabId: senderTabId_encrypt };
                }
                sendResponse(response);
            });
            return true;
        case "OPEN_POPUP_FOR_UNLOCK":
            chrome.action.openPopup();
            break;
        case "RETRY_PENDING_ACTION":
            if (pendingEncryptionRequest) {
                const { payload, tabId } = pendingEncryptionRequest;
                pendingEncryptionRequest = null;
                handlePgpEncryptRequest(payload).then(response => {
                    if (tabId) {
                        chrome.tabs.sendMessage(tabId, {
                            type: response.error === 'key_selection_required' ? "SHOW_SELECTION_MODAL" : "ENCRYPTION_RESULT",
                            payload: response
                        });
                    }
                });
            }
            break;

        // --- Decryption Flow ---
        case "PGP_DECRYPT_REQUEST":
            handlePgpDecryptRequest(request.payload).then(sendResponse);
            return true;

        case "OPEN_POPUP_FOR_DECRYPT":
            if (sender.tab?.id) {
                storePendingDecryption({ ...request.payload, tabId: sender.tab.id });
                chrome.action.openPopup();
            }
            break;

        case "GET_PENDING_ACTION":
            sendResponse(getPendingDecryption());
            break;

        case "PERFORM_DECRYPTION":
            const pendingInfo = getPendingDecryption();
            if (pendingInfo) {
                handlePerformDecryption(request.payload.password).then(response => {
                    // First, send the final result to the content script tab
                    if (pendingInfo.tabId) {
                        chrome.tabs.sendMessage(pendingInfo.tabId, {
                            type: "DECRYPTION_RESULT",
                            payload: response
                        });
                    }
                    // THEN, send the same response back to the popup so it can close.
                    sendResponse(response);
                });
            } else {
                // Handle the edge case where there's no pending action
                sendResponse({ success: false, error: "No pending action found." });
            }
            return true; // We are responding asynchronously.

        default:
            console.warn("Unknown message type received:", request.type);
            break;
    }
    return true;
}