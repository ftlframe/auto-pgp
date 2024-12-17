import { createContext, useContext, useEffect, useState, type ReactNode } from "react"

interface AppContextType {
    email: string;
    setEmail: (email: string) => void;
    vault: string[];
    setVault: (keys: string[]) => void;
    set_and_update: (id: string, public_: string, private_: string) => void;
    clear_vault: () => void;
}

export const AppContext = createContext<AppContextType>({
    email: "",
    setEmail: () => { },
    vault: [],
    setVault: () => { },
    set_and_update: () => { },
    clear_vault: () => { }
});

export default function AppProvider({ children }: { children: ReactNode }) {
    const [email, setEmail] = useState("");
    const [vault, setVault] = useState([])

    function clear_vault() {
        setVault([]);
        chrome.storage.local.set({ keyring: {} }, () => {
            console.log('✔️Cleared keyring for ' + email);
        });
    }

    function set_and_update(id: string, public_: string, private_: string) {
        const newVault = { ...vault };
        if (Object.keys(newVault).length === 0) {
            console.log('Empty vault while generating first keyring');
            newVault[id] = {
                pub_keys: [public_],
                priv_keys: [private_],
                contacts: []
            };
        } else {
            const existing_pub_keys = newVault[id]?.pub_keys
            const existing_priv_keys = newVault[id]?.priv_keys
            const existing_contacts = newVault[id]?.contacts || []
            if (!existing_priv_keys || !existing_pub_keys) {
                newVault[id] = {
                    pub_keys: [public_],
                    priv_keys: [private_],
                    contacts: []
                };
            } else {
                newVault[id] = {
                    pub_keys: [...existing_pub_keys, public_],
                    priv_keys: [...existing_priv_keys, private_],
                    contacts: [...existing_contacts]
                };
            }
        }
        setVault({
            ...vault,
            ...newVault
        });
        chrome.storage.local.set({ keyring: newVault }, () => {
            console.log('✔️Updated keyring for ' + email);
        });
    }

    useEffect(() => {
        chrome.runtime.sendMessage({ type: "GET_EMAIL" }, (response) => {
            if (response?.email) {
                setEmail(response.email)
                localStorage.setItem('USERMAIL', response.email);
                chrome.runtime.sendMessage({ type: 'GET_VAULT', id: response.email }, (response) => {
                    if (response?.vault) {
                        setVault(response.vault['keyring'])
                    }
                })
            }
        });
    }, [])

    return (
        <AppContext.Provider value={{
            email,
            setEmail,
            vault,
            setVault,
            set_and_update,
            clear_vault
        }}>
            {children}
        </AppContext.Provider>
    );
}

export const useAppContext = () => useContext(AppContext);