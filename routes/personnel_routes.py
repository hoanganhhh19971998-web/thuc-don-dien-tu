"""
Routes cho quản lý quân số và cắt cơm — Multi-tenant
"""
from flask import Blueprint, jsonify, request
from flask_login import login_required
from database import db, ChienSi, DonVi, CatCom, get_user_don_vi_id
from datetime import date, datetime

personnel_bp = Blueprint('personnel', __name__)


@personnel_bp.route('/api/personnel')
@login_required
def get_personnel():
    """Lấy danh sách quân nhân (theo đơn vị)"""
    dvid = get_user_don_vi_id()
    don_vi_id = request.args.get('don_vi_id', type=int)
    
    # Lấy đơn vị con
    don_vi_ids = []
    if dvid:
        don_vi_ids = [dvid]
        children = DonVi.query.filter_by(don_vi_cha_id=dvid).all()
        don_vi_ids.extend([c.id for c in children])
    
    query = ChienSi.query.filter(ChienSi.don_vi_id.in_(don_vi_ids))
    if don_vi_id and don_vi_id in don_vi_ids:
        query = ChienSi.query.filter_by(don_vi_id=don_vi_id)
    return jsonify([cs.to_dict() for cs in query.all()])


@personnel_bp.route('/api/personnel/stats')
@login_required
def get_personnel_stats():
    """Thống kê quân số (theo đơn vị)"""
    dvid = get_user_don_vi_id()
    today = date.today()
    
    don_vi_ids = []
    if dvid:
        don_vi_ids = [dvid]
        children = DonVi.query.filter_by(don_vi_cha_id=dvid).all()
        don_vi_ids.extend([c.id for c in children])
    
    base_query = ChienSi.query.filter(ChienSi.don_vi_id.in_(don_vi_ids))
    total = base_query.count()
    tai_vi = base_query.filter(ChienSi.trang_thai == 'tai_vi').count()
    vang_mat = total - tai_vi
    
    # Số cắt cơm active hôm nay (chiến sĩ trong đơn vị)
    cat_com_today = CatCom.query.join(ChienSi).filter(
        CatCom.ngay_bat_dau <= today,
        CatCom.ngay_ket_thuc >= today,
        ChienSi.don_vi_id.in_(don_vi_ids)
    ).count()
    
    return jsonify({
        'tong_quan_so': total,
        'tai_don_vi': tai_vi,
        'vang_mat': vang_mat,
        'cat_com_hom_nay': cat_com_today,
        'an_tai_don_vi': total - cat_com_today
    })


@personnel_bp.route('/api/units')
@login_required
def get_units():
    """Lấy danh sách đơn vị con"""
    dvid = get_user_don_vi_id()
    if dvid:
        units = DonVi.query.filter(
            db.or_(DonVi.id == dvid, DonVi.don_vi_cha_id == dvid)
        ).all()
    else:
        units = []
    return jsonify([u.to_dict() for u in units])


@personnel_bp.route('/api/meal-cuts')
@login_required
def get_meal_cuts():
    """Lấy danh sách cắt cơm (theo đơn vị)"""
    dvid = get_user_don_vi_id()
    today = date.today()
    active_only = request.args.get('active', 'true').lower() == 'true'
    
    don_vi_ids = [dvid] if dvid else []
    if dvid:
        children = DonVi.query.filter_by(don_vi_cha_id=dvid).all()
        don_vi_ids.extend([c.id for c in children])
    
    query = CatCom.query.join(ChienSi).filter(ChienSi.don_vi_id.in_(don_vi_ids))
    if active_only:
        query = query.filter(CatCom.ngay_bat_dau <= today, CatCom.ngay_ket_thuc >= today)
    return jsonify([cc.to_dict() for cc in query.order_by(CatCom.ngay_tao.desc()).all()])


@personnel_bp.route('/api/meal-cuts', methods=['POST'])
@login_required
def create_meal_cut():
    """Tạo báo cắt cơm"""
    data = request.json
    cc = CatCom(
        chien_si_id=data['chien_si_id'],
        ngay_bat_dau=datetime.strptime(data['ngay_bat_dau'], '%Y-%m-%d').date(),
        ngay_ket_thuc=datetime.strptime(data['ngay_ket_thuc'], '%Y-%m-%d').date(),
        ly_do=data.get('ly_do', ''),
        loai=data.get('loai', 'cat_com'),
        ghi_chu=data.get('ghi_chu'),
        nguoi_bao=data.get('nguoi_bao')
    )
    cs = ChienSi.query.get(data['chien_si_id'])
    if cs:
        if cc.ly_do == 'phep': cs.trang_thai = 'phep'
        elif cc.ly_do == 'gac': cs.trang_thai = 'gac'
        else: cs.trang_thai = 'cong_tac'
    
    db.session.add(cc)
    db.session.commit()
    return jsonify(cc.to_dict()), 201


@personnel_bp.route('/api/meal-cuts/<int:cut_id>', methods=['DELETE'])
@login_required
def delete_meal_cut(cut_id):
    """Hủy cắt cơm"""
    cc = CatCom.query.get_or_404(cut_id)
    cs = ChienSi.query.get(cc.chien_si_id)
    if cs:
        cs.trang_thai = 'tai_vi'
    db.session.delete(cc)
    db.session.commit()
    return jsonify({'message': 'Đã hủy cắt cơm'})


@personnel_bp.route('/api/personnel/birthdays')
@login_required
def get_birthdays():
    """Lấy danh sách chiến sĩ có sinh nhật trong tháng (theo đơn vị)"""
    dvid = get_user_don_vi_id()
    month = request.args.get('month', type=int, default=date.today().month)
    from sqlalchemy import extract
    
    don_vi_ids = [dvid] if dvid else []
    if dvid:
        children = DonVi.query.filter_by(don_vi_cha_id=dvid).all()
        don_vi_ids.extend([c.id for c in children])
    
    cs_list = ChienSi.query.filter(
        extract('month', ChienSi.ngay_sinh) == month,
        ChienSi.don_vi_id.in_(don_vi_ids)
    ).all()
    return jsonify([cs.to_dict() for cs in cs_list])
