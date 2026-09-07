import { Navigate } from 'react-router-dom'
import Landing from './Landing'
import { useAsync } from '../hooks/useAsync'
import { listSets } from '../store/sets'

/**
 * The pitch is for people who have not used OpenQuiz before. Once this device
 * has sets on it, "/" is a returning user opening their library, so send them
 * straight there rather than making them click past a landing page every time.
 */
export default function LandingGate() {
  const { value: sets, loading } = useAsync(listSets, [])

  if (loading) return <div className="min-h-dvh bg-[var(--oq-bg)]" />
  if (sets && sets.length > 0) return <Navigate to="/home" replace />
  return <Landing />
}
