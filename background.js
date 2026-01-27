async function createOffscreen() {
  if (await chrome.offscreen.hasDocument()) return;
  await chrome.offscreen.createDocument({
    url: 'offscreen.html',
    reasons: ['AUDIO_PLAYBACK'],
    justification: 'Keep radio playing in background'
  });
}

chrome.runtime.onMessage.addListener(async (msg) => {
  if (msg.type === 'play') {
    await createOffscreen();
    chrome.runtime.sendMessage({ target: 'offscreen', ...msg });
  } else if (msg.type === 'stop') {
    chrome.runtime.sendMessage({ target: 'offscreen', ...msg });
  }
});

