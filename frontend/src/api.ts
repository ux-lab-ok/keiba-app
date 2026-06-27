import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

export interface Race {
  id: string
  date: string
  venue: string
  race_number: number
  name: string
  distance: number
  track_type: string
  weather: string
  track_condition: string
  start_time: string
  grade: string
}

export interface Horse {
  id: number
  horse_id: string
  name: string
  number: number
  frame: number
  sex: string
  age: number
  weight: number
  weight_diff: number
  jockey: string
  trainer: string
  bloodline_sire: string
  bloodline_dam: string
  odds_win: number
  odds_place: number
  odds_updated_at: string | null
  win_prob: number
  value_score: number
  predicted_rank: number
  jockey_win_rate: number
  trainer_win_rate: number
  past_results: unknown[]
}

export interface RaceDetail extends Race {
  horses: Horse[]
}

export interface BetRecord {
  id: number
  race_id: string
  race_name: string
  race_date: string
  bet_type: string
  horse_names: string
  amount: number
  odds_at_bet: number
  result: string | null
  payout: number | null
  created_at: string
  note: string
}

export interface Stats {
  total_bets: number
  wins: number
  win_rate: number
  total_amount: number
  total_payout: number
  profit_loss: number
  roi: number
}

export const fetchAvailableDates = () =>
  api.get<{ dates: string[] }>('/available-dates').then(r => r.data.dates)

export const fetchRaces = (dateStr?: string) =>
  api.get<Race[]>('/races', { params: dateStr ? { date_str: dateStr } : {} }).then(r => r.data)

export const fetchRaceDetail = (raceId: string) =>
  api.get<RaceDetail>(`/races/${raceId}`).then(r => r.data)

export const fetchTodayPredictions = () =>
  api.get<{ race: Race; value_picks: Horse[] }[]>('/predictions/today').then(r => r.data)

export const fetchBets = () =>
  api.get<BetRecord[]>('/bets').then(r => r.data)

export const createBet = (payload: Partial<BetRecord>) =>
  api.post<BetRecord>('/bets', payload).then(r => r.data)

export const updateBetResult = (betId: number, result: string, payout: number) =>
  api.patch<BetRecord>(`/bets/${betId}/result`, { result, payout }).then(r => r.data)

export const fetchFavorites = () =>
  api.get<{ id: number; horse_id: string; name: string }[]>('/favorites').then(r => r.data)

export const addFavorite = (horse_id: string, name: string) =>
  api.post('/favorites', { horse_id, name }).then(r => r.data)

export const removeFavorite = (horse_id: string) =>
  api.delete(`/favorites/${horse_id}`).then(r => r.data)

export const fetchFavoriteRaces = () =>
  api.get<{ horse: Horse; race: Race }[]>('/favorites/races').then(r => r.data)

export const fetchStats = () =>
  api.get<Stats>('/stats').then(r => r.data)

export const refreshOdds = (raceId: string) =>
  api.post(`/races/${raceId}/refresh-odds`).then(r => r.data)

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export const sendAiAdvisorMessage = (
  messages: ChatMessage[],
  raceContext?: object
) =>
  api
    .post<{ content: string }>('/ai-advisor/chat', { messages, race_context: raceContext })
    .then(r => r.data.content)
