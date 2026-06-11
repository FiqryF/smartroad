from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.controllers.report_controller import save_report, get_user_reports, get_all_reports, update_report_status, get_user_notifications, mark_notifications_read

report_bp = Blueprint('reports', __name__)

@report_bp.route('/submit', methods=['POST', 'OPTIONS'])
def submit_report():
    if request.method == 'OPTIONS':
        return jsonify({}), 200
        
    if 'photo' not in request.files:
        return jsonify({"status": "error", "message": "File foto tidak ditemukan"}), 400
        
    file = request.files['photo']
    data = request.form.to_dict()
    
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

from app.utils.decorators import admin_required

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
    result, status_code = update_report_status(report_id, new_status)
    return jsonify(result), status_code

@report_bp.route('/notifications/user', methods=['GET', 'OPTIONS'])
@jwt_required()
def get_notifications_route():
    if request.method == 'OPTIONS':
        return jsonify({}), 200
        
    email = request.args.get('email')
    if not email:
        return jsonify({"status": "error", "message": "Email diperlukan"}), 400
        
    result, status_code = get_user_notifications(email)
    return jsonify(result), status_code

@report_bp.route('/notifications/user/read', methods=['PUT', 'OPTIONS'])
@jwt_required()
def read_notifications_route():
    if request.method == 'OPTIONS':
        return jsonify({}), 200
        
    data = request.json
    if not data or 'email' not in data:
        return jsonify({"status": "error", "message": "Email diperlukan"}), 400
        
    result, status_code = mark_notifications_read(data['email'])
    return jsonify(result), status_code
