import { createContext, useContext, useEffect, useReducer, useState } from "react";
import type { Contact, Vault } from "~types/vault";
import { Storage } from "@plasmohq/storage"
import { error } from "console";
import { decrypt, deriveKey, encrypt, generateSalt } from "~lib/crypto/pgp";

export const VaultContext = createContext<{
    vault: Vault | null;
    isUnlocked: boolean | null,
    setMasterPassword: (password: string) => Promise<void>;
    unlockVault: (password: string) => Promise<void>;
    lockVault: (password: string) => Promise<void>;
    initVault: (storage: Storage) => Promise<void>;
}>({
    vault: null,
    isUnlocked: null,
    setMasterPassword: () => {
        return null
    },
    unlockVault: () => {
        return null;
    },
    lockVault: () => {
        return null
    },
    initVault: () => {
        return null
    },

})


export default function VaultProvider({ children }) {
    // Plasmo storage API
    const storage = new Storage();

    // Lock state of vault and salt
    const [ isUnlocked, setIsUnlocked ] = useState(false);
    const [ salt, setSalt ] = useState("")
    /**
     * Used to initialize the vault on first start...
     * We try to fetch the vault and if it's already initialized our work is done...
     */
    const initVault = async () => {
        try {
            const vault = await storage.get('vault');
            if (vault) {
                console.log('Vault already initialized');
                return;
            }
            await storage.set('vault', {
                keyPairs: [],
                contacts: [],
            });

            setIsUnlocked(true);
            
            console.log('[INFO] Initialized vault!')
        }
        catch (error) {
            console.log(error);
        }
    }



    /**
     * Generates a salt and stores it in Plasmo storage using the Plasmo storage API.
     * @param password The plaintext password from the password input field.
     */
    const setMasterPassword = async (password: string) => {
        try {
            // We use a middleware function to generate the salt once and we store it afterwards...
            const salt = generateSalt();
            await storage.set('salt', salt)
            setIsUnlocked(true);
            setSalt(salt)

        }
        catch (error) {
            console.log(error);
        }
    }

    /**
     * Unlocks the vault using AES-CBC with iv decoded from the stored base64
     * @param password plaintext password that gets derived with a salt that's stored in Plasmo storage
     */
    const unlockVault = async (password: string) => {
        try {
            // We derive the key with salt that we store in state
            // We get the base64 ciphertext JSON vault and the iv needed for AES-CBC
            const derivedKey = await deriveKey(password, salt);
            const ciphertextBase64 = await storage.get('vault');
            const ivBase64 = await storage.get('ivBase64');

            await storage.set('vault', JSON.parse(await decrypt(derivedKey, ivBase64, ciphertextBase64)));
            setIsUnlocked(true)      
        } catch (error) {
            console.log(error)
        }
    }
    /**
     * Locks the vault and sends the user to the login screen.
     * Stores the encrypted vault in place of the decrypted vault.
     * The default encryption algorithm is AES in CBC mode.
     * @param password plaintext password that gets derived with a salt that's stored in Plasmo storage 
     */
    const lockVault = async (password: string) => {
        try {
            // We fetch the vault, derive the key and encrypt the vault
            // Store the iv (needed for AES-CBC) and vault in base64
            const vault = await storage.get('vault')

            const derivedKey = await deriveKey(password, salt)

            const encryptedObj = await encrypt(derivedKey, vault)

            await storage.set('ivBase64', encryptedObj.iv)
            await storage.set('vault', encryptedObj.ciphertext)


            setIsUnlocked(false);
        } catch (error) {
            console.log(error)
        }
    }

    useEffect(() => {
        initVault()
    }, [])

    const vault = {
        vault: null,
        isUnlocked,
        unlockVault,
        lockVault,
        setMasterPassword,
        initVault,
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