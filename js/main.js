import { CHAPTERS, buildChapterTrace } from './dpEngine.js?v=3';
import { SceneManager } from './sceneManager.js?v=3';

const dom = {
  canvasContainer: document.getElementById('canvas-container'),
  tooltip: document.getElementById('hover-tooltip'),
  leftPanel: document.getElementById('left-panel'),
  mobileTabs: Array.from(document.querySelectorAll('.m-tab')),
  tabs: Array.from(document.querySelectorAll('.chapter-tab')),
  eyebrow: document.getElementById('chapter-eyebrow'),
  title: document.getElementById('chapter-title'),
  concept: document.getElementById('chapter-concept'),
  paramLabel: document.getElementById('param-label'),
  paramSlider: document.getElementById('param-n'),
  paramValue: document.getElementById('param-value'),
  stepCounter: document.getElementById('step-counter'),
  stepTag: document.getElementById('step-action-tag'),
  stepFormula: document.getElementById('step-formula'),
  stepExplanation: document.getElementById('step-explanation'),
  complexityPill: document.getElementById('complexity-pill'),
  codeBlock: document.getElementById('code-block'),
  m1Label: document.getElementById('m1-label'),
  m2Label: document.getElementById('m2-label'),
  m3Label: document.getElementById('m3-label'),
  m1Val: document.getElementById('m1-val'),
  m2Val: document.getElementById('m2-val'),
  m3Val: document.getElementById('m3-val'),
  btnFirst: document.getElementById('btn-first'),
  btnPrev: document.getElementById('btn-prev'),
  btnPlay: document.getElementById('btn-play'),
  btnNext: document.getElementById('btn-next'),
  btnLast: document.getElementById('btn-last'),
  timeline: document.getElementById('timeline-slider'),
  speedSlider: document.getElementById('speed-slider'),
  speedVal: document.getElementById('speed-val'),
  btnNextChapter: document.getElementById('btn-next-chapter'),
  btnResetCam: document.getElementById('btn-reset-cam'),
  btnToggleBloom: document.getElementById('btn-toggle-bloom'),
  bloomLabel: document.getElementById('bloom-label'),
  btnThemeToggle: document.getElementById('btn-theme-toggle'),
  btnShortcuts: document.getElementById('btn-shortcuts'),
  shortcutsDialog: document.getElementById('shortcuts-dialog'),
  btnCloseShortcuts: document.getElementById('btn-close-shortcuts'),
  colorSchemeMeta: document.querySelector('meta[name="color-scheme"]'),
};

const state = {
  chapterIdx: 0,
  paramVal: CHAPTERS[0].paramDefault,
  trace: null,
  stepIdx: 0,
  isPlaying: false,
  speed: 1.2,
  playTimer: null,
};

const sceneMgr = new SceneManager(dom.canvasContainer, dom.tooltip);

/* ============================================================================
 * COLOR SCHEME MANAGEMENT (Two-state toggle per modern-web-guidance)
 * ============================================================================ */
const darkMedia = window.matchMedia('(prefers-color-scheme: dark)');

function getStoredScheme() {
  try {
    const val = localStorage.getItem('color-scheme');
    return val === 'light' || val === 'dark' ? val : null;
  } catch {
    return null;
  }
}

function getSystemScheme() {
  return darkMedia.matches ? 'dark' : 'light';
}

function getRenderedScheme() {
  return getStoredScheme() ?? getSystemScheme();
}

function syncThemeToPageAndScene() {
  const stored = getStoredScheme();
  if (dom.colorSchemeMeta) {
    dom.colorSchemeMeta.content = stored ?? 'light dark';
  }
  sceneMgr.setTheme(getRenderedScheme());
}

function toggleColorScheme() {
  const target = getRenderedScheme() === 'dark' ? 'light' : 'dark';
  const system = getSystemScheme();
  try {
    if (target === system) {
      localStorage.removeItem('color-scheme');
    } else {
      localStorage.setItem('color-scheme', target);
    }
  } catch {
    if (dom.colorSchemeMeta) {
      dom.colorSchemeMeta.content = target;
    }
    sceneMgr.setTheme(target);
    return;
  }
  syncThemeToPageAndScene();
}

darkMedia.addEventListener('change', () => {
  if (!getStoredScheme()) {
    sceneMgr.setTheme(getSystemScheme());
  }
});

window.addEventListener('storage', (e) => {
  if (e.key === 'color-scheme') {
    syncThemeToPageAndScene();
  }
});

syncThemeToPageAndScene();

/* ============================================================================
 * EXECUTION TRACE RENDERING
 * ============================================================================ */
function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function renderCodeLines(lines, activeLine) {
  dom.codeBlock.innerHTML = lines
    .map(
      (line, idx) =>
        `<div class="code-line${idx === activeLine ? ' active' : ''}"><span class="ln">${
          idx + 1
        }</span><span>${escapeHtml(line)}</span></div>`
    )
    .join('');
}

function loadChapter(idx, customParam = null) {
  stopPlayback();
  state.chapterIdx = idx;
  const chap = CHAPTERS[idx];
  state.paramVal = customParam !== null ? customParam : chap.paramDefault;

  dom.tabs.forEach((btn, i) => {
    const isAct = i === idx;
    btn.classList.toggle('active', isAct);
    if (isAct) btn.setAttribute('aria-current', 'step');
    else btn.removeAttribute('aria-current');
    if (isAct && window.innerWidth <= 768) {
      btn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  });

  dom.eyebrow.textContent = chap.eyebrow;
  dom.title.textContent = chap.title;
  dom.concept.innerHTML = chap.concept;
  dom.complexityPill.textContent = chap.complexity;

  dom.paramLabel.innerHTML = chap.paramLabel;
  dom.paramSlider.min = chap.paramMin;
  dom.paramSlider.max = chap.paramMax;
  dom.paramSlider.value = state.paramVal;
  dom.paramValue.textContent = state.paramVal;

  dom.m1Label.textContent = chap.metricsLabels[0];
  dom.m2Label.textContent = chap.metricsLabels[1];
  dom.m3Label.textContent = chap.metricsLabels[2];

  dom.btnNextChapter.textContent =
    idx < CHAPTERS.length - 1 ? `Chapter ${idx + 2} →` : 'Restart Ch. 1 ↺';

  state.trace = buildChapterTrace(idx, state.paramVal);
  sceneMgr.loadTrace(state.trace);

  dom.timeline.max = Math.max(0, state.trace.steps.length - 1);
  goToStep(0);
}

function goToStep(stepIdx) {
  if (!state.trace) return;
  const maxStep = state.trace.steps.length - 1;
  state.stepIdx = Math.max(0, Math.min(maxStep, stepIdx));

  const chap = CHAPTERS[state.chapterIdx];
  const step = state.trace.steps[state.stepIdx];

  dom.timeline.value = state.stepIdx;
  dom.stepCounter.textContent = `Step ${state.stepIdx} / ${maxStep}`;

  const tagPrefix =
    step.tagType === 'cache'
      ? '★ '
      : step.tagType === 'redundant'
        ? '× '
        : step.tagType === 'done'
          ? '✓ '
          : '● ';
  dom.stepTag.textContent = `${tagPrefix}${step.tag}`;
  dom.stepTag.className = 'step-tag';
  if (step.tagType === 'cache') dom.stepTag.classList.add('tag-cache');
  else if (step.tagType === 'redundant') dom.stepTag.classList.add('tag-redundant');
  else if (step.tagType === 'done') dom.stepTag.classList.add('tag-done');

  dom.stepFormula.textContent = step.formula;
  dom.stepExplanation.textContent = step.explanation;

  renderCodeLines(chap.code, step.codeLine);

  dom.m1Val.textContent = step.metrics[0];
  dom.m2Val.textContent = step.metrics[1];
  dom.m3Val.textContent = step.metrics[2];

  sceneMgr.applyStep(state.stepIdx);

  if (state.stepIdx >= maxStep && state.isPlaying) {
    stopPlayback();
  }
}

function startPlayback() {
  if (!state.trace) return;
  if (state.stepIdx >= state.trace.steps.length - 1) {
    goToStep(0);
  }
  state.isPlaying = true;
  dom.btnPlay.innerHTML = '&#9208; Pause';
  scheduleTick();
}

function stopPlayback() {
  state.isPlaying = false;
  dom.btnPlay.innerHTML = '&#9654; Play';
  if (state.playTimer) {
    clearTimeout(state.playTimer);
    state.playTimer = null;
  }
}

function scheduleTick() {
  if (!state.isPlaying) return;
  const intervalMs = Math.round(950 / state.speed);
  state.playTimer = setTimeout(() => {
    if (!state.isPlaying) return;
    if (state.stepIdx < state.trace.steps.length - 1) {
      goToStep(state.stepIdx + 1);
      scheduleTick();
    } else {
      stopPlayback();
    }
  }, intervalMs);
}

/* ============================================================================
 * EVENT LISTENERS
 * ============================================================================ */
dom.tabs.forEach((btn) => {
  btn.addEventListener('click', () => {
    const idx = parseInt(btn.dataset.chapter, 10);
    loadChapter(idx);
  });
});

dom.mobileTabs.forEach((btn) => {
  btn.addEventListener('click', () => {
    const mtab = btn.dataset.mtab;
    dom.leftPanel.dataset.mobileTab = mtab;
    dom.mobileTabs.forEach((b) => {
      const active = b === btn;
      b.classList.toggle('active', active);
      b.setAttribute('aria-selected', String(active));
    });
    sceneMgr.setMobileSheetCollapsed(mtab === 'hide');
  });
});

dom.paramSlider.addEventListener('input', () => {
  const v = parseInt(dom.paramSlider.value, 10);
  dom.paramValue.textContent = v;
  loadChapter(state.chapterIdx, v);
});

dom.btnFirst.addEventListener('click', () => {
  stopPlayback();
  goToStep(0);
});

dom.btnPrev.addEventListener('click', () => {
  stopPlayback();
  goToStep(state.stepIdx - 1);
});

dom.btnPlay.addEventListener('click', () => {
  if (state.isPlaying) stopPlayback();
  else startPlayback();
});

dom.btnNext.addEventListener('click', () => {
  stopPlayback();
  goToStep(state.stepIdx + 1);
});

dom.btnLast.addEventListener('click', () => {
  stopPlayback();
  goToStep(state.trace.steps.length - 1);
});

dom.timeline.addEventListener('input', () => {
  stopPlayback();
  goToStep(parseInt(dom.timeline.value, 10));
});

dom.speedSlider.addEventListener('input', () => {
  state.speed = parseFloat(dom.speedSlider.value);
  dom.speedVal.textContent = `${state.speed.toFixed(1)}x`;
});

dom.btnNextChapter.addEventListener('click', () => {
  const next = (state.chapterIdx + 1) % CHAPTERS.length;
  loadChapter(next);
});

dom.btnResetCam.addEventListener('click', () => {
  sceneMgr.resetCamera();
});

dom.btnToggleBloom.addEventListener('click', () => {
  const on = sceneMgr.toggleBloom();
  dom.btnToggleBloom.classList.toggle('active', on);
  dom.btnToggleBloom.setAttribute('aria-pressed', String(on));
  if (dom.bloomLabel) {
    dom.bloomLabel.textContent = on ? 'Bloom' : 'Bloom Off';
  }
});

dom.btnThemeToggle.addEventListener('click', toggleColorScheme);

dom.btnShortcuts.addEventListener('click', () => {
  if (!dom.shortcutsDialog.open) {
    dom.shortcutsDialog.showModal();
  }
});

dom.btnCloseShortcuts.addEventListener('click', () => {
  dom.shortcutsDialog.close();
});

dom.shortcutsDialog.addEventListener('click', (e) => {
  if (e.target === dom.shortcutsDialog) {
    dom.shortcutsDialog.close();
  }
});

window.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT') return;
  if (dom.shortcutsDialog.open) return;

  if (e.code === 'Space') {
    e.preventDefault();
    if (state.isPlaying) stopPlayback();
    else startPlayback();
  } else if (e.code === 'ArrowRight') {
    e.preventDefault();
    stopPlayback();
    goToStep(state.stepIdx + 1);
  } else if (e.code === 'ArrowLeft') {
    e.preventDefault();
    stopPlayback();
    goToStep(state.stepIdx - 1);
  } else if (e.code === 'Home') {
    stopPlayback();
    goToStep(0);
  } else if (e.code === 'End') {
    stopPlayback();
    goToStep(state.trace.steps.length - 1);
  } else if (e.key === 'r' || e.key === 'R') {
    sceneMgr.resetCamera();
  } else if (e.key === '?') {
    dom.shortcutsDialog.showModal();
  } else if (e.key >= '1' && e.key <= '6') {
    loadChapter(parseInt(e.key, 10) - 1);
  }
});

// Initialize Chapter 1
loadChapter(0);
