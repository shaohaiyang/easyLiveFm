let audio = new Audio();

chrome.runtime.onMessage.addListener((message) => {
  if (message.target !== 'offscreen') return;

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

