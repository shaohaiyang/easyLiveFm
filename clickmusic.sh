#!/bin/sh
# ============================================================
# easyLiteFm On-Demand - 蜻蜓FM点播频道播放器
# 兼容 bash / zsh / dash
# 依赖: curl, openssl, python3, 以及一个播放器
# ============================================================

# ======================== 配置 ========================
# 在此添加频道，一行一个：频道名称=频道ID
CHANNEL_DATA="
古典轻音乐=380319
催眠轻音乐=333190
优美轻音乐=481611
爱听轻音乐=347020
极静轻音乐=421527
纯美治愈曲=359203
行走的天籁=264554
"
# ====================== 配置结束 ======================

# ---------- 检测播放器 ----------
PLAYER=""
for cmd in ffplay mpv vlc mpg123 afplay; do
  if command -v "$cmd" >/dev/null 2>&1; then
    PLAYER="$cmd"
    break
  fi
done
[ -z "$PLAYER" ] && {
  echo "错误: 未找到播放器，请安装: brew install ffmpeg  # ffplay"; exit 1
}

# ---------- 工具函数 ----------
nth_line() { echo "$2" | grep -v '^[[:space:]]*$' | sed -n "${1}p" 2>/dev/null | sed 's/^[[:space:]]*//; s/[[:space:]]*$//'; }
line_count() { echo "$1" | grep -c . 2>/dev/null || true; }

# ---------- API ----------
get_version() {
  curl -sf "https://webapi.qtfm.cn/api/pc/channels/$1" 2>/dev/null |
    python3 -c "import sys,json; d=json.load(sys.stdin)['channel']; print(d.get('v',''))" 2>/dev/null
}

save_programs() {
  local cid="$1" version="$2" out="$3"
  curl -sf "https://i.qtfm.cn/capi/channel/${cid}/programs/${version}?curpage=1&pagesize=30&order=asc" \
    -e "https://www.qtfm.cn/channels/${cid}/" 2>/dev/null |
    python3 -c "
import sys, json
data = json.load(sys.stdin)['data']
for p in data['programs']:
    print(p['id'], p['title'], p['duration'], sep='\t')
" > "$out" 2>/dev/null
}

get_audio_url() {
  local ts=$(date +%s)
  local path="/audiostream/redirect/$1/$2?access_token=&device_id=MOBILESITE&qingting_id=&t=${ts}"
  local sign
  sign=$(printf "%s" "$path" | openssl dgst -hmac "7l8CZ)SgZgM_bkrw" -md5 2>/dev/null | awk '{print $NF}')
  local html
  html=$(curl -sf "https://audio.qtfm.cn${path}&sign=${sign}" 2>/dev/null)
  local m4a_url
  m4a_url=$(echo "$html" | grep -oE 'href="([^"]+)"' | sed 's/href="//;s/"//' | head -1)
  local final_url
  final_url=$(curl -sI "$m4a_url" 2>/dev/null | grep -i "^location:" | tr -d '\r' | sed 's/[Ll]ocation: //')
  echo "${final_url:-$m4a_url}"
}

read_key_raw() {
  python3 -c "
import sys, termios, tty, select
fd = sys.stdin.fileno()
old = termios.tcgetattr(fd)
try:
    tty.setraw(fd)
    r, _, _ = select.select([fd], [], [], 0.5)
    if r:
        ch = sys.stdin.read(1)
        print(ord(ch))
except:
    pass
finally:
    termios.tcsetattr(fd, termios.TCSADRAIN, old)
" 2>/dev/null
}

play_url() {
  local url="$1" title="$2"
  echo "▶ 播放: $title"
  echo "   播放器: $PLAYER    按 ESC 返回菜单"
  echo ""
  case "$PLAYER" in
    ffplay) ffplay -nodisp -autoexit -loglevel quiet "$url" 2>/dev/null &
            player_pid=$! ;;
    mpv)    mpv --no-terminal --no-video "$url" 2>/dev/null &
            player_pid=$! ;;
    vlc)    vlc --play-and-exit --intf dummy "$url" 2>/dev/null &
            player_pid=$! ;;
    mpg123) mpg123 "$url" </dev/null 2>/dev/null &
            player_pid=$! ;;
    afplay) curl -sf "$url" 2>/dev/null | afplay 2>/dev/null &
            player_pid=$! ;;
  esac
  while true; do
    if ! kill -0 "$player_pid" 2>/dev/null; then
      wait "$player_pid" 2>/dev/null; break
    fi
    code=$(read_key_raw)
    [ "$code" = "27" ] && { kill "$player_pid" 2>/dev/null; wait "$player_pid" 2>/dev/null; echo ""; break; }
  done
}

fmt_sec() {
  local s="${1%.*}"; [ -z "$s" ] && s=0
  case "$s" in *[!0-9]*) s=0;; esac
  printf "%02d:%02d" $((s/60)) $((s%60))
}

# ---------- 菜单 ----------
total=$(line_count "$CHANNEL_DATA")
[ "$total" -eq 0 ] && { echo "请在脚本中配置频道"; exit 1; }

while true; do
  echo ""
  echo "========================================"
  echo "   🎵 清新电台 - 点播频道"
  echo "========================================"
  echo ""
  i=1
  while [ "$i" -le "$total" ]; do
    printf "  %2d) %s\n" "$i" "$(nth_line "$i" "$CHANNEL_DATA" | cut -d= -f1)"
    i=$((i+1))
  done
  echo "  0) 退出"
  echo ""

  printf "请选择频道 [0-%d]: " "$total"
  read -r choice
  [ -z "$choice" ] && continue
  [ "$choice" = "0" ] && { echo "感谢蜻蜓FM，感谢你的关注，再见我的朋友"; exit 0; }
  [ "$choice" -ge 1 ] && [ "$choice" -le "$total" ] 2>/dev/null || continue

  line=$(nth_line "$choice" "$CHANNEL_DATA")
  cname=$(echo "$line" | cut -d= -f1)
  cid=$(echo "$line" | cut -d= -f2)

  version=$(get_version "$cid")
  [ -z "$version" ] && { echo "获取频道信息失败"; sleep 1; continue; }

  tmpf=$(mktemp) || exit 1
  echo "📡 $cname: 获取节目列表..."
  save_programs "$cid" "$version" "$tmpf"
  total_p=$(line_count "$(cat "$tmpf")")
  [ "$total_p" -eq 0 ] && { echo "获取节目列表失败"; rm -f "$tmpf"; sleep 1; continue; }

  while true; do
    echo ""
    echo "========================================"
    echo "   $cname （共 $total_p 个节目）"
    echo "========================================"
    echo ""
    i=1
    while [ "$i" -le "$total_p" ]; do
      line=$(sed -n "${i}p" "$tmpf")
      title=$(echo "$line" | cut -f2)
      dur=$(echo "$line" | cut -f3)
      printf "  %2d) %s (%s)\n" "$i" "$title" "$(fmt_sec "$dur")"
      i=$((i+1))
    done
    echo "  0) 返回频道列表"
    echo ""
    printf "请选择节目 [0-%d]: " "$total_p"
    read -r prog_choice
    [ -z "$prog_choice" ] && continue
    [ "$prog_choice" = "0" ] && { rm -f "$tmpf"; break; }
    [ "$prog_choice" -ge 1 ] && [ "$prog_choice" -le "$total_p" ] 2>/dev/null || continue

    line=$(sed -n "${prog_choice}p" "$tmpf")
    pid=$(echo "$line" | cut -f1)
    ptitle=$(echo "$line" | cut -f2)

    echo "🎵 加载音频: $ptitle"
    audio_url=$(get_audio_url "$cid" "$pid")
    [ -z "$audio_url" ] && { echo "获取音频链接失败"; sleep 1; continue; }

    play_url "$audio_url" "$ptitle"
    continue
  done
done
