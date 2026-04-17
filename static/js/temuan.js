document.addEventListener('DOMContentLoaded', async function () {
  const currentUser = await window.AppAuth.initPage();

  const API = '/api/temuan';
  const searchInput = document.getElementById('search');
  const resetButton = document.querySelector('.resetButton');
  const addButton = document.getElementById('openAddTemuanModal');
  const exportButton = document.getElementById('exportTemuan');
  const tbody = document.querySelector('table tbody');
  const paginationInfo = document.getElementById('pagination-info');
  const successAlert = document.getElementById('successAlert');
  const successMessage = document.getElementById('successMessage');
  const errorAlert = document.getElementById('errorAlert');
  const errorMessage = document.getElementById('errorMessage');
  const actionHeader = document.getElementById('temuanActionHeader');
  const isAdmin = currentUser.role === 'admin';
  const deleteModal = new bootstrap.Modal(document.getElementById('deleteTemuanModal'));
  const temuanModal = new bootstrap.Modal(document.getElementById('temuanModal'));

  let allTemuan = [];
  let deleteTarget = null;

  function showSuccess(message) {
    successMessage.textContent = message;
    successAlert.style.display = 'block';
    errorAlert.style.display = 'none';

    window.setTimeout(() => {
      successAlert.style.display = 'none';
    }, 2500);
  }

  function showError(message) {
    errorMessage.textContent = message;
    errorAlert.style.display = 'block';
    successAlert.style.display = 'none';
  }

  function hideError() {
    errorAlert.style.display = 'none';
  }

  function formatDate(value) {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleString('id-ID');
  }

  function toDateTimeLocal(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const offset = date.getTimezoneOffset();
    const localDate = new Date(date.getTime() - (offset * 60000));
    return localDate.toISOString().slice(0, 16);
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  function resetForm() {
    document.getElementById('temuanJudolSite').value = '';
    document.getElementById('temuanTaskDate').value = '';
    document.getElementById('temuanType').value = '';
    document.getElementById('temuanBankName').value = '';
    document.getElementById('temuanIdentifierNo').value = '';
    document.getElementById('temuanFileName').value = '';
    document.getElementById('temuanTitleSite').value = '';
  }

  function getFilteredTemuan() {
    const keyword = searchInput.value.trim().toLowerCase();

    return allTemuan.filter((item) => {
      if (!keyword) return true;

      return [
        item.judolSite,
        item.type,
        item.bankName,
        item.identifierNo,
        item.fileName,
        item.titleSite,
        item.updatedBy
      ].some((value) => String(value || '').toLowerCase().includes(keyword));
    });
  }

  function renderTemuan() {
    const rows = getFilteredTemuan();
    tbody.innerHTML = '';

    if (!rows.length) {
      tbody.innerHTML = `<tr><td colspan="${isAdmin ? 11 : 10}" class="text-center text-muted">Tidak ada data temuan.</td></tr>`;
      paginationInfo.textContent = 'Page 1 of 1';
      return;
    }

    rows.forEach((item, index) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${index + 1}</td>
        <td>${escapeHtml(item.judolSite || '-')}</td>
        <td>${formatDate(item.taskDate)}</td>
        <td>${escapeHtml(item.type || '-')}</td>
        <td>${escapeHtml(item.bankName || '-')}</td>
        <td>${escapeHtml(item.identifierNo || '-')}</td>
        <td>${escapeHtml(item.fileName || '-')}</td>
        <td>${escapeHtml(item.titleSite || '-')}</td>
        <td>${escapeHtml(item.updatedBy || '-')}</td>
        <td>${formatDate(item.updatedDate)}</td>
        ${isAdmin ? `
        <td class="text-center">
          <button class="btn btn-sm btn-danger delete-temuan-btn" data-id="${item._id}">
            <i class="fa fa-trash"></i>
          </button>
        </td>` : ''}
      `;
      tbody.appendChild(tr);
    });

    if (isAdmin) {
      document.querySelectorAll('.delete-temuan-btn').forEach((button) => {
        button.addEventListener('click', () => openDeleteModal(button.dataset.id));
      });
    }

    paginationInfo.textContent = 'Page 1 of 1';
  }

  function openDeleteModal(id) {
    const item = allTemuan.find((temuan) => temuan._id === id);
    if (!item) return;

    deleteTarget = item;
    document.getElementById('deleteTemuanName').textContent = item.fileName || item.titleSite || item.judolSite || '-';
    deleteModal.show();
  }

  async function deleteTemuan() {
    if (!deleteTarget) return;

    try {
      const response = await window.AppAuth.authFetch(`${API}/${deleteTarget._id}`, {
        method: 'DELETE'
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Gagal menghapus data temuan.');
      }

      deleteModal.hide();
      deleteTarget = null;
      await loadTemuan();
      showSuccess(result.message || 'Data temuan berhasil dihapus.');
    } catch (error) {
      showError(error.message);
    }
  }

  async function saveTemuan() {
    const payload = {
      judolSite: document.getElementById('temuanJudolSite').value.trim(),
      taskDate: document.getElementById('temuanTaskDate').value || null,
      type: document.getElementById('temuanType').value.trim(),
      bankName: document.getElementById('temuanBankName').value.trim(),
      identifierNo: document.getElementById('temuanIdentifierNo').value.trim(),
      fileName: document.getElementById('temuanFileName').value.trim(),
      titleSite: document.getElementById('temuanTitleSite').value.trim()
    };

    if (!payload.judolSite) {
      showError('Judol Site wajib diisi.');
      return;
    }

    try {
      const response = await window.AppAuth.authFetch(API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Gagal menambahkan data temuan.');
      }

      temuanModal.hide();
      resetForm();
      await loadTemuan();
      showSuccess('Data temuan berhasil ditambahkan.');
    } catch (error) {
      showError(error.message);
    }
  }

  function exportTemuan() {
    const rows = getFilteredTemuan().map((item, index) => ({
      No: index + 1,
      JudolSite: item.judolSite || '',
      TaskDate: item.taskDate ? new Date(item.taskDate) : '',
      Type: item.type || '',
      BankName: item.bankName || '',
      IdentifierNo: item.identifierNo || '',
      FileName: item.fileName || '',
      TitleSite: item.titleSite || '',
      UpdatedBy: item.updatedBy || '',
      UpdatedDate: item.updatedDate ? new Date(item.updatedDate) : ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Temuan');
    XLSX.writeFile(workbook, `temuan_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  async function loadTemuan() {
    hideError();
    const response = await window.AppAuth.authFetch(API);
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Gagal mengambil data temuan.');
    }

    allTemuan = result;
    renderTemuan();
  }

  searchInput.addEventListener('input', renderTemuan);
  document.getElementById('confirmDeleteTemuanBtn').addEventListener('click', deleteTemuan);
  document.getElementById('saveTemuanBtn').addEventListener('click', saveTemuan);

  resetButton.addEventListener('click', () => {
    searchInput.value = '';
    renderTemuan();
  });

  if (isAdmin) {
    actionHeader.style.display = '';
    addButton.addEventListener('click', () => {
      resetForm();
      temuanModal.show();
    });
    exportButton.addEventListener('click', exportTemuan);
  } else {
    addButton.style.display = 'none';
    exportButton.style.display = 'none';
  }

  try {
    await loadTemuan();
  } catch (error) {
    showError(error.message);
  }
});
