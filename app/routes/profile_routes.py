import os
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.utils.decorators import admin_required
from app.controllers.profile_controller import (
    get_user_profile, 
    update_user_profile, 
    update_user_password,
    upload_profile_photo,
    get_leaderboard,
    get_point_history,
    run_gamification_backfill
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

@profile_bp.route('/leaderboard', methods=['GET'])
def leaderboard_route():
    result, status = get_leaderboard(request.args.get("limit", 10))
    return jsonify(result), status

@profile_bp.route('/points-history', methods=['GET', 'OPTIONS'])
@jwt_required()
def points_history_route():
    if request.method == 'OPTIONS':
        return jsonify({}), 200

    email = get_jwt_identity()
    result, status = get_point_history(email, request.args.get("limit", 20))
    return jsonify(result), status

@profile_bp.route('/gamification/backfill', methods=['POST', 'OPTIONS'])
@jwt_required()
@admin_required()
def gamification_backfill_route():
    if request.method == 'OPTIONS':
        return jsonify({}), 200

    data = request.get_json(silent=True) or {}
    result, status = run_gamification_backfill(data.get("limit", 1000))
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
