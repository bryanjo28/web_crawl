document.addEventListener('DOMContentLoaded', async function () {
  await window.AppAuth.initPage();

  const API = '/api/sites';
  const PAGE_SIZE = 10;

  const searchInput = document.getElementById('search');
  const statusFilter = document.getElementById('status');
  const searchButton = document.querySelector('.btn.btn-sm.btn-primary');
  const addButton = document.getElementById('openAddModal');
  const exportButton = document.getElementById('exportData');
  const exportLoading = document.getElementById('exportLoading');
  const resetButton = document.querySelector('.resetButton');
  const tbody = document.querySelector('table tbody');
  const paginationInfo = document.getElementById('pagination-info');
  const prevPageButton = document.getElementById('prev-page');
  const nextPageButton = document.getElementById('next-page');
  const successAlert = document.getElementById('successAlert');
  const errorAlert = document.getElementById('errorAlert');
  const successMessage = document.getElementById('successMessage');
  const errorMessage = document.getElementById('errorMessage');

  let allSites = [];
  let currentPage = 1;
  let deleteTarget = null;

  injectModals();

  const siteModal = new bootstrap.Modal(document.getElementById('siteModal'));
  const deleteModal = new bootstrap.Modal(document.getElementById('deleteSiteModal'));

  function injectModals() {
    const modalMarkup = `
      <div class="modal fade" id="siteModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title" id="siteModalTitle">Add Site</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
              <input type="hidden" id="siteId" />
              <div class="mb-3">
                <label for="siteUrl" class="form-label">Asset Site</label>
                <input type="text" class="form-control" id="siteUrl" placeholder="https://example.com" />
              </div>
              <div class="mb-3">
                <label for="siteStatus" class="form-label">Status</label>
                <select class="form-select" id="siteStatus">
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
              <div class="mb-3">
                <label for="siteLastScan" class="form-label">Last Scan Date</label>
                <input type="datetime-local" class="form-control" id="siteLastScan" />
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
              <button type="button" class="btn btn-primary" id="saveSiteBtn">Save</button>
            </div>
          </div>
        </div>
      </div>

      <div class="modal fade" id="deleteSiteModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Delete Site</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
              Hapus site <strong id="deleteSiteName">-</strong>?
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
              <button type="button" class="btn btn-danger" id="confirmDeleteSiteBtn">Delete</button>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalMarkup);
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

    window.setTimeout(() => {
      successAlert.style.display = 'none';
      errorAlert.style.display = 'none';
    }, 2500);
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

  function getFilteredSites() {
    const keyword = searchInput.value.trim().toLowerCase();
    const status = statusFilter.value;

    return allSites.filter((site) => {
      const matchesKeyword =
        !keyword ||
        site.url?.toLowerCase().includes(keyword) ||
        site.lastUpdateBy?.toLowerCase().includes(keyword);

      const siteStatus = site.status ? 'Active' : 'Inactive';
      const matchesStatus = !status || siteStatus === status;

      return matchesKeyword && matchesStatus;
    });
  }

  function ensurePageWithinRange(totalItems) {
    const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;
    return totalPages;
  }

  function renderSites() {
    const sites = getFilteredSites();
    const totalPages = ensurePageWithinRange(sites.length);
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    const pagedSites = sites.slice(startIndex, startIndex + PAGE_SIZE);

    tbody.innerHTML = '';

    if (!pagedSites.length) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">Tidak ada data site.</td></tr>';
    } else {
      pagedSites.forEach((site, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${startIndex + index + 1}</td>
          <td>${site.url || '-'}</td>
          <td>${site.status ? 'Active' : 'Inactive'}</td>
          <td>${formatDate(site.lastScan)}</td>
          <td>${site.lastUpdateBy || '-'}</td>
          <td>${formatDate(site.lastUpdate)}</td>
          <td>
            <button class="btn btn-sm btn-warning me-1 edit-site-btn" data-id="${site._id}">
              <i class="fa fa-pencil"></i>
            </button>
            <button class="btn btn-sm btn-danger delete-site-btn" data-id="${site._id}">
              <i class="fa fa-trash"></i>
            </button>
          </td>
        `;
        tbody.appendChild(tr);
      });
    }

    paginationInfo.textContent = `Page ${totalPages === 0 ? 1 : currentPage} of ${totalPages}`;
    prevPageButton.disabled = currentPage <= 1;
    nextPageButton.disabled = currentPage >= totalPages;

    document.querySelectorAll('.edit-site-btn').forEach((button) => {
      button.addEventListener('click', () => openEditModal(button.dataset.id));
    });

    document.querySelectorAll('.delete-site-btn').forEach((button) => {
      button.addEventListener('click', () => openDeleteModal(button.dataset.id));
    });
  }

  function resetForm() {
    document.getElementById('siteModalTitle').textContent = 'Add Site';
    document.getElementById('siteId').value = '';
    document.getElementById('siteUrl').value = '';
    document.getElementById('siteStatus').value = 'Active';
    document.getElementById('siteLastScan').value = '';
  }

  function openEditModal(id) {
    const site = allSites.find((item) => item._id === id);
    if (!site) return;

    document.getElementById('siteModalTitle').textContent = 'Edit Site';
    document.getElementById('siteId').value = site._id;
    document.getElementById('siteUrl').value = site.url || '';
    document.getElementById('siteStatus').value = site.status ? 'Active' : 'Inactive';
    document.getElementById('siteLastScan').value = toDateTimeLocal(site.lastScan);
    siteModal.show();
  }

  function openDeleteModal(id) {
    const site = allSites.find((item) => item._id === id);
    if (!site) return;

    deleteTarget = site;
    document.getElementById('deleteSiteName').textContent = site.url || '-';
    deleteModal.show();
  }

  async function loadSites() {
    const response = await window.AppAuth.authFetch(API);
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Gagal mengambil data site.');
    }

    allSites = result;
    renderSites();
  }

  async function saveSite() {
    const siteId = document.getElementById('siteId').value;
    const payload = {
      url: document.getElementById('siteUrl').value.trim(),
      status: document.getElementById('siteStatus').value === 'Active',
      lastScan: document.getElementById('siteLastScan').value || null
    };

    if (!payload.url) {
      showAlert('error', 'URL wajib diisi.');
      return;
    }

    try {
      const response = await window.AppAuth.authFetch(siteId ? `${API}/${siteId}` : API, {
        method: siteId ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || 'Gagal menyimpan site.');
      }

      siteModal.hide();
      resetForm();
      await loadSites();
      showAlert('success', siteId ? 'Site berhasil diperbarui.' : 'Site berhasil ditambahkan.');
    } catch (error) {
      showAlert('error', error.message);
    }
  }

  async function deleteSite() {
    if (!deleteTarget) return;

    try {
      const response = await window.AppAuth.authFetch(`${API}/${deleteTarget._id}`, {
        method: 'DELETE'
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || 'Gagal menghapus site.');
      }

      deleteModal.hide();
      deleteTarget = null;
      await loadSites();
      showAlert('success', 'Site berhasil dihapus.');
    } catch (error) {
      showAlert('error', error.message);
    }
  }

  function exportSites() {
    const sites = getFilteredSites().map((site, index) => ({
      No: index + 1,
      AssetSite: site.url || '',
      Status: site.status ? 'Active' : 'Inactive',
      LastScanDate: site.lastScan ? new Date(site.lastScan) : '',
      LastUpdateBy: site.lastUpdateBy || '',
      LastUpdateDate: site.lastUpdate ? new Date(site.lastUpdate) : ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(sites);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sites');
    XLSX.writeFile(workbook, `site_data_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  document.getElementById('saveSiteBtn').addEventListener('click', saveSite);
  document.getElementById('confirmDeleteSiteBtn').addEventListener('click', deleteSite);

  addButton.addEventListener('click', () => {
    resetForm();
    siteModal.show();
  });

  searchButton.addEventListener('click', () => {
    currentPage = 1;
    renderSites();
  });

  searchInput.addEventListener('input', () => {
    currentPage = 1;
    renderSites();
  });

  statusFilter.addEventListener('change', () => {
    currentPage = 1;
    renderSites();
  });

  resetButton.addEventListener('click', () => {
    searchInput.value = '';
    statusFilter.value = '';
    currentPage = 1;
    renderSites();
  });

  prevPageButton.addEventListener('click', () => {
    currentPage -= 1;
    renderSites();
  });

  nextPageButton.addEventListener('click', () => {
    currentPage += 1;
    renderSites();
  });

  exportButton.addEventListener('click', () => {
    exportLoading.style.display = 'inline-block';

    try {
      exportSites();
    } catch (error) {
      showAlert('error', error.message || 'Gagal export data site.');
    } finally {
      exportLoading.style.display = 'none';
    }
  });

  try {
    await loadSites();
  } catch (error) {
    showAlert('error', error.message);
  }
});
