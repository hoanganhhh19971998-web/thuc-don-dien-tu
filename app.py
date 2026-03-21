"""
Hệ Thống Thực Đơn Điện Tử Quân Đội
Flask Application Entry Point - v2 (with Auth + Admin)
"""
from flask import Flask, send_from_directory
from flask_cors import CORS
from flask_login import LoginManager
from database import db
import os


def create_app():
    app = Flask(__name__,
                static_folder='static',
                template_folder='templates')

    # Config
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///thuc_don_quan_doi.db'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max upload
    app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'quan-doi-thuc-don-2026-v2')
    app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
    app.config['SESSION_COOKIE_SECURE'] = os.environ.get('FLASK_ENV') == 'production'

    # CORS - cho phép truy cập từ mọi nơi qua internet (với credentials)
    CORS(app, supports_credentials=True)

    # Database
    db.init_app(app)

    # Flask-Login
    login_manager = LoginManager()
    login_manager.init_app(app)
    login_manager.login_view = None  # SPA handles redirect

    @login_manager.user_loader
    def load_user(user_id):
        from database import NguoiDung
        return NguoiDung.query.get(int(user_id))

    @login_manager.unauthorized_handler
    def unauthorized():
        from flask import jsonify
        return jsonify({'error': 'Chua dang nhap'}), 401

    # Register blueprints
    from routes.menu_routes import menu_bp
    from routes.rating_routes import rating_bp
    from routes.voting_routes import voting_bp
    from routes.personnel_routes import personnel_bp
    from routes.waste_routes import waste_bp
    from routes.competition_routes import competition_bp
    from routes.logistics_routes import logistics_bp
    from routes.auth_routes import auth_bp
    from routes.admin_routes import admin_bp

    app.register_blueprint(menu_bp)
    app.register_blueprint(rating_bp)
    app.register_blueprint(voting_bp)
    app.register_blueprint(personnel_bp)
    app.register_blueprint(waste_bp)
    app.register_blueprint(competition_bp)
    app.register_blueprint(logistics_bp)
    app.register_blueprint(auth_bp)
    app.register_blueprint(admin_bp)

    # Serve frontend SPA
    @app.route('/')
    def index():
        return send_from_directory('templates', 'index.html')

    @app.route('/admin')
    def admin_page():
        return send_from_directory('templates', 'admin.html')

    # Tạo thư mục uploads
    upload_dir = os.path.join(app.static_folder, 'uploads')
    os.makedirs(upload_dir, exist_ok=True)

    # Tạo DB và seed data + tài khoản admin mặc định
    with app.app_context():
        db.create_all()
        from database import ChienSi, NguoiDung, DonVi
        
        if ChienSi.query.count() == 0:
            from seed_data import seed_data
            seed_data()
            print("[OK] Database da duoc tao va seed du lieu mau!")

        # Tìm đơn vị chính (ưu tiên đại đội, rồi trung đội đầu tiên)
        default_dv = DonVi.query.filter_by(cap_do='dai_doi').first()
        if not default_dv:
            default_dv = DonVi.query.first()
        if not default_dv:
            default_dv = DonVi(ten='Don vi 1', cap_do='dai_doi')
            db.session.add(default_dv)
            db.session.commit()
            print(f"[OK] Da tao don vi mac dinh: id={default_dv.id}")

        # Tạo tài khoản admin mặc định nếu chưa có
        if NguoiDung.query.filter_by(ten_dang_nhap='admin').first() is None:
            admin = NguoiDung(
                ten_dang_nhap='admin',
                ho_ten='Quan Tri Vien',
                vai_tro='admin',
                don_vi_id=default_dv.id
            )
            admin.set_password('admin123')
            db.session.add(admin)
            db.session.commit()
            print(f"[OK] Da tao tai khoan admin mac dinh: admin / admin123 (don_vi_id={default_dv.id})")

    return app


# Module-level app cho gunicorn (production)
app = create_app()

if __name__ == '__main__':
    print("=" * 60)
    print("HE THONG THUC DON DIEN TU QUAN DOI v2")
    print("=" * 60)
    print("Truy cap: http://localhost:5000")
    print("Admin mac dinh: admin / admin123")
    print("=" * 60)
    app.run(host='0.0.0.0', port=5000, debug=True)
