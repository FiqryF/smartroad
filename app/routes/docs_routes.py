from flask import Blueprint, jsonify


docs_bp = Blueprint("docs", __name__)


def operation(summary, tag, secured=True, request_body=None):
    item = {
        "tags": [tag],
        "summary": summary,
        "responses": {
            "200": {"description": "Request berhasil"},
            "400": {"description": "Request tidak valid"},
            "401": {"description": "Token tidak ada atau tidak valid"},
            "403": {"description": "Role tidak memiliki akses"},
        },
    }
    if secured:
        item["security"] = [{"bearerAuth": []}]
    if request_body:
        item["requestBody"] = request_body
    return item


JSON_BODY = lambda schema: {
    "required": True,
    "content": {"application/json": {"schema": schema}},
}


@docs_bp.get("/openapi.json")
def openapi_spec():
    report_id = {
        "name": "report_id", "in": "path", "required": True,
        "description": "ID laporan MongoDB", "schema": {"type": "string"},
    }
    paths = {
        "/api/auth/register": {"post": operation("Registrasi akun baru", "Authentication", False, JSON_BODY({"type": "object", "required": ["nama", "email", "password"], "properties": {"nama": {"type": "string"}, "email": {"type": "string", "format": "email"}, "password": {"type": "string", "format": "password"}}}))},
        "/api/auth/login": {"post": operation("Login dan dapatkan JWT", "Authentication", False, JSON_BODY({"type": "object", "required": ["email", "password"], "properties": {"email": {"type": "string", "format": "email"}, "password": {"type": "string", "format": "password"}}}))},
        "/api/profile/user-profile": {"get": operation("Ambil profil pengguna", "Profile")},
        "/api/profile/update-profile": {"post": operation("Perbarui profil pengguna", "Profile")},
        "/api/profile/update-password": {"post": operation("Ubah password", "Profile")},
        "/api/profile/upload-photo": {"post": operation("Unggah foto profil", "Profile")},
        "/api/reports/public-summary": {"get": operation("Ringkasan laporan publik", "Reports", False)},
        "/api/reports/submit": {"post": operation("Kirim laporan kerusakan", "Reports")},
        "/api/reports/user": {"get": operation("Riwayat laporan pengguna", "Reports")},
        "/api/reports/all": {"get": operation("Ambil seluruh laporan (admin)", "Admin")},
        "/api/reports/{report_id}/status": {"put": {**operation("Ubah status dan petugas laporan", "Admin", True, JSON_BODY({"type": "object", "required": ["status"], "properties": {"status": {"type": "string", "enum": ["Menunggu", "Proses", "Selesai"]}, "assigned_petugas_email": {"type": "string", "format": "email"}}})), "parameters": [report_id]}},
        "/api/reports/{report_id}/review": {"post": {**operation("Kirim ulasan laporan", "Reports"), "parameters": [report_id]}},
        "/api/reports/{report_id}/cs-messages": {
            "get": {**operation("Ambil pesan CS", "Customer Service"), "parameters": [report_id]},
            "post": {**operation("Kirim pesan CS", "Customer Service", True, JSON_BODY({"type": "object", "required": ["message"], "properties": {"message": {"type": "string"}}})), "parameters": [report_id]},
        },
        "/api/reports/cs/conversations": {"get": operation("Daftar percakapan CS (admin)", "Customer Service")},
        "/api/reports/assigned": {"get": operation("Daftar tugas petugas", "Petugas")},
        "/api/reports/{report_id}/complete": {"post": {**operation("Selesaikan laporan dan unggah bukti", "Petugas"), "parameters": [report_id]}},
        "/api/reports/notifications/user": {"get": operation("Ambil notifikasi pengguna", "Notifications")},
        "/api/reports/notifications/user/read": {"put": operation("Tandai notifikasi telah dibaca", "Notifications")},
        "/api/admin/dashboard-stats": {"get": operation("Statistik dashboard admin", "Admin")},
        "/api/admin/users": {"get": operation("Daftar seluruh pengguna", "Admin")},
        "/api/admin/petugas": {"get": operation("Daftar petugas", "Admin")},
    }
    return jsonify({
        "openapi": "3.0.3",
        "info": {
            "title": "SmartRoad API",
            "version": "1.0.0",
            "description": "Dokumentasi interaktif REST API SmartRoad. Klik **Authorize** lalu masukkan JWT untuk mencoba endpoint yang dilindungi.",
        },
        "servers": [{"url": "/", "description": "Server SmartRoad aktif"}],
        "tags": [{"name": name} for name in ["Authentication", "Profile", "Reports", "Admin", "Petugas", "Customer Service", "Notifications"]],
        "paths": paths,
        "components": {"securitySchemes": {"bearerAuth": {"type": "http", "scheme": "bearer", "bearerFormat": "JWT", "description": "Masukkan access token dari endpoint login."}}},
    })
