
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

let allSubtitlesCache = JSON.parse(localStorage.getItem('allSubtitlesCache') || '[]');

// ================== 自定义音效系统（修复版） ==================
let streakRight = 0;   // 连续答对
let streakWrong = 0;   // 连续答错

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
  streakRight++;
  streakWrong = 0; // 答错清零

  // 20连对 → 10连对音效（你没有20音效，用10代替）
  if (streakRight % 20 === 0) {
    sounds.right10.currentTime = 0;
    sounds.right10.play();
  }
  // 10连对
  else if (streakRight % 10 === 0) {
    sounds.right10.currentTime = 0;
    sounds.right10.play();
  }
  // 5连对
  else if (streakRight % 5 === 0) {
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
  streakWrong++;
  streakRight = 0; // 答对清零

  if (streakWrong % 20 === 0) {
    sounds.wrong10.currentTime = 0;
    sounds.wrong10.play();
  }
  else if (streakWrong % 10 === 0) {
    sounds.wrong10.currentTime = 0;
    sounds.wrong10.play();
  }
  else if (streakWrong % 5 === 0) {
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
  streakRight = 0;
  streakWrong = 0;
}

// NEWS 字幕语言切换：英文 / 中文 / 全部（修复按钮高亮 + 字幕联动）
let newsLangMode = 'all';
function showNewsLang(mode) {
  newsLangMode = mode;
  renderNewsSubtitles();

  const btnEn = document.getElementById('newsBtnEn');
  const btnZh = document.getElementById('newsBtnZh');
  const btnAll = document.getElementById('newsBtnAll');

  [btnEn, btnZh, btnAll].forEach(btn => {
    if (btn) {
      btn.style.background = '#ccc';
      btn.style.color = '#222';
    }
  });

  if (mode === 'en' && btnEn) {
    btnEn.style.background = '#00953d';
    btnEn.style.color = '#fff';
  }
  if (mode === 'zh' && btnZh) {
    btnZh.style.background = '#00953d';
    btnZh.style.color = '#fff';
  }
  if (mode === 'all' && btnAll) {
    btnAll.style.background = '#00953d';
    btnAll.style.color = '#fff';
  }

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
    res.push({time:start, en, zh});
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
      const exists = allSubtitlesCache.some(
        x => x.videoSrc === videoSrc && x.time === sub.time
      );
      if (!exists) allSubtitlesCache.push(sub);
    });
    localStorage.setItem('allSubtitlesCache', JSON.stringify(allSubtitlesCache));
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
  
  modalOverlay.onclick = closeWordModal;

  renderVoiceList();
  renderDramaVideos();
  renderGTVideos();
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
  video.play().catch(() => { });

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

document.addEventListener("click", e => {
  if (e.target.classList.contains("word-cet4") || e.target.classList.contains("word-cet6") || e.target.classList.contains("word-vocabulary")) {
    const word = e.target.dataset.word;
    const info = wordLibrary[word];
    if (!info) return;
        wordPopup.style.display = "block";
    e.target.appendChild(wordPopup);
    wordPopup.style.left = "0px";
    wordPopup.style.top = "8px";
    setTimeout(() => {
      const popRect = wordPopup.getBoundingClientRect();
      if(popRect.right > window.innerWidth){
        let offset = popRect.right - window.innerWidth + 10;
        wordPopup.style.left = -offset + "px";
      }
    },0);
    wordPopup.innerHTML = `
      <p class="word-text">${word}</p>
      <p>释义：${info.meaning}</p>
      <p>音标：${info.phonetic}</p>
      <p>词性：${info.pos}</p>
      <p>等级：${info.type.toUpperCase()}</p>
      <button class="word-fav">收藏单词</button>
    `;
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
  if (video.paused) video.play();
  else video.pause();
}
function stopVideoAndBack() {
  video.pause();
  video.currentTime = 0;
  document.getElementById('videoBox').classList.remove('playing');
  showPage(lastPageBeforeVideo);
}
function showPage(id) {
  document.querySelectorAll('.page').forEach(p => {
    p.classList.remove('active');
  });
  setTimeout(() => {
    const page = document.getElementById(id);
    if (page) page.classList.add('active');
  }, 50);

  const tabbar = document.getElementById('mainTabbar');
  const showTabPages = ['mainPage', 'oilPage', 'iboPage'];
  if (tabbar) tabbar.style.display = showTabPages.includes(id) ? 'flex' : 'none';

  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  const homeTab = document.getElementById('tab-home');
  const oilTab = document.getElementById('tab-oil');
  const iboTab = document.getElementById('tab-ibo');
  if (id === 'mainPage' && homeTab) homeTab.classList.add('active');
  if ((id.startsWith('oil') || id.includes('word') || id.includes('practice')) && oilTab) oilTab.classList.add('active');
  if (id === 'iboPage' && iboTab) iboTab.classList.add('active');

  const themeBtn = document.getElementById('themeToggle');
  if (themeBtn) themeBtn.style.display = id === 'mainPage' ? 'block' : 'none';
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
document.getElementById('modalStar').onclick = function () {
  const word = document.getElementById('modalWord').innerText;
  collectWord(word);
  this.classList.toggle('active');
}

let bannerSwiper = document.getElementById('bannerSwiper');
let bannerIndex = 0;
const bannerTotal = bannerSwiper?.querySelectorAll('.banner-card').length || 0;
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

    const wordText = card.querySelector('span[style*="color:#00953d"]')?.innerText || '';
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

function renderBbcNews() {
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
async function addBbcNews() {
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

function deleteBbcNews(index) {
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
  let contentText = item.content;
  contentEl.innerText = contentText;
  let html = contentEl.innerHTML;

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
  await loadNewsSubtitle(item.sub || item.audio);
  
  document.getElementById('bbcPlayBtn').innerText = '▶';
  document.getElementById('bbcAudioProgress').value = 0;
  document.getElementById('bbcAudioCurrent').innerText = '00:00';
  document.getElementById('bbcAudioDuration').innerText = '00:00';
  
  // 🔥 修复：默认显示双语字幕 + 强制渲染
  showNewsLang('all');  // 👈 加在这里
  showPage('bbcDetailPage');
}

// ===================== NEWS 字幕 VTT 支持 =====================
let newsSubtitles = [];
let currentNewsSubIndex = -1;

// 加载 NEWS 音频对应的 VTT 字幕
async function loadNewsSubtitle(audioSrc) {
  const subSrc = audioSrc.replace('.mp3', '.vtt').replace('.m4a', '.vtt');
  try {
    const res = await fetch(subSrc);
    if (!res.ok) throw '无字幕文件';
    const text = await res.text();
    newsSubtitles = parseVtt(text);
    renderNewsSubtitles();
  } catch (e) {
    document.getElementById('newsSubtitleList').innerHTML = `
      <div style="text-align:center;padding:10px;color:var(--color-text-secondary);">
        暂无字幕
      </div>`;
    newsSubtitles = [];
  }
}

// 渲染 NEWS 字幕（和视频页样式一致）
function renderNewsSubtitles() {
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
    
    let enHtml = '';
    let zhHtml = '';
    
    // 🔥 真正根据语言模式显示（修复点）
    if (newsLangMode === 'en') {
      enHtml = sub.en;       // 只显示英文
      zhHtml = '';
    } 
    else if (newsLangMode === 'zh') {
      enHtml = '';
      zhHtml = sub.zh;       // 只显示中文
    } 
    else {
      enHtml = sub.en;       // 全部显示
      zhHtml = sub.zh;
    }

    div.innerHTML = `
      <div class="sub-en">${enHtml}</div>
      <div class="sub-zh">${zhHtml}</div>
    `;
    list.appendChild(div);
  });
}

// 音频播放时同步字幕
function syncNewsSubtitles() {
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
function setActiveNewsSub(index) {
  const items = document.querySelectorAll('#newsSubtitleList .subtitle-item');
  items.forEach((el, i) => {
    el.classList.remove('active', 'played');
    if (i === index) el.classList.add('active');
    if (i < index) el.classList.add('played');
  });
  currentNewsSubIndex = index;
}

// 点击字幕跳转对应时间
function jumpToNewsSubtitle(index) {
  if (newsSubtitles[index]) {
    bbcAudio.currentTime = newsSubtitles[index].time;
    bbcAudio.play();
  }
}

// 退出页面重置字幕
function resetNewsSubtitle() {
  currentNewsSubIndex = -1;
  newsSubtitles = [];
  const items = document.querySelectorAll('#newsSubtitleList .subtitle-item');
  items.forEach(el => el.classList.remove('active', 'played'));
}

function toggleBbcAudio() {
  if (bbcAudio.paused) {
    bbcAudio.play().catch(() => alert('音频加载失败，请检查文件地址'));
    document.getElementById('bbcPlayBtn').innerText = '❚❚';
  } else {
    bbcAudio.pause();
    document.getElementById('bbcPlayBtn').innerText = '▶';
  }
}

function toggleBbcSpeed() {
  const speeds = [1.0, 1.25, 1.5, 0.75];
  const idx = speeds.indexOf(bbcSpeed);
  bbcSpeed = speeds[(idx + 1) % speeds.length];
  bbcAudio.playbackRate = bbcSpeed;
  const speedBtn = document.getElementById('bbcSpeedBtn');
  if (speedBtn) speedBtn.innerText = bbcSpeed + 'x';
}

function bbcSkip(seconds) {
  bbcAudio.currentTime += seconds;
}

function formatTime(sec) {
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

function stopBbcAudioAndBack() {
  bbcAudio.pause();
  bbcAudio.currentTime = 0;
  document.getElementById('bbcPlayBtn').innerText = '▶';
  
  // 🔥 重置字幕
  resetNewsSubtitle();
  
  showPage('bbcPage');
}

function syncBbcAdminDisplay() {
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
function switchCet4Tab(tab) {
  currentCet4Tab = tab;
  document.querySelectorAll(".cet4-tab-btn").forEach(b => b.classList.remove("active"));
  document.querySelector(`.cet4-tab-btn[data-tab="${tab}"]`).classList.add("active");
  renderCet4WordList();
}

// 全选/取消全选 当前页面可见单词
let isAllSelected = false;
function toggleSelectAllVisible() {
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
async function renderCet4WordList() {
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
function toggleWordSelect(word, el) {
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
function updateSelectedCount() {
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
function startCet4Exam() {
  if (selectedCet4Words.length === 0) return;
  examWordList = [...selectedCet4Words];
  currentExamIndex = 0;
  showPage("cet4ExamPage");
  renderCet4ExamQuestion();
  autoSpeakExamWord();
}

// 开始拼写答题
function startCet4Spell(){
  if(selectedCet4Words.length === 0) return;
  spellWordList = [...selectedCet4Words];
  currentSpellIndex = 0;
  wrongCount = 0;
  showPage("cet4SpellPage");
  renderCet4Spell();
}

function renderCet4Spell(){
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

  container.children[0]?.focus();
  setTimeout(()=>speakWord(word), 300);
}

// 核对拼写
function checkSpell(){
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
function nextSpell(){
  currentSpellIndex++;
  if(currentSpellIndex >= spellWordList.length){
    alert("拼写完成！");
    stopCet4SpellAndBack();
    return;
  }
  renderCet4Spell();
}

// 退出拼写
function stopCet4SpellAndBack(){
  spellWordList = [];
  currentSpellIndex = 0;
  showPage("cet4Page");
  renderCet4WordList();
  updateSelectedCount();
  resetStreak();
}

// 渲染识词题目
function renderCet4ExamQuestion() {
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
  autoSpeakExamWord();
}

// 选择选项
function selectExamOption(el, correctAnswer) {
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

function stopCet4ExamAndBack() {
  selectedCet4Words = [];
  currentExamIndex = 0;
  examWordList = [];
  showPage("cet4Page");
  renderCet4WordList();
  updateSelectedCount();
  resetStreak();
}

// 发音
function speakWord(text) {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    let utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  }
}

function autoSpeakExamWord() {
  const word = document.getElementById("cet4ExamWord").innerText;
  setTimeout(() => speakWord(word), 300);
}

// 弹出对错图片
function showPopup(isCorrect){
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
function speakWord(text) {
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
function autoSpeakExamWord() {
  const word = document.getElementById("cet4ExamWord").innerText;
  setTimeout(() => {
    speakWord(word);
  }, 300);
}

// 🔥 显示当前单词答案
function showCurrentAnswer() {
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
function switchCet6Tab(tab) {
  currentCet6Tab = tab;
  document.querySelectorAll(".cet6-tab-btn").forEach(b => b.classList.remove("active"));
  document.querySelector(`.cet6-tab-btn[data-tab="${tab}"]`).classList.add("active");
  renderCet6WordList();
}

// 全选/取消全选 当前页面可见单词
let isAllSelectedCet6 = false;
function toggleSelectAllVisibleCet6() {
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
async function renderCet6WordList() {
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
function toggleWordSelectCet6(word, el) {
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
function updateSelectedCountCet6() {
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
function startCet6Exam() {
  if (selectedCet6Words.length === 0) return;
  examWordList6 = [...selectedCet6Words];
  currentExamIndex6 = 0;
  showPage("cet6ExamPage");
  renderCet6ExamQuestion();
  autoSpeakExamWord6();
}

// 开始拼写答题
function startCet6Spell(){
  if(selectedCet6Words.length === 0) return;
  spellWordList6 = [...selectedCet6Words];
  currentSpellIndex6 = 0;
  wrongCount6 = 0;
  showPage("cet6SpellPage");
  renderCet6Spell();
}

// 渲染拼写题目
function renderCet6Spell(){
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

  container.children[0]?.focus();
  setTimeout(()=>speakWord(word), 300);
}

// 核对拼写
function checkSpell6(){
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
function nextSpell6(){
  currentSpellIndex6++;
  if(currentSpellIndex6 >= spellWordList6.length){
    alert("拼写完成！");
    stopCet6SpellAndBack();
    return;
  }
  renderCet6Spell();
}

// 显示答案
function showCurrentAnswer6(){
  const word = spellWordList6[currentSpellIndex6];
  document.getElementById("answerShow6").innerText = `正确答案：${word}`;
  document.getElementById("answerShow6").style.display = "block";
}

// 退出拼写
function stopCet6SpellAndBack(){
  spellWordList6 = [];
  currentSpellIndex6 = 0;
  showPage("cet6Page");
  renderCet6WordList();
  updateSelectedCountCet6();
  resetStreak();
}

// 渲染识词题目
function renderCet6ExamQuestion() {
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
  autoSpeakExamWord6();
}

// 选择选项
function selectExamOptionCet6(el, correctAnswer) {
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
function stopCet6ExamAndBack() {
  selectedCet6Words = [];
  currentExamIndex6 = 0;
  examWordList6 = [];
  showPage("cet6Page");
  renderCet6WordList();
  updateSelectedCountCet6();
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

// 自动发音
function autoSpeakExamWord6() {
  const word = document.getElementById("cet6ExamWord").innerText;
  setTimeout(() => speakWord(word), 300);
}

// ===================== 文章默写模块逻辑（智能对比 + 打分 + 错误单词） =====================
let currentArticleTab = "written";
let writtenArticles = JSON.parse(localStorage.getItem('writtenArticles') || '[]');
let currentArticleIndex = -1;  // 当前选中的文章索引
let allNewsArticles = [];
let currentWrongWords = [];

// 切换文章标签
function switchArticleTab(tab) {
  currentArticleTab = tab;
  document.querySelectorAll(".article-tab-btn").forEach(b => b.classList.remove("active"));
  document.querySelector(`.article-tab-btn[data-tab="${tab}"]`).classList.add("active");
  renderArticleList();
}

/// 渲染文章列表（点击选择，不跳转）
function renderArticleList() {
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
  filteredArticles.forEach((article, index) => {
    // 选中样式
    const isSelected = (currentArticleIndex === index);
    html += `
    <div onclick="toggleArticleSelect(${index})" 
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

// 打开默写（只显示默写框）
function openArticleWrite(index) {
  currentArticleIndex = index;
  document.getElementById("articleWriteInput").value = "";
  document.getElementById("scoreDisplay").style.display = "none";
  document.getElementById("wrongWordsContainer").style.display = "none";
  showPage("articleWriteDetailPage");
}

// 智能核对：对比单词 + 打分 + 错误单词
function checkArticleWriteSmart() {
  const input = document.getElementById("articleWriteInput").value.trim();
  const article = allNewsArticles[currentArticleIndex];
  const original = article.content.trim();

  if (!input) {
    alert("请输入默写内容");
    playWrongSound();
    return;
  }

  const originalWords = original.toLowerCase().match(/[a-z]+/g) || [];
  const inputWords = input.toLowerCase().match(/[a-z]+/g) || [];

  let correctCount = 0;
  let wrongWords = [];

  inputWords.forEach((w, i) => {
    if (originalWords[i] === w) {
      correctCount++;
    } else {
      wrongWords.push(w);
    }
  });

  const total = Math.max(originalWords.length, inputWords.length);
  const accuracy = (correctCount / total * 100).toFixed(1);

  let score = "💯 满分";
  if (accuracy < 90) score = "😃 优秀";
  if (accuracy < 80) score = "🙂 良好";
  if (accuracy < 70) score = "😊 合格";
  if (accuracy < 60) score = "😐 继续努力";

  const scoreEl = document.getElementById("scoreDisplay");
  scoreEl.innerText = `正确率：${accuracy}% | ${score}`;
  scoreEl.style.display = "block";

  const wrongContainer = document.getElementById("wrongWordsContainer");
  const wrongListEl = document.getElementById("wrongWordsList");
  wrongListEl.innerHTML = "";
  currentWrongWords = wrongWords;

  if (wrongWords.length > 0) {
    wrongWords.forEach(word => {
      const wd = document.createElement("span");
      wd.className = "wrong-word-item";
      wd.innerText = word;
      wd.onclick = () => showWordCard(word);
      wrongListEl.appendChild(wd);
    });
    wrongContainer.style.display = "block";
    playWrongSound();
  } else {
    wrongContainer.style.display = "none";
    playRightSound();
    if (!writtenArticles.includes(article.name)) {
      writtenArticles.push(article.name);
      localStorage.setItem('writtenArticles', JSON.stringify(writtenArticles));
    }
  }
}

// 点击错误单词 → 弹出单词卡
function showWordCard(word) {
  const info = wordLibrary[word] || null;
  if (!info) {
    alert(`未找到单词：${word}`);
    return;
  }
  showWordInfo(word, info.phonetic, info.meaning, info.pos);
}

// 重置
function resetArticleWrite() {
  document.getElementById("articleWriteInput").value = "";
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

// 【选中后】点击 听写
function startSentenceWriteBySelect() {
  if (currentArticleIndex === -1) {
    alert("请先选择一篇文章");
    return;
  }
  const article = allNewsArticles[currentArticleIndex];
  jumpToArticleSentenceWrite(article);
}

// 跳转到指定文章的句子听写
function jumpToArticleSentenceWrite(article) {
  const sentences = article.content.split(/\n+/).filter(line => line.trim() !== "");
  if (sentences.length === 0) {
    alert("该文章没有可听写句子");
    return;
  }
  localStorage.setItem('tempArticleSentences', JSON.stringify(sentences));
  localStorage.setItem('tempArticleName', article.name);
  showPage('sentenceWritePage');
  renderSentenceListByArticle(article);
}

// ===================== 句子默写模块逻辑 =====================
let currentSentenceTab = "written";
let writtenSentences = JSON.parse(localStorage.getItem('writtenSentences') || '[]');
let currentSentenceIndex = -1;
let allSentences = [];

function switchSentenceTab(tab) {
  currentSentenceTab = tab;
  document.querySelectorAll(".sentence-tab-btn").forEach(b => b.classList.remove("active"));
  document.querySelector(`.sentence-tab-btn[data-tab="${tab}"]`).classList.add("active");
  renderSentenceList();
}

// 从所有 NEWS 文章中提取句子（按换行拆分）
function extractSentencesFromArticles() {
  const articles = JSON.parse(localStorage.getItem('bbcNewsList') || '[]');
  let sentences = [];
  articles.forEach(article => {
    const lines = article.content.split(/\n+/).filter(line => line.trim() !== "");
    lines.forEach(line => {
      sentences.push({
        text: line.trim(),
        articleName: article.name
      });
    });
  });
  return sentences;
}

function renderSentenceList() {
  allSentences = extractSentencesFromArticles();
  const container = document.getElementById("sentenceListContainer");
  
  let filteredSentences = allSentences;
  if (currentSentenceTab === "written") {
    filteredSentences = allSentences.filter(s => writtenSentences.includes(s.text));
  } else if (currentSentenceTab === "pending") {
    filteredSentences = allSentences.filter(s => !writtenSentences.includes(s.text));
  }

  document.getElementById("sentenceTotalCount").innerText = filteredSentences.length;

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
  const sentence = allSentences[index];
  document.getElementById("sentenceChineseHint").innerText = "请写出对应的英文句子"; // 这里可以后续加中文翻译，先占位
  document.getElementById("sentenceWriteInput").value = "";
  document.getElementById("sentenceWriteResult").style.display = "none";
  showPage("sentenceWriteDetailPage");
}

function checkSentenceWrite() {
  const input = document.getElementById("sentenceWriteInput").value.trim();
  const original = allSentences[currentSentenceIndex].text.trim();
  const resultEl = document.getElementById("sentenceWriteResult");

  if (!input) {
    resultEl.className = "dict-result wrong";
    resultEl.style.display = "block";
    resultEl.innerText = "请先输入默写内容！";
    playWrongSound();
    return;
  }

  const isCorrect = input === original;
  if (isCorrect) {
    resultEl.className = "dict-result right";
    resultEl.innerText = "✅ 完全正确！已自动标记为「已默」";
    playRightSound();
    // 自动标记为已默
    if (!writtenSentences.includes(original)) {
      writtenSentences.push(original);
      localStorage.setItem('writtenSentences', JSON.stringify(writtenSentences));
    }
  } else {
    resultEl.className = "dict-result wrong";
    resultEl.innerText = "❌ 存在差异，请对照原文修改";
    playWrongSound();
  }
  resultEl.style.display = "block";
}

function resetSentenceWrite() {
  document.getElementById("sentenceWriteInput").value = "";
  document.getElementById("sentenceWriteResult").style.display = "none";
}

function stopSentenceWriteAndBack() {
  showPage("sentenceWritePage");
  renderSentenceList();
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

// 页面进入时自动渲染列表
document.getElementById("articleWritePage").addEventListener("click", () => renderArticleList());
document.getElementById("sentenceWritePage").addEventListener("click", () => renderSentenceList());
