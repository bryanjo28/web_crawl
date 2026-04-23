document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('loginForm');
  const forgotForm = document.getElementById('forgotForm');
  const errorBox = document.getElementById('loginError');
  const successBox = document.getElementById('loginSuccess');
  const submitBtn = document.getElementById('loginSubmit');
  const forgotSubmitBtn = document.getElementById('forgotSubmit');
  const modeButtons = document.querySelectorAll('.login-mode-btn');
  const panelTitle = document.getElementById('loginPanelTitle');
  const panelCopy = document.getElementById('loginPanelCopy');
  const loginHint = document.getElementById('loginHint');
  const themeToggle = document.getElementById('loginThemeToggle');
  const THEME_KEY = 'crawl_theme_preference';

  function getPreferredTheme() {
    const savedTheme = window.localStorage.getItem(THEME_KEY);
    if (savedTheme === 'dark' || savedTheme === 'light') {
      return savedTheme;
    }

    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function applyTheme(theme) {
    const normalizedTheme = theme === 'dark' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', normalizedTheme);
    document.body.setAttribute('data-theme', normalizedTheme);
    window.localStorage.setItem(THEME_KEY, normalizedTheme);

    const icon = themeToggle?.querySelector('i');
    const label = themeToggle?.querySelector('span');
    const isDark = normalizedTheme === 'dark';

    if (icon) {
      icon.className = isDark ? 'fa-regular fa-sun' : 'fa-regular fa-moon';
    }

    if (label) {
      label.textContent = isDark ? 'Light' : 'Dark';
    }
  }

  function clearMessages() {
    errorBox.classList.add('d-none');
    errorBox.textContent = '';
    successBox.classList.add('d-none');
    successBox.textContent = '';
  }

  function switchMode(mode) {
    const isForgotMode = mode === 'forgot';

    form.classList.toggle('d-none', isForgotMode);
    forgotForm.classList.toggle('d-none', !isForgotMode);
    panelTitle.textContent = isForgotMode ? 'Forgot password' : 'Masuk ke sistem';
    panelCopy.textContent = isForgotMode
      ? 'Masukkan username yang valid lalu tentukan password baru. Belum ada verifikasi tambahan di tahap ini.'
      : 'Gunakan username dan password sesuai schema user yang sudah Anda siapkan.';
    loginHint.innerHTML = isForgotMode
      ? 'Reset password saat ini hanya memakai validasi <strong>username aktif</strong> sesuai permintaan.'
      : 'Role <strong>admin</strong> bisa kelola user dan distribusi task. Role <strong>user</strong> tetap bisa masuk ke task list.';

    modeButtons.forEach((button) => {
      button.classList.toggle('active', button.dataset.mode === mode);
    });

    clearMessages();
  }

  applyTheme(getPreferredTheme());

  themeToggle?.addEventListener('click', () => {
    const nextTheme = getPreferredTheme() === 'dark' ? 'light' : 'dark';
    applyTheme(nextTheme);
  });

  modeButtons.forEach((button) => {
    button.addEventListener('click', () => switchMode(button.dataset.mode));
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const name = document.getElementById('name').value.trim();
    const password = document.getElementById('password').value.trim();

    clearMessages();
    submitBtn.disabled = true;

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name, password })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Login gagal.');
      }

      window.location.href = result.user?.role === 'admin' ? '/user' : '/task';
    } catch (error) {
      errorBox.textContent = error.message;
      errorBox.classList.remove('d-none');
    } finally {
      submitBtn.disabled = false;
    }
  });

  forgotForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const name = document.getElementById('forgotName').value.trim();
    const password = document.getElementById('forgotPassword').value.trim();
    const confirmPassword = document.getElementById('forgotPasswordConfirm').value.trim();

    clearMessages();

    if (!name || !password || !confirmPassword) {
      errorBox.textContent = 'Username, password baru, dan konfirmasi password wajib diisi.';
      errorBox.classList.remove('d-none');
      return;
    }

    if (password !== confirmPassword) {
      errorBox.textContent = 'Konfirmasi password baru tidak sama.';
      errorBox.classList.remove('d-none');
      return;
    }

    forgotSubmitBtn.disabled = true;

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name, password })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Gagal mengganti password.');
      }

      forgotForm.reset();
      document.getElementById('name').value = name;
      switchMode('login');
      successBox.textContent = result.message || 'Password berhasil diganti.';
      successBox.classList.remove('d-none');
    } catch (error) {
      errorBox.textContent = error.message;
      errorBox.classList.remove('d-none');
    } finally {
      forgotSubmitBtn.disabled = false;
    }
  });
});
