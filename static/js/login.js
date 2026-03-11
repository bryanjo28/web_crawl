document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('loginForm');
  const errorBox = document.getElementById('loginError');
  const submitBtn = document.getElementById('loginSubmit');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const name = document.getElementById('name').value.trim();
    const password = document.getElementById('password').value.trim();

    errorBox.classList.add('d-none');
    errorBox.textContent = '';
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

      window.location.href = result.user?.role === 'admin' ? '/' : '/';
    } catch (error) {
      errorBox.textContent = error.message;
      errorBox.classList.remove('d-none');
    } finally {
      submitBtn.disabled = false;
    }
  });
});
