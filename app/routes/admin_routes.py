from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required
from app.utils.decorators import admin_required
from app.db import db

admin_bp = Blueprint('admin', __name__)

@admin_bp.route('/dashboard-stats', methods=['GET'])
@jwt_required()
@admin_required()
def get_dashboard_stats():
    # Contoh fungsi admin yang diproteksi
    return jsonify({
        "status": "success",
        "data": {
            "total_users": 150,
            "total_reports": 45,
            "active_admins": 3
        }
    }), 200

@admin_bp.route('/users', methods=['GET'])
@jwt_required()
@admin_required()
def get_users():
    if db is None:
        return jsonify({"status": "error", "message": "Database tidak terhubung"}), 500

    users = []
    for user in db["users"].find({}, {"password": 0}).sort("created_at", -1):
        users.append({
            "_id": str(user.get("_id")),
            "nama": user.get("nama", ""),
            "email": user.get("email", ""),
            "role": user.get("role", "user"),
            "telepon": user.get("telepon", ""),
            "alamat": user.get("alamat", ""),
            "created_at": user.get("created_at")
        })

    return jsonify({"status": "success", "data": users}), 200

@admin_bp.route('/petugas', methods=['GET'])
@jwt_required()
@admin_required()
def get_petugas():
    if db is None:
        return jsonify({"status": "error", "message": "Database tidak terhubung"}), 500

    petugas = []
    for user in db["users"].find({"role": "petugas"}, {"password": 0}).sort("nama", 1):
        petugas.append({
            "_id": str(user.get("_id")),
            "nama": user.get("nama", ""),
            "email": user.get("email", ""),
            "telepon": user.get("telepon", ""),
            "alamat": user.get("alamat", "")
        })

    return jsonify({"status": "success", "data": petugas}), 200
