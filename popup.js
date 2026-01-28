const HOST = "https://lhttp.qingting.fm/live";
const MP3 = "64k.mp3";
const DEFAULT_FMS = [
	  { name: "清晨音乐台", code: "4915"  },
	  { name: "两广音乐之声", code: "20500149"  },
	  { name: "杭州FM 90.7", code: "15318146"  },
	  { name: "上海流行音乐", code: "273"  },
	  { name: "成都怀旧音乐台", code: "20211686"  },
	  { name: "江苏经典流行音乐", code: "4938"  },
	  { name: "AsiaFM亚洲音乐台", code: "4581"  }
];

const fmList = document.getElementById('fmList');
const addArea = document.getElementById('addArea');
const fmNameInput = document.getElementById('fmName');
const fmCodeInput = document.getElementById('fmCode');
const statusText = document.getElementById('status');
let editingIndex = null;

let isPlaying = false; // 记录播放状态
const toggleBtn = document.getElementById('toggleBtn');

// 监听按钮点击
toggleBtn.addEventListener('click', () => {
  const url = fmList.value;
  const name = fmList.options[fmList.selectedIndex].text;

  if (!isPlaying) {
    // --- 执行播放逻辑 ---
    chrome.storage.local.set({ lastSelected: url });
    chrome.runtime.sendMessage({
      type: 'play',
      url: url
    });

    // 切换 UI
    isPlaying = true;
    toggleBtn.textContent = "⏸ 休息一下";
    toggleBtn.className = "stop-state";
    statusText.textContent = "🎶 正在播：" + name;
  } else {
    // --- 执行停止逻辑 ---
    chrome.runtime.sendMessage({ type: 'stop' });

    // 切换 UI
    isPlaying = false;
    toggleBtn.textContent = "▶ 开启音乐";
    toggleBtn.className = "play-state";
    statusText.textContent = "已停止，休息中...";
  }
});

// 优化：当用户切换下拉框时，如果正在播放，自动切换到新台
fmList.addEventListener('change', () => {
  if (isPlaying) {
    const url = fmList.value;
    chrome.runtime.sendMessage({ type: 'play', url: url });
    statusText.textContent = "🎶 已切台：" + fmList.options[fmList.selectedIndex].text;
  }
});

// 1. 初始化渲染：增加“恢复选中状态”逻辑
function renderList() {
    // 同时获取电台列表和上次选中的值
  chrome.storage.local.get(['myFms', 'lastSelected'], (res) => {
        const list = res.myFms || DEFAULT_FMS;
        const lastUrl = res.lastSelected;
        
        fmList.innerHTML = '';
    list.forEach((item, index) => {
            const option = document.createElement('option');
            const url = `${HOST}/${item.code}/${MP3}`;
            option.value = url;
            option.textContent = item.name;
            option.dataset.code = item.code;
            
            // 如果匹配到上次选中的 URL，则设为选中状态
      if (lastUrl && url === lastUrl) {
                option.selected = true;
              
      }
            
            fmList.appendChild(option);
          
    });

        // 如果当前有选中的电台，更新一下状态文字（温馨提示）
    if (fmList.selectedIndex !== -1 && lastUrl) {
              statusText.textContent = "上次听到：" + fmList.options[fmList.selectedIndex].text;
          
    }
      
  });
}

// 3. 列表切换逻辑：切换时也即时保存位置（可选）
fmList.addEventListener('change', () => {
      chrome.storage.local.set({ lastSelected: fmList.value  });
      statusText.textContent = "已选中：" + fmList.options[fmList.selectedIndex].text;

});

// --- 以下为增删改逻辑，保持不变 ---

document.getElementById('saveBtn').addEventListener('click', () => {
    const name = fmNameInput.value.trim();
    const code = fmCodeInput.value.trim();
  // --- Bug 修复：数字校验逻辑 ---
  if (!name) {
    alert("请输入电台名称哦~");
    return;
  }
  
  // 使用正则表达式测试是否为纯数字
  const isPureNumber = /^\d+$/.test(code);
  if (!code || !isPureNumber) {
    alert("电台 ID 必须是纯数字（例如：4915），请检查一下~");
    fmCodeInput.focus(); // 自动聚焦到输入框方便修改
    return;
  }
  // ---------------------------

  chrome.storage.local.get(['myFms'], (res) => {
        let list = res.myFms || [...DEFAULT_FMS];
    if (editingIndex !== null) {
            list[editingIndex] = { name, code  };
          
    } else {
            list.push({ name, code  });
          
    }
    chrome.storage.local.set({ myFms: list  }, () => {
            addArea.style.display = 'none';
            editingIndex = null;
            renderList();
          
    });
      
  });

});

document.getElementById('delBtn').addEventListener('click', () => {
    const index = fmList.selectedIndex;
    if (index === -1 || !confirm("确定要告别这个电台吗？")) return;
  chrome.storage.local.get(['myFms'], (res) => {
        let list = res.myFms || [...DEFAULT_FMS];
        list.splice(index, 1);
        chrome.storage.local.set({ myFms: list  }, renderList);
      
  });

});

document.getElementById('editBtn').addEventListener('click', () => {
    const index = fmList.selectedIndex;
    if (index === -1) return;
    const opt = fmList.options[index];
    fmNameInput.value = opt.text;
    fmCodeInput.value = opt.dataset.code;
    editingIndex = index;
    addArea.style.display = 'block';

});

document.getElementById('showAddBtn').addEventListener('click', () => {
    editingIndex = null;
    fmNameInput.value = '';
    fmCodeInput.value = '';
    addArea.style.display = 'block';

});

document.getElementById('cancelBtn').addEventListener('click', () => addArea.style.display = 'none');

// 每次打开弹窗，询问 background 当前是否在播放
chrome.runtime.sendMessage({ type: 'get-status' }, (response) => {
  if (response && response.playing) {
    isPlaying = true;
    toggleBtn.textContent = "⏸ 休息一下";
    toggleBtn.className = "stop-state";
  }
});

renderList();
