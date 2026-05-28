from flask import Blueprint, request, jsonify
from app.controllers.report_controller import save_report, get_user_reports, get_all_reports

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
def get_user_reports_route():
    if request.method == 'OPTIONS':
        return jsonify({}), 200
        
    email = request.args.get('email')
    if not email:
        return jsonify({"status": "error", "message": "Parameter email diperlukan"}), 400
        
    result, status_code = get_user_reports(email)
    return jsonify(result), status_code

@report_bp.route('/all', methods=['GET', 'OPTIONS'])
def get_all_reports_route():
    if request.method == 'OPTIONS':
        return jsonify({}), 200
        
    result, status_code = get_all_reports()
    return jsonify(result), status_code
