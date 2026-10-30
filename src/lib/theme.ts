import { useCallback, useEffect, useState } from 'react'

export type Theme = 'dark' | 'light'
const KEY = 'ile-theme'

function read(): Theme {
  if (typeof window === 'undefined') return 'light'
  const saved = localStorage.getItem(KEY)
  if (saved === 'light' || saved === 'dark') return saved
  return 'light'
}

function apply(t: Theme) {
  document.documentElement.classList.toggle('dark', t === 'dark')
  document.documentElement.classList.toggle('light', t === 'light')
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(read)

  useEffect(() => {
    apply(theme)
  }, [theme])

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY && (e.newValue === 'light' || e.newValue === 'dark')) setThemeState(e.newValue)
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const setTheme = useCallback((t: Theme) => {
    localStorage.setItem(KEY, t)
    setThemeState(t)
  }, [])

  const toggle = useCallback(() => setTheme(theme === 'dark' ? 'light' : 'dark'), [theme, setTheme])

  return { theme, setTheme, toggle }
}
