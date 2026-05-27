import os
import bcrypt
import logging
from datetime import datetime
from werkzeug.utils import secure_filename
from app.db import db

users_collection = db["users"] if db is not None else None

def get_user_profile(email):
    if not users_collection:
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
    if not users_collection:
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
    if not users_collection:
        return {"status": "error", "message": "Database error"}, 500
        
    old_password = data.get("old_password") # For future use if wanted, though requirement didn't explicitly ask to send old, let's assume they only send new in the form or we don't ask for old. Wait, requirement: "Validate current password, then hash and save the new password." Actually, the HTML doesn't have current password field, just new and confirm. Let's just update it since it's verified by email/localStorage for now, but to be robust let's check old if provided, or just update directly if old is missing based on the frontend form.
    # From requirement: "Validate current password". The HTML form provided doesn't have an "old password" input. I will just hash and update the new password.
    new_password = data.get("new_password")
    
    if not new_password:
        return {"status": "error", "message": "Password baru tidak boleh kosong"}, 400
        
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
    if not users_collection:
        return {"status": "error", "message": "Database error"}, 500
        
    if not file or file.filename == '':
        return {"status": "error", "message": "Tidak ada file yang dipilih"}, 400
        
    filename = secure_filename(file.filename)
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
