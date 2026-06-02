
let lastPageBeforeVideo = "mainPage";
const video = document.getElementById("videoPlayer");
const subtitleList = document.getElementById("subtitleList");
const subtitleContainer = document.getElementById("subtitleContainer");
const subtitleSwitchBtn = document.getElementById("subtitleSwitchBtn");
const wordPopup = document.getElementById("wordPopup");
const modalOverlay = document.getElementById("modalOverlay");

let currentSubIndex = -1;
let subtitles = [];
let subVisible = true;
let wordLibrary = {};
let cet4Words = {}, cet6Words = {};
let fallbackAudio = null; // 当视频没有音轨时，尝试播放同名 .mp3 回退

// 全局共享缓存与计数，使用 window 以避免跨脚本重复声明冲突
window.allSubtitlesCache = window.allSubtitlesCache || JSON.parse(localStorage.getItem('allSubtitlesCache') || '[]');

// ================== 自定义音效系统（修复版） ==================
window.streakRight = window.streakRight || 0;   // 连续答对
window.streakWrong = window.streakWrong || 0;   // 连续答错

// 预加载所有音效
const sounds = {
  right: new Audio('right.mp3'),
  right5: new Audio('right5.mp3'),
  right10: new Audio('right10.mp3'),
  wrong: new Audio('wrong.mp3'),
  wrong5: new Audio('wrong5.mp3'),
  wrong10: new Audio('wrong10.mp3')
};

// 播放正确音效（自动判断连续次数）
function playRightSound() {
  window.streakRight++;
  window.streakWrong = 0; // 答错清零

  // 20连对 → 10连对音效（你没有20音效，用10代替）
  if (window.streakRight % 20 === 0) {
    sounds.right10.currentTime = 0;
    sounds.right10.play();
  }
  // 10连对
  else if (window.streakRight % 10 === 0) {
    sounds.right10.currentTime = 0;
    sounds.right10.play();
  }
  // 5连对
  else if (window.streakRight % 5 === 0) {
    sounds.right5.currentTime = 0;
    sounds.right5.play();
  }
  // 普通正确
  else {
    sounds.right.currentTime = 0;
    sounds.right.play();
  }
}

// 播放错误音效
function playWrongSound() {
  window.streakWrong++;
  window.streakRight = 0; // 答对清零

  if (window.streakWrong % 20 === 0) {
    sounds.wrong10.currentTime = 0;
    sounds.wrong10.play();
  }
  else if (window.streakWrong % 10 === 0) {
    sounds.wrong10.currentTime = 0;
    sounds.wrong10.play();
  }
  else if (window.streakWrong % 5 === 0) {
    sounds.wrong5.currentTime = 0;
    sounds.wrong5.play();
  }
  else {
    sounds.wrong.currentTime = 0;
    sounds.wrong.play();
  }
}

// 重置连续计数（退出练习时）
function resetStreak() {
  window.streakRight = 0;
  window.streakWrong = 0;
}

// NEWS 字幕语言切换：英文 / 中文 / 全部（修复按钮高亮 + 字幕联动）
window.newsLangMode = window.newsLangMode || 'all';
function showNewsLang(mode) {
  window.newsLangMode = mode;
  renderNewsSubtitles();

  // 按钮高亮状态
  document.getElementById('newsBtnEn').style.background = '#ccc';
  document.getElementById('newsBtnZh').style.background = '#ccc';
  document.getElementById('newsBtnAll').style.background = '#ccc';
  document.getElementById('newsBtnEn').style.color = '#222';
  document.getElementById('newsBtnZh').style.color = '#222';
  document.getElementById('newsBtnAll').style.color = '#222';

  if (mode === 'en') {
    document.getElementById('newsBtnEn').style.background = '#00953d';
    document.getElementById('newsBtnEn').style.color = '#fff';
  }
  if (mode === 'zh') {
    document.getElementById('newsBtnZh').style.background = '#00953d';
    document.getElementById('newsBtnZh').style.color = '#fff';
  }
  if (mode === 'all') {
    document.getElementById('newsBtnAll').style.background = '#00953d';
    document.getElementById('newsBtnAll').style.color = '#fff';
  }

  // 🔥 必须加这一句！！
  renderNewsSubtitles();
}

// 主题切换核心功能
function initTheme() {
  const themeBtn = document.getElementById('themeToggle');
  const isLight = localStorage.getItem('lightMode') === 'true';
  
  if (isLight) {
    document.documentElement.classList.add('light');
    themeBtn.textContent = '🌙';
  } else {
    themeBtn.textContent = '🌞';
  }

  themeBtn.onclick = function() {
    const isLightNow = document.documentElement.classList.toggle('light');
    localStorage.setItem('lightMode', isLightNow);
    // 切换图标
    this.textContent = isLightNow ? '🌙' : '🌞';
  };
}


// 答题正确调用
// playRightSound()
// 答题错误调用
// playWrongSound()

async function loadWordLibrary() {
  try {
    cet4Words = await fetch("cet4.json").then(r => r.json());
    cet6Words = await fetch("cet6.json").then(r => r.json());
    let vocabulary = await fetch("vocabulary.json").then(r => r.json());

    let allWords = {};
    for (let w in cet4Words) allWords[w] = { ...cet4Words[w], type: "cet4" };
    for (let w in cet6Words) allWords[w] = { ...cet6Words[w], type: "cet6" };
    for (let w in vocabulary) allWords[w] = { ...vocabulary[w], type: "vocabulary" };
    wordLibrary = allWords;

    console.log("✅ 词库加载完成");
  } catch (err) {
    console.log("❌ 词库加载失败");
  }
}

function getCollectedWords() {
  return JSON.parse(localStorage.getItem('collectedWords') || '[]');
}
function setCollectedWords(arr) {
  localStorage.setItem('collectedWords', JSON.stringify(arr));
}
function getPracticeSentences() {
  return JSON.parse(localStorage.getItem('practice') || '[]');
}
function setPracticeSentences(arr) {
  localStorage.setItem('practice', JSON.stringify(arr));
}

function collectWord(word) {
  const info = wordLibrary[word] || {};
  const list = getCollectedWords();
  const exists = list.some(item => item.word === word);
  if (!exists) {
    list.push({
      word: word,
      phonetic: info.phonetic || '',
      meaning: info.meaning || '',
      pos: info.pos || ''
    });
    setCollectedWords(list);
  }
}
function removeCollectedWord(word) {
  let list = getCollectedWords();
  list = list.filter(item => item.word !== word);
  setCollectedWords(list);
}
function collectSentence(text) {
  const list = getPracticeSentences();
  const exists = list.some(item => item.text === text);
  if (!exists) {
    list.push({ text: text });
    setPracticeSentences(list);
  }
}
function removeSentence(text) {
  let list = getPracticeSentences();
  list = list.filter(item => item.text !== text);
  setPracticeSentences(list);
}

function parseVttTime(str){
  const [h,m,s] = str.split(':');
  const sec = parseFloat(s);
  return parseInt(h)*3600 + parseInt(m)*60 + sec;
}
function parseVtt(text){
  const lines = text.trim().split(/\n+/);
  const res = [];
  let i = 0;
  while(i < lines.length && !lines[i].includes('-->')) i++;
  for(;i<lines.length;){
    const timeLine = lines[i];
    if(!timeLine.includes('-->')){i++;continue;}
    const [startStr, endStr] = timeLine.split('-->').map(x=>x.trim());
    const start = parseVttTime(startStr);
    const end = parseVttTime(endStr);
    i++;
    let en = '', zh = '';
    if(lines[i]) en = lines[i].trim();i++;
    if(lines[i]) zh = lines[i].trim();i++;
    res.push({time:start, start, end, en, zh});
  }
  return res;
}
async function loadSubtitle(videoSrc){
  const subSrc = videoSrc.replace('.mp4','.vtt');
  try{
    const res = await fetch(subSrc);
    if(!res.ok) throw 'no sub';
    const text = await res.text();
    subtitles = parseVtt(text);
    subtitles.forEach(sub => {
      sub.videoSrc = videoSrc;
      const exists = window.allSubtitlesCache.some(
        x => x.videoSrc === videoSrc && x.time === sub.time
      );
      if (!exists) window.allSubtitlesCache.push(sub);
    });
    localStorage.setItem('allSubtitlesCache', JSON.stringify(window.allSubtitlesCache));
    renderSubtitles();
  }catch(e){
    subtitleList.innerHTML = '<div style="text-align:center;padding:20px;color:var(--color-text);">暂无对应VTT字幕</div>';
    subtitles = [];
  }
}

function renderDramaVideos() {
  const list = JSON.parse(localStorage.getItem('dramaVideos') || '[]');
  const container = document.getElementById('mindVideoList');
  let html = ``; // 空白，无内置视频
  list.forEach(item => {
    html += `
    <div class="video-item">
      <div class="video-card" onclick="openVideo('${item.vid}')">
        <div class="video-del-btn" onclick="deleteVideo(event,this)">×</div>
        <img src="${item.img}" class="video-card-img">
        <div class="video-card-play"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></div>
      </div>
      <input class="video-name" type="text" value="${item.title}" onblur="saveDramaVideoName(this, '${item.vid}')">
    </div>`;
  });
  container.innerHTML = html;
}

function renderGTVideos() {
  const list = JSON.parse(localStorage.getItem('gtVideos') || '[]');
  const container = document.getElementById('gtVideoList');
  let html = ``; // 空白，无内置视频
  list.forEach(item => {
    html += `
    <div class="video-item">
      <div class="video-card" onclick="openVideo('${item.vid}')">
        <div class="video-del-btn" onclick="deleteVideo(event,this)">×</div>
        <img src="${item.img}" class="video-card-img">
        <div class="video-card-play"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></div>
      </div>
      <input class="video-name" type="text" value="${item.title}" onblur="saveGTVideoName(this, '${item.vid}')">
    </div>`;
  });
  container.innerHTML = html;
}

window.onload = async function () {
  initTheme();
  await loadWordLibrary();

  video.addEventListener("timeupdate", syncSubtitles);
  video.addEventListener("play", () => {
    document.getElementById('videoBox').classList.add('playing');
  });
  video.addEventListener("pause", () => {
    document.getElementById('videoBox').classList.remove('playing');
  });
  video.addEventListener("ended", resetSubtitleState);
  
  modalOverlay.onclick = closeAllModals;

  renderVoiceList();
  renderDramaVideos();
  renderGTVideos();
  ensureDefaultBbcNews();
  renderBbcNews();

  document.addEventListener('touchstart', function(e) {
    // NEWS 详情页单词点击弹窗
if (e.target.classList.contains("news-word-cet4") || 
    e.target.classList.contains("news-word-cet6") || 
    e.target.classList.contains("news-word-vocabulary")) {
  const word = e.target.dataset.word;
  const info = wordLibrary[word];
  if (info) {
    showWordInfo(word, info.phonetic, info.meaning, info.pos);
  }
  return;
}
    
    let timer = setTimeout(() => {
      e.target.dispatchEvent(new Event('longpress'));
    }, 600);
    e.target.addEventListener('touchend', () => clearTimeout(timer), { once: true });
  });

  loadUserProfile();
  bindProfileInputSave();
};

function renderSubtitles() {
  subtitleList.innerHTML = "";
  if(!subtitles.length) return;
  const practice = getPracticeSentences();
  subtitles.forEach((item, index) => {
    let enHtml = item.en;
    let zhHtml = item.zh;

    Object.keys(wordLibrary).forEach(word => {
      const info = wordLibrary[word];
      let enClass = '';
      let zhClass = '';
      if(info.type === 'cet4') {
        enClass = 'word-cet4';
        zhClass = 'zh-cet4';
      }
      if(info.type === 'cet6') {
        enClass = 'word-cet6';
        zhClass = 'zh-cet6';
      }
      if(info.type === 'vocabulary') {
        enClass = 'word-vocabulary';
        zhClass = 'zh-vocabulary';
      }

      const regEn = new RegExp(`\\b${word}\\b`, "gi");
      enHtml = enHtml.replace(regEn, `<span class="${enClass}" data-word="${word.toLowerCase()}">$&</span>`);

      if(info.meaning){
        const meanArr = info.meaning.split(/[,，；;]/).map(m=>m.trim());
        meanArr.forEach(mean=>{
          if(!mean) return;
          const regZh = new RegExp(mean, "g");
          zhHtml = zhHtml.replace(regZh, `<span class="${zhClass}">$&</span>`);
        });
      }
    });
    const text = item.en + ' ' + item.zh;
    const isCollected = practice.some(p => p.text === text);
    const div = document.createElement("div");
    div.className = "subtitle-item";
    div.onclick = () => jumpToSubtitle(index);
    div.innerHTML = `
      <button class="star-fav ${isCollected ? 'active' : ''}">★</button>
      <div class="sub-en">${enHtml}</div>
      <div class="sub-zh">${zhHtml}</div>
    `;
    subtitleList.appendChild(div);
  });
}
function syncSubtitles() {
  const now = video.currentTime;
  for (let i = 0; i < subtitles.length; i++) {
    const cur = subtitles[i];
    const next = subtitles[i + 1] || { time: 9999 };
    if (now >= cur.time && now < next.time && i !== currentSubIndex) {
      setActive(i);
      break;
    }
  }
}
function setActive(index) {
  const items = document.querySelectorAll(".subtitle-item");
  const list = document.getElementById("subtitleList");
  items.forEach((item, i) => {
    item.classList.remove("active", "played");
    if (i === index) item.classList.add("active");
    if (i < index) item.classList.add("played");
  });
  if (items[index]) {
    list.scrollTop = items[index].offsetTop - 120;
  }
  currentSubIndex = index;
}
function jumpToSubtitle(index) {
  if (subtitles[index]) {
    video.currentTime = subtitles[index].time;
    video.play();
  }
}
function openVideo(src, time = 0) {
  lastPageBeforeVideo = document.querySelector('.page.active').id;

  showPage('videoPage');
  video.src = src;
  video.currentTime = time;
  // 尝试解除静音并设置音量，确保用户通过播放按钮能听到声音
  try {
    video.muted = false;
    video.volume = 1;
  } catch (e) { /* 某些浏览器或元素状态可能抛错，忽略 */ }
  // 在打开视频时，检测是否有音轨；若没有则尝试加载同名 .mp3 回退
  detectAndAttachFallback(src).finally(() => {
    video.play().catch(() => { });
  });

  loadSubtitle(src).then(() => {
    if (time > 0 && subtitles.length > 0) {
      jumpToTimeSubtitle(time);
    }
  });
}
function resetSubtitleState() {
  currentSubIndex = -1;
  document.querySelectorAll(".subtitle-item").forEach(el => {
    el.classList.remove("active", "played");
  });
  subtitleList.style.transform = "translateY(0)";
}

// 检测视频是否含音轨；若无则尝试寻找并绑定同名 .mp3 作为回退音频
async function detectAndAttachFallback(videoSrc) {
  // 清理上一次的回退音频
  if (fallbackAudio) {
    try { fallbackAudio.pause(); } catch (e) {}
    fallbackAudio = null;
  }

  const mp3Src = videoSrc.replace(/\.mp4(\?.*)?$/i, '.mp3');
  // 等待视频 metadata，以便有些浏览器才能检测到解码字节数
  try {
    await new Promise(resolve => {
      if (video.readyState >= 1) return resolve();
      const onLoaded = () => { video.removeEventListener('loadedmetadata', onLoaded); resolve(); };
      video.addEventListener('loadedmetadata', onLoaded);
      // 超时兜底
      setTimeout(resolve, 800);
    });
  } catch (e) {
    console.warn('等待 loadedmetadata 异常', e);
  }

  // 基于多种浏览器 API 检测是否存在音轨
  let hasAudio = true;
  try {
    if ('webkitAudioDecodedByteCount' in video) {
      hasAudio = !!video.webkitAudioDecodedByteCount;
    } else if ('mozHasAudio' in video) {
      hasAudio = !!video.mozHasAudio;
    } else if (video.audioTracks && video.audioTracks.length !== undefined) {
      hasAudio = video.audioTracks.length > 0;
    } else {
      // 无法检测，假设有音频
      hasAudio = true;
    }
  } catch (e) {
    hasAudio = true;
  }

  if (hasAudio) {
    console.log('[音轨检测] 视频包含音轨，使用内置音频');
    return;
  }

  console.warn('[音轨检测] 未检测到视频音轨，将尝试同名 .mp3 回退:', mp3Src);
  try {
    const resp = await fetch(mp3Src);
    if (!resp.ok) throw new Error('mp3 not found');

    // 创建回退音频并与 video 同步播放/暂停/seek
    fallbackAudio = new Audio();
    fallbackAudio.src = mp3Src;
    fallbackAudio.preload = 'metadata';
    fallbackAudio.volume = 1;

    // 当 video.play 时，触发回退音频播放
    video.addEventListener('play', () => {
      try { if (fallbackAudio) { fallbackAudio.currentTime = video.currentTime; fallbackAudio.play().catch(()=>{}); } } catch (e) {}
    });
    video.addEventListener('pause', () => { try { if (fallbackAudio) fallbackAudio.pause(); } catch (e) {} });
    video.addEventListener('seeked', () => { try { if (fallbackAudio) fallbackAudio.currentTime = video.currentTime; } catch (e) {} });

    // 若 video 正在播放，则同步播放
    if (!video.paused && fallbackAudio) {
      try { fallbackAudio.currentTime = video.currentTime; fallbackAudio.play().catch(()=>{}); } catch (e) {}
    }

    console.log('[音轨回退] 已绑定回退音频：', mp3Src);
  } catch (e) {
    console.warn('[音轨回退] 未找到回退音频或加载失败：', e);
  }
}

document.addEventListener("click", e => {
  if (e.target.classList.contains("word-cet4") || e.target.classList.contains("word-cet6") || e.target.classList.contains("word-vocabulary")) {
    const word = e.target.dataset.word;
    const info = wordLibrary[word];
    if (!info) return;

    // ====================== 🔥 修复开始 ======================
    wordPopup.style.display = "block";
    // 原来：e.target.appendChild(wordPopup);
    // 现在：挂载到 body
    document.body.appendChild(wordPopup);
    wordPopup.style.position = "fixed";

    // 先临时放好，再计算
    wordPopup.style.left = "0px";
    wordPopup.style.top = "0px";
    // ====================== 🔥 修复结束 ======================

    setTimeout(() => {
      const wordRect = e.target.getBoundingClientRect();
      const popRect = wordPopup.getBoundingClientRect();

      let leftPos = wordRect.left;
      let topPos = wordRect.bottom + 6;

      // 右边不超出屏幕
      if (leftPos + popRect.width > window.innerWidth) {
        leftPos = window.innerWidth - popRect.width - 10;
      }
      if (leftPos < 10) leftPos = 10;

      wordPopup.style.left = leftPos + "px";
      wordPopup.style.top = topPos + "px";
    }, 0);

    wordPopup.innerHTML = `
      <p class="word-text">${word}</p>
      <p>释义：${info.meaning}</p>
      <p>音标：${info.phonetic}</p>
      <p>词性：${info.pos}</p>
      <p>等级：${info.type.toUpperCase()}</p>
      <button class="word-fav">收藏单词</button>
    `;
  } else if (e.target.classList.contains("translate-token")) {
    const token = e.target.dataset.word;
    const word = token;
    const info = wordLibrary[word.toLowerCase()] || wordLibrary[word] || {};
    // 填充内容
    wordPopup.innerHTML = `
      <div class="popup-row">
        <div class="popup-word">${escapeHtml(token)}</div>
        <div class="popup-info">
          <span class="info-meaning">${escapeHtml(info.meaning || '暂无释义')}</span>
          <span class="info-pos">${escapeHtml(info.pos || '暂无词性')}</span>
          <span class="info-phonetic">${escapeHtml(info.phonetic || '暂无音标')}</span>
        </div>
      </div>
    `;

    // 把弹窗挂到 body 并基于 token 的屏幕位置计算弹窗坐标，优先显示在上方
    wordPopup.style.position = 'absolute';
    wordPopup.style.display = 'block';
    document.body.appendChild(wordPopup);
    // 先放到 (0,0) 以便测量尺寸
    wordPopup.style.left = '0px';
    wordPopup.style.top = '0px';
    // 测量并定位
    const tokenRect = e.target.getBoundingClientRect();
    const popRect = wordPopup.getBoundingClientRect();
    let left = tokenRect.left + (tokenRect.width - popRect.width) / 2;
    if (left < 6) left = 6;
    if (left + popRect.width > window.innerWidth - 6) left = window.innerWidth - popRect.width - 6;
    
    // 优先显示在下方（更靠近单词）
    let top = tokenRect.bottom + 4; // 下方 4px 间距
    let placeAbove = false;
    
    // 如果下方空间不足，显示在上方
    if (top + popRect.height > window.innerHeight - 6) {
      top = tokenRect.top - popRect.height - 4; // 上方 4px 间距
      placeAbove = true;
    }
    
    wordPopup.style.left = left + 'px';
    wordPopup.style.top = top + 'px';
    wordPopup.style.transform = 'none';
  } else if (e.target.classList.contains("popup-star")) {
    const s = e.target;
    const word = s.dataset.word || s.closest('.word-popup').querySelector('.word-text').innerText;
    collectWord(word);
    s.classList.add('collected');
    s.textContent = '★';
  } else if (e.target.classList.contains("word-fav")) {
    const word = e.target.closest('.word-popup').querySelector('.word-text').innerText;
    collectWord(word);
    e.target.textContent = "已收藏";
    e.target.disabled = true;
  } else if (e.target.classList.contains("star-fav")) {
    const item = e.target.closest('.subtitle-item');
    const text = item.innerText.trim();
    const isActive = e.target.classList.contains('active');
    if (isActive) {
      removeSentence(text);
      e.target.classList.remove('active');
    } else {
      collectSentence(text);
      e.target.classList.add('active');
    }
  } else if (!wordPopup.contains(e.target)) {
    wordPopup.style.display = "none";
  }
});

// 🔥 修复：字幕显示 / 隐藏 按钮功能
function toggleSubtitleShow() {
  const container = document.getElementById('subtitleContainer');
  const btn = document.getElementById('subtitleSwitchBtn');
  
  // 切换隐藏/显示
  subVisible = !subVisible;
  
  if (!subVisible) {
    container.classList.add('hide-sub');
    btn.innerText = '显示字幕';
  } else {
    container.classList.remove('hide-sub');
    btn.innerText = '隐藏字幕';
  }
}
function togglePlayPause() {
  const vid = document.getElementById('videoPlayer');
  const box = document.getElementById('videoBox');

  // 强制取消静音 + 音量
  vid.muted = false;
  vid.volume = 1;

  if (vid.paused) {
    vid.play();
    box.classList.add('playing');
  } else {
    vid.pause();
    box.classList.remove('playing');
  }
}
function stopVideoAndBack() {
  video.pause();
  video.currentTime = 0;
  document.getElementById('videoBox').classList.remove('playing');
  showPage(lastPageBeforeVideo);
}
function showPage(id) {
  stopAllVoicePlay();
  speechSynthesis.cancel();
  
  document.querySelectorAll('.page').forEach(p => {
    p.classList.remove('active');
  });
  setTimeout(() => {
    document.getElementById(id).classList.add('active');
  }, 50);

  // ===================== 🔥 修复：底部Tab自动显隐（所有答题页自动隐藏） =====================
  const tabbar = document.getElementById('mainTabbar');
  // 只在 首页、加油站、我的 这3个页面显示Tab
  const showTabPages = ['mainPage', 'oilPage', 'iboPage'];

  if (tabbar) {
    tabbar.style.setProperty('display', showTabPages.includes(id) ? 'flex' : 'none', 'important');
  }
  // ==================================================================================

  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  if (id === 'mainPage') document.getElementById('tab-home').classList.add('active');
  if (id.startsWith('oil') || id.includes('word') || id.includes('practice')) document.getElementById('tab-oil').classList.add('active');
  if (id === 'iboPage') document.getElementById('tab-ibo').classList.add('active');

  const themeBtn = document.getElementById('themeToggle');
  themeBtn.style.display = id === 'mainPage' ? 'block' : 'none';
}

function addNewVideoCard() {
  const img = document.getElementById('imgName').value.trim();
  const vid = document.getElementById('videoName').value.trim();
  const title = document.getElementById('videoTitle').value.trim() || '新视频';
  if (!img || !vid) return;
  let list = JSON.parse(localStorage.getItem('dramaVideos') || '[]');
  list.push({ img, vid, title });
  localStorage.setItem('dramaVideos', JSON.stringify(list));
  renderDramaVideos();
  document.getElementById('imgName').value = '';
  document.getElementById('videoName').value = '';
  document.getElementById('videoTitle').value = '';
}
function deleteVideo(e, btn) {
  e.stopPropagation();
  if (!confirm('确定删除？')) return;
  const item = btn.closest('.video-item');
  const vidSrc = item.querySelector('.video-card').getAttribute('onclick').match(/'(.+?)'/)[1];
  let dramaList = JSON.parse(localStorage.getItem('dramaVideos') || '[]');
  dramaList = dramaList.filter(v => v.vid !== vidSrc);
  localStorage.setItem('dramaVideos', JSON.stringify(dramaList));
  let gtList = JSON.parse(localStorage.getItem('gtVideos') || '[]');
  gtList = gtList.filter(v => v.vid !== vidSrc);
  localStorage.setItem('gtVideos', JSON.stringify(gtList));
  item.remove();
}

document.getElementById('avatarInput').addEventListener('change', e => {
  const f = e.target.files[0];
  if (!f) return;
  const r = new FileReader();
  r.onload = e => document.getElementById('avatarPreview').src = e.target.result;
  r.readAsDataURL(f);
});

function showWordInfo(w, p, m, pos) {
  document.getElementById('modalWord').innerText = w;
  document.getElementById('modalPhonetic').innerText = p || '';
  document.getElementById('modalMeaning').innerText = m || '查询中';
  document.getElementById('modalPos').innerText = pos || '';
  document.getElementById('wordModal').style.display = 'block';
  document.getElementById('modalOverlay').style.display = 'block';
}
function closeWordModal() {
  document.getElementById('wordModal').style.display = 'none';
  document.getElementById('modalOverlay').style.display = 'none';
}
function closeTranslateModal() {
  document.getElementById('translateModal').style.display = 'none';
  document.getElementById('modalOverlay').style.display = 'none';
}
function closeAllModals() {
  document.getElementById('wordModal').style.display = 'none';
  document.getElementById('translateModal').style.display = 'none';
  document.getElementById('modalOverlay').style.display = 'none';
}
document.getElementById('modalStar').onclick = function () {
  const word = document.getElementById('modalWord').innerText;
  collectWord(word);
  this.classList.toggle('active');
}

let bannerSwiper = document.getElementById('bannerSwiper');
let bannerIndex = 0;
const bannerTotal = (bannerSwiper && bannerSwiper.querySelectorAll('.banner-card').length) || 0;
function autoBannerRoll() {
  if (bannerTotal <= 1) return;
  bannerIndex++;
  if (bannerIndex >= bannerTotal) bannerIndex = 0;
  const cardWidth = bannerSwiper.querySelector('.banner-card').offsetWidth;
  bannerSwiper.scrollTo({
    left: cardWidth * bannerIndex,
    behavior: 'smooth'
  });
}
if (bannerTotal > 1) {
  setInterval(autoBannerRoll, 5000);
}

function addNewVideoCardGT() {
  const img = document.getElementById('imgNameGt').value.trim();
  const vid = document.getElementById('videoNameGt').value.trim();
  const title = document.getElementById('videoTitleGt').value.trim() || '新视频';
  if (!img || !vid) return;
  let list = JSON.parse(localStorage.getItem('gtVideos') || '[]');
  list.push({ img, vid, title });
  localStorage.setItem('gtVideos', JSON.stringify(list));
  renderGTVideos();
  document.getElementById('imgNameGt').value = '';
  document.getElementById('videoNameGt').value = '';
  document.getElementById('videoTitleGt').value = '';
}

function playThisVoice(el) {
  const item = el.closest('.voice-item');
  const audio = item.querySelector('.voice-src');
  const gif = item.querySelector('.voice-wave-gif');
  const time = item.querySelector('.voice-time');

  if (!audio.paused) {
    audio.pause();
    gif.style.display = 'none';
    time.style.display = 'block';
    return;
  }

  document.querySelectorAll('.voice-src').forEach(a => {
    a.pause();
    a.currentTime = 0;
  });
  document.querySelectorAll('.voice-wave-gif').forEach(g => g.style.display = 'none');
  document.querySelectorAll('.voice-time').forEach(t => t.style.display = 'block');

  audio.play().catch(err => console.log('播放异常:', err));
  gif.style.display = 'inline-block';
  time.style.display = 'none';

  audio.onended = function () {
    gif.style.display = 'none';
    time.style.display = 'block';
  };
}
function addVoiceBar() {
  let name = document.getElementById('voiceName').value || 'Yibo语音';
  let time = document.getElementById('voiceTime').value || '00:15';
  let file = document.getElementById('voiceFile').value || 'voice1.mp3';
  let list = JSON.parse(localStorage.getItem('voiceList') || '[]');
 list.unshift({ name: '', time, file });
  localStorage.setItem('voiceList', JSON.stringify(list));
  renderVoiceList();
  document.getElementById('voiceName').value = '';
  document.getElementById('voiceTime').value = '';
  document.getElementById('voiceFile').value = '';
}

function renderVoiceList() {
  let list = JSON.parse(localStorage.getItem('voiceList') || '[]');
  let container = document.getElementById('voiceList');
  let html = '';
  list.forEach(item => {
    html += `
    <div class="voice-item" data-dur="${item.time}">
      <img class="voice-avatar" src="logo.jpg">
      <div class="voice-bar" onclick="playThisVoice(this)" style="position:relative;">
        <span class="voice-del" onclick="event.stopPropagation();deleteVoice(this,'${item.file}')" 
        style="display:none;position:absolute;right:-25px;top:50%;transform:translateY(-50%);
        background:rgba(150,150,150,0.4);color:#fff;width:18px;height:18px;
        border-radius:50%;font-size:12px;text-align:center;line-height:18px;">×</span>
        <div class="voice-text">
          <img class="voice-wave-gif" src="voice-wave.gif" alt="播放中">
        </div>
        <div class="voice-time">${item.time}</div>
      </div>
      <audio class="voice-src" src="${item.file}">
    </div>
    `;
  });
  container.innerHTML = html;
}

function deleteVoice(el, file) {
  if (!adminMode) return;
  if (!confirm('确定删除这条语音？')) return;
  let list = JSON.parse(localStorage.getItem('voiceList') || '[]');
  list = list.filter(x => x.file !== file);
  localStorage.setItem('voiceList', JSON.stringify(list));
  el.closest('.voice-item').remove();
}

const adminToggleBtn = document.getElementById('adminToggleBtn');
const adminVoiceForm = document.getElementById('adminVoiceForm');
let adminMode = false;

function globalSearch() {
  const kw = document.getElementById('mainSearchInput').value.trim().toLowerCase();
  const pop = document.getElementById('searchResultPop');
  pop.innerHTML = '';

  if (!kw) {
    pop.style.display = 'none';
    return;
  }

  let resultHtml = '';
  let hasResult = false;

  let cet4Match = [];
  for (let w in cet4Words) {
    if (w.toLowerCase().includes(kw) || cet4Words[w].meaning.toLowerCase().includes(kw)) {
      cet4Match.push(w);
    }
  }
  let cet6Match = [];
  for (let w in cet6Words) {
    if (w.toLowerCase().includes(kw) || cet6Words[w].meaning.toLowerCase().includes(kw)) {
      cet6Match.push(w);
    }
  }

  if (cet4Match.length) {
    resultHtml += '<div class="search-result-tip">📚 四级单词</div>';
    cet4Match.forEach(w => {
      hasResult = true;
      resultHtml += `<div class="search-result-item" data-type="cet4" data-val="${w}">${w} — ${cet4Words[w].meaning}</div>`;
    });
  }
  if (cet6Match.length) {
    resultHtml += '<div class="search-result-tip">📚 六级单词</div>';
    cet6Match.forEach(w => {
      hasResult = true;
      resultHtml += `<div class="search-result-item" data-type="cet6" data-val="${w}">${w} — ${cet6Words[w].meaning}</div>`;
    });
  }

  const subCache = JSON.parse(localStorage.getItem('allSubtitlesCache') || '[]');
  const subMatch = subCache.filter(item => 
    item.en.toLowerCase().includes(kw) || item.zh.includes(kw)
  );
  if (subMatch.length) {
    resultHtml += '<div class="search-result-tip">🎬 字幕句子</div>';
    subMatch.forEach(item => {
      hasResult = true;
      let text = item.en.length > 28 ? item.en.slice(0,28)+'...' : item.en;
      resultHtml += `<div class="search-result-item" data-type="sub" data-src="${item.videoSrc}" data-time="${item.time}">${text}</div>`;
    });
  }

  const dramaVideos = JSON.parse(localStorage.getItem('dramaVideos') || '[]');
  const gtVideos = JSON.parse(localStorage.getItem('gtVideos') || '[]');
  const allVideos = [...dramaVideos, ...gtVideos];
  const videoMatch = allVideos.filter(v => v.title.toLowerCase().includes(kw));
  if (videoMatch.length) {
    resultHtml += '<div class="search-result-tip">📺 视频</div>';
    videoMatch.forEach(v => {
      hasResult = true;
      resultHtml += `<div class="search-result-item" data-type="video" data-src="${v.vid}">${v.title}</div>`;
    });
  }

  if (!hasResult) {
    resultHtml += '<div class="search-result-tip">暂无匹配结果</div>';
  }

  pop.innerHTML = resultHtml;
  pop.style.display = 'block';
}

document.addEventListener('click', function(e){
  const popItem = e.target.closest('.search-result-item');
  const popBox = document.getElementById('searchResultPop');
  const input = document.getElementById('mainSearchInput');

  if(popItem){
    const type = popItem.dataset.type;
    const val = popItem.dataset.val;
    const src = popItem.dataset.src;
    const time = parseFloat(popItem.dataset.time || 0);

    if(type === 'cet4'){
      window.searchTargetWord = val;
      showPage('cet4Page');
      setTimeout(scrollToSearchWord,150);
    }else if(type === 'cet6'){
      window.searchTargetWord = val;
      showPage('cet6Page');
      setTimeout(scrollToSearchWord,150);
    }else if(type === 'sub'){
      openVideo(src, time);
    }else if(type === 'video'){
      openVideo(src, 0);
    }

    popBox.style.display = 'none';
    input.value = '';
    return;
  }

  if(!popBox.contains(e.target) && e.target !== input){
    popBox.style.display = 'none';
  }
});

function scrollToSearchWord() {
  const target = window.searchTargetWord;
  if (!target) return;

  const cards = document.querySelectorAll('.word-card');
  cards.forEach(card => {
    card.style.border = '';
    card.style.boxShadow = '';

    const wordEl = card.querySelector('span[style*="color:#00953d"]');
    const wordText = (wordEl && wordEl.innerText) || '';
    if (wordText.toLowerCase() === target.toLowerCase()) {
      card.style.border = '2px solid #00723c';
      card.style.boxShadow = '0 0 10px rgba(34,197,94,0.4)';
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  });
}

adminToggleBtn.onclick = function(){
  adminMode = !adminMode;
  const adminVoiceForm = document.getElementById('adminVoiceForm');
  const dramaAddForm = document.getElementById('dramaAddForm');
  const gtAddForm = document.getElementById('gtAddForm');

  if(adminMode){
    adminVoiceForm.style.display = 'block';
    dramaAddForm.style.display = 'block';
    gtAddForm.style.display = 'block';
    this.innerText = '关闭';
  }else{
    adminVoiceForm.style.display = 'none';
    dramaAddForm.style.display = 'none';
    gtAddForm.style.display = 'none';
    this.innerText = '管理';
  }
  document.querySelectorAll('.voice-del, .video-del-btn').forEach(btn=>{
    btn.style.display=adminMode?'grid':'none';
  });
  syncBbcAdminDisplay();
};

function saveDramaVideoName(inputEl, videoSrc) {
  let newTitle = inputEl.value.trim();
  let list = JSON.parse(localStorage.getItem('dramaVideos') || '[]');
  list = list.map(item => {
    if (item.vid === videoSrc) {
      item.title = newTitle;
    }
    return item;
  });
  localStorage.setItem('dramaVideos', JSON.stringify(list));
}

function saveGTVideoName(inputEl, videoSrc) {
  let newTitle = inputEl.value.trim();
  let list = JSON.parse(localStorage.getItem('gtVideos') || '[]');
  list = list.map(item => {
    if (item.vid === videoSrc) {
      item.title = newTitle;
    }
    return item;
  });
  localStorage.setItem('gtVideos', JSON.stringify(list));
}

function loadUserProfile() {
  const saveAvatar = localStorage.getItem('iboAvatar');
  if (saveAvatar) {
    document.getElementById('avatarPreview').src = saveAvatar;
  }
  const saveName = localStorage.getItem('iboName');
  if (saveName) {
    document.getElementById('iboName').value = saveName;
  }
  const saveSign = localStorage.getItem('iboSign');
  if (saveSign) {
    document.getElementById('iboSign').value = saveSign;
  }
}

function bindProfileInputSave() {
  const nameInput = document.getElementById('iboName');
  const signInput = document.getElementById('iboSign');

  nameInput.addEventListener('blur', function(){
    localStorage.setItem('iboName', this.value.trim());
  });

  signInput.addEventListener('blur', function(){
    localStorage.setItem('iboSign', this.value.trim());
  });
}

document.getElementById('avatarInput').addEventListener('change', e => {
  const f = e.target.files[0];
  if (!f) return;
  const r = new FileReader();
  r.onload = function (e) {
    const base64Img = e.target.result;
    document.getElementById('avatarPreview').src = base64Img;
    localStorage.setItem('iboAvatar', base64Img);
  };
  r.readAsDataURL(f);
});

let currentNewsList = [];
let bbcAudio = document.getElementById('bbcAudioPlayer');
let bbcSpeed = 1.0;

function ensureDefaultBbcNews() {
  const existing = JSON.parse(localStorage.getItem('bbcNewsList') || '[]');
  if (existing.length === 0) {
    const defaultNews = [{
      name: 'yibo climbs into a new role',
      time: 'By Xu Fan | chinadaily.com.cn | Updated: 2025-12-08 10:04',
      img: 'thumbnail_1.jpg',
      banner: 'news_1.jpg',
      audio: 'audio_1.mp3',
      sub: 'audio_1.vtt',
      content: `Singer-actor Wang Yibo has returned for the second season of Exploring the Unknown with Wang Yibo,\n歌手兼演员王一博回归《探索心境·王一博》第二季\n\nin which he unveils a new identity — a rock climber.\n在节目中，他展现了全新身份——攀岩爱好者\n\nProduced by the Discovery Channel and co-presented by Tencent Video and Warner Bros., the outdoor reality show has been streaming on Tencent Video since Nov 28.\n该户外真人秀由探索频道出品，腾讯视频与华纳兄弟联合呈现，自11月28日起在腾讯视频播出`
    }];
    localStorage.setItem('bbcNewsList', JSON.stringify(defaultNews));
  }
}

window.renderBbcNews = window.renderBbcNews || function() {
  const list = JSON.parse(localStorage.getItem('bbcNewsList') || '[]');
  currentNewsList = list;
  const container = document.getElementById('bbcNewsList');
  let html = '';
  list.forEach((item, index) => {
    html += `
    <div onclick="openBbcDetail(${index})" style="background:var(--bg-card); border-radius:14px; padding:12px 14px;
                display:flex; align-items:center; justify-content:space-between;
                box-shadow:0 2px 8px rgba(0,0,0,0.2); position:relative; cursor:pointer;">
      <div style="flex:1; padding-right:10px;">
        <div style="font-size:16px; font-weight:bold; color:#00953d; margin-bottom:4px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${item.name}</div>
        <div style="font-size:12px; color:var(--color-text-secondary);">${item.time}</div>
      </div>
      <div style="width:70px; height:70px; border-radius:10px; overflow:hidden; background:#000;flex-shrink:0;">
        <img src="${item.img}" style="width:100%;height:100%;object-fit:cover;" onerror="this.src='news_1.jpg'">
      </div>
      <div class="bbc-del-btn" onclick="event.stopPropagation();deleteBbcNews(${index})"
           style="position:absolute; top:6px; right:6px; width:20px; height:20px;
                  border-radius:50%; background:rgba(120,120,120,0.5); color:#fff;
                  display:grid; place-items:center; font-size:12px; cursor:pointer;
                  display:none;">×</div>
    </div>
    `;
  });
  container.innerHTML = html;
}

// 新增 NEWS：自动读取 VTT 内容作为文章正文
window.addBbcNews = window.addBbcNews || async function() {
  const name = document.getElementById('bbcArticleName').value.trim();
  const time = document.getElementById('bbcUpdateTime').value.trim();
  const img = document.getElementById('bbcImageName').value.trim();
  const banner = document.getElementById('bbcBannerImage').value.trim();
  const audio = document.getElementById('bbcAudioSrc').value.trim();
  const sub = document.getElementById('bbcSubSrc').value.trim();

  if (!name || !time || !img || !banner || !audio || !sub) {
    alert('请填写完整信息（必须包含 .vtt 字幕）');
    return;
  }

  try {
    // 🔥 自动加载 VTT 文件内容
    const res = await fetch(sub);
    if (!res.ok) throw new Error('VTT 文件不存在');
    
    const vttText = await res.text();
    const subs = parseVtt(vttText);
    
    // 🔥 把 VTT 字幕拼接成文章正文
    let autoContent = '';
    subs.forEach(item => {
      autoContent += item.en + '\n';
      autoContent += item.zh + '\n\n';
    });

    // 保存 NEWS（正文 = VTT 内容）
    const list = JSON.parse(localStorage.getItem('bbcNewsList') || '[]');
    list.unshift({ 
      name, time, img, banner, audio, sub, 
      content: autoContent.trim() // 自动填入正文
    });
    
    localStorage.setItem('bbcNewsList', JSON.stringify(list));
    renderBbcNews();
    alert('✅ 添加成功！正文已自动从 VTT 读取');

    // 清空表单
    document.getElementById('bbcArticleName').value = '';
    document.getElementById('bbcUpdateTime').value = '';
    document.getElementById('bbcImageName').value = '';
    document.getElementById('bbcBannerImage').value = '';
    document.getElementById('bbcAudioSrc').value = '';
    document.getElementById('bbcSubSrc').value = '';

  } catch (err) {
    alert('❌ 加载 VTT 失败：' + err.message);
  }
}

window.deleteBbcNews = window.deleteBbcNews || function(index) {
  if (!confirm('确定删除这条 NEWS？')) return;
  const list = JSON.parse(localStorage.getItem('bbcNewsList') || '[]');
  list.splice(index, 1);
  localStorage.setItem('bbcNewsList', JSON.stringify(list));
  renderBbcNews();
}

async function openBbcDetail(index) {
  const item = currentNewsList[index];
  
  const bannerImg = document.getElementById('bbcDetailBanner');
  bannerImg.src = '';
  bannerImg.src = item.banner;
  bannerImg.onerror = function() { this.src = 'news_1.jpg'; };
  
  document.getElementById('bbcDetailTitle').innerText = item.name;
  document.getElementById('bbcDetailTime').innerText = item.time;

  const contentEl = document.getElementById('bbcDetailContent');
  contentEl.style.display = 'none';
  contentEl.innerText = '';
  let html = '';

  if (item.content) {
    contentEl.innerText = item.content;
    html = contentEl.innerHTML;
  }

  Object.keys(cet4Words).forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    html = html.replace(regex, `<span class="news-word-cet4" data-word="${word.toLowerCase()}">$&</span>`);
  });
  Object.keys(cet6Words).forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    html = html.replace(regex, `<span class="news-word-cet6" data-word="${word.toLowerCase()}">$&</span>`);
  });
  Object.keys(wordLibrary).forEach(word => {
    const info = wordLibrary[word];
    if (info.type === 'vocabulary') {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      html = html.replace(regex, `<span class="news-word-vocabulary" data-word="${word.toLowerCase()}">$&</span>`);
    }
  });

  contentEl.innerHTML = html;
  
  // 音频设置
  bbcAudio.src = item.audio;
  bbcAudio.load();

  // 🔥 关键修复：加载 NEWS 字幕
  await loadNewsSubtitle(item.sub);
  
  const playBtn = document.getElementById('bbcPlayBtn');
  if (playBtn) playBtn.innerText = '▶';
  const progress = document.getElementById('bbcAudioProgress');
  if (progress) progress.value = 0;
  const current = document.getElementById('bbcAudioCurrent');
  if (current) current.innerText = '00:00';
  const duration = document.getElementById('bbcAudioDuration');
  if (duration) duration.innerText = '00:00';
  const subtitleContainer = document.getElementById('newsSubtitleContainer');
  const subBtn = document.getElementById('subToggleBtn');
  if (subtitleContainer) subtitleContainer.classList.remove('hide-sub');
  if (subBtn) subBtn.innerText = '关闭字幕';
  
  showPage('bbcDetailPage');
}

window.toggleNewsSubtitle = window.toggleNewsSubtitle || function() {
  const container = document.getElementById('newsSubtitleContainer');
  const btn = document.getElementById('subToggleBtn');
  if (!container || !btn) return;

  const hidden = container.classList.toggle('hide-sub');
  btn.innerText = hidden ? '显示字幕' : '关闭字幕';
}

window.escapeHtml = window.escapeHtml || function(str) {
  return str.replace(/[&<>"']/g, tag => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[tag]));
}
window.renderTranslateLine = window.renderTranslateLine || function(text) {
  if (!text) return '';
  const hasChinese = /[\u4e00-\u9fa5]/.test(text);
  if (hasChinese) {
    return `<div class="translate-line chinese">${escapeHtml(text)}</div>`;
  }
  const parts = text.split(/([A-Za-z'-]+)/).map(token => {
    if (/^[A-Za-z'-]+$/.test(token)) {
      const lower = token.toLowerCase();
      const info = wordLibrary[lower] || wordLibrary[token];
      if (info) {
        return `<span class="translate-token" data-word="${escapeHtml(token)}">${escapeHtml(token)}</span>`;
      }
    }
    return escapeHtml(token);
  });
  return `<div class="translate-line">${parts.join('')}</div>`;
}
window.openFullTranslate = window.openFullTranslate || function() {
  const translateModal = document.getElementById('translateModal');
  const translateContent = document.getElementById('translateContent');
  if (!translateModal || !translateContent) return;

  if (!newsSubtitles || newsSubtitles.length === 0) {
    translateContent.innerText = '暂无翻译内容';
  } else {
    translateContent.innerHTML = newsSubtitles.map(sub => {
      const enLine = renderTranslateLine(sub.en);
      const zhLine = renderTranslateLine(sub.zh);
      return `${enLine}${zhLine}<div class="translate-spacer"></div>`;
    }).join('');
  }

  translateModal.style.display = 'block';
  document.getElementById('modalOverlay').style.display = 'block';
}

// ===================== NEWS 字幕 VTT 支持 =====================
let newsSubtitles = [];
let currentNewsSubIndex = -1;

// 🔥 修复：NEWS 音频对应的 VTT 字幕加载（直接使用传入的 sub 路径）
window.loadNewsSubtitle = window.loadNewsSubtitle || async function(subSrc) {
  try {
    console.log('[字幕加载] 尝试加载字幕文件:', subSrc);
    
    // 直接使用传入的字幕路径，不再二次替换！
    const res = await fetch(subSrc);
    if (!res.ok) {
      console.error(`[字幕加载] HTTP ${res.status}: ${res.statusText} - 文件: ${subSrc}`);
      throw `HTTP ${res.status}: ${res.statusText}`;
    }
    
    const text = await res.text();
    console.log(`[字幕加载] 成功读取 ${text.length} 字符`);
    
    newsSubtitles = parseVtt(text);
    console.log(`[字幕加载] 解析成功，共 ${newsSubtitles.length} 条字幕`);
    
    renderNewsSubtitles();
  } catch (e) {
    console.error('[字幕加载] 错误详情:', e);
    console.warn('[字幕加载] 建议：使用 Web 服务器访问（如 python3 -m http.server 8000），不要用 file:// 协议');
    console.info('[字幕加载] 字幕文件应该与音频文件同名，如: audio_1.mp3 → audio_1.vtt');
    
    document.getElementById('newsSubtitleList').innerHTML = `
      <div style="text-align:center;padding:10px;color:var(--color-text-secondary);">
        ⚠️ 暂无字幕 - 请在浏览器控制台(F12)查看详情
      </div>`;
    newsSubtitles = [];
  }
}

// 渲染 NEWS 字幕（和视频页样式一致）
window.renderNewsSubtitles = window.renderNewsSubtitles || function() {
  const list = document.getElementById('newsSubtitleList');
  list.innerHTML = '';
  
  // 🔥 关键修复：没有字幕直接返回
  if (!newsSubtitles || newsSubtitles.length === 0) {
    list.innerHTML = `<div style="text-align:center;padding:10px;color:var(--color-text-secondary);">暂无字幕</div>`;
    return;
  }

  newsSubtitles.forEach((sub, index) => {
    const div = document.createElement('div');
    div.className = 'subtitle-item';
    div.onclick = () => jumpToNewsSubtitle(index);
    div.innerHTML = `
      <div class="sub-en">${sub.en}</div>
    `;
    list.appendChild(div);
  });
}

// 音频播放时同步字幕
window.syncNewsSubtitles = window.syncNewsSubtitles || function() {
  const now = bbcAudio.currentTime;
  for (let i = 0; i < newsSubtitles.length; i++) {
    const cur = newsSubtitles[i];
    const next = newsSubtitles[i + 1] || { time: 9999 };
    if (now >= cur.time && now < next.time && i !== currentNewsSubIndex) {
      setActiveNewsSub(i);
      break;
    }
  }
}

// 设置当前高亮字幕
window.setActiveNewsSub = window.setActiveNewsSub || function(index) {
  const items = document.querySelectorAll('#newsSubtitleList .subtitle-item');
  items.forEach((el, i) => {
    el.classList.remove('active', 'played');
    if (i === index) el.classList.add('active');
    if (i < index) el.classList.add('played');
  });
  currentNewsSubIndex = index;
}

// 点击字幕跳转对应时间
window.jumpToNewsSubtitle = window.jumpToNewsSubtitle || function(index) {
  if (newsSubtitles[index]) {
    bbcAudio.currentTime = newsSubtitles[index].time;
    bbcAudio.play();
  }
}

// 退出页面重置字幕
window.resetNewsSubtitle = window.resetNewsSubtitle || function() {
  currentNewsSubIndex = -1;
  newsSubtitles = [];
  const items = document.querySelectorAll('#newsSubtitleList .subtitle-item');
  items.forEach(el => el.classList.remove('active', 'played'));
}

window.toggleBbcAudio = window.toggleBbcAudio || function() {
  if (bbcAudio.paused) {
    bbcAudio.play().catch(() => alert('音频加载失败，请检查文件地址'));
    document.getElementById('bbcPlayBtn').innerText = '❚❚';
  } else {
    bbcAudio.pause();
    document.getElementById('bbcPlayBtn').innerText = '▶';
  }
}

window.toggleBbcSpeed = window.toggleBbcSpeed || function() {
  const speeds = [1.0, 1.25, 1.5, 0.75];
  const idx = speeds.indexOf(bbcSpeed);
  bbcSpeed = speeds[(idx + 1) % speeds.length];
  bbcAudio.playbackRate = bbcSpeed;
  document.getElementById('bbcSpeedBtn').innerText = bbcSpeed + 'x';
}

window.bbcSkip = window.bbcSkip || function(seconds) {
  bbcAudio.currentTime += seconds;
}

window.formatTime = window.formatTime || function(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

bbcAudio.addEventListener('loadedmetadata', () => {
  document.getElementById('bbcAudioDuration').innerText = formatTime(bbcAudio.duration);
});

bbcAudio.addEventListener('timeupdate', () => {
  const percent = (bbcAudio.currentTime / bbcAudio.duration) * 100;
  document.getElementById('bbcAudioProgress').value = percent;
  document.getElementById('bbcAudioCurrent').innerText = formatTime(bbcAudio.currentTime);
  
  // 🔥 同步字幕（必须加上）
  syncNewsSubtitles();
});

bbcAudio.addEventListener('ended', () => {
  document.getElementById('bbcPlayBtn').innerText = '▶';
  bbcAudio.currentTime = 0;
  document.getElementById('bbcAudioProgress').value = 0;
});

document.getElementById('bbcAudioProgress').addEventListener('input', function() {
  const time = (this.value / 100) * bbcAudio.duration;
  bbcAudio.currentTime = time;
});

window.stopBbcAudioAndBack = window.stopBbcAudioAndBack || function() {
  bbcAudio.pause();
  bbcAudio.currentTime = 0;
  document.getElementById('bbcPlayBtn').innerText = '▶';
  
  // 🔥 重置字幕
  resetNewsSubtitle();
  
  showPage('bbcPage');
}

window.syncBbcAdminDisplay = window.syncBbcAdminDisplay || function() {
  const bbcForm = document.getElementById('bbcNewsForm');
  const bbcDels = document.querySelectorAll('.bbc-del-btn');
  if (adminMode) {
    bbcForm.style.display = 'block';
    bbcDels.forEach(el => el.style.display = 'grid');
  } else {
    bbcForm.style.display = 'none';
    bbcDels.forEach(el => el.style.display = 'none');
  }
}

// ================== CET4 单词选择+答题逻辑 ==================
let currentCet4Tab = "todo";
let selectedCet4Words = [];
let currentExamIndex = 0;
let examWordList = [];

// 拼写模式专用变量
let currentSpellIndex = 0;
let spellWordList = [];
let currentInputList = [];
let wrongCount = 0;
let maxWrong = 3;

// 切换标签
window.switchCet4Tab = window.switchCet4Tab || function(tab) {
  currentCet4Tab = tab;
  document.querySelectorAll(".cet4-tab-btn").forEach(b => b.classList.remove("active"));
  document.querySelector(`.cet4-tab-btn[data-tab="${tab}"]`).classList.add("active");
  renderCet4WordList();
}

// 全选/取消全选 当前页面可见单词
let isAllSelected = false;
window.toggleSelectAllVisible = window.toggleSelectAllVisible || function() {
  const btn = document.getElementById('selectAllBtn');
  const visibleItems = document.querySelectorAll('.cet4-date-group .cet4-word-item');
  const visibleWords = [];

  visibleItems.forEach(item => {
    const word = item.querySelector('.cet4-word-name').innerText;
    visibleWords.push(word);
  });

  if (!isAllSelected) {
    visibleWords.forEach(word => {
      if (!selectedCet4Words.includes(word)) {
        selectedCet4Words.push(word);
      }
    });
    btn.innerText = '取消全选';
    isAllSelected = true;
  } else {
    selectedCet4Words = selectedCet4Words.filter(w => !visibleWords.includes(w));
    btn.innerText = '全选本页';
    isAllSelected = false;
  }

  renderCet4WordList();
  updateSelectedCount();
}

// 渲染四级单词列表（按日期分组）
window.renderCet4WordList = window.renderCet4WordList || async function() {
  const container = document.getElementById("cet4WordList");
  const collected = getCollectedWords().map(item => item.word.toLowerCase());
  
  let wordList = Object.entries(cet4Words).map(([word, info]) => ({
    word,
    ...info,
    collected: collected.includes(word.toLowerCase()),
    date: info.date || ""
  }));

  if (currentCet4Tab === "learned") {
    wordList = wordList.filter(w => w.collected);
  } else if (currentCet4Tab === "todo") {
    wordList = wordList.filter(w => !w.collected);
  }

  document.getElementById("cet4TotalCount").innerText = `共${wordList.length}词`;

  const grouped = {};
  wordList.forEach(item => {
    if (!grouped[item.date]) grouped[item.date] = [];
    grouped[item.date].push(item);
  });

  let html = "";
  for (let date in grouped) {
    html += `<div class="cet4-date-group">
      <div class="cet4-date-title">${date}</div>`;
    grouped[date].forEach(item => {
      const isSelected = selectedCet4Words.includes(item.word);
      html += `
      <div class="cet4-word-item" onclick="toggleWordSelect('${item.word}', this)">
        <div class="cet4-word-checkbox ${isSelected ? 'checked' : ''}"></div>
        <div class="cet4-word-name" onclick="speakWord('${item.word}')">${item.word}</div>
      </div>`;
    });
    html += `</div>`;
  }

  container.innerHTML = html;
}

// 切换单词选中状态
window.toggleWordSelect = window.toggleWordSelect || function(word, el) {
  const checkbox = el.querySelector(".cet4-word-checkbox");
  if (checkbox.classList.contains("checked")) {
    checkbox.classList.remove("checked");
    selectedCet4Words = selectedCet4Words.filter(w => w !== word);
  } else {
    checkbox.classList.add("checked");
    selectedCet4Words.push(word);
  }
  updateSelectedCount();
}

// 更新已选数量和开始按钮状态
window.updateSelectedCount = window.updateSelectedCount || function() {
  const count = selectedCet4Words.length;
  document.getElementById("cet4SelectedCount").innerText = count;
  
  const examBtn = document.getElementById("cet4StartBtn");
  const spellBtn = document.getElementById("cet4SpellBtn");
  
  if(count > 0){
    examBtn.style.opacity = "1";
    examBtn.style.cursor = "pointer";
    spellBtn.style.opacity = "1";
    spellBtn.style.cursor = "pointer";
  }else{
    examBtn.style.opacity = "0.6";
    examBtn.style.cursor = "not-allowed";
    spellBtn.style.opacity = "0.6";
    spellBtn.style.cursor = "not-allowed";
  }
}

// 开始识词答题
window.startCet4Exam = window.startCet4Exam || function() {
  if (selectedCet4Words.length === 0) return;
  examWordList = [...selectedCet4Words];
  currentExamIndex = 0;
  showPage("cet4ExamPage");
  renderCet4ExamQuestion();

  // 👇 加上这一行
  autoSpeakExamWord();
}

// 开始拼写答题
window.startCet4Spell = window.startCet4Spell || function(){
  if(selectedCet4Words.length === 0) return;
  spellWordList = [...selectedCet4Words];
  currentSpellIndex = 0;
  wrongCount = 0;
  showPage("cet4SpellPage");
  renderCet4Spell();

  // 👇 加上这一行
  speakWord(spellWordList[0]);
}

window.renderCet4Spell = window.renderCet4Spell || function(){
  const word = spellWordList[currentSpellIndex];
  const info = cet4Words[word];
  if(!info) return;

  document.getElementById("spellProgress").innerText = `${currentSpellIndex+1}/${spellWordList.length}`;
  document.getElementById("spellMeaning").innerText = info.meaning;
  document.getElementById("spellPhonetic").innerText = info.phonetic || '';
  document.getElementById("spellPos").innerText = info.pos || 'n.';

  document.getElementById("wrongTip").style.display = "none";
  document.getElementById("answerShow").style.display = "none";
  wrongCount = 0;

  const container = document.getElementById("spellInputContainer");
  container.innerHTML = "";
  currentInputList = [];

  const letters = word.split("");
  letters.forEach((letter, idx) => {
    const input = document.createElement("input");
    input.style.width = "40px";
    input.style.height = "50px";
    input.style.textAlign = "center";
    input.style.fontSize = "22px";
    input.style.border = "none";
    input.style.borderBottom = "2px solid var(--color-text)";
    input.style.background = "transparent";
    input.style.outline = "none";
    input.style.color = "#fff";
    input.maxLength = 1;
    input.dataset.index = idx;

    // 👇 重点：绑定 keydown（处理退格）
    input.onkeydown = function(e) {
      const i = parseInt(this.dataset.index);
      // 退格键
      if (e.key === "Backspace") {
        e.preventDefault();
        // 1）当前有字母：清空，光标不动
        if (this.value !== "") {
          this.value = "";
          currentInputList[i] = "";
          return;
        }
        // 2）当前空：跳到上一格并清空
        if (i > 0) {
          const prev = container.children[i-1];
          prev.value = "";
          currentInputList[i-1] = "";
          prev.focus();
        }
      }
    };

    // 👇 输入：正确绿色、错误红色、自动下一格
    input.oninput = function() {
      const i = parseInt(this.dataset.index);
      this.value = this.value.toLowerCase();
      currentInputList[i] = this.value;

      const correctChar = letters[i];
      if (this.value === correctChar) {
        this.style.color = "#22c55e";
        this.style.borderBottomColor = "#22c55e";
      } else {
        this.style.color = "#ff4444";
        this.style.borderBottomColor = "#ff4444";
      }

      // 自动跳到下一格
      if (this.value && i < letters.length - 1) {
        container.children[i+1].focus();
      }

      // 全部填完自动核对
      if (currentInputList.filter(Boolean).length === letters.length) {
        checkSpell();
      }
    };

    container.appendChild(input);
  });
}

// 核对拼写
window.checkSpell = window.checkSpell || function(){
  const word = spellWordList[currentSpellIndex];
  const userInput = currentInputList.join("");
  const inputs = document.querySelectorAll("#spellInputContainer input");
  const wrongTip = document.getElementById("wrongTip");
  const answerShow = document.getElementById("answerShow");
  
  const correct = (userInput === word);
  
  if(correct){
    collectWord(word);
    // 🔥 正确：图片 + 音效
    showPopup(true);
    playRightSound();
    
    setTimeout(()=>{
      nextSpell();
    },1000);
    return;
  }
  
  // 错误
  wrongCount++;
  // 🔥 错误：图片 + 音效
  showPopup(false);
  playWrongSound();
  wrongTip.style.display = "block";
  
  // 🔥 标红错误字母
  const letters = word.split("");
  inputs.forEach((input, idx)=>{
    if(input.value !== letters[idx]){
      input.style.borderBottomColor = "#ff4444";
      input.style.color = "#ff4444";
    }
  });
  
  // 错误3次显示答案
  if(wrongCount >= maxWrong){
    answerShow.innerText = `正确答案：${word}`;
    answerShow.style.display = "block";
    
    setTimeout(()=>{
      nextSpell();
    },1500);
  }
}

// 下一题
window.nextSpell = window.nextSpell || function(){
  currentSpellIndex++;
  if(currentSpellIndex >= spellWordList.length){
    alert("拼写完成！");
    stopCet4SpellAndBack();
    return;
  }
  renderCet4Spell();
  
  // 🔥 修复：每一题自动播放
  setTimeout(() => {
    const word = spellWordList[currentSpellIndex];
    safeSpeak(word);
  }, 600);
}

window.stopCet4SpellAndBack = window.stopCet4SpellAndBack || function(){
  spellWordList = [];
  currentSpellIndex = 0;
  selectedCet4Words = []; // 🔥 清空选中
  isAllSelected = false;

  const btn = document.getElementById('selectAllBtn');
  if (btn) btn.innerText = '全选本页';

  showPage("cet4Page");
  
  setTimeout(() => {
    renderCet4WordList();
    updateSelectedCount();
  }, 60);
  
  resetStreak();
}

// 渲染识词题目
window.renderCet4ExamQuestion = window.renderCet4ExamQuestion || function() {
  const word = examWordList[currentExamIndex];
  const info = cet4Words[word];
  if (!info) return;

  document.getElementById("cet4ExamProgress").innerText = `${currentExamIndex + 1}/${examWordList.length}`;
  document.getElementById("cet4ExamWord").innerText = word;
  document.getElementById("cet4ExamPhonetic").innerText = info.phonetic || "";

  const correctAnswer = `${info.pos || 'pron.'} ${info.meaning}`;
  const wrongAnswers = [];
  const allMeanings = Object.values(cet4Words).filter(i => i.meaning !== info.meaning);
  
  while (wrongAnswers.length < 3 && allMeanings.length > 0) {
    const randomIdx = Math.floor(Math.random() * allMeanings.length);
    const wrong = allMeanings.splice(randomIdx, 1)[0];
    wrongAnswers.push(`${wrong.pos || 'n.'} ${wrong.meaning}`);
  }
  
  const options = [correctAnswer, ...wrongAnswers].sort(() => Math.random() - 0.5);

  let html = "";
  options.forEach(option => {
    html += `
    <div class="cet4-exam-option" onclick="selectExamOption(this, '${correctAnswer}')">${option}</div>`;
  });
  document.getElementById("cet4ExamOptions").innerHTML = html;

  // 只保留这一句，删掉原来的 autoSpeakExamWord()
  setTimeout(() => {
    const word = document.getElementById("cet4ExamWord").innerText;
    safeSpeak(word);
  }, 600);
}

// 选择选项
window.selectExamOption = window.selectExamOption || function(el, correctAnswer) {
  document.querySelectorAll(".cet4-exam-option").forEach(opt => opt.style.pointerEvents = "none");
  
  const userAnswer = el.innerText.trim();
  const isCorrect = (userAnswer === correctAnswer.trim());
  const currentWord = examWordList[currentExamIndex];
  let collectedWords = getCollectedWords().map(w => w.word.toLowerCase());

  if (isCorrect) {
    if (!collectedWords.includes(currentWord.toLowerCase())) {
      collectWord(currentWord);
    }
  } else {
    if (collectedWords.includes(currentWord.toLowerCase())) {
      removeCollectedWord(currentWord);
    }
  }

  if (isCorrect) {
    el.classList.add("correct");
    playRightSound();
  } else {
    el.classList.add("wrong");
    playWrongSound();
    document.querySelectorAll(".cet4-exam-option").forEach(opt => {
      if (opt.innerText.trim() === correctAnswer.trim()) {
        opt.classList.add("correct");
      }
    });
  }

  const popup = document.getElementById("answerPopup");
  const popupIcon = document.getElementById("popupIcon");
  popupIcon.src = isCorrect ? "right.png" : "wrong.png";
  popup.style.visibility = "visible";

  setTimeout(() => {
    popup.style.visibility = "hidden";
    currentExamIndex++;
    if (currentExamIndex >= examWordList.length) {
      alert("练习完成！");
      stopCet4ExamAndBack();
    } else {
      renderCet4ExamQuestion();
    }
  }, 1000);
}

window.stopCet4ExamAndBack = window.stopCet4ExamAndBack || function() {
  // 🔥 完全重置所有选中状态
  selectedCet4Words = [];
  currentExamIndex = 0;
  examWordList = [];
  isAllSelected = false;

  // 重置按钮文字
  const btn = document.getElementById('selectAllBtn');
  if (btn) btn.innerText = '全选本页';

  showPage("cet4Page");
  
  // 🔥 强制刷新列表，清空所有勾选
  setTimeout(() => {
    renderCet4WordList();
    updateSelectedCount();
  }, 60);
  
  resetStreak();
}

// 发音
window.speakWord = window.speakWord || function(text) {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    let utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  }
}

window.autoSpeakExamWord = window.autoSpeakExamWord || function() {
  // 🔥 修复：必须等用户交互后再发音，避免浏览器拦截
  const word = document.getElementById("cet4ExamWord").innerText;
  
  // 延迟 500ms + 确保页面完全激活
  setTimeout(() => {
    if (word) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(word);
      u.lang = 'en-US';
      u.rate = 0.9;
      window.speechSynthesis.speak(u);
    }
  }, 500);
}

// 弹出对错图片
window.showPopup = window.showPopup || function(isCorrect){
  const popup = document.getElementById("answerPopup");
  const popupIcon = document.getElementById("popupIcon");
  popupIcon.src = isCorrect ? "right.png" : "wrong.png";
  popup.style.visibility = "visible";
  setTimeout(()=>{
    popup.style.visibility = "hidden";
  },800);
}

// 进入 CET4 页面立即刷新单词列表
document.getElementById('cet4Page').addEventListener('click', function() {
  renderCet4WordList();
  updateSelectedCount();
});

// 🔥 关键修复：页面显示时自动刷新（点开就加载）
const cet4Page = document.getElementById('cet4Page');
const observer = new MutationObserver(() => {
  if (cet4Page.classList.contains('active')) {
    renderCet4WordList();
    updateSelectedCount();
  }
});
observer.observe(cet4Page, { attributes: true });


// ================== CET4 单词发音功能 ==================
window.speakWord = window.speakWord || function(text) {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel(); // 先停掉之前的发音
    let utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';        // 美式发音
    utterance.rate = 0.9;           // 语速
    utterance.volume = 1;
    window.speechSynthesis.speak(utterance);
  }
}

// 答题页自动读单词
window.autoSpeakExamWord = window.autoSpeakExamWord || function() {
  const word = document.getElementById("cet4ExamWord").innerText;
  setTimeout(() => {
    safeSpeak(word);
  }, 500);
}

// 🔥 显示当前单词答案
window.showCurrentAnswer = window.showCurrentAnswer || function() {
  const word = spellWordList[currentSpellIndex];
  document.getElementById("answerShow").innerText = `正确答案：${word}`;
  document.getElementById("answerShow").style.display = "block";
}

// ================== CET6 完整逻辑（和四级完全同款：未学/已学/全部 + 拼写 + 识词） ==================
let currentCet6Tab = "todo";
let selectedCet6Words = [];
let currentExamIndex6 = 0;
let examWordList6 = [];

// 拼写模式专用变量
let currentSpellIndex6 = 0;
let spellWordList6 = [];
let currentInputList6 = [];
let wrongCount6 = 0;
let maxWrong6 = 3;

// 切换标签
window.switchCet6Tab = window.switchCet6Tab || function(tab) {
  currentCet6Tab = tab;
  document.querySelectorAll(".cet6-tab-btn").forEach(b => b.classList.remove("active"));
  document.querySelector(`.cet6-tab-btn[data-tab="${tab}"]`).classList.add("active");
  renderCet6WordList();
}

// 全选/取消全选 当前页面可见单词
let isAllSelectedCet6 = false;
window.toggleSelectAllVisibleCet6 = window.toggleSelectAllVisibleCet6 || function() {
  const btn = document.getElementById('selectAllBtnCet6');
  const visibleItems = document.querySelectorAll('.cet6-date-group .cet6-word-item');
  const visibleWords = [];

  visibleItems.forEach(item => {
    const word = item.querySelector('.cet6-word-name').innerText;
    visibleWords.push(word);
  });

  if (!isAllSelectedCet6) {
    visibleWords.forEach(word => {
      if (!selectedCet6Words.includes(word)) selectedCet6Words.push(word);
    });
    btn.innerText = '取消全选';
    isAllSelectedCet6 = true;
  } else {
    selectedCet6Words = selectedCet6Words.filter(w => !visibleWords.includes(w));
    btn.innerText = '全选本页';
    isAllSelectedCet6 = false;
  }
  renderCet6WordList();
  updateSelectedCountCet6();
}

// 渲染六级单词列表（按日期分组）
window.renderCet6WordList = window.renderCet6WordList || async function() {
  const container = document.getElementById("cet6WordList");
  const collected = getCollectedWords().map(item => item.word.toLowerCase());
  
  let wordList = Object.entries(cet6Words).map(([word, info]) => ({
    word,
    ...info,
    collected: collected.includes(word.toLowerCase()),
    date: info.date || ""
  }));

  if (currentCet6Tab === "learned") {
    wordList = wordList.filter(w => w.collected);
  } else if (currentCet6Tab === "todo") {
    wordList = wordList.filter(w => !w.collected);
  }

  document.getElementById("cet6TotalCount").innerText = `共${wordList.length}词`;

  const grouped = {};
  wordList.forEach(item => {
    if (!grouped[item.date]) grouped[item.date] = [];
    grouped[item.date].push(item);
  });

  let html = "";
  for (let date in grouped) {
    html += `<div class="cet6-date-group">
      <div class="cet6-date-title">${date}</div>`;
    grouped[date].forEach(item => {
      const isSelected = selectedCet6Words.includes(item.word);
      html += `
      <div class="cet6-word-item" onclick="toggleWordSelectCet6('${item.word}', this)">
        <div class="cet6-word-checkbox ${isSelected ? 'checked' : ''}"></div>
        <div class="cet6-word-name" onclick="speakWord('${item.word}')">${item.word}</div>
      </div>`;
    });
    html += `</div>`;
  }
  container.innerHTML = html;
}

// 切换单词选中状态
window.toggleWordSelectCet6 = window.toggleWordSelectCet6 || function(word, el) {
  const checkbox = el.querySelector(".cet6-word-checkbox");
  if (checkbox.classList.contains("checked")) {
    checkbox.classList.remove("checked");
    selectedCet6Words = selectedCet6Words.filter(w => w !== word);
  } else {
    checkbox.classList.add("checked");
    selectedCet6Words.push(word);
  }
  updateSelectedCountCet6();
}

// 更新已选数量和开始按钮状态
window.updateSelectedCountCet6 = window.updateSelectedCountCet6 || function() {
  const count = selectedCet6Words.length;
  document.getElementById("cet6SelectedCount").innerText = count;
  
  const examBtn = document.getElementById("cet6StartBtn");
  const spellBtn = document.getElementById("cet6SpellBtn");
  
  if(count > 0){
    examBtn.style.opacity = "1";
    examBtn.style.cursor = "pointer";
    spellBtn.style.opacity = "1";
    spellBtn.style.cursor = "pointer";
  }else{
    examBtn.style.opacity = "0.6";
    examBtn.style.cursor = "not-allowed";
    spellBtn.style.opacity = "0.6";
    spellBtn.style.cursor = "not-allowed";
  }
}

// 开始识词答题
window.startCet6Exam = window.startCet6Exam || function() {
  if (selectedCet6Words.length === 0) return;
  examWordList6 = [...selectedCet6Words];
  currentExamIndex6 = 0;
  showPage("cet6ExamPage");
  renderCet6ExamQuestion();

  // 👇 加上这一行
  autoSpeakExamWord6();
}

// 开始拼写答题
window.startCet6Spell = window.startCet6Spell || function(){
  if(selectedCet6Words.length === 0) return;
  spellWordList6 = [...selectedCet6Words];
  currentSpellIndex6 = 0;
  wrongCount6 = 0;
  showPage("cet6SpellPage");
  renderCet6Spell();
}

// 渲染拼写题目
window.renderCet6Spell = window.renderCet6Spell || function(){
  const word = spellWordList6[currentSpellIndex6];
  const info = cet6Words[word];
  if(!info) return;

  document.getElementById("spellProgress6").innerText = `${currentSpellIndex6+1}/${spellWordList6.length}`;
  document.getElementById("spellMeaning6").innerText = info.meaning;
  document.getElementById("spellPhonetic6").innerText = info.phonetic || '';
  document.getElementById("spellPos6").innerText = info.pos || 'n.';

  document.getElementById("wrongTip6").style.display = "none";
  document.getElementById("answerShow6").style.display = "none";
  wrongCount6 = 0;

  const container = document.getElementById("spellInputContainer6");
  container.innerHTML = "";
  currentInputList6 = [];

  const letters = word.split("");
  letters.forEach((letter, idx) => {
    const input = document.createElement("input");
    input.style.width = "40px";
    input.style.height = "50px";
    input.style.textAlign = "center";
    input.style.fontSize = "22px";
    input.style.border = "none";
    input.style.borderBottom = "2px solid var(--color-text)";
    input.style.background = "transparent";
    input.style.outline = "none";
    input.style.color = "#fff";
    input.maxLength = 1;
    input.dataset.index = idx;

    input.onkeydown = function(e) {
      const i = parseInt(this.dataset.index);
      if (e.key === "Backspace") {
        e.preventDefault();
        if (this.value !== "") {
          this.value = "";
          currentInputList6[i] = "";
          return;
        }
        if (i > 0) {
          const prev = container.children[i-1];
          prev.value = "";
          currentInputList6[i-1] = "";
          prev.focus();
        }
      }
    };

    input.oninput = function() {
      const i = parseInt(this.dataset.index);
      this.value = this.value.toLowerCase();
      currentInputList6[i] = this.value;

      const correctChar = letters[i];
      if (this.value === correctChar) {
        this.style.color = "#22c55e";
        this.style.borderBottomColor = "#22c55e";
      } else {
        this.style.color = "#ff4444";
        this.style.borderBottomColor = "#ff4444";
      }

      if (this.value && i < letters.length - 1) {
        container.children[i+1].focus();
      }

      if (currentInputList6.filter(Boolean).length === letters.length) {
        checkSpell6();
      }
    };

    container.appendChild(input);
  });

  if (container.children[0]) container.children[0].focus();
  setTimeout(()=>{
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(word);
    u.lang = 'en-US';
    window.speechSynthesis.speak(u);
  }, 500);
}

// 核对拼写
window.checkSpell6 = window.checkSpell6 || function(){
  const word = spellWordList6[currentSpellIndex6];
  const userInput = currentInputList6.join("");
  const inputs = document.querySelectorAll("#spellInputContainer6 input");
  const wrongTip = document.getElementById("wrongTip6");
  const answerShow = document.getElementById("answerShow6");
  
  const correct = (userInput === word);
  
  if(correct){
    collectWord(word);
    showPopup(true);
    playRightSound();
    
    setTimeout(()=>{
      nextSpell6();
    },1000);
    return;
  }
  
  wrongCount6++;
  showPopup(false);
  playWrongSound();
  wrongTip.style.display = "block";
  
  const letters = word.split("");
  inputs.forEach((input, idx)=>{
    if(input.value !== letters[idx]){
      input.style.borderBottomColor = "#ff4444";
      input.style.color = "#ff4444";
    }
  });
  
  if(wrongCount6 >= maxWrong6){
    answerShow.innerText = `正确答案：${word}`;
    answerShow.style.display = "block";
    
    setTimeout(()=>{
      nextSpell6();
    },1500);
  }
}

// 下一题
window.nextSpell6 = window.nextSpell6 || function(){
  currentSpellIndex6++;
  if(currentSpellIndex6 >= spellWordList6.length){
    alert("拼写完成！");
    stopCet6SpellAndBack();
    return;
  }
  renderCet6Spell();
}

// 显示答案
window.showCurrentAnswer6 = window.showCurrentAnswer6 || function(){
  const word = spellWordList6[currentSpellIndex6];
  document.getElementById("answerShow6").innerText = `正确答案：${word}`;
  document.getElementById("answerShow6").style.display = "block";
}

// 退出拼写
window.stopCet6SpellAndBack = window.stopCet6SpellAndBack || function(){
  spellWordList6 = [];
  currentSpellIndex6 = 0;

  // 🔥 清空选中 + 重置全选
  selectedCet6Words = [];
  isAllSelectedCet6 = false;

  const btn = document.getElementById('selectAllBtnCet6');
  if (btn) btn.innerText = '全选本页';

  showPage("cet6Page");
  
  setTimeout(() => {
    renderCet6WordList();
    updateSelectedCountCet6();
  }, 60);
  
  resetStreak();
}

// 渲染识词题目
window.renderCet6ExamQuestion = window.renderCet6ExamQuestion || function() {
  const word = examWordList6[currentExamIndex6];
  const info = cet6Words[word];
  if (!info) return;

  document.getElementById("cet6ExamProgress").innerText = `${currentExamIndex6 + 1}/${examWordList6.length}`;
  document.getElementById("cet6ExamWord").innerText = word;
  document.getElementById("cet6ExamPhonetic").innerText = info.phonetic || "";

  const correctAnswer = `${info.pos || 'n.'} ${info.meaning}`;
  const wrongAnswers = [];
  const allMeanings = Object.values(cet6Words).filter(i => i.meaning !== info.meaning);
  
  while (wrongAnswers.length < 3 && allMeanings.length > 0) {
    const randomIdx = Math.floor(Math.random() * allMeanings.length);
    const wrong = allMeanings.splice(randomIdx, 1)[0];
    wrongAnswers.push(`${wrong.pos || 'n.'} ${wrong.meaning}`);
  }
  
  const options = [correctAnswer, ...wrongAnswers].sort(() => Math.random() - 0.5);

  let html = "";
  options.forEach(option => {
    html += `<div class="cet6-exam-option" onclick="selectExamOptionCet6(this, '${correctAnswer}')">${option}</div>`;
  });
  document.getElementById("cet6ExamOptions").innerHTML = html;
  // 🔥 修复：六级每一题自动播放
  setTimeout(() => {
    const word = document.getElementById("cet6ExamWord").innerText;
    safeSpeak(word);
  }, 600);
}

// 选择选项
window.selectExamOptionCet6 = window.selectExamOptionCet6 || function(el, correctAnswer) {
  document.querySelectorAll(".cet6-exam-option").forEach(opt => opt.style.pointerEvents = "none");
  const userAnswer = el.innerText.trim();
  const isCorrect = (userAnswer === correctAnswer.trim());
  const currentWord = examWordList6[currentExamIndex6];
  let collected = getCollectedWords().map(w => w.word.toLowerCase());

  if (isCorrect) {
    if (!collected.includes(currentWord.toLowerCase())) collectWord(currentWord);
  } else {
    if (collected.includes(currentWord.toLowerCase())) removeCollectedWord(currentWord);
  }

  if (isCorrect) {
    el.classList.add("correct");
    playRightSound();
  } else {
    el.classList.add("wrong");
    playWrongSound();
    document.querySelectorAll(".cet6-exam-option").forEach(opt => {
      if (opt.innerText.trim() === correctAnswer.trim()) opt.classList.add("correct");
    });
  }

  const popup = document.getElementById("answerPopup");
  const popupIcon = document.getElementById("popupIcon");
  popupIcon.src = isCorrect ? "right.png" : "wrong.png";
  popup.style.visibility = "visible";

  setTimeout(() => {
    popup.style.visibility = "hidden";
    currentExamIndex6++;
    if (currentExamIndex6 >= examWordList6.length) {
      alert("练习完成！");
      stopCet6ExamAndBack();
    } else {
      renderCet6ExamQuestion();
    }
  }, 1000);
}

// 退出识词练习
window.stopCet6ExamAndBack = window.stopCet6ExamAndBack || function() {
  // 🔥 完全重置所有选中 + 全选状态
  selectedCet6Words = [];
  currentExamIndex6 = 0;
  examWordList6 = [];
  isAllSelectedCet6 = false; // 全选状态重置

  // 按钮文字恢复「全选本页」
  const btn = document.getElementById('selectAllBtnCet6');
  if (btn) btn.innerText = '全选本页';

  showPage("cet6Page");
  
  // 强制刷新列表，清空所有勾选
  setTimeout(() => {
    renderCet6WordList();
    updateSelectedCountCet6();
  }, 60);
  
  resetStreak();
}

// 自动刷新
document.getElementById("cet6Page").addEventListener("click", () => {
  renderCet6WordList();
  updateSelectedCountCet6();
});
const cet6Page = document.getElementById('cet6Page');
const observer6 = new MutationObserver(() => {
  if (cet6Page.classList.contains('active')) {
    renderCet6WordList();
    updateSelectedCountCet6();
  }
});
observer6.observe(cet6Page, { attributes: true });

window.autoSpeakExamWord6 = window.autoSpeakExamWord6 || function() {
  const word = document.getElementById("cet6ExamWord").innerText;
  
  setTimeout(() => {
    if (word) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(word);
      u.lang = 'en-US';
      u.rate = 0.9;
      window.speechSynthesis.speak(u);
    }
  }, 500);
}

// ===================== 文章默写模块逻辑（智能对比 + 打分 + 错误单词） =====================
let currentArticleTab = "written";
let writtenArticles = JSON.parse(localStorage.getItem('writtenArticles') || '[]');
let currentArticleIndex = -1;  // 当前选中的文章索引
let allNewsArticles = [];
let currentWrongWords = [];
let currentArticleProgress = null;

function getArticleProgressKey(articleName) {
  return 'articleWriteProgress_' + encodeURIComponent(articleName);
}

function loadArticleWriteProgress(articleName) {
  try {
    const data = JSON.parse(localStorage.getItem(getArticleProgressKey(articleName)) || 'null');
    if (data && data.articleName === articleName && Array.isArray(data.words)) {
      return data;
    }
  } catch (e) {
    console.warn('加载文章默写进度失败', e);
  }
  return null;
}

function saveCurrentArticleWriteProgress() {
  if (!currentArticleProgress || !currentArticleProgress.articleName) return;
  localStorage.setItem(getArticleProgressKey(currentArticleProgress.articleName), JSON.stringify(currentArticleProgress));
}

function clearCurrentArticleWriteProgress() {
  if (!currentArticleProgress || !currentArticleProgress.articleName) return;
  localStorage.removeItem(getArticleProgressKey(currentArticleProgress.articleName));
  currentArticleProgress = null;
}

function getWordErrorElement(input) {
  return input.parentElement ? input.parentElement.querySelector('.word-error') : null;
}

function clearWordError(input) {
  const errorEl = getWordErrorElement(input);
  if (errorEl) {
    errorEl.innerText = '';
    errorEl.style.display = 'none';
  }
}

function setWordError(input, text) {
  const errorEl = getWordErrorElement(input);
  if (errorEl) {
    errorEl.innerText = text;
    errorEl.style.display = 'block';
  }
}

function markArticleAsWrittenIfComplete() {
  if (!currentArticleProgress) return;
  if (currentArticleProgress.words.every(item => item.correct)) {
    const article = allNewsArticles[currentArticleIndex];
    if (article && !writtenArticles.includes(article.name)) {
      writtenArticles.push(article.name);
      localStorage.setItem('writtenArticles', JSON.stringify(writtenArticles));
    }
  }
}

function validateArticleWordInput(input) {
  if (!currentArticleProgress) return;
  const idx = Number(input.dataset.index);
  const correct = input.dataset.correct;
  const state = currentArticleProgress.words[idx];
  if (!state) return;

  const value = input.value.trim();
  state.value = value;

  if (state.correct) {
    saveCurrentArticleWriteProgress();
    return;
  }

  if (value === '') {
    input.style.borderBottomColor = '#aaa';
    input.style.color = 'var(--color-text)';
    clearWordError(input);
    saveCurrentArticleWriteProgress();
    return;
  }

  if (value.toLowerCase() === correct) {
    state.correct = true;
    input.readOnly = true;
    input.style.borderBottomColor = '#22c55e';
    input.style.color = '#22c55e';
    clearWordError(input);
    saveCurrentArticleWriteProgress();
    markArticleAsWrittenIfComplete();
    return;
  }

  state.attempts = Math.min(state.attempts + 1, 3);
  input.style.borderBottomColor = '#ff4444';
  input.style.color = '#ff4444';

  if (state.attempts >= 3) {
    setWordError(input, `${correct}`);
  } else {
    clearWordError(input);
  }

  saveCurrentArticleWriteProgress();
}

function saveArticleWriteProgress() {
  saveCurrentArticleWriteProgress();
  alert('已保存当前默写进度');
}

// 切换标签 立即生效
function switchArticleTab(tab) {
  currentArticleTab = tab;
  document.querySelectorAll(".article-tab-btn").forEach(b => b.classList.remove("active"));
  document.querySelector(`.article-tab-btn[data-tab="${tab}"]`).classList.add("active");
  
  // 🔥 立刻渲染，不等待
  renderArticleList();
}

// 🔥 同步立即渲染文章列表（无延迟、无等待、打开就显示）
function renderArticleList() {
  // 直接读取本地数据，不异步
  allNewsArticles = JSON.parse(localStorage.getItem('bbcNewsList') || '[]');
  const container = document.getElementById("articleListContainer");
  
  let filteredArticles = allNewsArticles;
  if (currentArticleTab === "written") {
    filteredArticles = allNewsArticles.filter(a => writtenArticles.includes(a.name));
  } else if (currentArticleTab === "pending") {
    filteredArticles = allNewsArticles.filter(a => !writtenArticles.includes(a.name));
  }

  document.getElementById("articleTotalCount").innerText = filteredArticles.length;

  let html = "";
  filteredArticles.forEach((article) => {
    const actualIndex = allNewsArticles.findIndex(item => item.name === article.name && item.time === article.time);
    const isSelected = (currentArticleIndex === actualIndex);
    html += `
    <div onclick="toggleArticleSelect(${actualIndex})" 
    style="background:var(--bg-card); border-radius:14px; padding:12px 14px;
    display:flex; align-items:center; justify-content:space-between;
    box-shadow:0 2px 8px rgba(0,0,0,0.2); position:relative; cursor:pointer;
    border:2px solid ${isSelected ? '#00953d' : 'transparent'};">
      <div style="flex:1; padding-right:10px;">
        <div style="font-size:16px; font-weight:bold; color:#00953d; margin-bottom:4px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${article.name}</div>
        <div style="font-size:12px; color:var(--color-text-secondary);">
          ${article.time}
        </div>
      </div>
      <div style="width:70px; height:70px; border-radius:10px; overflow:hidden; background:#000;flex-shrink:0;">
        <img src="${article.img}" style="width:100%;height:100%;object-fit:cover;" onerror="this.src='news_1.jpg'">
      </div>
      ${isSelected ? '<div style="position:absolute;right:10px;top:50%;transform:translateY(-50%);color:#00953d;font-size:20px;">✓</div>' : ''}
    </div>`;
  });
  
  // 🔥 同步直接赋值，无延迟
  container.innerHTML = html;
}

// 选择文章（只选中，不跳转）
function selectArticle(index) {
  currentArticleIndex = index;
  // 显示选中提示
  const tip = document.getElementById('articleSelectTip');
  const nameEl = document.getElementById('selectedArticleName');
  tip.style.display = 'block';
  nameEl.innerText = allNewsArticles[index].name;
  
  // 启用按钮
  const writeBtn = document.getElementById('startWriteBtn');
  const listenBtn = document.getElementById('startListenBtn');
  writeBtn.disabled = false;
  writeBtn.style.opacity = '1';
  listenBtn.disabled = false;
  listenBtn.style.opacity = '1';
  
  // 刷新列表样式
  renderArticleList();
}

// 切换选择/取消选择文章（点击选中 → 再点击取消）
function toggleArticleSelect(index) {
  // 如果已经选中 → 取消
  if (currentArticleIndex === index) {
    currentArticleIndex = -1;
    
    // 隐藏提示
    const tip = document.getElementById('articleSelectTip');
    tip.style.display = 'none';
    
    // 禁用按钮
    const writeBtn = document.getElementById('startWriteBtn');
    const listenBtn = document.getElementById('startListenBtn');
    writeBtn.disabled = true;
    writeBtn.style.opacity = '0.6';
    listenBtn.disabled = true;
    listenBtn.style.opacity = '0.6';
  } 
  // 未选中 → 选中
  else {
    currentArticleIndex = index;
    
    // 显示提示
    const tip = document.getElementById('articleSelectTip');
    const nameEl = document.getElementById('selectedArticleName');
    tip.style.display = 'block';
    nameEl.innerText = allNewsArticles[index].name;
    
    // 启用按钮
    const writeBtn = document.getElementById('startWriteBtn');
    const listenBtn = document.getElementById('startListenBtn');
    writeBtn.disabled = false;
    writeBtn.style.opacity = '1';
    listenBtn.disabled = false;
    listenBtn.style.opacity = '1';
  }
  
  // 刷新列表样式
  renderArticleList();
}

// 全局保存当前文章正确单词数组
let currentCorrectWords = [];

// 打开默写（生成线段答题卡）
function openArticleWrite(index) {
  currentArticleIndex = index;
  const article = allNewsArticles[index];
  const original = article.content.trim();
  
  // 提取所有英文单词
  const enText = original.replace(/[\u4e00-\u9fa5]/g, ' ').replace(/\s+/g, ' ').trim();
  currentCorrectWords = enText.split(' ');
  
  // 生成答题卡
  const container = document.getElementById("articleAnswerCard");
  container.innerHTML = "";
  
  const progress = loadArticleWriteProgress(article.name);
  currentArticleProgress = progress && progress.words.length === currentCorrectWords.length
    ? progress
    : {
      articleName: article.name,
      words: currentCorrectWords.map(() => ({ value: '', attempts: 0, correct: false }))
    };

  currentCorrectWords.forEach((word, idx) => {
    const wrapper = document.createElement('div');
    wrapper.style.display = 'flex';
    wrapper.style.flexDirection = 'column';
    wrapper.style.alignItems = 'center';
    wrapper.style.width = '90px';

    const input = document.createElement("input");
    input.type = "text";
    input.style.width = "100%";
    input.style.padding = "4px 2px";
    input.style.border = "none";
    input.style.borderBottom = "2px solid #aaa";
    input.style.background = "transparent";
    input.style.color = "var(--color-text)";
    input.style.textAlign = "center";
    input.style.outline = "none";
    input.style.fontSize = "15px";
    input.dataset.index = idx;
    input.dataset.correct = word.toLowerCase();
    input.value = currentArticleProgress.words[idx].value || '';

    const state = currentArticleProgress.words[idx];
    if (state.correct) {
      input.readOnly = true;
      input.style.borderBottomColor = '#22c55e';
      input.style.color = '#22c55e';
    }

    input.onkeydown = function(e) {
      if (e.key === "Backspace" && this.value.trim() === "") {
        e.preventDefault();
        const prev = container.querySelector(`input[data-index="${idx - 1}"]`);
        if (prev) prev.focus();
        return;
      }

      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        validateArticleWordInput(this);
        const next = container.querySelector(`input[data-index="${idx + 1}"]`);
        if (next) next.focus();
      }
    };

    input.onblur = function() {
      validateArticleWordInput(this);
    };

    input.onclick = function() {
      if (this.value.trim() === "" && idx > 0) {
        const prev = container.querySelector(`input[data-index="${idx - 1}"]`);
        if (prev) prev.focus();
      }
    };

    input.oninput = function() {
      const state = currentArticleProgress.words[idx];
      if (state && !state.correct) {
        state.value = this.value.trim();
        if (state.attempts < 3) clearWordError(this);
        saveCurrentArticleWriteProgress();
      }
    };

    const errorEl = document.createElement('div');
    errorEl.className = 'word-error';
    errorEl.style.color = '#ff4444';
    errorEl.style.fontSize = '12px';
    errorEl.style.marginTop = '4px';
    errorEl.style.minHeight = '18px';
    errorEl.style.textAlign = 'center';
    errorEl.style.display = 'none';

    if (!state.correct && state.attempts >= 3) {
      const info = wordLibrary[word.toLowerCase()] || wordLibrary[word] || {};
      const meaning = info.meaning || '无释义';
      const pos = info.pos ? `${info.pos} ` : '';
      errorEl.innerText = `错误 ${state.attempts} 次，正确答案：${word} ${pos}${meaning}`;
      errorEl.style.display = 'block';
      input.style.borderBottomColor = '#ff4444';
      input.style.color = '#ff4444';
    }

    wrapper.appendChild(input);
    wrapper.appendChild(errorEl);
    container.appendChild(wrapper);
  });

  document.getElementById("scoreDisplay").style.display = "none";
  document.getElementById("wrongWordsContainer").style.display = "none";
  showPage("articleWriteDetailPage");

  setTimeout(() => {
    const nextInput = document.querySelector('#articleAnswerCard input:not([readonly])');
    if (nextInput) nextInput.focus();
  }, 80);
}

// 智能核对：线段答题卡版
function checkArticleWriteSmart() {
  const inputs = document.querySelectorAll("#articleAnswerCard input");
  if(!inputs.length) {
    alert("请输入默写内容");
    playWrongSound();
    return;
  }

  let correctCount = 0;
  const total = currentCorrectWords.length;
  const wrongList = [];

  inputs.forEach((input, idx) => {
    const user = input.value.trim().toLowerCase();
    const correct = currentCorrectWords[idx].toLowerCase();
    const correctWord = currentCorrectWords[idx];
    
    if(user === correct) {
      correctCount++;
      input.style.borderBottomColor = "#22c55e";
      input.style.color = "#22c55e";
    } else {
      input.style.borderBottomColor = "#ff4444";
      input.style.color = "#ff4444";
      
      // 获取词义
      const info = wordLibrary[correct] || wordLibrary[correct.toLowerCase()] || {};
      wrongList.push({
        wrong: input.value.trim() || "(空)",
        correct: correctWord,
        meaning: info.meaning || "无释义"
      });
    }
  });

  // 计算正确率
  const accuracy = (correctCount / total * 100).toFixed(1);
  let score = "💯 满分";
  if (accuracy < 90) score = "😃 优秀";
  if (accuracy < 80) score = "🙂 良好";
  if (accuracy < 70) score = "😊 合格";
  if (accuracy < 60) score = "😐 继续努力";

  // 显示分数
  const scoreEl = document.getElementById("scoreDisplay");
  scoreEl.innerText = `正确率：${accuracy}% | ${score}`;
  scoreEl.style.display = "block";

  // 显示错误列表：错误 --- 正确：词义
  const wrongContainer = document.getElementById("wrongWordsContainer");
  const wrongListEl = document.getElementById("wrongWordsList");
  wrongListEl.innerHTML = "";

  if(wrongList.length > 0) {
    wrongList.forEach(item => {
      const div = document.createElement("div");
      div.style.color = "#ff4444";
      div.innerText = `${item.wrong} --- ${item.correct}：${item.meaning}`;
      wrongListEl.appendChild(div);
    });
    wrongContainer.style.display = "block";
    playWrongSound();
  } else {
    wrongContainer.style.display = "none";
    playRightSound();
    
    // 标记已默写
    const article = allNewsArticles[currentArticleIndex];
    if (!writtenArticles.includes(article.name)) {
      writtenArticles.push(article.name);
      localStorage.setItem('writtenArticles', JSON.stringify(writtenArticles));
    }
  }
}

// 重置答题卡
function resetArticleWrite() {
  const inputs = document.querySelectorAll("#articleAnswerCard input");
  if (currentArticleProgress && Array.isArray(currentArticleProgress.words)) {
    currentArticleProgress.words.forEach(word => {
      word.value = '';
      word.attempts = 0;
      word.correct = false;
    });
    saveCurrentArticleWriteProgress();
  }

  inputs.forEach(input => {
    input.value = "";
    input.readOnly = false;
    input.style.borderBottomColor = "#aaa";
    input.style.color = "var(--color-text)";
    clearWordError(input);
  });
  document.getElementById("scoreDisplay").style.display = "none";
  document.getElementById("wrongWordsContainer").style.display = "none";
}

// 退出
function stopArticleWriteAndBack() {
  showPage("articleWritePage");
  renderArticleList();
}

// 【选中后】点击 默全文
function startArticleWriteBySelect() {
  if (currentArticleIndex === -1) {
    alert("请先选择一篇文章");
    return;
  }
  openArticleWrite(currentArticleIndex);
}

// ===================== 句子听写 - 按 txt 逻辑实现 =====================
let currentListenArticle = null;

// 启动听写（从文章进入）
async function startSentenceWriteBySelect() {
  if (currentArticleIndex === -1) {
    alert("请先选择文章");
    return;
  }
  const article = allNewsArticles[currentArticleIndex];
  currentListenArticle = article;
  await SentenceWriteLogic.startWithArticle(article);
  renderListenSentence();
  showPage("sentenceListenPage");

  updateListenProgress();
}

// ===================== 句子听写 自动更新右上角进度 =====================
function updateListenProgress() {
  const total = SentenceWriteLogic.getTotalCount();
  const current = SentenceWriteLogic.getCurrentIndex() + 1;
  const el = document.getElementById("listenProgress");
  if (el) el.innerText = `${current}/${total}`;
}

// 提示按钮：点击消失 + 显示中文
function showSentenceHint() {
  const el = document.getElementById("sentenceTranslationContainer");
  const btn = document.getElementById("hintBtn");
  el.style.display = "block";
  btn.style.display = "none";
}

// 下一题按钮功能
document.getElementById("nextSentenceBtn").onclick = function() {
  SentenceWriteLogic.nextSentence();
  renderListenSentence();
  updateListenProgress(); 
};

// 渲染当前句子（修复版：自动更新右上角进度 + 空格自动判断）
function renderListenSentence() {
  updateListenProgress(); 

  const sen = SentenceWriteLogic.getCurrentSentence();
  if (!sen) {
    document.getElementById("sentenceWriteResult").innerText = "🎉 全部完成";
    document.getElementById("sentenceWriteResult").className = "dict-result right";
    document.getElementById("sentenceWriteResult").style.display = "block";
    return;
  }

  // 🔥 修复：自动更新右上角进度
  const total = SentenceWriteLogic.getTotalCount();
  const currentNum = SentenceWriteLogic.getCurrentIndex() + 1;
  const progressEl = document.getElementById("listenProgress");
  if (progressEl) {
    progressEl.innerText = `${currentNum}/${total}`;
  }

  // 标题
  document.getElementById("sentenceArticleName").innerText = sen.articleName;
  const meta = (currentListenArticle && currentListenArticle.time) || "";
  document.getElementById("sentenceArticleMeta").innerText = meta;
  document.getElementById("sentenceTranslationContainer").innerText = sen.translation;

  // 生成单词输入框
  const words = sen.text.match(/[a-zA-Z']+/g) || [];
  const container = document.getElementById("sentenceWordInputs");
  container.innerHTML = "";

  const resultEl = document.getElementById("sentenceWriteResult");
  const answerEl = document.getElementById("sentenceCorrectAnswer");

  function getSentenceInputs() {
    return Array.from(container.querySelectorAll(".sentence-word-input"));
  }

  function checkAllFilled() {
    return getSentenceInputs().every(i => i.value.trim() !== "");
  }

  function updateSubmitButtonState() {
    const submitButton = document.getElementById("submitSentenceBtn");
    if (!submitButton) return;
    submitButton.disabled = !checkAllFilled();
  }

  words.forEach((word, index) => {
    const wrapper = document.createElement('div');
    wrapper.style.display = 'flex';
    wrapper.style.flexDirection = 'column';
    wrapper.style.alignItems = 'center';
    wrapper.style.width = '90px';

    const input = document.createElement("input");
    input.type = "text";
    input.className = "sentence-word-input";
    input.dataset.correct = word;
    input.placeholder = "______";
    input.autocomplete = "off";
    input.spellcheck = false;

    const hint = document.createElement('div');
    hint.className = 'sentence-word-hint';
    hint.innerText = '';
    hint.style.display = 'none';

    // 🔥 实时输入：不变色，仅控制提交按钮可用性
    input.oninput = function () {
      this.classList.remove("correct", "wrong");
      hint.style.display = 'none';
      hint.innerText = '';
      updateSubmitButtonState();
    };

    // 🔥 空格跳转 + 退格回跳
    input.onkeydown = function (e) {
      if (e.key === " ") {
        e.preventDefault();
        const nextWrapper = container.children[index + 1];
        if (nextWrapper) {
          const nextInput = nextWrapper.querySelector("input");
          if (nextInput) nextInput.focus();
        }
      }

      if (e.key === "Backspace") {
        if (this.value.trim() === "") {
          e.preventDefault();
          const prevWrapper = container.children[index - 1];
          if (prevWrapper) {
            const prevInput = prevWrapper.querySelector("input");
            if (prevInput) prevInput.focus();
          }
        }
      }
    };

    wrapper.appendChild(input);
    wrapper.appendChild(hint);
    container.appendChild(wrapper);
  });

  resultEl.style.display = "none";
  answerEl.style.display = "none";
  SentenceWriteLogic.resetCurrentSentence();

  const firstInput = container.querySelector('input');
  if (firstInput) firstInput.focus();
  updateSubmitButtonState();

  const hintBtn = document.getElementById("hintBtn");
  const transBox = document.getElementById("sentenceTranslationContainer");
  if (hintBtn) hintBtn.style.display = "inline-block";
  if (transBox) transBox.style.display = "none";
}

// 提交应答处理函数（带错词集 + 收藏）
function submitSentenceCheck() {
  const container = document.getElementById("sentenceWordInputs");
  const inputs = Array.from(container.querySelectorAll(".sentence-word-input"));
  const resultEl = document.getElementById("sentenceWriteResult");
  const answerEl = document.getElementById("sentenceCorrectAnswer");
  const wrongSetEl = document.getElementById("wrongWordSet");
  const wrongListEl = document.getElementById("wrongWordList");

  if (!inputs.length) {
    resultEl.className = "dict-result wrong";
    resultEl.innerText = "当前没有可提交的单词";
    resultEl.style.display = "block";
    answerEl.style.display = "none";
    wrongSetEl.style.display = "none";
    return;
  }

  const allFilled = inputs.every(i => i.value.trim() !== "");
  if (!allFilled) {
    resultEl.className = "dict-result wrong";
    resultEl.innerText = "请先完成所有单词，再点击提交";
    resultEl.style.display = "block";
    answerEl.style.display = "none";
    wrongSetEl.style.display = "none";
    return;
  }

  let allCorrect = true;
  let wrongWords = [];

  inputs.forEach(input => {
    const correct = (input.dataset.correct || "").trim();
    const user = input.value.trim();
    const hint = input.parentElement ? input.parentElement.querySelector('.sentence-word-hint') : null;

    if (user.toLowerCase() === correct.toLowerCase()) {
      input.classList.add("correct");
      input.classList.remove("wrong");
      if (hint) {
        hint.style.display = 'none';
        hint.innerText = '';
      }
    } else {
      allCorrect = false;
      input.classList.add("wrong");
      input.classList.remove("wrong");

      // 显示正确答案
      if (hint) {
        hint.innerText = `${correct}`;
        hint.style.display = 'block';
        hint.style.color = '#ff4444';
      }

      // 收集错词
      const info = wordLibrary[correct.toLowerCase()] || wordLibrary[correct] || {};
      wrongWords.push({
        wrong: user || '(空)',
        correct: correct,
        meaning: info.meaning || '无释义'
      });
    }
  });

  // ========== 渲染错词集 ==========
  wrongListEl.innerHTML = '';
  if (wrongWords.length > 0) {
    wrongSetEl.style.display = 'block';
    wrongWords.forEach(item => {
      const div = document.createElement('div');
      div.style.display = 'flex';
      div.style.justifyContent = 'space-between';
      div.style.alignItems = 'center';
      div.style.padding = '4px 0';
      div.style.borderBottom = '1px dashed rgba(255,255,255,0.1)';

      div.innerHTML = `
        <div style="font-size:13px; color:#fff;">
          <span style="color:#ff4444">${item.wrong}</span>
          <span> → </span>
          <span style="color:#58f198">${item.correct}</span>
          <span style="color:#999; margin-left:4px;">${item.meaning}</span>
        </div>
        <button class="fav-wrong-word-btn" onclick="toggleFavWord(this, '${item.correct}')"
                style="background:transparent; border:none; font-size:16px; cursor:pointer; color:#999;">
          ☆
        </button>
      `;
      wrongListEl.appendChild(div);
    });
  } else {
    wrongSetEl.style.display = 'none';
  }

  if (allCorrect) {
    playRightSound();
  } else {
    playWrongSound();
  }

  resultEl.style.display = "block";
  answerEl.style.display = "none";
}

// 下一题按钮功能
document.getElementById("nextSentenceBtn").onclick = function() {
  SentenceWriteLogic.nextSentence();
  renderListenSentence();
  updateListenProgress(); 
};

// 播放当前句子发音
document.getElementById("playSentenceBtn").onclick = function () {
  playSentenceFromNewsAudio();
};

// 返回
function backToPrevPage() {
  showPage("articleWritePage");
}

// ===================== 句子默写模块逻辑 =====================
let currentSentenceTab = "written";
let currentSentenceList = [];
let currentSentenceArticle = null;
let writtenSentences = JSON.parse(localStorage.getItem('writtenSentences') || '[]');
let currentSentenceIndex = -1;
let allSentences = [];
let sentenceSubmitCount = 0;

function switchSentenceTab(tab) {
  currentSentenceTab = tab;
  document.querySelectorAll(".sentence-tab-btn").forEach(b => b.classList.remove("active"));
  document.querySelector(`.sentence-tab-btn[data-tab="${tab}"]`).classList.add("active");
  renderSentenceList();
}

// 🔥 修复：提取整篇 NEWS 所有英文句子（完整全文听写）
function extractSentencesFromArticle(article) {
  if (!article || !article.content) return [];

  // 1. 按段落拆分，清理空行
  const lines = article.content
    .split(/\n+/)
    .map(line => line.trim())
    .filter(line => line !== "");

  const sentences = [];

  // 2. 遍历所有行：英文 + 中文 成对提取
  for (let i = 0; i < lines.length; i++) {
    const currentLine = lines[i];

    // 只提取**纯英文行**
    if (!/[A-Za-z]/.test(currentLine) || /[\u4e00-\u9fa5]/.test(currentLine)) {
      continue;
    }

    // 英文句子
    const enSentence = currentLine;

    // 下一行如果是中文 → 作为翻译
    let zhSentence = "";
    if (i + 1 < lines.length && /[\u4e00-\u9fa5]/.test(lines[i + 1])) {
      zhSentence = lines[i + 1];
    }

    // 🔥 把每一句英文都加入听写列表
    sentences.push({
      text: enSentence,
      translation: zhSentence,
      articleName: article.name
    });
  }

  return sentences;
}

// 从所有 NEWS 文章中提取句子（按换行拆分）
function extractSentencesFromArticles() {
  const articles = JSON.parse(localStorage.getItem('bbcNewsList') || '[]');
  let sentences = [];
  articles.forEach(article => {
    sentences = sentences.concat(extractSentencesFromArticle(article));
  });
  return sentences;
}

function renderSentenceList() {
  allSentences = extractSentencesFromArticles();
  const container = document.getElementById("sentenceListContainer");
  const titleEl = document.getElementById("sentenceArticleName");
  const countEl = document.getElementById("sentenceTotalCount");

  let filteredSentences = currentSentenceArticle ? currentSentenceList : allSentences;
  if (!currentSentenceArticle) {
    if (currentSentenceTab === "written") {
      filteredSentences = allSentences.filter(s => writtenSentences.includes(s.text));
    } else if (currentSentenceTab === "pending") {
      filteredSentences = allSentences.filter(s => !writtenSentences.includes(s.text));
    }
    titleEl.innerText = "全部文章句子";
  } else {
    titleEl.innerText = `文章：${currentSentenceArticle.name}`;
  }

  countEl.innerText = filteredSentences.length;

  let html = "";
  filteredSentences.forEach((sentence, index) => {
    const isWritten = writtenSentences.includes(sentence.text);
    const shortText = sentence.text.length > 25 ? sentence.text.slice(0,25) + "..." : sentence.text;
    html += `
    <div onclick="openSentenceWrite(${index})" style="background:var(--bg-card); border-radius:14px; padding:16px; margin-bottom:10px; cursor:pointer; border:1px solid rgba(34,197,94,0.2);">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
        <div style="font-size:16px; font-weight:bold; color:${isWritten ? '#00953d' : 'var(--color-text)'};">${shortText}</div>
        <div style="font-size:12px; color:var(--color-text-secondary);">${isWritten ? '✅ 已默' : '📝 待默'}</div>
      </div>
      <div style="font-size:12px; color:var(--color-text-secondary);">来源：${sentence.articleName}</div>
    </div>`;
  });

  container.innerHTML = html;
}

function openSentenceWrite(index) {
  currentSentenceIndex = index;
  const sentence = currentSentenceArticle ? currentSentenceList[index] : allSentences[index];
  if (!sentence) return;

  document.getElementById("sentenceQuestionPanel").style.display = "block";
  document.getElementById("sentenceTranslation").innerText = sentence.translation || "暂无中文意思";
  document.getElementById("sentenceTranslationContainer").style.display = "none";
  const translationToggle = document.querySelector('.sentence-translation-toggle');
  if (translationToggle) translationToggle.style.display = 'inline-block';
  const checkBtn = document.getElementById("sentenceCheckBtn");
  if (checkBtn) {
    checkBtn.innerText = "检查答案";
    checkBtn.onclick = checkSentenceWrite;
  }
  document.getElementById("sentenceWriteResult").style.display = "none";
  document.getElementById("sentenceCorrectAnswer").style.display = "none";
  sentenceSubmitCount = 0;

  renderSentenceProgress();
  renderSentenceWordInputs(sentence.text);
  playCurrentSentenceAudio();
}

function renderSentenceProgress() {
  const total = currentSentenceList.length;
  const current = currentSentenceIndex + 1;
  document.getElementById("sentenceProgressText").innerText = `当前句子：${current} / ${total}`;
}

function renderSentenceWordInputs(text) {
  const words = text.match(/[a-zA-Z']+/g) || [];
  const container = document.getElementById("sentenceWordInputs");
  container.innerHTML = "";

  words.forEach((correctWord, wordIndex) => {
    const wrapper = document.createElement('div');
    wrapper.style.display = 'flex';
    wrapper.style.flexDirection = 'column';
    wrapper.style.alignItems = 'center';
    wrapper.style.width = '90px';

    const input = document.createElement("input");
    input.type = "text";
    input.className = "sentence-word-input";
    input.dataset.correct = correctWord; // 正确答案
    input.placeholder = "______";
    input.autocomplete = "off";
    input.spellcheck = false;

    const hint = document.createElement('div');
    hint.className = 'sentence-word-hint';
    hint.innerText = '';

    // ===================================
    // 🔥 1. 实时输入：立刻判断对错 + 变色
    // ===================================
    input.oninput = function () {
      const user = this.value.trim().toLowerCase();
      const correct = this.dataset.correct.toLowerCase();

      this.classList.remove("correct", "wrong");
      hint.style.display = 'none';

      if (user === correct) {
        this.classList.add("correct"); // 绿色
      } else if (user.length > 0) {
        this.classList.add("wrong"); // 红色
      }
    };

    // ===================================
    // 🔥 2. 空格 → 跳到下一题
    // ===================================
    input.onkeydown = function (e) {
      const currentIndex = wordIndex;

      // 空格 = 下一个
      if (e.key === " ") {
        e.preventDefault();
        const next = container.children[currentIndex + 1];
        if (next) { const ni = next.querySelector('input'); if (ni) ni.focus(); }
      }

      // ===================================
      // 🔥 3. 删除键：空 → 跳上一个
      // ===================================
      if (e.key === "Backspace") {
        if (this.value === "") {
          e.preventDefault();
          const prev = container.children[currentIndex - 1];
          if (prev) { const pi = prev.querySelector('input'); if (pi) pi.focus(); }
        }
      }
    };

    wrapper.appendChild(input);
    wrapper.appendChild(hint);
    container.appendChild(wrapper);
  });
}

function handleSentenceWordKeydown(e) {
  const input = e.target;
  if (e.key === ' ' || e.key === 'Spacebar') {
    e.preventDefault();
    const next = input.nextElementSibling;
    if (next && next.classList.contains('sentence-word-input')) {
      next.focus();
    }
  }
  if (e.key === 'Backspace' || e.key === 'Delete') {
    if (input.value.trim() !== '') {
      e.preventDefault();
      input.value = '';
      return;
    }
    const prev = input.previousElementSibling;
    if (prev && prev.classList.contains('sentence-word-input')) {
      e.preventDefault();
      prev.focus();
    }
  }
}

function playCurrentSentenceAudio() {
  const sentence = currentSentenceArticle ? currentSentenceList[currentSentenceIndex] : allSentences[currentSentenceIndex];
  if (!sentence) return;
  const utter = new SpeechSynthesisUtterance(sentence.text);
  utter.lang = "en-US";
  speechSynthesis.cancel();
  speechSynthesis.speak(utter);
}

function toggleSentenceTranslation() {
  const container = document.getElementById("sentenceTranslationContainer");
  container.style.display = "flex";
  const btn = document.querySelector('.sentence-translation-toggle');
  if (btn) btn.style.display = 'none';
}

function checkSentenceWrite() {
  const sentence = currentSentenceArticle ? currentSentenceList[currentSentenceIndex] : allSentences[currentSentenceIndex];
  if (!sentence) return;

  const inputs = document.querySelectorAll("#sentenceWordInputs .sentence-word-input");
  if (!inputs.length) return;

  let allCorrect = true;
  inputs.forEach(input => {
    const expected = input.dataset.correct || "";
    const actual = input.value.trim();
    const hint = input.parentElement ? input.parentElement.querySelector('.sentence-word-hint') : null;
    if (actual.toLowerCase() === expected.toLowerCase()) {
      input.classList.add("correct");
      input.classList.remove("wrong");
      if (hint) {
        hint.style.display = 'none';
        hint.innerText = '';
      }
    } else {
      input.classList.add("wrong");
      input.classList.remove("correct");
      allCorrect = false;
      if (hint) {
        hint.innerText = `正确：${expected}`;
        hint.style.display = 'block';
      }
    }
  });

  sentenceSubmitCount += 1;
  const resultEl = document.getElementById("sentenceWriteResult");
  if (allCorrect) {
    resultEl.className = "dict-result right";
    resultEl.innerText = "✅ 全部正确！正在进入下一句...";
    if (!writtenSentences.includes(sentence.text)) {
      writtenSentences.push(sentence.text);
      localStorage.setItem('writtenSentences', JSON.stringify(writtenSentences));
    }
    playRightSound();
    resultEl.style.display = "block";
    setTimeout(() => {
      nextSentence();
    }, 800);
    return;
  }

  if (sentenceSubmitCount >= 3) {
    const correctEl = document.getElementById("sentenceCorrectAnswer");
    const correctWords = sentence.text.match(/[a-zA-Z']+/g) || [];
    correctEl.innerText = `正确答案：${correctWords.join(" ")}`;
    correctEl.style.display = "block";
    inputs.forEach((input, idx) => {
      input.value = correctWords[idx] || "";
      input.classList.remove("wrong");
      input.classList.add("correct");
    });
    const checkBtn = document.getElementById("sentenceCheckBtn");
    if (checkBtn) {
      checkBtn.innerText = "下一句";
      checkBtn.onclick = nextSentence;
    }
    resultEl.className = "dict-result wrong";
    resultEl.innerText = "❌ 错误 3 次，已显示答案";
    resultEl.style.display = "block";
  } else {
    resultEl.className = "dict-result wrong";
    resultEl.innerText = "❌ 有误，再试一次";
    resultEl.style.display = "block";
  }
  playWrongSound();
}

function nextSentence() {
  if (currentSentenceIndex + 1 >= currentSentenceList.length) {
    const resultEl = document.getElementById("sentenceWriteResult");
    resultEl.className = "dict-result right";
    resultEl.innerText = "🎉 本篇文章已完成所有句子听写";
    resultEl.style.display = "block";
    return;
  }
  currentSentenceIndex += 1;
  openSentenceWrite(currentSentenceIndex);
}

function resetSentenceWrite() {
  sentenceSubmitCount = 0;
  const inputs = document.querySelectorAll("#sentenceWordInputs .sentence-word-input");
  inputs.forEach(input => {
    input.value = "";
    input.classList.remove("wrong", "correct");
  });
  const result = document.getElementById("sentenceWriteResult");
  if (result) result.style.display = "none";
  const correctEl = document.getElementById("sentenceCorrectAnswer");
  if (correctEl) correctEl.style.display = "none";
}

function clearSentenceDetail() {
  document.getElementById("sentenceQuestionPanel").style.display = "none";
}

function stopSentenceWriteAndBack() {
  clearSentenceDetail();
  showPage('articleWritePage');
  renderArticleList();
}

function startSentenceWrite() {
  const pendingSentences = allSentences.filter(s => !writtenSentences.includes(s.text));
  if (pendingSentences.length === 0) {
    alert("所有句子都已默完啦！");
    return;
  }
  const randomIndex = Math.floor(Math.random() * pendingSentences.length);
  const originalIndex = allSentences.findIndex(s => s.text === pendingSentences[randomIndex].text);
  openSentenceWrite(originalIndex);
}

// 🔥 页面激活 同步立刻渲染，无定时器、无延迟
const articleWritePageEl = document.getElementById("articleWritePage");
const articleObserver = new MutationObserver((mutations) => {
  if (articleWritePageEl.classList.contains('active')) {
    renderArticleList(); // 立刻执行
  }
});
articleObserver.observe(articleWritePageEl, { attributes: true });
const sentenceWritePageEl = document.getElementById("sentenceWritePage");
if (sentenceWritePageEl) {
  sentenceWritePageEl.addEventListener("click", () => renderSentenceList());
}

// ===================== 收藏夹（我的收藏）核心逻辑 =====================
let currentFavTab = "sentences"; // 默认显示句子

// 切换收藏标签：句子 / 单词
function switchFavTab(tab) {
  currentFavTab = tab;
  document.querySelectorAll(".fav-tab-btn").forEach(b => b.classList.remove("active"));
  document.querySelector(`.fav-tab-btn[data-tab="${tab}"]`).classList.add("active");
  renderFavList();
}

// 渲染收藏列表
function renderFavList() {
  const container = document.getElementById("favListContainer");
  container.innerHTML = "";

  if (currentFavTab === "sentences") {
    renderFavSentences();
  } else {
    renderFavWords();
  }
}

// 渲染【收藏的句子】
function renderFavSentences() {
  const container = document.getElementById("favListContainer");
  const favSentences = getPracticeSentences(); // 读取收藏句子

  if (favSentences.length === 0) {
    container.innerHTML = `<div style="text-align:center; padding:40px 20px; color:var(--color-text-secondary);">暂无收藏句子</div>`;
    return;
  }

  // 🔥 倒序排列（最新的在最上面）
  const reversed = [...favSentences].reverse();

  let html = "";
  reversed.forEach((item, displayIndex) => {
    const actualIndex = favSentences.length - 1 - displayIndex; // 真实索引
    const text = item.text || "";
    const en = text.replace(/[\u4e00-\u9fa5]/g, "").trim();
    const zh = text.replace(/[A-Za-z]/g, "").trim();
    const itemNumber = displayIndex + 1; // 🔥 序号

    html += `
    <div class="fav-item" style="position:relative; padding:14px;">
      <!-- 🔥 序号圆形 -->
      <div class="fav-item-number">${itemNumber}</div>
      
      <!-- 取消按钮：无底色、右上角、不遮挡 -->
      <button class="fav-remove-btn" onclick="removeFavSentence(${actualIndex})"
              style="position:absolute; top:8px; right:8px; 
                     background:transparent; border:none; 
                     color:var(--color-text-secondary); font-size:16px;
                     cursor:pointer; z-index:2;">
        ×
      </button>

      <!-- 英文：绿色蒙板，无文字 -->
      <div class="fav-sentence-text" 
           style="position:relative; cursor:pointer; margin-bottom:6px; line-height:1.6; margin-top:4px;">
        <span class="sentence-en-text">${en}</span>
        <div class="sentence-mask" 
             style="position:absolute; left:0; top:0; width:100%; height:100%;
                    background:#00953d; /* 纯绿色 */
                    border-radius:4px;"
             onclick="showSentenceText(this)">
        </div>
      </div>

      <!-- 中文 -->
      <div class="fav-sentence-trans" style="font-size:14px; color:var(--color-text-secondary);">
        ${zh}
      </div>
    </div>`;
  });
  container.innerHTML = html;
}

// 🔥 新增：点击蒙板显示英文
function showSentenceText(maskEl) {
  // 隐藏蒙板
  maskEl.style.display = 'none';
  // 显示英文
  const enText = maskEl.parentElement.querySelector('.sentence-en-text');
  if (enText) {
    enText.style.visibility = 'visible';
  }
}

function renderFavWords() {
  const container = document.getElementById("favListContainer");
  const favWords = getCollectedWords();
  // 设定统一遮罩宽度
  const fixedMaskWidth = "120px";

  if (favWords.length === 0) {
    container.innerHTML = `<div style="text-align:center; padding:40px 20px; color:var(--color-text-secondary);">暂无收藏单词</div>`;
    return;
  }

  // 🔥 倒序排列（最新的在最上面）
  const reversed = [...favWords].reverse();

  let html = "";
  reversed.forEach((item, displayIndex) => {
    const actualIndex = favWords.length - 1 - displayIndex; // 真实索引
    const itemNumber = displayIndex + 1; // 🔥 序号

    html += `
    <div class="fav-item" style="position:relative; padding:14px; display:flex; align-items:flex-start; gap:12px;">
      <!-- 🔥 序号圆形 -->
      <div class="fav-item-number">${itemNumber}</div>
      
      <!-- 取消按钮 -->
      <button class="fav-remove-btn" onclick="removeFavWord(${actualIndex})"
              style="position:absolute; top:8px; right:8px; 
                     background:transparent; border:none; 
                     color:var(--color-text-secondary); font-size:16px;
                     cursor:pointer; z-index:2;">
        ×
      </button>

      <!-- 单词内容 -->
      <div style="flex:1;">
        <div style="display:flex; align-items:center; gap:8px; margin-bottom:6px;">
          <div style="position:relative; cursor:pointer; width:${fixedMaskWidth}; min-width:${fixedMaskWidth};">
            <span class="word-only" style="visibility:hidden; white-space:nowrap; font-weight:bold; color:#00953d;">${item.word}</span>
            <div class="word-mask" 
                 style="position:absolute; left:0; top:0; width:100%; height:100%;
                        background:#00953d; border-radius:4px;"
                 onclick="showOnlyWord(this)">
            </div>
          </div>
          <span style="color:#90ee90; font-size:13px;">${item.phonetic || ''}</span>
          <span style="color:var(--color-text-secondary); font-size:12px;">${item.pos || ''}</span>
        </div>
        <div style="color:var(--color-text); font-size:14px; line-height:1.5;">${item.meaning || ''}</div>
      </div>
    </div>`;
  });
  container.innerHTML = html;
}

// 删除收藏句子
function removeFavSentence(index) {
  if (!confirm("确定取消收藏这个句子？")) return;
  let list = getPracticeSentences();
  list.splice(index, 1);
  setPracticeSentences(list);
  renderFavList();
}

// 删除收藏单词
function removeFavWord(index) {
  if (!confirm("确定取消收藏这个单词？")) return;
  let list = getCollectedWords();
  list.splice(index, 1);
  setCollectedWords(list);
  renderFavList();
}

// 页面显示时自动刷新收藏列表
const favPage = document.getElementById('sentenceWritePage');
const favObserver = new MutationObserver(() => {
  if (favPage.classList.contains('active')) {
    renderFavList();
  }
});
favObserver.observe(favPage, { attributes: true });

function safeSpeak(word) {
  if (!word || !window.speechSynthesis) return;

  // 必须先停止所有发音
  window.speechSynthesis.cancel();

  const u = new SpeechSynthesisUtterance(word);
  u.lang = 'en-US';
  u.rate = 0.9;       // 语速稳定
  u.pitch = 1;       // 音高稳定
  u.volume = 1;

  // 延迟 80ms 保证浏览器允许播放
  setTimeout(() => {
    window.speechSynthesis.speak(u);
  }, 80);
}

// CET4 识词页面播放单词
function playCet4ExamWord() {
  const word = document.getElementById("cet4ExamWord").innerText;
  if (word) safeSpeak(word);
}

// CET6 识词页面播放单词
function playCet6ExamWord() {
  const word = document.getElementById("cet6ExamWord").innerText;
  if (word) safeSpeak(word);
}

// CET4 拼写页面播放单词
function playCet4SpellWord() {
  const word = spellWordList[currentSpellIndex];
  if (word) safeSpeak(word);
}

// CET6 拼写页面播放单词
function playCet6SpellWord() {
  const word = spellWordList6[currentSpellIndex6];
  if (word) safeSpeak(word);
}

// ==================== 喇叭图片上传和设置 ====================

// 保存喇叭图片到localStorage
function setSpeakerImage(file) {
  const reader = new FileReader();
  reader.onload = function(e) {
    const imageData = e.target.result;
    localStorage.setItem('speakerImageData', imageData);
    updateAllSpeakerIcons();
  };
  reader.readAsDataURL(file);
}

// 更新所有喇叭图标
function updateAllSpeakerIcons() {
  const imageData = localStorage.getItem('speakerImageData');
  if (imageData) {
    const icons = [
      document.getElementById('cet4SpeakerIcon'),
      document.getElementById('cet6SpeakerIcon'),
      document.getElementById('cet4SpellSpeakerIcon'),
      document.getElementById('cet6SpellSpeakerIcon')
    ];
    icons.forEach(icon => {
      if (icon) {
        icon.src = imageData;
        icon.style.display = 'block';
      }
    });
  }
}

// 页面加载时恢复喇叭图片
document.addEventListener('DOMContentLoaded', function() {
  updateAllSpeakerIcons();
  
  // 长按喇叭按钮切换图片
  const speakerButtons = [
    document.getElementById('cet4ExamSpeakBtn'),
    document.getElementById('cet6ExamSpeakBtn'),
    document.getElementById('cet4SpellSpeakBtn'),
    document.getElementById('cet6SpellSpeakBtn')
  ];
  
  speakerButtons.forEach(btn => {
    if (btn) {
      btn.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        document.getElementById('speakerImageInput').click();
      });
    }
  });
});

// 处理文件输入
document.addEventListener('DOMContentLoaded', function() {
  const fileInput = document.getElementById('speakerImageInput');
  if (fileInput) {
    fileInput.addEventListener('change', function(e) {
      if (e.target.files && e.target.files[0]) {
        setSpeakerImage(e.target.files[0]);
      }
    });
  }
});

// 🔥 点击遮罩显示单词（一排）
function showWordText(maskEl) {
  maskEl.style.display = 'none';
  const content = maskEl.parentElement.querySelector('.word-content');
  if (content) {
    content.style.visibility = 'visible';
  }
}

// 只显示被遮罩的英文单词
function showOnlyWord(maskEl) {
  maskEl.style.display = 'none';
  const wordSpan = maskEl.parentElement.querySelector('.word-only');
  if (wordSpan) wordSpan.style.visibility = 'visible';
}

// ===================== 完整修复：句子听写 可点击、可交互 =====================
const SentenceWriteLogic = (function () {
  let currentArticle = null;
  let sentenceList = [];
  let currentIndex = 0;

  async function startWithArticle(article) {
    currentArticle = article;
    sentenceList = [];

    // 优先使用 article.sub 对应的 VTT 字幕生成每一句题目（如果可用）
    if (article && article.sub) {
      try {
        const res = await fetch(article.sub);
        if (res.ok) {
          const vttText = await res.text();
          const subs = parseVtt(vttText);
          // 每个 subtitle cue 对应一道听写题（en 为题目，zh 为翻译）
          sentenceList = subs.map(s => ({
            text: s.en || '',
            translation: s.zh || '',
            articleName: article.name || '',
            startTime: s.start,
            endTime: s.end
          })).filter(s => s.text && s.text.trim().length > 0);
        }
      } catch (e) {
        console.warn('使用 VTT 生成句子失败，回退到正文解析:', e);
      }
    }

    // 如果没有从 VTT 生成句子，则回退到解析 article.content
    if (!sentenceList || sentenceList.length === 0) {
      sentenceList = extractSentencesFromArticle(article);
    }

    currentIndex = 0;
  }

  function getCurrentSentence() {
    return sentenceList[currentIndex] || null;
  }

  function nextSentence() {
    currentIndex++;
  }

  function resetCurrentSentence() {
  }

  function getTotalCount() {
    return sentenceList.length;
  }
  function getCurrentIndex() {
    return currentIndex;
  }
  function getSentenceList() {
    return sentenceList;
  }

  return {
    startWithArticle,
    getCurrentSentence,
    nextSentence,
    resetCurrentSentence,
    getTotalCount,
    getCurrentIndex,
    getSentenceList,
  };
})();

// 自动监听页面显示
window.addEventListener("load", fixSentenceListenPage);
const listenPage = document.getElementById("sentenceListenPage");
const listenObs = new MutationObserver(() => {
  if (listenPage.classList.contains("active")) {
    fixSentenceListenPage();
  }
});
listenObs.observe(listenPage, { attributes: true });

function fixSentenceListenPage() {
  // 下一题按钮绑定（HTML已有onclick，这里是确保）
  const nextBtn = document.getElementById("nextSentenceBtn");
  if (nextBtn) {
    nextBtn.onclick = function () {
      SentenceWriteLogic.nextSentence();
      renderListenSentence();
      updateListenProgress();
    };
  }

  fixListenPlayBtn();
}

// ===================== 句子听写 50x50 喇叭图片上传功能 =====================
document.addEventListener('DOMContentLoaded', function() {
  const playBtn = document.getElementById('playSentenceBtn');
  const speakerImg = document.getElementById('sentenceSpeakerIcon');
  const fileInput = document.getElementById('sentenceSpeakerUpload');

  // 1. 页面加载时恢复保存的图片
  const savedImg = localStorage.getItem('sentenceSpeaker50x50');
  if (savedImg) {
    speakerImg.src = savedImg;
  }

  // 2. 长按按钮 → 打开上传
  playBtn.addEventListener('contextmenu', function(e) {
    e.preventDefault(); // 禁止默认菜单
    fileInput.click();
  });

  // 3. 选择图片后保存并显示
  fileInput.addEventListener('change', function(e) {
    const file = (e.target.files && e.target.files[0]);
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(event) {
      const imgData = event.target.result;
      // 保存到本地
      localStorage.setItem('sentenceSpeaker50x50', imgData);
      // 更新显示
      speakerImg.src = imgData;
    };
    reader.readAsDataURL(file);
  });
});

// 🔥 停止首页所有语音播放
function stopAllVoicePlay() {
  // 停止所有音频元素
  document.querySelectorAll('.voice-src').forEach(a => {
    a.pause();
    a.currentTime = 0;
  });
  // 隐藏所有播放动画
  document.querySelectorAll('.voice-wave-gif').forEach(g => {
    g.style.display = 'none';
  });
  // 显示时间
  document.querySelectorAll('.voice-time').forEach(t => {
    t.style.display = 'block';
  });
}

// ===================== 听写：使用 NEWS 原音频发音（完整版） =====================
let currentListenAudio = null;
let currentListenAudioTimeout = null;

// 用原音频播放当前句子
function playSentenceFromNewsAudio() {
  const sen = SentenceWriteLogic.getCurrentSentence();
  if (!sen || !currentListenArticle) return;

  // 停止系统发音
  window.speechSynthesis.cancel();

  // 找到当前文章对应的音频
  const allNews = JSON.parse(localStorage.getItem('bbcNewsList') || '[]');
  const article = allNews.find(n => n.name === sen.articleName);
  if (!article || !article.audio) {
    safeSpeak(sen.text);
    return;
  }

  // 如果没有时间戳，则回退到 TTS
  if (sen.startTime == null) {
    safeSpeak(sen.text);
    return;
  }

  // 创建音频
  if (!currentListenAudio) {
    currentListenAudio = new Audio();
    currentListenAudio.preload = 'metadata';
  }

  if (currentListenAudioTimeout) {
    clearTimeout(currentListenAudioTimeout);
    currentListenAudioTimeout = null;
  }

  currentListenAudio.pause();
  currentListenAudio.src = article.audio;
  currentListenAudio.currentTime = sen.startTime;
  currentListenAudio.play().catch(err => console.log('播放失败', err));

  const endTime = sen.endTime != null ? sen.endTime : sen.startTime + 3;
  currentListenAudioTimeout = setTimeout(() => {
    if (currentListenAudio) currentListenAudio.pause();
    currentListenAudioTimeout = null;
  }, Math.max(1000, (endTime - sen.startTime) * 1000));
}

// 进入听写时，自动加载字幕时间
function loadSentenceTimeForListen(article) {
  if (!article || !article.sub) return Promise.resolve();

  return fetch(article.sub)
    .then(r => {
      if (!r.ok) throw new Error('字幕加载失败');
      return r.text();
    })
    .then(vttText => {
      const subs = parseVtt(vttText);
      const sentences = SentenceWriteLogic.getSentenceList();

      sentences.forEach(sen => {
        const matchSub = subs.find(sub =>
          sen.text.trim().toLowerCase() === sub.en.trim().toLowerCase()
        );
        if (matchSub) {
          sen.startTime = matchSub.start;
          sen.endTime = matchSub.end;
        }
      });
    })
    .catch(err => {
      console.warn('loadSentenceTimeForListen error:', err);
    });
}

// （已通过 startWithArticle 优先使用 VTT 生成题目并绑定时间，故不再需要额外的重写）

// 重写播放按钮
function fixListenPlayBtn() {
  const playBtn = document.getElementById('playSentenceBtn');
  if (playBtn) {
    playBtn.onclick = function () {
      playSentenceFromNewsAudio();
    };
  }
}

// 页面加载自动生效
window.addEventListener('load', () => {
  fixListenPlayBtn();
  const listenPage = document.getElementById('sentenceListenPage');
  const obs = new MutationObserver(() => {
    if (listenPage.classList.contains('active')) {
      fixListenPlayBtn();
    }
  });
  obs.observe(listenPage, { attributes: true });
});

// 🔥 四级拼写：自动聚焦到第一个输入框
function autoFocusFirstInput() {
  setTimeout(() => {
    const firstInput = document.querySelector("#spellInputContainer input");
    if (firstInput) firstInput.focus();
  }, 100);
}

// 每次渲染拼写题都自动聚焦
const originalRenderCet4Spell = window.renderCet4Spell;
window.renderCet4Spell = function() {
  originalRenderCet4Spell();
  autoFocusFirstInput(); // 自动定位光标
};

// 🔥 六级拼写：自动聚焦第一个输入框
function autoFocusFirstInput6() {
  setTimeout(() => {
    const firstInput = document.querySelector("#spellInputContainer6 input");
    if (firstInput) firstInput.focus();
  }, 100);
}

// 每次渲染六级拼写题自动聚焦
const originalRenderCet6Spell = window.renderCet6Spell;
window.renderCet6Spell = function() {
  originalRenderCet6Spell();
  autoFocusFirstInput6();
};

// 切换单词收藏五角星（灰→绿 / 绿→灰）
function toggleFavWord(btnEl, word) {
  const isCollected = btnEl.classList.contains('active');
  
  if (isCollected) {
    // 取消收藏
    removeCollectedWord(word);
    btnEl.classList.remove('active');
    btnEl.innerText = '☆';
    btnEl.style.color = '#999';
  } else {
    // 收藏
    collectWord(word);
    btnEl.classList.add('active');
    btnEl.innerText = '★';
    btnEl.style.color = '#00953d';
  }
}

// 视频加载完成后强制解除静音、设置音量
const videoPlayer = document.getElementById('videoPlayer');
if(videoPlayer){
  videoPlayer.addEventListener('loadedmetadata', function(){
    this.muted = false;    // 取消静音
    this.volume = 1;       // 音量拉满 0~1
  });
}
// 🔥 修复所有浏览器点击延迟
document.addEventListener('DOMContentLoaded', function() {
  // 强制激活所有可点击元素
  document.querySelectorAll('button, [onclick], .tab, .nav-item, .banner-card').forEach(el => {
    el.style.pointerEvents = 'auto';
  });
});

