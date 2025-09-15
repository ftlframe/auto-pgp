import { globalVars } from "./userState";
import { securePasswordStore, handleEncryptAndStoreVault } from "./vault";

let activityTimeout: NodeJS.Timeout | null = null;
const AUTO_LOCK_TIMEOUT_MS = 120_000; // 2 minutes

/**
 * Locks the vault: encrypts data if needed, then wipes credentials.
 */
export async function handleLock() {
    console.log("Locking vault...");
    try {
        // First, ATTEMPT to save the current state of the vault.
        if (securePasswordStore.getVault() && securePasswordStore.getKey()) {
            console.log("Vault is unlocked. Saving to persistent storage before locking...");
            const encryptResult = await handleEncryptAndStoreVault();
            if (!encryptResult.success) {
                // The error is already logged inside the function, but we can add context.
                console.error("Data integrity warning: The latest vault state could not be saved before locking. Recent changes may be lost.");
            }
        }
    } catch (error) {
        console.error("An unexpected error occurred during the pre-lock save operation:", error);
    } finally {
        // --- This 'finally' block ALWAYS runs, ensuring a secure state ---

        console.log("Wiping all sensitive data from memory...");

        // 1. Wipe the vault and derived key.
        await securePasswordStore.wipe();

        // 2. Wipe any other sensitive global state.
        globalVars.clearEmail();

        // 3. Clear any pending auto-lock timer.
        if (activityTimeout) {
            clearTimeout(activityTimeout);
            activityTimeout = null;
        }
        console.log("Vault locked and all credentials wiped.");
    }
    return { success: true };
}



// --- Auto-Lock Mechanisms ---

/**
 * Resets the inactivity timer that leads to an auto-lock.
 */
export function resetActivityTimer() {
    if (securePasswordStore.getKey()) { // Only run the timer if the vault is unlocked
        if (activityTimeout) {
            clearTimeout(activityTimeout);
        }
        activityTimeout = setTimeout(async () => {
            console.log("Auto-locking due to inactivity.");
            await handleLock();
        }, AUTO_LOCK_TIMEOUT_MS);
    }
}

// Option 2: Idle-based
export async function handleIdleLock(state: chrome.idle.IdleState) {
    console.log(`Idle state changed to: ${state}`);
    if (state === "locked") {
        if (securePasswordStore.getKey()) { // Check if unlocked before locking
            console.log("Auto-locking due to system idle lock.");
            await handleLock();
            // Optionally notify the user/UI
            // chrome.runtime.sendMessage({ type: "VAULT_LOCKED" }).catch(e => {});
        }
    } else if (state === "active") {
        // Optionally reset timer if using hybrid approach
        // resetActivityTimer();
    }
}

// Call resetActivityTimer() whenever there's user activity relevant to the vault
// e.g., after successful unlock, key generation, etc. Or use generic event listeners
// in index.ts like mousemove, keydown if desired (can be resource intensive).