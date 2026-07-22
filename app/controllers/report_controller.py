from datetime import datetime
import os
import logging
import re
from app.db import db
from werkzeug.utils import secure_filename
from flask import current_app

reports_collection = db["reports"] if db is not None else None
users_collection = db["users"] if db is not None else None
cs_messages_collection = db["cs_messages"] if db is not None else None

ALLOWED_IMAGE_EXTENSIONS = {"jpg", "jpeg", "png", "webp"}
ALLOWED_IMAGE_MIMETYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_IMAGE_SIZE = 5 * 1024 * 1024

def _normalize_email(email):
    return str(email or "").strip().lower()

def _email_exact_query(email):
    normalized_email = _normalize_email(email)
    return {"$regex": f"^{re.escape(normalized_email)}$", "$options": "i"}

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

        new_lat = float(data.get('lat', 0))
        new_lng = float(data.get('lng', 0))
        reporter_email = data.get('reporter_email')

        # Auto-Clustering logic
        from app.utils.geo import calculate_distance
        waiting_reports = reports_collection.find({"status": {"$in": ["Menunggu", "Proses"]}})
        
        for rep in waiting_reports:
            dist = calculate_distance(new_lat, new_lng, float(rep.get('lat', 0)), float(rep.get('lng', 0)))
            if dist <= 20:
                # Merge into existing report
                rep_id = rep['_id']
                upvoted_by = rep.get('upvoted_by', [])
                if reporter_email not in upvoted_by:
                    upvoted_by.append(reporter_email)
                    upvote_count = rep.get('upvote_count', 0) + 1
                    reports_collection.update_one(
                        {"_id": rep_id}, 
                        {"$set": {"upvote_count": upvote_count, "upvoted_by": upvoted_by}}
                    )
                
                return {
                    "status": "success",
                    "message": "Laporan Anda telah digabungkan dengan laporan di titik yang sama (Auto-Clustering).",
                    "report_id": str(rep_id),
                    "title": rep.get("title", "Laporan")
                }, 201

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
            "lat": new_lat,
            "lng": new_lng,
            "image_path": image_path,
            "reporter_email": reporter_email,
            "status": "Menunggu",
            "upvote_count": 0,
            "upvoted_by": [],
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

def get_public_report_summary():
    if reports_collection is None:
        return {"status": "error", "message": "Database tidak terhubung"}, 500

    try:
        total_reports = reports_collection.count_documents({})
        handled_reports = reports_collection.count_documents({"status": {"$in": ["Proses", "Selesai"]}})
        citizen_count = len(reports_collection.distinct("reporter_email", {"reporter_email": {"$nin": ["", None]}}))

        completed_cursor = reports_collection.find(
            {
                "status": "Selesai",
                "image_path": {"$nin": ["", None]},
                "repair_image_path": {"$nin": ["", None]}
            },
            {
                "title": 1,
                "address": 1,
                "image_path": 1,
                "repair_image_path": 1,
                "created_at": 1,
                "completed_at": 1,
                "completion_note": 1
            }
        ).sort("completed_at", -1).limit(8)

        completed_cases = []
        for doc in completed_cursor:
            created_at = doc.get("created_at")
            completed_at = doc.get("completed_at")
            duration_days = None
            if isinstance(created_at, datetime) and isinstance(completed_at, datetime):
                duration_days = max((completed_at.date() - created_at.date()).days, 0)

            completed_cases.append({
                "title": doc.get("title", "Laporan selesai"),
                "address": doc.get("address", "-"),
                "image_path": doc.get("image_path", ""),
                "repair_image_path": doc.get("repair_image_path", ""),
                "completion_note": doc.get("completion_note", ""),
                "duration_days": duration_days
            })

        review_cursor = reports_collection.find(
            {
                "status": "Selesai",
                "review_rating": {"$gte": 1, "$lte": 5},
                "review_text": {"$nin": ["", None]}
            },
            {
                "title": 1,
                "address": 1,
                "reporter_email": 1,
                "review_rating": 1,
                "review_text": 1,
                "reviewer_name": 1,
                "reviewed_at": 1
            }
        ).sort("reviewed_at", -1).limit(6)

        reviews = []
        for doc in review_cursor:
            reporter_email = doc.get("reporter_email", "")
            reviewer = users_collection.find_one({"email": reporter_email}, {"profile_pic": 1, "nama": 1}) if users_collection is not None and reporter_email else None
            fallback_name = reporter_email.split("@")[0].replace(".", " ").title() if reporter_email else "Warga SmartRoad"
            reviews.append({
                "name": doc.get("reviewer_name") or (reviewer or {}).get("nama") or fallback_name,
                "role": doc.get("address") or "Warga SmartRoad",
                "rating": int(doc.get("review_rating", 5)),
                "quote": doc.get("review_text", ""),
                "report_title": doc.get("title", "Laporan selesai"),
                "profile_pic": (reviewer or {}).get("profile_pic", "")
            })

        return {
            "status": "success",
            "data": {
                "stats": {
                    "total_reports": total_reports,
                    "handled_reports": handled_reports,
                    "citizen_participation": citizen_count
                },
                "completed_cases": completed_cases,
                "reviews": reviews
            }
        }, 200
    except Exception as e:
        logging.error(f"Error saat mengambil ringkasan publik: {e}")
        return {"status": "error", "message": "Terjadi kesalahan saat mengambil ringkasan publik"}, 500

def submit_report_review(report_id, email, data):
    if reports_collection is None:
        return {"status": "error", "message": "Database tidak terhubung"}, 500

    try:
        if not ObjectId.is_valid(report_id):
            return {"status": "error", "message": "ID laporan tidak valid"}, 400

        report = reports_collection.find_one({"_id": ObjectId(report_id), "reporter_email": email})
        if not report:
            return {"status": "error", "message": "Laporan tidak ditemukan atau bukan milik Anda"}, 404
        if report.get("status") != "Selesai":
            return {"status": "error", "message": "Penilaian hanya dapat diberikan setelah laporan selesai"}, 400

        try:
            rating = int(data.get("rating", 0))
        except (TypeError, ValueError):
            rating = 0

        review_text = str(data.get("review_text", "")).strip()
        reviewer_name = str(data.get("reviewer_name", "")).strip()

        if rating < 1 or rating > 5:
            return {"status": "error", "message": "Rating harus berada di antara 1 sampai 5 bintang"}, 400
        if not review_text:
            return {"status": "error", "message": "Ulasan warga wajib diisi"}, 400
        if len(review_text) > 500:
            return {"status": "error", "message": "Ulasan maksimal 500 karakter"}, 400

        if not reviewer_name:
            reviewer_name = email.split("@")[0].replace(".", " ").title()

        reports_collection.update_one(
            {"_id": ObjectId(report_id)},
            {"$set": {
                "review_rating": rating,
                "review_text": review_text,
                "reviewer_name": reviewer_name,
                "reviewed_at": datetime.utcnow()
            }}
        )

        return {"status": "success", "message": "Terima kasih, penilaian Anda berhasil disimpan"}, 200
    except Exception as e:
        logging.error(f"Error saat menyimpan penilaian laporan: {e}")
        return {"status": "error", "message": "Terjadi kesalahan saat menyimpan penilaian"}, 500

def get_report_cs_messages(report_id, email, role):
    if reports_collection is None or cs_messages_collection is None:
        return {"status": "error", "message": "Database tidak terhubung"}, 500

    try:
        if not ObjectId.is_valid(report_id):
            return {"status": "error", "message": "ID laporan tidak valid"}, 400

        report = reports_collection.find_one({"_id": ObjectId(report_id)})
        if not report:
            return {"status": "error", "message": "Laporan tidak ditemukan"}, 404
        if role != "admin" and report.get("reporter_email") != email:
            return {"status": "error", "message": "Anda tidak memiliki akses ke chat laporan ini"}, 403

        sender_role = "admin" if role == "admin" else "user"
        cs_messages_collection.update_many(
            {"report_id": report_id, "sender_role": {"$ne": sender_role}, "is_read": False},
            {"$set": {"is_read": True, "read_at": datetime.utcnow()}}
        )

        messages = []
        for doc in cs_messages_collection.find({"report_id": report_id}).sort("created_at", 1):
            messages.append({
                "_id": str(doc.get("_id")),
                "report_id": doc.get("report_id"),
                "sender_email": doc.get("sender_email"),
                "sender_name": doc.get("sender_name"),
                "sender_role": doc.get("sender_role"),
                "message": doc.get("message"),
                "is_read": doc.get("is_read", False),
                "created_at": doc.get("created_at")
            })

        return {
            "status": "success",
            "data": {
                "report": {
                    "_id": str(report.get("_id")),
                    "title": report.get("title", "Laporan"),
                    "address": report.get("address", "-"),
                    "status": report.get("status", "Menunggu")
                },
                "messages": messages
            }
        }, 200
    except Exception as e:
        logging.error(f"Error saat mengambil chat CS: {e}")
        return {"status": "error", "message": "Terjadi kesalahan saat mengambil chat CS"}, 500

def send_report_cs_message(report_id, email, role, data):
    if reports_collection is None or cs_messages_collection is None:
        return {"status": "error", "message": "Database tidak terhubung"}, 500

    try:
        if not ObjectId.is_valid(report_id):
            return {"status": "error", "message": "ID laporan tidak valid"}, 400

        report = reports_collection.find_one({"_id": ObjectId(report_id)})
        if not report:
            return {"status": "error", "message": "Laporan tidak ditemukan"}, 404
        if role != "admin" and report.get("reporter_email") != email:
            return {"status": "error", "message": "Anda tidak memiliki akses ke chat laporan ini"}, 403

        message = str(data.get("message", "")).strip()
        if not message:
            return {"status": "error", "message": "Pesan tidak boleh kosong"}, 400
        if len(message) > 1000:
            return {"status": "error", "message": "Pesan maksimal 1000 karakter"}, 400

        sender_role = "admin" if role == "admin" else "user"
        sender_name = str(data.get("sender_name", "")).strip()
        if not sender_name:
            user = users_collection.find_one({"email": email}, {"nama": 1}) if users_collection is not None else None
            sender_name = (user or {}).get("nama") or ("Admin CS" if sender_role == "admin" else email.split("@")[0])

        doc = {
            "report_id": report_id,
            "report_title": report.get("title", "Laporan"),
            "reporter_email": report.get("reporter_email"),
            "sender_email": email,
            "sender_name": sender_name,
            "sender_role": sender_role,
            "message": message,
            "is_read": False,
            "created_at": datetime.utcnow()
        }
        result = cs_messages_collection.insert_one(doc)
        doc["_id"] = str(result.inserted_id)

        if sender_role == "admin":
            notifications_collection = db["notifications"]
            notifications_collection.insert_one({
                "email": report.get("reporter_email"),
                "title": "Balasan CS SmartRoad",
                "message": f"Admin membalas chat Anda untuk laporan \"{report.get('title', 'Laporan')}\".",
                "is_read": False,
                "created_at": datetime.utcnow()
            })

        return {"status": "success", "message": "Pesan berhasil dikirim", "data": doc}, 201
    except Exception as e:
        logging.error(f"Error saat mengirim chat CS: {e}")
        return {"status": "error", "message": "Terjadi kesalahan saat mengirim chat CS"}, 500

def get_admin_cs_conversations():
    if reports_collection is None or cs_messages_collection is None:
        return {"status": "error", "message": "Database tidak terhubung"}, 500

    try:
        grouped = {}
        for msg in cs_messages_collection.find().sort("created_at", -1):
            report_id = msg.get("report_id")
            if not report_id:
                continue
            if report_id not in grouped:
                report = reports_collection.find_one({"_id": ObjectId(report_id)}) if ObjectId.is_valid(report_id) else None
                grouped[report_id] = {
                    "report_id": report_id,
                    "report_title": (report or {}).get("title") or msg.get("report_title") or "Laporan",
                    "report_address": (report or {}).get("address") or "-",
                    "report_status": (report or {}).get("status") or "-",
                    "reporter_email": (report or {}).get("reporter_email") or msg.get("reporter_email") or "-",
                    "last_message": msg.get("message", ""),
                    "last_sender_role": msg.get("sender_role", ""),
                    "last_at": msg.get("created_at"),
                    "unread_count": 0
                }
            if msg.get("sender_role") == "user" and not msg.get("is_read", False):
                grouped[report_id]["unread_count"] += 1

        conversations = list(grouped.values())
        conversations.sort(key=lambda item: item.get("last_at") or datetime.min, reverse=True)
        return {"status": "success", "data": conversations}, 200
    except Exception as e:
        logging.error(f"Error saat mengambil daftar chat CS: {e}")
        return {"status": "error", "message": "Terjadi kesalahan saat mengambil daftar chat CS"}, 500

from bson import ObjectId

def _serialize_report(doc):
    doc['_id'] = str(doc['_id'])
    return doc

def update_report_status(report_id, new_status, assigned_petugas_email=None):
    if reports_collection is None:
        return {"status": "error", "message": "Database tidak terhubung"}, 500
        
    try:
        # Validasi format ObjectId
        if not ObjectId.is_valid(report_id):
            return {"status": "error", "message": "ID laporan tidak valid"}, 400
            
        report = reports_collection.find_one({"_id": ObjectId(report_id)})
        if not report:
            return {"status": "error", "message": "Laporan tidak ditemukan"}, 404

        update_fields = {"status": new_status}
        assigned_petugas = None
        assigned_petugas_email = _normalize_email(assigned_petugas_email)

        if new_status == "Proses":
            if not assigned_petugas_email:
                return {"status": "error", "message": "Petugas wajib dipilih untuk status Proses"}, 400
            if users_collection is None:
                return {"status": "error", "message": "Database user tidak terhubung"}, 500

            assigned_petugas = users_collection.find_one({
                "email": _email_exact_query(assigned_petugas_email),
                "role": "petugas"
            })
            if not assigned_petugas:
                return {"status": "error", "message": "Petugas tidak ditemukan atau role tidak valid"}, 404

            update_fields.update({
                "assigned_petugas_email": assigned_petugas.get("email"),
                "assigned_petugas_name": assigned_petugas.get("nama", assigned_petugas.get("email")),
                "assigned_at": datetime.utcnow()
            })

        same_status = report.get("status") == new_status
        same_petugas = _normalize_email(report.get("assigned_petugas_email")) == assigned_petugas_email if new_status == "Proses" else True
        if same_status and same_petugas:
            return {"status": "success", "message": "Status laporan tidak berubah"}, 200
            
        result = reports_collection.update_one(
            {"_id": ObjectId(report_id)},
            {"$set": update_fields}
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

        if assigned_petugas:
            notifications_collection.insert_one({
                "email": assigned_petugas.get("email"),
                "title": "Tugas Perbaikan Baru",
                "message": f"Laporan \"{report.get('title')}\" telah ditugaskan kepada Anda.",
                "is_read": False,
                "created_at": datetime.utcnow()
            })
        
        return {"status": "success", "message": f"Status laporan berhasil diperbarui menjadi {new_status}"}, 200
    except Exception as e:
        logging.error(f"Error saat memperbarui status laporan: {e}")
        return {"status": "error", "message": "Terjadi kesalahan saat memperbarui status"}, 500

def get_assigned_reports(petugas_email):
    if reports_collection is None:
        return {"status": "error", "message": "Database tidak terhubung"}, 500

    try:
        normalized_email = _normalize_email(petugas_email)
        cursor = reports_collection.find({
            "assigned_petugas_email": _email_exact_query(normalized_email),
            "status": {"$in": ["Proses", "Selesai"]}
        }).sort("assigned_at", -1)
        reports = [_serialize_report(doc) for doc in cursor]
        return {"status": "success", "data": reports}, 200
    except Exception as e:
        logging.error(f"Error saat mengambil tugas petugas: {e}")
        return {"status": "error", "message": "Terjadi kesalahan saat mengambil tugas"}, 500

def complete_assigned_report(report_id, petugas_email, data, file):
    if reports_collection is None:
        return {"status": "error", "message": "Database tidak terhubung"}, 500

    try:
        if not ObjectId.is_valid(report_id):
            return {"status": "error", "message": "ID laporan tidak valid"}, 400

        report = reports_collection.find_one({"_id": ObjectId(report_id)})
        if not report:
            return {"status": "error", "message": "Laporan tidak ditemukan"}, 404
        if _normalize_email(report.get("assigned_petugas_email")) != _normalize_email(petugas_email):
            return {"status": "error", "message": "Laporan ini tidak ditugaskan kepada Anda"}, 403
        if report.get("status") == "Selesai":
            return {"status": "success", "message": "Laporan sudah selesai"}, 200
        if not file or file.filename == "":
            return {"status": "error", "message": "Foto bukti perbaikan wajib diunggah"}, 400

        filename, error_message = _validate_report_image(file)
        if error_message:
            return {"status": "error", "message": error_message}, 400

        unique_filename = f"repair_{int(datetime.now().timestamp())}_{filename}"
        upload_folder = os.path.join(current_app.static_folder, 'uploads', 'repairs')
        if not os.path.exists(upload_folder):
            os.makedirs(upload_folder)

        file.save(os.path.join(upload_folder, unique_filename))
        repair_image_path = f"uploads/repairs/{unique_filename}"
        completion_note = data.get("completion_note", "")

        reports_collection.update_one(
            {"_id": ObjectId(report_id)},
            {"$set": {
                "status": "Selesai",
                "repair_image_path": repair_image_path,
                "completion_note": completion_note,
                "completed_at": datetime.utcnow(),
                "completed_by": petugas_email
            }}
        )

        notifications_collection = db["notifications"]
        notifications_collection.insert_one({
            "email": report.get("reporter_email"),
            "title": "Laporan Selesai",
            "message": f"Laporan \"{report.get('title')}\" telah diselesaikan oleh petugas.",
            "is_read": False,
            "created_at": datetime.utcnow()
        })

        return {"status": "success", "message": "Konfirmasi penyelesaian berhasil dikirim"}, 200
    except Exception as e:
        logging.error(f"Error saat menyelesaikan laporan: {e}")
        return {"status": "error", "message": "Terjadi kesalahan saat menyelesaikan laporan"}, 500

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

def upvote_report(report_id, email):
    if reports_collection is None:
        return {"status": "error", "message": "Database tidak terhubung"}, 500

    try:
        if not ObjectId.is_valid(report_id):
            return {"status": "error", "message": "ID laporan tidak valid"}, 400

        report = reports_collection.find_one({"_id": ObjectId(report_id)})
        if not report:
            return {"status": "error", "message": "Laporan tidak ditemukan"}, 404

        if report.get("status") not in ["Menunggu", "Proses"]:
            return {"status": "error", "message": "Hanya laporan dengan status Menunggu atau Proses yang dapat di-upvote"}, 400

        upvoted_by = report.get('upvoted_by', [])
        if email in upvoted_by or report.get("reporter_email") == email:
            return {"status": "error", "message": "Anda sudah melaporkan atau melakukan upvote pada laporan ini"}, 400

        upvoted_by.append(email)
        upvote_count = report.get('upvote_count', 0) + 1

        reports_collection.update_one(
            {"_id": ObjectId(report_id)},
            {"$set": {"upvote_count": upvote_count, "upvoted_by": upvoted_by}}
        )

        return {"status": "success", "message": "Berhasil melakukan upvote"}, 200
    except Exception as e:
        logging.error(f"Error saat upvote laporan: {e}")
        return {"status": "error", "message": "Terjadi kesalahan saat memproses upvote"}, 500

def get_public_waiting_reports():
    if reports_collection is None:
        return {"status": "error", "message": "Database tidak terhubung"}, 500

    try:
        cursor = reports_collection.find(
            {"status": {"$in": ["Menunggu", "Proses"]}},
            {"title": 1, "description": 1, "address": 1, "lat": 1, "lng": 1, "image_path": 1, "upvote_count": 1, "status": 1}
        )
        reports = []
        for doc in cursor:
            doc['_id'] = str(doc['_id'])
            doc['upvote_count'] = doc.get('upvote_count', 0)
            reports.append(doc)
            
        return {"status": "success", "data": reports}, 200
    except Exception as e:
        logging.error(f"Error saat mengambil public waiting reports: {e}")
        return {"status": "error", "message": "Terjadi kesalahan sistem"}, 500

