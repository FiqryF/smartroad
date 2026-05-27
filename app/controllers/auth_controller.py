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
            "password": hashed_password.decode('utf-8')
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
                        "email": user.get("email")
                    }
                }, 200

        return {"status": "error", "message": "Email atau password salah"}, 401
    except Exception as e:
        logging.error(f"Error saat login: {e}")
        return {"status": "error", "message": "Terjadi kesalahan saat memproses data"}, 500
