import app.bcrypt_compat as bcrypt
from datetime import datetime
from app.db import db

users_collection = db["users"]

def create_admin():
    email = "admin@smartroad.gov"
    password = "Admin123!"
    
    existing_user = users_collection.find_one({"email": email})
    if existing_user:
        print("Admin user already exists.")
        # Make sure role is admin
        users_collection.update_one({"email": email}, {"$set": {"role": "admin"}})
        print("Ensured role is admin.")
        return
        
    salt = bcrypt.gensalt()
    hashed_password = bcrypt.hashpw(password.encode('utf-8'), salt)
    
    admin_user = {
        "nama": "Admin Pusat",
        "email": email,
        "password": hashed_password.decode('utf-8'),
        "telepon": "081234567890",
        "alamat": "Kantor Pusat SmartRoad",
        "profile_pic": "default-profile.png",
        "role": "admin",
        "created_at": datetime.utcnow()
    }
    
    users_collection.insert_one(admin_user)
    print(f"Admin user created successfully with email: {email}")

if __name__ == "__main__":
    create_admin()
