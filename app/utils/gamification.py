from datetime import datetime
import logging
import re

from app.db import db

REPORTER_COMPLETION_POINTS = 50
SUPPORTER_COMPLETION_POINTS = 10
BADGE_LEVELS = [
    {"name": "Warga Peduli", "min_points": 0, "color": "linear-gradient(135deg, #3b82f6, #2563eb)", "class_name": ""},
    {"name": "Relawan Jalan", "min_points": 100, "color": "linear-gradient(135deg, #06b6d4, #0284c7)", "class_name": "badge-relawan"},
    {"name": "Penjaga Lingkungan", "min_points": 250, "color": "linear-gradient(135deg, #10b981, #059669)", "class_name": "badge-penjaga"},
    {"name": "Pahlawan Jalanan", "min_points": 500, "color": "linear-gradient(135deg, #f59e0b, #d97706)", "class_name": "badge-pahlawan"},
    {"name": "Patriot Infrastruktur", "min_points": 900, "color": "linear-gradient(135deg, #FF6B00, #dc2626)", "class_name": "badge-suhu"},
    {"name": "Duta SmartRoad", "min_points": 1400, "color": "linear-gradient(135deg, #8b5cf6, #7c3aed)", "class_name": "badge-duta"},
    {"name": "Legenda Jalanan", "min_points": 2200, "color": "linear-gradient(135deg, #0f172a, #334155)", "class_name": "badge-legenda"},
]


def _normalize_email(email):
    return str(email or "").strip().lower()


def _unique_emails(emails):
    seen = set()
    result = []
    for email in emails:
        normalized = _normalize_email(email)
        if normalized and normalized not in seen:
            seen.add(normalized)
            result.append(normalized)
    return result


def _email_exact_query(email):
    normalized = _normalize_email(email)
    return {"$regex": f"^{re.escape(normalized)}$", "$options": "i"}


def get_badge_info(points):
    normalized_points = int(points or 0)
    current = BADGE_LEVELS[0]
    next_level = None

    for index, level in enumerate(BADGE_LEVELS):
        if normalized_points >= level["min_points"]:
            current = level
            next_level = BADGE_LEVELS[index + 1] if index + 1 < len(BADGE_LEVELS) else None
        else:
            break

    previous_points = current["min_points"]
    next_points = next_level["min_points"] if next_level else previous_points
    progress = 100
    if next_level:
        progress = int(max(0, min(((normalized_points - previous_points) / (next_points - previous_points)) * 100, 100)))

    return {
        "badge": current["name"],
        "current_badge": current,
        "next_badge": next_level,
        "previous_threshold": previous_points,
        "next_threshold": next_points,
        "progress_percentage": progress,
        "badge_levels": BADGE_LEVELS
    }


def get_badge(points):
    return get_badge_info(points)["badge"]


def _award_user_points(users_collection, notifications_collection, email, points, report, role_label, awarded_at):
    if not email or points <= 0:
        return None

    report_id = str(report.get("_id"))
    event = {
        "report_id": report_id,
        "report_title": report.get("title", "Laporan"),
        "points": points,
        "reason": role_label,
        "awarded_at": awarded_at
    }

    result = users_collection.update_one(
        {
            "email": _email_exact_query(email),
            "role": {"$in": ["user", "warga", None, ""]}
        },
        {
            "$inc": {"points": points},
            "$push": {"point_history": event},
            "$set": {"points_updated_at": awarded_at}
        }
    )

    if result.matched_count:
        notifications_collection.insert_one({
            "email": email,
            "title": "Poin SmartRoad Bertambah",
            "message": f"Anda mendapat {points} poin karena {role_label.lower()} pada laporan \"{report.get('title', 'Laporan')}\".",
            "is_read": False,
            "created_at": awarded_at
        })
        return {**event, "email": email}

    return None


def award_points_for_report(report_id):
    if db is None:
        return {"awarded": False, "reason": "Database tidak terhubung", "events": []}

    reports_collection = db["reports"]
    users_collection = db["users"]
    notifications_collection = db["notifications"]

    try:
        report = reports_collection.find_one({"_id": report_id})
        if not report:
            return {"awarded": False, "reason": "Laporan tidak ditemukan", "events": []}
        if report.get("status") != "Selesai":
            return {"awarded": False, "reason": "Laporan belum selesai", "events": []}

        awarded_at = datetime.utcnow()
        lock_result = reports_collection.update_one(
            {
                "_id": report_id,
                "status": "Selesai",
                "$or": [
                    {"points_awarded": {"$ne": True}},
                    {"points_awarded_to": {"$exists": False}},
                    {"points_awarded_to": {"$size": 0}}
                ]
            },
            {
                "$set": {
                    "points_awarded": True,
                    "points_awarded_at": awarded_at
                }
            }
        )

        if lock_result.modified_count == 0:
            return {"awarded": False, "reason": "Poin sudah pernah diberikan", "events": []}

        reporter_email = _normalize_email(report.get("reporter_email"))
        supporter_emails = [email for email in _unique_emails(report.get("upvoted_by", [])) if email != reporter_email]
        events = []

        reporter_event = _award_user_points(
            users_collection,
            notifications_collection,
            reporter_email,
            REPORTER_COMPLETION_POINTS,
            report,
            "Pelapor utama laporan selesai",
            awarded_at
        )
        if reporter_event:
            events.append(reporter_event)

        for supporter_email in supporter_emails:
            supporter_event = _award_user_points(
                users_collection,
                notifications_collection,
                supporter_email,
                SUPPORTER_COMPLETION_POINTS,
                report,
                "Warga terdampak pada laporan selesai",
                awarded_at
            )
            if supporter_event:
                events.append(supporter_event)

        reports_collection.update_one(
            {"_id": report_id},
            {"$set": {"points_awarded_to": events}}
        )

        return {"awarded": True, "events": events}
    except Exception as exc:
        logging.error(f"Error saat memberi poin gamifikasi: {exc}")
        return {"awarded": False, "reason": "Terjadi kesalahan saat memberi poin", "events": []}


def award_points_for_completed_reports(limit=200):
    if db is None:
        return {"processed": 0, "awarded_reports": 0, "events": []}

    reports_collection = db["reports"]
    cursor = reports_collection.find(
        {
            "status": "Selesai",
            "$or": [
                {"points_awarded": {"$ne": True}},
                {"points_awarded_to": {"$exists": False}},
                {"points_awarded_to": {"$size": 0}}
            ]
        },
        {"_id": 1}
    ).limit(limit)

    processed = 0
    awarded_reports = 0
    events = []
    for report in cursor:
        processed += 1
        result = award_points_for_report(report["_id"])
        if result.get("awarded"):
            awarded_reports += 1
            events.extend(result.get("events", []))

    return {"processed": processed, "awarded_reports": awarded_reports, "events": events}
