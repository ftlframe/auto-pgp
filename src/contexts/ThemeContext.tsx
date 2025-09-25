import { createContext, useContext, useEffect, useState } from "react";
import { Storage } from "@plasmohq/storage";

type Theme = 'light' | 'dark';

type ThemeContextType = {
    theme: Theme;
    toggleTheme: () => void;
};

// Create the context with a default value
export const ThemeContext = createContext<ThemeContextType>({
    theme: 'light',
    toggleTheme: () => console.warn('no theme provider'),
});

const storage = new Storage();

// Create the provider component
export default function ThemeProvider({ children }) {
    const [theme, setTheme] = useState<Theme>('light');

    // This effect runs once on startup to load the saved theme from storage
    useEffect(() => {
        const loadTheme = async () => {
            const savedTheme = await storage.get<Theme>('theme');
            if (savedTheme) {
                setTheme(savedTheme);
            }
        };
        loadTheme();
    }, []);

    // This effect applies the 'dark' class to the main HTML element when the theme changes
    useEffect(() => {
        const root = document.documentElement;
        // --- ADDED LOG ---
        if (theme === 'dark') {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }
    }, [theme]);

    const toggleTheme = () => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        // --- ADDED LOG ---
        setTheme(newTheme);
        storage.set('theme', newTheme);
    };

    const value = { theme, toggleTheme };

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
}

// Create a custom hook for easy access to the context
export const useTheme = () => {
    return useContext(ThemeContext);
};