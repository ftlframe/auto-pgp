import {
    handlePgpEncryptRequest,
    handlePgpDecryptRequest,
} from './pgp';
import { resetActivityTimer } from './session';
import { handleUnlock, handleInit, handleEncryptAndStoreVault } from './vault';
import { handleLock } from './session';
import { handleKeyGenerate, handleGetKeys, handleDeleteKey } from './keys';
import { handleAddContact, handleGetContacts, handleDeleteContactKey } from './contacts';
import { handleSetEmail, handleGetEmail } from './userState';
import { securePasswordStore } from './vault';

// A single variable to hold any action that is pending an unlock.
let pendingActionInfo: { type: 'encrypt' | 'decrypt', payload: any, tabId: number } | null = null;

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
            handleGetEmail().then(sendResponse);
            return true;


        // =======================================================================
        // --- Key & Contact Operations (Fully Implemented) ---
        // =======================================================================
        case "GENERATE_KEYS":
            handleKeyGenerate(request.payload).then(sendResponse);
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

        case "PGP_ENCRYPT_REQUEST":
            handlePgpEncryptRequest(request.payload).then(response => {
                if (response.error === "vault_locked" && sender.tab?.id) {
                    pendingActionInfo = { type: 'encrypt', payload: request.payload, tabId: sender.tab.id };
                }
                sendResponse(response);
            });
            return true;

        case "PGP_DECRYPT_REQUEST":
            handlePgpDecryptRequest(request.payload).then(response => {
                if (response.error === "vault_locked" && sender.tab?.id) {
                    pendingActionInfo = { type: 'decrypt', payload: request.payload, tabId: sender.tab.id };
                }
                sendResponse(response);
            });
            return true;

        case "PROMPT_USER_UNLOCK":
            chrome.action.openPopup();
            break;

        case "RETRY_PENDING_ACTION":
            if (pendingActionInfo) {
                const { type, payload, tabId } = pendingActionInfo;
                pendingActionInfo = null; // Clear the pending action

                if (type === 'encrypt') {
                    handlePgpEncryptRequest(payload).then(response => {
                        chrome.tabs.sendMessage(tabId, {
                            type: response.error === 'key_selection_required' ? "SHOW_SELECTION_MODAL" : "ENCRYPTION_RESULT",
                            payload: response
                        });
                    });
                } else if (type === 'decrypt') {
                    // Re-run the now-powerful decrypt request. It will succeed this time.
                    handlePgpDecryptRequest(payload).then(response => {
                        chrome.tabs.sendMessage(tabId, { type: "DECRYPTION_RESULT", payload: response });
                    });
                }
            }
            break;

        // NOTE: GET_PENDING_ACTION and PERFORM_DECRYPTION are REMOVED.

        default:
            console.warn("Unknown message type received:", request.type);
            break;
    }
    return true;
}