// 다크 모드 토글. 초기 테마는 각 HTML <head>의 인라인 스크립트가 먼저 적용한다(깜빡임 방지).
const STORAGE_KEY = 'theme';
const root = document.documentElement;
const media = window.matchMedia('(prefers-color-scheme: dark)');

function readStored() {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === 'light' || value === 'dark' ? value : null;
  } catch {
    return null;
  }
}

function writeStored(value) {
  try {
    localStorage.setItem(STORAGE_KEY, value);
  } catch {
    // 저장이 막힌 환경에서도 토글은 동작해야 한다
  }
}

function currentTheme() {
  return root.getAttribute('data-theme') || (media.matches ? 'dark' : 'light');
}

function syncButton(button) {
  const theme = currentTheme();
  button.dataset.mode = theme;
  button.setAttribute('aria-pressed', String(theme === 'dark'));
}

export function initTheme() {
  const button = document.querySelector('.theme-toggle');
  if (!button) return;

  syncButton(button);

  button.addEventListener('click', () => {
    const next = currentTheme() === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    writeStored(next);
    syncButton(button);
  });

  // 저장된 선택이 없을 때는 시스템 설정 변경을 따라간다
  media.addEventListener('change', () => {
    if (!readStored()) {
      root.removeAttribute('data-theme');
      syncButton(button);
    }
  });
}
