import { createContext, useContext, useEffect, useReducer, useState } from "react";
import type { Contact, Vault } from "~types/vault";
import { Storage } from "@plasmohq/storage"
import { error } from "console";
import { decrypt, deriveKey, encrypt, generateSalt } from "~lib/crypto/vault";

export const VaultContext = createContext<{
    isUnlocked: boolean | null,
    unlockVault: (password: string) => Promise<void>;
    lockVault: (password: string) => Promise<void>;
    initVault: (password: string) => Promise<void>;
    generatePair: (name: string, email: string) => Promise<void>;
}>({
    isUnlocked: null,
    unlockVault: () => {
        return null;
    },
    lockVault: () => {
        return null
    },
    initVault: () => {
        return null
    },
    generatePair: () => {
        return null
    },
})

/**
 * All crypto is done on background worker
 * The UI has no way to see the decrypted vault.
 */
export default function VaultProvider({ children }) {

    /**
     * Basically a `chrome.runtime.sendMessage` wrapper function
     * @param type Message type
     * @param data Data thats sent to the background ie. passwords etc...
     * @returns `chrome.runtime.sendMessage`
     */
    const sendToBackground = async <T,>(type: string, data?: any): Promise<T> => {
        return chrome.runtime.sendMessage({ type, ...data })
    }


    // Lock state of vault and salt
    const [isUnlocked, setIsUnlocked] = useState(false);
    const [isFirstTime, setIsFirstTime] = useState(true);

    /**
     * Used to initialize the vault on first start...
     * We try to fetch the vault and if it's already initialized our work is done...
     */
    const initVault = async (password: string) => {
        try {
            // Type the response according to what handleInit returns
            const response = await sendToBackground<{
                success: boolean;
                error?: string;
            }>("INIT_VAULT", { password });

            if (!response.success) {
                throw new Error(response.error || "Vault initialization failed");
            }

            setIsFirstTime(false);
            setIsUnlocked(true);

            localStorage.setItem('first_time', 'false')
            console.log("Vault initialized successfully");
        } catch (error) {
            console.error("Vault initialization error:", error);
        }
    }


    /**
     * Unlocks the vault using AES-GCM with `iv` decoded from the stored base64
     * @param password plaintext password that gets derived with a salt that's stored in Plasmo storage
     */
    const unlockVault = async (password: string) => {
        try {
            // We derive the key with salt that we store in state
            // We get the base64 ciphertext JSON vault and the iv needed for AES-CBC
            const response = await sendToBackground<{
                success: boolean;
                error?: string;
                vault?: string;
            }>("UNLOCK", { password });
            console.log(response.error)

            setIsUnlocked(true);
        } catch (error) {
            console.log(error)
        }
    }

    /**
     * Sends a message to the background worker to lock the vault.
     * The background worker handles the storage and encryption.
     * @param password plaintext password that gets derived with a salt that's stored in Plasmo storage 
     */
    const lockVault = async (password: string) => {
        try {


            setIsUnlocked(false);
        } catch (error) {
            console.log(error)
        }
    }

    const generatePair = async (name: string, email: string) => {
        try {
            const response = await sendToBackground<{
                success: boolean;
            }>('GENERATE_KEYS', { name, email });


        }
        catch (error) {
            console.log(error)
        }
    }

    useEffect(() => {
        const port = chrome.runtime.connect({ name: "vault-ui" });
        console.log('Opening port')

    }, [])

    const vault = {
        isUnlocked,         // Helper state for child component rendering
        unlockVault,        // Function that unlocks the vault (the encrypted vault is stored in Base64 in memory)
        lockVault,          // Function that locks the vault (stores the IV and encrypted vault in Base64 in memory)
        initVault,          // Function that initializes the vault in local memory so that it gets destroyed if we destroy the window from the render tree
        generatePair
    }

    return (
        <VaultContext.Provider value={vault}>
            {children}
        </VaultContext.Provider>
    );
}

export const useVault = () => {
    return useContext(VaultContext);
}