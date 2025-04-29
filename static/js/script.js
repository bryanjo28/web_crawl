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

  // Fungsi untuk mengonversi Excel serial date ke format JavaScript Date
  function convertExcelSerialDate(serialDate) {
    if (!serialDate || serialDate === "null" || isNaN(serialDate)) return null; // Check for null or invalid date

    // Convert the serial date to JavaScript Date object
    const date = new Date((serialDate - 25569) * 86400 * 1000);

    // Return the date if valid, otherwise null
    return isNaN(date.getTime()) ? null : date;
  }

  // Fungsi untuk menampilkan data preview yang dibatasi hanya 5 teratas
  function showPreviewTable(data) {
    const container = document.getElementById("previewTableContainer");
    container.innerHTML = "";

    if (data.length === 0) {
      container.innerHTML = "<p class='text-center'>No data to preview.</p>";
      return;
    }

    const table = document.createElement("table");
    table.className = "table table-bordered table-striped";

    // Table Header
    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");

    // Dynamically creating table headers based on the first row's keys
    const headers = Object.keys(data[0]);
    headers.forEach((header) => {
      const th = document.createElement("th");
      th.textContent = header;
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Table Body
    const tbody = document.createElement("tbody");

    // Limiting to 5 rows for preview
    const limitedData = data.slice(0, 5);

    limitedData.forEach((item) => {
      const tr = document.createElement("tr");
      headers.forEach((header) => {
        const td = document.createElement("td");
        let value = item[header] || "-";

        // Handle the case where headers like 'First Crawl', 'Last Crawl', and 'Last Update' appear
        if (
          header.toLowerCase().includes("crawl") ||
          header.toLowerCase().includes("update")
        ) {
          value = convertExcelSerialDate(item[header]);
          if (value) {
            value = value.toLocaleDateString("en-US"); // Format the date properly
          } else {
            value = "-"; // If not a valid date, show a dash
          }
        }

        td.textContent = value;
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);

    container.appendChild(table);

    // Show the preview modal
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
      const formattedData = parsedExcelData.map(item => ({
        url: item.URL || "",
        inputBy: item["Input By"] || "User",
        flagUser: item["Judul (flagUser)"] === "Y" ? true : false,
        flagSystem: false, // Assumed value, adjust as needed
        webStatus: item.Status || "Active",
        uid: item.UID || "",
        password: item.Password || "",
        firstCrawl: item["First Crawl"] ? convertExcelSerialDate(item["First Crawl"]) : null,
        lastCrawl: item["Last Crawl"] ? convertExcelSerialDate(item["Last Crawl"]) : null,
        lastUpdate: item.lastUpdate || new Date(), // Make sure the date is valid
        crawlStatus: item["Crawling Status"] === "Success"
      }));


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

      // Check if the upload was successful
      if (response.ok) {
        const previewModal = bootstrap.Modal.getInstance(document.getElementById("previewModal"));
        const uploadModal = bootstrap.Modal.getInstance(document.getElementById("uploadUrl"));

        if (uploadModal) {
          uploadModal.hide();
        }

        if (previewModal) {
          previewModal.hide();
        }

        showAlert(true, "upload", result.message || "Upload successful");
        // Optionally, you can reload the data or refresh the view after upload

        await fetchData();
      } else {
        if (uploadModal) {
          uploadModal.hide();
        }

        if (previewModal) {
          previewModal.hide();
        }

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
