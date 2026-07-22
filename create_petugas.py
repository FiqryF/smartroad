import app.bcrypt_compat as bcrypt
from datetime import datetime
from app.db import db

users_collection = db["users"]

def create_petugas():
    accounts = [
        {
            "nama": "Petugas Lapangan 01",
            "email": "petugas@smartroad.gov",
            "password": "Petugas123!",
            "telepon": "081234567891",
            "alamat": "Unit Operasional Lapangan SmartRoad"
        },
        {
            "nama": "Petugas Lapangan 02",
            "email": "petugas2@smartroad.gov",
            "password": "Petugas123!",
            "telepon": "081234567892",
            "alamat": "Unit Operasional Lapangan SmartRoad"
        }
    ]

    for account in accounts:
        existing_user = users_collection.find_one({"email": account["email"]})
        if existing_user:
            users_collection.update_one(
                {"email": account["email"]},
                {"$set": {
                    "nama": account["nama"],
                    "telepon": account["telepon"],
                    "alamat": account["alamat"],
                    "role": "petugas"
                }}
            )
            print(f"Ensured petugas role for: {account['email']}")
            continue

        salt = bcrypt.gensalt()
        hashed_password = bcrypt.hashpw(account["password"].encode("utf-8"), salt)
        users_collection.insert_one({
            "nama": account["nama"],
            "email": account["email"],
            "password": hashed_password.decode("utf-8"),
            "telepon": account["telepon"],
            "alamat": account["alamat"],
            "profile_pic": "default-profile.png",
            "role": "petugas",
            "created_at": datetime.utcnow()
        })
        print(f"Created petugas account: {account['email']}")

if __name__ == "__main__":
    create_petugas()
