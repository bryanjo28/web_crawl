document.addEventListener('DOMContentLoaded', function () {
	fetch('static/navbar/navbar.html')
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
		})
		.catch(error => console.log('Error loading the navbar:', error));
  // 1) Inisialisasi instance modal
  const addModal    = new bootstrap.Modal(document.getElementById('addUrl'));
  const uploadModal = new bootstrap.Modal(document.getElementById('uploadUrl'));

  // 2) Tombol untuk membuka masing‑masing modal
  document.getElementById('openAddBtn').addEventListener('click',    () => addModal.show());
  document.getElementById('openUploadBtn').addEventListener('click', () => uploadModal.show());

  // 3) Tombol Save di modal Add
  document.getElementById("saveButton").addEventListener("click", function () {
    const isSuccess = Math.random() > 0.5;

    // tunda 1 detik, lalu hide modal dan tunjukkan alert
    setTimeout(function () {
      addModal.hide();
      showAlert(isSuccess);
    }, 1000);
  });

  // 4) Tombol Submit di modal Upload
  document.getElementById("submitUrl").addEventListener("click", function () {
    const isSuccess = Math.random() > 0.5;

    setTimeout(function () {
      uploadModal.hide();
      showAlert(isSuccess);
    }, 1000);
  });

  // helper untuk alert
  function showAlert(success) {
    const ok = document.getElementById("successAlert");
    const no = document.getElementById("errorAlert");
    if (success) {
      ok.style.display = 'block';
      no .style.display = 'none';
    } else {
      no .style.display = 'block';
      ok .style.display = 'none';
    }
    setTimeout(() => {
      ok.style.display = 'none';
      no .style.display = 'none';
    }, 3000);
  }

  // flatpickr init (jika perlu)
  flatpickr("#last-crawling", {
    mode: "range",
    dateFormat: "m/d/Y",
  });
});
