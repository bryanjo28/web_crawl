document.addEventListener('DOMContentLoaded', async function () {
  const currentUser = await window.AppAuth.initPage();

  const API = '/api/tasks';
  const PAGE_SIZE = 10;

  const taskDateFilter = document.getElementById('taskDateFilter');
  const picFilter = document.getElementById('picFilter');
  const searchButton = document.getElementById('searchButton');
  const addButton = document.getElementById('openAddTaskModal');
  const exportButton = document.getElementById('exportTaskData');
  const distributeButton = document.getElementById('distributeTaskButton');
  const resetButton = document.querySelector('.resetButton');
  const tbody = document.querySelector('table tbody');
  const paginationInfo = document.getElementById('pagination-info');
  const prevPageButton = document.getElementById('prev-page');
  const nextPageButton = document.getElementById('next-page');
  const selectAllTasks = document.getElementById('selectAllTasks');
  const successAlert = document.getElementById('successAlert');
  const errorAlert = document.getElementById('errorAlert');
  const successMessage = document.getElementById('successMessage');
  const errorMessage = document.getElementById('errorMessage');
  const isAdmin = currentUser.role === 'admin';

  let allTasks = [];
  let picOptions = [];
  let currentPage = 1;
  let deleteTarget = null;
  let selectedTaskIds = new Set();

  injectModals();

  const taskModal = new bootstrap.Modal(document.getElementById('taskModal'));
  const deleteModal = new bootstrap.Modal(document.getElementById('deleteTaskModal'));
  const distributeModal = new bootstrap.Modal(document.getElementById('distributeTaskModal'));

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
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Distribute Task</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
              <div class="mb-3">
                <label for="distributePic" class="form-label">PIC</label>
                <select class="form-select" id="distributePic"></select>
              </div>
              <div class="text-muted small">
                Task terpilih: <span id="selectedTaskCount">0</span>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
              <button type="button" class="btn btn-warning" id="confirmDistributeTaskBtn">Distribute</button>
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

  function getFilteredTasks() {
    const taskDate = taskDateFilter.value;
    const pic = picFilter.value.trim().toLowerCase();

    return allTasks.filter((task) => {
      const matchesTaskDate =
        !taskDate || toDateInputValue(task.taskDate) === taskDate;

      const matchesPic =
        !pic || (task.pic || '').toLowerCase().includes(pic);

      return matchesTaskDate && matchesPic;
    });
  }

  function ensurePageWithinRange(totalItems) {
    const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;
    return totalPages;
  }

  function renderTasks() {
    const tasks = getFilteredTasks();
    const totalPages = ensurePageWithinRange(tasks.length);
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    const pagedTasks = tasks.slice(startIndex, startIndex + PAGE_SIZE);

    tbody.innerHTML = '';

    if (!pagedTasks.length) {
      tbody.innerHTML = `<tr><td colspan="${isAdmin ? 13 : 12}" class="text-center text-muted">Tidak ada data task.</td></tr>`;
    } else {
      pagedTasks.forEach((task, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${startIndex + index + 1}</td>
          <td>${formatShortDate(task.taskDate)}</td>
          <td>${task.pic || '-'}</td>
          <td>${task.url || '-'}</td>
          <td>${task.title || '-'}</td>
          <td>${task.username || '-'}</td>
          <td>${task.password || '-'}</td>
          <td>${task.flagJudol ? 'Y' : 'N'}</td>
          <td>${task.statusSite ? 'Active' : 'Inactive'}</td>
          <td>${task.lastUpdatedBy || '-'}</td>
          <td>${formatDate(task.lastUpdateDate)}</td>
          <td>
            <button class="btn btn-sm btn-warning me-1 edit-task-btn" data-id="${task._id}">
              <i class="fa fa-pencil"></i>
            </button>
            <button class="btn btn-sm btn-danger delete-task-btn" data-id="${task._id}">
              <i class="fa fa-trash"></i>
            </button>
          </td>
          <td class="text-center" style="${isAdmin ? '' : 'display:none;'}">
            <input type="checkbox" class="task-select-checkbox" data-id="${task._id}" ${selectedTaskIds.has(task._id) ? 'checked' : ''} />
          </td>
        `;
        tbody.appendChild(tr);
      });
    }

    paginationInfo.textContent = `Page ${currentPage} of ${totalPages}`;
    prevPageButton.disabled = currentPage <= 1;
    nextPageButton.disabled = currentPage >= totalPages;

    document.querySelectorAll('.edit-task-btn').forEach((button) => {
      button.addEventListener('click', () => openEditModal(button.dataset.id));
    });

    document.querySelectorAll('.delete-task-btn').forEach((button) => {
      button.addEventListener('click', () => openDeleteModal(button.dataset.id));
    });

    document.querySelectorAll('.task-select-checkbox').forEach((checkbox) => {
      checkbox.addEventListener('change', () => {
        if (checkbox.checked) {
          selectedTaskIds.add(checkbox.dataset.id);
        } else {
          selectedTaskIds.delete(checkbox.dataset.id);
        }
        syncSelectAllCheckbox();
      });
    });

    syncSelectAllCheckbox();
  }

  function resetForm() {
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
      options.push(`<option value="${pic}" ${isSelected}>${pic}</option>`);
    });

    return options.join('');
  }

  function populatePicSelects(selectedTaskPic = '', selectedDistributePic = '') {
    document.getElementById('taskPic').innerHTML = buildPicSelectOptions(selectedTaskPic, true);
    document.getElementById('distributePic').innerHTML = buildPicSelectOptions(selectedDistributePic, true);
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
    } else {
      picOptions = [currentUser.fullName || currentUser.name].filter(Boolean);
    }

    picOptions = Array.from(new Set(picOptions)).sort((a, b) => a.localeCompare(b, 'id'));
    populatePicSelects();
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
    taskModal.show();
  }

  function openDeleteModal(id) {
    const task = allTasks.find((item) => item._id === id);
    if (!task) return;

    deleteTarget = task;
    document.getElementById('deleteTaskName').textContent = task.url || '-';
    deleteModal.show();
  }

  async function loadTasks() {
    const response = await window.AppAuth.authFetch(API);
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Gagal mengambil data task.');
    }

    allTasks = result;
    selectedTaskIds = new Set([...selectedTaskIds].filter((id) => allTasks.some((task) => task._id === id)));
    renderTasks();
  }

  function syncSelectAllCheckbox() {
    const visibleCheckboxes = Array.from(document.querySelectorAll('.task-select-checkbox'));
    if (!visibleCheckboxes.length) {
      selectAllTasks.checked = false;
      selectAllTasks.indeterminate = false;
      return;
    }

    const checkedCount = visibleCheckboxes.filter((checkbox) => checkbox.checked).length;
    selectAllTasks.checked = checkedCount === visibleCheckboxes.length;
    selectAllTasks.indeterminate = checkedCount > 0 && checkedCount < visibleCheckboxes.length;
  }

  function openDistributeModal() {
    if (!isAdmin) {
      showAlert('error', 'Distribute hanya untuk admin.');
      return;
    }

    if (!selectedTaskIds.size) {
      showAlert('error', 'Pilih minimal satu task untuk didistribusikan.');
      return;
    }

    document.getElementById('distributePic').innerHTML = buildPicSelectOptions('', true);
    document.getElementById('selectedTaskCount').textContent = String(selectedTaskIds.size);
    distributeModal.show();
  }

  async function distributeTasks() {
    const pic = document.getElementById('distributePic').value.trim();

    if (!pic) {
      showAlert('error', 'PIC wajib diisi.');
      return;
    }

    try {
      const response = await window.AppAuth.authFetch(`${API}/distribute`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          taskIds: Array.from(selectedTaskIds),
          pic
        })
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Gagal distribute task.');
      }

      distributeModal.hide();
      selectedTaskIds.clear();
      await loadTasks();
      showAlert('success', result.message || 'Task berhasil didistribusikan.');
    } catch (error) {
      showAlert('error', error.message);
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
      TasklistDate: task.taskDate ? new Date(task.taskDate) : '',
      PIC: task.pic || '',
      JudolSite: task.url || '',
      TitleJudol: task.title || '',
      Username: task.username || '',
      Password: task.password || '',
      FlagJudol: task.flagJudol ? 'Y' : 'N',
      Status: task.statusSite ? 'Active' : 'Inactive',
      LastUpdateBy: task.lastUpdatedBy || '',
      LastUpdateDate: task.lastUpdateDate ? new Date(task.lastUpdateDate) : ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Tasks');
    XLSX.writeFile(workbook, `task_data_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  document.getElementById('saveTaskBtn').addEventListener('click', saveTask);
  document.getElementById('confirmDeleteTaskBtn').addEventListener('click', deleteTask);
  document.getElementById('confirmDistributeTaskBtn').addEventListener('click', distributeTasks);

  addButton.addEventListener('click', () => {
    resetForm();
    taskModal.show();
  });

  searchButton.addEventListener('click', () => {
    currentPage = 1;
    renderTasks();
  });

  taskDateFilter.addEventListener('change', () => {
    currentPage = 1;
    renderTasks();
  });

  picFilter.addEventListener('input', () => {
    currentPage = 1;
    renderTasks();
  });

  resetButton.addEventListener('click', () => {
    taskDateFilter.value = '';
    picFilter.value = '';
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

  selectAllTasks.addEventListener('change', () => {
    document.querySelectorAll('.task-select-checkbox').forEach((checkbox) => {
      checkbox.checked = selectAllTasks.checked;
      if (selectAllTasks.checked) {
        selectedTaskIds.add(checkbox.dataset.id);
      } else {
        selectedTaskIds.delete(checkbox.dataset.id);
      }
    });

    syncSelectAllCheckbox();
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
    distributeButton.style.display = 'none';
    selectAllTasks.closest('th').style.display = 'none';
  }

  try {
    await loadPicOptions();
    await loadTasks();
  } catch (error) {
    showAlert('error', error.message);
  }
});
