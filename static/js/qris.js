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
        document.getElementById("successMessage").textContent = "QRIS berhasil diblokir";
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
  
    // Dummy data awal
    const tableData = [
      {
        no: 1,
        url: 'https://slotgacor88.co.sg',
        bank: 'BCA',
        noQris: '1234567',
        dateFound: '3/15/2025',
        dateBlocked: '3/16/2025',
        statusQris: 'Blocked',
        directory: 'C:\User\sdasd',
      },
      {
        no: 2,
        url: 'https://slotgacor88.co.sg',
        bank: 'BCA',
        noQris: '563475',
        dateFound: '3/15/2025',
        dateBlocked: '3/16/2025',
        statusQris: 'Active',
        directory: 'C:\User\sdasd',
      }
    ];
  
    let selectedRowId = null;
  
    function populateTable() {
      const tbody = document.querySelector("table tbody");
      tbody.innerHTML = "";
  
      tableData.forEach((item) => {
        const row = document.createElement("tr");
				// Check if the statusRekening is 'Blokir'
				const isBlocked = item.statusQris === 'Blocked';

        row.innerHTML = `
          <td>${item.no}</td>
          <td><a href="#">${item.url}</a></td>
          <td>${item.bank}</td>
          <td>${item.noQris}</td>
          <td>${item.dateFound}</td>
          <td>${item.dateBlocked}</td>
          <td>${item.statusQris}</td>
          <td>${item.directory}</td>
           <td>
					<!-- Conditionally hide the delete button if the status is 'Blocked' -->
					${!isBlocked ? 
						`<button class="btn btn-sm btn-danger delete-btn" data-id="${item.no}">
							<i class="fa fa-ban" aria-hidden="true"></i>
						</button>` : ''}
					</td>
        `;
        tbody.appendChild(row);
      });
      bindActionButtons();
    }
  
    function bindActionButtons() {
      document.querySelectorAll(".delete-btn").forEach(btn => {
        btn.addEventListener("click", function () {
          const id = parseInt(this.dataset.id);
          const item = tableData.find(d => d.no === id);
          if (item) {
            selectedRowId = id;
            document.getElementById("noQris").value = item.noQris;
            document.getElementById("dateBlock").value = item.dateBlocked;
  
            // buka modal
            const blockModalInstance = new bootstrap.Modal(document.getElementById("blokQrisModal"));
            blockModalInstance.show();
          }
        });
      });
  
    }
  
    populateTable()
  

    // Ubah data saat Block
    document.getElementById("blockButton").addEventListener("click", function () {
      const item = tableData.find(d => d.no === selectedRowId);
      if (item) {
        item.statusQris = "Blocked"; // hanya ubah status
        item.dateBlocked = new Date().toLocaleDateString("en-US"); // optional: update tanggal blokir
    
        const modal = bootstrap.Modal.getInstance(document.getElementById("blokQrisModal"));
        modal.hide();
    
        setTimeout(() => {
          populateTable();
          showAlert(true, "blocked");
        }, 500);
      }
    });
    
  
  });
  