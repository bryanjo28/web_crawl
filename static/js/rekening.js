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

  const uploadModal = new bootstrap.Modal(document.getElementById('uploadRek'))
  document.getElementById('openUploadBtn').addEventListener('click', () => uploadModal.show());


  // Helper function to display alert messages based on the action
  function showAlert(success, action, customMessage = null) {
    const ok = document.getElementById("successAlert");
    const no = document.getElementById("errorAlert");

    // Jika ada customMessage langsung pakai
    if (customMessage) {
      if (success) {
        document.getElementById("successMessage").textContent = customMessage;
      } else {
        document.getElementById("errorMessage").textContent = customMessage;
      }
    } else {
      // Kalau tidak ada customMessage, fallback ke default
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
      } else if (action === "blocked") {
        if (success) {
          document.getElementById("successMessage").textContent = "Rekening berhasil diblokir";
        } else {
          document.getElementById("errorMessage").textContent = "Rekening gagal diblokir";
        }
      }
    }

    // Display the corresponding alert
    if (success) {
      ok.style.display = 'block';
      no.style.display = 'none';
    } else {
      no.style.display = 'block';
      ok.style.display = 'none';
    }

    // Hide the alert after 2 seconds
    setTimeout(() => {
      ok.style.display = 'none';
      no.style.display = 'none';
    }, 2000);
  }

  // flatpickr init (jika perlu)
  flatpickr("#date-blocked", {
    mode: "range",
    dateFormat: "m/d/Y",
  });

  //Bagian table
  let tableData = [];       // Semua data dari server
  let filteredData = [];     // Data setelah filter
  let currentPage = 1;
  const itemsPerPage = 10;
  let selectedRowId = null;
  let parsedRekData = []; // Global cache


  // Fetch semua data dari server
  async function fetchTableData() {
    try {
      const response = await fetch('/api/rekening');
      const data = await response.json();
      tableData = data;
      filteredData = tableData; // Awalnya semua
      currentPage = 1;
      populateTable();
      updatePaginationControls();
    } catch (error) {
      console.error("Error fetching table data:", error);
    }
  }

  // Populate table berdasarkan page
  function populateTable() {
    const tbody = document.querySelector("table tbody");
    tbody.innerHTML = "";

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageItems = filteredData.slice(startIndex, endIndex);

    if (pageItems.length === 0) {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td colspan="12" class="text-center text-muted">No matching records found</td>
      `;
      tbody.appendChild(row);
      return; // langsung berhenti di sini kalau kosong
    }

    pageItems.forEach((item, index) => {
      const isBlocked = item.StatusRekening === false ? false : true; // jika false berarti belum blocked

      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${startIndex + index + 1}</td>
        <td><a href="${item.url}" target="_blank">${item.url}</a></td>
        <td>${item.bank}</td>
        <td>${item.NoRekening}</td>
        <td>${new Date(item.DateFound).toLocaleDateString('en-US')}</td>
        <td>${item.DateBlocked ? new Date(item.DateBlocked).toLocaleDateString('en-US') : '-'}</td>
        <td>${isBlocked ? "Blocked" : "Active"}</td>
        <td>-</td>
        <td>
          ${!isBlocked ?
          `<button class="btn btn-sm btn-danger delete-btn" data-id="${item._id}">
              <i class="fa fa-ban" aria-hidden="true"></i>
            </button>` : ''}
        </td>
      `;
      tbody.appendChild(row);
    });

    bindActionButtons();
    updatePaginationControls();
  }

  // Handle tombol di table
  function bindActionButtons() {
    document.querySelectorAll(".delete-btn").forEach(btn => {
      btn.addEventListener("click", function () {
        const id = this.dataset.id;
        const item = tableData.find(d => d._id === id);
        if (item) {
          selectedRowId = id;
          document.getElementById("noRek").value = item.NoRekening;
          document.getElementById("dateFound").value = item.DateFound ? new Date(item.DateFound).toLocaleDateString("en-US") : '';

          const blockModalInstance = new bootstrap.Modal(document.getElementById("blokRekModal"));
          blockModalInstance.show();
        }
      });
    });
  }

  // Pagination Controls
  function updatePaginationControls() {
    const totalPages = Math.max(1, Math.ceil(filteredData.length / itemsPerPage)); // MINIMAL 1

    const paginationInfo = document.getElementById("pagination-info");
    if (paginationInfo) {
      paginationInfo.textContent = `Page ${currentPage} of ${totalPages}`;
    }

    const prevButton = document.getElementById("prev-page");
    const nextButton = document.getElementById("next-page");

    if (prevButton) {
      prevButton.disabled = currentPage === 1;
      prevButton.className = `btn btn-sm mx-1 ${currentPage === 1 ? 'btn-outline-secondary disabled' : 'btn-outline-primary'}`;
      prevButton.onclick = () => {
        if (currentPage > 1) {
          currentPage--;
          populateTable();
        }
      };
    }

    if (nextButton) {
      nextButton.disabled = currentPage === totalPages;
      nextButton.className = `btn btn-sm mx-1 ${currentPage === totalPages ? 'btn-outline-secondary disabled' : 'btn-outline-primary'}`;
      nextButton.onclick = () => {
        if (currentPage < totalPages) {
          currentPage++;
          populateTable();
        }
      };
    }
  }

  function applyFilter() {
    const searchValue = document.getElementById("search").value.trim().toLowerCase();
    const dateBlockedRange = document.getElementById("date-blocked").value.trim();
    const bankValue = document.getElementById("bank").value.trim().toLowerCase();
    console.log('Isi input dateBlockedRange:', dateBlockedRange);  // <- Tambahkan ini

    filteredData = tableData.filter(item => {
      let match = true;

      if (searchValue) {
        match = match && item.url.toLowerCase().includes(searchValue);
      }

      if (bankValue) {
        match = match && item.bank.toLowerCase().includes(bankValue);
      }

      if (dateBlockedRange && dateBlockedRange.includes('to')) {
        const [startStr, endStr] = dateBlockedRange.split('to').map(str => str.trim());
        const startDateParts = startStr.split('/');
        const endDateParts = endStr.split('/');

        const startDate = new Date(+startDateParts[2], +startDateParts[0] - 1, +startDateParts[1]);
        const endDate = new Date(+endDateParts[2], +endDateParts[0] - 1, +endDateParts[1]);

        let foundInRange = false;


        console.log('Parsed startDate:', startDate);
        console.log('Parsed endDate:', endDate);

        // Cek DateFound
        if (item.DateFound) {
          const foundDate = new Date(item.DateFound);
          const foundDateOnly = new Date(foundDate.getFullYear(), foundDate.getMonth(), foundDate.getDate());
          if (foundDateOnly >= startDate && foundDateOnly <= endDate) {
            foundInRange = true;
          }
        }

        // Cek DateBlocked
        if (item.DateBlocked) {
          const blockedDate = new Date(item.DateBlocked);
          const blockedDateOnly = new Date(blockedDate.getFullYear(), blockedDate.getMonth(), blockedDate.getDate());
          if (blockedDateOnly >= startDate && blockedDateOnly <= endDate) {
            foundInRange = true;
          }
        }

        match = match && foundInRange;
      }

      console.log('Item:', item.url);
      console.log('DateFound:', item.DateFound, 'DateBlocked:', item.DateBlocked);
      console.log('Item masuk range?', match);


      return match;
    });

    currentPage = 1; // Reset ke halaman 1 setelah filter
    populateTable();
  }

  // Function untuk reset filter
  function resetFilter() {
    document.getElementById("search").value = "";
    document.getElementById("date-blocked").value = "";
    document.getElementById("bank").value = "";

    filteredData = tableData; // Kembalikan semua data
    currentPage = 1;           // Reset ke halaman pertama
    populateTable();           // Render ulang table
  }

  // Event listener tombol search
  document.getElementById('searchButton').addEventListener('click', applyFilter);
  document.getElementById('resetFilter').addEventListener('click', resetFilter);


  document.getElementById("prev-page").addEventListener("click", () => {
    if (currentPage > 1) {
      currentPage--;
      populateTable();
    }
  });

  document.getElementById("next-page").addEventListener("click", () => {
    const totalPages = Math.ceil(tableData.length / itemsPerPage);
    if (currentPage < totalPages) {
      currentPage++;
      populateTable();
    }
  });

  // Ubah status menjadi Blocked
  document.getElementById("blockButton").addEventListener("click", async function () {
    if (selectedRowId) {
      try {
        const response = await fetch(`/api/rekening/${selectedRowId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            StatusRekening: true,
            DateBlocked: new Date().toISOString()
          })
        });

        if (response.ok) {
          const modal = bootstrap.Modal.getInstance(document.getElementById("blokRekModal"));
          modal.hide();
          setTimeout(() => {
            fetchTableData(); // refresh table
            showAlert(true, "blocked");
          }, 500);
        } else {
          console.error("Failed to update status.");
        }
      } catch (error) {
        console.error("Error updating rekening:", error);
      }
    }
  });

  function convertExcelSerialDate(serialDate) {
    if (!serialDate || serialDate === "null" || isNaN(serialDate)) return null;
    const date = new Date((serialDate - 25569) * 86400 * 1000);
    return isNaN(date.getTime()) ? null : date;
  }


  document.getElementById('submitRek').addEventListener('click', function () {
    const fileInput = document.getElementById('uploadRekFile');
    const file = fileInput.files[0];

    if (!file) {
      alert('Please select a file first!');
      return;
    }

    const reader = new FileReader();

    reader.onload = function (e) {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });

      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

      parsedRekData = jsonData;

      showPreviewRekTable(parsedRekData);
      const modal = new bootstrap.Modal(document.getElementById("previewRekModal"));
      modal.show();
    };

    reader.readAsArrayBuffer(file);
  });

  function showPreviewRekTable(data) {
    const container = document.getElementById("previewRekTableContainer");
    container.innerHTML = "";

    if (data.length === 0) {
      container.innerHTML = "<p class='text-center'>No data to preview.</p>";
      return;
    }

    const table = document.createElement("table");
    table.className = "table table-bordered table-striped";
    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");

    const headers = Object.keys(data[0]);
    headers.forEach(header => {
      const th = document.createElement("th");
      th.textContent = header;
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement("tbody");
    const limitedData = data.slice(0, 5);

    limitedData.forEach(item => {
      const tr = document.createElement("tr");
      headers.forEach(header => {
        const td = document.createElement("td");
        let value = item[header] || "-";

        if (header.toLowerCase().includes("date")) {
          const converted = convertExcelSerialDate(item[header]);
          value = converted ? converted.toLocaleDateString("en-US") : "-";
        }

        td.textContent = value;
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    container.appendChild(table);
  }

  document.getElementById("confirmRekUploadBtn").addEventListener("click", async function () {
    if (!parsedRekData || parsedRekData.length === 0) {
      alert("No data to upload.");
      return;
    }

    const mappedData = parsedRekData.map(row => ({
      url: row.URL || '',
      bank: row.Bank || '',
      NoRekening: row['No Rek'] || '',
      DateFound: row['Date Found'] ? convertExcelSerialDate(row['Date Found']) : null,
      DateBlocked: row['Date Blocked'] ? convertExcelSerialDate(row['Date Blocked']) : null,
      StatusRekening: row['Status Rekening'] === "true" || row['Status Rekening'] === true,
      GambarWeb: row['Gambar Web'] || ''
    }));

    try {
      const response = await fetch('/api/rekening/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: mappedData })
      });

      const result = await response.json();

      const modal = bootstrap.Modal.getInstance(document.getElementById("previewRekModal"));
      const uploadModal = bootstrap.Modal.getInstance(document.getElementById("uploadRek"));
      modal.hide();
      uploadModal.hide();

      if (response.ok) {
        showAlert(true, "upload", result.message || "Upload sukses!");

        // Load table 
        fetchTableData();

      } else {
        showAlert(false, "upload", result.message || "Upload gagal!");
      }
    } catch (error) {
      console.error("Upload error:", error);
      showAlert(false, "upload", "Terjadi kesalahan saat upload.");
    }
  });



  document.getElementById('exportData').addEventListener('click', async function () {
    const exportBtn = document.getElementById('exportData');
    const exportLoading = document.getElementById('exportLoading');

    exportLoading.style.display = 'inline-block';
    exportBtn.disabled = true;

    try {
      const response = await fetch('/api/rekening/export', {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error('Gagal export dari server');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `data_rekening_export_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

    } catch (error) {
      console.error('Export error:', error);
      alert('Gagal export data!');
    } finally {
      // Set timeout untuk menghilangkan spinner setelah beberapa detik, meskipun proses selesai
      setTimeout(() => {
        exportLoading.style.display = "none";  // Sembunyikan spinner
        exportBtn.disabled = false;            // Aktifkan kembali tombol export
      }, 2000); // Menunggu selama 2 detik
    }
  });



  // Load pertama kali
  fetchTableData();



});
