"""
Admin routes: quản lý thực đơn, món ăn — Multi-tenant
"""
from flask import Blueprint, jsonify, request
from flask_login import login_required, current_user
from database import db, MonAn, ThucDon, DonVi, NguoiDung, get_user_don_vi_id
from datetime import datetime
import os, uuid

admin_bp = Blueprint('admin', __name__)

UPLOAD_FOLDER_ADMIN = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'static', 'uploads')


def admin_required(f):
    from functools import wraps
    @wraps(f)
    def decorated(*args, **kwargs):
        if not current_user.is_authenticated:
            return jsonify({'error': 'Chưa đăng nhập'}), 401
        if not current_user.is_admin:
            return jsonify({'error': 'Cần quyền quản trị viên'}), 403
        return f(*args, **kwargs)
    return decorated


# =========== QUẢN LÝ MÓN ĂN ===========

@admin_bp.route('/api/admin/dishes', methods=['GET'])
@login_required
def admin_get_dishes():
    """Lấy tất cả món ăn (theo đơn vị)"""
    dvid = get_user_don_vi_id()
    dishes = MonAn.query.filter_by(don_vi_id=dvid).order_by(MonAn.loai, MonAn.ten).all()
    return jsonify([d.to_dict() for d in dishes])


@admin_bp.route('/api/admin/dishes', methods=['POST'])
@admin_required
def admin_create_dish():
    """Tạo món ăn mới (gán đơn vị)"""
    dvid = get_user_don_vi_id()
    if request.content_type and 'multipart/form-data' in request.content_type:
        data = request.form
        hinh_anh = None
        if 'hinh_anh' in request.files:
            file = request.files['hinh_anh']
            if file and file.filename:
                os.makedirs(UPLOAD_FOLDER_ADMIN, exist_ok=True)
                ext = file.filename.rsplit('.', 1)[-1].lower() if '.' in file.filename else 'jpg'
                fname = f"{uuid.uuid4().hex}.{ext}"
                file.save(os.path.join(UPLOAD_FOLDER_ADMIN, fname))
                hinh_anh = f'/static/uploads/{fname}'
    else:
        data = request.json
        hinh_anh = data.get('hinh_anh')

    mon = MonAn(
        ten=data['ten'],
        don_vi_id=dvid,
        mo_ta=data.get('mo_ta', ''),
        loai=data.get('loai', 'mon_chinh'),
        vung_mien=data.get('vung_mien', 'chung'),
        hinh_anh=hinh_anh,
        calo=float(data.get('calo', 0)),
        protein=float(data.get('protein', 0)),
        fat=float(data.get('fat', 0)),
        carbs=float(data.get('carbs', 0)),
        vitamin_a=float(data.get('vitamin_a', 0)),
        vitamin_c=float(data.get('vitamin_c', 0)),
        canxi=float(data.get('canxi', 0)),
        sat=float(data.get('sat', 0)),
    )
    db.session.add(mon)
    db.session.commit()
    return jsonify(mon.to_dict()), 201


@admin_bp.route('/api/admin/dishes/<int:dish_id>', methods=['PUT'])
@admin_required
def admin_update_dish(dish_id):
    """Cập nhật món ăn"""
    mon = MonAn.query.get_or_404(dish_id)
    if request.content_type and 'multipart/form-data' in request.content_type:
        data = request.form
        if 'hinh_anh' in request.files:
            file = request.files['hinh_anh']
            if file and file.filename:
                os.makedirs(UPLOAD_FOLDER_ADMIN, exist_ok=True)
                ext = file.filename.rsplit('.', 1)[-1].lower() if '.' in file.filename else 'jpg'
                fname = f"{uuid.uuid4().hex}.{ext}"
                file.save(os.path.join(UPLOAD_FOLDER_ADMIN, fname))
                mon.hinh_anh = f'/static/uploads/{fname}'
    else:
        data = request.json

    if 'ten' in data: mon.ten = data['ten']
    if 'mo_ta' in data: mon.mo_ta = data['mo_ta']
    if 'loai' in data: mon.loai = data['loai']
    if 'vung_mien' in data: mon.vung_mien = data['vung_mien']
    if 'calo' in data: mon.calo = float(data['calo'])
    if 'protein' in data: mon.protein = float(data['protein'])
    if 'fat' in data: mon.fat = float(data['fat'])
    if 'carbs' in data: mon.carbs = float(data['carbs'])
    if 'vitamin_a' in data: mon.vitamin_a = float(data['vitamin_a'])
    if 'vitamin_c' in data: mon.vitamin_c = float(data['vitamin_c'])
    if 'canxi' in data: mon.canxi = float(data['canxi'])
    if 'sat' in data: mon.sat = float(data['sat'])

    db.session.commit()
    return jsonify(mon.to_dict())


@admin_bp.route('/api/admin/dishes/<int:dish_id>', methods=['DELETE'])
@admin_required
def admin_delete_dish(dish_id):
    """Xóa món ăn"""
    mon = MonAn.query.get_or_404(dish_id)
    db.session.delete(mon)
    db.session.commit()
    return jsonify({'message': 'Da xoa mon an'})


# =========== QUẢN LÝ THỰC ĐƠN ===========

@admin_bp.route('/api/admin/menus', methods=['GET'])
@login_required
def admin_get_menus():
    """Lấy thực đơn (theo đơn vị)"""
    dvid = get_user_don_vi_id()
    from datetime import date, timedelta
    start = date.today() - timedelta(days=7)
    end = date.today() + timedelta(days=14)
    menus = ThucDon.query.filter(
        ThucDon.ngay >= start, ThucDon.ngay <= end,
        ThucDon.don_vi_id == dvid
    ).order_by(ThucDon.ngay.desc(), ThucDon.bua).all()
    return jsonify([m.to_dict() for m in menus])


@admin_bp.route('/api/admin/menus', methods=['POST'])
@admin_required
def admin_create_menu():
    """Tạo thực đơn mới (gán đơn vị)"""
    dvid = get_user_don_vi_id()
    data = request.json
    ngay = datetime.strptime(data['ngay'], '%Y-%m-%d').date()

    # Xóa thực đơn cũ cùng ngày + bữa nếu có (cùng đơn vị)
    existing = ThucDon.query.filter_by(ngay=ngay, bua=data['bua'], don_vi_id=dvid).first()
    if existing:
        db.session.delete(existing)

    td = ThucDon(ngay=ngay, bua=data['bua'], don_vi_id=dvid, ghi_chu=data.get('ghi_chu', ''))
    if data.get('mon_an_ids'):
        mon_list = MonAn.query.filter(MonAn.id.in_(data['mon_an_ids']), MonAn.don_vi_id == dvid).all()
        td.mon_an_list = mon_list
    db.session.add(td)
    db.session.commit()
    return jsonify(td.to_dict()), 201


@admin_bp.route('/api/admin/menus/<int:menu_id>', methods=['PUT'])
@admin_required
def admin_update_menu(menu_id):
    """Cập nhật thực đơn"""
    dvid = get_user_don_vi_id()
    td = ThucDon.query.get_or_404(menu_id)
    data = request.json
    if 'mon_an_ids' in data:
        mon_list = MonAn.query.filter(MonAn.id.in_(data['mon_an_ids']), MonAn.don_vi_id == dvid).all()
        td.mon_an_list = mon_list
    if 'ghi_chu' in data:
        td.ghi_chu = data['ghi_chu']
    db.session.commit()
    return jsonify(td.to_dict())


@admin_bp.route('/api/admin/menus/<int:menu_id>', methods=['DELETE'])
@admin_required
def admin_delete_menu(menu_id):
    """Xóa thực đơn"""
    td = ThucDon.query.get_or_404(menu_id)
    db.session.delete(td)
    db.session.commit()
    return jsonify({'message': 'Da xoa thuc don'})


# =========== QUẢN LÝ NGƯỜI DÙNG ===========

@admin_bp.route('/api/admin/users')
@admin_required
def admin_get_users():
    """Lấy danh sách người dùng (cùng đơn vị)"""
    dvid = get_user_don_vi_id()
    users = NguoiDung.query.filter_by(don_vi_id=dvid).order_by(NguoiDung.ngay_tao.desc()).all()
    return jsonify([u.to_dict() for u in users])


@admin_bp.route('/api/admin/users/<int:uid>/toggle', methods=['POST'])
@admin_required
def admin_toggle_user(uid):
    u = NguoiDung.query.get_or_404(uid)
    u.kich_hoat = not u.kich_hoat
    db.session.commit()
    return jsonify(u.to_dict())


@admin_bp.route('/api/admin/users/<int:uid>/role', methods=['PUT'])
@admin_required
def admin_set_role(uid):
    u = NguoiDung.query.get_or_404(uid)
    data = request.json
    u.vai_tro = data.get('vai_tro', u.vai_tro)
    db.session.commit()
    return jsonify(u.to_dict())
