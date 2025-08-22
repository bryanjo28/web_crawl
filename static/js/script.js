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
  const previewModal = bootstrap.Modal.getInstance(document.getElementById("previewModal"));

  // 2) Tombol untuk membuka masing‑masing modal
  document.getElementById('openAddBtn').addEventListener('click', () => addModal.show());
  document.getElementById('openUploadBtn').addEventListener('click', () => uploadModal.show());


  //Save data URL Baru
  document.getElementById("saveButton").addEventListener("click", async function () {
    const url = document.getElementById("url").value.trim();
    const uid = document.getElementById("addUid").value.trim();
    const password = document.getElementById("password").value.trim();

    if (!url) {
      showAlert(false, "add"); // tampilkan alert gagal
      return;
    }

    const newData = {
      url,
      uid: uid || "",          // kosongkan jika tidak diisi
      password: password || "",
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
          <td>${item.flagSystem === true ? 'Y' : item.flagSystem === false ? 'N' : ''}</td>
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
        </td>
      `;
      tbody.appendChild(row);
    });

    bindActionButtons();
  }

  //   <button class="btn btn-sm btn-danger delete-btn" data-id="${item._id}">
  //   <i class="fa fa-trash" aria-hidden="true"></i>
  // </button>

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
        deleteModal.show();
      });
    });

  }

  function handleSearch() {
    const keyword = document.getElementById("search").value.toLowerCase();
    const classification = document.getElementById("classification").value;
    const webStatus = document.getElementById("web-status").value;
    const uid = document.getElementById("uid").value;
    const dateRange = document.getElementById("last-crawling").value.trim();

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

      const classificationMatch = !classification || (
        (classification === "Y" && item.flagUser === true) ||
        (classification === "N" && item.flagUser === false)
      );

      const webStatusMatch = !webStatus || item.webStatus === webStatus;
      const uidMatchSelect =
        !uid ||
        (uid === "Registered" && item.uid && item.uid.trim() !== "") ||
        (uid === "Unregistered" && (!item.uid || item.uid.trim() === ""));


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

  // Fungsi untuk mengonversi Excel serial date ke format JavaScript Date
  function convertExcelSerialDate(serialDate) {
    if (!serialDate || serialDate === "null" || isNaN(serialDate)) return null;
    const date = new Date((serialDate - 25569) * 86400 * 1000);
    return isNaN(date.getTime()) ? null : date;
  }


  function isProbablyExcelSerial(value) {
    // Angka yang masuk akal untuk serial date (>20000 sekitar 1950 ke atas)
    return !isNaN(value) && value > 20000 && value < 50000;
  }

  // Fungsi menampilkan data preview (maksimal 5 baris)
  function showPreviewTable(data) {
    const container = document.getElementById("previewTableContainer");
    container.innerHTML = "";

    if (data.length === 0) {
      container.innerHTML = "<p class='text-center'>No data to preview.</p>";
      return;
    }

    const table = document.createElement("table");
    table.className = "table table-bordered table-striped";

    // Header
    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");
    const headers = Object.keys(data[0]);

    headers.forEach((header) => {
      const th = document.createElement("th");
      th.textContent = header;
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Body (5 baris saja)
    const tbody = document.createElement("tbody");
    const limitedData = data.slice(0, 5);

    limitedData.forEach((item) => {
      const tr = document.createElement("tr");

      headers.forEach((header) => {
        const td = document.createElement("td");
        let rawValue = item[header];
        let value = "-";

        // Kolom tanggal: yang ada kata 'crawl' atau 'update'
        if (
          header.toLowerCase().includes("crawl") ||
          header.toLowerCase().includes("update")
        ) {
          if (!rawValue || rawValue === "") {
            value = "-";
          }
          else if (isProbablyExcelSerial(rawValue)) {
            // Excel serial number
            const convertedDate = convertExcelSerialDate(rawValue);
            value = convertedDate ? convertedDate.toISOString().split('T')[0] : "-";
          }
          else {
            // Coba parse Date object atau ISO string
            let parsedDate;
            if (rawValue instanceof Date) {
              parsedDate = rawValue;
            } else {
              parsedDate = new Date(rawValue);
            }

            value = (!isNaN(parsedDate.getTime())) ? parsedDate.toISOString().split('T')[0] : rawValue;
          }
        }
        else {
          // Kolom non-date
          value = rawValue || "-";
        }

        td.textContent = value;
        tr.appendChild(td);
      });

      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    container.appendChild(table);

    // Tampilkan modal
    const previewModal = new bootstrap.Modal(document.getElementById("previewModal"));
    previewModal.show();
  }


  document.getElementById("submitUrl").addEventListener("click", function () {
    const fileInput = document.getElementById("uploadUrlFile");
    const file = fileInput.files[0];

    if (!file) {
      alert("Please select a file first.");
      return;
    }

    const allowedExtensions = ["xlsx", "xls", "csv"];
    const fileName = file.name;
    const fileExtension = fileName.split(".").pop().toLowerCase();

    if (!allowedExtensions.includes(fileExtension)) {
      alert("Invalid file format. Please upload a .xlsx, .xls, or .csv file.");
      return;
    }

    const reader = new FileReader();

    reader.onload = function (e) {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: "array" });

      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" }); // Ensure empty cells are handled

      parsedExcelData = jsonData; // Store the data globally

      // Show Preview Table
      showPreviewTable(parsedExcelData);  // Display the preview modal
    };

    reader.readAsArrayBuffer(file);
  });

  const normalizeHeader = (item, ...possibleKeys) => {
    for (const key of possibleKeys) {
      if (key in item && item[key] !== undefined && item[key] !== "") {
        return item[key];
      }
    }
    return "";
  };

  const mapYN = (val) => {
    if (!val || val.trim() === "") return undefined;
    const upper = val.trim().toUpperCase();
    if (upper === "Y") return true;
    if (upper === "N") return false;
    return undefined;
  };

  function parseDateField(value) {
    if (!value) return null;

    // Handle teks seperti "N/A", "-"
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed === '' || trimmed.toUpperCase() === 'N/A' || trimmed === '-') {
        return null;
      }
    }

    // Kalau angka serial Excel
    if (isProbablyExcelSerial(value)) {
      return convertExcelSerialDate(value);
    }

    // String tanggal ISO atau Date
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }


  document.getElementById("confirmUploadBtn").addEventListener("click", async function () {
    // Make sure there is data available
    if (!parsedExcelData || parsedExcelData.length === 0) {
      alert("No data to upload.");
      return;
    }

    // Show loading spinner or indication that upload is in progress
    document.getElementById("exportLoading").style.display = "inline-block";

    try {
      // Prepare data for the request (you may map the data if necessary)
      const formattedData = parsedExcelData.map(item => {
        return {
          url: normalizeHeader(item, "URL"),
          inputBy: normalizeHeader(item, "InputBy", "Input By") || "User",

          flagUser: mapYN(normalizeHeader(item, "FlagUser", "Judul (flagUser)")),
          flagSystem: mapYN(normalizeHeader(item, "FlagSystem")),

          webStatus: normalizeHeader(item, "WebStatus", "Status") || "Active",
          uid: normalizeHeader(item, "UID") || "",
          password: normalizeHeader(item, "Password") || "",

          firstCrawl: parseDateField(normalizeHeader(item, "FirstCrawl", "First Crawl")),
          lastCrawl: parseDateField(normalizeHeader(item, "LastCrawl", "Last Crawl")),


          lastUpdate: new Date(),
          crawlStatus: normalizeHeader(item, "Crawling Status") === "Success"
        };
      });
      // Make the POST request to the server
      const response = await fetch('/api/urls/bulk', {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ data: formattedData })
      });

      const result = await response.json();

      // Hide the loading spinner
      document.getElementById("exportLoading").style.display = "none";
      const modal = bootstrap.Modal.getInstance(document.getElementById("previewModal"));
      const uploadModal = bootstrap.Modal.getInstance(document.getElementById("uploadUrl"));
      modal.hide();
      uploadModal.hide();

      // Check if the upload was successful
      if (response.ok) {

        showAlert(true, "upload", result.message || "Upload successful");
        // Optionally, you can reload the data or refresh the view after upload

        await fetchData();
      } else {

        showAlert(false, "upload", result.message || "Failed to upload data");
      }
    } catch (error) {
      console.error("Upload error:", error);
      document.getElementById("exportLoading").style.display = "none"; // Hide loading spinner in case of error
      showAlert(false, "upload", "An unexpected error occurred during upload.");
    }
  });


  // Inisialisasi
  fetchData();

  document.querySelector('.btn-primary').addEventListener('click', handleSearch);


});
