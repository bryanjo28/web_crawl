document.addEventListener("DOMContentLoaded", async function () {
    let selectedDeleteId = null; // variabel global di JS

    await window.AppAuth.initPage();

    // 🧹 Load data ke tabel tanpa duplikat
    function loadExcludeCrawl() {
        $.get("/api/excludeCrawl", function (data) {
            let tbody = $("table tbody");
            tbody.empty(); // Bersihkan dulu sebelum render ulang
            data.forEach((item, index) => {
                tbody.append(`
                    <tr>
                      <td>${index + 1}</td>
                      <td>${item.url}</td>
                      <td>
                        <button class="btn btn-sm btn-warning" onclick="editExcludeCrawl('${item._id}', '${item.url}')"><i class="fa fa-pencil" aria-hidden="true"></i></button>
                        <button class="btn btn-sm btn-danger" onclick="deleteExcludeCrawl('${item._id}')"><i class="fa fa-trash" aria-hidden="true"></i></button>

                      </td>
                    </tr>
                `);
            });
        });
    }
    // Buka modal tambah saat tombol Add diklik
    $("#openUploadBtn").on("click", function () {
        $("#addKeyword").modal("show");
    });

    // ➕ Tambah data
    async function addExcludeCrawl() {
        const url = $("#excludeUrl").val();

        try {
            const response = await fetch("/api/excludeCrawl", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ url }),
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.message || "Gagal menambahkan URL");
            }

            const result = await response.json();

            $("#addKeyword").modal("hide");

            // ⬇️ Tampilkan pesan sukses dengan jumlah yang dihapus
            $("#successMessage").text(
                `URL ${result.data.url} berhasil di-exclude. ${result.deletedCount} data crawl di-exclude.`
            );
            $("#successAlert").show().delay(3000).fadeOut();

            $("#excludeUrl").val(""); // reset field input
            loadExcludeCrawl(); // refresh data

        } catch (error) {
            console.error("Add error:", error);
            $("#errorMessage").text(error.message);
            $("#errorAlert").show().delay(3000).fadeOut();
        }
    }

    // Fungsi untuk buka modal konfirmasi
    window.deleteExcludeCrawl = function (id) {
        selectedDeleteId = id;
        $("#confirmDeleteModal").modal("show");
    };



    // ✏️ Buka modal edit
    window.editExcludeCrawl = function (id, url) {
        $("#editKeywordModal").modal("show");
        $("#keywordEdit").val(url);
        $("#saveKeywordBtn").data("id", id);
    };

    // 💾 Simpan hasil edit
    $("#saveKeywordBtn").on("click", function () {
        const id = $(this).data("id");
        const url = $("#keywordEdit").val();
        $.ajax({
            url: `/api/excludeCrawl/${id}`,
            type: "PUT",
            contentType: "application/json",
            data: JSON.stringify({ url }),
            success: function () {
                $("#editKeywordModal").modal("hide");
                $("#successAlert").show().delay(2000).fadeOut();
                loadExcludeCrawl();
            },
            error: function () {
                $("#errorAlert").show().delay(2000).fadeOut();
            }
        });
    });

    // 🔄 Tombol reset filter / refresh
    $("#resetFilter").on("click", function () {
        loadExcludeCrawl();
    });

    // ⏱️ Panggil awal
    loadExcludeCrawl();

    // Trigger filter saat tombol Search diklik
    $("#searchBtn").on("click", function () {
        const keyword = $("#search").val().toLowerCase();
        $("table tbody tr").each(function () {
            const rowText = $(this).text().toLowerCase();
            $(this).toggle(rowText.includes(keyword));
        });
    });


    // ➕ Tombol tambah
    $("#submitKeyword").on("click", function () {
        addExcludeCrawl();
    });

    // Saat user klik tombol konfirmasi hapus di modal
    $("#confirmDeleteBtn").on("click", async function () {
        if (!selectedDeleteId) return;

        try {
            const response = await fetch(`/api/excludeCrawl/${selectedDeleteId}`, {
                method: "DELETE",
            });

            if (!response.ok) {
                throw new Error("Gagal menghapus URL");
            }

            $("#confirmDeleteModal").modal("hide");
            loadExcludeCrawl(); // Refresh data

        } catch (error) {
            console.error("Delete error:", error);
            $("#errorAlert").show().delay(2000).fadeOut();
        } finally {
            selectedDeleteId = null;
        }
    });
});


