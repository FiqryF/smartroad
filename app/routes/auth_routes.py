import os
from werkzeug.utils import secure_filename
from datetime import datetime
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.controllers.auth_controller import register_user, login_user, get_profile_data, update_user_profile, update_user_password, update_user_photo

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

@auth_bp.route('/api/profile/user-profile', methods=['GET', 'OPTIONS'])
@jwt_required()
def get_user_profile_route():
    if request.method == 'OPTIONS':
        return jsonify({}), 200
        
    email = get_jwt_identity()
    
    if not email:
        return jsonify({"status": "error", "message": "Email diperlukan"}), 400
        
    try:
        result, status_code = get_profile_data(email)
        
        # Jika hasil kosong atau user tidak ditemukan
        if not result or status_code == 404 or (isinstance(result, dict) and result.get('status') == 'error'):
            return jsonify({"error": "User tidak ditemukan"}), 404
            
        return jsonify(result), status_code
    except Exception as e:
        # Menangkap error DB atau error lainnya agar server tidak crash 500
        return jsonify({"error": "Terjadi kesalahan pada server", "detail": str(e)}), 500

@auth_bp.route('/api/profile/update-profile', methods=['POST', 'OPTIONS'])
@jwt_required()
def update_profile_route():
    if request.method == 'OPTIONS':
        return jsonify({}), 200
    data = request.get_json()
    
    # Overwrite email from token to prevent unauthorized modification
    data['email'] = get_jwt_identity()
    
    result, status_code = update_user_profile(data)
    return jsonify(result), status_code

@auth_bp.route('/api/profile/update-password', methods=['POST', 'OPTIONS'])
@jwt_required()
def update_password_route():
    if request.method == 'OPTIONS':
        return jsonify({}), 200
    data = request.get_json()
    
    # Overwrite email from token to prevent unauthorized modification
    data['email'] = get_jwt_identity()
    
    result, status_code = update_user_password(data)
    return jsonify(result), status_code

@auth_bp.route('/api/profile/upload-photo', methods=['POST', 'OPTIONS'])
@jwt_required()
def upload_photo_route():
    if request.method == 'OPTIONS':
        return jsonify({}), 200
        
    email = get_jwt_identity()
    if not email:
        return jsonify({"status": "error", "message": "Email tidak ditemukan"}), 400
        
    if 'photo' not in request.files:
        return jsonify({"status": "error", "message": "File foto tidak ditemukan"}), 400
        
    file = request.files['photo']
    if file.filename == '':
        return jsonify({"status": "error", "message": "Tidak ada file yang dipilih"}), 400

    filename = secure_filename(file.filename)
    unique_filename = f"{email.split('@')[0]}_{int(datetime.now().timestamp())}_{filename}"
    upload_folder = os.path.join(current_app.static_folder, 'uploads')
    
    if not os.path.exists(upload_folder):
        os.makedirs(upload_folder)
        
    file.save(os.path.join(upload_folder, unique_filename))
    photo_url = f"uploads/{unique_filename}"
    
    result, status_code = update_user_photo(email, photo_url)
    return jsonify(result), status_code
