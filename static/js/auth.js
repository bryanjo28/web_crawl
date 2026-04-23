window.AppAuth = (() => {
  const THEME_KEY = 'crawl_theme_preference';

  function getPreferredTheme() {
    const savedTheme = window.localStorage.getItem(THEME_KEY);
    if (savedTheme === 'dark' || savedTheme === 'light') {
      return savedTheme;
    }

    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function updateThemeToggleLabel(theme = getPreferredTheme()) {
    const toggleBtn = document.getElementById('themeToggleBtn');
    if (!toggleBtn) return;

    const icon = toggleBtn.querySelector('i');
    const label = toggleBtn.querySelector('span');
    const isDark = theme === 'dark';

    if (icon) {
      icon.className = isDark ? 'fa-regular fa-sun' : 'fa-regular fa-moon';
    }

    if (label) {
      label.textContent = isDark ? 'Light Mode' : 'Dark Mode';
    }
  }

  function applyTheme(theme) {
    const normalizedTheme = theme === 'dark' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', normalizedTheme);
    document.body?.setAttribute('data-theme', normalizedTheme);
    window.localStorage.setItem(THEME_KEY, normalizedTheme);
    updateThemeToggleLabel(normalizedTheme);
  }

  async function authFetch(url, options = {}) {
    const response = await fetch(url, options);

    if (response.status === 401) {
      window.location.href = '/login';
      throw new Error('Unauthorized');
    }

    return response;
  }

  async function getCurrentUser() {
    const response = await authFetch('/api/auth/me');
    const result = await response.json();
    return result.user;
  }

  function markActiveMenu() {
    const menuItems = document.querySelectorAll('.nav-link');
    const currentPath = window.location.pathname;

    menuItems.forEach((item) => {
      const href = item.getAttribute('href');
      if (href === currentPath) {
        item.classList.add('active');
      }
    });
  }

  function bindSidebarToggle() {
    const toggleBtn = document.getElementById('toggleSidebarBtn');
    if (!toggleBtn) return;

    toggleBtn.addEventListener('click', () => {
      const sidebar = document.querySelector('.sidebar');
      const content = document.getElementById('content');

      sidebar?.classList.toggle('collapsed');
      content?.classList.toggle('collapsed');
    });
  }

  function applyRoleVisibility(user) {
    if (user.role === 'admin') return;

    document.querySelectorAll('.nav-item').forEach((item) => {
      const role = item.getAttribute('data-role');
      if (role !== 'shared') {
        item.remove();
      }
    });
  }

  function fillUserCard(user) {
    const nameEl = document.getElementById('sidebarUserName');
    const usernameEl = document.getElementById('sidebarUserUsername');
    const roleEl = document.getElementById('sidebarUserRole');

    if (nameEl) nameEl.textContent = user.fullName || user.name;
    if (usernameEl) usernameEl.textContent = `username: ${user.name}`;
    if (roleEl) roleEl.textContent = user.role;
  }

  function bindLogout() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (!logoutBtn) return;

    logoutBtn.addEventListener('click', async () => {
      logoutBtn.disabled = true;

      try {
        await fetch('/api/auth/logout', { method: 'POST' });
      } finally {
        window.location.href = '/login';
      }
    });
  }

  function bindThemeToggle() {
    const toggleBtn = document.getElementById('themeToggleBtn');
    if (!toggleBtn) return;

    toggleBtn.addEventListener('click', () => {
      const nextTheme = getPreferredTheme() === 'dark' ? 'light' : 'dark';
      applyTheme(nextTheme);
    });
  }

  async function initSidebar(user) {
    const sidebar = document.querySelector('.sidebar');
    if (!sidebar) return;

    const response = await authFetch('/navbar');
    sidebar.innerHTML = await response.text();

    applyRoleVisibility(user);
    fillUserCard(user);
    bindSidebarToggle();
    bindThemeToggle();
    bindLogout();
    markActiveMenu();
    updateThemeToggleLabel();
  }

  async function initPage() {
    applyTheme(getPreferredTheme());
    const user = await getCurrentUser();
    await initSidebar(user);
    return user;
  }

  return {
    initPage,
    authFetch,
    applyTheme,
    getPreferredTheme
  };
})();
