import os
from flask import Blueprint, request, jsonify, current_app
from app.controllers.profile_controller import (
    get_user_profile, 
    update_user_profile, 
    update_user_password,
    upload_profile_photo
)

profile_bp = Blueprint('profile', __name__)

@profile_bp.route('/user-profile', methods=['GET', 'OPTIONS'])
def get_profile():
    if request.method == 'OPTIONS':
        return jsonify({}), 200
        
    email = request.args.get('email')
    if not email:
        return jsonify({"status": "error", "message": "Email diperlukan"}), 400
        
    result, status = get_user_profile(email)
    return jsonify(result), status

@profile_bp.route('/update-profile', methods=['POST', 'OPTIONS'])
def update_profile():
    if request.method == 'OPTIONS':
        return jsonify({}), 200
        
    data = request.get_json()
    email = data.get('email')
    if not email:
        return jsonify({"status": "error", "message": "Email diperlukan"}), 400
        
    result, status = update_user_profile(email, data)
    return jsonify(result), status

@profile_bp.route('/update-password', methods=['POST', 'OPTIONS'])
def update_password():
    if request.method == 'OPTIONS':
        return jsonify({}), 200
        
    data = request.get_json()
    email = data.get('email')
    if not email:
        return jsonify({"status": "error", "message": "Email diperlukan"}), 400
        
    result, status = update_user_password(email, data)
    return jsonify(result), status

@profile_bp.route('/upload-photo', methods=['POST', 'OPTIONS'])
def upload_photo():
    if request.method == 'OPTIONS':
        return jsonify({}), 200
        
    email = request.form.get('email')
    if not email:
        return jsonify({"status": "error", "message": "Email diperlukan"}), 400
        
    if 'photo' not in request.files:
        return jsonify({"status": "error", "message": "File foto tidak ditemukan"}), 400
        
    file = request.files['photo']
    upload_folder = os.path.join(current_app.static_folder, 'uploads')
    
    result, status = upload_profile_photo(email, file, upload_folder)
    return jsonify(result), status
