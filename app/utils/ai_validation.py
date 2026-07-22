from datetime import datetime
import csv
import hashlib
import os
import re

from app.db import db

DAMAGE_LABELS = {
    "pothole": "Jalan Berlubang",
    "crack": "Jalan Retak",
    "flood": "Genangan/Banjir",
    "rough_road": "Jalan Bergelombang",
    "normal_road": "Jalan Normal",
    "not_road_damage": "Bukan Kerusakan Jalan"
}


def _normalize_text(value):
    return str(value or "").strip().lower()


def _image_sha256(abs_path):
    hasher = hashlib.sha256()
    with open(abs_path, "rb") as file:
        for chunk in iter(lambda: file.read(8192), b""):
            hasher.update(chunk)
    return hasher.hexdigest()


def _keyword_label(report_data):
    text = " ".join([
        _normalize_text(report_data.get("title")),
        _normalize_text(report_data.get("description")),
        _normalize_text(report_data.get("category")),
        _normalize_text(report_data.get("hazard_level")),
        _normalize_text(report_data.get("dimensions")),
    ])

    patterns = [
        ("flood", r"\b(banjir|genangan|tergenang|air)\b"),
        ("pothole", r"\b(lubang|berlubang|bolong|ambles)\b"),
        ("crack", r"\b(retak|pecah|belah)\b"),
        ("rough_road", r"\b(bergelombang|rusak|aspal|tidak rata)\b"),
    ]
    for label, pattern in patterns:
        if re.search(pattern, text):
            return label
    return "normal_road"


def validate_report_image(image_path, report_data=None, reports_collection=None, static_folder=None):
    report_data = report_data or {}
    signals = []
    duplicate_count = 0
    image_hash = ""
    abs_path = os.path.join(static_folder or "", image_path.replace("/", os.sep)) if image_path else ""

    try:
        if abs_path and os.path.exists(abs_path):
            image_hash = _image_sha256(abs_path)
            if reports_collection is not None:
                duplicate_count = reports_collection.count_documents({"image_hash": image_hash})
                if duplicate_count:
                    signals.append("Foto serupa pernah digunakan pada laporan lain")
        else:
            signals.append("File foto tidak ditemukan saat validasi AI")
    except Exception:
        signals.append("Hash foto gagal dihitung")

    label = _keyword_label(report_data)
    confidence = 0.72 if label not in ["normal_road", "not_road_damage"] else 0.46

    description = _normalize_text(report_data.get("description"))
    if len(description) < 20:
        confidence -= 0.12
        signals.append("Deskripsi laporan terlalu singkat")

    if duplicate_count:
        confidence -= 0.22

    if label == "normal_road":
        signals.append("AI belum menemukan kata kunci kerusakan yang kuat")

    confidence = max(0.12, min(confidence, 0.94))
    fake_risk_score = 15
    if confidence < 0.5:
        fake_risk_score += 25
    if duplicate_count:
        fake_risk_score += 35
    if len(description) < 20:
        fake_risk_score += 15
    if label in ["normal_road", "not_road_damage"]:
        fake_risk_score += 20
    fake_risk_score = min(fake_risk_score, 100)

    if fake_risk_score >= 70:
        fake_risk_level = "high"
    elif fake_risk_score >= 40:
        fake_risk_level = "medium"
    else:
        fake_risk_level = "low"

    if confidence >= 0.7 and fake_risk_level == "low":
        status = "confirmed"
    elif fake_risk_level == "high":
        status = "suspicious"
    else:
        status = "needs_review"

    return {
        "status": status,
        "damage_label": label,
        "damage_label_display": DAMAGE_LABELS.get(label, label),
        "damage_confidence": round(confidence, 2),
        "fake_risk_score": fake_risk_score,
        "fake_risk_level": fake_risk_level,
        "signals": signals or ["Tidak ada sinyal mencurigakan yang kuat"],
        "image_hash": image_hash,
        "model_version": "smartroad-heuristic-v1",
        "checked_at": datetime.utcnow()
    }


def export_internal_dataset(static_folder, output_dir="datasets/internal"):
    if db is None:
        return {"exported": 0, "metadata_path": "", "message": "Database tidak terhubung"}

    reports_collection = db["reports"]
    os.makedirs(output_dir, exist_ok=True)
    metadata_path = os.path.join(output_dir, "metadata.csv")
    rows = []

    cursor = reports_collection.find({
        "admin_validation.is_valid_damage": {"$in": [True, False]},
        "image_path": {"$nin": ["", None]}
    })
    for report in cursor:
        image_path = report.get("image_path", "")
        validation = report.get("admin_validation", {})
        rows.append({
            "image_path": image_path,
            "label": validation.get("label") or report.get("ai_validation", {}).get("damage_label", ""),
            "source": "smartroad_admin_validation",
            "is_valid_damage": validation.get("is_valid_damage"),
            "report_id": str(report.get("_id")),
            "notes": validation.get("notes", "")
        })

    with open(metadata_path, "w", newline="", encoding="utf-8") as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=["image_path", "label", "source", "is_valid_damage", "report_id", "notes"])
        writer.writeheader()
        writer.writerows(rows)

    return {"exported": len(rows), "metadata_path": metadata_path}
