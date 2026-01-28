let isPlaying = false;

// 创建离屏文档
async function createOffscreen() {
  if (await chrome.offscreen.hasDocument()) return;
  await chrome.offscreen.createDocument({
    url: 'offscreen.html',
    reasons: ['AUDIO_PLAYBACK'],
    justification: 'Keep radio playing in background'
  });
}

// 核心修正：确保参数完整
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'get-status') {
    // 这里的 sendResponse 必须对应参数列表中的第三个参数
    sendResponse({ playing: isPlaying });
    return false; // 同步返回状态，不需要保持通道开启
  }

  if (msg.type === 'play') {
    isPlaying = true;
    createOffscreen().then(() => {
      chrome.runtime.sendMessage({ target: 'offscreen', ...msg });
    });
  }
  else if (msg.type === 'stop') {
    isPlaying = false;
    chrome.runtime.sendMessage({ target: 'offscreen', ...msg });
  }

  // 必须返回 true 或调用 sendResponse 以防止某些浏览器的异步错误
  return true;
});
