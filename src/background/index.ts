import { Storage } from "@plasmohq/storage";
import { routeMessage } from "./messaging";
import { handleLock, resetActivityTimer } from "./session";
import "@inboxsdk/core/background";

console.log("Background script loaded.");

// Initialize storage (consider putting this in lib/storage.ts if reused)
export const storage = new Storage({
    area: 'local'
});

// Listener for UI Connection (Popup open/close) -> Triggers auto-lock
chrome.runtime.onConnect.addListener((port) => {
    if (port.name === "vault-ui") {
        console.log("Vault popup opened");
        port.onDisconnect.addListener(() => {
            console.log("Vault popup closed, resetting activity timer");
            resetActivityTimer();
        });
    }
});

// Central Message Listener -> Delegates to the router
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // Delegate handling to the router function
    // Return true inside routeMessage if the response is async
    return routeMessage(request, sender, sendResponse);
});