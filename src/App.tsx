import { useEffect } from 'react'
import { Route, Routes } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import Home from './routes/Home'
import NotFound from './routes/NotFound'
import { applyTheme, useSettings } from './store/useSettings'

export default function App() {
  const { load, settings, loaded } = useSettings()

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (settings.theme !== 'system') return
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => applyTheme('system')
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [settings.theme])

  if (!loaded) return <div className="h-full" />

  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Home />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
