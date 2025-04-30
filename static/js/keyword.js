document.addEventListener("DOMContentLoaded", function () {
  // Fetch navbar dynamically
  fetch('../static/navbar/navbar.html')
    .then(response => response.text())  // Convert the response to text
    .then(data => {
      document.querySelector('.sidebar').innerHTML = data;

      // Setelah navbar dimuat, kita bisa menambahkan event listener ke tombol toggle
      document.getElementById('toggleSidebarBtn').addEventListener('click', function () {
        const sidebar = document.querySelector('.sidebar');
        const content = document.getElementById('content');

        // Toggle collapsed class on sidebar and content
        sidebar.classList.toggle('collapsed');
        content.classList.toggle('collapsed');
      });

      // Menandai menu aktif berdasarkan URL saat ini
      const menuItems = document.querySelectorAll('.nav-link');
      const currentUrl = window.location.pathname.split('/').pop();  // Mendapatkan nama file dari URL saat ini

      menuItems.forEach(item => {
        const itemUrl = item.getAttribute('href').split('/').pop();  // Ambil nama file dari href

        // Menambahkan kelas 'active' jika path saat ini cocok dengan href menu
        if (itemUrl === currentUrl) {
          item.classList.add('active');
        }
      });
    })
    .catch(error => console.log('Error loading the navbar:', error));

  // Open Modal add keyword
  const addKeywordModal = new bootstrap.Modal(document.getElementById('addKeyword'))
  document.getElementById('openUploadBtn').addEventListener('click', () => addKeywordModal.show());

  document.getElementById('openUploadKeyword').addEventListener('click', () => {
    const uploadKeywordModal = new bootstrap.Modal(document.getElementById("uploadKeywordModal"));
    uploadKeywordModal.show();
  });


  // Helper function to display alert messages based on the action
  function showAlert(success, action, message = "") {
    const ok = document.getElementById("successAlert");
    const no = document.getElementById("errorAlert");

    const successEl = document.getElementById("successMessage");
    const errorEl = document.getElementById("errorMessage");

    if (success) {
      successEl.textContent = message || getDefaultMessage(true, action);
      ok.style.display = 'block';
      no.style.display = 'none';
    } else {
      errorEl.textContent = message || getDefaultMessage(false, action);
      no.style.display = 'block';
      ok.style.display = 'none';
    }

    setTimeout(() => {
      ok.style.display = 'none';
      no.style.display = 'none';
    }, 2000);
  }

  // Helper to fallback to default messages
  function getDefaultMessage(success, action) {
    const messages = {
      add: ["Add Keyword Success", "Failed to Add Keyword"],
      upload: ["Upload URL Success", "Failed to Upload URL"],
      edit: ["Edit URL Success", "Failed to Edit URL"],
      delete: ["Delete URL Success", "Failed to Delete URL"],
      blocked: ["Rekening berhasil diblokir", "Rekening gagal diblokir"]
    };

    return messages[action]?.[success ? 0 : 1] || (success ? "Success" : "Failed");
  }


  // flatpickr init (jika perlu)
  flatpickr("#date-blocked", {
    mode: "range",
    dateFormat: "m/d/Y",
  });

  let tableData = [];
  let selectedRowId = null;
  let parsedKeywordData = [];
  let selectedDeleteId = null;

  document.querySelector("button.btn-primary").addEventListener("click", function () {
    const query = document.getElementById("search").value.toLowerCase();
    const rows = document.querySelectorAll("table tbody tr");

    rows.forEach((row) => {
      const keywordCell = row.cells[1]; // Kolom ke-2 adalah keyword
      const keywordText = keywordCell.textContent.toLowerCase();

      row.style.display = keywordText.includes(query) ? "" : "none";
    });
  });

  document.getElementById("resetFilter").addEventListener("click", function () {
    // Kosongkan input pencarian
    document.getElementById("search").value = "";

    // Tampilkan semua baris di tabel
    const rows = document.querySelectorAll("table tbody tr");
    rows.forEach((row) => {
      row.style.display = "";
    });
  });


  async function fetchKeywordData() {
    try {
      const response = await fetch('/api/keyword');
      const data = await response.json();
      tableData = data.map((item, index) => ({
        ...item,
        no: index + 1
      }));
      populateTable();
    } catch (error) {
      console.error('Gagal mengambil data keyword:', error);
    }
  }

  function populateTable() {
    const tbody = document.querySelector("table tbody");
    tbody.innerHTML = "";

    tableData.forEach((item) => {
      const row = document.createElement("tr");

      row.innerHTML = `
      <td>${item.no}</td>
      <td>${item.keyword}</td>
      <td>
        <button class="btn btn-sm btn-warning edit-btn" data-id="${item._id}">
          <i class="fa fa-pencil" aria-hidden="true"></i>
        </button>
        <button class="btn btn-sm btn-danger delete-btn" data-id="${item._id}">
          <i class="fa fa-trash" aria-hidden="true"></i>
        </button>
      </td>

    `;
      tbody.appendChild(row);
    });

    bindActionButtons();
  }

  function bindActionButtons() {
    document.querySelectorAll(".edit-btn").forEach(btn => {
      btn.addEventListener("click", function () {
        const id = this.dataset.id;
        const item = tableData.find(d => d._id === id);
        if (item) {
          selectedRowId = id;
          document.getElementById("keyword").value = item.keyword;

          const modal = new bootstrap.Modal(document.getElementById("editKeywordModal"));
          modal.show();
        }
      });
    });

    document.querySelectorAll(".delete-btn").forEach(btn => {
      btn.addEventListener("click", function () {
        selectedDeleteId = this.dataset.id;
        const deleteModal = new bootstrap.Modal(document.getElementById("confirmDeleteModal"));
        deleteModal.show();
      });
    });
  }

  // Handler konfirmasi delete
  document.getElementById("confirmDeleteBtn").addEventListener("click", async () => {
    if (!selectedDeleteId) return;

    try {
      const res = await fetch(`/api/keyword/${selectedDeleteId}`, { method: "DELETE" });
      const result = await res.json();

      if (res.ok) {
        showAlert(true, "delete", result.message);
        await  fetchKeywordData(); // reload data table
      } else {
        showAlert(false, "delete", result.message);
      }
    } catch (err) {
      console.error("Delete error:", err);
      showAlert(false, "delete", "Gagal menghapus keyword");
    }

    selectedDeleteId = null;
    const deleteModal = bootstrap.Modal.getInstance(document.getElementById("confirmDeleteModal"));
    deleteModal.hide();
  });

  document.getElementById("submitKeyword").addEventListener("click", async function () {
    const keywordInput = document.getElementById("keyword");
    const keywordValue = keywordInput.value.trim();

    if (!keywordValue) {
      showAlert(false, "add", "Keyword tidak boleh kosong!");
      return;
    }

    try {
      const response = await fetch("/api/keyword", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ keyword: keywordValue })
      });

      const result = await response.json();

      const modal = bootstrap.Modal.getInstance(document.getElementById("addKeyword"));
      modal.hide();

      if (response.ok) {
        showAlert(true, "add", result.message || "Keyword berhasil ditambahkan");
        keywordInput.value = "";
        await fetchKeywordData(); // optional: refresh table list
      } else {
        showAlert(false, "add", result.message || "Gagal menambahkan keyword");
      }

    } catch (error) {
      console.error("Error submit keyword:", error);
      showAlert(false, "add", "Terjadi error saat menambahkan keyword");
    }
  });

  // Fungsi untuk submit perubahan keyword
  document.getElementById("saveKeywordBtn").addEventListener("click", async () => {
    const keywordInput = document.getElementById("keyword").value.trim();
    if (!keywordInput) {
      alert("Keyword tidak boleh kosong!");
      return;
    }

    try {
      const response = await fetch(`/api/keyword/${selectedRowId}`, {
        method: 'PUT',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword: keywordInput })
      });

      const result = await response.json();

      if (response.ok) {
        showAlert(true, "edit", result.message);
        await fetchKeywordData();
        const modal = bootstrap.Modal.getInstance(document.getElementById("editKeywordModal"));
        modal.hide();
      } else {
        showAlert(false, "edit", result.message || "Gagal update keyword");
      }
    } catch (error) {
      console.error("Gagal update:", error);
      showAlert(false, "edit", "Terjadi kesalahan saat update keyword");
    }
  });

  // Trigger saat klik "Submit" pada modal upload
  document.getElementById("submitPreviewModal").addEventListener("click", function () {
    const fileInput = document.getElementById("uploadKeywordFile");
    const file = fileInput.files[0];

    if (!file) {
      alert("Please select a file first.");
      return;
    }

    const reader = new FileReader();

    reader.onload = function (e) {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(sheet, { defval: "" });

      // Validasi kolom wajib
      const firstRow = json[0] || {};
      if (!("Keyword" in firstRow)) {
        alert("Kolom 'Keyword' wajib ada di file.");
        return;
      }

      // Simpan data global
      parsedKeywordData = json.map(row => ({
        keyword: row.Keyword.trim()
      }));

      // Tampilkan preview
      showPreviewKeywordTable(parsedKeywordData);
      new bootstrap.Modal(document.getElementById("previewKeywordModal")).show();
    };

    reader.readAsArrayBuffer(file);
  });

  function showPreviewKeywordTable(data) {
    const container = document.getElementById("previewKeywordTableContainer");
    container.innerHTML = "";

    if (!data.length) {
      container.innerHTML = "<p>No data to preview.</p>";
      return;
    }

    const table = document.createElement("table");
    table.className = "table table-bordered table-striped";

    const thead = document.createElement("thead");
    const headRow = document.createElement("tr");
    Object.keys(data[0]).forEach(key => {
      const th = document.createElement("th");
      th.textContent = key;
      headRow.appendChild(th);
    });
    thead.appendChild(headRow);
    table.appendChild(thead);

    const tbody = document.createElement("tbody");
    data.slice(0, 5).forEach(row => {
      const tr = document.createElement("tr");
      Object.values(row).forEach(val => {
        const td = document.createElement("td");
        td.textContent = val || "-";
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);

    container.appendChild(table);
  }


  document.getElementById("confirmKeywordUploadBtn").addEventListener("click", async function () {
    if (!parsedKeywordData || parsedKeywordData.length === 0) {
      alert("Tidak ada data untuk dikirim.");
      return;
    }

    try {
      const res = await fetch("/api/keyword/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: parsedKeywordData })
      });

      const result = await res.json();
      const modal = bootstrap.Modal.getInstance(document.getElementById("previewKeywordModal"));
      const uploadKeyModal = bootstrap.Modal.getInstance(document.getElementById("uploadKeywordModal"));

      modal.hide();
      uploadKeyModal.hide()

      if (res.ok) {
        showAlert(true, "upload", result.message || "Upload keyword berhasil.");
        await fetchKeywordData();

      } else {
        showAlert(false, "upload", result.message || "Upload gagal.");

      }
    } catch (error) {
      console.error("Error upload keyword:", error);
      showAlert(false, "upload", "Terjadi kesalahan saat upload.");
    }
  });


  fetchKeywordData();



});
