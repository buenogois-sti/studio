'use client';

import * as React from 'react';

type Theme = 'light';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = React.createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  React.useEffect(() => {
    // Remove dark class if it exists
    document.documentElement.classList.remove('dark');
    localStorage.removeItem('theme');
  }, []);

  const value = React.useMemo(() => ({
    theme: 'light' as Theme,
    toggleTheme: () => {},
    setTheme: () => {},
  }), []);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = React.useContext(ThemeContext);
  
  if (context === undefined) {
    throw new Error('useTheme deve ser usado dentro de um ThemeProvider');
  }
  
  return context;
}
