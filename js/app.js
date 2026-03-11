/* ============================================
   DUSI-CORE TACTICAL HUD v5.2
   GitHub Remote Loading & Error Fix
   ============================================ */

(function () {
  'use strict';

  // [설정] 본인의 GitHub 정보로 수정하십시오.
  const GITHUB_CONFIG = {
    user: "uzuLee", // 사용자명
    repo: "DUSI-Database", // 저장소명 (예: 도시야간안전-인프라-공단)
    branch: "docs" // 브랜치명
  };

  let treeData = [];
  let allFiles = [];
  let currentPath = null;

  // DOM Elements
  const $sidePanel = document.getElementById('side-panel');
  const $navTree = document.getElementById('archive-tree');
  const $sidebarOverlay = document.getElementById('sidebar-overlay');
  const $mobileToggle = document.getElementById('mobile-toggle');
  const $breadcrumbs = document.getElementById('nav-breadcrumbs');
  
  const $welcomeView = document.getElementById('welcome-view');
  const $docView = document.getElementById('doc-view');
  const $docBody = document.getElementById('doc-body');
  const $docFooter = document.getElementById('doc-footer');
  const $bootCurtain = document.getElementById('boot-curtain');
  
  const $metaId = document.getElementById('meta-doc-id');
  const $metaTitle = document.getElementById('doc-title-display');
  const $metaTitleEn = document.getElementById('meta-title-en');
  const $metaSecurity = document.getElementById('security-display');
  const $metaDate = document.getElementById('doc-date');
  const $welcomeStats = document.getElementById('welcome-stats');

  async function init() {
    startClock();
    setupMobileEvents();
    
    try {
      const res = await fetch('data/manifest.json');
      if (!res.ok) throw new Error("Manifest Load Failed");
      treeData = await res.json();
      allFiles = flattenFiles(treeData);
      
      renderTree(treeData, $navTree, []);
      updateWelcomeStats();
      
      setTimeout(() => {
        if($bootCurtain) {
          $bootCurtain.classList.add('fade-out');
          setTimeout(() => $bootCurtain.remove(), 800);
        }
      }, 1000);

    } catch (e) {
      console.error('Boot Error:', e);
    }
  }

  function startClock() {
    const $timeBox = document.getElementById('current-time');
    if(!$timeBox) return;
    setInterval(() => {
      const now = new Date();
      $timeBox.textContent = now.toTimeString().split(' ')[0];
    }, 1000);
  }

  function setupMobileEvents() {
    const toggleSidebar = () => {
      $sidePanel.classList.toggle('open');
      $sidebarOverlay.classList.toggle('active');
    };
    if($mobileToggle) $mobileToggle.addEventListener('click', toggleSidebar);
    if($sidebarOverlay) $sidebarOverlay.addEventListener('click', toggleSidebar);
  }

  function flattenFiles(nodes) {
    let files = [];
    for (const node of nodes) {
      if (node.type === 'file') files.push(node);
      else if (node.children) files = files.concat(flattenFiles(node.children));
    }
    return files;
  }

  function renderTree(nodes, container, breadcrumbPath) {
    container.innerHTML = '';
    nodes.forEach(node => {
      const el = document.createElement('div');
      const currentLevelPath = [...breadcrumbPath, node.name.replace(/^\d+\.\s*/, '')];

      if (node.type === 'folder') {
        el.className = 'folder-item';
        el.innerHTML = `<div class="folder-label">${node.name.replace(/^\d+\.\s*/, '')}</div><div class="folder-content"></div>`;
        const label = el.querySelector('.folder-label');
        label.addEventListener('click', () => el.classList.toggle('open'));
        renderTree(node.children || [], el.querySelector('.folder-content'), currentLevelPath);
      } else {
        const btn = document.createElement('button');
        btn.className = 'file-link';
        btn.textContent = node.name.replace(/^\d+\.\s*/, '').replace('.md', '').replace(/_/g, ' ');
        btn.addEventListener('click', () => {
          document.querySelectorAll('.file-link').forEach(l => l.classList.remove('active'));
          btn.classList.add('active');
          updateBreadcrumbs(currentLevelPath);
          openDocument(node);
          if (window.innerWidth <= 768) {
            $sidePanel.classList.remove('open');
            $sidebarOverlay.classList.remove('active');
          }
        });
        el.appendChild(btn);
      }
      container.appendChild(el);
    });
  }

  function updateBreadcrumbs(pathArray) {
    if($breadcrumbs) $breadcrumbs.textContent = `SYSTEM / ${pathArray.join(' / ').toUpperCase()}`;
  }

  function clearDocView() {
    if(!$docView) return;
    $docView.classList.add('hidden');
    if($docBody) $docBody.innerHTML = '';
    if($docFooter) {
      $docFooter.innerHTML = '';
      $docFooter.classList.add('hidden');
    }
    if($metaId) $metaId.textContent = '';
    if($metaTitle) $metaTitle.textContent = 'LOADING...';
    if($metaTitleEn) $metaTitleEn.textContent = '';
    if($metaSecurity) $metaSecurity.textContent = '';
    if($metaDate) $metaDate.textContent = '';
  }

  async function openDocument(node) {
    // node.orig_path를 사용하여 GitHub Raw 경로 생성
    // build.py에서 manifest 생성 시 'orig_path' 속성을 사용함
    if (!node.orig_path) {
        // Flat 모드일 경우 node.path (DUSI-ID) 기반 로컬 로드 시도
        loadLocalDocument(node);
        return;
    }

    clearDocView();
    currentPath = node.orig_path;

    // GitHub Raw URL 생성
    const rawUrl = `https://raw.githubusercontent.com/${GITHUB_CONFIG.user}/${GITHUB_CONFIG.repo}/${GITHUB_CONFIG.branch}/${encodeURIComponent(node.orig_path)}`;

    try {
      const res = await fetch(rawUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const rawText = await res.text();
      
      const { meta, body } = parseFrontmatter(rawText);
      renderDoc(meta, body, node);
    } catch (e) {
      console.error('Remote Fetch Failed:', e);
      // 실패 시 로컬 data/vault 로드 시도 (Fallback)
      loadLocalDocument(node);
    }
  }

  async function loadLocalDocument(node) {
    const localUrl = `data/vault/${encodeURIComponent(node.path)}.md`;
    try {
      const res = await fetch(localUrl);
      const rawText = await res.text();
      const { meta, body } = parseFrontmatter(rawText);
      renderDoc(meta, body, node);
    } catch (e) {
      if($docBody) $docBody.innerHTML = `<div style="color:#ff0055; padding:2rem; border:1px solid #ff0055;">[ERROR] DATA_LINK_BROKEN<br>ID: ${node.path}</div>`;
    }
  }

  function parseFrontmatter(raw) {
    const clean = raw.trim();
    if (!clean.startsWith('---')) return { meta: {}, body: clean };
    const parts = clean.split('---');
    const yaml = parts[1].trim();
    const body = parts.slice(2).join('---').trim();
    const meta = {};
    yaml.split('\n').forEach(line => {
      const colon = line.indexOf(':');
      if (colon !== -1) {
        const k = line.substring(0, colon).trim();
        const v = line.substring(colon + 1).trim().replace(/^["']|["']$/g, '');
        meta[k] = v;
      }
    });
    return { meta, body };
  }

  function renderDoc(meta, body, node) {
    if($metaId) $metaId.textContent = meta['문서번호'] || node.meta?.docId || 'INTERNAL-REF';
    if($metaTitle) $metaTitle.textContent = node.name.replace(/^\d+\.\s*/, '').replace('.md', '').replace(/_/g, ' ');
    if($metaTitleEn) $metaTitleEn.textContent = meta['영문명'] || 'UNKNOWN_ASSET_DATA';
    if($metaDate) $metaDate.textContent = meta['공표일자'] || '20XX. XX. XX.';
    
    const sec = meta['보안등급'] || 'UNCLASSIFIED';
    if($metaSecurity) {
      $metaSecurity.textContent = sec.replace(/[\[\]]/g, '').toUpperCase();
      $metaSecurity.className = 'security-badge ' + (
        sec.includes('소급말소') ? 'sec-소급말소' :
        sec.includes('심의종결') ? 'sec-심의종결' :
        sec.includes('결재보류') ? 'sec-결재보류' : 'sec-대외비'
      );
    }

    const splitIdx = body.indexOf('**[DUSI');
    let main = body;
    let footer = null;
    if (splitIdx !== -1) {
      main = body.substring(0, splitIdx);
      footer = body.substring(splitIdx);
    }

    if($docBody) $docBody.innerHTML = marked.parse(main);
    
    if (footer && $docFooter) {
      $docFooter.innerHTML = marked.parse(footer);
      $docFooter.classList.remove('hidden');
    }

    if($docView) $docView.classList.remove('hidden');
    if($welcomeView) $welcomeView.classList.add('hidden');
    const viewport = document.querySelector('.content-area');
    if(viewport) viewport.scrollTop = 0;
  }

  function updateWelcomeStats() {
    if(!$welcomeStats) return;
    const orgs = new Set(allFiles.map(f => f.path.split('-')[1]));
    $welcomeStats.innerHTML = `
      <div style="font-family:monospace; font-size:0.8rem; color:#00e5ff; letter-spacing:0.1em;">
        RECORDS: ${allFiles.length} | UNITS: ${orgs.size} | UPTIME: 99.9%
      </div>
    `;
  }

  init();
})();
