document.addEventListener("DOMContentLoaded", async function () {
    let selectedDeleteId = null; // variabel global di JS

    await window.AppAuth.initPage();

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
