from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt, verify_jwt_in_request
from app.controllers.report_controller import (
    save_report,
    get_user_reports,
    get_all_reports,
    update_report_status,
    get_user_notifications,
    mark_notifications_read,
    get_assigned_reports,
    complete_assigned_report,
    get_public_report_summary,
    submit_report_review,
    get_report_cs_messages,
    send_report_cs_message,
    get_admin_cs_conversations,
    upvote_report,
    get_public_waiting_reports,
    update_admin_validation,
    export_ai_dataset,
    backfill_ai_validation
)

report_bp = Blueprint('reports', __name__)

@report_bp.route('/public-summary', methods=['GET'])
def get_public_summary_route():
    result, status_code = get_public_report_summary()
    return jsonify(result), status_code

@report_bp.route('/public/waiting', methods=['GET', 'OPTIONS'])
def get_waiting_reports_route():
    if request.method == 'OPTIONS':
        return jsonify({}), 200

    viewer_email = None
    try:
        verify_jwt_in_request(optional=True)
        viewer_email = get_jwt_identity()
    except Exception:
        viewer_email = None

    result, status_code = get_public_waiting_reports(viewer_email)
    return jsonify(result), status_code

@report_bp.route('/<report_id>/upvote', methods=['POST', 'OPTIONS'])
@jwt_required()
def upvote_report_route(report_id):
    if request.method == 'OPTIONS':
        return jsonify({}), 200
        
    email = get_jwt_identity()
    result, status_code = upvote_report(report_id, email)
    return jsonify(result), status_code

@report_bp.route('/submit', methods=['POST', 'OPTIONS'])
@jwt_required()
def submit_report():
    if request.method == 'OPTIONS':
        return jsonify({}), 200
        
    if 'photo' not in request.files:
        return jsonify({"status": "error", "message": "File foto tidak ditemukan"}), 400
        
    file = request.files['photo']
    data = request.form.to_dict()
    data['reporter_email'] = get_jwt_identity()
    
    result, status_code = save_report(data, file)
    return jsonify(result), status_code

@report_bp.route('/user', methods=['GET', 'OPTIONS'])
@jwt_required()
def get_user_reports_route():
    if request.method == 'OPTIONS':
        return jsonify({}), 200
        
    email = get_jwt_identity()
    result, status_code = get_user_reports(email)
    return jsonify(result), status_code

@report_bp.route('/<report_id>/review', methods=['POST', 'OPTIONS'])
@jwt_required()
def submit_review_route(report_id):
    if request.method == 'OPTIONS':
        return jsonify({}), 200

    email = get_jwt_identity()
    data = request.get_json(silent=True) or {}
    result, status_code = submit_report_review(report_id, email, data)
    return jsonify(result), status_code

from app.utils.decorators import admin_required, petugas_required

@report_bp.route('/cs/conversations', methods=['GET', 'OPTIONS'])
@jwt_required()
@admin_required()
def get_cs_conversations_route():
    if request.method == 'OPTIONS':
        return jsonify({}), 200

    result, status_code = get_admin_cs_conversations()
    return jsonify(result), status_code

@report_bp.route('/all', methods=['GET', 'OPTIONS'])
@jwt_required()
@admin_required()
def get_all_reports_route():
    if request.method == 'OPTIONS':
        return jsonify({}), 200
        
    result, status_code = get_all_reports()
    return jsonify(result), status_code

@report_bp.route('/<report_id>/status', methods=['PUT', 'OPTIONS'])
@jwt_required()
@admin_required()
def update_status_route(report_id):
    if request.method == 'OPTIONS':
        return jsonify({}), 200
        
    data = request.json
    if not data or 'status' not in data:
        return jsonify({"status": "error", "message": "Status baru tidak ditemukan dalam request"}), 400
        
    new_status = data['status']
    allowed_statuses = {"Menunggu", "Proses", "Selesai"}
    if new_status not in allowed_statuses:
        return jsonify({"status": "error", "message": "Status laporan tidak valid"}), 400

    assigned_petugas_email = data.get("assigned_petugas_email")
    result, status_code = update_report_status(report_id, new_status, assigned_petugas_email)
    return jsonify(result), status_code

@report_bp.route('/<report_id>/admin-validation', methods=['POST', 'OPTIONS'])
@jwt_required()
@admin_required()
def admin_validation_route(report_id):
    if request.method == 'OPTIONS':
        return jsonify({}), 200

    email = get_jwt_identity()
    data = request.get_json(silent=True) or {}
    result, status_code = update_admin_validation(report_id, email, data)
    return jsonify(result), status_code

@report_bp.route('/ai/dataset/export', methods=['POST', 'OPTIONS'])
@jwt_required()
@admin_required()
def export_ai_dataset_route():
    if request.method == 'OPTIONS':
        return jsonify({}), 200

    result, status_code = export_ai_dataset()
    return jsonify(result), status_code

@report_bp.route('/ai/validation/backfill', methods=['POST', 'OPTIONS'])
@jwt_required()
@admin_required()
def backfill_ai_validation_route():
    if request.method == 'OPTIONS':
        return jsonify({}), 200

    data = request.get_json(silent=True) or {}
    result, status_code = backfill_ai_validation(data.get("limit", 200))
    return jsonify(result), status_code

@report_bp.route('/<report_id>/cs-messages', methods=['GET', 'POST', 'OPTIONS'])
@jwt_required()
def cs_messages_route(report_id):
    if request.method == 'OPTIONS':
        return jsonify({}), 200

    email = get_jwt_identity()
    role = (get_jwt() or {}).get("role", "user")

    if request.method == 'GET':
        result, status_code = get_report_cs_messages(report_id, email, role)
    else:
        data = request.get_json(silent=True) or {}
        result, status_code = send_report_cs_message(report_id, email, role, data)
    return jsonify(result), status_code

@report_bp.route('/assigned', methods=['GET', 'OPTIONS'])
@jwt_required()
@petugas_required()
def get_assigned_reports_route():
    if request.method == 'OPTIONS':
        return jsonify({}), 200

    email = get_jwt_identity()
    result, status_code = get_assigned_reports(email)
    return jsonify(result), status_code

@report_bp.route('/<report_id>/complete', methods=['POST', 'OPTIONS'])
@jwt_required()
@petugas_required()
def complete_report_route(report_id):
    if request.method == 'OPTIONS':
        return jsonify({}), 200

    if 'photo' not in request.files:
        return jsonify({"status": "error", "message": "Foto bukti perbaikan wajib diunggah"}), 400

    email = get_jwt_identity()
    result, status_code = complete_assigned_report(
        report_id,
        email,
        request.form.to_dict(),
        request.files['photo']
    )
    return jsonify(result), status_code

@report_bp.route('/notifications/user', methods=['GET', 'OPTIONS'])
@jwt_required()
def get_notifications_route():
    if request.method == 'OPTIONS':
        return jsonify({}), 200
        
    email = get_jwt_identity()
    if not email:
        return jsonify({"status": "error", "message": "Email diperlukan"}), 400
        
    result, status_code = get_user_notifications(email)
    return jsonify(result), status_code

@report_bp.route('/notifications/user/read', methods=['PUT', 'OPTIONS'])
@jwt_required()
def read_notifications_route():
    if request.method == 'OPTIONS':
        return jsonify({}), 200
        
    email = get_jwt_identity()
    if not email:
        return jsonify({"status": "error", "message": "Email diperlukan"}), 400
        
    result, status_code = mark_notifications_read(email)
    return jsonify(result), status_code
