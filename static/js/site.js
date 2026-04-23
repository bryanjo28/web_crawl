document.addEventListener('DOMContentLoaded', async function () {
  await window.AppAuth.initPage();

  const API = '/api/sites';
  const PAGE_SIZE = 10;

  const judolSiteFilter = document.getElementById('judolSiteFilter');
  const titleFilter = document.getElementById('titleFilter');
  const flagJudolFilter = document.getElementById('flagJudolFilter');
  const statusFilter = document.getElementById('statusFilter');
  const addButton = document.getElementById('openAddModal');
  const uploadButton = document.getElementById('uploadData');
  const exportButton = document.getElementById('exportData');
  const uploadLoading = document.getElementById('uploadLoading');
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
  let parsedUploadRows = [];

  injectModals();

  const siteModal = new bootstrap.Modal(document.getElementById('siteModal'));
  const deleteModal = new bootstrap.Modal(document.getElementById('deleteSiteModal'));
  const uploadModal = new bootstrap.Modal(document.getElementById('siteUploadModal'));
  const uploadPreviewModal = new bootstrap.Modal(document.getElementById('siteUploadPreviewModal'));

  function injectModals() {
    const modalMarkup = `
      <div class="modal fade" id="siteModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-lg">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title" id="siteModalTitle">Add Judol Site</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
              <input type="hidden" id="siteId" />
              <div class="row g-3">
                <div class="col-md-6">
                  <label for="siteJudolSite" class="form-label">Judol Site</label>
                  <input type="text" class="form-control" id="siteJudolSite" placeholder="https://example.com" />
                </div>
                <div class="col-md-6">
                  <label for="siteTitle" class="form-label">Title</label>
                  <input type="text" class="form-control" id="siteTitle" placeholder="Title judol" />
                </div>
                <div class="col-md-6">
                  <label for="siteUsername" class="form-label">Username</label>
                  <input type="text" class="form-control" id="siteUsername" />
                </div>
                <div class="col-md-6">
                  <label for="sitePassword" class="form-label">Password</label>
                  <input type="text" class="form-control" id="sitePassword" />
                </div>
                <div class="col-md-6">
                  <label for="siteFlagJudol" class="form-label">Flag Judol</label>
                  <select class="form-select" id="siteFlagJudol">
                    <option value="true">Y</option>
                    <option value="false">N</option>
                  </select>
                </div>
                <div class="col-md-6">
                  <label for="siteStatus" class="form-label">Status</label>
                  <select class="form-select" id="siteStatus">
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </div>
                <!--
                <div class="col-md-6">
                  <label for="siteAssetSite" class="form-label">Asset Site</label>
                  <input type="text" class="form-control" id="siteAssetSite" />
                </div>
                -->
                <div class="col-md-6">
                  <label for="siteLastCrawl" class="form-label">Last Crawl</label>
                  <input type="datetime-local" class="form-control" id="siteLastCrawl" />
                </div>
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
              <h5 class="modal-title">Delete Judol Site</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
              Hapus data <strong id="deleteSiteName">-</strong>?
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
              <button type="button" class="btn btn-danger" id="confirmDeleteSiteBtn">Delete</button>
            </div>
          </div>
        </div>
      </div>

      <div class="modal fade" id="siteUploadModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Upload Judol Site</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
              <label for="siteUploadFile" class="form-label">File Excel</label>
              <input type="file" class="form-control" id="siteUploadFile" accept=".xlsx,.xls,.csv" />
              <div class="form-text">
                Header Excel yang didukung: Judol Site, Title, Username, Password, Flag Judol, Status, Last Crawl, Last Update By, Last Update Date.
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
              <button type="button" class="btn btn-primary" id="previewSiteUploadBtn">Preview</button>
            </div>
          </div>
        </div>
      </div>

      <div class="modal fade" id="siteUploadPreviewModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-xl">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Preview Upload Judol Site</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
              <div class="small text-muted mb-2">Kolom Excel harus mengikuti nama kolom tabel Judol Site.</div>
              <div class="table-responsive">
                <table class="table table-bordered table-hover text-sm mb-0">
                  <thead class="table-light">
                    <tr>
                      <th>No</th>
                      <th>Judol Site</th>
                      <th>Title</th>
                      <th>Username</th>
                      <th>Password</th>
                      <th>Flag Judol</th>
                      <th>Status</th>
                      <th>Last Crawl</th>
                      <th>Last Update By</th>
                      <th>Last Update Date</th>
                    </tr>
                  </thead>
                  <tbody id="siteUploadPreviewBody"></tbody>
                </table>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
              <button type="button" class="btn btn-success" id="confirmSiteUploadBtn">Submit Data</button>
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

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  function normalizeHeaderKey(value) {
    return String(value ?? '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/[^a-z0-9 ]/g, '');
  }

  function getSpreadsheetValue(row, ...keys) {
    const normalizedRow = Object.entries(row || {}).reduce((acc, [key, value]) => {
      acc[normalizeHeaderKey(key)] = value;
      return acc;
    }, {});

    for (const key of keys) {
      const value = normalizedRow[normalizeHeaderKey(key)];
      if (value !== undefined && value !== null && value !== '') {
        return value;
      }
    }

    return '';
  }

  function mapUploadRow(row) {
    return {
      judolSite: String(getSpreadsheetValue(row, 'Judol Site', 'JudolSite', 'URL')).trim(),
      title: String(getSpreadsheetValue(row, 'Title')).trim(),
      username: String(getSpreadsheetValue(row, 'Username')).trim(),
      password: String(getSpreadsheetValue(row, 'Password')).trim(),
      flagJudol: getSpreadsheetValue(row, 'Flag Judol', 'FlagJudol'),
      status: getSpreadsheetValue(row, 'Status'),
      lastCrawl: getSpreadsheetValue(row, 'Last Crawl', 'LastCrawl'),
      lastUpdateBy: String(getSpreadsheetValue(row, 'Last Update By', 'LastUpdateBy')).trim(),
      lastUpdateDate: getSpreadsheetValue(row, 'Last Update Date', 'LastUpdateDate')
    };
  }

  function renderUploadPreview() {
    const previewBody = document.getElementById('siteUploadPreviewBody');
    previewBody.innerHTML = '';

    if (!parsedUploadRows.length) {
      previewBody.innerHTML = '<tr><td colspan="10" class="text-center text-muted">Belum ada data upload.</td></tr>';
      return;
    }

    parsedUploadRows.forEach((row, index) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${index + 1}</td>
        <td>${escapeHtml(row.judolSite || '-')}</td>
        <td>${escapeHtml(row.title || '-')}</td>
        <td>${escapeHtml(row.username || '-')}</td>
        <td>${escapeHtml(row.password || '-')}</td>
        <td>${escapeHtml(row.flagJudol || '-')}</td>
        <td>${escapeHtml(row.status || '-')}</td>
        <td>${escapeHtml(row.lastCrawl || '-')}</td>
        <td>${escapeHtml(row.lastUpdateBy || '-')}</td>
        <td>${escapeHtml(row.lastUpdateDate || '-')}</td>
      `;
      previewBody.appendChild(tr);
    });
  }

  async function previewUploadFile() {
    const fileInput = document.getElementById('siteUploadFile');
    const file = fileInput.files[0];

    if (!file) {
      showAlert('error', 'Pilih file Excel terlebih dahulu.');
      return;
    }

    const extension = file.name.split('.').pop().toLowerCase();
    if (!['xlsx', 'xls', 'csv'].includes(extension)) {
      showAlert('error', 'Format file harus .xlsx, .xls, atau .csv.');
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
      showAlert('error', 'Data Excel kosong atau header tidak sesuai.');
      return;
    }

    renderUploadPreview();
    uploadModal.hide();
    uploadPreviewModal.show();
  }

  async function submitUpload() {
    if (!parsedUploadRows.length) {
      showAlert('error', 'Tidak ada data upload untuk dikirim.');
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
        throw new Error(result.message || 'Gagal upload data site.');
      }

      uploadPreviewModal.hide();
      document.getElementById('siteUploadFile').value = '';
      parsedUploadRows = [];
      await loadSites();
      showAlert('success', result.message || 'Upload site berhasil.');
    } catch (error) {
      showAlert('error', error.message);
    } finally {
      uploadLoading.style.display = 'none';
    }
  }

  function getFilteredSites() {
    const judolSiteKeyword = judolSiteFilter.value.trim().toLowerCase();
    const titleKeyword = titleFilter.value.trim().toLowerCase();
    const flagJudol = flagJudolFilter.value;
    const status = statusFilter.value;
    return allSites.filter((site) => {
      const matchesJudolSite =
        !judolSiteKeyword || (site.judolSite || '').toLowerCase().includes(judolSiteKeyword);
      const matchesTitle =
        !titleKeyword || (site.title || '').toLowerCase().includes(titleKeyword);
      const matchesFlag =
        !flagJudol || String(site.flagJudol) === flagJudol;
      const matchesStatus =
        !status || (site.status ? 'Active' : 'Inactive') === status;

      return matchesJudolSite && matchesTitle && matchesFlag && matchesStatus;
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
      tbody.innerHTML = '<tr><td colspan="11" class="text-center text-muted">Tidak ada data judol site.</td></tr>';
    } else {
      pagedSites.forEach((site, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${startIndex + index + 1}</td>
          <td>${escapeHtml(site.judolSite || '-')}</td>
          <td>${escapeHtml(site.title || '-')}</td>
          <td>${escapeHtml(site.username || '-')}</td>
          <td>${escapeHtml(site.password || '-')}</td>
          <td>${site.flagJudol ? 'Y' : 'N'}</td>
          <td>${site.status ? 'Active' : 'Inactive'}</td>
          <td>${formatDate(site.lastCrawl)}</td>
          <td>${escapeHtml(site.lastUpdateBy || '-')}</td>
          <td>${formatDate(site.lastUpdateDate)}</td>
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
    document.getElementById('siteModalTitle').textContent = 'Add Judol Site';
    document.getElementById('siteId').value = '';
    document.getElementById('siteJudolSite').value = '';
    document.getElementById('siteTitle').value = '';
    document.getElementById('siteUsername').value = '';
    document.getElementById('sitePassword').value = '';
    document.getElementById('siteFlagJudol').value = 'true';
    document.getElementById('siteStatus').value = 'true';
    document.getElementById('siteLastCrawl').value = '';
  }

  function openEditModal(id) {
    const site = allSites.find((item) => item._id === id);
    if (!site) return;

    document.getElementById('siteModalTitle').textContent = 'Edit Judol Site';
    document.getElementById('siteId').value = site._id;
    document.getElementById('siteJudolSite').value = site.judolSite || '';
    document.getElementById('siteTitle').value = site.title || '';
    document.getElementById('siteUsername').value = site.username || '';
    document.getElementById('sitePassword').value = site.password || '';
    document.getElementById('siteFlagJudol').value = String(Boolean(site.flagJudol));
    document.getElementById('siteStatus').value = String(Boolean(site.status));
    document.getElementById('siteLastCrawl').value = toDateTimeLocal(site.lastCrawl);
    siteModal.show();
  }

  function openDeleteModal(id) {
    const site = allSites.find((item) => item._id === id);
    if (!site) return;

    deleteTarget = site;
    document.getElementById('deleteSiteName').textContent = site.judolSite || '-';
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
      judolSite: document.getElementById('siteJudolSite').value.trim(),
      title: document.getElementById('siteTitle').value.trim(),
      username: document.getElementById('siteUsername').value.trim(),
      password: document.getElementById('sitePassword').value.trim(),
      flagJudol: document.getElementById('siteFlagJudol').value === 'true',
      status: document.getElementById('siteStatus').value === 'true',
      lastCrawl: document.getElementById('siteLastCrawl').value || null
    };

    if (!payload.judolSite) {
      showAlert('error', 'Judol Site wajib diisi.');
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
      showAlert('success', siteId ? 'Judol Site berhasil diperbarui.' : 'Judol Site berhasil ditambahkan.');
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
      showAlert('success', 'Judol Site berhasil dihapus.');
    } catch (error) {
      showAlert('error', error.message);
    }
  }

  function exportSites() {
    const sites = getFilteredSites().map((site, index) => ({
      No: index + 1,
      'Judol Site': site.judolSite || '',
      'Title': site.title || '',
      'Username': site.username || '',
      'Password': site.password || '',
      'Flag Judol': site.flagJudol ? 'Y' : 'N',
      'Status': site.status ? 'Active' : 'Inactive',
      'Last Crawl': site.lastCrawl ? new Date(site.lastCrawl) : '',
      'Last Update By': site.lastUpdateBy || '',
      'Last Update Date': site.lastUpdateDate ? new Date(site.lastUpdateDate) : ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(sites);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'JudolSite');
    XLSX.writeFile(workbook, `judol_site_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  function applyFilters() {
    currentPage = 1;
    renderSites();
  }

  document.getElementById('saveSiteBtn').addEventListener('click', saveSite);
  document.getElementById('confirmDeleteSiteBtn').addEventListener('click', deleteSite);
  document.getElementById('previewSiteUploadBtn').addEventListener('click', previewUploadFile);
  document.getElementById('confirmSiteUploadBtn').addEventListener('click', submitUpload);

  addButton.addEventListener('click', () => {
    resetForm();
    siteModal.show();
  });

  uploadButton.addEventListener('click', () => {
    document.getElementById('siteUploadFile').value = '';
    parsedUploadRows = [];
    uploadModal.show();
  });

  judolSiteFilter.addEventListener('input', applyFilters);
  titleFilter.addEventListener('input', applyFilters);
  flagJudolFilter.addEventListener('change', applyFilters);
  statusFilter.addEventListener('change', applyFilters);
  resetButton.addEventListener('click', () => {
    judolSiteFilter.value = '';
    titleFilter.value = '';
    flagJudolFilter.value = '';
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
      showAlert('error', error.message || 'Gagal download data site.');
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
