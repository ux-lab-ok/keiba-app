import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { fetchBets, fetchStats, updateBetResult, type BetRecord } from '../api'

function StatBox({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="card text-center">
      <div className="text-xs text-gray-400 mb-1">{label}</div>
      <div className="text-2xl font-bold">{value}</div>
      {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
    </div>
  )
}

function BetCard({ bet }: { bet: BetRecord }) {
  const qc = useQueryClient()
  const [showResult, setShowResult] = useState(false)
  const [payout, setPayout] = useState(0)

  const mutation = useMutation(
    ({ result, payout }: { result: string; payout: number }) =>
      updateBetResult(bet.id, result, payout),
    {
      onSuccess: () => {
        qc.invalidateQueries('bets')
        qc.invalidateQueries('stats')
        setShowResult(false)
      },
    }
  )

  return (
    <div className="card space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-base">{bet.horse_names}</span>
            <span className="text-xs bg-keiba-border px-2 py-0.5 rounded-full text-gray-300">{bet.bet_type}</span>
          </div>
          <div className="text-sm text-gray-400 mt-0.5">{bet.race_name}　{bet.race_date}</div>
          <div className="text-sm mt-1">
            <span className="text-gray-400">賭け金 </span>
            <span className="font-semibold">¥{bet.amount.toLocaleString()}</span>
            {bet.odds_at_bet > 0 && (
              <span className="text-gray-400 ml-2">@{bet.odds_at_bet}倍</span>
            )}
          </div>
        </div>
        <div className="flex-shrink-0 text-right">
          {bet.result === 'win' && (
            <div className="text-keiba-green font-bold">
              <div className="text-xs">的中</div>
              <div>+¥{((bet.payout ?? 0) - bet.amount).toLocaleString()}</div>
            </div>
          )}
          {bet.result === 'lose' && (
            <div className="text-gray-500 font-bold">
              <div className="text-xs">外れ</div>
              <div>-¥{bet.amount.toLocaleString()}</div>
            </div>
          )}
          {!bet.result && (
            <button
              onClick={() => setShowResult(s => !s)}
              className="btn-ghost text-xs"
            >
              結果入力
            </button>
          )}
        </div>
      </div>

      {showResult && !bet.result && (
        <div className="bg-keiba-dark rounded-xl p-3 space-y-3 border border-keiba-border">
          <div className="flex gap-2">
            <button
              onClick={() => mutation.mutate({ result: 'lose', payout: 0 })}
              className="flex-1 py-2 rounded-lg bg-gray-700 text-sm font-semibold"
            >
              ❌ 外れ
            </button>
            <button
              onClick={() => {
                if (payout > 0) mutation.mutate({ result: 'win', payout })
              }}
              className="flex-1 py-2 rounded-lg bg-keiba-green/80 text-sm font-semibold"
            >
              ✅ 的中
            </button>
          </div>
          {/* payout input for win */}
          <div>
            <label className="text-xs text-gray-400">払戻金額（的中時）</label>
            <input
              type="number"
              placeholder="払戻金額を入力"
              value={payout || ''}
              onChange={e => setPayout(Number(e.target.value))}
              className="w-full mt-1 bg-keiba-card border border-keiba-border rounded-xl px-3 py-2 text-base"
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default function MyPage() {
  const { data: stats } = useQuery('stats', fetchStats)
  const { data: bets = [], isLoading } = useQuery('bets', fetchBets)

  const pending = bets.filter(b => !b.result)
  const done = bets.filter(b => b.result)

  return (
    <div>
      <div className="px-4 pt-6 pb-3 border-b border-keiba-border">
        <h1 className="text-xl font-bold">📊 マイページ</h1>
        <p className="text-sm text-gray-400 mt-1">ベット履歴と収支を管理</p>
      </div>

      <div className="px-4 pt-4 space-y-6">
        {/* Stats */}
        {stats && (
          <section>
            <h2 className="text-sm font-bold text-gray-400 mb-2 px-1">累計成績</h2>
            <div className="grid grid-cols-2 gap-2">
              <StatBox
                label="的中率"
                value={`${stats.win_rate}%`}
                sub={`${stats.wins}回 / ${stats.total_bets}回`}
              />
              <StatBox
                label="ROI（回収率）"
                value={`${stats.roi > 0 ? '+' : ''}${stats.roi}%`}
                sub={stats.roi > 0 ? 'プラス収支' : 'マイナス収支'}
              />
              <StatBox
                label="総賭け金"
                value={`¥${stats.total_amount.toLocaleString()}`}
              />
              <StatBox
                label="損益"
                value={`${stats.profit_loss >= 0 ? '+' : ''}¥${stats.profit_loss.toLocaleString()}`}
                sub={stats.profit_loss >= 0 ? '✅ プラス' : '❌ マイナス'}
              />
            </div>
          </section>
        )}

        {/* Pending results */}
        {pending.length > 0 && (
          <section>
            <h2 className="text-sm font-bold text-keiba-gold mb-2 px-1">結果未入力 ({pending.length})</h2>
            <div className="space-y-2">
              {pending.map(b => <BetCard key={b.id} bet={b} />)}
            </div>
          </section>
        )}

        {/* History */}
        <section>
          <h2 className="text-sm font-bold text-gray-400 mb-2 px-1">履歴</h2>
          {isLoading && (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-keiba-gold border-t-transparent" />
            </div>
          )}
          {!isLoading && done.length === 0 && (
            <div className="card text-center py-10 text-gray-400">
              <p className="text-3xl mb-2">📋</p>
              <p>履歴がありません</p>
            </div>
          )}
          <div className="space-y-2">
            {done.map(b => <BetCard key={b.id} bet={b} />)}
          </div>
        </section>
      </div>
    </div>
  )
}
