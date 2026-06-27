import httpx
import re
from bs4 import BeautifulSoup
from typing import Optional


HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Referer": "https://race.netkeiba.com/top/race_list.html",
}

VENUE_MAP = {
    "01": "札幌", "02": "函館", "03": "福島", "04": "新潟",
    "05": "東京", "06": "中山", "07": "中京", "08": "京都",
    "09": "阪神", "10": "小倉",
}


def _soup(resp: httpx.Response) -> BeautifulSoup:
    return BeautifulSoup(resp.content, "html.parser", from_encoding="euc-jp")


async def fetch_available_dates() -> list[str]:
    """Return race dates currently available on netkeiba (YYYYMMDD strings)."""
    url = "https://race.netkeiba.com/top/race_list_get_date_list.html"
    async with httpx.AsyncClient(headers=HEADERS, follow_redirects=True, timeout=15) as client:
        resp = await client.get(url)
    soup = _soup(resp)
    dates = [li.get("date", "") for li in soup.select("ul#date_list_sub li") if li.get("date")]
    return [d for d in dates if d]


async def fetch_race_list(date_str: str) -> list[dict]:
    """
    date_str: 'YYYYMMDD'
    Fetches race list from race_list_sub.html (the AJAX endpoint netkeiba's JS calls).
    """
    date_list_url = "https://race.netkeiba.com/top/race_list_get_date_list.html"
    async with httpx.AsyncClient(headers=HEADERS, follow_redirects=True, timeout=15) as client:
        resp = await client.get(date_list_url)
    soup = _soup(resp)

    group = ""
    for li in soup.select("ul#date_list_sub li"):
        if li.get("date") == date_str:
            group = li.get("group", "")
            break
    if not group:
        first = soup.select_one("ul#date_list_sub li")
        if first:
            group = first.get("group", "")

    url = f"https://race.netkeiba.com/top/race_list_sub.html?kaisai_date={date_str}"
    if group:
        url += f"&current_group={group}"

    async with httpx.AsyncClient(headers=HEADERS, follow_redirects=True, timeout=15) as client:
        resp = await client.get(url)
    soup = _soup(resp)

    races = []
    for item in soup.select(".RaceList_DataItem"):
        try:
            link = item.select_one("a")
            if not link:
                continue
            href = link.get("href", "")
            m = re.search(r"race_id=(\d+)", href)
            if not m:
                continue
            race_id = m.group(1)

            venue_code = race_id[4:6]
            venue = VENUE_MAP.get(venue_code, venue_code)

            race_num = 0
            race_num_el = item.select_one(".Race_Num")
            if race_num_el:
                nm = re.search(r"(\d+)R", race_num_el.get_text())
                if nm:
                    race_num = int(nm.group(1))
            if race_num == 0:
                race_num_m = re.search(r"(\d+)R", item.get_text())
                if race_num_m:
                    race_num = int(race_num_m.group(1))

            name_el = item.select_one(".ItemTitle")
            name = name_el.get_text(strip=True) if name_el else f"{race_num}R"

            time_el = item.select_one(".RaceList_Itemtime") or item.select_one(".RaceTime")
            start_time = time_el.get_text(strip=True) if time_el else ""

            info_el = item.select_one(".RaceData01") or item.select_one(".RaceList_ItemData01")
            info_text = info_el.get_text(strip=True) if info_el else ""

            distance = 0
            track_type = "芝"
            m2 = re.search(r"([芝ダ障])(\d+)m", info_text)
            if m2:
                t = m2.group(1)
                track_type = "芝" if t == "芝" else ("障害" if t == "障" else "ダート")
                distance = int(m2.group(2))

            grade = ""
            for g in ["G1", "G2", "G3"]:
                if g in name:
                    grade = g
                    break
            if not grade:
                grade_el = item.select_one("[class*='Icon_GradeType1 ']") or item.select_one("[class*='GradeType1\"']")
                if grade_el:
                    grade = "G1"
                elif item.select_one("[class*='GradeType2']"):
                    grade = "G2"
                elif item.select_one("[class*='GradeType3']"):
                    grade = "G3"

            races.append({
                "id": race_id,
                "date": f"{date_str[:4]}-{date_str[4:6]}-{date_str[6:]}",
                "venue": venue,
                "race_number": race_num,
                "name": name if name else f"{venue} {race_num}R",
                "distance": distance,
                "track_type": track_type,
                "start_time": start_time,
                "grade": grade,
                "weather": "",
                "track_condition": "",
            })
        except Exception:
            continue

    seen: set[str] = set()
    unique = []
    for r in races:
        if r["id"] not in seen:
            seen.add(r["id"])
            unique.append(r)
    return unique


async def fetch_race_detail(race_id: str) -> Optional[dict]:
    """Fetch horse entries from the shutuba (出馬表) page."""
    url = f"https://race.netkeiba.com/race/shutuba.html?race_id={race_id}"
    async with httpx.AsyncClient(headers=HEADERS, follow_redirects=True, timeout=15) as client:
        resp = await client.get(url)
    soup = _soup(resp)

    weather = ""
    track_condition = ""
    race_data = soup.select_one(".RaceData02")
    if race_data:
        for span in race_data.select("span"):
            text = span.get_text(strip=True)
            if text in ["晴", "曇", "雨", "小雨", "雪", "小雪"]:
                weather = text
            if text in ["良", "稍重", "重", "不良"]:
                track_condition = text

    horses = []
    for row in soup.select(".HorseList"):
        try:
            frame = 0
            frame_el = row.select_one(".Waku")
            if frame_el:
                fm = re.search(r"Waku(\d)", " ".join(frame_el.get("class", [])))
                if fm:
                    frame = int(fm.group(1))

            num_el = row.select_one(".Umaban")
            number = int(num_el.get_text(strip=True)) if num_el and num_el.get_text(strip=True).isdigit() else 0

            horse_link = row.select_one("a[href*='/horse/']")
            horse_name = horse_link.get_text(strip=True) if horse_link else ""
            horse_href = horse_link.get("href", "") if horse_link else ""
            hm = re.search(r"/horse/(\d+)", horse_href)
            horse_id = hm.group(1) if hm else f"{race_id}_{number}"

            sex_age_el = row.select_one(".Barei")
            sex_age_text = sex_age_el.get_text(strip=True) if sex_age_el else ""
            sex = sex_age_text[0] if sex_age_text else ""
            age_str = sex_age_text[1:] if len(sex_age_text) > 1 else ""
            age = int(age_str) if age_str.isdigit() else 0

            jockey_link = row.select_one("a[href*='/jockey/']")
            jockey = jockey_link.get_text(strip=True) if jockey_link else ""

            weight_el = row.select_one(".Weight")
            weight = 0.0
            weight_diff = 0.0
            if weight_el:
                wm = re.search(r"(\d+)\(([+\-]?\d+)\)", weight_el.get_text(strip=True))
                if wm:
                    weight = float(wm.group(1))
                    weight_diff = float(wm.group(2))

            trainer_link = row.select_one("a[href*='/trainer/']")
            trainer = trainer_link.get_text(strip=True) if trainer_link else ""

            odds_el = row.select_one(".Odds span")
            odds_win = 0.0
            if odds_el:
                try:
                    odds_win = float(odds_el.get_text(strip=True))
                except ValueError:
                    odds_win = 0.0

            sire_link = row.select_one("a[href*='/horse/sire/']")
            sire = sire_link.get_text(strip=True) if sire_link else ""

            if not horse_name:
                continue

            horses.append({
                "horse_id": horse_id,
                "name": horse_name,
                "number": number,
                "frame": frame,
                "sex": sex,
                "age": age,
                "weight": weight,
                "weight_diff": weight_diff,
                "jockey": jockey,
                "trainer": trainer,
                "odds_win": odds_win,
                "odds_place": 0.0,
                "bloodline_sire": sire,
                "bloodline_dam": "",
                "jockey_win_rate": 0.0,
                "trainer_win_rate": 0.0,
                "past_results": "[]",
            })
        except Exception:
            continue

    return {
        "weather": weather,
        "track_condition": track_condition,
        "horses": horses,
    }


async def fetch_odds(race_id: str) -> dict[str, float]:
    """Return {horse_number_str: odds_win} from the odds page."""
    url = f"https://race.netkeiba.com/odds/index.html?race_id={race_id}&type=b1"
    async with httpx.AsyncClient(headers=HEADERS, follow_redirects=True, timeout=15) as client:
        resp = await client.get(url)
    soup = _soup(resp)

    odds_map: dict[str, float] = {}
    for row in soup.select("#odds_tan_block tr"):
        tds = row.select("td")
        if len(tds) < 3:
            continue
        try:
            num = tds[0].get_text(strip=True)
            odds_val = float(tds[2].get_text(strip=True))
            odds_map[num] = odds_val
        except (ValueError, IndexError):
            continue
    return odds_map
