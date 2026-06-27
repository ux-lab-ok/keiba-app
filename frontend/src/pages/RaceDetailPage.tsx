import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { ChevronLeft, RefreshCw, Star } from 'lucide-react'
import { fetchRaceDetail, fetchFavorites, addFavorite, removeFavorite, createBet, type Horse } from '../api'
import clsx from 'clsx'

type BetType = '単勝' | '複勝' | '三連単' | '三連複'

const BET_TYPES: BetType[] = ['単勝', '複勝', '三連単', '三連複']

function FrameColor(frame: number) {
  const colors = ['', 'bg-white text-black', 'bg-black text-white', 'bg-red-600', 'bg-blue-600',
    'bg-yellow-400 text-black', 'bg-green-600', 'bg-orange-500', 'bg-pink-500']
  return colors[frame] ?? 'bg-gray-600'
}

function ValueBadge({ score }: { score: number }) {
  if (score > 0.3) return <span className="text-xs font-bold bg-keiba-green/20 text-keiba-green px-2 py-0.5 rounded-full">穴場◎</span>
  if (score > 0) return <span className="text-xs font-bold bg-keiba-gold/20 text-keiba-gold px-2 py-0.5 rounded-full">期待値○</span>
  return null
}

function HorseRow({
  horse,
  rank,
  isFav,
  onToggleFav,
  onBet,
}: {
  horse: Horse
  rank: number
  isFav: boolean
  onToggleFav: () => void
  onBet: (h: Horse) => void
}) {
  const isTop3 = rank <= 3

  return (
    <div className={clsx(
      'card flex gap-3 items-start',
      isTop3 && 'border-keiba-gold/30'
    )}>
      {/* Rank */}
      <div className={clsx(
        'flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold',
        rank === 1 ? 'bg-keiba-gold text-black' :
        rank === 2 ? 'bg-gray-300 text-black' :
        rank === 3 ? 'bg-orange-700 text-white' :
        'bg-keiba-border text-gray-300'
      )}>
        {rank}
      </div>

      {/* Frame number */}
      <div className={clsx('flex-shrink-0 w-7 h-7 rounded flex items-center justify-center text-sm font-bold', FrameColor(horse.frame))}>
        {horse.number}
      </div>

      {/* Main info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-base">{horse.name}</span>
          <ValueBadge score={horse.value_score} />
        </div>
        <div className="text-xs text-gray-400 mt-0.5">
          {horse.sex}{horse.age}歳　{horse.jockey}騎手
          {horse.weight > 0 ? `　${horse.weight}kg(${horse.weight_diff > 0 ? '+' : ''}${horse.weight_diff})` : ''}
        </div>
        <div className="flex items-center gap-3 mt-1.5">
          <div className="text-sm">
            <span className="text-gray-400 text-xs">単勝 </span>
            <span className="font-bold text-keiba-gold">{horse.odds_win > 0 ? `${horse.odds_win}倍` : 'ー'}</span>
          </div>
          <div className="text-sm">
            <span className="text-gray-400 text-xs">AI勝率 </span>
            <span className="font-bold text-white">{horse.win_prob ? `${(horse.win_prob * 100).toFixed(1)}%` : 'ー'}</span>
          </div>
          {horse.value_score !== null && (
            <div className={clsx('text-xs font-semibold', horse.value_score > 0 ? 'text-keiba-green' : 'text-gray-500')}>
              EV {horse.value_score > 0 ? '+' : ''}{(horse.value_score * 100).toFixed(0)}%
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2 items-end flex-shrink-0">
        <button onClick={onToggleFav} className="text-keiba-gold active:scale-110 transition-transform">
          <Star className="w-5 h-5" fill={isFav ? 'currentColor' : 'none'} />
        </button>
        <button
          onClick={() => onBet(horse)}
          className="text-xs bg-keiba-red/80 hover:bg-keiba-red text-white px-2 py-1 rounded-lg font-semibold transition-colors"
        >
          記録
        </button>
      </div>
    </div>
  )
}

function BetModal({
  horse,
  raceId,
  raceName,
  raceDate,
  betType,
  onClose,
}: {
  horse: Horse
  raceId: string
  raceName: string
  raceDate: string
  betType: BetType
  onClose: () => void
}) {
  const [amount, setAmount] = useState(1000)
  const qc = useQueryClient()
  const mutation = useMutation(
    () => createBet({
      race_id: raceId,
      race_name: raceName,
      race_date: raceDate,
      bet_type: betType,
      horse_names: horse.name,
      amount,
      odds_at_bet: horse.odds_win,
    }),
    {
      onSuccess: () => { qc.invalidateQueries('bets'); onClose() },
    }
  )
  const quick = [500, 1000, 3000, 5000]

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-end">
      <div className="bg-keiba-card w-full max-w-lg mx-auto rounded-t-3xl p-6 pb-10 space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold">賭け記録</h3>
          <button onClick={onClose} className="text-gray-400 text-2xl leading-none">×</button>
        </div>
        <div className="card">
          <div className="text-sm text-gray-400">{betType}</div>
          <div className="text-xl font-bold mt-1">{horse.name}</div>
          <div className="text-sm text-keiba-gold mt-0.5">オッズ {horse.odds_win}倍</div>
        </div>
        <div>
          <p className="text-sm text-gray-400 mb-2">金額（円）</p>
          <div className="flex gap-2 mb-3">
            {quick.map(q => (
              <button
                key={q}
                onClick={() => setAmount(q)}
                className={clsx(
                  'flex-1 py-2 rounded-xl text-sm font-semibold border transition-colors',
                  amount === q
                    ? 'border-keiba-gold bg-keiba-gold/20 text-keiba-gold'
                    : 'border-keiba-border text-gray-300'
                )}
              >
                {q.toLocaleString()}
              </button>
            ))}
          </div>
          <input
            type="number"
            value={amount}
            onChange={e => setAmount(Number(e.target.value))}
            className="w-full bg-keiba-dark border border-keiba-border rounded-xl px-4 py-3 text-lg font-bold text-right"
          />
        </div>
        <div className="text-sm text-gray-400 text-right">
          想定払戻: <span className="text-white font-bold">¥{Math.round(amount * horse.odds_win).toLocaleString()}</span>
        </div>
        <button
          onClick={() => mutation.mutate()}
          disabled={mutation.isLoading}
          className="btn-primary w-full text-center"
        >
          {mutation.isLoading ? '記録中...' : '記録する'}
        </button>
      </div>
    </div>
  )
}

export default function RaceDetailPage() {
  const { raceId } = useParams<{ raceId: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [betType, setBetType] = useState<BetType>('単勝')
  const [betTarget, setBetTarget] = useState<Horse | null>(null)

  const { data: race, isLoading, refetch } = useQuery(
    ['race', raceId],
    () => fetchRaceDetail(raceId!),
    { enabled: !!raceId }
  )
  const { data: favs = [] } = useQuery('favorites', fetchFavorites)
  const favIds = new Set(favs.map(f => f.horse_id))

  const favMutation = useMutation(
    ({ horse_id, name, isFav }: { horse_id: string; name: string; isFav: boolean }) =>
      isFav ? removeFavorite(horse_id) : addFavorite(horse_id, name),
    { onSuccess: () => qc.invalidateQueries('favorites') }
  )

  if (isLoading) {
    return (
      <div className="flex justify-center py-32">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-keiba-gold border-t-transparent" />
      </div>
    )
  }

  if (!race) return null

  return (
    <div>
      {/* Header */}
      <div className="sticky top-0 z-10 bg-keiba-dark px-4 pt-6 pb-3 border-b border-keiba-border">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-gray-400 active:text-white">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold">{race.name}</h1>
              {race.grade && (
                <span className="badge-grade bg-keiba-red text-white">{race.grade}</span>
              )}
            </div>
            <div className="text-sm text-gray-400">
              {race.venue}　{race.track_type}{race.distance > 0 ? `${race.distance}m` : ''}
              {race.weather ? `　${race.weather}` : ''}
              {race.track_condition ? `　馬場:${race.track_condition}` : ''}
            </div>
          </div>
          <button onClick={() => refetch()} className="text-gray-400 active:text-white">
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>

        {/* Bet type selector */}
        <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
          {BET_TYPES.map(t => (
            <button
              key={t}
              onClick={() => setBetType(t)}
              className={clsx(
                'flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold border transition-colors',
                betType === t
                  ? 'border-keiba-gold bg-keiba-gold/20 text-keiba-gold'
                  : 'border-keiba-border text-gray-400'
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* AI note */}
      <div className="mx-4 mt-4 px-4 py-3 bg-keiba-green/10 border border-keiba-green/30 rounded-xl text-sm text-keiba-green">
        🤖 AIが勝率と期待値（EV）を計算。<b>穴場◎</b>は人気が低くても本当に来そうな馬です。
      </div>

      {/* Horse list */}
      <div className="px-4 pt-4 pb-6 space-y-2">
        {race.horses.length === 0 && (
          <div className="card text-center py-10 text-gray-400">
            出走馬情報を取得中です…
          </div>
        )}
        {race.horses.map(horse => (
          <HorseRow
            key={horse.id}
            horse={horse}
            rank={horse.predicted_rank}
            isFav={favIds.has(horse.horse_id)}
            onToggleFav={() => favMutation.mutate({ horse_id: horse.horse_id, name: horse.name, isFav: favIds.has(horse.horse_id) })}
            onBet={h => setBetTarget(h)}
          />
        ))}
      </div>

      {betTarget && (
        <BetModal
          horse={betTarget}
          raceId={race.id}
          raceName={race.name}
          raceDate={race.date}
          betType={betType}
          onClose={() => setBetTarget(null)}
        />
      )}
    </div>
  )
}
