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
    // 立即执行异步探测
    (async () => {
      try {
        const hasDoc = await chrome.offscreen.hasDocument();
        if (!hasDoc) {
          sendResponse({ playing: false });
        } else {
          // 这里是关键：等待离屏文档的真实状态
          const offscreenRes = await chrome.runtime.sendMessage({ 
            target: 'offscreen',
            type: 'check-real-status'
          });
          sendResponse({ playing: offscreenRes?.playing || false });
        }
      } catch (e) {
        // 如果离屏文档无响应，兜底返回 false
        sendResponse({ playing: false });
      }
    })();
    return true; // 【必须】声明我们将异步调用 sendResponse
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
