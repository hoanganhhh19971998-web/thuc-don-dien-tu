"""
Auth routes: đăng nhập, đăng ký, đăng xuất — Multi-tenant
Khi đăng ký admin mới → tạo đơn vị mới
Khi đăng ký chiến sĩ → gán vào đơn vị có sẵn
"""
from flask import Blueprint, request, jsonify
from flask_login import login_user, logout_user, login_required, current_user
from database import db, NguoiDung, ChienSi, DonVi

auth_bp = Blueprint('auth', __name__)


@auth_bp.route('/api/auth/register', methods=['POST'])
def register():
    """Đăng ký tài khoản mới — tự tạo đơn vị nếu là admin"""
    data = request.json
    ten_dn = data.get('ten_dang_nhap', '').strip()
    ho_ten = data.get('ho_ten', '').strip()
    mat_khau = data.get('mat_khau', '')
    vai_tro = data.get('vai_tro', 'chien_si')
    ten_don_vi = data.get('ten_don_vi', '').strip()

    if not ten_dn or not ho_ten or not mat_khau:
        return jsonify({'error': 'Vui lòng điền đầy đủ thông tin'}), 400

    if len(ten_dn) < 4:
        return jsonify({'error': 'Tên đăng nhập phải có ít nhất 4 ký tự'}), 400

    if len(mat_khau) < 6:
        return jsonify({'error': 'Mật khẩu phải có ít nhất 6 ký tự'}), 400

    if NguoiDung.query.filter_by(ten_dang_nhap=ten_dn).first():
        return jsonify({'error': 'Tên đăng nhập đã tồn tại'}), 409

    don_vi_id = data.get('don_vi_id')
    
    # Nếu vai trò là admin và có tên đơn vị → tạo đơn vị mới
    if vai_tro == 'admin' and ten_don_vi:
        dv = DonVi(ten=ten_don_vi, cap_do='dai_doi')
        db.session.add(dv)
        db.session.flush()  # get ID
        don_vi_id = dv.id

    user = NguoiDung(
        ten_dang_nhap=ten_dn,
        ho_ten=ho_ten,
        email=data.get('email', ''),
        vai_tro=vai_tro,
        don_vi_id=don_vi_id,
        chien_si_id=data.get('chien_si_id')
    )
    user.set_password(mat_khau)
    db.session.add(user)
    db.session.commit()
    login_user(user, remember=True)
    return jsonify(user.to_dict()), 201


@auth_bp.route('/api/auth/login', methods=['POST'])
def login():
    """Đăng nhập"""
    data = request.json
    ten_dn = data.get('ten_dang_nhap', '').strip()
    mat_khau = data.get('mat_khau', '')

    user = NguoiDung.query.filter_by(ten_dang_nhap=ten_dn).first()
    if not user or not user.check_password(mat_khau):
        return jsonify({'error': 'Sai tên đăng nhập hoặc mật khẩu'}), 401

    if not user.kich_hoat:
        return jsonify({'error': 'Tài khoản đã bị khóa'}), 403

    login_user(user, remember=True)
    return jsonify(user.to_dict())


@auth_bp.route('/api/auth/logout', methods=['POST'])
@login_required
def logout():
    """Đăng xuất"""
    logout_user()
    return jsonify({'message': 'Đã đăng xuất'})


@auth_bp.route('/api/auth/me')
def me():
    """Lấy thông tin người dùng hiện tại"""
    if current_user.is_authenticated:
        result = current_user.to_dict()
        # Thêm tên đơn vị
        if current_user.don_vi_id:
            dv = DonVi.query.get(current_user.don_vi_id)
            result['ten_don_vi'] = dv.ten if dv else None
        return jsonify(result)
    return jsonify(None)


@auth_bp.route('/api/auth/users')
@login_required
def get_users():
    """Lấy danh sách người dùng (chỉ admin, cùng đơn vị)"""
    if not current_user.is_admin:
        return jsonify({'error': 'Không có quyền'}), 403
    users = NguoiDung.query.filter_by(don_vi_id=current_user.don_vi_id).all()
    return jsonify([u.to_dict() for u in users])


@auth_bp.route('/api/auth/users/<int:user_id>/role', methods=['PUT'])
@login_required
def update_role(user_id):
    """Cập nhật vai trò người dùng (chỉ admin)"""
    if not current_user.is_admin:
        return jsonify({'error': 'Không có quyền'}), 403
    user = NguoiDung.query.get_or_404(user_id)
    data = request.json
    user.vai_tro = data.get('vai_tro', user.vai_tro)
    user.kich_hoat = data.get('kich_hoat', user.kich_hoat)
    db.session.commit()
    return jsonify(user.to_dict())
