import { useState } from 'react'
import { ChevronLeft } from 'lucide-react'
import { MOCK_RACES, type MockRace } from '../mock/races'

type Mark = '◎' | '○' | '▲' | '△' | '×' | ''
const MARKS: Mark[] = ['◎', '○', '▲', '△', '×']
const STEP_LABELS = ['条件', '能力', '適性', '展開', '馬場', '印']

interface WizardState {
  race: MockRace
  strongHorses: Set<number>
  aptHorses: Set<number>
  styleChoice: string
  positionChoice: string
  marks: Record<number, Mark>
}

interface SavedNote {
  race: MockRace
  marks: Record<number, Mark>
  savedAt: string
}

// ─── Step components ──────────────────────────────────────────────

function Step1({ race }: { race: MockRace }) {
  return (
    <div className="space-y-4">
      <p className="text-caption" style={{ color: 'var(--text-sub)' }}>
        まずレース条件を確認して、「どんなタイプの馬が有利か」をイメージしましょう。
      </p>
      <div className="card space-y-3">
        <div className="grid grid-cols-2 gap-3">
          {[
            ['コース', `${race.venue}・${race.track_type}${race.distance}m`],
            ['回り', `${race.rotation}回り`],
            ['馬場', race.track_condition],
            ['クラス', race.race_class],
            ['天気', race.weather],
            ['頭数', `${race.horses.length}頭`],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl p-3 border border-white/10 text-center"
              style={{ background: 'var(--bg)' }}>
              <div className="text-caption" style={{ color: 'var(--text-sub)' }}>{label}</div>
              <div className="font-bold text-body mt-0.5">{value}</div>
            </div>
          ))}
        </div>
        {race.grade && (
          <div className="flex justify-center">
            <span className="px-4 py-1 rounded-full text-caption font-bold bg-red-600/20 text-red-400 border border-red-600/40">
              {race.grade}
            </span>
          </div>
        )}
      </div>
      <div className="rounded-2xl p-4 border border-yellow-500/30 bg-yellow-500/10">
        <p className="text-caption font-bold text-yellow-400 mb-1">💡 AIヒント</p>
        <p className="text-body leading-relaxed">{race.hint}</p>
      </div>
      <p className="text-caption text-center" style={{ color: 'var(--text-sub)' }}>
        条件を確認したら「次へ」をタップ
      </p>
    </div>
  )
}

function Step2({
  race, selected, toggle,
}: { race: MockRace; selected: Set<number>; toggle: (n: number) => void }) {
  const sorted = [...race.horses].sort((a, b) => a.last3f - b.last3f)
  const best = sorted[0].last3f
  const worst = sorted[sorted.length - 1].last3f
  const range = worst - best || 1

  return (
    <div className="space-y-4">
      <p className="text-caption" style={{ color: 'var(--text-sub)' }}>
        上がり3Fタイムで能力を比較します。<strong className="text-white">速い馬をタップ</strong>して選んでください（複数可）。
      </p>
      <div className="space-y-2">
        {sorted.map(h => {
          const ratio = (h.last3f - best) / range
          const width = Math.round((1 - ratio) * 100)
          const sel = selected.has(h.number)
          return (
            <button
              key={h.number}
              onClick={() => toggle(h.number)}
              className={`w-full rounded-xl p-3 border transition-colors text-left ${
                sel ? 'border-keiba-accent bg-keiba-accent/10' : 'border-white/10'
              }`}
              style={sel ? { borderColor: 'var(--accent)', background: 'color-mix(in srgb, var(--accent) 12%, transparent)' } : { borderColor: 'rgba(255,255,255,0.1)', background: 'var(--surface)' }}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-bold text-body">{h.number}.{h.name}</span>
                <span className="text-caption font-mono"
                  style={{ color: ratio < 0.3 ? 'var(--accent)' : 'var(--text-sub)' }}>
                  {h.last3f.toFixed(1)}秒
                </span>
              </div>
              <div className="h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.1)' }}>
                <div
                  className="h-2 rounded-full transition-all"
                  style={{
                    width: `${width}%`,
                    background: ratio < 0.3 ? 'var(--accent)' : ratio < 0.6 ? 'var(--mark-taikou)' : 'var(--text-sub)',
                  }}
                />
              </div>
              <div className="mt-1 text-caption" style={{ color: 'var(--text-sub)' }}>
                {h.jockey}騎手　{h.style}
              </div>
            </button>
          )
        })}
      </div>
      {selected.size > 0 && (
        <div className="rounded-xl p-3" style={{ background: 'var(--surface)' }}>
          <p className="text-caption" style={{ color: 'var(--text-sub)' }}>
            選択中: {[...selected].map(n => race.horses.find(h => h.number === n)?.name).join('・')}
          </p>
        </div>
      )}
    </div>
  )
}

function Step3({
  race, selected, toggle,
}: { race: MockRace; selected: Set<number>; toggle: (n: number) => void }) {
  return (
    <div className="space-y-4">
      <p className="text-caption" style={{ color: 'var(--text-sub)' }}>
        血統・コース・距離の適性を確認します。◯が多い馬は条件が合っています。
      </p>
      <div className="space-y-2">
        {race.horses.map(h => {
          const score = [h.apt_surface, h.apt_distance, h.apt_rotation].filter(x => x === '◯').length
          const sel = selected.has(h.number)
          return (
            <button
              key={h.number}
              onClick={() => toggle(h.number)}
              className="w-full rounded-xl p-3 border text-left transition-colors"
              style={sel
                ? { borderColor: 'var(--accent)', background: 'color-mix(in srgb, var(--accent) 12%, transparent)' }
                : { borderColor: 'rgba(255,255,255,0.1)', background: 'var(--surface)' }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-body">{h.number}.{h.name}</span>
                <span className="text-caption font-bold"
                  style={{ color: score === 3 ? 'var(--accent)' : score === 2 ? 'var(--mark-taikou)' : 'var(--text-sub)' }}>
                  {score === 3 ? '適性◎' : score === 2 ? '適性○' : '適性△'}
                </span>
              </div>
              <div className="flex gap-2 text-caption">
                {[
                  [`${race.track_type}`, h.apt_surface],
                  [`${race.distance}m`, h.apt_distance],
                  [`${race.rotation}回り`, h.apt_rotation],
                ].map(([label, apt]) => (
                  <span
                    key={label}
                    className="px-2 py-0.5 rounded-full border"
                    style={{
                      borderColor: apt === '◯' ? 'var(--accent)' : apt === '△' ? 'rgba(255,180,0,0.4)' : 'rgba(229,72,77,0.4)',
                      color: apt === '◯' ? 'var(--accent)' : apt === '△' ? '#F8A500' : '#E5484D',
                      background: 'transparent',
                    }}
                  >
                    {apt} {label}
                  </span>
                ))}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function Step4({
  race, choice, setChoice,
}: { race: MockRace; choice: string; setChoice: (s: string) => void }) {
  const total = race.horses.length
  const styles = [
    { key: '逃げ先行', label: '逃げ・先行', count: race.pace_front, color: '#E5484D' },
    { key: '差し', label: '差し', count: race.pace_mid, color: '#3E63DD' },
    { key: '追込', label: '追込', count: race.pace_close, color: '#8E4EC6' },
  ]
  const pace = race.pace_front >= 3 ? 'ハイペース' : race.pace_front >= 2 ? 'ミドルペース' : 'スローペース'
  const paceHint = race.pace_front >= 3
    ? '逃げ先行が多く、ペースが上がりやすい。差し・追込が浮上しやすい展開。'
    : race.pace_front === 1
    ? '逃げ馬が1頭のみ。マイペースで逃げられる可能性が高く、先行有利。'
    : 'バランスのとれた展開。コース適性と上がり勝負になる可能性。'

  return (
    <div className="space-y-4">
      <p className="text-caption" style={{ color: 'var(--text-sub)' }}>
        脚質分布からペースを予測します。どの脚質の馬を狙いますか？
      </p>
      <div className="card space-y-3">
        <div className="flex gap-3 justify-between">
          {styles.map(s => (
            <div key={s.key} className="flex-1 text-center">
              <div className="text-heading font-bold" style={{ color: s.color }}>{s.count}</div>
              <div className="text-caption" style={{ color: 'var(--text-sub)' }}>{s.label}</div>
              <div className="mt-1 rounded-full h-1.5" style={{ background: 'rgba(255,255,255,0.1)' }}>
                <div className="rounded-full h-1.5" style={{ width: `${(s.count / total) * 100}%`, background: s.color }} />
              </div>
            </div>
          ))}
        </div>
        <div className="rounded-xl p-3 text-center" style={{ background: 'var(--bg)' }}>
          <div className="font-bold text-body" style={{ color: race.pace_front >= 3 ? '#3E63DD' : 'var(--accent)' }}>
            予測ペース：{pace}
          </div>
          <div className="text-caption mt-1" style={{ color: 'var(--text-sub)' }}>{paceHint}</div>
        </div>
      </div>
      <p className="text-caption font-bold">狙う脚質を選ぶ</p>
      <div className="grid grid-cols-2 gap-2">
        {['逃げ・先行', '差し', '追込', '問わない'].map(s => (
          <button
            key={s}
            onClick={() => setChoice(s)}
            className="py-3 rounded-xl border font-semibold text-body transition-colors"
            style={choice === s
              ? { borderColor: 'var(--accent)', background: 'color-mix(in srgb, var(--accent) 15%, transparent)', color: 'var(--text)' }
              : { borderColor: 'rgba(255,255,255,0.1)', background: 'var(--surface)', color: 'var(--text-sub)' }}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  )
}

function Step5({
  race, choice, setChoice,
}: { race: MockRace; choice: string; setChoice: (s: string) => void }) {
  return (
    <div className="space-y-4">
      <p className="text-caption" style={{ color: 'var(--text-sub)' }}>
        今日の馬場バイアスを確認します。
      </p>
      <div className="card space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-caption" style={{ color: 'var(--text-sub)' }}>馬場状態</span>
          <span className="font-bold text-body">{race.track_condition}</span>
        </div>
        <div className="text-body leading-relaxed">{race.track_info}</div>
      </div>
      {/* Simple track diagram */}
      <div className="rounded-2xl p-4 border border-white/10" style={{ background: 'var(--surface)' }}>
        <p className="text-caption mb-3" style={{ color: 'var(--text-sub)' }}>コース模式図</p>
        <div className="relative mx-auto w-36 h-24">
          <div className="absolute inset-0 rounded-full border-4 border-green-700/50" />
          <div className="absolute inset-4 rounded-full border-2 border-green-800/30 bg-green-900/20" />
          <div className="absolute top-1 left-1/2 -translate-x-1/2 text-[10px] text-green-400">外</div>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] text-green-600">内</div>
          <div className="absolute top-1/2 left-1 -translate-y-1/2 text-[10px] font-bold"
            style={{ color: 'var(--accent)' }}>
            {race.track_condition === '良' ? '内有利' : '中外有利'}
          </div>
        </div>
      </div>
      <p className="text-caption font-bold">注目する枠・ゾーンは？</p>
      <div className="grid grid-cols-3 gap-2">
        {['内枠重視', '中枠重視', '外枠重視'].map(s => (
          <button
            key={s}
            onClick={() => setChoice(s)}
            className="py-3 rounded-xl border text-caption font-semibold transition-colors"
            style={choice === s
              ? { borderColor: 'var(--accent)', background: 'color-mix(in srgb, var(--accent) 15%, transparent)', color: 'var(--text)' }
              : { borderColor: 'rgba(255,255,255,0.1)', background: 'var(--surface)', color: 'var(--text-sub)' }}
          >
            {s}
          </button>
        ))}
      </div>
      <div className="rounded-xl p-3 border border-yellow-500/30 bg-yellow-500/10">
        <p className="text-caption font-bold text-yellow-400 mb-1">💡 枠の影響</p>
        <p className="text-caption leading-relaxed">
          {race.track_condition === '良'
            ? '良馬場は内の芝が残りやすく、内枠先行が有利になりやすい傾向があります。'
            : '稍重〜重は内が傷みやすく、外を回ってくる差し馬が台頭しやすい傾向があります。'}
        </p>
      </div>
    </div>
  )
}

function Step6({
  race, marks, setMark, onSave,
}: { race: MockRace; marks: Record<number, Mark>; setMark: (n: number, m: Mark) => void; onSave: () => void }) {
  const assigned = Object.entries(marks).filter(([, m]) => m !== '').length
  const honmei = race.horses.find(h => marks[h.number] === '◎')
  const taikou = race.horses.find(h => marks[h.number] === '○')

  return (
    <div className="space-y-4">
      <p className="text-caption" style={{ color: 'var(--text-sub)' }}>
        各馬に印を付けてください。◎から順に1頭ずつ選ぶのがコツです。
      </p>
      {/* Mark legend */}
      <div className="flex gap-1.5 flex-wrap">
        {MARKS.map(m => (
          <span key={m} className={`mark-${m} px-2 py-0.5 rounded-full text-caption font-bold`}>
            {m}{m === '◎' ? '本命' : m === '○' ? '対抗' : m === '▲' ? '単穴' : m === '△' ? '連下' : '消し'}
          </span>
        ))}
      </div>
      <div className="space-y-2">
        {race.horses.map(h => {
          const current = marks[h.number] || ''
          return (
            <div key={h.number} className="rounded-xl p-3 border border-white/10" style={{ background: 'var(--surface)' }}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-body">{h.number}.{h.name}</span>
                <span className="text-caption" style={{ color: 'var(--text-sub)' }}>
                  {h.odds_win}倍
                </span>
              </div>
              <div className="flex gap-1.5">
                {MARKS.map(m => (
                  <button
                    key={m}
                    onClick={() => setMark(h.number, current === m ? '' : m)}
                    className="flex-1 py-2 rounded-xl text-caption font-bold border transition-all"
                    style={current === m
                      ? { background: `var(--mark-${m === '◎' ? 'honmei' : m === '○' ? 'taikou' : m === '▲' ? 'tanana' : m === '△' ? 'renka' : 'ana'})`, color: '#fff', borderColor: 'transparent' }
                      : { background: 'transparent', color: 'var(--text-sub)', borderColor: 'rgba(255,255,255,0.15)' }}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>
      {/* Buying suggestion */}
      {honmei && taikou && (
        <div className="rounded-2xl p-4 border border-green-500/30 bg-green-500/10">
          <p className="text-caption font-bold mb-2" style={{ color: 'var(--accent)' }}>🎯 買い目の参考</p>
          <div className="space-y-1.5 text-body">
            <div>単勝: <strong>{honmei.name}</strong></div>
            <div>馬連: <strong>{honmei.name}−{taikou.name}</strong></div>
            {Object.entries(marks).filter(([, m]) => m === '▲' || m === '△').length > 0 && (
              <div>ワイド: <strong>{honmei.name}</strong> 流し（対抗〜連下）</div>
            )}
          </div>
          <p className="text-caption mt-3" style={{ color: 'var(--text-sub)' }}>
            ※ あくまで参考です。最終判断はご自身でお願いします。
          </p>
        </div>
      )}
      <button
        onClick={onSave}
        disabled={assigned === 0}
        className="btn-next disabled:opacity-40"
      >
        予想ノートに記録する
      </button>
    </div>
  )
}

// ─── Main wizard ──────────────────────────────────────────────────

export default function WizardPage({ onNoteSaved }: { onNoteSaved?: (note: SavedNote) => void }) {
  const [selectedRace, setSelectedRace] = useState<MockRace | null>(null)
  const [step, setStep] = useState(1)
  const [state, setState] = useState<WizardState | null>(null)
  const [saved, setSaved] = useState(false)

  function startWizard(race: MockRace) {
    setSelectedRace(race)
    setState({
      race,
      strongHorses: new Set(),
      aptHorses: new Set(),
      styleChoice: '',
      positionChoice: '',
      marks: {},
    })
    setStep(1)
    setSaved(false)
  }

  function toggleSet(key: 'strongHorses' | 'aptHorses', n: number) {
    if (!state) return
    setState(prev => {
      if (!prev) return prev
      const s = new Set(prev[key])
      s.has(n) ? s.delete(n) : s.add(n)
      return { ...prev, [key]: s }
    })
  }

  function setMark(n: number, m: Mark) {
    setState(prev => prev ? { ...prev, marks: { ...prev.marks, [n]: m } } : prev)
  }

  function handleSave() {
    if (!state) return
    onNoteSaved?.({ race: state.race, marks: state.marks, savedAt: new Date().toISOString() })
    setSaved(true)
  }

  // Race selection screen
  if (!selectedRace || !state) {
    return (
      <div>
        <div className="sticky top-0 z-10 px-4 pt-6 pb-4 border-b border-white/10" style={{ background: 'var(--bg)' }}>
          <h1 className="text-title font-bold">🎯 予想ウィザード</h1>
          <p className="text-caption mt-0.5" style={{ color: 'var(--text-sub)' }}>6ステップで予想を組み立てよう</p>
        </div>
        <div className="px-4 pt-4 space-y-3">
          {MOCK_RACES.map(race => (
            <button
              key={race.id}
              onClick={() => startWizard(race)}
              className="w-full text-left card active:border-green-500/40 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-heading">{race.name}</span>
                    {race.grade && (
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-red-600/20 text-red-400 border border-red-600/30">
                        {race.grade}
                      </span>
                    )}
                  </div>
                  <div className="text-caption mt-1" style={{ color: 'var(--text-sub)' }}>
                    {race.venue}　{race.track_type}{race.distance}m　{race.horses.length}頭
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-caption">{race.date}</div>
                  <div className="text-body font-bold mt-0.5">{race.start_time}</div>
                </div>
              </div>
              <div className="mt-3 py-2 rounded-xl text-center text-caption font-bold"
                style={{ background: 'color-mix(in srgb, var(--accent) 15%, transparent)', color: 'var(--accent)' }}>
                この1レースを予想する →
              </div>
            </button>
          ))}
          <p className="text-caption text-center pb-6" style={{ color: 'var(--text-sub)' }}>
            ※ デモ用サンプルレースです
          </p>
        </div>
      </div>
    )
  }

  // Saved screen
  if (saved) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-8 text-center gap-6">
        <div className="text-6xl">✅</div>
        <div>
          <div className="text-heading font-bold">予想を記録しました</div>
          <div className="text-caption mt-1" style={{ color: 'var(--text-sub)' }}>ノートタブで確認できます</div>
        </div>
        <button onClick={() => { setSelectedRace(null); setState(null) }} className="btn-next w-full">
          別のレースを予想する
        </button>
      </div>
    )
  }

  const canNext = step < 6 || Object.values(state.marks).some(m => m !== '')
  const isLastStep = step === 6

  return (
    <div className="flex flex-col min-h-screen" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <div className="sticky top-0 z-10 px-4 pt-6 pb-3 border-b border-white/10" style={{ background: 'var(--bg)' }}>
        <div className="flex items-center gap-3 mb-3">
          <button onClick={() => step > 1 ? setStep(s => s - 1) : setSelectedRace(null)}
            className="w-10 h-10 flex items-center justify-center rounded-xl border border-white/10">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-body truncate">{state.race.name}</div>
            <div className="text-caption" style={{ color: 'var(--text-sub)' }}>
              ステップ{step}：{STEP_LABELS[step - 1]}
            </div>
          </div>
        </div>
        {/* Progress dots */}
        <div className="flex gap-1.5 justify-center">
          {STEP_LABELS.map((_, i) => (
            <div key={i} className="h-1.5 rounded-full transition-all"
              style={{
                width: i + 1 === step ? 24 : 8,
                background: i + 1 < step ? 'var(--accent)' : i + 1 === step ? 'var(--accent)' : 'rgba(255,255,255,0.2)',
                opacity: i + 1 <= step ? 1 : 0.4,
              }} />
          ))}
        </div>
      </div>

      {/* Step content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 pb-[calc(140px+env(safe-area-inset-bottom))]">
        {step === 1 && <Step1 race={state.race} />}
        {step === 2 && (
          <Step2 race={state.race} selected={state.strongHorses}
            toggle={n => toggleSet('strongHorses', n)} />
        )}
        {step === 3 && (
          <Step3 race={state.race} selected={state.aptHorses}
            toggle={n => toggleSet('aptHorses', n)} />
        )}
        {step === 4 && (
          <Step4 race={state.race} choice={state.styleChoice}
            setChoice={c => setState(p => p ? { ...p, styleChoice: c } : p)} />
        )}
        {step === 5 && (
          <Step5 race={state.race} choice={state.positionChoice}
            setChoice={c => setState(p => p ? { ...p, positionChoice: c } : p)} />
        )}
        {step === 6 && (
          <Step6 race={state.race} marks={state.marks} setMark={setMark} onSave={handleSave} />
        )}
      </div>

      {/* Bottom fixed button (steps 1-5 only; step 6 button is inside content) */}
      {!isLastStep && (
        <div className="fixed left-0 right-0 border-t border-white/10 px-4 pt-3 pb-3"
          style={{ background: 'var(--bg)', bottom: 'calc(56px + env(safe-area-inset-bottom))' }}>
          <div className="max-w-lg mx-auto">
            <button
              onClick={() => setStep(s => s + 1)}
              disabled={!canNext}
              className="btn-next disabled:opacity-40"
            >
              次へ → {STEP_LABELS[step]}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
