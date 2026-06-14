import logging
import os
from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from app.routes.auth_routes import auth_bp
from app.routes.view_routes import view_bp
from app.routes.profile_routes import profile_bp
from app.routes.report_routes import report_bp
from app.routes.admin_routes import admin_bp

def create_app():
    # Setup logging
    logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
    
    # Mendapatkan path absolut ke direktori root (satu tingkat di atas folder app/)
    base_dir = os.path.abspath(os.path.dirname(os.path.dirname(__file__)))
    
    app = Flask(__name__, 
                static_folder=os.path.join(base_dir, 'static'), 
                template_folder=os.path.join(base_dir, 'templates'))
                
    # Konfigurasi CORS (Mengizinkan local development)
    CORS(app, resources={r"/*": {"origins": "*"}})
    
    from datetime import timedelta
    app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY", "smartroad-dev-only-change-me")
    app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(hours=24)
    jwt = JWTManager(app)
    
    # Register blueprints
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(profile_bp, url_prefix='/api/profile')
    app.register_blueprint(report_bp, url_prefix='/api/reports')
    app.register_blueprint(admin_bp, url_prefix='/api/admin')
    app.register_blueprint(view_bp)
    
    # Global error handlers
    @app.errorhandler(400)
    def bad_request(error):
        return jsonify({"status": "error", "message": "Bad Request"}), 400

    @app.errorhandler(404)
    def not_found(error):
        return jsonify({"status": "error", "message": "Endpoint tidak ditemukan"}), 404

    @app.errorhandler(405)
    def method_not_allowed(error):
        return jsonify({"status": "error", "message": "Method tidak diizinkan untuk endpoint ini"}), 405

    @app.errorhandler(500)
    def internal_server_error(error):
        return jsonify({"status": "error", "message": "Terjadi kesalahan internal pada server"}), 500

    @app.errorhandler(Exception)
    def handle_exception(e):
        if hasattr(e, 'code') and isinstance(e.code, int):
            return jsonify({"status": "error", "message": str(e)}), e.code
        logging.error(f"Unhandled Exception: {e}")
        return jsonify({"status": "error", "message": "Terjadi kesalahan tak terduga"}), 500
        
    return app
