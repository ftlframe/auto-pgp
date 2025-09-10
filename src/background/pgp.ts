import { globalVars } from "./userState";
import { securePasswordStore } from "./vault";

// Placeholder for PGP Encrypt Request Handler
export async function handlePgpEncryptRequest(payload: { recipients: string[], content: string }) {
    console.log("PGP_ENCRYPT_REQUEST received");
    console.log("Recipients:", payload.recipients);
    console.log("Content:", payload.content);
    
    let selectionsNeeded = {
        userKeyOptions: [],
        recepientKeyOptions: {},
        newContacts: [],
    }

    console.log(securePasswordStore.getVault());
}