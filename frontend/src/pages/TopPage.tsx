import { useEffect, useState } from 'react'
import { useQuery } from 'react-query'
import { useNavigate } from 'react-router-dom'
import { RefreshCw } from 'lucide-react'
import { fetchRaces, type Race } from '../api'
import axios from 'axios'
import clsx from 'clsx'

const GRADE_COLORS: Record<string, string> = {
  G1: 'bg-red-600 text-white',
  G2: 'bg-purple-600 text-white',
  G3: 'bg-blue-600 text-white',
}

function RaceCard({ race, onClick }: { race: Race; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="card w-full text-left flex items-center gap-4 active:border-keiba-gold/50 transition-colors"
    >
      <div className="flex-shrink-0 w-12 h-12 bg-keiba-dark rounded-xl flex flex-col items-center justify-center">
        <span className="text-[10px] text-gray-500">R</span>
        <span className="text-xl font-bold text-keiba-gold leading-none">{race.race_number}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-base truncate">{race.name}</span>
          {race.grade && (
            <span className={`badge-grade ${GRADE_COLORS[race.grade] ?? 'bg-gray-600'}`}>
              {race.grade}
            </span>
          )}
        </div>
        <div className="text-sm text-gray-400 mt-0.5">
          {race.venue}
          {race.track_type ? `　${race.track_type}` : ''}
          {race.distance > 0 ? `${race.distance}m` : ''}
          {race.track_condition ? `　${race.track_condition}` : ''}
        </div>
      </div>
      <div className="flex-shrink-0 text-right">
        <div className="text-sm font-semibold">{race.start_time || '発走時刻未定'}</div>
        <div className="text-xs text-gray-500 mt-0.5">→</div>
      </div>
    </button>
  )
}

function formatDisplay(dateStr: string) {
  // dateStr: "YYYYMMDD"
  const y = dateStr.slice(0, 4)
  const m = dateStr.slice(4, 6)
  const d = dateStr.slice(6, 8)
  const dt = new Date(`${y}-${m}-${d}`)
  const days = ['日', '月', '火', '水', '木', '金', '土']
  return `${parseInt(m)}月${parseInt(d)}日（${days[dt.getDay()]}）`
}

export default function TopPage() {
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [availableDates, setAvailableDates] = useState<string[]>([])
  const navigate = useNavigate()

  // Fetch available race dates on mount
  useEffect(() => {
    axios.get<{ dates: string[] }>('/api/available-dates').then(r => {
      const dates = Array.isArray(r.data.dates) ? r.data.dates : []
      setAvailableDates(dates)
      if (dates.length > 0 && !selectedDate) {
        // Default to today if available, else nearest upcoming
        const today = new Date().toISOString().slice(0, 10).replace(/-/g, '')
        const todayMatch = dates.find(d => d >= today)
        setSelectedDate(todayMatch ?? dates[dates.length - 1])
      }
    }).catch(() => {
      const today = new Date().toISOString().slice(0, 10).replace(/-/g, '')
      setSelectedDate(today)
    })
  }, [])

  const { data: races, isLoading, isError, refetch } = useQuery(
    ['races', selectedDate],
    () => fetchRaces(selectedDate),
    { enabled: !!selectedDate, staleTime: 5 * 60_000 }
  )

  const grouped = Array.isArray(races)
    ? races.reduce<Record<string, Race[]>>((acc, r) => {
        acc[r.venue] = [...(acc[r.venue] ?? []), r]
        return acc
      }, {})
    : {}

  return (
    <div>
      {/* Header */}
      <div className="sticky top-0 z-10 bg-keiba-dark px-4 pt-6 pb-3 border-b border-keiba-border">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-bold">🏇 競馬AI予想</h1>
          <button onClick={() => refetch()} className="text-gray-400 active:text-white transition-colors">
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>

        {/* Date tabs */}
        {availableDates.length > 0 ? (
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
            {availableDates.map(d => (
              <button
                key={d}
                onClick={() => setSelectedDate(d)}
                className={clsx(
                  'flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-semibold border transition-colors whitespace-nowrap',
                  selectedDate === d
                    ? 'border-keiba-gold bg-keiba-gold/20 text-keiba-gold'
                    : 'border-keiba-border text-gray-400'
                )}
              >
                {formatDisplay(d)}
              </button>
            ))}
          </div>
        ) : (
          <div className="h-8 bg-keiba-border/30 rounded-full animate-pulse" />
        )}
      </div>

      <div className="px-4 pt-4 space-y-6">
        {isLoading && (
          <div className="flex flex-col items-center py-16 gap-3">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-keiba-gold border-t-transparent" />
            <p className="text-sm text-gray-400">レース情報を取得中…</p>
          </div>
        )}
        {isError && (
          <div className="card text-center py-8 text-gray-400">
            <p className="text-4xl mb-3">😅</p>
            <p>レース情報を取得できませんでした</p>
            <button onClick={() => refetch()} className="btn-ghost mt-4">再試行</button>
          </div>
        )}
        {!isLoading && !isError && Object.keys(grouped).length === 0 && selectedDate && (
          <div className="card text-center py-12 text-gray-400">
            <p className="text-4xl mb-3">🏟</p>
            <p>この日のレースはありません</p>
          </div>
        )}
        {Object.entries(grouped).map(([venue, venueRaces]) => (
          <section key={venue}>
            <h2 className="text-sm font-bold text-keiba-gold mb-2 px-1">{venue}競馬場</h2>
            <div className="space-y-2">
              {venueRaces
                .sort((a, b) => a.race_number - b.race_number)
                .map(race => (
                  <RaceCard
                    key={race.id}
                    race={race}
                    onClick={() => navigate(`/race/${race.id}`)}
                  />
                ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
