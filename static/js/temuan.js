document.addEventListener('DOMContentLoaded', async function () {
  const currentUser = await window.AppAuth.initPage();
  const PAGE_SIZE = 10;

  const API = '/api/temuan';
  const searchInput = document.getElementById('search');
  const typeFilter = document.getElementById('typeFilter');
  const bankFilter = document.getElementById('bankFilter');
  const resetButton = document.querySelector('.resetButton');
  const addButton = document.getElementById('openAddTemuanModal');
  const uploadButton = document.getElementById('uploadTemuanData');
  const exportButton = document.getElementById('exportTemuan');
  const uploadLoading = document.getElementById('uploadTemuanLoading');
  const tbody = document.querySelector('table tbody');
  const paginationInfo = document.getElementById('pagination-info');
  const prevPageButton = document.getElementById('prev-page');
  const nextPageButton = document.getElementById('next-page');
  const successAlert = document.getElementById('successAlert');
  const successMessage = document.getElementById('successMessage');
  const errorAlert = document.getElementById('errorAlert');
  const errorMessage = document.getElementById('errorMessage');
  const actionHeader = document.getElementById('temuanActionHeader');
  const isAdmin = currentUser.role === 'admin';
  const deleteModal = new bootstrap.Modal(document.getElementById('deleteTemuanModal'));
  const temuanModal = new bootstrap.Modal(document.getElementById('temuanModal'));
  const uploadModal = new bootstrap.Modal(document.getElementById('temuanUploadModal'));
  const uploadPreviewModal = new bootstrap.Modal(document.getElementById('temuanUploadPreviewModal'));

  let allTemuan = [];
  let deleteTarget = null;
  let currentPage = 1;
  let parsedUploadRows = [];

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

  function getSpreadsheetValue(row, ...keys) {
    for (const key of keys) {
      const value = row?.[key];
      if (value !== undefined && value !== null && value !== '') {
        return value;
      }
    }

    return '';
  }

  function mapUploadRow(row) {
    return {
      judolSite: String(getSpreadsheetValue(row, 'Judol Site', 'JudolSite', 'URL')).trim(),
      taskDate: getSpreadsheetValue(row, 'Task Date', 'TaskDate'),
      type: String(getSpreadsheetValue(row, 'Type', 'Jenis')).trim(),
      bankName: String(getSpreadsheetValue(row, 'Bank Name', 'BankName', 'Nama Bank')).trim(),
      identifierNo: String(getSpreadsheetValue(row, 'Identifier No', 'IdentifierNo', 'Nomor')).trim(),
      fileName: String(getSpreadsheetValue(row, 'File Name', 'FileName')).trim(),
      titleSite: String(getSpreadsheetValue(row, 'Title Site', 'TitleSite')).trim()
    };
  }

  function getFilteredTemuan() {
    const keyword = searchInput.value.trim().toLowerCase();
    const selectedType = typeFilter.value.trim().toLowerCase();
    const selectedBank = bankFilter.value.trim().toLowerCase();

    return allTemuan.filter((item) => {
      const matchesKeyword =
        !keyword ||
        [
          item.judolSite,
          item.type,
          item.bankName,
          item.identifierNo,
          item.fileName,
          item.titleSite,
          item.updatedBy
        ].some((value) => String(value || '').toLowerCase().includes(keyword));

      const matchesType = !selectedType || String(item.type || '').toLowerCase() === selectedType;
      const matchesBank = !selectedBank || String(item.bankName || '').toLowerCase().includes(selectedBank);

      return matchesKeyword && matchesType && matchesBank;
    });
  }

  function ensurePageWithinRange(totalItems) {
    const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;
    return totalPages;
  }

  function renderTemuan() {
    const rows = getFilteredTemuan();
    const totalPages = ensurePageWithinRange(rows.length);
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    const pagedRows = rows.slice(startIndex, startIndex + PAGE_SIZE);
    tbody.innerHTML = '';

    if (!pagedRows.length) {
      tbody.innerHTML = `<tr><td colspan="${isAdmin ? 11 : 10}" class="text-center text-muted">Tidak ada data temuan.</td></tr>`;
      paginationInfo.textContent = 'Page 1 of 1';
      prevPageButton.disabled = true;
      nextPageButton.disabled = true;
      return;
    }

    pagedRows.forEach((item, index) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${startIndex + index + 1}</td>
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

    paginationInfo.textContent = `Page ${currentPage} of ${totalPages}`;
    prevPageButton.disabled = currentPage <= 1;
    nextPageButton.disabled = currentPage >= totalPages;
  }

  function renderUploadPreview() {
    const previewBody = document.getElementById('temuanUploadPreviewBody');
    previewBody.innerHTML = '';

    if (!parsedUploadRows.length) {
      previewBody.innerHTML = '<tr><td colspan="8" class="text-center text-muted">Belum ada data upload temuan.</td></tr>';
      return;
    }

    parsedUploadRows.forEach((row, index) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${index + 1}</td>
        <td>${escapeHtml(row.judolSite || '-')}</td>
        <td>${escapeHtml(row.taskDate || '-')}</td>
        <td>${escapeHtml(row.type || '-')}</td>
        <td>${escapeHtml(row.bankName || '-')}</td>
        <td>${escapeHtml(row.identifierNo || '-')}</td>
        <td>${escapeHtml(row.fileName || '-')}</td>
        <td>${escapeHtml(row.titleSite || '-')}</td>
      `;
      previewBody.appendChild(tr);
    });
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

  async function previewUploadFile() {
    const fileInput = document.getElementById('temuanUploadFile');
    const file = fileInput.files[0];

    if (!file) {
      showError('Pilih file Excel terlebih dahulu.');
      return;
    }

    const extension = file.name.split('.').pop().toLowerCase();
    if (!['xlsx', 'xls', 'csv'].includes(extension)) {
      showError('Format file harus .xlsx, .xls, atau .csv.');
      return;
    }

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonRows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

    parsedUploadRows = jsonRows.map(mapUploadRow).filter((row) =>
      Object.values(row).some((value) => String(value ?? '').trim() !== '')
    );

    if (!parsedUploadRows.length) {
      showError('Data Excel kosong atau header tidak sesuai.');
      return;
    }

    renderUploadPreview();
    uploadModal.hide();
    uploadPreviewModal.show();
  }

  async function submitUpload() {
    if (!parsedUploadRows.length) {
      showError('Tidak ada data upload temuan untuk dikirim.');
      return;
    }

    uploadLoading.style.display = 'inline-block';

    try {
      const response = await window.AppAuth.authFetch(`${API}/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          items: parsedUploadRows
        })
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || 'Gagal upload data temuan.');
      }

      uploadPreviewModal.hide();
      document.getElementById('temuanUploadFile').value = '';
      parsedUploadRows = [];
      await loadTemuan();
      showSuccess(result.message || 'Upload temuan berhasil.');
    } catch (error) {
      showError(error.message);
    } finally {
      uploadLoading.style.display = 'none';
    }
  }

  async function exportTemuan() {
    try {
      const params = new URLSearchParams();
      if (searchInput.value.trim()) params.set('search', searchInput.value.trim());
      if (typeFilter.value.trim()) params.set('type', typeFilter.value.trim());
      if (bankFilter.value.trim()) params.set('bankName', bankFilter.value.trim());

      const response = await window.AppAuth.authFetch(`${API}/download?${params.toString()}`);
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.message || 'Gagal download data temuan.');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      const fileName = `temuan_${new Date().toISOString().slice(0, 10)}.xlsx`;

      anchor.href = url;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      showError(error.message);
    }
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

  searchInput.addEventListener('input', () => {
    currentPage = 1;
    renderTemuan();
  });

  typeFilter.addEventListener('input', () => {
    currentPage = 1;
    renderTemuan();
  });

  bankFilter.addEventListener('input', () => {
    currentPage = 1;
    renderTemuan();
  });

  document.getElementById('confirmDeleteTemuanBtn').addEventListener('click', deleteTemuan);
  document.getElementById('saveTemuanBtn').addEventListener('click', saveTemuan);
  document.getElementById('previewTemuanUploadBtn').addEventListener('click', previewUploadFile);
  document.getElementById('confirmTemuanUploadBtn').addEventListener('click', submitUpload);

  resetButton.addEventListener('click', () => {
    searchInput.value = '';
    typeFilter.value = '';
    bankFilter.value = '';
    currentPage = 1;
    renderTemuan();
  });

  prevPageButton.addEventListener('click', () => {
    currentPage -= 1;
    renderTemuan();
  });

  nextPageButton.addEventListener('click', () => {
    currentPage += 1;
    renderTemuan();
  });

  addButton.addEventListener('click', () => {
    resetForm();
    temuanModal.show();
  });

  uploadButton.addEventListener('click', () => {
    document.getElementById('temuanUploadFile').value = '';
    parsedUploadRows = [];
    uploadModal.show();
  });

  if (isAdmin) {
    actionHeader.style.display = '';
    exportButton.addEventListener('click', exportTemuan);
  } else {
    exportButton.style.display = 'none';
  }

  try {
    await loadTemuan();
  } catch (error) {
    showError(error.message);
  }
});
