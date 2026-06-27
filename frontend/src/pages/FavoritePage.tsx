import { useQuery, useMutation, useQueryClient } from 'react-query'
import { useNavigate } from 'react-router-dom'
import { Trash2 } from 'lucide-react'
import { fetchFavoriteRaces, removeFavorite } from '../api'

export default function FavoritePage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { data = [], isLoading } = useQuery('favorite-races', fetchFavoriteRaces)

  const removeMut = useMutation(
    (horse_id: string) => removeFavorite(horse_id),
    { onSuccess: () => qc.invalidateQueries('favorite-races') }
  )

  return (
    <div>
      <div className="px-4 pt-6 pb-3 border-b border-keiba-border">
        <h1 className="text-xl font-bold">⭐ 推し馬</h1>
        <p className="text-sm text-gray-400 mt-1">登録した馬の出走予定をチェック</p>
      </div>

      <div className="px-4 pt-4 space-y-3">
        {isLoading && (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-keiba-gold border-t-transparent" />
          </div>
        )}
        {!isLoading && data.length === 0 && (
          <div className="card text-center py-12 text-gray-400">
            <p className="text-4xl mb-3">🐎</p>
            <p>推し馬がいません</p>
            <p className="text-xs mt-2">レース詳細画面の ⭐ から登録できます</p>
          </div>
        )}
        {data.map(({ horse, race }) => (
          <div key={horse.horse_id} className="card">
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="font-bold text-lg">{horse.name}</div>
                <div className="text-sm text-gray-400 mt-0.5">{horse.sex}{horse.age}歳　{horse.jockey}騎手</div>
              </div>
              <button
                onClick={() => removeMut.mutate(horse.horse_id)}
                className="text-gray-500 active:text-keiba-red transition-colors"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
            <button
              onClick={() => navigate(`/race/${race.id}`)}
              className="mt-3 w-full text-left bg-keiba-dark rounded-xl px-3 py-2.5 border border-keiba-border hover:border-keiba-gold/50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold">{race.venue} {race.race_number}R　{race.name}</div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {race.date}　{race.start_time}発走
                    {race.track_type && `　${race.track_type}${race.distance > 0 ? `${race.distance}m` : ''}`}
                  </div>
                </div>
                <div className="text-right ml-3 flex-shrink-0">
                  <div className="text-keiba-gold font-bold">{horse.odds_win > 0 ? `${horse.odds_win}倍` : 'ー'}</div>
                  <div className="text-xs text-gray-400">
                    AI {horse.win_prob ? `${(horse.win_prob * 100).toFixed(1)}%` : 'ー'}
                  </div>
                </div>
              </div>
              {horse.value_score !== null && horse.value_score > 0 && (
                <div className="mt-2 text-xs text-keiba-green font-semibold">
                  🎯 期待値プラス（EV +{(horse.value_score * 100).toFixed(0)}%）
                </div>
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
