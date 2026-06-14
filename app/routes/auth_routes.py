from flask import Blueprint, request, jsonify
from app.controllers.auth_controller import register_user, login_user

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/register', methods=['POST', 'OPTIONS'])
def register():
    if request.method == 'OPTIONS':
        return jsonify({}), 200
        
    data = request.get_json()
    if not data:
        return jsonify({"status": "error", "message": "Format request tidak valid, gunakan JSON"}), 400
        
    result, status_code = register_user(data)
    return jsonify(result), status_code

@auth_bp.route('/login', methods=['POST', 'OPTIONS'])
def login():
    if request.method == 'OPTIONS':
        return jsonify({}), 200
        
    data = request.get_json()
    if not data:
        return jsonify({"status": "error", "message": "Format request tidak valid, gunakan JSON"}), 400
        
    result, status_code = login_user(data)
    return jsonify(result), status_code
