"""
Routes cho bảng thi đua — Multi-tenant
"""
from flask import Blueprint, jsonify, request
from flask_login import login_required
from database import db, ThiDua, DonVi, get_user_don_vi_id
from datetime import date, datetime, timedelta
from sqlalchemy import func

competition_bp = Blueprint('competition', __name__)


@competition_bp.route('/api/competition/ranking')
@login_required
def get_ranking():
    """Xếp hạng thi đua (các đơn vị con trong cùng đơn vị gốc)"""
    dvid = get_user_don_vi_id()
    days = request.args.get('days', 30, type=int)
    start_date = date.today() - timedelta(days=days)
    
    # Lấy đơn vị con của đơn vị hiện tại
    don_vi_ids = [dvid] if dvid else []
    if dvid:
        children = DonVi.query.filter_by(don_vi_cha_id=dvid).all()
        don_vi_ids.extend([c.id for c in children])
    
    rankings = db.session.query(
        DonVi.id, DonVi.ten,
        func.avg(ThiDua.diem_dung_gio).label('tb_dung_gio'),
        func.avg(ThiDua.diem_ve_sinh).label('tb_ve_sinh'),
        func.avg(ThiDua.diem_tiet_kiem).label('tb_tiet_kiem'),
        func.count(ThiDua.id).label('so_ngay')
    ).join(ThiDua, ThiDua.don_vi_id == DonVi.id)\
     .filter(ThiDua.ngay >= start_date, DonVi.id.in_(don_vi_ids))\
     .group_by(DonVi.id).all()
    
    result = []
    for r in rankings:
        tong = float(r.tb_dung_gio or 0) + float(r.tb_ve_sinh or 0) + float(r.tb_tiet_kiem or 0)
        result.append({
            'don_vi_id': r.id, 'ten_don_vi': r.ten,
            'diem_dung_gio': round(float(r.tb_dung_gio or 0), 1),
            'diem_ve_sinh': round(float(r.tb_ve_sinh or 0), 1),
            'diem_tiet_kiem': round(float(r.tb_tiet_kiem or 0), 1),
            'tong_diem': round(tong, 1), 'so_ngay': r.so_ngay
        })
    
    result.sort(key=lambda x: x['tong_diem'], reverse=True)
    for i, r in enumerate(result):
        r['hang'] = i + 1
    return jsonify(result)


@competition_bp.route('/api/competition/daily')
@login_required
def get_daily_scores():
    """Lấy điểm thi đua theo ngày (theo đơn vị)"""
    dvid = get_user_don_vi_id()
    days = request.args.get('days', 7, type=int)
    start_date = date.today() - timedelta(days=days)
    
    don_vi_ids = [dvid] if dvid else []
    if dvid:
        children = DonVi.query.filter_by(don_vi_cha_id=dvid).all()
        don_vi_ids.extend([c.id for c in children])
    
    records = ThiDua.query.filter(
        ThiDua.ngay >= start_date, ThiDua.don_vi_id.in_(don_vi_ids)
    ).order_by(ThiDua.ngay).all()
    return jsonify([r.to_dict() for r in records])


@competition_bp.route('/api/competition', methods=['POST'])
@login_required
def create_score():
    """Nhập điểm thi đua"""
    data = request.json
    td = ThiDua(
        don_vi_id=data['don_vi_id'],
        ngay=datetime.strptime(data['ngay'], '%Y-%m-%d').date() if 'ngay' in data else date.today(),
        diem_dung_gio=data.get('diem_dung_gio', 0),
        diem_ve_sinh=data.get('diem_ve_sinh', 0),
        diem_tiet_kiem=data.get('diem_tiet_kiem', 0),
        ghi_chu=data.get('ghi_chu')
    )
    db.session.add(td)
    db.session.commit()
    return jsonify(td.to_dict()), 201
