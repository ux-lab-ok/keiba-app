import { useState } from 'react'
import { ChevronRight, BarChart2 } from 'lucide-react'
import type { MockRace } from '../mock/races'

type Mark = '◎' | '○' | '▲' | '△' | '×' | ''
type ResultStatus = '的中' | '外れ' | '未入力'

const MARK_COLORS: Record<Mark, string> = {
  '◎': 'var(--mark-honmei)',
  '○': 'var(--mark-taikou)',
  '▲': 'var(--mark-tanana)',
  '△': 'var(--mark-renka)',
  '×': 'var(--mark-ana)',
  '': 'transparent',
}

export const REASON_TAGS = [
  '血統', '展開', 'ペース', '馬場バイアス', '調子', '人気薄消し',
  '騎手', '厩舎', 'コース実績', '距離適性',
]

export interface NoteRecord {
  id: string
  race: MockRace
  marks: Record<number, Mark>
  reasonTags: string[]
  memo: string
  buyingMethod: string
  result: ResultStatus
  payout: number | null
  savedAt: string
}

// ─── Note card ────────────────────────────────────────────────────

function NoteCard({ note, onResultInput }: { note: NoteRecord; onResultInput: (id: string) => void }) {
  const marked = note.race.horses.filter(h => note.marks[h.number] && note.marks[h.number] !== '')

  return (
    <div className="card space-y-3">
      {/* Race header */}
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-body">{note.race.name}</span>
            {note.race.grade && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-600/20 text-red-400 font-bold">
                {note.race.grade}
              </span>
            )}
          </div>
          <div className="text-caption mt-0.5" style={{ color: 'var(--text-sub)' }}>
            {note.race.date}　{note.race.venue}　{note.race.track_type}{note.race.distance}m
          </div>
        </div>
        <span className={`text-caption font-bold px-2 py-1 rounded-full ${
          note.result === '的中' ? 'bg-green-500/20 text-green-400' :
          note.result === '外れ' ? 'bg-red-500/20 text-red-400' :
          'bg-white/10 text-gray-400'
        }`}>
          {note.result}
        </span>
      </div>

      {/* 印 summary */}
      <div className="flex gap-2 flex-wrap">
        {marked.map(h => (
          <span key={h.number} className="flex items-center gap-1 text-caption rounded-full px-2 py-0.5"
            style={{ background: `${MARK_COLORS[note.marks[h.number] ?? ''] ?? 'gray'}22`, border: `1px solid ${MARK_COLORS[note.marks[h.number] ?? ''] ?? 'gray'}55` }}>
            <span className="font-bold" style={{ color: MARK_COLORS[note.marks[h.number] ?? ''] ?? 'white' }}>
              {note.marks[h.number]}
            </span>
            <span>{h.name}</span>
          </span>
        ))}
      </div>

      {/* 根拠タグ */}
      {note.reasonTags.length > 0 && (
        <div className="flex gap-1.5 flex-wrap">
          {note.reasonTags.map(t => (
            <span key={t} className="text-caption px-2 py-0.5 rounded-full border border-white/20" style={{ color: 'var(--text-sub)' }}>
              {t}
            </span>
          ))}
        </div>
      )}

      {note.memo && (
        <p className="text-caption rounded-xl p-3" style={{ color: 'var(--text-sub)', background: 'var(--bg)' }}>
          {note.memo}
        </p>
      )}

      {note.result === '未入力' && (
        <button
          onClick={() => onResultInput(note.id)}
          className="w-full py-2.5 rounded-xl border border-white/20 text-caption font-bold flex items-center justify-center gap-1"
          style={{ color: 'var(--text-sub)' }}
        >
          結果を入力する <ChevronRight className="w-3 h-3" />
        </button>
      )}

      {note.result !== '未入力' && note.payout !== null && (
        <div className="text-caption text-right" style={{ color: note.result === '的中' ? 'var(--accent)' : 'var(--text-sub)' }}>
          {note.result === '的中' ? `払戻 ¥${note.payout.toLocaleString()}` : '払戻なし'}
        </div>
      )}
    </div>
  )
}

// ─── Result modal ──────────────────────────────────────────────────

function ResultModal({ onClose, onSave }: {
  onClose: () => void
  onSave: (result: ResultStatus, payout: number | null) => void
}) {
  const [result, setResult] = useState<ResultStatus>('未入力')
  const [payout, setPayout] = useState('')

  return (
    <div className="fixed inset-0 z-50 flex items-end" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div className="w-full max-w-lg mx-auto rounded-t-3xl p-6 space-y-4" style={{ background: 'var(--surface)' }}>
        <h2 className="text-heading font-bold">結果を入力</h2>
        <div className="flex gap-3">
          {(['的中', '外れ'] as const).map(r => (
            <button
              key={r}
              onClick={() => setResult(r)}
              className="flex-1 py-3 rounded-xl font-bold text-body border transition-colors"
              style={result === r
                ? { borderColor: r === '的中' ? 'var(--accent)' : 'var(--mark-honmei)', background: r === '的中' ? 'color-mix(in srgb, var(--accent) 20%, transparent)' : 'color-mix(in srgb, var(--mark-honmei) 20%, transparent)', color: 'var(--text)' }
                : { borderColor: 'rgba(255,255,255,0.1)', background: 'var(--bg)', color: 'var(--text-sub)' }}
            >
              {r}
            </button>
          ))}
        </div>
        {result === '的中' && (
          <div>
            <label className="text-caption block mb-1" style={{ color: 'var(--text-sub)' }}>払戻金額（円）</label>
            <input
              type="number"
              placeholder="例: 3200"
              value={payout}
              onChange={e => setPayout(e.target.value)}
              className="w-full rounded-xl px-4 py-3 text-body border border-white/10 outline-none"
              style={{ background: 'var(--bg)', color: 'var(--text)' }}
            />
          </div>
        )}
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 btn-ghost py-3">キャンセル</button>
          <button
            onClick={() => onSave(result, result === '的中' && payout ? parseInt(payout) : null)}
            disabled={result === '未入力'}
            className="flex-1 btn-next disabled:opacity-40"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main note page ───────────────────────────────────────────────

export default function NotePage({ notes, onUpdateResult }: {
  notes: NoteRecord[]
  onUpdateResult: (id: string, result: ResultStatus, payout: number | null) => void
}) {
  const [resultTargetId, setResultTargetId] = useState<string | null>(null)
  const [tab, setTab] = useState<'notes' | 'stats'>('notes')

  const wins = notes.filter(n => n.result === '的中').length
  const total = notes.filter(n => n.result !== '未入力').length
  const totalPayout = notes.reduce((s, n) => s + (n.payout ?? 0), 0)

  return (
    <div>
      <div className="sticky top-0 z-10 px-4 pt-6 pb-3 border-b border-white/10" style={{ background: 'var(--bg)' }}>
        <h1 className="text-title font-bold mb-3">📝 予想ノート</h1>
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'var(--surface)' }}>
          {([['notes', '予想記録'], ['stats', '成績']] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className="flex-1 py-2 rounded-lg text-caption font-bold transition-colors"
              style={tab === key
                ? { background: 'var(--bg)', color: 'var(--text)' }
                : { background: 'transparent', color: 'var(--text-sub)' }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pt-4">
        {tab === 'notes' && (
          <div className="space-y-3 pb-6">
            {notes.length === 0 ? (
              <div className="text-center py-16 space-y-3">
                <div className="text-5xl">📝</div>
                <div className="font-bold text-body">予想記録がありません</div>
                <div className="text-caption" style={{ color: 'var(--text-sub)' }}>
                  予想タブからウィザードを完了すると<br />ここに記録されます
                </div>
              </div>
            ) : (
              notes.map(note => (
                <NoteCard key={note.id} note={note} onResultInput={id => setResultTargetId(id)} />
              ))
            )}
          </div>
        )}

        {tab === 'stats' && (
          <div className="space-y-4 pb-6">
            <div className="grid grid-cols-2 gap-3">
              {[
                ['的中率', total > 0 ? `${Math.round((wins / total) * 100)}%` : '—'],
                ['的中回数', `${wins} / ${total}回`],
                ['総払戻', `¥${totalPayout.toLocaleString()}`],
                ['記録数', `${notes.length}レース`],
              ].map(([label, value]) => (
                <div key={label} className="card text-center">
                  <div className="text-caption" style={{ color: 'var(--text-sub)' }}>{label}</div>
                  <div className="font-bold text-heading mt-1" style={{ color: 'var(--accent)' }}>{value}</div>
                </div>
              ))}
            </div>
            {notes.length > 0 && (
              <div className="card space-y-2">
                <div className="flex items-center gap-2 mb-3">
                  <BarChart2 className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                  <span className="text-caption font-bold">直近の記録</span>
                </div>
                {notes.slice(0, 5).map(n => (
                  <div key={n.id} className="flex justify-between text-caption py-1.5 border-b border-white/5 last:border-0">
                    <span className="truncate flex-1">{n.race.name}</span>
                    <span className={n.result === '的中' ? 'text-green-400' : n.result === '外れ' ? 'text-red-400' : 'text-gray-500'}>
                      {n.result}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {resultTargetId && (
        <ResultModal
          onClose={() => setResultTargetId(null)}
          onSave={(result, payout) => {
            onUpdateResult(resultTargetId, result, payout)
            setResultTargetId(null)
          }}
        />
      )}
    </div>
  )
}
