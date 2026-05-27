from flask import Blueprint, render_template
import os

view_bp = Blueprint('views', __name__)

@view_bp.route('/')
def index():
    return render_template('index.html')

@view_bp.route('/<page>.html')
def render_page(page):
    try:
        return render_template(f'{page}.html')
    except Exception:
        return "Page not found", 404
