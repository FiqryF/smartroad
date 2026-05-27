from datetime import datetime
import bcrypt
import logging
from app.db import db

# Mengakses koleksi users
users_collection = db["users"] if db is not None else None

def register_user(data):
    if users_collection is None:
        return {"status": "error", "message": "Database tidak terhubung"}, 500

    nama = data.get('nama')
    email = data.get('email')
    password = data.get('password')
    confirm_password = data.get('confirm_password')

    if not nama or not email or not password or not confirm_password:
        return {"status": "error", "message": "Data tidak lengkap. Harap isi semua kolom"}, 400

    if password != confirm_password:
        return {"status": "error", "message": "Password tidak cocok!"}, 400

    existing_user = users_collection.find_one({"email": email})
    if existing_user:
        return {"status": "error", "message": "Email sudah digunakan, silakan gunakan email lain"}, 409

    # Hashing password
    try:
        salt = bcrypt.gensalt()
        hashed_password = bcrypt.hashpw(password.encode('utf-8'), salt)
        
        new_user = {
            "nama": nama,
            "email": email,
            "password": hashed_password.decode('utf-8'),
            "telepon": "",
            "alamat": "",
            "profile_pic": "default-profile.png",
            "created_at": datetime.utcnow()
        }

        result = users_collection.insert_one(new_user)
        if result.inserted_id:
            return {
                "status": "success",
                "message": "Registrasi berhasil!",
                "user_id": str(result.inserted_id)
            }, 201
        else:
            return {"status": "error", "message": "Gagal menyimpan data pengguna"}, 500
    except Exception as e:
        logging.error(f"Error saat registrasi: {e}")
        return {"status": "error", "message": "Terjadi kesalahan saat memproses data"}, 500

def login_user(data):
    if users_collection is None:
        return {"status": "error", "message": "Database tidak terhubung"}, 500

    email = data.get('email')
    password = data.get('password')

    if not email or not password:
        return {"status": "error", "message": "Harap masukkan email dan password"}, 400

    try:
        user = users_collection.find_one({"email": email})
        
        # Cek apakah user ada dan password cocok (menggunakan bcrypt)
        # Tambahkan fallback untuk plain-text password jika database lama belum di-hash (Optional)
        if user:
            stored_password = user.get("password")
            
            is_valid = False
            if stored_password.startswith('$2b$'):
                # Password is hashed
                is_valid = bcrypt.checkpw(password.encode('utf-8'), stored_password.encode('utf-8'))
            else:
                # Plain-text fallback for existing test data
                is_valid = (password == stored_password)

            if is_valid:
                return {
                    "status": "success",
                    "message": "Login berhasil!",
                    "user_data": {
                        "id": str(user.get("_id")),
                        "nama": user.get("nama"),
                        "email": user.get("email"),
                        "telepon": user.get("telepon", ""),
                        "alamat": user.get("alamat", ""),
                        "profile_pic": user.get("profile_pic", "default-profile.png")
                    }
                }, 200

        return {"status": "error", "message": "Email atau password salah"}, 401
    except Exception as e:
        logging.error(f"Error saat login: {e}")
        return {"status": "error", "message": "Terjadi kesalahan saat memproses data"}, 500

def get_profile_data(email):
    # Cek if user: bukan if users_collection
    user = users_collection.find_one({"email": email})
    
    if not user:
        return {"status": "error", "message": "User tidak ditemukan"}, 404
        
    created_at = user.get("created_at")
    
    if created_at and isinstance(created_at, datetime):
        months = [
            "Januari", "Februari", "Maret", "April", "Mei", "Juni", 
            "Juli", "Agustus", "September", "Oktober", "November", "Desember"
        ]
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

def update_user_profile(data):
    email = data.get("email")
    nama = data.get("nama")
    telepon = data.get("telepon", "")
    alamat = data.get("alamat", "")
    
    if not email or not nama:
        return {"status": "error", "message": "Email dan Nama lengkap tidak boleh kosong"}, 400
        
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

def update_user_password(data):
    email = data.get("email")
    new_password = data.get("new_password")
    
    if not email or not new_password:
        return {"status": "error", "message": "Email dan Password baru tidak boleh kosong"}, 400
        
    salt = bcrypt.gensalt()
    hashed_password = bcrypt.hashpw(new_password.encode('utf-8'), salt).decode('utf-8')
    
    result = users_collection.update_one(
        {"email": email},
        {"$set": {"password": hashed_password}}
    )
    
    if result.matched_count == 0:
        return {"status": "error", "message": "User tidak ditemukan"}, 404
        
    return {"status": "success", "message": "Password berhasil diperbarui"}, 200

def update_user_photo(email, photo_url):
    result = users_collection.update_one(
        {"email": email},
        {"$set": {"profile_pic": photo_url}}
    )
    
    if result.matched_count == 0:
        return {"status": "error", "message": "User tidak ditemukan"}, 404
        
    return {"status": "success", "message": "Foto profil berhasil diperbarui", "profile_pic": photo_url}, 200
