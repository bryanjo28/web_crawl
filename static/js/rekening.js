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

  const uploadModal = new bootstrap.Modal(document.getElementById('uploadUrl'))
  document.getElementById('openUploadBtn').addEventListener('click', () => uploadModal.show());

  // Submit button inside Upload URL modal
  document.getElementById("submitRek").addEventListener("click", function () {
    const isSuccess = Math.random() > 0.5; // Simulate success/failure
    setTimeout(function () {
      uploadModal.hide();
      showAlert(isSuccess, "upload");
    }, 1000);
  });

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
          document.getElementById("dateBlock").value = item.DateBlocked ? new Date(item.DateBlocked).toLocaleDateString("en-US") : '';

          const blockModalInstance = new bootstrap.Modal(document.getElementById("blokRekModal"));
          blockModalInstance.show();
        }
      });
    });
  }

  // Pagination Controls
  function updatePaginationControls() {
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);

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

  document.getElementById('submitRek').addEventListener('click', async function () {
    const fileInput = document.getElementById('uploadRek');
    const file = fileInput.files[0];

    if (!file) {
      alert('Please select a file first!');
      return;
    }

    const reader = new FileReader();

    reader.onload = async function (e) {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });

      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];

      const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

      console.log('Parsed Excel Data:', jsonData);

      // Mapping sesuai kebutuhan
      const mappedData = jsonData.map((row) => ({
        url: row.URL || '',
        bank: row.Bank || '',
        noRek: row['No Rek'] || '',
        dateFound: row['Date Found'] ? new Date(row['Date Found']) : null,
        dateBlocked: row['Date Blocked'] ? new Date(row['Date Blocked']) : null,
        statusRekening: row['Status Rekening'] || '',
        directory: row.Directory || '-',
      }));

      console.log('Mapped Data to be sent:', mappedData);

      // Kirim ke server via fetch (POST)
      try {
        const response = await fetch('/api/rekening/bulk', {  // (ganti URL kalau perlu)
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ data: mappedData })
        });

        const result = await response.json();
        console.log('Server Response:', result);

        if (response.ok) {
          showAlert(true, "upload", result.message || "Upload sukses!");
          await fetchData();
        } else {
          showAlert(false, "upload", result.message || "Upload gagal!");
        }
      } catch (err) {
        console.error('Error saat upload:', err);
        showAlert(false, "upload", "Terjadi kesalahan saat upload data.");
      }


      // Update frontend table
      tableData = [...tableData, ...mappedData];
      filteredData = tableData;
      currentPage = 1;

      renderTable();
      renderPagination();

      // Tutup modal
      const modal = bootstrap.Modal.getInstance(document.getElementById('uploadUrl'));
      modal.hide();
    };

    reader.readAsArrayBuffer(file);
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
