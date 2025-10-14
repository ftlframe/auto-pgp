import { createContext, useContext, useEffect, useState } from "react";
import { Storage } from "@plasmohq/storage";

type Theme = 'light' | 'dark';
type ColorScheme = 'purple' | 'kiwi';

type ThemeContextType = {
    theme: Theme;
    toggleTheme: () => void;
    colorScheme: ColorScheme;
    setColorScheme: (scheme: ColorScheme) => void;
};

export const ThemeContext = createContext<ThemeContextType>({
    theme: 'light',
    toggleTheme: () => { },
    colorScheme: 'purple',
    setColorScheme: () => { },
});

const storage = new Storage();

export default function ThemeProvider({ children }) {
    const [theme, setTheme] = useState<Theme>('light');
    const [colorScheme, setColorSchemeState] = useState<ColorScheme>('purple');

    // Load saved theme and color scheme on startup
    useEffect(() => {
        const loadSettings = async () => {
            const savedTheme = await storage.get<Theme>('theme');
            const savedColorScheme = await storage.get<ColorScheme>('colorScheme');
            if (savedTheme) setTheme(savedTheme);
            if (savedColorScheme) setColorSchemeState(savedColorScheme);
        };
        loadSettings();
    }, []);

    // Apply 'dark' class to HTML element
    useEffect(() => {
        const root = document.documentElement;
        if (theme === 'dark') {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }
    }, [theme]);

    const toggleTheme = () => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
        storage.set('theme', newTheme);
    };

    const setColorScheme = (scheme: ColorScheme) => {
        setColorSchemeState(scheme);
        storage.set('colorScheme', scheme);
    };

    const value = { theme, toggleTheme, colorScheme, setColorScheme };

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
}

export const useTheme = () => {
    return useContext(ThemeContext);
};