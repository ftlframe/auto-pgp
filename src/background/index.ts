import { Storage } from "@plasmohq/storage";
import { routeMessage } from "./messaging";
import { handleLock } from "./session";

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
            console.log("Vault popup closed");
            handleLock().catch((err) => console.error("Failed to auto-lock vault:", err));
        });
    }
});

// Central Message Listener -> Delegates to the router
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // Delegate handling to the router function
    // Return true inside routeMessage if the response is async
    return routeMessage(request, sender, sendResponse);
});

// TODO: Add idle listener registration if implementing auto-lock via idle
// import { handleIdleLock } from "./session";
// chrome.idle.onStateChanged.addListener(handleIdleLock);

// TODO: Add activity listener registration if implementing auto-lock via timer
// import { resetActivityTimer } from "./session";
// document.addEventListener('mousemove', resetActivityTimer); // Or other activity events