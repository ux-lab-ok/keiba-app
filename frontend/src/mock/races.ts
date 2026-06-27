export interface MockHorse {
  number: number
  frame: number
  name: string
  sex: string
  age: number
  jockey: string
  trainer: string
  odds_win: number
  bloodline_sire: string
  weight: number
  weight_diff: number
  // wizard-specific metadata
  last3f: number        // 上がり3F (sec)
  apt_surface: '◯' | '△' | '×'  // 芝適性
  apt_distance: '◯' | '△' | '×' // 距離適性
  apt_rotation: '◯' | '△' | '×' // 回り適性
  style: '逃げ' | '先行' | '差し' | '追込'
  inner_bias_ok: boolean // 内枠バイアスで恩恵あり
}

export interface MockRace {
  id: string
  name: string
  venue: string
  date: string
  race_number: number
  start_time: string
  grade: string
  distance: number
  track_type: '芝' | 'ダート'
  rotation: '右' | '左'
  race_class: string
  weather: string
  track_condition: string
  track_info: string   // 馬場バイアス情報
  pace_front: number   // 逃げ・先行頭数
  pace_mid: number
  pace_close: number
  hint: string         // AIヒント
  horses: MockHorse[]
}

export const MOCK_RACES: MockRace[] = [
  {
    id: 'mock_hanshin_g1',
    name: '宝塚記念',
    venue: '阪神',
    date: '2026-06-28',
    race_number: 11,
    start_time: '15:40',
    grade: 'G1',
    distance: 2200,
    track_type: '芝',
    rotation: '右',
    race_class: '3歳以上・オープン',
    weather: '晴',
    track_condition: '良',
    track_info: '開催後半で内が荒れ気味。中〜外枠の差し馬が有利傾向。上がり3F最速馬の連対率74%。',
    pace_front: 2,
    pace_mid: 4,
    pace_close: 2,
    hint: '阪神2200mは内回りコース。ペースが落ち着きやすく、先行力のある馬が残しやすい。ただし今週の馬場は中〜外が伸びているため、差し馬の台頭にも注意。',
    horses: [
      { number: 1, frame: 1, name: 'ドウデュース', sex: '牡', age: 5, jockey: '武豊', trainer: '友道康夫', odds_win: 3.2, bloodline_sire: 'ハーツクライ', weight: 470, weight_diff: -4, last3f: 34.1, apt_surface: '◯', apt_distance: '◯', apt_rotation: '◯', style: '差し', inner_bias_ok: false },
      { number: 2, frame: 1, name: 'ジャスティンパレス', sex: '牡', age: 5, jockey: 'ルメール', trainer: '杉山晴紀', odds_win: 4.5, bloodline_sire: 'ディープインパクト', weight: 480, weight_diff: +2, last3f: 34.3, apt_surface: '◯', apt_distance: '◯', apt_rotation: '◯', style: '差し', inner_bias_ok: false },
      { number: 3, frame: 2, name: 'リバティアイランド', sex: '牝', age: 4, jockey: '川田将雅', trainer: '中内田充正', odds_win: 5.1, bloodline_sire: 'ドゥラメンテ', weight: 458, weight_diff: 0, last3f: 33.8, apt_surface: '◯', apt_distance: '△', apt_rotation: '◯', style: '差し', inner_bias_ok: true },
      { number: 4, frame: 2, name: 'タスティエーラ', sex: '牡', age: 4, jockey: '松山弘平', trainer: '堀宣行', odds_win: 7.8, bloodline_sire: 'サトノクラウン', weight: 488, weight_diff: -2, last3f: 34.7, apt_surface: '◯', apt_distance: '◯', apt_rotation: '◯', style: '先行', inner_bias_ok: true },
      { number: 5, frame: 3, name: 'プログノーシス', sex: '牡', age: 6, jockey: '北村友一', trainer: '中内田充正', odds_win: 9.2, bloodline_sire: 'ディープインパクト', weight: 498, weight_diff: +4, last3f: 34.0, apt_surface: '◯', apt_distance: '◯', apt_rotation: '△', style: '差し', inner_bias_ok: false },
      { number: 6, frame: 3, name: 'ベラジオオペラ', sex: '牡', age: 4, jockey: '横山和生', trainer: '上村洋行', odds_win: 11.0, bloodline_sire: 'ロードカナロア', weight: 466, weight_diff: -6, last3f: 35.1, apt_surface: '◯', apt_distance: '△', apt_rotation: '◯', style: '先行', inner_bias_ok: true },
      { number: 7, frame: 4, name: 'ゴールドシップ産駒', sex: '牡', age: 5, jockey: '岩田望来', trainer: '池江泰寿', odds_win: 24.0, bloodline_sire: 'ゴールドシップ', weight: 504, weight_diff: +8, last3f: 35.4, apt_surface: '◯', apt_distance: '◯', apt_rotation: '◯', style: '追込', inner_bias_ok: false },
      { number: 8, frame: 4, name: 'シュトルーヴェ', sex: '牡', age: 5, jockey: 'Mデムーロ', trainer: '藤岡健一', odds_win: 31.0, bloodline_sire: 'オルフェーヴル', weight: 476, weight_diff: +2, last3f: 35.8, apt_surface: '△', apt_distance: '◯', apt_rotation: '△', style: '先行', inner_bias_ok: true },
    ],
  },
  {
    id: 'mock_hakodate_g3',
    name: '函館スプリントS',
    venue: '函館',
    date: '2026-06-21',
    race_number: 11,
    start_time: '15:35',
    grade: 'G3',
    distance: 1200,
    track_type: '芝',
    rotation: '右',
    race_class: '3歳以上・オープン',
    weather: '曇',
    track_condition: '稍重',
    track_info: '稍重で時計がかかる馬場。パワー型が有利。内枠先行が鉄則コース。',
    pace_front: 4,
    pace_mid: 2,
    pace_close: 2,
    hint: '函館1200mは逃げ・先行有利の典型的な小回りコース。稍重でさらに前が止まりにくくなっている。追込み馬は厳しい展開。',
    horses: [
      { number: 1, frame: 1, name: 'ナムラクレア', sex: '牝', age: 5, jockey: '浜中俊', trainer: '長谷川浩大', odds_win: 2.2, bloodline_sire: 'ミッキーアイル', weight: 454, weight_diff: -2, last3f: 33.5, apt_surface: '◯', apt_distance: '◯', apt_rotation: '◯', style: '先行', inner_bias_ok: true },
      { number: 2, frame: 1, name: 'ヴェントヴォーチェ', sex: '牡', age: 6, jockey: '西村淳也', trainer: '矢作芳人', odds_win: 6.5, bloodline_sire: 'ロードカナロア', weight: 512, weight_diff: 0, last3f: 33.9, apt_surface: '◯', apt_distance: '◯', apt_rotation: '◯', style: '逃げ', inner_bias_ok: true },
      { number: 3, frame: 2, name: 'テイエムスパーダ', sex: '牝', age: 5, jockey: '今村聖奈', trainer: '岡田稲男', odds_win: 8.1, bloodline_sire: 'アイルハヴアナザー', weight: 442, weight_diff: -4, last3f: 34.1, apt_surface: '◯', apt_distance: '◯', apt_rotation: '△', style: '逃げ', inner_bias_ok: true },
      { number: 4, frame: 2, name: 'ビッグシーザー', sex: '牡', age: 4, jockey: '藤岡佑介', trainer: '友道康夫', odds_win: 9.4, bloodline_sire: 'アメリカンファラオ', weight: 498, weight_diff: +2, last3f: 34.3, apt_surface: '△', apt_distance: '◯', apt_rotation: '△', style: '先行', inner_bias_ok: false },
      { number: 5, frame: 3, name: 'モズメイメイ', sex: '牝', age: 4, jockey: '坂井瑠星', trainer: '西村真幸', odds_win: 12.0, bloodline_sire: 'モズアスコット', weight: 448, weight_diff: -2, last3f: 33.7, apt_surface: '◯', apt_distance: '△', apt_rotation: '◯', style: '差し', inner_bias_ok: false },
      { number: 6, frame: 3, name: 'アグリ', sex: '牡', age: 5, jockey: '横山武史', trainer: '高野友和', odds_win: 15.0, bloodline_sire: 'スクリーンヒーロー', weight: 468, weight_diff: +4, last3f: 34.5, apt_surface: '◯', apt_distance: '◯', apt_rotation: '◯', style: '先行', inner_bias_ok: true },
    ],
  },
]
