document.addEventListener('DOMContentLoaded', function () {
  // Fetch navbar dynamically
  fetch('/navbar')
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

  // 1) Inisialisasi instance modal
  const addModal = new bootstrap.Modal(document.getElementById('addUrl'));
  const uploadModal = new bootstrap.Modal(document.getElementById('uploadUrl'));
  const editModal = new bootstrap.Modal(document.getElementById('editUrlModal'));
  const deleteModal = new bootstrap.Modal(document.getElementById('deleteUrlModal'))

  // 2) Tombol untuk membuka masing‑masing modal
  document.getElementById('openAddBtn').addEventListener('click', () => addModal.show());
  document.getElementById('openUploadBtn').addEventListener('click', () => uploadModal.show());


  //Save data URL Baru
  document.getElementById("saveButton").addEventListener("click", async function () {
    const url = document.getElementById("url").value.trim();
    const uid = document.getElementById("addUid").value.trim();
    const password = document.getElementById("password").value.trim();

    if (!url || !uid || !password) {
      showAlert(false, "add"); // tampilkan alert gagal
      return;
    }

    const newData = {
      url,
      uid,
      password,
      inputBy: "User",
      flagSystem: null,
      flagUser: true,
      webStatus: "Active",
      firstCrawl: null,
      lastCrawl: null,
      lastUpdate: new Date(),
      crawlStatus: false
    };

    try {
      const res = await fetch('/api/urls', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newData)
      });

      if (!res.ok) throw new Error("Gagal simpan data.");

      // Reset form input
      document.getElementById("url").value = "";
      document.getElementById("addUid").value = "";
      document.getElementById("password").value = "";

      // Tutup modal
      const addModal = bootstrap.Modal.getInstance(document.getElementById("addUrl"));
      addModal.hide();

      // Alert sukses
      showAlert(true, "add");
      await fetchData(); // Refresh data

    } catch (err) {
      console.error("Error tambah URL:", err);
      showAlert(false, "add");
    }
  });


  // Helper function to display alert messages based on the action
  function showAlert(success, action, customMessage = null) {
    const ok = document.getElementById("successAlert");
    const no = document.getElementById("errorAlert");
  
    if (customMessage) {
      if (success) {
        document.getElementById("successMessage").textContent = customMessage;
      } else {
        document.getElementById("errorMessage").textContent = customMessage;
      }
    } else {
      // Default message kalau tidak ada custom
      if (action === "add") {
        if (success) {
          document.getElementById("successMessage").textContent = "Add New URL Success";
        } else {
          document.getElementById("errorMessage").textContent = "Failed to Add URL";
        }
      } else if (action === "upload") {
        if (success) {
          document.getElementById("successMessage").textContent = "Upload URL Success";
        } else {
          document.getElementById("errorMessage").textContent = "Failed to Upload URL";
        }
      } else if (action === "edit") {
        if (success) {
          document.getElementById("successMessage").textContent = "Edit URL Success";
        } else {
          document.getElementById("errorMessage").textContent = "Failed to Edit URL";
        }
      } else if (action === "delete") {
        if (success) {
          document.getElementById("successMessage").textContent = "Delete URL Success";
        } else {
          document.getElementById("errorMessage").textContent = "Failed to Delete URL";
        }
      } else if (action === "export") {
        if (success) {
          document.getElementById("successMessage").textContent = "Export Data Success";
        } else {
          document.getElementById("errorMessage").textContent = "Export Data Failed";
        }
      }
    }
  
    if (success) {
      ok.style.display = 'block';
      no.style.display = 'none';
    } else {
      no.style.display = 'block';
      ok.style.display = 'none';
    }
  
    setTimeout(() => {
      ok.style.display = 'none';
      no.style.display = 'none';
    }, 3000);
  }
  

  // flatpickr init (jika perlu)
  flatpickr("#last-crawling", {
    mode: "range",
    dateFormat: "m/d/Y",
  });


  let tableData = [];
  let currentPage = 1;
  const pageSize = 10;
  let selectedRowId = null;
  let filteredData = []; // data yang ditampilkan setelah filter/search


  // Ambil data dari API dan render
  async function fetchData() {
    try {
      const res = await fetch('/api/urls');
      tableData = await res.json();
      filteredData = [...tableData]; // default semua data
      renderTable();
      renderPagination();
    } catch (err) {
      console.error('Gagal ambil data:', err);
    }
  }

  function renderTable() {
    const tbody = document.querySelector("table tbody");
    tbody.innerHTML = "";
  
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    const currentData = filteredData.slice(start, end);
  
    if (currentData.length === 0) {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td colspan="12" class="text-center text-muted">No matching records found</td>
      `;
      tbody.appendChild(row);
      return; // langsung berhenti di sini kalau kosong
    }
  
    currentData.forEach((item, index) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${start + index + 1}</td>
        <td><a href="#">${item.url}</a></td>
        <td>${item.inputBy || ''}</td>
        <td>${item.flagUser === true ? 'Y' : item.flagUser === false ? 'N' : ''}</td>
        <td>${item.webStatus || ''}</td>
        <td>${item.uid || ''}</td>
        <td>${item.password || ''}</td>
        <td>${formatDate(item.firstCrawl)}</td>
        <td>${formatDate(item.lastCrawl)}</td>
        <td>${formatDate(item.lastUpdate)}</td>
        <td><span class="badge ${item.crawlStatus ? 'bg-success' : 'bg-danger'}">${item.crawlStatus ? 'Success' : 'Failed'}</span></td>
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
  

  function formatDate(dateStr) {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString("en-US");
  }

  function renderPagination() {
    const totalPages = Math.ceil(filteredData.length / pageSize);
    const paginationContainer = document.getElementById("pagination");
    if (!paginationContainer) return;
  
    paginationContainer.innerHTML = '';
  
    // Prev Button
    const prevBtn = document.createElement("button");
    prevBtn.innerHTML = `<i class="fa fa-angle-left"></i>`;
    prevBtn.className = `btn btn-sm mx-1 ${currentPage === 1 ? 'btn-outline-secondary disabled' : 'btn-outline-primary'}`;
    prevBtn.disabled = currentPage === 1;
    prevBtn.addEventListener("click", () => {
      if (currentPage > 1) {
        currentPage--;
        renderTable();
        renderPagination();
      }
    });
    paginationContainer.appendChild(prevBtn);
  
    // Page Info
    const pageInfo = document.createElement("span");
    pageInfo.className = 'mx-2';
    pageInfo.textContent = `Page ${currentPage} of ${totalPages || 1}`;
    paginationContainer.appendChild(pageInfo);
  
    // Next Button
    const nextBtn = document.createElement("button");
    nextBtn.innerHTML = `<i class="fa fa-angle-right"></i>`;
    nextBtn.className = `btn btn-sm mx-1 ${currentPage === totalPages || totalPages === 0 ? 'btn-outline-secondary disabled' : 'btn-outline-primary'}`;
    nextBtn.disabled = currentPage === totalPages || totalPages === 0;
    nextBtn.addEventListener("click", () => {
      if (currentPage < totalPages) {
        currentPage++;
        renderTable();
        renderPagination();
      }
    });
    paginationContainer.appendChild(nextBtn);
  }
  

  function bindActionButtons() {
    document.querySelectorAll(".edit-btn").forEach(btn => {
      btn.addEventListener("click", async function () {
        const id = this.dataset.id;
        selectedRowId = id;

        try {
          const res = await fetch(`/api/urls/${id}`);
          const item = await res.json();

          document.getElementById("editUrl").value = item.url || '';
          document.getElementById("editClassification").value =
            item.flagUser === "true" || item.flagUser === true ? "Y" :
              item.flagUser === "false" || item.flagUser === false ? "N" : '';

          document.getElementById("editWebStatus").value = item.webStatus || '';
          document.getElementById("editUid").value = item.uid || '';
          document.getElementById("editPassword").value = item.password || '';

          const editModalInstance = new bootstrap.Modal(document.getElementById("editUrlModal"));
          editModalInstance.show();
        } catch (err) {
          console.error("Gagal ambil data untuk edit:", err);
          console.log("Ambil data ID:", id); // tambahkan ini untuk debug

        }
      });
    });

    document.querySelectorAll(".delete-btn").forEach(btn => {
      btn.addEventListener("click", function () {
        selectedRowId = this.dataset.id;

        const deleteModalInstance = new bootstrap.Modal(document.getElementById("deleteUrlModal"));
        deleteModalInstance.show();
      });
    });

  }

  function handleSearch() {
    const keyword = document.getElementById("search").value.toLowerCase();
    const classification = document.getElementById("classification").value;
    const webStatus = document.getElementById("web-status").value;
    const uid = document.getElementById("uid").value;
    const dateRange = document.getElementById("last-crawling").value.trim();
  
    console.log("🔎 Start Search");
    console.log("Keyword:", keyword);
    console.log("Classification:", classification);
    console.log("WebStatus:", webStatus);
    console.log("UID:", uid);
    console.log("Date Range Input:", dateRange);
  
    // Parse tanggal
    let startDate = null;
    let endDate = null;
    if (dateRange) {
      let separator = '-';
      if (dateRange.includes('to')) separator = 'to';
  
      const [startStr, endStr] = dateRange.split(separator).map(d => d.trim());
      const startParts = startStr.split('/');
      const endParts = endStr.split('/');
  
      startDate = new Date(+startParts[2], +startParts[0] - 1, +startParts[1]);
      endDate = new Date(+endParts[2], +endParts[0] - 1, +endParts[1]);
  
    }
  
    filteredData = tableData.filter(item => {
      const urlMatch = (item.url || '').toLowerCase().includes(keyword);
      const inputByMatch = (item.inputBy || '').toLowerCase().includes(keyword);
      const uidMatchKeyword = (item.uid || '').toLowerCase().includes(keyword);
  
      const flagUserMatch = (() => {
        if (keyword === 'true') return item.flagUser === true;
        if (keyword === 'false') return item.flagUser === false;
        return true;
      })();
  
      const classificationMatch = !classification || item.flagUser === classification;
      const webStatusMatch = !webStatus || item.webStatus === webStatus;
      const uidMatchSelect = !uid || item.uid === uid;
  
      let dateMatch = true;
      if (startDate && endDate) {
        if (item.lastCrawl) {
          const lastCrawling = new Date(item.lastCrawl);
          const lastCrawlingOnly = new Date(lastCrawling.getFullYear(), lastCrawling.getMonth(), lastCrawling.getDate());
  
          dateMatch = lastCrawlingOnly >= startDate && lastCrawlingOnly <= endDate;
        } else {
          dateMatch = false;
        }
      }
  
      const finalMatch = (
        (urlMatch || inputByMatch || uidMatchKeyword) &&
        classificationMatch &&
        webStatusMatch &&
        uidMatchSelect &&
        flagUserMatch &&
        dateMatch
      );
  
  
      return finalMatch;
    });
  
    console.log("Filtered Data (after search):", filteredData);
  
    currentPage = 1;
    renderTable();
    renderPagination();
  }
  

  //Reset Button
  document.querySelector('.resetButton').addEventListener('click', () => {
    document.getElementById('search').value = '';
    document.getElementById('classification').selectedIndex = 0;
    document.getElementById('web-status').selectedIndex = 0;
    document.getElementById('uid').selectedIndex = 0;
    document.getElementById('last-crawling').value = '';

    filteredData = [...tableData];
    currentPage = 1;
    renderTable();
    renderPagination();
  });

  // Ubah data saat Save Edit
  document.getElementById("saveEditUrl").addEventListener("click", async function () {
    if (!selectedRowId) return;

    const url = document.getElementById("editUrl").value.trim();
    const flagUser = document.getElementById("editClassification").value;
    const webStatus = document.getElementById("editWebStatus").value;
    const uid = document.getElementById("editUid").value.trim();
    const password = document.getElementById("editPassword").value.trim();

    if (!url || !flagUser || !webStatus || !uid || !password) {
      showAlert(false, "edit");
      return;
    }

    const updatedData = {
      url,
      uid,
      password,
      webStatus,
      flagUser: flagUser === "Y" ? true : false,
      lastUpdate: new Date()
    };

    try {
      const res = await fetch(`/api/urls/${selectedRowId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(updatedData)
      });

      if (!res.ok) throw new Error("Gagal update data");

      const editModal = bootstrap.Modal.getInstance(document.getElementById("editUrlModal"));
      editModal.hide();

      showAlert(true, "edit");
      await fetchData(); // Refresh tabel
    } catch (err) {
      console.error("Gagal update URL:", err);
      showAlert(false, "edit");
    }
  });


  // Hapus data saat Confirm Delete
  document.getElementById("confirmDelete").addEventListener("click", async function () {
    if (!selectedRowId) return;

    try {
      const res = await fetch(`/api/urls/${selectedRowId}`, {
        method: "DELETE"
      });

      if (!res.ok) throw new Error("Gagal hapus URL");

      // Tutup modal
      const modal = bootstrap.Modal.getInstance(document.getElementById("deleteUrlModal"));
      modal.hide();

      showAlert(true, "delete");
      currentPage = 1; // ⬅️ Reset ke halaman pertama
      await fetchData(); // refresh data dari server

    } catch (err) {
      console.error("Gagal hapus data:", err);
      showAlert(false, "delete");
    }
  });

  document.getElementById("exportData").addEventListener("click", async function () {
    const exportBtn = document.getElementById("exportData");
    const exportLoading = document.getElementById("exportLoading");
  
    exportLoading.style.display = "inline-block"; // Tampilkan loading
    exportBtn.disabled = true;
  
    try {
      console.log('Mau fetch export data...'); // Log fetch trigger
  
      const response = await fetch('/api/url/export', {
        method: 'GET'
      });
  
      if (!response.ok) {
        throw new Error('Gagal export dari server.');
      }
  
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `crawl_data_export_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
  
      showAlert(true, "export");
  
    } catch (error) {
      console.error('Export error:', error);
      alert('Gagal export data dari server.');
      showAlert(false, "export");
    } finally {
      // Set timeout untuk menghilangkan spinner setelah beberapa detik, meskipun proses selesai
      setTimeout(() => {
        exportLoading.style.display = "none";  // Sembunyikan spinner
        exportBtn.disabled = false;            // Aktifkan kembali tombol export
      }, 2000); // Menunggu selama 2 detik
    }
  });

  


  document.getElementById("submitUrl").addEventListener("click", async function () {
    const fileInput = document.getElementById("uploadUrlFile");
    const file = fileInput.files[0];
  
    if (!file) {
      showAlert(false, "upload", "No file selected!");
      return;
    }
  
    const allowedTypes = ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel', 'text/csv'];
    if (!allowedTypes.includes(file.type)) {
      showAlert(false, "upload", "Only .xlsx or .csv files are allowed!");
      return;
    }
  
    const reader = new FileReader();
  
    reader.onload = async function (e) {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
  
        const requiredColumns = ["URL", "Input By", "Judul (flagUser)", "Status", "UID", "Password", "Crawling Status"];
        const sheetColumns = Object.keys(rows[0] || {});
  
        const missingColumns = requiredColumns.filter(col => !sheetColumns.includes(col));
        if (missingColumns.length > 0) {
          showAlert(false, "upload", "Missing columns: " + missingColumns.join(", "));
          return;
        }
  
        const formatted = rows.map(row => ({
          url: row.URL || "",
          uid: row.UID || "",
          password: row.Password || "",
          inputBy: row["Input By"] || "User",
          flagUser: row["Judul (flagUser)"] === "Y",
          flagSystem: false,
          webStatus: row.Status || "Active",
          firstCrawl: null,
          lastCrawl: null,
          lastUpdate: new Date(),
          crawlStatus: row["Crawling Status"] === "Success"
        }));
  
        const res = await fetch('/api/urls/bulk', {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data: formatted })
        });
  
        const result = await res.json();
  
        const modal = bootstrap.Modal.getInstance(document.getElementById("uploadUrl"));
        modal.hide();
  
        if (res.ok) {
          showAlert(true, "upload", result.message || "Upload URL Success");
          await fetchData();
        } else {
          showAlert(false, "upload", result.message || "Failed to Upload URL");
        }
  
      } catch (err) {
        console.error("Upload error:", err);
        showAlert(false, "upload", "Unexpected error during upload");
      }
    };
  
    reader.readAsArrayBuffer(file);
  });
  

  // Inisialisasi
  fetchData();

  document.querySelector('.btn-primary').addEventListener('click', handleSearch);

});
