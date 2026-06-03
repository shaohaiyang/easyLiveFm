# 蜻蜓FM 点播播放器 & Chrome 插件

## 🎵 clickmusic.sh — 可能是最好用的蜻蜓FM点播命令行播放器

一个优雅、轻量、功能完整的蜻蜓 FM 点播频道播放器脚本，终端里也能享受高品质轻音乐。

### 特性

- **纯 Shell 实现** — 兼容 bash / zsh，macOS / Linux 通用
- **零配置开箱即用** — 内置多频道配置，下载即可听
- **交互式菜单** — 频道列表 → 节目列表 → 选择即播，简单直观
- **ESC 一键返回** — 播放中按 ESC 秒回节目菜单，行云流水
- **智能播放器检测** — 自动识别 ffplay / mpv / vlc / mpg123 / afplay，优先最优
- **30 天节目回看** — 自动拉取最新节目列表，想看啥选啥
- **M4A 高品质音频** — 直连蜻蜓 CDN，流畅播放

### 依赖

- `curl` — API 请求
- `openssl` — 签名计算
- `python3` — 节目列表解析 & 按键捕获
- 任一播放器：`ffplay`(推荐) / `mpv` / `vlc` / `mpg123` / `afplay`(macOS 自带)

### 一键安装依赖 (macOS)

```bash
brew install ffmpeg  # 提供 ffplay
```

### 使用

```bash
chmod +x clickmusic.sh
./clickmusic.sh
```

选择频道 → 选择节目 → 享受音乐！按 ESC 返回节目列表。

### 自定义频道

编辑脚本开头的 `CHANNEL_DATA` 变量，一行一个频道：

```
CHANNEL_DATA="
我的频道=频道ID
"
```

频道 ID 可在蜻蜓 FM 网页版频道 URL 中找到。

### 技术亮点

- 使用 HMAC-MD5 签名模拟 Web 端请求，稳定抓取音频流
- 利用 `select.select` 实现非阻塞按键捕获，响应迅速
- 播放器后台运行 + 实时监听，不影响终端交互

---

## 🌐 Chrome 扩展

最早是用 Shell 写的蜻蜓 FM 脚本，后来做成了 Chrome 浏览器扩展，方便在浏览器中直接收听。
