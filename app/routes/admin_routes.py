from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required
from app.utils.decorators import admin_required

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
