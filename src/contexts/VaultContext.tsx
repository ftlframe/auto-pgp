import { createContext, useContext, useEffect, useState, useCallback } from "react";
import type { Contact, PublicKeyInfo } from "~types/vault";
import { Storage } from "@plasmohq/storage";
import type { AppSettings } from "./SettingsContent";

type NewContactData = { name: string, email: string, publicKeyArmored: string };
type UnlockResult = { success: boolean; error?: string; };

export const VaultContext = createContext<{
  isUnlocked: boolean | null;
  isLoading: boolean;
  email: string | null;
  userKeys: PublicKeyInfo[] | null;
  contacts: Contact[];
  attemptLogin: (password: string) => Promise<UnlockResult>;
  lockVault: () => Promise<void>;
  generatePair: (passphrase: string, settings?: Partial<AppSettings>) => Promise<void>;
  getEmail: () => Promise<void>;
  getKeys: () => Promise<void>;
  deleteKey: (keyID: string) => Promise<void>;
  getContacts: () => Promise<Contact[]>;
  addContact: (contact: NewContactData) => Promise<any>;
  deleteContactKey: (contactEmail: string, keyFingerprint: string) => Promise<any>;
  debugDumpVault: () => void;
  decryptManual: (armoredMessage: string, senderEmail: string) => Promise<any>;
}>({
  isUnlocked: null, isLoading: true, email: null, userKeys: null, contacts: [],
  attemptLogin: async () => ({ success: false, error: "Not implemented" }),
  lockVault: async () => { },
  generatePair: async () => { },
  getEmail: async () => { },
  getKeys: async () => { },
  deleteKey: async () => { },
  getContacts: async () => [],
  addContact: async () => { },
  deleteContactKey: async () => { },
  debugDumpVault: () => { },
  decryptManual: async () => ({ success: false, error: "Not implemented" }),
});

const storage = new Storage();

export default function VaultProvider({ children }) {
  const sendToBackground = async <T,>(type: string, data?: any): Promise<T> => {
    return chrome.runtime.sendMessage({ type, ...data });
  };

  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [userKeys, setUserKeys] = useState<PublicKeyInfo[] | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);

  const getEmail = useCallback(async () => {
    const response = await sendToBackground<{ success: boolean, email: string }>("GET_EMAIL");
    if (response.success) setEmail(response.email);
  }, []);

  const getKeys = useCallback(async () => {
    const response = await sendToBackground<{ success: boolean, keys: PublicKeyInfo[] }>("GET_KEYS");
    if (response.success) setUserKeys(response.keys);
  }, []);

  const getContacts = useCallback(async (): Promise<Contact[]> => {
    const response = await sendToBackground<{ success: boolean, contacts: Contact[] }>("GET_CONTACTS");
    if (response.success) {
      setContacts(response.contacts);
      return response.contacts;
    }
    return [];
  }, []);

  const attemptLogin = useCallback(async (password: string): Promise<UnlockResult> => {
    setIsLoading(true);
    let response: UnlockResult = { success: false, error: "An unknown error occurred." };
    try {
      response = await sendToBackground<UnlockResult>("ATTEMPT_LOGIN", { payload: { password } });
      if (response.success) {
        setIsUnlocked(true);
        // The rest of your data fetching logic
        await Promise.all([getEmail(), getKeys(), getContacts()]);
        chrome.runtime.sendMessage({ type: "RETRY_PENDING_ACTION" });
      }
    } catch (error) {
      console.error("-> Login attempt error:", error);
      response.error = error.message;
    } finally {
      setIsLoading(false);
    }
    return response;
  }, [getEmail, getKeys, getContacts, sendToBackground]);

  const lockVault = useCallback(async () => {
    await sendToBackground("LOCK");
    setIsUnlocked(false);
  }, []);

  const generatePair = useCallback(async (passphrase?: string, settings?: Partial<AppSettings>) => {
    console.log("Requesting key pair generation with settings:", settings);
    const response = await sendToBackground<{ success: boolean }>(
      "GENERATE_KEYS",
      { payload: { email, passphrase, settings } }
    );
    if (response.success) await getKeys();
  }, [email, getKeys, sendToBackground]);

  const deleteKey = useCallback(async (keyId: string) => {
    const response = await sendToBackground<{ success: boolean }>("DELETE_KEY", { payload: { keyId, email } });
    if (response.success) await getKeys();
  }, [email, getKeys]);

  const addContact = useCallback(async (contact: NewContactData) => {
    if (!email) return { success: false, error: "User email not set." };
    const response = await sendToBackground<{ success: boolean, error?: string }>("ADD_CONTACT", { payload: { currentUserEmail: email, newContact: contact } });
    if (response.success) await getContacts();
    return response;
  }, [email, getContacts]);

  const deleteContactKey = useCallback(async (contactEmail: string, keyFingerprint: string) => {
    if (!email) return { success: false, error: "User email not set." };
    const response = await sendToBackground<{ success: boolean, error?: string }>("DELETE_CONTACT_KEY", {
      payload: { currentUserEmail: email, contactEmail, keyFingerprint }
    });
    if (response.success) await getContacts();
    return response;
  }, [email, getContacts]);


  const debugDumpVault = useCallback(() => {
    chrome.runtime.sendMessage({ type: "DEBUG_DUMP_VAULT" });
  }, []);

  useEffect(() => {
    const port = chrome.runtime.connect({ name: "vault-ui" });
    return () => port.disconnect();
  }, []);

const decryptManual = useCallback(async (armoredMessage: string, senderEmail: string): Promise<any> => {
    console.log("[VaultContext] Starting manual decryption...");
    const response = await sendToBackground("DECRYPT_MANUAL", { 
        payload: { armoredMessage, senderEmail } // <-- Pass senderEmail
    });
    console.log("[VaultContext] Manual decryption response:", response);
    return response;
  }, [sendToBackground]);
  
  const vault = {
    isUnlocked, isLoading, email,
    userKeys, contacts, lockVault, attemptLogin,
    generatePair, getKeys, deleteKey,
    getContacts, addContact, getEmail,
    deleteContactKey, debugDumpVault, decryptManual
  };


  return (
    <VaultContext.Provider value={vault}>
      {children}
    </VaultContext.Provider>
  );
}

export const useVault = () => {
  return useContext(VaultContext);
};