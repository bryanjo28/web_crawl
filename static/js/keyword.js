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
  
    // Submit button inside Upload URL modal
    document.getElementById("submitKeyword").addEventListener("click", function () {
      const isSuccess = Math.random() > 0.5; // Simulate success/failure
      setTimeout(function () {
        addKeywordModal.hide();
        showAlert(isSuccess, "add");
      }, 1000);
    });
  
    // Helper function to display alert messages based on the action
    function showAlert(success, action) {
      const ok = document.getElementById("successAlert");
      const no = document.getElementById("errorAlert");
  
      // Set the success/error message and corresponding visibility based on action
      if (action === "add") {
        if (success) {
          document.getElementById("successMessage").textContent = "Add Keyword Success";
        } else {
          document.getElementById("errorMessage").textContent = "Failed to Add Keyword";
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
        document.getElementById("successMessage").textContent = "Rekening berhasil diblokir";
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
        keyword: 'Gacor',
      },
      {
        no: 2,
        keyword: 'Judi Gacor',
      }
    ];
  
    let selectedRowId = null;
  
    function populateTable() {
      const tbody = document.querySelector("table tbody");
      tbody.innerHTML = "";
  
      tableData.forEach((item) => {
        const row = document.createElement("tr");
        
      // Check if the statusRekening is 'Blokir'
      const isBlocked = item.statusRekening === 'Blocked';
  
        row.innerHTML = `
          <td>${item.no}</td>
          <td>${item.keyword}</td>
          <td>
            <button class="btn btn-sm btn-warning edit-btn" data-id="${item.no}">
              <i class="fa fa-pencil" aria-hidden="true"></i>
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
            document.getElementById("keyword").value = item.keyword;
  
            // buka modal
            const blockModalInstance = new bootstrap.Modal(document.getElementById("editKeywordModal"));
            blockModalInstance.show();
          }
        });
      });
  
    }
  
    populateTable()
  
  
    
  
  });
  