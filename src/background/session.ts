import { securePasswordStore, handleEncryptAndStoreVault } from "./vault";
import { globalVars } from "./userState";

let activityTimeout: NodeJS.Timeout | null = null;
const AUTO_LOCK_TIMEOUT_MS = 120_000; // 2 minutes

/**
 * Locks the vault: encrypts data if needed, then wipes credentials.
 */
export async function handleLock() {
    console.log("Locking vault...");
    if (securePasswordStore.getKey() && securePasswordStore.getVault()) {
        // Only encrypt if unlocked and vault loaded
        const encryptResult = await handleEncryptAndStoreVault();
        if (!encryptResult.success) {
            console.error("Failed to encrypt vault before locking:", encryptResult.error);
            // Decide if you should proceed with wipe or not. Wiping is safer.
        }
    } else {
        console.log("Vault already locked or not loaded, wiping credentials only.");
    }
    await securePasswordStore.wipe();
    globalVars.clearEmail(); // Also clear email on lock
    clearTimeout(activityTimeout as NodeJS.Timeout); // Clear timer on manual lock
    activityTimeout = null;
    console.log("Vault locked and credentials wiped.");
    return { success: true };
}


// --- Auto-Lock Mechanisms ---

// Option 1: Timeout-based
export function resetActivityTimer() {
    if (securePasswordStore.getKey()) { // Only reset timer if unlocked
        clearTimeout(activityTimeout as NodeJS.Timeout);
        activityTimeout = setTimeout(async () => {
            console.log("Auto-locking due to inactivity.");
            await handleLock();
            // Optionally notify the user/UI
            // chrome.runtime.sendMessage({ type: "VAULT_LOCKED" }).catch(e => {});
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