#!/usr/bin/env python3
# =============================================================
# update-youtube-map.py
# Run this script whenever you publish a new podcast episode
# to refresh the Buzzsprout → YouTube video ID mapping.
#
# Usage:  python3 update-youtube-map.sh
#         (or just ask Claude: "update the youtube map")
# =============================================================

import subprocess, json, re, unicodedata, urllib.request, sys
from datetime import date

BUZZSPROUT_API = "https://www.buzzsprout.com/api/2324798/episodes.json?api_token=5c913cfdf411f020c10e9bd354f42836"
YOUTUBE_RSS    = "https://www.youtube.com/feeds/videos.xml?channel_id=UCiTc9fbcfRCP92xhTZBXr2Q"
OUTPUT_FILE    = "youtube-map.json"

STOP = {'with','from','the','and','for','that','this','have','are','was',
        'podcast','applied','psychology','psychotherapy','mental','health',
        'tool','tools','about','into','how','what','why','when','who','can',
        'your','their','our','its','not','but','more','some','been','they',
        'will','has','his','her','him','she','you','did','get','got',
        'also','even','just','than','then','them','these','those','there'}

def norm(s):
    s = unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode('ascii')
    s = re.sub(r'[^a-z0-9 ]', ' ', s.lower())
    return re.sub(r'\s+', ' ', s).strip()

def key_words(s):
    return [w for w in norm(s).split() if len(w) > 3 and w not in STOP]

def score_titles(bz_title, yt_title):
    bz_norm, yt_norm = norm(bz_title), norm(yt_title)
    if len(bz_norm) > 20 and (bz_norm in yt_norm or yt_norm in bz_norm):
        return 100
    bw = key_words(bz_title)
    yw = set(key_words(yt_title))
    if not bw: return 0
    hits  = sum(1 for w in bw if w in yw)
    ratio = hits / len(bw)
    if hits < 3 or ratio < 0.70: return 0
    return int(ratio * 100)

print("Fetching YouTube RSS feed...")
req    = urllib.request.Request(YOUTUBE_RSS, headers={'User-Agent': 'Mozilla/5.0'})
yt_xml = urllib.request.urlopen(req).read().decode('utf-8')
yt_videos = []
for entry in re.findall(r'<entry>(.*?)</entry>', yt_xml, re.DOTALL):
    vm = re.search(r'<yt:videoId>([^<]+)</yt:videoId>', entry)
    tm = re.search(r'<title>([^<]+)</title>', entry)
    if vm and tm:
        yt_videos.append({'videoId': vm.group(1).strip(), 'title': tm.group(1).strip()})
print(f"  Found {len(yt_videos)} YouTube videos")

print("Fetching Buzzsprout episodes...")
result = subprocess.run(['curl', '-s', BUZZSPROUT_API], capture_output=True, text=True)
bz_data     = json.loads(result.stdout)
bz_episodes = [ep for ep in bz_data if not ep.get('private') and not ep.get('inactive_at')]
print(f"  Found {len(bz_episodes)} Buzzsprout episodes")

print("Matching...")
video_map = {}
for ep in bz_episodes:
    best_s, best_v = 0, None
    for vid in yt_videos:
        s = score_titles(ep['title'], vid['title'])
        if s > best_s: best_s, best_v = s, vid
    if best_v and best_s > 0:
        video_map[str(ep['id'])] = {
            'videoId': best_v['videoId'], 'confidence': best_s, 'ytTitle': best_v['title']
        }
        print(f"  ✓ [{best_s}%] {ep['title'][:55]!r}")

print(f"\nMatched {len(video_map)} episodes")
out = {
    "generated": str(date.today()),
    "note": "Auto-generated. Run update-youtube-map.sh after each new episode.",
    "map": video_map
}
with open(OUTPUT_FILE, 'w') as f:
    json.dump(out, f, indent=2)
print(f"Saved {OUTPUT_FILE}")

# Also write youtube-map.js (loaded as <script> tag, works on file:// protocol)
js_file = OUTPUT_FILE.replace('.json', '.js')
with open(js_file, 'w') as f:
    f.write(f"// Auto-generated YouTube video map. Generated: {str(date.today())}\n")
    f.write(f"window.YOUTUBE_MAP = {json.dumps(video_map, indent=2)};\n")
print(f"Saved {js_file}")
