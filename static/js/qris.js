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
  document.getElementById("submitUrl").addEventListener("click", function () {
    const isSuccess = Math.random() > 0.5; // Simulate success/failure
    setTimeout(function () {
      uploadModal.hide();
      showAlert(isSuccess, "upload");
    }, 1000);
  });

  // Helper function to display alert messages based on the action
  function showAlert(success, action) {
    const ok = document.getElementById("successAlert");
    const no = document.getElementById("errorAlert");

    // Set the success/error message and corresponding visibility based on action
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
    }
    else if (action === "blocked") {
      if (success) {
        document.getElementById("successMessage").textContent = "QRIS Berhasil Diblokir";
      } else {
        document.getElementById("errorMessage").textContent = "QRIS gagal Diblokir";
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

    // Hide the alert after 3 seconds
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

  let selectedRowId = null;
  let currentPage = 1;
  let pageSize = 10; // Jumlah data per halaman
  let tableData = []; // Data QRIS yang diambil dari API

  // Fungsi untuk mengambil data QRIS dari API
  async function fetchData() {
    try {
      const response = await fetch('/api/qris');
      const data = await response.json();

      if (data && data.length > 0) {
        tableData = data; // Menyimpan data QRIS di variabel global
        populateTable(data); // Memasukkan data yang diambil ke tabel
        updatePaginationControls(); // Update pagination info
      } else {
        alert('Tidak ada data QRIS yang ditemukan.');
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      alert('Terjadi kesalahan saat mengambil data.');
    }
  }

  // Fungsi untuk mengisi tabel dengan data yang diambil
  function populateTable(tableData) {
    const tbody = document.querySelector("table tbody");
    tbody.innerHTML = "";

    const startIndex = (currentPage - 1) * pageSize; // Menentukan start index untuk "No"

    // Ambil data yang sesuai dengan halaman dan pageSize
    const pageItems = tableData.slice(startIndex, startIndex + pageSize);

    pageItems.forEach((item, index) => {
      const row = document.createElement("tr");

      // Check if the statusQris is 'Blocked'
      const isBlocked = item.StatusQRIS === false ? false : true; // jika false berarti belum blocked

      row.innerHTML = `
      <td>${startIndex + index + 1}</td> <!-- Kolom "No" menggunakan startIndex -->
      <td><a href="#">${item.url}</a></td>
      <td>${item.bank}</td>
      <td>${item.NoQRIS}</td>
      <td>${new Date(item.DateFound).toLocaleDateString('en-US')}</td>
      <td>${item.DateBlocked ? new Date(item.DateBlocked).toLocaleDateString('en-US') : '-'}</td>
      <td>${isBlocked ? "Blocked" : "Active"}</td>
      <td>${item.directory || '-'}</td>
      <td>
        <!-- Conditionally hide the delete button if the status is 'Blocked' -->
        ${!isBlocked ?
          `<button class="btn btn-sm btn-danger delete-btn" data-id="${item._id}">
            <i class="fa fa-ban" aria-hidden="true"></i>
          </button>` : ''}
      </td>
    `;
      tbody.appendChild(row);
    });

    bindActionButtons();
  }

  // Fungsi untuk mengikat action button ke tombol delete
  function bindActionButtons() {
    document.querySelectorAll(".delete-btn").forEach(btn => {
      btn.addEventListener("click", function () {
        const id = this.dataset.id;
        const item = tableData.find(d => d._id === id);
        if (item) {
          selectedRowId = id;
          document.getElementById("noQris").value = item.NoQRIS;
          document.getElementById("dateBlock").value = item.DateBlocked ? new Date(item.DateBlocked).toLocaleDateString("en-US") : '';

          // buka modal
          const blockModalInstance = new bootstrap.Modal(document.getElementById("blokQrisModal"));
          blockModalInstance.show();
        }
      });
    });
  }

  // Fungsi untuk mengupdate informasi pagination
  function updatePaginationControls() {
    const totalPages = Math.ceil(tableData.length / pageSize); // Menghitung jumlah total halaman
    const paginationInfo = document.getElementById("pagination-info");

    paginationInfo.textContent = `Page ${currentPage} of ${totalPages}`; // Update info halaman

    // Enable/disable prev & next buttons
    document.getElementById("prev-page").disabled = currentPage === 1;
    document.getElementById("next-page").disabled = currentPage === totalPages;
  }

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

  // Ubah data saat Block
document.getElementById("blockButton").addEventListener("click", async function () {
  const item = tableData.find(d => d._id === selectedRowId);
  if (item) {
    try {
      // Kirim request untuk block QRIS berdasarkan ID
      const response = await fetch(`/api/qris/${selectedRowId}/block`, {
        method: 'PUT',
      });

      if (!response.ok) {
        throw new Error('Gagal memblokir QRIS');
      }

      const result = await response.json();
      alert(result.message); // Menampilkan pesan sukses

      // Update status lokal setelah berhasil blokir
      item.StatusQRIS = true; // Mengubah status menjadi blocked
      item.DateBlocked = new Date().toLocaleDateString("en-US"); // Optional: update tanggal blokir

      const modal = bootstrap.Modal.getInstance(document.getElementById("blokQrisModal"));
      modal.hide();

      setTimeout(() => {
        populateTable(tableData); // Update table dengan data terbaru
        showAlert(true, "blocked");
      }, 100);
    } catch (error) {
      console.error("Error blocking QRIS:", error);
      alert('Gagal memblokir QRIS');
      showAlert(false, "blocked");
    }
  }
});




});
