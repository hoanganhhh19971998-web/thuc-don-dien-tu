"""
Routes cho đánh giá và hòm thư góp ý — Multi-tenant
"""
from flask import Blueprint, jsonify, request
from flask_login import current_user, login_required
from database import db, DanhGia, GopY, ThucDon, get_user_don_vi_id
from datetime import datetime
import os
import uuid

rating_bp = Blueprint('rating', __name__)

UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'static', 'uploads')


def save_uploaded_image(file):
    """Lưu ảnh upload và trả về đường dẫn"""
    if not os.path.exists(UPLOAD_FOLDER):
        os.makedirs(UPLOAD_FOLDER)
    ext = file.filename.rsplit('.', 1)[-1].lower() if '.' in file.filename else 'jpg'
    filename = f"{uuid.uuid4().hex}.{ext}"
    filepath = os.path.join(UPLOAD_FOLDER, filename)
    file.save(filepath)
    return f'/static/uploads/{filename}'


# === ĐÁNH GIÁ ===
@rating_bp.route('/api/ratings', methods=['GET'])
@login_required
def get_ratings():
    """Lấy danh sách đánh giá (theo đơn vị)"""
    dvid = get_user_don_vi_id()
    thuc_don_id = request.args.get('thuc_don_id', type=int)
    query = DanhGia.query.filter_by(don_vi_id=dvid).order_by(DanhGia.ngay_tao.desc())
    if thuc_don_id:
        query = query.filter_by(thuc_don_id=thuc_don_id)
    ratings = query.limit(50).all()
    return jsonify([r.to_dict() for r in ratings])


@rating_bp.route('/api/ratings', methods=['POST'])
@login_required
def create_rating():
    """Tạo đánh giá mới (gán đơn vị)"""
    dvid = get_user_don_vi_id()
    if request.content_type and 'multipart/form-data' in request.content_type:
        data = request.form
        hinh_anh = None
        if 'hinh_anh' in request.files:
            file = request.files['hinh_anh']
            if file.filename:
                hinh_anh = save_uploaded_image(file)
    else:
        data = request.json
        hinh_anh = data.get('hinh_anh')

    dg = DanhGia(
        thuc_don_id=int(data['thuc_don_id']),
        don_vi_id=dvid,
        chien_si_id=int(data['chien_si_id']) if data.get('chien_si_id') else None,
        so_sao=int(data['so_sao']),
        binh_luan=data.get('binh_luan'),
        hinh_anh=hinh_anh,
        an_danh=data.get('an_danh', 'false').lower() in ('true', '1', 'yes') if isinstance(data.get('an_danh'), str) else bool(data.get('an_danh', False))
    )
    db.session.add(dg)
    db.session.commit()
    return jsonify(dg.to_dict()), 201


@rating_bp.route('/api/ratings/stats')
@login_required
def get_rating_stats():
    """Thống kê đánh giá (theo đơn vị)"""
    from sqlalchemy import func
    dvid = get_user_don_vi_id()
    stats = db.session.query(
        func.avg(DanhGia.so_sao).label('trung_binh'),
        func.count(DanhGia.id).label('tong'),
        func.sum(db.case((DanhGia.so_sao >= 4, 1), else_=0)).label('hai_long'),
        func.sum(db.case((DanhGia.so_sao <= 2, 1), else_=0)).label('chua_hai_long')
    ).filter(DanhGia.don_vi_id == dvid).first()
    
    return jsonify({
        'trung_binh': round(float(stats.trung_binh or 0), 1),
        'tong_danh_gia': stats.tong or 0,
        'hai_long': stats.hai_long or 0,
        'chua_hai_long': stats.chua_hai_long or 0,
        'ty_le_hai_long': round((stats.hai_long or 0) / max(stats.tong or 1, 1) * 100, 1)
    })


# === HÒM THƯ GÓP Ý ===
@rating_bp.route('/api/feedback', methods=['GET'])
@login_required
def get_feedback():
    """Lấy danh sách góp ý (theo đơn vị)"""
    dvid = get_user_don_vi_id()
    feedbacks = GopY.query.filter_by(don_vi_id=dvid).order_by(GopY.ngay_tao.desc()).all()
    return jsonify([f.to_dict() for f in feedbacks])


@rating_bp.route('/api/feedback', methods=['POST'])
@login_required
def create_feedback():
    """Tạo góp ý mới (gán đơn vị)"""
    dvid = get_user_don_vi_id()
    if request.content_type and 'multipart/form-data' in request.content_type:
        data = request.form
        hinh_anh = None
        if 'hinh_anh' in request.files:
            file = request.files['hinh_anh']
            if file.filename:
                hinh_anh = save_uploaded_image(file)
    else:
        data = request.json
        hinh_anh = data.get('hinh_anh')

    gy = GopY(
        chien_si_id=int(data['chien_si_id']) if data.get('chien_si_id') else None,
        don_vi_id=dvid,
        noi_dung=data['noi_dung'],
        hinh_anh=hinh_anh,
        an_danh=data.get('an_danh', 'true').lower() in ('true', '1', 'yes') if isinstance(data.get('an_danh'), str) else bool(data.get('an_danh', True))
    )
    db.session.add(gy)
    db.session.commit()
    return jsonify(gy.to_dict()), 201


@rating_bp.route('/api/feedback/<int:feedback_id>/reply', methods=['POST'])
@login_required
def reply_feedback(feedback_id):
    """Phản hồi góp ý (dành cho hậu cần)"""
    gy = GopY.query.get_or_404(feedback_id)
    data = request.json
    gy.phan_hoi = data['phan_hoi']
    gy.da_doc = True
    gy.ngay_phan_hoi = datetime.utcnow()
    db.session.commit()
    return jsonify(gy.to_dict())
