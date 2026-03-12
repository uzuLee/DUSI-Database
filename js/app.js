/* ============================================
   DUSI-NET BUREAUCRATIC ARCHIVE v10.0
   Core Engine: YAML-Based Security & Context Spacing
   ============================================ */

(function () {
  'use strict';

  const GITHUB_CONFIG = {
    user: "uzuLee",
    repo: "DUSI-Database",
    branch: "docs"
  };

  let treeData = [];
  let currentPath = null;

  // Effect State
  let voidInterval = null;
  let scrambleInterval = null;
  let resocializationInterval = null;
  let isScrolledPastMid = false;
  let gaugeProgress = 0;
  let isLocked = false; 
  let isCountdownActive = false;

  // DOM Elements
  const $navTree = document.getElementById('nav-tree');
  const $welcomeView = document.getElementById('welcome-screen');
  const $docView = document.getElementById('doc-view');
  const $docBody = document.getElementById('doc-body');
  const $docFooter = document.getElementById('doc-footer');
  const $yamlInfo = document.getElementById('yaml-info');
  const $breadcrumbs = document.getElementById('nav-breadcrumbs');
  const $currentTime = document.getElementById('current-time');
  const $mobileToggle = document.getElementById('mobile-toggle');
  const $sidebar = document.getElementById('sidebar');
  const $contentScroll = document.getElementById('content-scroll');
  const $sysLog = document.getElementById('sys-log');
  const $monitoringBar = document.getElementById('monitoring-bar');
  const $glitchLayer = document.getElementById('glitch-layer');
  const $bootScreen = document.getElementById('boot-screen');
  const $bootStatus = document.getElementById('boot-status');
  const $bootProgress = document.getElementById('boot-progress');
  const $bootPerc = document.getElementById('boot-perc');
  const $securityModal = document.getElementById('security-modal');
  const $transitionOverlay = document.getElementById('transition-overlay');
  const $searchInput = document.getElementById('search-input');

  // --- Marked.js Configuration ---
  if (typeof marked !== 'undefined') {
    const boldExtension = {
      name: 'boldExtension',
      level: 'inline',
      start(src) { return src.indexOf('**'); },
      tokenizer(src, tokens) {
        const rule = /^\*\*(?!\s)([\s\S]+?)(?<!\s)\*\*/; 
        const match = rule.exec(src);
        if (match) {
          return {
            type: 'boldExtension',
            raw: match[0],
            text: match[1],
            tokens: this.lexer.inlineTokens(match[1])
          };
        }
      },
      renderer(token) {
        return `<strong class="tactical-bold">${this.parser.parseInline(token.tokens)}</strong>`;
      }
    };
    marked.use({ 
      extensions: [boldExtension],
      gfm: true, 
      breaks: true 
    });
  }

  function logSystem(msg, type = 'info') {
    if (!$sysLog) return;
    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    entry.textContent = `[${new Date().toTimeString().split(' ')[0]}] ${msg}`;
    $sysLog.appendChild(entry);
    $sysLog.scrollTop = $sysLog.scrollHeight;
  }

  async function runAuthSequence() {
    if (!$bootScreen) return;
    const steps = [
      { msg: "> INITIALIZING SECURE TERMINAL...", delay: 300 },
      { msg: "> VERIFYING HASH INTEGRITY...", delay: 400 },
      { msg: "> ACCESS GRANTED.", delay: 200 }
    ];
    for (let i = 0; i < steps.length; i++) {
      if ($bootStatus) {
        const line = document.createElement('div');
        line.textContent = steps[i].msg;
        $bootStatus.appendChild(line);
      }
      const prog = Math.floor(((i + 1) / steps.length) * 100);
      if ($bootProgress) $bootProgress.style.width = prog + '%';
      if ($bootPerc) $bootPerc.textContent = prog + '%';
      await new Promise(r => setTimeout(r, steps[i].delay));
    }
    $bootScreen.classList.add('fade-out');
    document.body.classList.add('ready');
    setTimeout(() => $bootScreen.remove(), 800);
  }

  async function init() {
    startClock();
    setupMobile();
    setupSearch();
    renderDashboard();
    await runAuthSequence();
    
    try {
      const branchRes = await fetch(`https://api.github.com/repos/${GITHUB_CONFIG.user}/${GITHUB_CONFIG.repo}/branches/${GITHUB_CONFIG.branch}`);
      const branchData = await branchRes.json();
      const treeRes = await fetch(`https://api.github.com/repos/${GITHUB_CONFIG.user}/${GITHUB_CONFIG.repo}/git/trees/${branchData.commit.commit.tree.sha}?recursive=1`);
      const treeRaw = await treeRes.json();

      treeData = buildHierarchy(treeRaw.tree);
      compactTree(treeData);
      
      renderTree(treeData, $navTree, []);
      updateWelcomeStats(treeRaw.tree.filter(n => n.type === 'blob').length);
      logSystem("Database sync complete.", "success");
    } catch (e) {
      logSystem("API link failed.", "err");
    }
  }

  function buildHierarchy(nodes) {
    const root = [];
    const map = {};
    nodes.forEach(node => {
      if (node.path.startsWith('.') || node.type !== 'blob' || !node.path.endsWith('.md')) return;
      const parts = node.path.split('/');
      let cur = root;
      let pathAcc = "";
      parts.forEach((part, i) => {
        pathAcc += (pathAcc ? '/' : '') + part;
        if (!map[pathAcc]) {
          const newNode = { name: part, type: i === parts.length - 1 ? 'file' : 'folder', path: node.path, children: [] };
          map[pathAcc] = newNode;
          cur.push(newNode);
        }
        cur = map[pathAcc].children;
      });
    });
    return root;
  }

  function compactTree(nodes) {
    for (let i = 0; i < nodes.length; i++) {
      let node = nodes[i];
      if (node.type === 'folder') {
        compactTree(node.children);
        while (node.children.length === 1 && node.children[0].type === 'folder') {
          const child = node.children[0];
          node.name = `${node.name} / ${child.name}`;
          node.children = child.children;
          compactTree(node.children);
        }
      }
    }
  }

  function renderTree(nodes, container, path, filter = "") {
    if (!container) return;
    container.innerHTML = '';
    const sorted = nodes.sort((a, b) => (a.type === 'file') - (b.type === 'file'));
    
    let hasVisibleChildren = false;

    sorted.forEach(node => {
      const cleanName = node.name.replace(/^\d+\.\s*/, '').replace('.md', '');
      const isMatch = cleanName.toLowerCase().includes(filter.toLowerCase());

      if (node.type === 'folder') {
        const div = document.createElement('div');
        div.className = 'folder-item';
        const displayName = cleanName.split(' / ').map(s => s.replace(/^\d+\.\s*/, '')).join(' / ');
        div.innerHTML = `<div class="folder-label">${displayName}</div><div class="folder-content"></div>`;
        
        const $content = div.querySelector('.folder-content');
        const childVisible = renderTree(node.children, $content, [...path, displayName], filter);
        
        if (childVisible || isMatch) {
          div.querySelector('.folder-label').addEventListener('click', () => {
            if (isLocked) return;
            div.classList.toggle('open');
          });
          if (filter) div.classList.add('open');
          container.appendChild(div);
          hasVisibleChildren = true;
        }
      } else {
        if (!filter || isMatch) {
          const btn = document.createElement('button');
          btn.className = 'file-link';
          btn.innerHTML = `<span class="bullet">▶</span> ${cleanName}`;
          btn.addEventListener('click', () => {
            if (isLocked) return;
            document.querySelectorAll('.file-link').forEach(l => l.classList.remove('active'));
            btn.classList.add('active');
            if ($breadcrumbs) $breadcrumbs.textContent = `SYSTEM / ${[...path, cleanName].join(' / ').toUpperCase()}`;
            
            if (window.innerWidth <= 768 && $sidebar.classList.contains('open')) {
              $sidebar.classList.remove('open');
              if ($mobileToggle) $mobileToggle.classList.remove('active');
              const $appContainer = document.getElementById('app');
              if ($appContainer) $appContainer.classList.remove('sidebar-open');
              document.body.style.overflow = '';
            }
            openDocument(node, cleanName);
          });
          container.appendChild(btn);
          hasVisibleChildren = true;
        }
      }
    });
    return hasVisibleChildren;
  }

  function setupSearch() {
    if (!$searchInput) return;
    $searchInput.addEventListener('input', (e) => {
      const val = e.target.value.trim();
      renderTree(treeData, $navTree, [], val);
    });
  }

  async function openDocument(node, title) {
    if (currentPath === node.path) return;
    const triggeredFromScroll = isScrolledPastMid;
    currentPath = node.path;
    if ($contentScroll) $contentScroll.classList.add('switching');
    logSystem(`Decrypting stream: ${title}...`);

    cleanupEffects();

    try {
      const res = await fetch(`https://raw.githubusercontent.com/${GITHUB_CONFIG.user}/${GITHUB_CONFIG.repo}/${GITHUB_CONFIG.branch}/${encodeURIComponent(node.path)}`);
      const text = await res.text();
      const { meta, body, footer } = parseFullDocument(text);
      
      const security = String(meta['보안등급'] || '');
      const docIds = Array.isArray(meta['문서번호']) ? meta['문서번호'].map(String) : [String(meta['문서번호'] || '')];
      const isTargetDoc = docIds.some(id => id.includes('의료-6302-20XX-00001'));

      if (triggeredFromScroll && isTargetDoc) {
        finalizeRender(meta, body, footer, title);
        startResocializationSequence();
        return;
      }
      
      if (security.includes('소급말소')) {
        logSystem("RESTRICTED_NODE_DETECTED", "warn");
        if ($securityModal) {
          $securityModal.classList.remove('hidden');
          const bodyContent = document.getElementById('modal-body-content');
          if (bodyContent) bodyContent.textContent = "경고: 본 문서는 [소급말소-00] 등급의 기밀 사항입니다. 열람 시 모든 인과관계 데이터가 실시간 추적 대상이 됩니다.";
          
          document.getElementById('modal-confirm').onclick = () => {
            $securityModal.classList.add('hidden');
            finalizeRender(meta, body, footer, title);
          };
          document.getElementById('modal-cancel').onclick = () => {
            $securityModal.classList.add('hidden');
            $contentScroll.classList.remove('switching');
            currentPath = null;
            logSystem("Access denied by operator.", "err");
          };
          return;
        }
      }

      finalizeRender(meta, body, footer, title);
    } catch (e) {
      logSystem("Decryption failed.", "err");
      $contentScroll.classList.remove('switching');
    }
  }

  function finalizeRender(meta, body, footer, title) {
    updateAtmosphere(meta['보안등급'] || '');
    renderContent(meta, body, footer, title);
    if ($contentScroll) $contentScroll.classList.remove('switching');
  }

  function parseFullDocument(raw) {
    const clean = raw.trim();
    let meta = {}, body = raw, footer = null;
    
    if (clean.startsWith('---')) {
      const parts = clean.split('---');
      if (parts.length >= 3) {
        const yamlStr = parts[1].trim();
        body = parts.slice(2).join('---').trim();
        const lines = yamlStr.split('\n');
        let lastKey = null;
        lines.forEach(line => {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('#')) return;
          if (trimmed.startsWith('-')) {
            if (lastKey) {
              if (!Array.isArray(meta[lastKey])) meta[lastKey] = [];
              meta[lastKey].push(trimmed.substring(1).trim().replace(/^["']|["']$/g, ''));
            }
          } else {
            const splitIdx = line.indexOf(':');
            if (splitIdx !== -1) {
              const k = line.substring(0, splitIdx).trim();
              let v = line.substring(splitIdx + 1).trim().replace(/^["']|["']$/g, '');
              if (v === "" || v === "[]") meta[k] = [];
              else if (v.startsWith('[') && v.endsWith(']')) meta[k] = v.substring(1, v.length - 1).split(',').map(s => s.trim().replace(/^["']|["']$/g, ''));
              else if (v.includes(',') && !v.includes('<!--')) meta[k] = v.split(',').map(s => s.trim());
              else meta[k] = v;
              lastKey = k;
            }
          }
        });
      }
    }
    const footerMarker = /\*\*\[시스템 식별 번호:/;
    const match = body.match(footerMarker);
    if (match) {
      footer = body.substring(match.index).trim();
      body = body.substring(0, match.index).trim();
    }
    return { meta, body, footer };
  }

  function renderContent(meta, body, footer, title) {
    if (!$yamlInfo || !$docBody) return;
    let yamlHtml = `<div class="meta-label">ADMIN_IDENTIFICATION_PROTOCOL</div><table class="yaml-table">`;
    ['영문명', '문서번호', '분류번호', '보안등급', '공표일자'].forEach(k => {
      if (meta[k]) {
        let val = meta[k];
        if (k === '분류번호' && Array.isArray(val)) {
          const pub = val.find(v => typeof v === 'string' && !v.startsWith('DUSI') && !v.includes('<!--')) || val[0];
          const dusi = val.find(v => typeof v === 'string' && v.startsWith('DUSI')) || 'HIDDEN';
          val = `<span class="id-with-tooltip" data-dusi="${dusi}">${pub}</span>`;
        } else if (Array.isArray(val)) val = val.join(', ');
        yamlHtml += `<tr><th>${k}</th><td>${val}</td></tr>`;
      }
    });
    $yamlInfo.innerHTML = yamlHtml + `</table>`;

    const allMetaValues = JSON.stringify(meta);
    let warningHtml = "";
    if (allMetaValues.includes('INTERNAL-VOID-ERROR') || body.includes('INTERNAL-VOID-ERROR')) {
      warningHtml = `<div class="void-warning">5분 이상 응시 금지. 망막에 음각 인장이 찍힐 수 있음.</div>`;
      applyVoidEffect();
    }
    setupScrollMonitor();
    $docBody.innerHTML = `<h1>${title}</h1>` + warningHtml + marked.parse(body);
    if (footer && $docFooter) {
      $docFooter.innerHTML = marked.parse(footer);
      $docFooter.classList.remove('hidden');
    } else if ($docFooter) $docFooter.classList.add('hidden');
    if ($docView) $docView.classList.remove('hidden');
    if ($welcomeView) $welcomeView.classList.add('hidden');
    if ($contentScroll) $contentScroll.scrollTop = 0;
  }

  function cleanupEffects() {
    if (voidInterval) clearInterval(voidInterval);
    if (scrambleInterval) clearInterval(scrambleInterval);
    if (resocializationInterval) clearInterval(resocializationInterval);
    voidInterval = null; scrambleInterval = null; resocializationInterval = null;
    gaugeProgress = 0; isLocked = false; isCountdownActive = false;
    document.body.style.pointerEvents = '';
    if ($currentTime) $currentTime.classList.remove('timer-active');
    const overlays = ['void-seal-overlay', 'burn-effect', 'resocialization-gauge-container', 'identification-overlay'];
    overlays.forEach(cls => {
      const el = document.querySelector('.' + cls);
      if (el) el.remove();
    });
    document.body.classList.remove('blur-screen');
    if ($docBody) $docBody.classList.remove('scramble-active');
    if ($contentScroll) $contentScroll.onscroll = null;
  }

  function applyVoidEffect() {
    let timeLeft = 5 * 60;
    isCountdownActive = true;
    if ($currentTime) {
      $currentTime.classList.add('timer-active');
      $currentTime.textContent = "00:05:00";
    }
    voidInterval = setInterval(() => {
      timeLeft--;
      if ($currentTime) {
        const m = Math.floor(timeLeft / 60).toString().padStart(2, '0');
        const s = (timeLeft % 60).toString().padStart(2, '0');
        $currentTime.textContent = `00:${m}:${s}`;
      }
      if (timeLeft <= 0) {
        clearInterval(voidInterval);
        triggerVoidCatastrophe();
      }
    }, 1000);
  }

  async function triggerVoidCatastrophe() {
    isLocked = true;
    document.body.style.pointerEvents = 'none';
    $docBody.classList.add('scramble-active');
    logSystem("CRITICAL_ERROR: RETINAL_ANCHOR_FAILURE", "err");
    scrambleInterval = setInterval(() => scrambleText($docBody), 50);
    await new Promise(r => setTimeout(r, 2000));
    const seal = document.createElement('div');
    seal.className = 'void-seal-overlay';
    seal.innerHTML = `<div class="large-seal">DUSI</div>`;
    document.body.appendChild(seal);
    const burn = document.createElement('div');
    burn.className = 'burn-effect';
    document.body.appendChild(burn);
    setTimeout(() => { seal.classList.add('active'); burn.classList.add('active'); }, 100);
    setTimeout(() => resetWithTransition(), 4000);
  }

  function scrambleText(container) {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?/가나다라마바사아자차카타파하";
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null, false);
    let node;
    while(node = walker.nextNode()) {
      if (Math.random() > 0.7) {
        let text = node.nodeValue;
        let result = "";
        for(let i=0; i<text.length; i++) {
          if (text[i].trim() === "") result += text[i];
          else result += chars[Math.floor(Math.random() * chars.length)];
        }
        node.nodeValue = result;
      }
    }
  }

  function setupScrollMonitor() {
    if (!$contentScroll) return;
    $contentScroll.onscroll = () => {
      const scrollTotal = $contentScroll.scrollHeight - $contentScroll.clientHeight;
      const isPastMid = scrollTotal > 0 && ($contentScroll.scrollTop / scrollTotal) > 0.5;
      if (isPastMid) isScrolledPastMid = true;
    };
  }

  async function startResocializationSequence() {
    isLocked = true;
    document.body.style.pointerEvents = 'none'; 
    const idOverlay = document.createElement('div');
    idOverlay.className = 'identification-overlay';
    idOverlay.innerHTML = `<div class="id-scan-box"><div class="id-scan-line"></div><div style="font-weight:900; margin-bottom:10px;">[SYSTEM] INITIATING BIOMETRIC ANALYSIS...</div><div id="id-log" class="id-log"></div></div>`;
    document.body.appendChild(idOverlay);
    const log = document.getElementById('id-log');
    const steps = ["SCANNING RETINAL PATTERN...", "ANALYZING NEURAL SIGNATURE...", "MATCHING EMPLOYEE DATABASE...", "IDENTITY CONFIRMED: AGENT [REDACTED]", "UNAUTHORIZED ACCESS ATTEMPT DETECTED."];
    for (let step of steps) {
      const entry = document.createElement('div');
      entry.textContent = step;
      log.appendChild(entry);
      await new Promise(r => setTimeout(r, 800));
    }
    await new Promise(r => setTimeout(r, 1000));
    idOverlay.remove();
    const gauge = document.createElement('div');
    gauge.className = 'resocialization-gauge-container';
    const messages = ["CONNECTING_TO_DUSI_CORE...", "PURGING_DISSIDENT_THOUGHTS...", "RECALIBRATING_SENSORY_INPUT...", "ANCHORING_COGNITIVE_SHIELD...", "STABILIZING_MEMORY_INTEGRITY..."];
    gauge.innerHTML = `<div class="gauge-header-area"><span>EMERGENCY_SYSTEM_INTERVENTION</span><span id="gauge-perc">0%</span></div><div class="gauge-content-area"><div class="emergency-banner"><div class="emergency-msg">터미널 이용 요원의 자진 출두가 확인되었다.<br>비인가 정보 접근에 따른 긴급 재사회화를 실시한다.</div></div><div class="resocialization-gauge-bar"><div class="resocialization-gauge-fill" id="gauge-fill" style="width: 0%"></div></div><div class="gauge-footer-info"><span id="gauge-msg">INITIALIZING...</span><span>AUTH: DUSI-NODE-ADMIN</span></div></div>`;
    document.body.appendChild(gauge);
    resocializationInterval = setInterval(() => {
      gaugeProgress += 1;
      const $fill = document.getElementById('gauge-fill');
      const $perc = document.getElementById('gauge-perc');
      const $msg = document.getElementById('gauge-msg');
      if ($fill) $fill.style.width = gaugeProgress + '%';
      if ($perc) $perc.textContent = gaugeProgress + '%';
      if ($msg && gaugeProgress % 20 === 0) $msg.textContent = messages[Math.floor(gaugeProgress / 20) % messages.length];
      if (gaugeProgress >= 100) {
        clearInterval(resocializationInterval);
        document.body.classList.add('blur-screen');
        setTimeout(() => resetWithTransition(), 2000);
      }
    }, 100); 
  }

  async function resetWithTransition() {
    if (!$transitionOverlay) return resetToMain();
    $transitionOverlay.classList.add('active');
    await new Promise(r => setTimeout(r, 1000));
    resetToMain();
    $transitionOverlay.classList.remove('active');
  }

  function resetToMain() {
    cleanupEffects();
    updateAtmosphere('default'); // 테마 리셋 로직 추가
    if ($docView) $docView.classList.add('hidden');
    if ($welcomeView) $welcomeView.classList.remove('hidden');
    if ($breadcrumbs) $breadcrumbs.textContent = "ROOT / WELCOME";
    currentPath = null;
    isScrolledPastMid = false; 
    document.querySelectorAll('.file-link').forEach(l => l.classList.remove('active'));
    if ($contentScroll) $contentScroll.scrollTop = 0;
    renderTree(treeData, $navTree, []); // 검색 결과 초기화 및 트리 재랜더링
    if ($searchInput) $searchInput.value = '';
  }

  function updateAtmosphere(security) {
    document.body.setAttribute('data-security-grade', 'default');
    if ($monitoringBar) $monitoringBar.classList.add('hidden');
    if ($glitchLayer) $glitchLayer.classList.add('hidden');
    const secStr = String(security);
    if (secStr.includes('심의종결')) {
      document.body.setAttribute('data-security-grade', 'secret');
      if ($monitoringBar) { $monitoringBar.classList.remove('hidden'); $monitoringBar.textContent = "SYSTEM_MONITORING_ACTIVE // SECURITY_LEVEL_01"; }
    } else if (secStr.includes('소급말소')) {
      document.body.setAttribute('data-security-grade', 'void');
      if ($monitoringBar) { $monitoringBar.classList.remove('hidden'); $monitoringBar.textContent = "CRITICAL_SECURITY_ALERT // RETROACTIVE_ERASURE_IN_PROGRESS"; }
      if ($glitchLayer) $glitchLayer.classList.remove('hidden');
    }
  }

  function renderDashboard() {
    const list = document.getElementById('unit-status-list');
    if (!list) return;
    const units = ["유지관리(2000)", "야간환경정비(3000)", "유성물류기획(4000)", "바른도시건설(5000)", "미래생명과학(6000)", "가온정밀(7000)", "특수자산분석(8000)"];
    list.innerHTML = '';
    units.forEach(u => {
      const row = document.createElement('div');
      row.className = 'health-row';
      row.innerHTML = `<span>${u}</span><div class="h-bar"><div class="fill" style="width: ${85 + Math.random() * 15}%"></div></div>`;
      list.appendChild(row);
    });
  }

  function startClock() {
    setInterval(() => { 
      if (isCountdownActive) return;
      if($currentTime) $currentTime.textContent = new Date().toTimeString().split(' ')[0]; 
    }, 1000);
  }

  function setupMobile() {
    if (!$mobileToggle || !$sidebar) return;
    const $appContainer = document.getElementById('app');
    const toggleSidebar = (forceClose = false) => {
      if (isLocked) return;
      const isOpen = forceClose ? false : !$sidebar.classList.contains('open');
      $sidebar.classList.toggle('open', isOpen);
      $mobileToggle.classList.toggle('active', isOpen);
      if ($appContainer) $appContainer.classList.toggle('sidebar-open', isOpen);
      if (window.innerWidth <= 768) document.body.style.overflow = isOpen ? 'hidden' : '';
    };
    $mobileToggle.addEventListener('click', (e) => { e.stopPropagation(); toggleSidebar(); });
    document.addEventListener('click', (e) => { if (window.innerWidth <= 768 && $sidebar.classList.contains('open')) { if (!$sidebar.contains(e.target) && !$mobileToggle.contains(e.target)) toggleSidebar(true); } });
    window.addEventListener('resize', () => { if (window.innerWidth > 768) { $sidebar.classList.remove('open'); $mobileToggle.classList.remove('active'); if ($appContainer) $appContainer.classList.remove('sidebar-open'); document.body.style.overflow = ''; } });
  }

  function updateWelcomeStats(count) {
    const $stats = document.getElementById('welcome-stats');
    if (!$stats) return;
    $stats.innerHTML = `<div class="stat-item"><div class="stat-val">${count}</div><div class="stat-label">RECORDS</div></div><div class="stat-item"><div class="stat-val">LIVE</div><div class="stat-label">DATA_NODE</div></div><div class="stat-item"><div class="stat-val">SECURE</div><div class="stat-label">INTEGRITY</div></div>`;
  }

  init();
})();
