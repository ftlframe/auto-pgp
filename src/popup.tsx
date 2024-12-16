import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import EncryptTab from "~encrypt-tab"
import { CountButton } from "~features/count-button"
import { get_keys } from "~features/key-generation"
import HomeTab from "~home-tab/home-tab"
import KeysTab from "~keys-tab/keys-tab"

import "~style.css"

// Create an interface for the context value
interface AppContextType {
  email: string;
  setEmail: (email: string) => void;
  pubKeys: string[];
  setPubKeys: (keys: string[]) => void;
}

// Create the context
export const AppContext = createContext<AppContextType>({
  email: "",
  setEmail: () => {},
  pubKeys: [],
  setPubKeys: () => {}
});

// Create a provider component
export function AppProvider({ children }: { children: ReactNode }) {
  const [email, setEmail] = useState("");
  const [pubKeys, setPubKeys] = useState<string[]>([]);

  useEffect(() => {
    chrome.runtime.sendMessage({ type: "GET_EMAIL" }, (response) => {
      if (response?.email) {
        setEmail(response.email);
        localStorage.setItem('USERMAIL', response.email);

        chrome.runtime.sendMessage({ type: 'GET_PUB_KEYS', id: response.email}, (response) => {
          if(response?.public) {
            setPubKeys(response.public)
          }
        })
      }
    });
  }, [])


  return (
    <AppContext.Provider value={{ 
      email, 
      setEmail, 
      pubKeys, 
      setPubKeys 
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
  const { email, setEmail, setPubKeys } = useAppContext(); // Destructure from context

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