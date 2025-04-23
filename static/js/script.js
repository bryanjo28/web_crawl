document.addEventListener('DOMContentLoaded', function () {
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

  // 1) Inisialisasi instance modal
  const addModal    = new bootstrap.Modal(document.getElementById('addUrl'));
  const uploadModal = new bootstrap.Modal(document.getElementById('uploadUrl'));
  const editModal = new bootstrap.Modal(document.getElementById('editUrlModal'));
  const deleteModal = new bootstrap.Modal(document.getElementById('deleteUrlModal'))

  // 2) Tombol untuk membuka masing‑masing modal
  document.getElementById('openAddBtn').addEventListener('click',    () => addModal.show());
  document.getElementById('openUploadBtn').addEventListener('click', () => uploadModal.show());

  // Save button inside Add URL modal
  document.getElementById("saveButton").addEventListener("click", function () {
    const isSuccess = Math.random() > 0.5; // Simulate success/failure
    setTimeout(function () {
      addModal.hide();
      showAlert(isSuccess, "add");
    }, 1000);
  });

  // Submit button inside Upload URL modal
  document.getElementById("submitUrl").addEventListener("click", function () {
    const isSuccess = Math.random() > 0.5; // Simulate success/failure
    setTimeout(function () {
      uploadModal.hide();
      showAlert(isSuccess, "upload");
    }, 1000);
  });

  // Save button inside Edit URL modal
  document.getElementById("saveEditUrl").addEventListener("click", function () {
    const isSuccess = Math.random() > 0.5; // Simulate success/failure
    setTimeout(function () {
      editModal.hide();
      showAlert(true, "edit");
    }, 1000);
  });

  // Confirm delete button inside Delete URL modal
  document.getElementById("confirmDelete").addEventListener("click", function () {
    const isSuccess = Math.random() > 0.5; // Simulate success/failure
    setTimeout(function () {
      deleteModal.hide();
      showAlert(true, "delete");
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
  flatpickr("#last-crawling", {
    mode: "range",
    dateFormat: "m/d/Y",
  });
  
    // Dummy data awal
    const tableData = [
      {
        no: 1,
        url: 'https://slotgacor88.co.sg',
        inputBy: 'User',
        flagJudul: 'Y',
        status: 'Active',
        uid: 'Userid01',
        password: 'user1234',
        firstCrawling: '3/10/2025',
        lastCrawling: '3/15/2025',
        lastUpdate: '3/15/2025',
        crawlingStatus: 'Success'
      },
      {
        no: 2,
        url: 'https://BetSlotgg.co.sg',
        inputBy: 'System',
        flagJudul: 'N',
        status: 'Active',
        uid: 'Userid02',
        password: 'pass456',
        firstCrawling: '3/14/2025',
        lastCrawling: '3/15/2025',
        lastUpdate: '3/15/2025',
        crawlingStatus: 'Failed'
      }
    ];
  
    let selectedRowId = null;
  
    function populateTable() {
      const tbody = document.querySelector("table tbody");
      tbody.innerHTML = "";
  
      tableData.forEach((item) => {
        const row = document.createElement("tr");
        row.innerHTML = `
          <td>${item.no}</td>
          <td><a href="#">${item.url}</a></td>
          <td>${item.inputBy}</td>
          <td>${item.flagJudul}</td>
          <td>${item.status}</td>
          <td>${item.uid}</td>
          <td>${item.password}</td>
          <td>${item.firstCrawling}</td>
          <td>${item.lastCrawling}</td>
          <td>${item.lastUpdate}</td>
          <td><span class="badge ${item.crawlingStatus === 'Success' ? 'bg-success' : 'bg-danger'}">${item.crawlingStatus}</span></td>
          <td>
            <button class="btn btn-sm btn-warning edit-btn" data-id="${item.no}">
              <i class="fa fa-pencil" aria-hidden="true"></i>
            </button>
            <button class="btn btn-sm btn-danger delete-btn" data-id="${item.no}">
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
          const id = parseInt(this.dataset.id);
          const item = tableData.find(d => d.no === id);
          if (item) {
            selectedRowId = id;
            document.getElementById("editUrl").value = item.url;
            document.getElementById("editClassification").value = item.flagJudul;
            document.getElementById("editWebStatus").value = item.status;
            document.getElementById("editUid").value = item.uid;
            document.getElementById("editPassword").value = item.password;
  
            // buka modal
            const editModalInstance = new bootstrap.Modal(document.getElementById("editUrlModal"));
            editModalInstance.show();
          }
        });
      });
  
      document.querySelectorAll(".delete-btn").forEach(btn => {
        btn.addEventListener("click", function () {
          const id = parseInt(this.dataset.id);
          selectedRowId = id;
  
          // buka modal delete
          const deleteModalInstance = new bootstrap.Modal(document.getElementById("deleteUrlModal"));
          deleteModalInstance.show();
        });
      });
    }
  
    // Ubah data saat Save Edit
    document.getElementById("saveEditUrl").addEventListener("click", function () {
      const item = tableData.find(d => d.no === selectedRowId);
      if (item) {
        item.url = document.getElementById("editUrl").value;
        item.flagJudul = document.getElementById("editClassification").value;
        item.status = document.getElementById("editWebStatus").value;
        item.uid = document.getElementById("editUid").value;
        item.password = document.getElementById("editPassword").value;
        item.lastUpdate = new Date().toLocaleDateString("en-US");
    
        // Tutup modal dulu, lalu refresh
        const modal = bootstrap.Modal.getInstance(document.getElementById("editUrlModal"));
        modal.hide();
    
        setTimeout(() => {
          populateTable();
        }, 500);
      }
    });
    
  
    // Hapus data saat Confirm Delete
    document.getElementById("confirmDelete").addEventListener("click", function () {
      const index = tableData.findIndex(d => d.no === selectedRowId);
      if (index !== -1) {
        tableData.splice(index, 1);
    
        // Tutup modal dulu, lalu refresh
        const modal = bootstrap.Modal.getInstance(document.getElementById("deleteUrlModal"));
        modal.hide();
    
        setTimeout(() => {
          populateTable();
        }, 500);
      }
    });
    
  
    // Jalankan pertama kali
    populateTable();
  
});
