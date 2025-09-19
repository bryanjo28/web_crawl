document.addEventListener("DOMContentLoaded", function () {
    let selectedDeleteId = null; // variabel global di JS

    // Sidebar load dan nav toggle
    fetch("../static/navbar/navbar.html")
        .then((response) => response.text())
        .then((data) => {
            document.querySelector(".sidebar").innerHTML = data;

            document.getElementById("toggleSidebarBtn").addEventListener("click", function () {
                const sidebar = document.querySelector(".sidebar");
                const content = document.getElementById("content");
                sidebar.classList.toggle("collapsed");
                content.classList.toggle("collapsed");
            });

            const menuItems = document.querySelectorAll(".nav-link");
            const currentUrl = window.location.pathname.split("/").pop();
            menuItems.forEach((item) => {
                const itemUrl = item.getAttribute("href").split("/").pop();
                if (itemUrl === currentUrl) {
                    item.classList.add("active");
                }
            });
        })
        .catch((error) => console.log("Error loading the navbar:", error));

    const API = '/api/config';

    const show = (type, msg) => {
        document.getElementById('alertBox').innerHTML =
            `<div class="alert alert-${type} alert-dismissible fade show" role="alert">
           ${msg}
           <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
         </div>`;
    };

    async function loadConfig() {
        try {
            const r = await fetch(API);
            if (r.ok) {
                const d = await r.json();
                document.getElementById('maxUrlScan').value = d.maxUrlScan ?? '';
                document.getElementById('maxFilter').value = d.maxFilter ?? '';
            }
            // 404 = belum ada data → biarin kosong
        } catch {
            show('danger', 'Gagal memuat config.');
        }
    }

    async function saveConfig(e) {
        e.preventDefault();
        const payload = {
            maxUrlScan: Number(document.getElementById('maxUrlScan').value),
            maxFilter: Number(document.getElementById('maxFilter').value),
        };
        try {
            const r = await fetch(API, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!r.ok) throw new Error();
            show('success', 'Config tersimpan.');
        } catch {
            show('danger', 'Gagal menyimpan config.');
        }
    }

    document.getElementById('configForm').addEventListener('submit', saveConfig);
    loadConfig();
});
