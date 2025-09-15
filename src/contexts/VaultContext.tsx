import { createContext, useContext, useEffect, useState } from "react";
import type { Contact } from "~types/vault";
import type { PublicKeyInfo } from "~types/vault";

type NewContactData = { name: string, email: string, publicKeyArmored: string };

export const VaultContext = createContext<{
  isUnlocked: boolean | null,
  email: string | null,
  userKeys: PublicKeyInfo[] | null,
  contacts: Contact[],
  unlockVault: (password: string) => Promise<void>;
  lockVault: () => Promise<void>;
  initVault: (password: string) => Promise<void>;
  generatePair: () => Promise<void>;
  getEmail: () => Promise<void>;
  getKeys: () => Promise<void>;
  deleteKey: (keyID: string) => Promise<void>;
  getContacts: () => Promise<Contact[]>;
  addContact: (contact: NewContactData) => Promise<any>;
  deleteContactKey: (contactEmail: string, keyFingerprint: string) => Promise<any>;
}>({
  isUnlocked: null, email: null, userKeys: null, contacts: [],
  unlockVault: async () => { },
  lockVault: async () => { },
  initVault: async () => { },
  generatePair: async () => { },
  getEmail: async () => { },
  getKeys: async () => { },
  deleteKey: async () => { },
  getContacts: async () => [],
  addContact: async () => { },
  deleteContactKey: async () => { },
});


export default function VaultProvider({ children }) {
  const sendToBackground = async <T,>(type: string, data?: any): Promise<T> => {
    return chrome.runtime.sendMessage({ type, ...data });
  };

  const [isUnlocked, setIsUnlocked] = useState(false);
  const [email, setEmail] = useState('');
  const [userKeys, setUserKeys] = useState<PublicKeyInfo[] | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);

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

  const unlockVault = async (password: string) => {
    try {
      const response = await sendToBackground<{ success: boolean; error?: string; }>("UNLOCK", { payload: { password } });
      if (response.success) {
        setIsUnlocked(true);
        chrome.runtime.sendMessage({ type: "RETRY_PENDING_ACTION" });
      } else {
        alert(response.error);
      }
    } catch (error) {
      console.log(error);
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
    // We can't get contacts if the vault is locked, but we don't need to check for email here.
    if (!isUnlocked) return [];
    try {
      // --- FIX: Remove the email payload. ---
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

  useEffect(() => {
    const port = chrome.runtime.connect({ name: "vault-ui" });
    return () => port.disconnect();
  }, []);

  const vault = {
    isUnlocked, email, userKeys, contacts,
    unlockVault, lockVault, initVault,
    generatePair, getKeys, deleteKey,
    getContacts, addContact, getEmail,
    deleteContactKey,
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