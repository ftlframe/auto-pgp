import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import EncryptTab from "~encrypt-tab"
import HomeTab from "~home-tab/home-tab"
import KeysTab from "~keys-tab/keys-tab"

import "~style.css"

// Create an interface for the context value
interface AppContextType {
  email: string;
  setEmail: (email: string) => void;
  vault: string[];
  setVault: (keys: string[]) => void;
  set_and_update: (id: string, public_: string, private_: string) => void;
}

// Create the context
export const AppContext = createContext<AppContextType>({
  email: "",
  setEmail: () => {},
  vault: [],
  setVault: () => {},
  set_and_update: () => {}
});

// Create a provider component
export function AppProvider({ children }: { children: ReactNode }) {
  const [email, setEmail] = useState("");
  const [vault, setVault] = useState([])

  function set_and_update(id, public_, private_) {
    // console.log(vault)
    if(Object.keys(vault).length === 0) {
      console.log('Empty vault while generating first keyring')
      vault[id] = {
        pub_keys: [public_],
        priv_keys: [private_]
      }
    } 
    else {
      const existing_pub_keys = vault[id]?.pub_keys
      const existing_priv_keys = vault[id]?.priv_keys
      if(!existing_priv_keys || !existing_pub_keys) {
        vault[id] = {
          pub_keys: [public_],
          priv_keys: [private_]
        }
        
      }
      else {
        existing_pub_keys.push(public_)
        existing_priv_keys.push(private_)
    
        vault[id] = {
          pub_keys: existing_pub_keys,
          priv_keys: existing_priv_keys
        }
      }
    }
    setVault(vault)
  
    chrome.storage.local.set({keyring: vault}, () => {
        console.log('Updated keyring for ' + email )
    })

  }

  useEffect(() => {
    chrome.runtime.sendMessage({ type: "GET_EMAIL" }, (response) => {
      if (response?.email) {
        setEmail(response.email)
        // console.log(email)

        localStorage.setItem('USERMAIL', response.email);

        chrome.runtime.sendMessage({ type: 'GET_VAULT', id: response.email}, (response) => {
          if(response?.vault) {
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
      set_and_update
    }}>
      {children}
    </AppContext.Provider>
  );
}

// Custom hook to use the context
export function useAppContext() {
  return useContext(AppContext);
}

export default function IndexPopup() {
  const [ active_tab, setTab] = useState(0)

  const tabs = [
    { tab_id: 0, label: 'Home' },
    { tab_id: 1, label: 'Keys' },
    { tab_id: 2, label: 'Encrypt' },
    { tab_id: 3, label: 'Decrypt' },
  ]

  return (
    <AppProvider>
      <div className="flex flex-col h-80 w-72">
        <div className="flex border-b">
          {tabs.map((tab) => (
            <button key={tab.tab_id}
              onClick={() => setTab(tab.tab_id)}
              className={`px-4 py-2 font-semibold ${active_tab === tab.tab_id ? "border-b-2 border-purple-500 text-purple-500" : "text-gray-500 hover:text-purple-500"}`}>{tab.label}</button>
          ))}
        </div>
        <div>
          {active_tab == 0 && <HomeTab />}
          {active_tab == 1 && <KeysTab />}
          {active_tab == 2 && <EncryptTab />}
        </div>
      </div>
    </AppProvider>
  )
}