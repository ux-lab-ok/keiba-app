import { useState } from 'react'
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from 'react-query'
import TopPage from './pages/TopPage'
import RaceDetailPage from './pages/RaceDetailPage'
import WizardPage from './pages/WizardPage'
import NotePage, { type NoteRecord } from './pages/NotePage'
import MyPage from './pages/MyPage'
import AiAdvisorPage from './pages/AiAdvisorPage'
import type { MockRace } from './mock/races'

type Mark = '◎' | '○' | '▲' | '△' | '×' | ''
type ResultStatus = '的中' | '外れ' | '未入力'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 60_000 } },
})

// Global notes state lives here so wizard → note page works
function AppInner() {
  const [notes, setNotes] = useState<NoteRecord[]>([])

  function handleNoteSaved(data: { race: MockRace; marks: Record<number, Mark>; savedAt: string }) {
    const note: NoteRecord = {
      id: Date.now().toString(),
      race: data.race,
      marks: data.marks,
      reasonTags: [],
      memo: '',
      buyingMethod: '',
      result: '未入力',
      payout: null,
      savedAt: data.savedAt,
    }
    setNotes(prev => [note, ...prev])
  }

  function handleUpdateResult(id: string, result: ResultStatus, payout: number | null) {
    setNotes(prev => prev.map(n => n.id === id ? { ...n, result, payout } : n))
  }

  return (
    <div className="max-w-[430px] mx-auto min-h-screen pb-[calc(56px+env(safe-area-inset-bottom))]">
      <Routes>
        <Route path="/" element={<TopPage />} />
        <Route path="/race/:raceId" element={<RaceDetailPage />} />
        <Route path="/yoso" element={<WizardPage onNoteSaved={handleNoteSaved} />} />
        <Route path="/note" element={<NotePage notes={notes} onUpdateResult={handleUpdateResult} />} />
        <Route path="/mypage" element={<MyPage />} />
        <Route path="/ai" element={<AiAdvisorPage />} />
      </Routes>
      <BottomNav noteCount={notes.filter(n => n.result === '未入力').length} />
    </div>
  )
}

function BottomNav({ noteCount }: { noteCount: number }) {
  const tabs = [
    { to: '/', label: 'ホーム', icon: '🏠', end: true },
    { to: '/yoso', label: '予想', icon: '🎯', end: false },
    { to: '/note', label: 'ノート', icon: '📝', end: false, badge: noteCount },
    { to: '/mypage', label: 'マイ', icon: '👤', end: false },
  ]
  return (
    <nav className="fixed bottom-0 left-0 right-0 border-t border-white/10 max-w-[430px] left-1/2 -translate-x-1/2 w-full"
      style={{ background: 'var(--surface)', paddingBottom: 'env(safe-area-inset-bottom)', height: 'calc(56px + env(safe-area-inset-bottom))' }}>
      <div className="flex h-14">
        {tabs.map(t => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.end}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold transition-colors relative ${
                isActive ? 'text-white' : 'text-gray-500'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span className="text-xl leading-none relative">
                  {t.icon}
                  {'badge' in t && (t.badge ?? 0) > 0 && (
                    <span className="absolute -top-1 -right-2 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center text-white"
                      style={{ background: 'var(--mark-honmei)' }}>
                      {t.badge}
                    </span>
                  )}
                </span>
                <span>{t.label}</span>
                {isActive && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full"
                    style={{ background: 'var(--accent)' }} />
                )}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppInner />
      </BrowserRouter>
    </QueryClientProvider>
  )
}
