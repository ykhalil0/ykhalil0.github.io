(() => {
  const storageKey = 'yk-theme';
  const root = document.documentElement;
  const media = window.matchMedia('(prefers-color-scheme: dark)');

  function getStoredTheme() {
    try {
      const value = window.localStorage.getItem(storageKey);
      return value === 'dark' || value === 'light' ? value : null;
    } catch {
      return null;
    }
  }

  function setStoredTheme(theme) {
    try {
      window.localStorage.setItem(storageKey, theme);
    } catch {
      // Theme preference is optional; ignore storage failures.
    }
  }

  function currentTheme() {
    return getStoredTheme() || (media.matches ? 'dark' : 'light');
  }

  function applyStoredTheme() {
    const storedTheme = getStoredTheme();
    if (storedTheme) {
      root.dataset.theme = storedTheme;
    } else {
      root.removeAttribute('data-theme');
    }
  }

  function updateToggle() {
    const activeTheme = currentTheme();
    document.querySelectorAll('[data-theme-toggle]').forEach((button) => {
      const nextTheme = activeTheme === 'dark' ? 'light' : 'dark';
      button.textContent = nextTheme;
      button.setAttribute('aria-label', `switch to ${nextTheme} mode`);
      button.setAttribute('aria-pressed', String(activeTheme === 'dark'));
    });
  }

  function toggleTheme() {
    const nextTheme = currentTheme() === 'dark' ? 'light' : 'dark';
    root.dataset.theme = nextTheme;
    setStoredTheme(nextTheme);
    updateToggle();
  }

  applyStoredTheme();

  document.addEventListener('DOMContentLoaded', () => {
    updateToggle();
    document.querySelectorAll('[data-theme-toggle]').forEach((button) => {
      button.addEventListener('click', toggleTheme);
    });
  });

  media.addEventListener('change', () => {
    if (!getStoredTheme()) {
      updateToggle();
    }
  });
})();
