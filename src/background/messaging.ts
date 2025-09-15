import { handlePgpEncryptRequest } from './pgp';
import { resetActivityTimer } from './session';
import { handleUnlock, handleInit, handleEncryptAndStoreVault } from './vault';
import { handleLock } from './session';
import { handleKeyGenerate, handleGetKeys, handleDeleteKey } from './keys';
import { handleAddContact, handleGetContacts, handleDeleteContactKey } from './contacts';
import { handleSetEmail, handleGetEmail } from './userState';

let pendingRequestInfo: { payload: any, tabId: number } | null = null;

export function routeMessage(request: any, sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void): boolean | undefined {
    resetActivityTimer();

    switch (request.type) {
        // --- Basic Vault Ops ---
        case "UNLOCK":
            handleUnlock(request.payload.password).then(sendResponse);
            return true;

        case "LOCK":
            handleLock().then(sendResponse);
            return true;

        case "INIT_VAULT":
            handleInit(request.payload.password).then(sendResponse);
            return true;
        
        case "ENCRYPT_STORE_VAULT":
            handleEncryptAndStoreVault().then(sendResponse);
            return true;

        // --- User State (Email) ---
        case "SET_EMAIL":
            sendResponse(handleSetEmail(request.payload.email));
            return false;

        case "GET_EMAIL":
            sendResponse(handleGetEmail());
            return false;

        // --- Key Operations ---
        case "GENERATE_KEYS":
            handleKeyGenerate(request.payload.email).then(sendResponse);
            return true;

        case "GET_KEYS":
            handleGetKeys().then(sendResponse);
            return true;

        case "DELETE_KEY":
            handleDeleteKey(request.payload.keyId, request.payload.email).then(sendResponse);
            return true;

        // --- Contact Operations ---
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
        
        // --- Content Script & Retry Flow ---
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
                const { payload, tabId } = pendingRequestInfo;
                pendingRequestInfo = null;

                console.log(`[Background] Retrying encryption for tab ${tabId}.`);
                handlePgpEncryptRequest(payload)
                    .then(response => {
                        console.log("[Background] Retry finished. Sending result to tab:", response);
                        if (tabId) {
                            if (response.error === 'key_selection_required') {
                                chrome.tabs.sendMessage(tabId, { type: "SHOW_SELECTION_MODAL", payload: response.payload });
                            } else {
                                chrome.tabs.sendMessage(tabId, { type: "ENCRYPTION_RESULT", payload: response });
                            }
                        }
                    });
            } else {
                console.log("[Background] No pending action to retry.");
            }
            break;
        
        default:
            console.warn("Unknown message type received:", request.type);
            sendResponse({ success: false, error: `Unknown message type: ${request.type}` });
            return false;
    }
    return undefined;
}