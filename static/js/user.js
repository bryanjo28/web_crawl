document.addEventListener('DOMContentLoaded', async function () {
  const currentUser = await window.AppAuth.initPage();
  const PAGE_SIZE = 10;

  const userModal = new bootstrap.Modal(document.getElementById('userModal'));
  const deleteModal = new bootstrap.Modal(document.getElementById('deleteUserModal'));

  const searchInput = document.getElementById('search');
  const statusFilter = document.getElementById('status');
  const tbody = document.querySelector('table tbody');
  const successAlert = document.getElementById('successAlert');
  const errorAlert = document.getElementById('errorAlert');
  const successMessage = document.getElementById('successMessage');
  const errorMessage = document.getElementById('errorMessage');
  const paginationInfo = document.getElementById('pagination-info');
  const prevPageButton = document.getElementById('prev-page');
  const nextPageButton = document.getElementById('next-page');

  let allUsers = [];
  let deleteTarget = null;
  let editTarget = null;
  let currentPage = 1;
  const DEFAULT_USER_PASSWORD = 'bca123';

  function formatDate(value) {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleString('id-ID');
  }

  function showAlert(type, message) {
    if (type === 'success') {
      successMessage.textContent = message;
      successAlert.style.display = 'block';
      errorAlert.style.display = 'none';
    } else {
      errorMessage.textContent = message;
      errorAlert.style.display = 'block';
      successAlert.style.display = 'none';
    }

    setTimeout(() => {
      successAlert.style.display = 'none';
      errorAlert.style.display = 'none';
    }, 2500);
  }

  function getFilteredUsers() {
    const keyword = searchInput.value.trim().toLowerCase();
    const status = statusFilter.value;

    return allUsers.filter((user) => {
      const matchesKeyword =
        !keyword ||
        user.name?.toLowerCase().includes(keyword) ||
        user.fullName?.toLowerCase().includes(keyword);

      const userStatus = user.isActive ? 'Active' : 'Inactive';
      const matchesStatus = !status || userStatus === status;

      return matchesKeyword && matchesStatus;
    });
  }

  function syncPasswordField() {
    const passwordInput = document.getElementById('userPassword');
    passwordInput.disabled = false;
  }

  function ensurePageWithinRange(totalItems) {
    const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;
    return totalPages;
  }

  function renderUsers() {
    const users = getFilteredUsers();
    const totalPages = ensurePageWithinRange(users.length);
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    const pagedUsers = users.slice(startIndex, startIndex + PAGE_SIZE);
    tbody.innerHTML = '';

    if (!pagedUsers.length) {
      tbody.innerHTML = '<tr><td colspan="10" class="text-center text-muted">Tidak ada data user.</td></tr>';
      paginationInfo.textContent = 'Page 1 of 1';
      prevPageButton.disabled = true;
      nextPageButton.disabled = true;
      return;
    }

    pagedUsers.forEach((user, index) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${startIndex + index + 1}</td>
        <td>${user.name || '-'}</td>
        <td>${user.fullName || '-'}</td>
        <td>${user.isActive ? 'Active' : 'Inactive'}</td>
        <td>${user.role || '-'}</td>
        <td>${user.createdBy || '-'}</td>
        <td>${formatDate(user.createdAt)}</td>
        <td>${user.lastUpdatedBy || '-'}</td>
        <td>${formatDate(user.lastUpdatedAt)}</td>
        <td>
          <button class="btn btn-sm btn-warning me-1 edit-user-btn" data-id="${user._id}">
            <i class="fa fa-pencil"></i>
          </button>
          <button class="btn btn-sm btn-danger delete-user-btn" data-id="${user._id}">
            <i class="fa fa-trash"></i>
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    paginationInfo.textContent = `Page ${currentPage} of ${totalPages}`;
    prevPageButton.disabled = currentPage <= 1;
    nextPageButton.disabled = currentPage >= totalPages;

    document.querySelectorAll('.edit-user-btn').forEach((button) => {
      button.addEventListener('click', () => openEditModal(button.dataset.id));
    });

    document.querySelectorAll('.delete-user-btn').forEach((button) => {
      button.addEventListener('click', () => openDeleteModal(button.dataset.id));
    });
  }

  function resetForm() {
    editTarget = null;
    document.getElementById('userModalTitle').textContent = 'Add User';
    document.getElementById('userId').value = '';
    document.getElementById('userName').value = '';
    document.getElementById('userName').disabled = false;
    document.getElementById('userPassword').value = DEFAULT_USER_PASSWORD;
    document.getElementById('fullName').value = '';
    document.getElementById('role').value = 'user';
    document.getElementById('userStatus').value = 'Active';
    syncPasswordField();
  }

  function openEditModal(id) {
    const user = allUsers.find((item) => item._id === id);
    if (!user) return;

    editTarget = user;
    document.getElementById('userModalTitle').textContent = 'Edit User';
    document.getElementById('userId').value = user._id;
    document.getElementById('userName').value = user.name || '';
    document.getElementById('userName').disabled = true;
    document.getElementById('userPassword').value = user.password || DEFAULT_USER_PASSWORD;
    document.getElementById('fullName').value = user.fullName || '';
    document.getElementById('role').value = user.role || 'user';
    document.getElementById('userStatus').value = user.isActive ? 'Active' : 'Inactive';
    syncPasswordField();
    userModal.show();
  }

  function openDeleteModal(id) {
    const user = allUsers.find((item) => item._id === id);
    if (!user) return;

    deleteTarget = user;
    document.getElementById('deleteUserName').textContent = user.name || '-';
    deleteModal.show();
  }

  async function loadUsers() {
    const response = await window.AppAuth.authFetch('/api/users');
    allUsers = await response.json();
    renderUsers();
  }

  async function saveUser() {
    const userId = document.getElementById('userId').value;
    const payload = {
      name: document.getElementById('userName').value.trim(),
      password: document.getElementById('userPassword').value.trim(),
      fullName: document.getElementById('fullName').value.trim(),
      role: document.getElementById('role').value,
      isActive: document.getElementById('userStatus').value === 'Active'
    };

    if (!payload.name || !payload.fullName || !payload.role || (!userId && !payload.password)) {
      showAlert('error', 'Username, password, full name, dan role wajib diisi.');
      return;
    }

    try {
      const response = await window.AppAuth.authFetch(userId ? `/api/users/${userId}` : '/api/users', {
        method: userId ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || 'Gagal menyimpan user.');
      }

      userModal.hide();
      resetForm();
      await loadUsers();
      showAlert('success', userId ? 'User berhasil diperbarui.' : 'User berhasil ditambahkan.');
    } catch (error) {
      showAlert('error', error.message);
    }
  }

  async function deleteUser() {
    if (!deleteTarget) return;

    try {
      const response = await window.AppAuth.authFetch(`/api/users/${deleteTarget._id}`, {
        method: 'DELETE'
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || 'Gagal menghapus user.');
      }

      if (deleteTarget.name === currentUser.name) {
        throw new Error('Admin tidak bisa menghapus akun yang sedang dipakai login.');
      }

      deleteModal.hide();
      deleteTarget = null;
      await loadUsers();
      showAlert('success', 'User berhasil dihapus.');
    } catch (error) {
      showAlert('error', error.message);
    }
  }

  document.getElementById('openAddModal').addEventListener('click', () => {
    resetForm();
    userModal.show();
  });

  document.getElementById('saveUserBtn').addEventListener('click', saveUser);
  document.getElementById('confirmDeleteUserBtn').addEventListener('click', deleteUser);
  document.getElementById('role').addEventListener('change', syncPasswordField);
  const searchButton = document.getElementById('searchButton');
  if (searchButton) {
    searchButton.addEventListener('click', () => {
      currentPage = 1;
      renderUsers();
    });
  }
  document.querySelector('.resetButton').addEventListener('click', () => {
    searchInput.value = '';
    statusFilter.value = '';
    currentPage = 1;
    renderUsers();
  });
  searchInput.addEventListener('input', () => {
    currentPage = 1;
    renderUsers();
  });
  statusFilter.addEventListener('change', () => {
    currentPage = 1;
    renderUsers();
  });
  prevPageButton.addEventListener('click', () => {
    currentPage -= 1;
    renderUsers();
  });
  nextPageButton.addEventListener('click', () => {
    currentPage += 1;
    renderUsers();
  });

  await loadUsers();
});
