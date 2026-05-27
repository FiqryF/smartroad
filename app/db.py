import os
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure
import logging

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/")
DB_NAME = "smartroad_db"

def get_db():
    try:
        client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
        client.admin.command('ping')
        logging.info(f"Berhasil terhubung ke MongoDB lokal di {MONGO_URI}")
        return client[DB_NAME]
    except ConnectionFailure:
        logging.error("Gagal terhubung ke MongoDB. Pastikan layanan MongoDB lokal sudah berjalan.")
        return None
    except Exception as e:
        logging.error(f"Terjadi kesalahan saat menghubungkan ke database: {e}")
        return None

# Singleton instance
db = get_db()
