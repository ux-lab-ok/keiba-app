import { useState, useRef, useEffect } from 'react'
import { Send, Loader2, Bot, User, RotateCcw } from 'lucide-react'
import { sendAiAdvisorMessage, type ChatMessage } from '../api'

const STARTER_PROMPTS = [
  '今日のレースで注目すべきポイントを教えてください',
  'ペース分析のやり方を教えてください',
  '期待値（EV）の考え方を教えてください',
  '穴馬の見つけ方を教えてください',
]

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === 'user'
  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isUser ? 'bg-keiba-gold/20' : 'bg-blue-600/30'
        }`}
      >
        {isUser ? (
          <User className="w-4 h-4 text-keiba-gold" />
        ) : (
          <Bot className="w-4 h-4 text-blue-400" />
        )}
      </div>
      <div
        className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
          isUser
            ? 'bg-keiba-gold/20 text-white rounded-tr-sm'
            : 'bg-keiba-card border border-keiba-border text-gray-100 rounded-tl-sm'
        }`}
      >
        {msg.content}
      </div>
    </div>
  )
}

export default function AiAdvisorPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function send(text: string) {
    const trimmed = text.trim()
    if (!trimmed || loading) return

    setError(null)
    const userMsg: ChatMessage = { role: 'user', content: trimmed }
    const updated = [...messages, userMsg]
    setMessages(updated)
    setInput('')
    setLoading(true)

    try {
      const reply = await sendAiAdvisorMessage(updated)
      setMessages(prev => [...prev, { role: 'assistant', content: reply }])
    } catch (e: unknown) {
      const msg =
        e && typeof e === 'object' && 'response' in e
          ? (e as { response?: { data?: { detail?: string } } }).response?.data?.detail
          : '通信エラーが発生しました'
      setError(msg ?? '通信エラーが発生しました')
      setMessages(prev => prev.slice(0, -1))
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send(input)
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-keiba-dark px-4 pt-6 pb-4 border-b border-keiba-border">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Bot className="w-5 h-5 text-blue-400" />
              予想トレーナーAI
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">予想の思考プロセスを一緒に磨きましょう</p>
          </div>
          {messages.length > 0 && (
            <button
              onClick={() => { setMessages([]); setError(null) }}
              className="text-gray-500 active:text-white transition-colors"
              title="会話をリセット"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="space-y-4 pt-4">
            <div className="card text-center py-8">
              <div className="text-4xl mb-3">🏇</div>
              <p className="font-bold text-base mb-1">予想トレーナーAIへようこそ</p>
              <p className="text-sm text-gray-400 leading-relaxed">
                競馬の予想力を上げるための<br />
                パーソナルトレーナーです。<br />
                買い目を教えるのではなく、<br />
                「考え方」を一緒に磨きます。
              </p>
            </div>
            <p className="text-xs text-gray-500 text-center">よく聞かれる質問</p>
            <div className="space-y-2">
              {STARTER_PROMPTS.map(p => (
                <button
                  key={p}
                  onClick={() => send(p)}
                  className="w-full text-left card py-3 px-4 text-sm text-gray-300 active:border-keiba-gold/50 transition-colors"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <MessageBubble key={i} msg={msg} />
        ))}

        {loading && (
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600/30 flex items-center justify-center">
              <Bot className="w-4 h-4 text-blue-400" />
            </div>
            <div className="bg-keiba-card border border-keiba-border rounded-2xl rounded-tl-sm px-4 py-3">
              <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-900/30 border border-red-700/50 rounded-xl px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-keiba-border px-4 py-3 bg-keiba-dark">
        <div className="flex items-end gap-3">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="質問を入力…（Enterで送信）"
            rows={2}
            className="flex-1 bg-keiba-card border border-keiba-border rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 resize-none focus:outline-none focus:border-blue-500/50 transition-colors"
          />
          <button
            onClick={() => send(input)}
            disabled={!input.trim() || loading}
            className="flex-shrink-0 w-11 h-11 rounded-xl bg-blue-600 flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed active:bg-blue-700 transition-colors"
          >
            <Send className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>
    </div>
  )
}
