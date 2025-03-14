from flask import Flask, render_template, jsonify, send_from_directory

app = Flask(__name__)

# Data Dummy untuk testing
judol_data = [
    {
        "situs": "example.com",
        "flag_judul_system": "Yes",
        "flag_judul_user": "No",
        "flag_aktif": "Active",
        "uid": "12345",
        "password": "password123",
        "first_crawling": "2023-01-01",
        "last_crawling": "2024-03-14",
        "last_update": "2024-03-14"
    },
    {
        "situs": "testsite.com",
        "flag_judul_system": "No",
        "flag_judul_user": "Yes",
        "flag_aktif": "Inactive",
        "uid": "67890",
        "password": "securepass",
        "first_crawling": "2022-05-10",
        "last_crawling": "2024-02-20",
        "last_update": "2024-03-10"
    }
]

# Data Dummy untuk Rekening
rekening_data = [
    {
        "nomor_rekening": "1234567890",
        "bank": "Bank A",
        "situs": "example.com",
        "tgl_temuan": "2024-03-10",
        "tgl_blokir": "2024-03-15"
    },
    {
        "nomor_rekening": "0987654321",
        "bank": "Bank B",
        "situs": "fraudsite.com",
        "tgl_temuan": "2024-02-20",
        "tgl_blokir": "2024-02-25"
    }
]

# Route untuk menyajikan file statis jika diperlukan
@app.route('/static/bootstrap/<path:filename>')
def bootstrap_static(filename):
    return send_from_directory('static/bootstrap', filename)

@app.route('/static/jquery/<path:filename>')
def jquery_static(filename):
    return send_from_directory('static/jquery', filename)

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/dashboard')
def dashboard():
    return render_template('dashboard.html')

@app.route('/sites')
def sites():
    return render_template('sites.html', judols=judol_data)

@app.route('/rekening')
def rekening():
    return render_template('rekening.html', rekening_data=rekening_data)

# API untuk data tabel
@app.route('/api/judols')
def api_users():
    return jsonify(judol_data)

if __name__ == '__main__':
    app.run(debug=True)
