"use client"

import { useEffect, useState, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

export default function ThemeProvider({ children }: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    // Check localStorage or system preference
    const localTheme = localStorage.getItem('theme');
    if (
      localTheme === 'dark' ||
      (!localTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)
    ) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  return <>{mounted && children}</>; // avoid SSR mismatch
}
