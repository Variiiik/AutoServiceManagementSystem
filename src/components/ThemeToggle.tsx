import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useDarkMode } from '../hooks/useDarkMode';

export default function ThemeToggle() {
  const { dark, setDark } = useDarkMode();
  return (
    <button
      onClick={() => setDark(!dark)}
      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border
                 bg-white/70 backdrop-blur dark:bg-gray-800/70
                 border-gray-300 hover:bg-gray-100
                 dark:border-gray-700 dark:hover:bg-gray-700"
      title="Toggle theme"
    >
      {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      <span className="text-sm">{dark ? 'Light' : 'Dark'}</span>
    </button>
  );
}
