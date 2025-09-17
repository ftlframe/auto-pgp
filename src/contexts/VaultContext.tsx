import { createContext, useContext, useEffect, useState } from "react";
import type { Contact, PublicKeyInfo } from "~types/vault";

type NewContactData = { name: string, email: string, publicKeyArmored: string };
type UnlockResult = { success: boolean; error?: string; };

export const VaultContext = createContext<{
  isUnlocked: boolean | null,
  email: string | null,
  userKeys: PublicKeyInfo[] | null,
  contacts: Contact[],
  unlockVault: (password: string) => Promise<UnlockResult>;
  lockVault: () => Promise<void>;
  initVault: (password: string) => Promise<void>;
  generatePair: () => Promise<void>; // Takes email from context state
  getEmail: () => Promise<void>;
  getKeys: () => Promise<void>;
  deleteKey: (keyID: string) => Promise<void>;
  getContacts: () => Promise<Contact[]>;
  addContact: (contact: NewContactData) => Promise<any>;
  deleteContactKey: (contactEmail: string, keyFingerprint: string) => Promise<any>;
  pendingAction: any;
  debugDumpVault: () => void;
  performDecryption: (password: string) => Promise<any>; // <-- ADDED for the prompt
}>({
  isUnlocked: null, email: null, userKeys: null, contacts: [],
  unlockVault: async () => ({ success: false, error: "Not implemented" }),
  lockVault: async () => { },
  initVault: async () => { },
  generatePair: async () => { },
  getEmail: async () => { },
  getKeys: async () => { },
  deleteKey: async () => { },
  getContacts: async () => [],
  addContact: async () => { },
  deleteContactKey: async () => { },
  pendingAction: null,
  debugDumpVault: () => { },
  performDecryption: async () => { }, // <-- ADDED for the prompt
});


export default function VaultProvider({ children }) {
  const sendToBackground = async <T,>(type: string, data?: any): Promise<T> => {
    return chrome.runtime.sendMessage({ type, ...data });
  };

  const [isUnlocked, setIsUnlocked] = useState(false);
  const [email, setEmail] = useState('');
  const [userKeys, setUserKeys] = useState<PublicKeyInfo[] | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [pendingAction, setPendingAction] = useState(null);

  const initVault = async (password: string) => {
    try {
      const response = await sendToBackground<{ success: boolean; error?: string; }>("INIT_VAULT", { payload: { password } });
      if (!response.success) {
        throw new Error(response.error || "Vault initialization failed");
      }
      setIsUnlocked(true);
      localStorage.setItem('first_time', 'false');
    } catch (error) {
      console.error("Vault initialization error:", error);
    }
  };

  const unlockVault = async (password: string): Promise<UnlockResult> => {
    try {
      const response = await sendToBackground<UnlockResult>("UNLOCK", { payload: { password } });
      if (response.success) {
        setIsUnlocked(true);
        // This retry is now only for the ENCRYPTION flow
        chrome.runtime.sendMessage({ type: "RETRY_PENDING_ACTION" });
      }
      return response;
    } catch (error) {
      console.log(error);
      return { success: false, error: "An unexpected error occurred." };
    }
  };

  const lockVault = async () => {
    try {
      await sendToBackground("LOCK");
      setIsUnlocked(false);
    } catch (error) {
      console.log(error);
    }
  };

  const getEmail = async () => {
    try {
      const response = await sendToBackground<{ success: boolean, email: string }>("GET_EMAIL");
      if (response.success) {
        setEmail(response.email);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const generatePair = async () => {
    try {
      const response = await sendToBackground<{ success: boolean }>("GENERATE_KEYS", { payload: { email } });
      if (response.success) {
        await getKeys();
      }
    } catch (error) {
      console.log(error);
    }
  };

  const getKeys = async () => {
    try {
      const response = await sendToBackground<{ success: boolean, keys: PublicKeyInfo[] }>("GET_KEYS");
      if (response.success) {
        setUserKeys(response.keys);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const deleteKey = async (keyId: string) => {
    try {
      const response = await sendToBackground<{ success: boolean }>("DELETE_KEY", { payload: { keyId, email } });
      if (response.success) {
        await getKeys();
      }
    } catch (error) {
      console.log(error);
    }
  };

  const getContacts = async (): Promise<Contact[]> => {
    if (!isUnlocked) return [];
    try {
      const response = await sendToBackground<{ success: boolean, contacts: Contact[] }>("GET_CONTACTS");
      if (response.success) {
        setContacts(response.contacts);
        return response.contacts;
      }
    } catch (error) {
      console.error("Failed to get contacts:", error);
    }
    return [];
  };

  const addContact = async (contact: NewContactData) => {
    if (!email) return { success: false, error: "User email not set." };
    const response = await sendToBackground<{ success: boolean, error?: string }>("ADD_CONTACT", { payload: { currentUserEmail: email, newContact: contact } });
    if (response.success) {
      await getContacts();
    }
    return response;
  };

  const deleteContactKey = async (contactEmail: string, keyFingerprint: string) => {
    if (!email) return { success: false, error: "User email not set." };
    const response = await sendToBackground<{ success: boolean, error?: string }>("DELETE_CONTACT_KEY", {
      payload: { currentUserEmail: email, contactEmail, keyFingerprint }
    });
    if (response.success) {
      await getContacts();
    }
    return response;
  };

  const debugDumpVault = () => {
    console.log("Requesting vault dump...");
    chrome.runtime.sendMessage({ type: "DEBUG_DUMP_VAULT" });
  };

  const performDecryption = async (password: string) => {
    console.log(password)
    return sendToBackground("PERFORM_DECRYPTION", { payload: { password } });
  };

  useEffect(() => {
    // When popup opens, ask if there's a pending action
    chrome.runtime.sendMessage({ type: "GET_PENDING_ACTION" }, (response) => {
      if (response) {
        console.log("Pending action found:", response);
        setPendingAction(response);
      }
    });

    const port = chrome.runtime.connect({ name: "vault-ui" });
    return () => port.disconnect();
  }, []);


  const vault = {
    isUnlocked, email, userKeys, contacts,
    unlockVault, lockVault, initVault,
    generatePair, getKeys, deleteKey,
    getContacts, addContact, getEmail,
    deleteContactKey, pendingAction, debugDumpVault,
    performDecryption, // <-- EXPORT THE NEW FUNCTION
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