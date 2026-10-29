document.addEventListener('DOMContentLoaded', async function () {
  const currentUser = await window.AppAuth.initPage();

  const API = '/api/tasks';
  const PAGE_SIZE = 10;

  const taskDateFilter = document.getElementById('taskDateFilter');
  const picFilter = document.getElementById('picFilter');
  const taskSiteFilter = document.getElementById('taskSiteFilter');
  const searchButton = document.getElementById('searchButton');
  const addButton = document.getElementById('openAddTaskModal');
  const uploadButton = document.getElementById('uploadTaskData');
  const exportButton = document.getElementById('exportTaskData');
  const uploadLoading = document.getElementById('uploadTaskLoading');
  const distributeButton = document.getElementById('distributeTaskButton');
  const resetButton = document.querySelector('.resetButton');
  const tbody = document.querySelector('table tbody');
  const paginationInfo = document.getElementById('pagination-info');
  const prevPageButton = document.getElementById('prev-page');
  const nextPageButton = document.getElementById('next-page');
  const taskDateSortHeader = document.getElementById('taskDateSortHeader');
  const successAlert = document.getElementById('successAlert');
  const errorAlert = document.getElementById('errorAlert');
  const successMessage = document.getElementById('successMessage');
  const errorMessage = document.getElementById('errorMessage');
  const isAdmin = currentUser.role === 'admin';
  const taskListStateKey = `task-list:${currentUser.id || currentUser._id || currentUser.name}:${currentUser.role}`;

  let allTasks = [];
  let picOptions = [];
  let distributeUserOptions = [];
  let currentPage = 1;
  let deleteTarget = null;
  let availableDistributionCount = 0;
  let distributionAvailabilityDate = '';
  let distributionAvailabilityVersion = 0;
  let distributionAdding = false;
  let distributionSaving = false;
  let distributionQueue = [];
  let currentTemuanTask = null;
  let temuanQueue = [];
  let parsedUploadRows = [];
  let taskDateSortDirection = 'desc';
  let duplicateCheckVersion = 0;
  let duplicateCheckTimer;

  injectModals();

  const taskModal = new bootstrap.Modal(document.getElementById('taskModal'));
  const deleteModal = new bootstrap.Modal(document.getElementById('deleteTaskModal'));
  const distributeModal = new bootstrap.Modal(document.getElementById('distributeTaskModal'));
  const temuanModal = new bootstrap.Modal(document.getElementById('temuanTaskModal'));
  const uploadModal = new bootstrap.Modal(document.getElementById('taskUploadModal'));
  const uploadPreviewModal = new bootstrap.Modal(document.getElementById('taskUploadPreviewModal'));

  function injectModals() {
    const modalMarkup = `
      <div class="modal fade" id="taskModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-lg">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title" id="taskModalTitle">Add Task</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
              <input type="hidden" id="taskId" />
              <div class="row g-3">
                <div class="col-md-6">
                  <label for="taskDate" class="form-label">Tasklist Date</label>
                  <input type="date" class="form-control" id="taskDate" />
                </div>
                <div class="col-md-6">
                  <label for="taskPic" class="form-label">PIC</label>
                  <select class="form-select" id="taskPic"></select>
                </div>
                <div class="col-md-6">
                  <label for="taskUrl" class="form-label">Judol Site</label>
                  <input type="text" class="form-control" id="taskUrl" />
                </div>
                <div class="col-md-6">
                  <label for="taskTitle" class="form-label">Title Judol</label>
                  <input type="text" class="form-control" id="taskTitle" />
                </div>
                <div class="col-md-6">
                  <label for="taskUsername" class="form-label">Username</label>
                  <input type="text" class="form-control" id="taskUsername" />
                </div>
                <div class="col-md-6">
                  <label for="taskPassword" class="form-label">Password</label>
                  <input type="text" class="form-control" id="taskPassword" />
                </div>
                <div class="col-md-6">
                  <label for="taskFlagJudol" class="form-label">Flag Judol</label>
                  <select class="form-select" id="taskFlagJudol">
                    <option value="true">Y</option>
                    <option value="false">N</option>
                  </select>
                </div>
                <div class="col-md-6">
                  <label for="taskStatusSite" class="form-label">Status</label>
                  <select class="form-select" id="taskStatusSite">
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
              <button type="button" class="btn btn-primary" id="saveTaskBtn">Save</button>
            </div>
          </div>
        </div>
      </div>

      <div class="modal fade" id="deleteTaskModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Delete Task</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
              Hapus task untuk site <strong id="deleteTaskName">-</strong>?
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
              <button type="button" class="btn btn-danger" id="confirmDeleteTaskBtn">Delete</button>
            </div>
          </div>
        </div>
      </div>

      <div class="modal fade" id="distributeTaskModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-lg">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Popup Distribute</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
              <div id="distributionAlert" class="alert alert-danger" role="alert" hidden></div>
              <div class="row g-3 align-items-end">
                <div class="col-md-4">
                  <label for="distributeTaskDate" class="form-label">Tasklist Date</label>
                  <input type="date" class="form-control" id="distributeTaskDate" />
                </div>
                <div class="col-md-4">
                  <label for="distributePicSelect" class="form-label">PIC</label>
                  <select
                    class="selectpicker form-control"
                    id="distributePicSelect"
                    data-live-search="true"
                    data-size="6"
                    data-width="100%"
                    title="Cari user..."
                  ></select>
                </div>
                <div class="col-md-4">
                  <label for="distributeQuantity" class="form-label">Jumlah Judol Site</label>
                  <input type="number" class="form-control" id="distributeQuantity" min="1" step="1" />
                </div>
              </div>

              <div class="d-flex justify-content-between align-items-center mt-3 mb-2">
                <div class="small text-muted">
                  Tersedia untuk tanggal pilihan: <span id="distributionAvailableCount">-</span> |
                  Sisa setelah antrean tanggal ini: <span id="distributionRemainingCount">-</span>
                </div>
                <button type="button" class="btn btn-sm btn-warning" id="addDistributionRowBtn">Add</button>
              </div>

              <div class="table-responsive">
                <table class="table table-bordered table-hover text-sm mb-0">
                  <thead class="table-light">
                    <tr>
                      <th>Tasklist Date</th>
                      <th>PIC</th>
                      <th>Jumlah</th>
                      <th class="text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody id="distributionQueueBody"></tbody>
                </table>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-success" id="saveDistributionBtn">Save</button>
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
            </div>
          </div>
        </div>
      </div>

      <div class="modal fade" id="temuanTaskModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-lg">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Popup Tasklist User</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
              <input type="hidden" id="temuanTaskId" />
              <div id="temuanModalAlert" class="alert alert-danger" role="alert" hidden></div>
              <div id="temuanDuplicateAlert" class="alert alert-warning" role="status" hidden></div>
              <div class="row g-3 mb-3">
                <div class="col-md-6">
                  <label class="form-label">Judol Site</label>
                  <input type="text" class="form-control" id="temuanTaskJudolSite" readonly />
                </div>
                <div class="col-md-6">
                  <label class="form-label">Tasklist Date</label>
                  <input type="text" class="form-control" id="temuanTaskDateDisplay" readonly />
                </div>
              </div>
              <div class="row g-3 mb-3">
                <div class="col-md-6">
                  <label for="temuanTaskStatus" class="form-label">Status Domain Asal</label>
                  <select id="temuanTaskStatus" class="form-select">
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </div>
                <div class="col-md-6" id="temuanReplacementGroup" hidden>
                  <label for="temuanReplacementUrl" class="form-label">Judol Site Pengganti</label>
                  <input type="text" id="temuanReplacementUrl" class="form-control" placeholder="https://domain-b.com">
                  <label for="temuanReplacementTitle" class="form-label mt-2">Title Pengganti</label>
                  <input type="text" id="temuanReplacementTitle" class="form-control" placeholder="Title domain baru">
                  <div class="form-text">Temuan dan nama file akan memakai domain pengganti jika diisi.</div>
                </div>
              </div>
              <div class="row g-3 align-items-end">
                <div class="col-md-4">
                  <label for="temuanType" class="form-label">Jenis</label>
                  <select class="form-select" id="temuanType">
                    <option value="">Pilih jenis</option>
                    <option value="rekening">rekening</option>
                    <option value="qris">qris</option>
                    <option value="va">va</option>
                    <option value="sakuku">sakuku</option>
                  </select>
                </div>
                <div class="col-md-4">
                  <label for="temuanBankName" class="form-label">Nama Bank</label>
                  <input type="text" class="form-control" id="temuanBankName" />
                </div>
                <div class="col-md-4">
                  <label for="temuanIdentifierNo" class="form-label">Nomor</label>
                  <input type="text" class="form-control" id="temuanIdentifierNo" />
                </div>
              </div>
              <div class="row g-3 mt-1">
                <div class="col-12">
                  <label for="temuanTitleSite" class="form-label">Nama file (otomatis)</label>
                  <input type="text" class="form-control" id="temuanTitleSite" placeholder="Terisi setelah jenis, nama bank, dan nomor lengkap" readonly />
                </div>
              </div>
              <div class="d-flex justify-content-end mt-3 mb-2">
                <button type="button" class="btn btn-sm btn-warning" id="addTemuanRowBtn">Add</button>
              </div>
              <div class="table-responsive">
                <table class="table table-bordered table-hover text-sm mb-0">
                  <thead class="table-light">
                    <tr>
                      <th>Jenis</th>
                      <th>Nama Bank</th>
                      <th>Nomor</th>
                      <th>Nama File</th>
                      <th class="text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody id="temuanQueueBody"></tbody>
                </table>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-success" id="saveTemuanBtn">Save</button>
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
            </div>
          </div>
        </div>
      </div>

      <div class="modal fade" id="taskUploadModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Upload Task</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
              <label for="taskUploadFile" class="form-label">File Excel</label>
              <input type="file" class="form-control" id="taskUploadFile" accept=".xlsx,.xls,.csv" />
              <div class="form-text">
                Header Excel wajib: Tasklist Date, PIC, Judol Site, Title Judol, Username, Password, Flag Judol, Status. Kolom opsional: Last Update By, Last Update Date.
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
              <button type="button" class="btn btn-primary" id="previewTaskUploadBtn">Preview</button>
            </div>
          </div>
        </div>
      </div>

      <div class="modal fade" id="taskUploadPreviewModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-xl">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Preview Upload Task</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
              <div class="table-responsive">
                <table class="table table-bordered table-hover text-sm mb-0">
                  <thead class="table-light">
                    <tr>
                      <th>No</th>
                      <th>Tasklist Date</th>
                      <th>PIC</th>
                      <th>Judol Site</th>
                      <th>Title Judol</th>
                      <th>Username</th>
                      <th>Password</th>
                      <th>Flag Judol</th>
                      <th>Status</th>
                      <th>Last Update By</th>
                      <th>Last Update Date</th>
                    </tr>
                  </thead>
                  <tbody id="taskUploadPreviewBody"></tbody>
                </table>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
              <button type="button" class="btn btn-success" id="confirmTaskUploadBtn">Submit Data</button>
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

  function formatShortDate(value) {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('id-ID');
  }

  function toDateInputValue(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toISOString().slice(0, 10);
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
      taskDate: getSpreadsheetValue(row, 'Tasklist Date', 'TaskDate'),
      pic: String(getSpreadsheetValue(row, 'PIC')).trim(),
      url: String(getSpreadsheetValue(row, 'Judol Site', 'JudolSite', 'URL')).trim(),
      title: String(getSpreadsheetValue(row, 'Title Judol', 'TitleJudol', 'Title')).trim(),
      username: String(getSpreadsheetValue(row, 'Username')).trim(),
      password: String(getSpreadsheetValue(row, 'Password')).trim(),
      flagJudol: getSpreadsheetValue(row, 'Flag Judol', 'FlagJudol'),
      statusSite: getSpreadsheetValue(row, 'Status', 'Status Site'),
      lastUpdatedBy: String(getSpreadsheetValue(row, 'Last Update By', 'LastUpdatedBy')).trim(),
      lastUpdateDate: getSpreadsheetValue(row, 'Last Update Date', 'LastUpdatedDate')
    };
  }

  function renderUploadPreview() {
    const previewBody = document.getElementById('taskUploadPreviewBody');
    previewBody.innerHTML = '';

    if (!parsedUploadRows.length) {
      previewBody.innerHTML = '<tr><td colspan="11" class="text-center text-muted">Belum ada data upload task.</td></tr>';
      return;
    }

    parsedUploadRows.forEach((row, index) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${index + 1}</td>
        <td>${escapeHtml(row.taskDate || '-')}</td>
        <td>${escapeHtml(row.pic || '-')}</td>
        <td>${escapeHtml(row.url || '-')}</td>
        <td>${escapeHtml(row.title || '-')}</td>
        <td>${escapeHtml(row.username || '-')}</td>
        <td>${escapeHtml(row.password || '-')}</td>
        <td>${escapeHtml(row.flagJudol || '-')}</td>
        <td>${escapeHtml(row.statusSite || '-')}</td>
        <td>${escapeHtml(row.lastUpdatedBy || '-')}</td>
        <td>${escapeHtml(row.lastUpdateDate || '-')}</td>
      `;
      previewBody.appendChild(tr);
    });
  }

  async function previewUploadFile() {
    const fileInput = document.getElementById('taskUploadFile');
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
      showAlert('error', 'Tidak ada data upload task untuk dikirim.');
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
        throw new Error(result.message || 'Gagal upload data task.');
      }

      uploadPreviewModal.hide();
      document.getElementById('taskUploadFile').value = '';
      parsedUploadRows = [];
      await loadTasks();
      showAlert('success', result.message || 'Upload task berhasil.');
    } catch (error) {
      showAlert('error', error.message);
    } finally {
      uploadLoading.style.display = 'none';
    }
  }

  function normalizeFilePart(value) {
    return String(value ?? '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^a-zA-Z0-9.-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  function buildTemuanFileName(task, item = {}) {
    const parts = [
      normalizeFilePart(task?.url || ''),
      normalizeFilePart(item?.type || ''),
      normalizeFilePart(item?.bankName || ''),
      normalizeFilePart(item?.identifierNo || '')
    ].filter(Boolean);

    return parts.join('-');
  }

  function updateTemuanTitleSitePreview() {
    const titleField = document.getElementById('temuanTitleSite');
    const item = {
      type: document.getElementById('temuanType').value.trim(),
      bankName: document.getElementById('temuanBankName').value.trim(),
      identifierNo: document.getElementById('temuanIdentifierNo').value.trim()
    };
    titleField.value = item.type && item.bankName && item.identifierNo
      ? buildTemuanFileName(getEffectiveTemuanTask(), item) : '';
  }

  function showTemuanError(message) {
    const alert = document.getElementById('temuanModalAlert');
    alert.textContent = message;
    alert.hidden = false;
  }

  function getEffectiveTemuanTask() {
    const replacement = document.getElementById('temuanTaskStatus').value === 'false'
      ? document.getElementById('temuanReplacementUrl').value.trim() : '';
    return { ...currentTemuanTask, url: replacement || currentTemuanTask?.url || '' };
  }

  function updateReplacementFields() {
    document.getElementById('temuanReplacementGroup').hidden = document.getElementById('temuanTaskStatus').value !== 'false';
    const effectiveTask = getEffectiveTemuanTask();
    temuanQueue.forEach(item => { item.fileName = buildTemuanFileName(effectiveTask, item); });
    renderTemuanQueue();
    updateTemuanTitleSitePreview();
  }

  function getDuplicateKey(item) {
    return JSON.stringify([
      String(item.type || '').trim().toLowerCase(),
      String(item.bankName || '').trim().replace(/\s+/g, ' ').toLowerCase(),
      String(item.identifierNo || '').trim()
    ]);
  }

  async function checkTemuanDuplicate(item, alreadyAdded = false) {
    const version = ++duplicateCheckVersion;
    const alert = document.getElementById('temuanDuplicateAlert');
    if (!item.type || !item.bankName || !item.identifierNo) { alert.hidden = true; return; }
    const repeated = temuanQueue.filter(entry => getDuplicateKey(entry) === getDuplicateKey(item)).length > (alreadyAdded ? 1 : 0);
    const notes = repeated ? ['Kombinasi jenis, nama bank, dan nomor sudah ada di antrean ini.'] : [];
    alert.textContent = notes.join(' ');
    alert.hidden = !notes.length;
    try {
      const query = new URLSearchParams(item);
      const response = await window.AppAuth.authFetch(`${API}/temuan/duplicates?${query}`);
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Gagal mengecek duplikat.');
      if (version !== duplicateCheckVersion) return;
      if (result.exists) notes.push(`Data ini pernah dicatat${result.domains.length ? ' pada ' + result.domains.join(', ') : ''}.`);
    } catch (error) {
      if (version !== duplicateCheckVersion) return;
      notes.push('Pengecekan riwayat duplikat belum berhasil.');
    }
    alert.textContent = notes.length ? notes.join(' ') + ' Data tetap boleh disimpan.' : '';
    alert.hidden = !notes.length;
  }

  function scheduleDuplicateCheck() {
    duplicateCheckVersion++;
    clearTimeout(duplicateCheckTimer);
    duplicateCheckTimer = window.setTimeout(() => checkTemuanDuplicate({
      type: document.getElementById('temuanType').value.trim(),
      bankName: document.getElementById('temuanBankName').value.trim(),
      identifierNo: document.getElementById('temuanIdentifierNo').value.trim()
    }), 350);
  }

  function getFilteredTasks() {
    const taskDate = taskDateFilter.value;
    const pic = picFilter.value.trim().toLowerCase();

    return allTasks.filter((task) => {
      const matchesTaskDate = !taskDate || toDateInputValue(task.taskDate) === taskDate;
      const matchesPic = !pic || (task.pic || '').toLowerCase().includes(pic);
      const keyword = taskSiteFilter.value.trim().toLowerCase();
      const matchesSite = !keyword || [task.url, task.replacementUrl].some(value => String(value || '').toLowerCase().includes(keyword));
      return matchesTaskDate && matchesPic && matchesSite;
    }).sort((a, b) => {
      const timeA = a?.taskDate ? new Date(a.taskDate).getTime() : 0;
      const timeB = b?.taskDate ? new Date(b.taskDate).getTime() : 0;
      return taskDateSortDirection === 'desc' ? timeB - timeA : timeA - timeB;
    });
  }

  function updateTaskSortHeader() {
    if (!taskDateSortHeader) return;
    taskDateSortHeader.innerHTML = `Tasklist Date <i class="fa ${taskDateSortDirection === 'desc' ? 'fa-sort-down' : 'fa-sort-up'} ms-1" aria-hidden="true"></i>`;
  }

  function getTodayDateInputValue() {
    const now = new Date();
    const offset = now.getTimezoneOffset();
    const localDate = new Date(now.getTime() - (offset * 60000));
    return localDate.toISOString().slice(0, 10);
  }

  function ensurePageWithinRange(totalItems) {
    const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;
    return totalPages;
  }

  function saveTaskListState() {
    try {
      window.sessionStorage.setItem(taskListStateKey, JSON.stringify({
        savedOn: getTodayDateInputValue(), currentPage,
        taskDate: taskDateFilter.value, pic: picFilter.value, site: taskSiteFilter.value,
        sortDirection: taskDateSortDirection
      }));
    } catch { /* The table remains usable when browser storage is unavailable. */ }
  }

  function restoreTaskListState() {
    try {
      const state = JSON.parse(window.sessionStorage.getItem(taskListStateKey));
      if (!state || state.savedOn !== getTodayDateInputValue()) return;
      currentPage = Number.isSafeInteger(state.currentPage) && state.currentPage > 0 ? state.currentPage : 1;
      if (typeof state.taskDate === 'string' && (!state.taskDate || /^\d{4}-\d{2}-\d{2}$/.test(state.taskDate))) taskDateFilter.value = state.taskDate;
      if (typeof state.pic === 'string') picFilter.value = state.pic;
      if (typeof state.site === 'string') taskSiteFilter.value = state.site;
      taskDateSortDirection = state.sortDirection === 'asc' ? 'asc' : 'desc';
    } catch { /* Ignore invalid or unavailable browser storage. */ }
  }

  function renderTasks() {
    const tasks = getFilteredTasks();
    const totalPages = ensurePageWithinRange(tasks.length);
    saveTaskListState();
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    const pagedTasks = tasks.slice(startIndex, startIndex + PAGE_SIZE);

    tbody.innerHTML = '';

    if (!pagedTasks.length) {
      tbody.innerHTML = '<tr><td colspan="12" class="text-center text-muted">Tidak ada data task.</td></tr>';
    } else {
      pagedTasks.forEach((task, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${startIndex + index + 1}</td>
          <td>${formatShortDate(task.taskDate)}</td>
          <td>${escapeHtml(task.pic || '-')}</td>
          <td>${escapeHtml(task.url || '-')}${task.replacementUrl ? `<div class="small text-muted">Pengganti: ${escapeHtml(task.replacementUrl)}</div>` : ''}</td>
          <td>${escapeHtml(task.title || '-')}</td>
          <td>${escapeHtml(task.username || '-')}</td>
          <td>${escapeHtml(task.password || '-')}</td>
          <td>${task.flagJudol ? 'Y' : 'N'}</td>
          <td>${task.statusSite ? 'Active' : 'Inactive'}</td>
          <td>${escapeHtml(task.lastUpdatedBy || '-')}</td>
          <td>${formatShortDate(task.tanggalTemuan)}</td>
          <td>
            <button class="btn btn-sm btn-warning me-1 edit-task-btn" data-id="${task._id}">
              <i class="fa fa-pencil"></i>
            </button>
            <button class="btn btn-sm btn-danger delete-task-btn" data-id="${task._id}">
              <i class="fa fa-trash"></i>
            </button>
          </td>
        `;
        tbody.appendChild(tr);
      });
    }

    paginationInfo.textContent = `Page ${currentPage} of ${totalPages}`;
    prevPageButton.disabled = currentPage <= 1;
    nextPageButton.disabled = currentPage >= totalPages;

    document.querySelectorAll('.edit-task-btn').forEach((button) => {
      button.addEventListener('click', () => {
        if (isAdmin) {
          openEditModal(button.dataset.id);
        } else {
          openTemuanModal(button.dataset.id);
        }
      });
    });

    document.querySelectorAll('.delete-task-btn').forEach((button) => {
      button.addEventListener('click', () => openDeleteModal(button.dataset.id));
    });
  }

  function resetForm() {
    document.getElementById('taskStatusSite').disabled = false;
    document.getElementById('taskUrl').readOnly = false;
    document.getElementById('taskModalTitle').textContent = 'Add Task';
    document.getElementById('taskId').value = '';
    document.getElementById('taskDate').value = '';
    document.getElementById('taskPic').innerHTML = buildPicSelectOptions('', true);
    document.getElementById('taskUrl').value = '';
    document.getElementById('taskTitle').value = '';
    document.getElementById('taskUsername').value = '';
    document.getElementById('taskPassword').value = '';
    document.getElementById('taskFlagJudol').value = 'true';
    document.getElementById('taskStatusSite').value = 'true';
  }

  function buildPicSelectOptions(selectedValue = '', includeEmptyOption = true) {
    const normalizedSelectedValue = selectedValue || '';
    const values = [...picOptions];
    const options = [];

    if (normalizedSelectedValue && !values.includes(normalizedSelectedValue)) {
      values.unshift(normalizedSelectedValue);
    }

    if (includeEmptyOption) {
      options.push('<option value="">Pilih PIC</option>');
    }

    values.forEach((pic) => {
      const isSelected = pic === normalizedSelectedValue ? 'selected' : '';
      options.push(`<option value="${escapeHtml(pic)}" ${isSelected}>${escapeHtml(pic)}</option>`);
    });

    return options.join('');
  }

  function populatePicSelects(selectedTaskPic = '') {
    document.getElementById('taskPic').innerHTML = buildPicSelectOptions(selectedTaskPic, true);
  }

  function initializeDistributePicPicker() {
    const select = document.getElementById('distributePicSelect');

    if (window.jQuery && typeof window.jQuery.fn.selectpicker === 'function') {
      const $select = window.jQuery(select);

      if ($select.data('selectpicker')) {
        $select.selectpicker('destroy');
      }

      $select.selectpicker({
        container: '#distributeTaskModal',
        liveSearch: true,
        size: 6,
        noneSelectedText: 'Cari user...'
      });
    }
  }

  function renderDistributePicOptions(selectedValue = '') {
    const select = document.getElementById('distributePicSelect');
    const options = ['<option value=""></option>'];

    distributeUserOptions.forEach((pic) => {
      const isSelected = pic === selectedValue ? 'selected' : '';
      options.push(`<option value="${escapeHtml(pic)}" ${isSelected}>${escapeHtml(pic)}</option>`);
    });

    select.innerHTML = options.join('');
    initializeDistributePicPicker();

    if (window.jQuery && typeof window.jQuery.fn.selectpicker === 'function') {
      window.jQuery(select).selectpicker('val', selectedValue || '');
    } else {
      select.value = selectedValue;
    }
  }

  async function loadPicOptions() {
    if (isAdmin) {
      const response = await window.AppAuth.authFetch('/api/users');
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Gagal mengambil data user.');
      }

      picOptions = result
        .filter((user) => user.isActive)
        .map((user) => user.fullName || user.name)
        .filter(Boolean);

      distributeUserOptions = result
        .filter((user) => user.isActive && user.role === 'user')
        .map((user) => user.fullName || user.name)
        .filter(Boolean);
    } else {
      picOptions = [currentUser.fullName || currentUser.name].filter(Boolean);
      distributeUserOptions = [];
    }

    picOptions = Array.from(new Set(picOptions)).sort((a, b) => a.localeCompare(b, 'id'));
    distributeUserOptions = Array.from(new Set(distributeUserOptions)).sort((a, b) => a.localeCompare(b, 'id'));
    populatePicSelects();
    renderDistributePicOptions();
  }

  function openEditModal(id) {
    const task = allTasks.find((item) => item._id === id);
    if (!task) return;

    document.getElementById('taskModalTitle').textContent = 'Edit Task';
    document.getElementById('taskId').value = task._id;
    document.getElementById('taskDate').value = toDateInputValue(task.taskDate);
    document.getElementById('taskPic').innerHTML = buildPicSelectOptions(task.pic || '', true);
    document.getElementById('taskUrl').value = task.url || '';
    document.getElementById('taskTitle').value = task.title || '';
    document.getElementById('taskUsername').value = task.username || '';
    document.getElementById('taskPassword').value = task.password || '';
    document.getElementById('taskFlagJudol').value = String(Boolean(task.flagJudol));
    document.getElementById('taskStatusSite').value = String(Boolean(task.statusSite));
    document.getElementById('taskStatusSite').disabled = Boolean(task.replacementSiteId);
    document.getElementById('taskUrl').readOnly = Boolean(task.replacementSiteId);
    taskModal.show();
  }

  function openDeleteModal(id) {
    const task = allTasks.find((item) => item._id === id);
    if (!task) return;

    deleteTarget = task;
    document.getElementById('deleteTaskName').textContent = task.url || '-';
    deleteModal.show();
  }

  function resetTemuanFormFields() {
    document.getElementById('temuanType').value = '';
    document.getElementById('temuanBankName').value = '';
    document.getElementById('temuanIdentifierNo').value = '';
    document.getElementById('temuanTitleSite').value = '';
  }

  function renderTemuanQueue() {
    const tbodyTemuan = document.getElementById('temuanQueueBody');
    tbodyTemuan.innerHTML = '';

    if (!temuanQueue.length) {
      tbodyTemuan.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Belum ada data temuan.</td></tr>';
      return;
    }

    temuanQueue.forEach((item, index) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${escapeHtml(item.type)}</td>
        <td>${escapeHtml(item.bankName)}</td>
        <td>${escapeHtml(item.identifierNo)}</td>
        <td>${escapeHtml(item.fileName)}</td>
        <td class="text-center">
          <button type="button" class="btn btn-sm btn-danger remove-temuan-row" data-index="${index}">
            <i class="fa fa-trash"></i>
          </button>
        </td>
      `;
      tbodyTemuan.appendChild(row);
    });

    document.querySelectorAll('.remove-temuan-row').forEach((button) => {
      button.addEventListener('click', () => {
        temuanQueue.splice(Number(button.dataset.index), 1);
        renderTemuanQueue();
      });
    });
  }

  function resetTemuanModal() {
    currentTemuanTask = null;
    temuanQueue = [];
    document.getElementById('temuanTaskId').value = '';
    document.getElementById('temuanTaskJudolSite').value = '';
    document.getElementById('temuanTaskDateDisplay').value = '';
    resetTemuanFormFields();
    renderTemuanQueue();
  }

  function openTemuanModal(id) {
    const task = allTasks.find((item) => item._id === id);
    if (!task) return;

    currentTemuanTask = task;
    temuanQueue = [];
    document.getElementById('temuanTaskId').value = task._id;
    document.getElementById('temuanTaskJudolSite').value = task.url || '';
    document.getElementById('temuanTaskDateDisplay').value = formatShortDate(task.taskDate);
    document.getElementById('temuanTaskStatus').value = String(task.statusSite !== false);
    document.getElementById('temuanTaskStatus').disabled = Boolean(task.replacementSiteId);
    document.getElementById('temuanReplacementUrl').value = task.replacementUrl || '';
    document.getElementById('temuanReplacementUrl').readOnly = Boolean(task.replacementSiteId);
    document.getElementById('temuanReplacementTitle').value = task.replacementTitle || (task.replacementSiteId ? task.title || '' : '');
    document.getElementById('temuanReplacementTitle').readOnly = Boolean(task.replacementSiteId);
    document.getElementById('temuanModalAlert').hidden = true;
    document.getElementById('temuanDuplicateAlert').hidden = true;
    duplicateCheckVersion++;
    updateReplacementFields();
    clearTimeout(duplicateCheckTimer);
    resetTemuanFormFields();
    updateTemuanTitleSitePreview();
    renderTemuanQueue();
    temuanModal.show();
  }

  async function addTemuanRow() {
    const type = document.getElementById('temuanType').value.trim();
    const bankName = document.getElementById('temuanBankName').value.trim();
    const identifierNo = document.getElementById('temuanIdentifierNo').value.trim();

    if (!type) {
      showTemuanError('Jenis wajib dipilih.');
      return;
    }

    if (!bankName) {
      showTemuanError('Nama bank wajib diisi.');
      return;
    }

    if (!identifierNo) {
      showTemuanError('Nomor wajib diisi.');
      return;
    }

    temuanQueue.push({
      type,
      bankName,
      identifierNo,
      fileName: buildTemuanFileName(getEffectiveTemuanTask(), { type, bankName, identifierNo })
    });
    document.getElementById('temuanModalAlert').hidden = true;
    const addedItem = { type, bankName, identifierNo };
    clearTimeout(duplicateCheckTimer);
    resetTemuanFormFields();
    renderTemuanQueue();
    await checkTemuanDuplicate(addedItem, true);
  }

  async function saveTemuanEntries() {
    if (!currentTemuanTask?.replacementSiteId && document.getElementById('temuanTaskStatus').value === 'false' &&
      document.getElementById('temuanReplacementUrl').value.trim() &&
      !document.getElementById('temuanReplacementTitle').value.trim()) {
      showTemuanError('Title domain pengganti wajib diisi.');
      return;
    }
    if (!currentTemuanTask) {
      showAlert('error', 'Task tidak ditemukan.');
      return;
    }

    if (!temuanQueue.length && document.getElementById('temuanTaskStatus').value === 'true') {
      showTemuanError('Tambahkan minimal satu data temuan.');
      return;
    }

    const saveButton = document.getElementById('saveTemuanBtn');
    let saved = false;
    saveButton.disabled = true;
    try {
      const response = await window.AppAuth.authFetch(`${API}/${currentTemuanTask._id}/temuan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          items: temuanQueue,
          statusSite: document.getElementById('temuanTaskStatus').value === 'true',
          replacementTitle: document.getElementById('temuanReplacementTitle').value.trim(),
          replacementUrl: document.getElementById('temuanTaskStatus').value === 'false'
            ? document.getElementById('temuanReplacementUrl').value.trim() : ''
        })
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || 'Gagal menyimpan data temuan.');
      }

      saved = true;
      temuanModal.hide();
      resetTemuanModal();
      await loadTasks();
      showAlert('success', result.message || 'Data temuan berhasil disimpan.');
    } catch (error) {
      if (saved) showAlert('error', 'Data sudah tersimpan, tetapi daftar task gagal dimuat. Muat ulang halaman.');
      else showTemuanError(error.message);
    } finally {
      saveButton.disabled = false;
    }
  }

  async function loadTasks() {
    const response = await window.AppAuth.authFetch(API);
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Gagal mengambil data task.');
    }

    allTasks = result;
    renderTasks();
  }

  async function loadDistributionAvailability() {
    const taskDate = document.getElementById('distributeTaskDate').value;
    const version = ++distributionAvailabilityVersion;
    distributionAvailabilityDate = '';
    updateDistributionSummary();
    if (!taskDate) return false;
    const response = await window.AppAuth.authFetch(`${API}/distribution/availability?taskDate=${encodeURIComponent(taskDate)}`);
    const result = await response.json();

    if (version !== distributionAvailabilityVersion || document.getElementById('distributeTaskDate').value !== taskDate) return false;

    if (!response.ok) {
      throw new Error(result.message || 'Gagal mengambil ketersediaan data distribute.');
    }

    availableDistributionCount = Number(result.availableCount) || 0;
    distributionAvailabilityDate = taskDate;
    updateDistributionSummary();
    return true;
  }

  function updateDistributionSummary() {
    const date = document.getElementById('distributeTaskDate').value;
    const ready = Boolean(date && distributionAvailabilityDate === date);
    const queuedCount = distributionQueue.filter(item => item.taskDate === date).reduce((sum, item) => sum + item.quantity, 0);
    const remaining = Math.max(0, availableDistributionCount - queuedCount);
    document.getElementById('distributionAvailableCount').textContent = ready ? String(availableDistributionCount) : '-';
    document.getElementById('distributionRemainingCount').textContent = ready ? String(remaining) : '-';
    document.getElementById('addDistributionRowBtn').disabled = !ready || distributionAdding || distributionSaving;
    document.getElementById('saveDistributionBtn').disabled = distributionAdding || distributionSaving || !distributionQueue.length;
    for (const id of ['distributeTaskDate', 'distributePicSelect', 'distributeQuantity']) {
      document.getElementById(id).disabled = distributionSaving;
    }
  }

  function showDistributionError(message) {
    const alert = document.getElementById('distributionAlert');
    alert.textContent = message;
    alert.hidden = false;
  }

  function renderDistributionQueue() {
    const queueBody = document.getElementById('distributionQueueBody');
    queueBody.innerHTML = '';

    if (!distributionQueue.length) {
      queueBody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">Belum ada data distribute.</td></tr>';
    } else {
      distributionQueue.forEach((item, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${formatShortDate(item.taskDate)}</td>
          <td>${escapeHtml(item.pic)}</td>
          <td>${item.quantity}</td>
          <td class="text-center">
            <button type="button" class="btn btn-sm btn-danger remove-distribution-row" data-index="${index}">
              <i class="fa fa-trash"></i>
            </button>
          </td>
        `;
        queueBody.appendChild(row);
      });
    }

    document.querySelectorAll('.remove-distribution-row').forEach((button) => {
      button.addEventListener('click', () => {
        if (distributionAdding || distributionSaving) return;
        distributionQueue.splice(Number(button.dataset.index), 1);
        renderDistributionQueue();
        updateDistributionSummary();
      });
    });
  }

  function resetDistributionFormFields() {
    document.getElementById('distributeQuantity').value = '';
    renderDistributePicOptions();
  }

  function resetDistributionModal() {
    distributionQueue = [];
    distributionAvailabilityVersion++;
    distributionAvailabilityDate = '';
    document.getElementById('distributeTaskDate').value = '';
    document.getElementById('distributionAlert').hidden = true;
    resetDistributionFormFields();
    renderDistributionQueue();
    updateDistributionSummary();
  }

  async function addDistributionRow() {
    if (distributionAdding || distributionSaving) return;
    const taskDate = document.getElementById('distributeTaskDate').value;
    const pic = String(document.getElementById('distributePicSelect').value || '').trim();
    const quantity = Number(document.getElementById('distributeQuantity').value);

    if (!taskDate) {
      showDistributionError('Tasklist Date distribute wajib diisi.');
      return;
    }

    if (!pic) {
      showDistributionError('PIC distribute wajib diisi.');
      return;
    }

    if (!distributeUserOptions.includes(pic)) {
      showDistributionError('PIC harus berasal dari user aktif.');
      return;
    }

    if (!Number.isInteger(quantity) || quantity <= 0) {
      showDistributionError('Jumlah task harus angka bulat lebih dari 0.');
      return;
    }

    distributionAdding = true;
    updateDistributionSummary();
    try {
      if (!await loadDistributionAvailability()) return;
      const remaining = availableDistributionCount - distributionQueue.filter(item => item.taskDate === taskDate).reduce((sum, item) => sum + item.quantity, 0);
      if (quantity > remaining) {
        showDistributionError(`Data untuk tanggal ${taskDate} tidak mencukupi. Sisa setelah antrean: ${Math.max(0, remaining)}, diminta: ${quantity}.`);
        return;
      }

      document.getElementById('distributionAlert').hidden = true;
      distributionQueue.push({ taskDate, pic, quantity });
      resetDistributionFormFields();
      renderDistributionQueue();
      updateDistributionSummary();
    } catch (error) {
      showDistributionError(error.message);
    } finally {
      distributionAdding = false;
      updateDistributionSummary();
    }
  }

  async function openDistributeModal() {
    if (distributionAdding || distributionSaving) return;
    if (!isAdmin) {
      showAlert('error', 'Distribute hanya bisa dilakukan admin.');
      return;
    }

    try {
      resetDistributionModal();
      renderDistributePicOptions();
      distributeModal.show();
    } catch (error) {
      showAlert('error', error.message);
    }
  }

  async function saveDistributedTasks() {
    if (distributionAdding || distributionSaving) return;
    if (!distributionQueue.length) {
      showDistributionError('Tambahkan minimal satu baris distribute.');
      return;
    }

    const saveButton = document.getElementById('saveDistributionBtn');
    distributionSaving = true;
    updateDistributionSummary();
    saveButton.disabled = true;
    let saved = false;
    try {
      const response = await window.AppAuth.authFetch(`${API}/distribute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          items: distributionQueue
        })
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || 'Gagal menyimpan distribusi task.');
      }

      saved = true;
      distributeModal.hide();
      resetDistributionModal();
      await loadTasks();
      showAlert('success', result.message || 'Distribusi task berhasil disimpan.');
    } catch (error) {
      if (saved) showAlert('error', 'Distribusi sudah tersimpan, tetapi daftar task gagal dimuat. Muat ulang halaman.');
      else {
        try { await loadDistributionAvailability(); } catch { /* Keep the original save error visible. */ }
        showDistributionError(error.message);
      }
    } finally {
      distributionSaving = false;
      updateDistributionSummary();
    }
  }

  async function saveTask() {
    const taskId = document.getElementById('taskId').value;
    const payload = {
      taskDate: document.getElementById('taskDate').value || null,
      pic: document.getElementById('taskPic').value.trim(),
      url: document.getElementById('taskUrl').value.trim(),
      title: document.getElementById('taskTitle').value.trim(),
      username: document.getElementById('taskUsername').value.trim(),
      password: document.getElementById('taskPassword').value.trim(),
      flagJudol: document.getElementById('taskFlagJudol').value === 'true',
      statusSite: document.getElementById('taskStatusSite').value === 'true'
    };

    if (!payload.url) {
      showAlert('error', 'Judol site wajib diisi.');
      return;
    }

    try {
      const response = await window.AppAuth.authFetch(taskId ? `${API}/${taskId}` : API, {
        method: taskId ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || 'Gagal menyimpan task.');
      }

      taskModal.hide();
      resetForm();
      await loadTasks();
      showAlert('success', taskId ? 'Task berhasil diperbarui.' : 'Task berhasil ditambahkan.');
    } catch (error) {
      showAlert('error', error.message);
    }
  }

  async function deleteTask() {
    if (!deleteTarget) return;

    try {
      const response = await window.AppAuth.authFetch(`${API}/${deleteTarget._id}`, {
        method: 'DELETE'
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Gagal menghapus task.');
      }

      deleteModal.hide();
      deleteTarget = null;
      await loadTasks();
      showAlert('success', 'Task berhasil dihapus.');
    } catch (error) {
      showAlert('error', error.message);
    }
  }

  function exportTasks() {
    const rows = getFilteredTasks().map((task, index) => ({
      No: index + 1,
      'Tasklist Date': task.taskDate ? new Date(task.taskDate) : '',
      PIC: task.pic || '',
      'Judol Site': task.url || '',
      'Title Judol': task.title || '',
      Username: task.username || '',
      Password: task.password || '',
      'Flag Judol': task.flagJudol ? 'Y' : 'N',
      Status: task.statusSite ? 'Active' : 'Inactive',
      'Last Update By': task.lastUpdatedBy || '',
      'Last Update Date': task.lastUpdateDate ? new Date(task.lastUpdateDate) : '',
      'Tanggal Temuan': task.tanggalTemuan ? new Date(task.tanggalTemuan) : ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Tasks');
    XLSX.writeFile(workbook, `task_data_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  document.getElementById('saveTaskBtn').addEventListener('click', saveTask);
  document.getElementById('confirmDeleteTaskBtn').addEventListener('click', deleteTask);
  document.getElementById('previewTaskUploadBtn').addEventListener('click', previewUploadFile);
  document.getElementById('confirmTaskUploadBtn').addEventListener('click', submitUpload);
  document.getElementById('addDistributionRowBtn').addEventListener('click', addDistributionRow);
  document.getElementById('saveDistributionBtn').addEventListener('click', saveDistributedTasks);
  document.getElementById('distributeTaskDate').addEventListener('change', async () => {
    document.getElementById('distributionAlert').hidden = true;
    try { await loadDistributionAvailability(); }
    catch (error) { showDistributionError(error.message); }
  });
  document.getElementById('addTemuanRowBtn').addEventListener('click', addTemuanRow);
  document.getElementById('saveTemuanBtn').addEventListener('click', saveTemuanEntries);
  document.getElementById('temuanTaskStatus').addEventListener('change', updateReplacementFields);
  document.getElementById('temuanReplacementUrl').addEventListener('input', updateReplacementFields);
  for (const id of ['temuanType', 'temuanBankName', 'temuanIdentifierNo']) {
    document.getElementById(id).addEventListener(id === 'temuanType' ? 'change' : 'input', scheduleDuplicateCheck);
  }
  document.getElementById('temuanType').addEventListener('change', updateTemuanTitleSitePreview);
  document.getElementById('temuanBankName').addEventListener('input', updateTemuanTitleSitePreview);
  document.getElementById('temuanIdentifierNo').addEventListener('input', updateTemuanTitleSitePreview);

  addButton.addEventListener('click', () => {
    resetForm();
    taskModal.show();
  });

  uploadButton.addEventListener('click', () => {
    document.getElementById('taskUploadFile').value = '';
    parsedUploadRows = [];
    uploadModal.show();
  });

  if (searchButton) {
    searchButton.addEventListener('click', () => {
      currentPage = 1;
      renderTasks();
    });
  }

  taskDateFilter.addEventListener('change', () => {
    currentPage = 1;
    renderTasks();
  });

  if (taskDateSortHeader) {
    taskDateSortHeader.addEventListener('click', () => {
      taskDateSortDirection = taskDateSortDirection === 'desc' ? 'asc' : 'desc';
      currentPage = 1;
      updateTaskSortHeader();
      renderTasks();
    });
  }

  picFilter.addEventListener('input', () => {
    currentPage = 1;
    renderTasks();
  });
  taskSiteFilter.addEventListener('input', () => {
    currentPage = 1;
    renderTasks();
  });

  resetButton.addEventListener('click', () => {
    taskDateFilter.value = isAdmin ? '' : getTodayDateInputValue();
    picFilter.value = '';
    taskSiteFilter.value = '';
    currentPage = 1;
    renderTasks();
  });

  prevPageButton.addEventListener('click', () => {
    currentPage -= 1;
    renderTasks();
  });

  nextPageButton.addEventListener('click', () => {
    currentPage += 1;
    renderTasks();
  });

  exportButton.addEventListener('click', () => {
    try {
      exportTasks();
    } catch (error) {
      showAlert('error', error.message || 'Gagal export data task.');
    }
  });

  distributeButton.addEventListener('click', openDistributeModal);

  if (!isAdmin) {
    addButton.style.display = 'none';
    uploadButton.style.display = 'none';
    exportButton.style.display = 'none';
    distributeButton.style.display = 'none';
    taskDateFilter.value = getTodayDateInputValue();
  }

  restoreTaskListState();
  updateTaskSortHeader();

  try {
    await loadPicOptions();
    await loadTasks();
  } catch (error) {
    showAlert('error', error.message);
  }
});
