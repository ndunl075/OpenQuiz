import { useEffect } from 'react'
import { Route, Routes } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import Home from './routes/Home'
import Library from './routes/Library'
import EditSet from './routes/EditSet'
import SetDetail from './routes/SetDetail'
import Flashcards from './routes/modes/Flashcards'
import Learn from './routes/modes/Learn'
import Write from './routes/modes/Write'
import Spell from './routes/modes/Spell'
import Test from './routes/modes/Test'
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
        <Route path="library" element={<Library />} />
        <Route path="create" element={<EditSet />} />
        <Route path="set/:id" element={<SetDetail />} />
        <Route path="set/:id/edit" element={<EditSet />} />
        <Route path="set/:id/flashcards" element={<Flashcards />} />
        <Route path="set/:id/learn" element={<Learn />} />
        <Route path="set/:id/write" element={<Write />} />
        <Route path="set/:id/spell" element={<Spell />} />
        <Route path="set/:id/test" element={<Test />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
