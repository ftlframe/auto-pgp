import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { Storage } from "@plasmohq/storage";

type KeyType = 'rsa' | 'ecc';
type RsaBits = 2048 | 3072 | 4096;

export interface AppSettings {
  keyType: KeyType;
  rsaBits: RsaBits;
}

type SettingsContextType = {
  settings: AppSettings;
  updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
  isLoading: boolean;
};

const defaultSettings: AppSettings = {
  keyType: 'rsa',
  rsaBits: 2048,
};

export const SettingsContext = createContext<SettingsContextType>({
  settings: defaultSettings,
  updateSetting: () => {},
  isLoading: true,
});

const storage = new Storage({ area: 'local' });

export default function SettingsProvider({ children }) {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);

  // Load settings from storage on initial render
  useEffect(() => {
    const loadSettings = async () => {
      const savedSettings = await storage.get<AppSettings>('app_settings');
      if (savedSettings) {
        setSettings(savedSettings);
      }
      setIsLoading(false);
    };
    loadSettings();
  }, []);

  const updateSetting = useCallback(<K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings(prevSettings => {
      const newSettings = { ...prevSettings, [key]: value };
      storage.set('app_settings', newSettings);
      return newSettings;
    });
  }, []);

  const value = { settings, updateSetting, isLoading };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export const useSettings = () => {
  return useContext(SettingsContext);
};