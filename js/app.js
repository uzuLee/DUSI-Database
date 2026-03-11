/* ============================================
   DUSI-NET BUREAUCRATIC ARCHIVE v9.4
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

  // --- System Log ---
  function logSystem(msg, type = 'info') {
    if (!$sysLog) return;
    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    entry.textContent = `[${new Date().toTimeString().split(' ')[0]}] ${msg}`;
    $sysLog.appendChild(entry);
    $sysLog.scrollTop = $sysLog.scrollHeight;
  }

  // --- Boot Sequence ---
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
    renderDashboard();
    await runAuthSequence();
    
    try {
      const branchRes = await fetch(`https://api.github.com/repos/${GITHUB_CONFIG.user}/${GITHUB_CONFIG.repo}/branches/${GITHUB_CONFIG.branch}`);
      const branchData = await branchRes.json();
      const treeRes = await fetch(`https://api.github.com/repos/${GITHUB_CONFIG.user}/${GITHUB_CONFIG.repo}/git/trees/${branchData.commit.commit.tree.sha}?recursive=1`);
      const treeRaw = await treeRes.json();

      treeData = buildHierarchy(treeRaw.tree);
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

  function renderTree(nodes, container, path) {
    if (!container) return;
    container.innerHTML = '';
    nodes.sort((a, b) => (a.type === 'file') - (b.type === 'file')).forEach(node => {
      const div = document.createElement('div');
      const cleanName = node.name.replace(/^\d+\.\s*/, '').replace('.md', '');
      if (node.type === 'folder') {
        div.className = 'folder-item';
        div.innerHTML = `<div class="folder-label">${cleanName}</div><div class="folder-content"></div>`;
        div.querySelector('.folder-label').addEventListener('click', () => div.classList.toggle('open'));
        renderTree(node.children, div.querySelector('.folder-content'), [...path, cleanName]);
      } else {
        const btn = document.createElement('button');
        btn.className = 'file-link';
        btn.innerHTML = `<span class="bullet">▶</span> ${cleanName}`;
        btn.addEventListener('click', () => {
          document.querySelectorAll('.file-link').forEach(l => l.classList.remove('active'));
          btn.classList.add('active');
          if ($breadcrumbs) $breadcrumbs.textContent = `SYSTEM / ${[...path, cleanName].join(' / ').toUpperCase()}`;
          
          // 모바일에서 파일 클릭 시 사이드바 닫기
          if (window.innerWidth <= 768 && $sidebar.classList.contains('open')) {
            $sidebar.classList.remove('open');
            if ($mobileToggle) $mobileToggle.classList.remove('active');
            const $appContainer = document.getElementById('app');
            if ($appContainer) $appContainer.classList.remove('sidebar-open');
            document.body.style.overflow = '';
          }
          
          openDocument(node, cleanName);
        });
        div.appendChild(btn);
      }
      container.appendChild(div);
    });
  }

  async function openDocument(node, title) {
    if (currentPath === node.path) return;
    currentPath = node.path;
    if ($contentScroll) $contentScroll.classList.add('switching');
    logSystem(`Decrypting stream: ${title}...`);

    try {
      const res = await fetch(`https://raw.githubusercontent.com/${GITHUB_CONFIG.user}/${GITHUB_CONFIG.repo}/${GITHUB_CONFIG.branch}/${encodeURIComponent(node.path)}`);
      const text = await res.text();
      const { meta, body, footer } = parseFullDocument(text);
      
      const security = String(meta['보안등급'] || '');
      
      // YAML-BASED SECURITY CHECK
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
            currentPath = null; // Reset current path to allow re-click
            logSystem("Access denied by operator.", "err");
          };
          return; // Wait for modal
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
              
              if (v === "" || v === "[]") {
                meta[k] = [];
              } else if (v.startsWith('[') && v.endsWith(']')) {
                meta[k] = v.substring(1, v.length - 1).split(',').map(s => s.trim().replace(/^["']|["']$/g, ''));
              } else if (v.includes(',') && !v.includes('<!--')) {
                meta[k] = v.split(',').map(s => s.trim());
              } else {
                meta[k] = v;
              }
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
        } else if (Array.isArray(val)) {
          val = val.join(', ');
        }
        yamlHtml += `<tr><th>${k}</th><td>${val}</td></tr>`;
      }
    });
    $yamlInfo.innerHTML = yamlHtml + `</table>`;
    $docBody.innerHTML = `<h1>${title}</h1>` + marked.parse(body);
    
    if (footer && $docFooter) {
      $docFooter.innerHTML = marked.parse(footer);
      $docFooter.classList.remove('hidden');
    } else if ($docFooter) {
      $docFooter.classList.add('hidden');
    }

    if ($docView) $docView.classList.remove('hidden');
    if ($welcomeView) $welcomeView.classList.add('hidden');
    if ($contentScroll) $contentScroll.scrollTop = 0;
  }

  function updateAtmosphere(security) {
    document.body.setAttribute('data-security-grade', 'default');
    if ($monitoringBar) $monitoringBar.classList.add('hidden');
    if ($glitchLayer) $glitchLayer.classList.add('hidden');

    const secStr = String(security);
    if (secStr.includes('심의종결')) {
      document.body.setAttribute('data-security-grade', 'secret');
      if ($monitoringBar) {
        $monitoringBar.classList.remove('hidden');
        $monitoringBar.textContent = "SYSTEM_MONITORING_ACTIVE // SECURITY_LEVEL_01";
      }
    } else if (secStr.includes('소급말소')) {
      document.body.setAttribute('data-security-grade', 'void');
      if ($monitoringBar) {
        $monitoringBar.classList.remove('hidden');
        $monitoringBar.textContent = "CRITICAL_SECURITY_ALERT // RETROACTIVE_ERASURE_IN_PROGRESS";
      }
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
      const $time = document.getElementById('current-time');
      if($time) $time.textContent = new Date().toTimeString().split(' ')[0]; 
    }, 1000);
  }

  function setupMobile() {
    if (!$mobileToggle || !$sidebar) return;

    const $appContainer = document.getElementById('app');

    const toggleSidebar = (forceClose = false) => {
      const isOpen = forceClose ? false : !$sidebar.classList.contains('open');
      
      $sidebar.classList.toggle('open', isOpen);
      $mobileToggle.classList.toggle('active', isOpen);
      if ($appContainer) $appContainer.classList.toggle('sidebar-open', isOpen);
      
      // 모바일에서 사이드바가 열리면 본문 스크롤 방지
      if (window.innerWidth <= 768) {
        document.body.style.overflow = isOpen ? 'hidden' : '';
      }
    };

    $mobileToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleSidebar();
    });

    // 사이드바 외부(오버레이) 클릭 시 닫기
    document.addEventListener('click', (e) => {
      if (window.innerWidth <= 768 && $sidebar.classList.contains('open')) {
        if (!$sidebar.contains(e.target) && !$mobileToggle.contains(e.target)) {
          toggleSidebar(true);
        }
      }
    });

    // 화면 크기 변경 시 스타일 초기화
    window.addEventListener('resize', () => {
      if (window.innerWidth > 768) {
        $sidebar.classList.remove('open');
        $mobileToggle.classList.remove('active');
        if ($appContainer) $appContainer.classList.remove('sidebar-open');
        document.body.style.overflow = '';
      }
    });
  }

  function updateWelcomeStats(count) {
    const $stats = document.getElementById('welcome-stats');
    if (!$stats) return;
    $stats.innerHTML = `
      <div class="stat-item"><div class="stat-val">${count}</div><div class="stat-label">RECORDS</div></div>
      <div class="stat-item"><div class="stat-val">LIVE</div><div class="stat-label">DATA_NODE</div></div>
      <div class="stat-item"><div class="stat-val">SECURE</div><div class="stat-label">INTEGRITY</div></div>
    `;
  }

  init();
})();
