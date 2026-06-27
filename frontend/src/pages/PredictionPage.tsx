import { useQuery } from 'react-query'
import { useNavigate } from 'react-router-dom'
import { fetchTodayPredictions, type Race, type Horse } from '../api'
import clsx from 'clsx'

function ValueCard({ horse, race }: { horse: Horse; race: Race }) {
  const navigate = useNavigate()
  return (
    <button
      onClick={() => navigate(`/race/${race.id}`)}
      className="card w-full text-left space-y-2 hover:border-keiba-gold/50 transition-colors"
    >
      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-400">{race.venue} {race.race_number}R　{race.name}</div>
        <div className="text-xs text-keiba-gold">{race.start_time}</div>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-keiba-gold/10 flex items-center justify-center text-keiba-gold font-bold text-lg">
          {horse.number}
        </div>
        <div className="flex-1">
          <div className="font-bold text-lg">{horse.name}</div>
          <div className="text-sm text-gray-400">{horse.jockey}騎手　{horse.sex}{horse.age}歳</div>
        </div>
        <div className="text-right">
          <div className="text-keiba-gold font-bold text-lg">{horse.odds_win}倍</div>
          <div className="text-xs text-gray-400">AI勝率 {horse.win_prob ? `${(horse.win_prob * 100).toFixed(1)}%` : 'ー'}</div>
        </div>
      </div>
      <div className={clsx(
        'text-sm font-bold rounded-lg px-3 py-1.5 text-center',
        horse.value_score > 0.3
          ? 'bg-keiba-green/20 text-keiba-green'
          : 'bg-keiba-gold/10 text-keiba-gold'
      )}>
        {horse.value_score > 0.3 ? '🎯 穴場の狙い目' : '✅ 期待値プラス'}
        EV {horse.value_score > 0 ? '+' : ''}{(horse.value_score * 100).toFixed(0)}%
      </div>
    </button>
  )
}

export default function PredictionPage() {
  const { data = [], isLoading, isError } = useQuery('predictions-today', fetchTodayPredictions)

  return (
    <div>
      <div className="px-4 pt-6 pb-3 border-b border-keiba-border">
        <h1 className="text-xl font-bold">🎯 今日の予想</h1>
        <p className="text-sm text-gray-400 mt-1">AIが期待値プラスと判断した馬だけを表示します</p>
      </div>

      <div className="px-4 pt-4 space-y-3">
        {isLoading && (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-keiba-gold border-t-transparent" />
          </div>
        )}
        {isError && (
          <div className="card text-center py-10 text-gray-400">
            <p className="text-3xl mb-2">😅</p>
            <p>データ取得に失敗しました</p>
          </div>
        )}
        {!isLoading && data.length === 0 && (
          <div className="card text-center py-12 text-gray-400">
            <p className="text-4xl mb-3">🔍</p>
            <p>本日の期待値プラス馬はまだありません</p>
            <p className="text-xs mt-2">レース一覧からレースを開くと自動で計算されます</p>
          </div>
        )}
        {data.map(({ race, value_picks }) =>
          value_picks.map(horse => (
            <ValueCard key={`${race.id}-${horse.id}`} horse={horse} race={race} />
          ))
        )}
      </div>
    </div>
  )
}
