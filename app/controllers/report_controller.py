from datetime import datetime
import os
import logging
import re
from app.db import db
from werkzeug.utils import secure_filename
from flask import current_app
from app.utils.gamification import award_points_for_report
from app.utils.ai_validation import validate_report_image, export_internal_dataset

reports_collection = db["reports"] if db is not None else None
users_collection = db["users"] if db is not None else None
cs_messages_collection = db["cs_messages"] if db is not None else None

ALLOWED_IMAGE_EXTENSIONS = {"jpg", "jpeg", "png", "webp"}
ALLOWED_IMAGE_MIMETYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_IMAGE_SIZE = 5 * 1024 * 1024
CLUSTER_RADIUS_METERS = 20

def _priority_from_count(count):
    if count >= 10:
        return "Mendesak"
    if count >= 5:
        return "Tinggi"
    if count >= 3:
        return "Sedang"
    return "Normal"

def _affected_count(report):
    supporters = report.get("upvoted_by", [])
    return 1 + len(supporters)

def _supporter_count(report):
    supporters = report.get("upvoted_by", [])
    if isinstance(supporters, list):
        return len(supporters)
    return int(report.get("upvote_count", 0) or 0)

def _crowd_update_fields(upvote_count):
    affected_count = 1 + int(upvote_count or 0)
    return {
        "upvote_count": int(upvote_count or 0),
        "affected_count": affected_count,
        "priority_score": affected_count,
        "priority_level": _priority_from_count(affected_count),
        "is_clustered": affected_count > 1
    }

def _hydrate_crowd_fields(doc, viewer_email=None):
    supporter_count = _supporter_count(doc)
    doc["upvote_count"] = supporter_count
    doc["affected_count"] = 1 + supporter_count
    doc["priority_score"] = doc["affected_count"]
    doc["priority_level"] = _priority_from_count(doc["affected_count"])
    doc["is_clustered"] = bool(doc.get("is_clustered", doc["affected_count"] > 1))
    doc["cluster_evidence_count"] = int(doc.get("cluster_evidence_count", len(doc.get("cluster_evidence", []))) or 0)
    if viewer_email:
        doc["clustered_by_current_user"] = viewer_email in doc.get("upvoted_by", [])
        doc["can_review_by_current_user"] = doc.get("reporter_email") == viewer_email
        doc["current_user_cluster_evidence"] = next(
            (item for item in doc.get("cluster_evidence", []) if item.get("email") == viewer_email),
            None
        )
    return doc

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

def _save_report_image(file, prefix=""):
    filename, error_message = _validate_report_image(file)
    if error_message:
        return "", error_message

    safe_prefix = f"{prefix}_" if prefix else ""
    unique_filename = f"{safe_prefix}{int(datetime.now().timestamp())}_{filename}"
    upload_folder = os.path.join(current_app.static_folder, 'uploads', 'reports')

    if not os.path.exists(upload_folder):
        os.makedirs(upload_folder)

    file.save(os.path.join(upload_folder, unique_filename))
    return f"uploads/reports/{unique_filename}", None

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
        waiting_reports = reports_collection.find({"status": "Menunggu"})
        
        for rep in waiting_reports:
            dist = calculate_distance(new_lat, new_lng, float(rep.get('lat', 0)), float(rep.get('lng', 0)))
            if dist <= CLUSTER_RADIUS_METERS:
                # Merge into existing report
                rep_id = rep['_id']
                upvoted_by = rep.get('upvoted_by', [])
                if reporter_email == rep.get("reporter_email"):
                    return {
                        "status": "success",
                        "clustered": True,
                        "message": "Laporan serupa dari akun Anda sudah ada di titik yang sama.",
                        "report_id": str(rep_id),
                        "title": rep.get("title", "Laporan"),
                        "affected_count": rep.get("affected_count", _affected_count(rep)),
                        "priority_level": rep.get("priority_level", _priority_from_count(_affected_count(rep)))
                    }, 200

                if reporter_email not in upvoted_by:
                    evidence_image_path = ""
                    evidence_ai_validation = {}
                    if file and file.filename != '':
                        evidence_image_path, error_message = _save_report_image(file, "cluster")
                        if error_message:
                            return {"status": "error", "message": error_message}, 400
                        evidence_ai_validation = validate_report_image(
                            evidence_image_path,
                            data,
                            reports_collection,
                            current_app.static_folder
                        )

                    evidence_item = {
                        "email": reporter_email,
                        "title": data.get("title"),
                        "address": data.get("address"),
                        "province": data.get("province"),
                        "city": data.get("city"),
                        "district": data.get("district"),
                        "category": data.get("category"),
                        "hazard_level": data.get("hazard_level"),
                        "dimensions": data.get("dimensions"),
                        "description": data.get("description"),
                        "lat": new_lat,
                        "lng": new_lng,
                        "distance_meters": round(dist, 2),
                        "image_path": evidence_image_path,
                        "ai_validation": evidence_ai_validation,
                        "created_at": datetime.utcnow()
                    }

                    update_result = reports_collection.update_one(
                        {
                            "_id": rep_id,
                            "reporter_email": {"$ne": reporter_email},
                            "upvoted_by": {"$ne": reporter_email},
                            "status": "Menunggu"
                        },
                        {
                            "$addToSet": {"upvoted_by": reporter_email},
                            "$push": {"cluster_evidence": evidence_item},
                            "$set": {
                                "cluster_radius_meters": CLUSTER_RADIUS_METERS,
                                "last_clustered_at": datetime.utcnow()
                            }
                        }
                    )

                    latest_report = reports_collection.find_one({"_id": rep_id}) or rep
                    _hydrate_crowd_fields(latest_report, reporter_email)
                    evidence_count = len(latest_report.get("cluster_evidence", []))
                    if update_result.modified_count:
                        sync_fields = _crowd_update_fields(latest_report["upvote_count"])
                        sync_fields["cluster_evidence_count"] = evidence_count
                        reports_collection.update_one({"_id": rep_id}, {"$set": sync_fields})
                    upvoted_by = latest_report.get("upvoted_by", upvoted_by)
                else:
                    evidence_count = len(rep.get("cluster_evidence", []))
                
                return {
                    "status": "success",
                    "clustered": True,
                    "message": "Laporan Anda telah digabungkan dengan laporan di titik yang sama (Auto-Clustering).",
                    "report_id": str(rep_id),
                    "title": rep.get("title", "Laporan"),
                    "affected_count": 1 + len(upvoted_by),
                    "priority_level": _priority_from_count(1 + len(upvoted_by)),
                    "cluster_evidence_count": evidence_count
                }, 201

        image_path = ""
        ai_validation = {}
        if file and file.filename != '':
            image_path, error_message = _save_report_image(file)
            if error_message:
                return {"status": "error", "message": error_message}, 400
            ai_validation = validate_report_image(image_path, data, reports_collection, current_app.static_folder)
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
            "image_hash": ai_validation.get("image_hash", ""),
            "ai_validation": ai_validation,
            "reporter_email": reporter_email,
            "status": "Menunggu",
            "upvote_count": 0,
            "upvoted_by": [],
            "affected_count": 1,
            "priority_score": 1,
            "priority_level": "Normal",
            "is_clustered": False,
            "cluster_radius_meters": CLUSTER_RADIUS_METERS,
            "cluster_evidence": [],
            "cluster_evidence_count": 0,
            "created_at": datetime.utcnow()
        }

        result = reports_collection.insert_one(new_report)
        if result.inserted_id:
            return {
                "status": "success",
                "clustered": False,
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
        reports_cursor = reports_collection.find({
            "$or": [
                {"reporter_email": email},
                {"upvoted_by": email}
            ]
        }).sort("created_at", -1)
        reports = []
        for doc in reports_cursor:
            doc['_id'] = str(doc['_id'])
            _hydrate_crowd_fields(doc, email)
            reports.append(doc)
            
        return {"status": "success", "data": reports}, 200
    except Exception as e:
        logging.error(f"Error saat mengambil laporan user: {e}")
        return {"status": "error", "message": "Terjadi kesalahan saat memproses data"}, 500

def get_all_reports():
    if reports_collection is None:
        return {"status": "error", "message": "Database tidak terhubung"}, 500
        
    try:
        # Keep admin dashboard consistent for reports created before AI validation was enabled.
        backfill_ai_validation(limit=25)

        # Fetch all reports, sorted by created_at descending (-1)
        reports_cursor = reports_collection.find().sort("created_at", -1)
        reports = []
        for doc in reports_cursor:
            doc['_id'] = str(doc['_id'])
            _hydrate_crowd_fields(doc)
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

def update_admin_validation(report_id, admin_email, data):
    if reports_collection is None:
        return {"status": "error", "message": "Database tidak terhubung"}, 500

    try:
        if not ObjectId.is_valid(report_id):
            return {"status": "error", "message": "ID laporan tidak valid"}, 400

        label = str(data.get("label", "")).strip()
        is_valid_damage = data.get("is_valid_damage")
        if not isinstance(is_valid_damage, bool):
            return {"status": "error", "message": "Status validasi wajib berupa true/false"}, 400
        if not label:
            return {"status": "error", "message": "Label validasi wajib diisi"}, 400

        admin_validation = {
            "is_valid_damage": is_valid_damage,
            "label": label,
            "notes": str(data.get("notes", "")).strip(),
            "validated_by": admin_email,
            "validated_at": datetime.utcnow()
        }
        result = reports_collection.update_one(
            {"_id": ObjectId(report_id)},
            {"$set": {"admin_validation": admin_validation}}
        )
        if result.matched_count == 0:
            return {"status": "error", "message": "Laporan tidak ditemukan"}, 404
        return {"status": "success", "message": "Validasi admin berhasil disimpan", "data": admin_validation}, 200
    except Exception as e:
        logging.error(f"Error saat menyimpan validasi admin: {e}")
        return {"status": "error", "message": "Terjadi kesalahan saat menyimpan validasi admin"}, 500

def export_ai_dataset():
    try:
        result = export_internal_dataset(current_app.static_folder)
        return {"status": "success", "data": result}, 200
    except Exception as e:
        logging.error(f"Error saat export dataset AI: {e}")
        return {"status": "error", "message": "Gagal export dataset AI"}, 500

def backfill_ai_validation(limit=200):
    if reports_collection is None:
        return {"status": "error", "message": "Database tidak terhubung"}, 500

    try:
        safe_limit = max(1, min(int(limit or 200), 1000))
        cursor = reports_collection.find({
            "image_path": {"$nin": ["", None]},
            "$or": [
                {"ai_validation": {"$exists": False}},
                {"ai_validation.status": {"$exists": False}}
            ]
        }).limit(safe_limit)
        processed = 0
        for report in cursor:
            ai_validation = validate_report_image(
                report.get("image_path", ""),
                report,
                reports_collection,
                current_app.static_folder
            )
            reports_collection.update_one(
                {"_id": report["_id"]},
                {"$set": {
                    "ai_validation": ai_validation,
                    "image_hash": ai_validation.get("image_hash", "")
                }}
            )
            processed += 1
        return {"status": "success", "data": {"processed": processed}}, 200
    except Exception as e:
        logging.error(f"Error saat backfill validasi AI: {e}")
        return {"status": "error", "message": "Gagal menjalankan backfill validasi AI"}, 500

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
            if new_status == "Selesai":
                award_points_for_report(ObjectId(report_id))
            return {"status": "success", "message": "Status laporan tidak berubah"}, 200
            
        result = reports_collection.update_one(
            {"_id": ObjectId(report_id)},
            {"$set": update_fields}
        )
        award_result = None
        if new_status == "Selesai":
            award_result = award_points_for_report(ObjectId(report_id))
        
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
        
        message = f"Status laporan berhasil diperbarui menjadi {new_status}"
        if award_result and award_result.get("awarded"):
            message += f" dan {len(award_result.get('events', []))} reward poin dibagikan"
        return {"status": "success", "message": message}, 200
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
            award_result = award_points_for_report(ObjectId(report_id))
            if award_result.get("awarded"):
                return {"status": "success", "message": f"Laporan sudah selesai dan {len(award_result.get('events', []))} reward poin dibagikan"}, 200
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
        award_result = award_points_for_report(ObjectId(report_id))

        notifications_collection = db["notifications"]
        notifications_collection.insert_one({
            "email": report.get("reporter_email"),
            "title": "Laporan Selesai",
            "message": f"Laporan \"{report.get('title')}\" telah diselesaikan oleh petugas.",
            "is_read": False,
            "created_at": datetime.utcnow()
        })

        message = "Konfirmasi penyelesaian berhasil dikirim"
        if award_result.get("awarded"):
            message += f" dan {len(award_result.get('events', []))} reward poin dibagikan"
        return {"status": "success", "message": message}, 200
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

        if report.get("reporter_email") == email:
            return {"status": "error", "message": "Anda sudah melaporkan atau melakukan upvote pada laporan ini"}, 400

        update_result = reports_collection.update_one(
            {
                "_id": ObjectId(report_id),
                "reporter_email": {"$ne": email},
                "upvoted_by": {"$ne": email},
                "status": {"$in": ["Menunggu", "Proses"]}
            },
            {
                "$addToSet": {"upvoted_by": email},
                "$set": {
                    "cluster_radius_meters": report.get("cluster_radius_meters", CLUSTER_RADIUS_METERS),
                    "last_upvoted_at": datetime.utcnow()
                }
            }
        )

        if update_result.modified_count == 0:
            latest_report = reports_collection.find_one({"_id": ObjectId(report_id)}) or report
            latest_report = _hydrate_crowd_fields(latest_report, email)
            if latest_report.get("clustered_by_current_user"):
                return {
                    "status": "error",
                    "message": "Anda sudah melaporkan atau melakukan upvote pada laporan ini",
                    "affected_count": latest_report["affected_count"],
                    "priority_level": latest_report["priority_level"]
                }, 400
            return {"status": "error", "message": "Laporan tidak dapat di-upvote saat ini"}, 400

        updated_report = reports_collection.find_one({"_id": ObjectId(report_id)}) or {}
        hydrated_report = _hydrate_crowd_fields(updated_report, email)
        update_fields = _crowd_update_fields(hydrated_report["upvote_count"])
        reports_collection.update_one(
            {"_id": ObjectId(report_id)},
            {"$set": update_fields}
        )

        return {
            "status": "success",
            "message": "Berhasil melakukan upvote",
            "affected_count": update_fields["affected_count"],
            "priority_level": update_fields["priority_level"]
        }, 200
    except Exception as e:
        logging.error(f"Error saat upvote laporan: {e}")
        return {"status": "error", "message": "Terjadi kesalahan saat memproses upvote"}, 500

def get_public_waiting_reports(viewer_email=None):
    if reports_collection is None:
        return {"status": "error", "message": "Database tidak terhubung"}, 500

    try:
        cursor = reports_collection.find(
            {"status": {"$in": ["Menunggu", "Proses"]}},
            {"title": 1, "description": 1, "address": 1, "lat": 1, "lng": 1, "image_path": 1, "reporter_email": 1, "upvoted_by": 1, "upvote_count": 1, "affected_count": 1, "priority_level": 1, "priority_score": 1, "is_clustered": 1, "cluster_evidence_count": 1, "status": 1}
        )
        reports = []
        for doc in cursor:
            doc['_id'] = str(doc['_id'])
            _hydrate_crowd_fields(doc, viewer_email)
            doc["is_own_report"] = viewer_email is not None and doc.get("reporter_email") == viewer_email
            doc["is_supported_by_current_user"] = viewer_email is not None and viewer_email in doc.get("upvoted_by", [])
            reports.append(doc)
            
        return {"status": "success", "data": reports}, 200
    except Exception as e:
        logging.error(f"Error saat mengambil public waiting reports: {e}")
        return {"status": "error", "message": "Terjadi kesalahan sistem"}, 500

