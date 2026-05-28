import os
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.controllers.profile_controller import (
    get_user_profile, 
    update_user_profile, 
    update_user_password,
    upload_profile_photo
)

profile_bp = Blueprint('profile', __name__)

@profile_bp.route('/user-profile', methods=['GET', 'OPTIONS'])
@jwt_required()
def get_profile():
    if request.method == 'OPTIONS':
        return jsonify({}), 200
        
    email = get_jwt_identity()
    result, status = get_user_profile(email)
    return jsonify(result), status

@profile_bp.route('/update-profile', methods=['POST', 'OPTIONS'])
@jwt_required()
def update_profile():
    if request.method == 'OPTIONS':
        return jsonify({}), 200
        
    data = request.get_json()
    email = get_jwt_identity()
    result, status = update_user_profile(email, data)
    return jsonify(result), status

@profile_bp.route('/update-password', methods=['POST', 'OPTIONS'])
@jwt_required()
def update_password():
    if request.method == 'OPTIONS':
        return jsonify({}), 200
        
    data = request.get_json()
    email = get_jwt_identity()
    result, status = update_user_password(email, data)
    return jsonify(result), status

@profile_bp.route('/upload-photo', methods=['POST', 'OPTIONS'])
@jwt_required()
def upload_photo():
    if request.method == 'OPTIONS':
        return jsonify({}), 200
        
    email = get_jwt_identity()
    if 'photo' not in request.files:
        return jsonify({"status": "error", "message": "File foto tidak ditemukan"}), 400
        
    file = request.files['photo']
    upload_folder = os.path.join(current_app.static_folder, 'uploads')
    
    result, status = upload_profile_photo(email, file, upload_folder)
    return jsonify(result), status
