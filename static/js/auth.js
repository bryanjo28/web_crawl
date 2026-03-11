window.AppAuth = (() => {
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

    document.querySelectorAll('[data-role="admin"]').forEach((item) => {
      item.remove();
    });
  }

  function fillUserCard(user) {
    const nameEl = document.getElementById('sidebarUserName');
    const roleEl = document.getElementById('sidebarUserRole');

    if (nameEl) nameEl.textContent = user.fullName || user.name;
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

  async function initSidebar(user) {
    const sidebar = document.querySelector('.sidebar');
    if (!sidebar) return;

    const response = await authFetch('/navbar');
    sidebar.innerHTML = await response.text();

    applyRoleVisibility(user);
    fillUserCard(user);
    bindSidebarToggle();
    bindLogout();
    markActiveMenu();
  }

  async function initPage() {
    const user = await getCurrentUser();
    await initSidebar(user);
    return user;
  }

  return {
    initPage,
    authFetch
  };
})();
