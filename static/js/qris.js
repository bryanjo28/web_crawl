document.addEventListener("DOMContentLoaded", function () {
  // Fetch navbar dynamically
  fetch("../static/navbar/navbar.html")
    .then((response) => response.text()) // Convert the response to text
    .then((data) => {
      document.querySelector(".sidebar").innerHTML = data;

      // Setelah navbar dimuat, kita bisa menambahkan event listener ke tombol toggle
      document
        .getElementById("toggleSidebarBtn")
        .addEventListener("click", function () {
          const sidebar = document.querySelector(".sidebar");
          const content = document.getElementById("content");

          // Toggle collapsed class on sidebar and content
          sidebar.classList.toggle("collapsed");
          content.classList.toggle("collapsed");
        });

      // Menandai menu aktif berdasarkan URL saat ini
      const menuItems = document.querySelectorAll(".nav-link");
      const currentUrl = window.location.pathname.split("/").pop(); // Mendapatkan nama file dari URL saat ini

      menuItems.forEach((item) => {
        const itemUrl = item.getAttribute("href").split("/").pop(); // Ambil nama file dari href

        // Menambahkan kelas 'active' jika path saat ini cocok dengan href menu
        if (itemUrl === currentUrl) {
          item.classList.add("active");
        }
      });
    })
    .catch((error) => console.log("Error loading the navbar:", error));

  const uploadModal = new bootstrap.Modal(document.getElementById("uploadUrl"));


  document
    .getElementById("openUploadBtn")
    .addEventListener("click", () => uploadModal.show());

  // Helper function to display alert messages based on the action
  function showAlert(success, action, customMessage) {
    const ok = document.getElementById("successAlert");
    const no = document.getElementById("errorAlert");

    // Set the success/error message and corresponding visibility based on action
    if (action === "add") {
      if (success) {
        document.getElementById("successMessage").textContent =
          customMessage || "Add New URL Success"; // Show custom message if provided
      } else {
        document.getElementById("errorMessage").textContent =
          customMessage || "Failed to Add URL"; // Show custom message if provided
      }
    } else if (action === "upload") {
      if (success) {
        document.getElementById("successMessage").textContent =
          customMessage || "Upload URL Success"; // Show custom message if provided
      } else {
        document.getElementById("errorMessage").textContent =
          customMessage || "Failed to Upload URL"; // Show custom message if provided
      }
    } else if (action === "edit") {
      if (success) {
        document.getElementById("successMessage").textContent =
          customMessage || "Edit URL Success"; // Show custom message if provided
      } else {
        document.getElementById("errorMessage").textContent =
          customMessage || "Failed to Edit URL"; // Show custom message if provided
      }
    } else if (action === "delete") {
      if (success) {
        document.getElementById("successMessage").textContent =
          customMessage || "Delete URL Success"; // Show custom message if provided
      } else {
        document.getElementById("errorMessage").textContent =
          customMessage || "Failed to Delete URL"; // Show custom message if provided
      }
    } else if (action === "blocked") {
      if (success) {
        document.getElementById("successMessage").textContent =
          customMessage || "QRIS Berhasil Diblokir"; // Show custom message if provided
      } else {
        document.getElementById("errorMessage").textContent =
          customMessage || "QRIS gagal Diblokir"; // Show custom message if provided
      }
    }

    // Display the corresponding alert
    if (success) {
      ok.style.display = "block";
      no.style.display = "none";
    } else {
      no.style.display = "block";
      ok.style.display = "none";
    }

    // Hide the alert after 3 seconds
    setTimeout(() => {
      ok.style.display = "none";
      no.style.display = "none";
    }, 2000);
  }

  // flatpickr init (jika perlu)
  flatpickr("#date-blocked", {
    mode: "range",
    dateFormat: "m/d/Y",
  });

  let selectedRowId = null;
  let currentPage = 1;
  let pageSize = 10; // Jumlah data per halaman
  let tableData = []; // Data QRIS yang diambil dari API
  let filteredData = []; // Data hasil filter (default sama dengan data asli)
  let parsedExcelData = []; // Global, simpan data yang sudah diparse

  // Fungsi untuk mengambil data QRIS dari API
  async function fetchData() {
    try {
      const response = await fetch("/api/qris");
      const data = await response.json();

      if (data && data.length > 0) {
        tableData = data;
        filteredData = data;
        currentPage = 1; // reset halaman ke 1
        populateTable(filteredData);
        updatePaginationControls();
      } else {
        // Tidak ada data
        tableData = [];
        filteredData = []; // <-- penting dikosongkan juga
        currentPage = 1; // reset halaman ke 1
        populateTable(filteredData); // panggil populateTable walaupun kosong
        updatePaginationControls();
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  }

  // Fungsi untuk mengisi tabel dengan data yang diambil
  function populateTable(filteredData) {
    const tbody = document.querySelector("table tbody");
    tbody.innerHTML = "";

    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const pageItems = filteredData.slice(startIndex, endIndex);

    if (pageItems.length === 0) {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td colspan="9" class="text-center text-muted">No matching records found</td>
      `;
      tbody.appendChild(row);
      updatePaginationControls(); // tetap update pagination meski kosong
      return; // LANGSUNG RETURN, jangan lanjut ke forEach
    }

    pageItems.forEach((item, index) => {
      const row = document.createElement("tr");

      const isBlocked = item.StatusQRIS === false ? false : true;

      row.innerHTML = `
        <td>${startIndex + index + 1}</td>
        <td><a href="#" class="preview-link" data-id="${item._id}">${item.url}</a></td>
        <td>${item.bank}</td>
        <td>${item.NoQRIS}</td>
        <td>${new Date(item.DateFound).toLocaleDateString("en-US")}</td>
        <td>${item.DateBlocked
          ? new Date(item.DateBlocked).toLocaleDateString("en-US")
          : "-"
        }</td>
        <td>${isBlocked ? "Blocked" : "Active"}</td>
        <td>${item.directory || "-"}</td>
        <td>
          ${!isBlocked
          ? `
            <button class="btn btn-sm btn-danger delete-btn" data-id="${item._id}">
              <i class="fa fa-ban" aria-hidden="true"></i>
            </button>`
          : ""
        }
        </td>
      `;
      tbody.appendChild(row);
    });

    bindActionButtons();
    previewQrisModal();
    updatePaginationControls();
  }

  // Fungsi untuk mengikat action button ke tombol delete
  function bindActionButtons() {
    document.querySelectorAll(".delete-btn").forEach((btn) => {
      btn.addEventListener("click", function () {
        const id = this.dataset.id;
        const item = tableData.find((d) => d._id === id);
        if (item) {
          selectedRowId = id;
          document.getElementById("noQris").value = item.NoQRIS;
          document.getElementById("dateFound").value = item.DateFound
            ? new Date(item.DateFound).toLocaleDateString("en-US")
            : "";

          // buka modal
          const blockModalInstance = new bootstrap.Modal(
            document.getElementById("blokQrisModal")
          );
          blockModalInstance.show();
        }
      });
    });
  }

  // Fungsi untuk mengupdate informasi pagination
  function updatePaginationControls() {
    const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize)); // MINIMAL 1
    const paginationInfo = document.getElementById("pagination-info");

    paginationInfo.textContent = `Page ${currentPage} of ${totalPages}`;

    const prevButton = document.getElementById("prev-page");
    const nextButton = document.getElementById("next-page");

    if (prevButton) {
      prevButton.disabled = currentPage === 1;
      prevButton.className = `btn btn-sm mx-1 ${currentPage === 1
        ? "btn-outline-secondary disabled"
        : "btn-outline-primary"
        }`;
      prevButton.onclick = () => {
        if (currentPage > 1) {
          currentPage--;
          populateTable();
        }
      };
    }

    if (nextButton) {
      nextButton.disabled = currentPage === totalPages;
      nextButton.className = `btn btn-sm mx-1 ${currentPage === totalPages
        ? "btn-outline-secondary disabled"
        : "btn-outline-primary"
        }`;
      nextButton.onclick = () => {
        if (currentPage < totalPages) {
          currentPage++;
          populateTable();
        }
      };
    }

    // document.getElementById("prev-page").disabled = currentPage === 1;
    // document.getElementById("next-page").disabled = currentPage === totalPages;
  }

  function applyFilter() {
    const searchValue = document
      .getElementById("search")
      .value.trim()
      .toLowerCase();
    const dateBlockedRange = document
      .getElementById("date-blocked")
      .value.trim();
    const bankValue = document
      .getElementById("bank")
      .value.trim()
      .toLowerCase();
    console.log("Isi input dateBlockedRange:", dateBlockedRange); // Debugging untuk nilai date range

    // Filter data berdasarkan input
    filteredData = tableData.filter((item) => {
      let match = true;

      // Filter berdasarkan URL
      if (searchValue) {
        match = match && item.url.toLowerCase().includes(searchValue);
      }

      // Filter berdasarkan nama bank
      if (bankValue) {
        match = match && item.bank.toLowerCase().includes(bankValue);
      }

      // Filter berdasarkan rentang tanggal (Date Blocked)
      if (dateBlockedRange && dateBlockedRange.includes("to")) {
        const [startStr, endStr] = dateBlockedRange
          .split("to")
          .map((str) => str.trim());
        const startDateParts = startStr.split("/");
        const endDateParts = endStr.split("/");

        const startDate = new Date(
          +startDateParts[2],
          +startDateParts[0] - 1,
          +startDateParts[1]
        );
        const endDate = new Date(
          +endDateParts[2],
          +endDateParts[0] - 1,
          +endDateParts[1]
        );

        let foundInRange = false;

        console.log("Parsed startDate:", startDate);
        console.log("Parsed endDate:", endDate);

        // Cek DateFound
        if (item.DateFound) {
          const foundDate = new Date(item.DateFound);
          const foundDateOnly = new Date(
            foundDate.getFullYear(),
            foundDate.getMonth(),
            foundDate.getDate()
          );
          if (foundDateOnly >= startDate && foundDateOnly <= endDate) {
            foundInRange = true;
          }
        }

        // Cek DateBlocked
        if (item.DateBlocked) {
          const blockedDate = new Date(item.DateBlocked);
          const blockedDateOnly = new Date(
            blockedDate.getFullYear(),
            blockedDate.getMonth(),
            blockedDate.getDate()
          );
          if (blockedDateOnly >= startDate && blockedDateOnly <= endDate) {
            foundInRange = true;
          }
        }

        match = match && foundInRange;
      }

      console.log("Item:", item.url);
      console.log(
        "DateFound:",
        item.DateFound,
        "DateBlocked:",
        item.DateBlocked
      );
      console.log("Item masuk range?", match);

      return match;
    });

    currentPage = 1; // Reset ke halaman 1 setelah filter
    populateTable(filteredData); // Populate table dengan data yang sudah difilter
    updatePaginationControls(); // Update pagination info
  }

  // Fungsi untuk preview Qris Modal
  function previewQrisModal() {
    document.querySelectorAll(".preview-link").forEach(link => {
      link.addEventListener("click", function (e) {
        e.preventDefault();

        const id = this.dataset.id;
        const selectedItem = filteredData.find(d => d._id === id);
        if (!selectedItem) return;

        document.getElementById("urlQris").innerHTML = selectedItem.url
          ? `<a href="${selectedItem.url}" target="_blank">${selectedItem.url}</a>`
          : "-";
        document.getElementById("bankQris").value = selectedItem.bank || "-";
        document.getElementById("noQris2").value = selectedItem.NoQRIS || "-";
        document.getElementById("dateFoundQris").value = selectedItem.DateFound
          ? new Date(selectedItem.DateFound).toLocaleDateString("en-US")
          : "-";
        document.getElementById("dateBlockedQris").value = selectedItem.DateBlocked
          ? new Date(selectedItem.DateBlocked).toLocaleDateString("en-US")
          : "-";
        document.getElementById("statusQris").value =
          selectedItem.StatusQRIS === true
            ? "Blocked"
            : selectedItem.StatusQRIS === false
              ? "Active"
              : "-";

        // Render base64 image
        const imageContainer = document.getElementById("qrisImagePreview");
        if (selectedItem.GambarQRIS && selectedItem.GambarQRIS.startsWith("data:image")) {
          imageContainer.innerHTML = `<img src="${selectedItem.GambarQRIS}" class="img-fluid rounded border" alt="QRIS Preview">`;
        } else {
          imageContainer.innerHTML = `<p class="text-muted">No image available</p>`;
        }
        console.log(selectedItem.GambarQRIS);

        const modal = new bootstrap.Modal(document.getElementById("previewQris"));
        modal.show();
      });
    });
  }


  document.querySelector(".resetButton").addEventListener("click", function () {
    // Kosongkan input search, date-blocked, dan bank
    document.getElementById("search").value = "";
    document.getElementById("date-blocked").value = "";
    document.getElementById("bank").value = "";

    // Reset filteredData ke semua tableData
    filteredData = tableData.slice(); // copy semua data asli

    // Reset halaman ke 1
    currentPage = 1;

    // Update tabel dan pagination
    populateTable(filteredData);
    updatePaginationControls();
  });

  // Event listener untuk tombol Previous
  document.getElementById("prev-page").addEventListener("click", () => {
    if (currentPage > 1) {
      currentPage--;
      populateTable(tableData); // Update table
      updatePaginationControls(); // Update pagination info
    }
  });

  // Event listener untuk tombol Next
  document.getElementById("next-page").addEventListener("click", () => {
    const totalPages = Math.ceil(tableData.length / pageSize);
    if (currentPage < totalPages) {
      currentPage++;
      populateTable(tableData); // Update table
      updatePaginationControls(); // Update pagination info
    }
  });

  // Fetch data ketika halaman dimuat
  fetchData();

  document.getElementById("submitUrl").addEventListener("click", function () {
    const fileInput = document.getElementById("uploadQris");
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
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" }); // kosong = ""

      parsedExcelData = jsonData; // Simpan ke variabel global

      showPreviewTable(parsedExcelData); // Tampilkan preview
    };

    reader.readAsArrayBuffer(file);
  });

  // Fungsi untuk mengonversi Excel serial date ke format JavaScript Date
  function convertExcelSerialDate(serialDate) {
    if (!serialDate || serialDate === "null") return null; // Jika kosong atau "null" sebagai string, set ke null
    const date = new Date((serialDate - 25569) * 86400 * 1000); // Konversi serial date ke format tanggal
    return isNaN(date.getTime()) ? null : date; // Jika tidak valid, kembalikan null
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

    // Limiting to 5 rows
    const limitedData = data.slice(0, 5);

    limitedData.forEach((item) => {
      const tr = document.createElement("tr");
      headers.forEach((header) => {
        const td = document.createElement("td");
        let value = item[header] || "-";

        // Mengonversi serial date menjadi tanggal yang benar jika field adalah DateFound atau DateBlocked
        if (header === "Date Found" || header === "Date Blocked") {
          value = convertExcelSerialDate(item[header]);
          if (value) {
            value = value.toLocaleDateString("en-US"); // Format tanggal dengan Locale
          } else {
            value = "-"; // Jika tidak ada tanggal valid, tampilkan '-'
          }
        }

        td.textContent = value;
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);

    container.appendChild(table);

    // Tampilkan modal preview
    const previewModal = new bootstrap.Modal(
      document.getElementById("previewModal")
    );
    previewModal.show();
  }

  // Saat tombol Confirm di klik, kirim data ke server
  document.getElementById("confirmUploadBtn").addEventListener("click", async function () {
    if (parsedExcelData.length === 0) {
      alert("No data to upload.");
      return;
    }

    // Format data before sending to the backend
    const formattedData = parsedExcelData.map(item => ({
      url: item.URL || "", // Assuming 'URL' column in Excel
      bank: item.Bank || "", // Assuming 'Bank' column in Excel
      NoQRIS: item['No QRIS'] || "", // Assuming 'No QRIS' column in Excel
      DateFound: item['Date Found'] ? convertExcelSerialDate(item['Date Found']) : null, // Convert serial date for 'Date Found'
      DateBlocked: item['Date Blocked'] && item['Date Blocked'] !== 'NULL' ? convertExcelSerialDate(item['Date Blocked']) : null, // Convert serial date for 'Date Blocked'
      StatusQris: item['Status QRIS'] === 'TRUE', // Convert 'Status QRIS' to boolean (TRUE => true, FALSE => false)
      GambarQris: item['Gambar QRIS'] || "", // Assuming 'Gambar QRIS' column in Excel (Base64 string)
    }));

    // Log formatted data before sending it to the backend
    console.log("Formatted Data to Send:", formattedData);

    try {
      const response = await fetch("/api/qris/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ data: formattedData }), // Send formatted data to the backend
      });

      const result = await response.json();

      // Menampilkan hanya 5 URL yang tidak valid di pesan error
      if (response.ok) {
        showAlert(true, "upload", result.message);
        const previewModal = bootstrap.Modal.getInstance(document.getElementById("previewModal"));
        const uploadModal = bootstrap.Modal.getInstance(document.getElementById("uploadUrl"));

        if (uploadModal) {
          uploadModal.hide();
        }

        if (previewModal) {
          previewModal.hide();
        }

        showAlert(true, "upload", result.message || "Upload successful");

      } else {
        const invalidUrls = result.message.split(","); // Misalnya, menganggap server mengirimkan URL yang tidak valid sebagai array
        const limitedInvalidUrls = invalidUrls.slice(0, 5).join(", "); // Ambil hanya 5 pertama
        const message = `Failed to upload URLs: ${limitedInvalidUrls}`;
        showAlert(false, "upload", message);
      }
    } catch (error) {
      console.error("Upload error:", error);
      showAlert(false, "upload", "Terjadi error saat upload.");
    }
  });
  // Ubah data saat Block
  document
    .getElementById("blockButton")
    .addEventListener("click", async function () {
      const item = tableData.find((d) => d._id === selectedRowId);
      if (item) {
        try {
          // Kirim request untuk block QRIS berdasarkan ID
          const response = await fetch(`/api/qris/${selectedRowId}/block`, {
            method: "PUT",
          });

          if (!response.ok) {
            throw new Error("Gagal memblokir QRIS");
          }

          const result = await response.json();

          // Update status lokal setelah berhasil blokir
          item.StatusQRIS = true; // Mengubah status menjadi blocked
          item.DateBlocked = new Date().toLocaleDateString("en-US"); // Optional: update tanggal blokir

          const modal = bootstrap.Modal.getInstance(
            document.getElementById("blokQrisModal")
          );
          modal.hide();

          setTimeout(() => {
            populateTable(tableData); // Update table dengan data terbaru
            showAlert(true, "blocked", result.message);

          }, 100);
        } catch (error) {
          console.error("Error blocking QRIS:", error);
          showAlert(false, "blocked", result.message);
        }
      }
    });

  document
    .querySelector(".btn.btn-sm.btn-primary")
    .addEventListener("click", function () {
      applyFilter();
    });

  document.getElementById("exportData").addEventListener("click", async function () {
    const exportBtn = document.getElementById("exportData");
    const exportLoading = document.getElementById("exportLoading");

    // Tampilkan spinner dan sembunyikan tombol export
    exportLoading.style.display = "inline-block";
    exportBtn.disabled = true;

    try {
      const response = await fetch('/api/qris/export', {
        method: 'GET'
      });

      if (!response.ok) {
        throw new Error('Gagal mengunduh file.');
      }

      // Menerima file dalam bentuk Blob
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `qris_data_export_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

    } catch (error) {
      console.error("Export error:", error);
      alert('Gagal export data.');
    } finally {
      // Sembunyikan spinner dan aktifkan kembali tombol export
      exportLoading.style.display = "none";
      exportBtn.disabled = false;
    }
  });


});