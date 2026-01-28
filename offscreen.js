let audio = new Audio();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.target !== 'offscreen') return;

  if (message.type === 'check-real-status') {
    // 检查 audio 对象是否存在且未暂停
    const isActuallyPlaying = audio && !audio.paused && audio.readyState > 0;
    sendResponse({ playing: isActuallyPlaying });
  }

  if (message.type === 'play') {
    // 强制重置之前的连接，防止流阻塞
    audio.pause();
    audio.src = message.url;
    audio.load(); // 必须调用 load() 以重新初始化流
    audio.play().catch(e => console.error("play failed:", e));
  } 
  else if (message.type === 'stop') {
    audio.pause();
    audio.src = ""; // 彻底切断连接以节省流量
  }
});

// 在 offscreen.js 中给 audio 对象加个监听
audio.onended = () => {
    chrome.runtime.sendMessage({ type: 'stop' }); // 通知 background 更新 isPlaying 变量
};
