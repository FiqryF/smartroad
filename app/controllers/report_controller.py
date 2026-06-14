from datetime import datetime
import os
import logging
from app.db import db
from werkzeug.utils import secure_filename
from flask import current_app

reports_collection = db["reports"] if db is not None else None

ALLOWED_IMAGE_EXTENSIONS = {"jpg", "jpeg", "png", "webp"}
ALLOWED_IMAGE_MIMETYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_IMAGE_SIZE = 5 * 1024 * 1024

def _validate_report_image(file):
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

def save_report(data, file):
    if reports_collection is None:
        return {"status": "error", "message": "Database tidak terhubung"}, 500

    try:
        # Require essential data
        if not data.get('title') or not data.get('reporter_email'):
            return {"status": "error", "message": "Data tidak lengkap. Harap isi semua kolom."}, 400

        image_path = ""
        if file and file.filename != '':
            filename, error_message = _validate_report_image(file)
            if error_message:
                return {"status": "error", "message": error_message}, 400

            unique_filename = f"{int(datetime.now().timestamp())}_{filename}"
            upload_folder = os.path.join(current_app.static_folder, 'uploads', 'reports')
            
            if not os.path.exists(upload_folder):
                os.makedirs(upload_folder)
                
            file.save(os.path.join(upload_folder, unique_filename))
            image_path = f"uploads/reports/{unique_filename}"
        else:
            return {"status": "error", "message": "Harap unggah foto bukti kerusakan."}, 400

        new_report = {
            "title": data.get('title'),
            "address": data.get('address'),
            "province": data.get('province'),
            "city": data.get('city'),
            "district": data.get('district'),
            "category": data.get('category'),
            "hazard_level": data.get('hazard_level'),
            "dimensions": data.get('dimensions'),
            "description": data.get('description'),
            "lat": float(data.get('lat', 0)),
            "lng": float(data.get('lng', 0)),
            "image_path": image_path,
            "reporter_email": data.get('reporter_email'),
            "status": "Menunggu",
            "created_at": datetime.utcnow()
        }

        result = reports_collection.insert_one(new_report)
        if result.inserted_id:
            return {
                "status": "success",
                "message": "Laporan berhasil dikirim!",
                "report_id": str(result.inserted_id),
                "title": new_report["title"]
            }, 201
        else:
            return {"status": "error", "message": "Gagal menyimpan laporan"}, 500
    except Exception as e:
        logging.error(f"Error saat menyimpan laporan: {e}")
        return {"status": "error", "message": "Terjadi kesalahan sistem saat memproses laporan"}, 500

def get_user_reports(email):
    if reports_collection is None:
        return {"status": "error", "message": "Database tidak terhubung"}, 500
        
    try:
        # Fetch reports matching the email, sorted by created_at descending (-1)
        reports_cursor = reports_collection.find({"reporter_email": email}).sort("created_at", -1)
        reports = []
        for doc in reports_cursor:
            doc['_id'] = str(doc['_id'])
            reports.append(doc)
            
        return {"status": "success", "data": reports}, 200
    except Exception as e:
        logging.error(f"Error saat mengambil laporan user: {e}")
        return {"status": "error", "message": "Terjadi kesalahan saat memproses data"}, 500

def get_all_reports():
    if reports_collection is None:
        return {"status": "error", "message": "Database tidak terhubung"}, 500
        
    try:
        # Fetch all reports, sorted by created_at descending (-1)
        reports_cursor = reports_collection.find().sort("created_at", -1)
        reports = []
        for doc in reports_cursor:
            doc['_id'] = str(doc['_id'])
            reports.append(doc)
            
        return {"status": "success", "data": reports}, 200
    except Exception as e:
        logging.error(f"Error saat mengambil semua laporan: {e}")
        return {"status": "error", "message": "Terjadi kesalahan saat memproses data"}, 500

from bson import ObjectId

def update_report_status(report_id, new_status):
    if reports_collection is None:
        return {"status": "error", "message": "Database tidak terhubung"}, 500
        
    try:
        # Validasi format ObjectId
        if not ObjectId.is_valid(report_id):
            return {"status": "error", "message": "ID laporan tidak valid"}, 400
            
        report = reports_collection.find_one({"_id": ObjectId(report_id)})
        if not report:
            return {"status": "error", "message": "Laporan tidak ditemukan"}, 404
            
        result = reports_collection.update_one(
            {"_id": ObjectId(report_id)},
            {"$set": {"status": new_status}}
        )
        
        # Create a notification for the user
        notifications_collection = db["notifications"]
        notifications_collection.insert_one({
            "email": report.get("reporter_email"),
            "title": "Update Status Laporan",
            "message": f"Status laporan \"{report.get('title')}\" telah diubah menjadi {new_status}.",
            "is_read": False,
            "created_at": datetime.utcnow()
        })
        
        return {"status": "success", "message": f"Status laporan berhasil diperbarui menjadi {new_status}"}, 200
    except Exception as e:
        logging.error(f"Error saat memperbarui status laporan: {e}")
        return {"status": "error", "message": "Terjadi kesalahan saat memperbarui status"}, 500

def get_user_notifications(email):
    if db is None:
        return {"status": "error", "message": "Database tidak terhubung"}, 500
        
    try:
        notifications_collection = db["notifications"]
        cursor = notifications_collection.find({"email": email}).sort("created_at", -1)
        notifications = []
        for doc in cursor:
            doc['_id'] = str(doc['_id'])
            notifications.append(doc)
            
        return {"status": "success", "data": notifications}, 200
    except Exception as e:
        logging.error(f"Error saat mengambil notifikasi: {e}")
        return {"status": "error", "message": "Terjadi kesalahan saat mengambil notifikasi"}, 500

def mark_notifications_read(email):
    if db is None:
        return {"status": "error", "message": "Database tidak terhubung"}, 500
        
    try:
        notifications_collection = db["notifications"]
        notifications_collection.update_many(
            {"email": email, "is_read": False},
            {"$set": {"is_read": True}}
        )
        return {"status": "success", "message": "Notifikasi ditandai sudah dibaca"}, 200
    except Exception as e:
        logging.error(f"Error saat menandai notifikasi: {e}")
        return {"status": "error", "message": "Terjadi kesalahan sistem"}, 500
