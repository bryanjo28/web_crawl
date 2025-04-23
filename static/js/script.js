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
  document.getElementById('editUrlButton').addEventListener('click', () => editModal.show());
  document.getElementById('deleteUrlButton').addEventListener('click', () => deleteModal.show());

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
      showAlert(isSuccess, "edit");
    }, 1000);
  });

  // Confirm delete button inside Delete URL modal
  document.getElementById("confirmDelete").addEventListener("click", function () {
    const isSuccess = Math.random() > 0.5; // Simulate success/failure
    setTimeout(function () {
      deleteModal.hide();
      showAlert(isSuccess, "delete");
    }, 1000);
  });


  // Fungsi untuk menanggapi tombol konfirmasi delete
  document.getElementById("confirmDelete").addEventListener("click", function () {
    const isSuccess = Math.random() > 0.5;
      setTimeout(function () {
        deleteModal.hide();
        showAlert(isSuccess);
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
});
