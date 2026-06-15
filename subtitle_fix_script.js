/**
 * 🎬 Yibo News 字幕加载修复脚本
 * 使用方式：复制以下代码替换 index copy_0520_副本2.html 中的相应函数
 * 创建时间：2026-05-21
 */

// ============================================================
// 修复方案：增强的字幕加载函数（含详细错误处理）
// ============================================================

/**
 * 改进版 loadNewsSubtitle - 带完整错误诊断
 * @param {string} audioSrc - 音频文件路径（如 'audio_1.mp3'）
 */
async function loadNewsSubtitle(audioSrc) {
  const subSrc = audioSrc.replace('.mp3', '.vtt').replace('.m4a', '.vtt');
  
  try {
    // 日志：开始加载
    console.log('[📌 字幕加载系统]', '开始加载字幕...');
    console.log('[📌 字幕加载系统]', '目标文件:', subSrc);
    console.log('[📌 字幕加载系统]', '当前 URL:', window.location.href);
    console.log('[📌 字幕加载系统]', '访问协议:', window.location.protocol);

    // 尝试 Fetch
    const res = await fetch(subSrc, {
      method: 'GET',
      headers: {
        'Accept': 'text/plain, text/vtt, */*'
      }
    });

    // 检查 HTTP 响应状态
    if (!res.ok) {
      const errorMsg = `HTTP 错误 ${res.status} ${res.statusText}`;
      console.error('[❌ 字幕加载系统]', errorMsg);
      console.error('[❌ 字幕加载系统]', '响应头:', {
        'Content-Type': res.headers.get('content-type'),
        'Content-Length': res.headers.get('content-length')
      });
      throw errorMsg;
    }

    // 读取文件内容
    const text = await res.text();
    console.log('[✅ 字幕加载系统]', `成功读取 ${text.length} 字符`);
    console.log('[✅ 字幕加载系统]', '文件头:', text.substring(0, 50) + '...');

    // 解析 VTT
    newsSubtitles = parseVtt(text);
    console.log('[✅ 字幕加载系统]', `成功解析 ${newsSubtitles.length} 条字幕`);
    
    // 验证字幕数据
    if (newsSubtitles.length > 0) {
      console.log('[✅ 字幕加载系统]', '第一条字幕:', newsSubtitles[0]);
    }

    // 渲染字幕
    renderNewsSubtitles();
    console.log('[✅ 字幕加载系统]', '字幕渲染完成');

  } catch (e) {
    // 详细的错误日志
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('❌ 字幕加载失败！');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('错误信息:', e);
    console.error('错误类型:', e.name || typeof e);
    console.error('要查找的文件:', subSrc);
    console.error('当前路径:', window.location.pathname);
    console.error('当前协议:', window.location.protocol);
    console.error('');
    console.warn('⚠️ 可能的原因:');
    
    if (window.location.protocol === 'file:') {
      console.warn('1. 使用 file:// 协议打开 HTML（浏览器安全限制阻止 fetch）');
      console.warn('   ➜ 解决: 使用 Web 服务器运行项目（Python: python3 -m http.server 8000）');
    }
    
    console.warn('2. VTT 文件不存在或路径错误');
    console.warn('   ➜ 检查项目目录中是否存在:', subSrc);
    
    console.warn('3. 服务器配置错误或 CORS 问题');
    console.warn('   ➜ 检查浏览器 Network 标签中的 VTT 请求');
    
    console.warn('4. 网络连接问题');
    console.warn('   ➜ 检查网络状态');
    
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // UI 显示友好的错误提示
    const newsSubtitleList = document.getElementById('newsSubtitleList');
    if (newsSubtitleList) {
      newsSubtitleList.innerHTML = `
        <div style="text-align:center;padding:20px;color:var(--color-text-secondary);">
          <div style="font-size:14px;margin-bottom:8px;">⚠️ 字幕加载失败</div>
          <div style="font-size:12px;color:#f87171;">
            文件: ${subSrc}<br>
            错误: ${String(e).substring(0, 50)}...
          </div>
          <div style="font-size:11px;color:#60a5fa;margin-top:8px;">
            按 F12 打开控制台查看详细信息
          </div>
        </div>`;
    }

    newsSubtitles = [];
  }
}

// ============================================================
// 辅助函数：检查字幕文件状态
// ============================================================

/**
 * 诊断字幕文件状态
 */
async function diagnoseSubtitleFile(vttFile) {
  console.log('🔍 开始诊断:', vttFile);
  
  try {
    // 方法 1: HEAD 请求（轻量级检查）
    console.log('  - 尝试 HEAD 请求...');
    const headRes = await fetch(vttFile, { method: 'HEAD' });
    console.log(`  - 响应: ${headRes.status} ${headRes.statusText}`);
    
    if (headRes.ok) {
      console.log('  ✅ 文件存在且可访问');
      
      // 方法 2: GET 请求获取详细信息
      const getRes = await fetch(vttFile);
      const contentType = getRes.headers.get('content-type');
      const contentLength = getRes.headers.get('content-length');
      const text = await getRes.text();
      
      console.log('  - Content-Type:', contentType);
      console.log('  - Content-Length:', contentLength);
      console.log('  - 实际大小:', text.length);
      console.log('  - 包含 WEBVTT:', text.includes('WEBVTT'));
      console.log('  - 字幕条数:', (text.match(/-->/g) || []).length);
      
      return { success: true, file: vttFile };
    } else {
      console.error(`  ❌ HTTP ${headRes.status}`);
      return { success: false, error: `HTTP ${headRes.status}`, file: vttFile };
    }
  } catch (e) {
    console.error('  ❌ 错误:', e.message);
    return { success: false, error: e.message, file: vttFile };
  }
}

// ============================================================
// 辅助函数：列出所有可用的 VTT 文件
// ============================================================

/**
 * 列出项目中所有可用的字幕文件
 */
async function listAvailableSubtitles() {
  const commonSubtitleFiles = [
    'audio_1.vtt',
    'audio_1_副本.vtt',
    'audio_2.vtt',
    'news_1.vtt',
    'news_2.vtt',
    'exploring1_1.vtt'
  ];

  console.log('🔍 扫描可用的字幕文件...\n');
  
  const available = [];
  const unavailable = [];

  for (const file of commonSubtitleFiles) {
    try {
      const res = await fetch(file, { method: 'HEAD' });
      if (res.ok) {
        available.push(file);
        console.log(`✅ ${file}`);
      } else {
        unavailable.push({ file, status: res.status });
        console.log(`❌ ${file} (HTTP ${res.status})`);
      }
    } catch (e) {
      unavailable.push({ file, error: e.message });
      console.log(`❌ ${file} (${e.message})`);
    }
  }

  console.log('\n📊 统计:');
  console.log(`  可用: ${available.length}`);
  console.log(`  不可用: ${unavailable.length}`);
  
  return { available, unavailable };
}

// ============================================================
// 使用示例和测试代码
// ============================================================

/*

// 在浏览器控制台（F12）执行以下命令测试：

// 1️⃣ 诊断特定文件
diagnoseSubtitleFile('audio_1.vtt');

// 2️⃣ 列出所有可用字幕
listAvailableSubtitles();

// 3️⃣ 手动加载字幕（测试用）
loadNewsSubtitle('audio_1.mp3');

// 4️⃣ 检查已加载的字幕数据
console.log('当前字幕数据:', newsSubtitles);

*/

// ============================================================
// 快速测试脚本（复制到浏览器控制台执行）
// ============================================================

const subtitleFixScript = {
  /**
   * 运行完整诊断
   */
  runFullDiagnosis() {
    console.log('🏥 开始完整诊断...\n');
    console.log('📍 环境信息:');
    console.log('  - URL:', window.location.href);
    console.log('  - 协议:', window.location.protocol);
    console.log('  - 主机:', window.location.hostname);
    console.log('');
    
    // 运行列表扫描
    return listAvailableSubtitles();
  },

  /**
   * 尝试重新加载字幕
   */
  async retryLoadSubtitle(audioFile = 'audio_1.mp3') {
    console.log('🔄 重新尝试加载字幕...');
    await loadNewsSubtitle(audioFile);
  },

  /**
   * 显示当前字幕信息
   */
  showCurrentSubtitles() {
    console.log('📝 当前加载的字幕信息:');
    if (!newsSubtitles || newsSubtitles.length === 0) {
      console.log('  (无字幕数据)');
    } else {
      console.log(`  共 ${newsSubtitles.length} 条字幕`);
      console.log('  前 3 条预览:');
      newsSubtitles.slice(0, 3).forEach((sub, i) => {
        console.log(`    [${i + 1}] ${sub.en?.substring(0, 40)}...`);
      });
    }
  }
};

// 导出供使用
if (typeof window !== 'undefined') {
  window.subtitleFixScript = subtitleFixScript;
}

console.log('✅ 字幕修复脚本已加载');
console.log('使用方式: subtitleFixScript.runFullDiagnosis()');
