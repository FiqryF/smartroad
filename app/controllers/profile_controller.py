import os
import bcrypt
import logging
from datetime import datetime
from werkzeug.utils import secure_filename
from app.db import db

users_collection = db["users"] if db is not None else None

ALLOWED_IMAGE_EXTENSIONS = {"jpg", "jpeg", "png", "webp"}
ALLOWED_IMAGE_MIMETYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_IMAGE_SIZE = 5 * 1024 * 1024

def _validate_image_upload(file):
    filename = secure_filename(file.filename or "")
    if not filename or "." not in filename:
        return None, "Format file tidak valid. Gunakan JPG, PNG, atau WEBP."

    extension = filename.rsplit(".", 1)[1].lower()
    if extension not in ALLOWED_IMAGE_EXTENSIONS:
        return None, "Format file tidak didukung. Gunakan JPG, PNG, atau WEBP."

    if (file.mimetype or "").lower() not in ALLOWED_IMAGE_MIMETYPES:
        return None, "Tipe file tidak valid. Harap unggah file gambar."

    current_pos = file.stream.tell()
    file.stream.seek(0, os.SEEK_END)
    file_size = file.stream.tell()
    file.stream.seek(current_pos)

    if file_size <= 0:
        return None, "File gambar kosong."
    if file_size > MAX_IMAGE_SIZE:
        return None, "Ukuran gambar maksimal 5 MB."

    return filename, None

def get_user_profile(email):
    if users_collection is None:
        return {"status": "error", "message": "Database error"}, 500
        
    user = users_collection.find_one({"email": email})
    if not user:
        return {"status": "error", "message": "User tidak ditemukan"}, 404
        
    # Format created_at to "Bulan Tahun" (e.g. "Mei 2026")
    created_at = user.get("created_at")
    if created_at and isinstance(created_at, datetime):
        months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"]
        month_name = months[created_at.month - 1]
        formatted_date = f"{month_name} {created_at.year}"
    else:
        formatted_date = "Anggota Lama"

    profile_data = {
        "nama": user.get("nama", ""),
        "email": user.get("email", ""),
        "telepon": user.get("telepon", ""),
        "alamat": user.get("alamat", ""),
        "profile_pic": user.get("profile_pic", "default-profile.png"),
        "bergabung": formatted_date
    }
    
    return {"status": "success", "data": profile_data}, 200

def update_user_profile(email, data):
    if users_collection is None:
        return {"status": "error", "message": "Database error"}, 500
        
    nama = data.get("nama")
    telepon = data.get("telepon", "")
    alamat = data.get("alamat", "")
    
    if not nama:
        return {"status": "error", "message": "Nama lengkap tidak boleh kosong"}, 400
        
    result = users_collection.update_one(
        {"email": email},
        {"$set": {
            "nama": nama,
            "telepon": telepon,
            "alamat": alamat
        }}
    )
    
    if result.matched_count == 0:
        return {"status": "error", "message": "User tidak ditemukan"}, 404
        
    return {"status": "success", "message": "Profil berhasil diperbarui"}, 200

def update_user_password(email, data):
    if users_collection is None:
        return {"status": "error", "message": "Database error"}, 500
        
    old_password = data.get("old_password")
    new_password = data.get("new_password")
    
    if not old_password:
        return {"status": "error", "message": "Password saat ini wajib diisi"}, 400
    if not new_password:
        return {"status": "error", "message": "Password baru tidak boleh kosong"}, 400

    user = users_collection.find_one({"email": email})
    if not user:
        return {"status": "error", "message": "User tidak ditemukan"}, 404

    stored_password = user.get("password", "")
    if stored_password.startswith(("$2a$", "$2b$", "$2y$")):
        is_valid = bcrypt.checkpw(old_password.encode('utf-8'), stored_password.encode('utf-8'))
    else:
        is_valid = old_password == stored_password

    if not is_valid:
        return {"status": "error", "message": "Password saat ini tidak sesuai"}, 401
        
    salt = bcrypt.gensalt()
    hashed_password = bcrypt.hashpw(new_password.encode('utf-8'), salt).decode('utf-8')
    
    result = users_collection.update_one(
        {"email": email},
        {"$set": {"password": hashed_password}}
    )
    
    if result.matched_count == 0:
        return {"status": "error", "message": "User tidak ditemukan"}, 404
        
    return {"status": "success", "message": "Password berhasil diperbarui"}, 200

def upload_profile_photo(email, file, upload_folder):
    if users_collection is None:
        return {"status": "error", "message": "Database error"}, 500
        
    if not file or file.filename == '':
        return {"status": "error", "message": "Tidak ada file yang dipilih"}, 400
        
    filename, error_message = _validate_image_upload(file)
    if error_message:
        return {"status": "error", "message": error_message}, 400

    # prepend email to make it unique
    unique_filename = f"{email.split('@')[0]}_{int(datetime.now().timestamp())}_{filename}"
    file_path = os.path.join(upload_folder, unique_filename)
    
    try:
        if not os.path.exists(upload_folder):
            os.makedirs(upload_folder)
        file.save(file_path)
        
        # URL for frontend is relative to static
        photo_url = f"uploads/{unique_filename}"
        
        users_collection.update_one(
            {"email": email},
            {"$set": {"profile_pic": photo_url}}
        )
        
        return {"status": "success", "message": "Foto profil berhasil diunggah", "profile_pic": photo_url}, 200
    except Exception as e:
        logging.error(f"Error saving photo: {e}")
        return {"status": "error", "message": "Gagal menyimpan foto"}, 500
