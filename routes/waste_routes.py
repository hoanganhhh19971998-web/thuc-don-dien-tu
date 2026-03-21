"""
Routes cho theo dõi thực phẩm thừa — Multi-tenant
"""
from flask import Blueprint, jsonify, request
from flask_login import login_required
from database import db, ThucPhamThua, MonAn, get_user_don_vi_id
from datetime import date, datetime, timedelta
from sqlalchemy import func

waste_bp = Blueprint('waste', __name__)


@waste_bp.route('/api/waste')
@login_required
def get_waste():
    """Lấy danh sách thực phẩm thừa (theo đơn vị)"""
    dvid = get_user_don_vi_id()
    days = request.args.get('days', 7, type=int)
    start_date = date.today() - timedelta(days=days)
    records = ThucPhamThua.query.filter(
        ThucPhamThua.ngay >= start_date,
        ThucPhamThua.don_vi_id == dvid
    ).order_by(ThucPhamThua.ngay.desc()).all()
    return jsonify([r.to_dict() for r in records])


@waste_bp.route('/api/waste', methods=['POST'])
@login_required
def create_waste_record():
    """Tạo bản ghi thực phẩm thừa (gán đơn vị)"""
    dvid = get_user_don_vi_id()
    data = request.json
    tpt = ThucPhamThua(
        mon_an_id=data['mon_an_id'],
        don_vi_id=dvid,
        ngay=datetime.strptime(data['ngay'], '%Y-%m-%d').date() if 'ngay' in data else date.today(),
        luong_thua_kg=data['luong_thua_kg'],
        ghi_chu=data.get('ghi_chu')
    )
    db.session.add(tpt)
    db.session.commit()
    return jsonify(tpt.to_dict()), 201


@waste_bp.route('/api/waste/stats')
@login_required
def get_waste_stats():
    """Thống kê thực phẩm thừa (theo đơn vị)"""
    dvid = get_user_don_vi_id()
    days = request.args.get('days', 30, type=int)
    start_date = date.today() - timedelta(days=days)
    
    stats = db.session.query(
        MonAn.id, MonAn.ten,
        func.count(ThucPhamThua.id).label('so_lan'),
        func.sum(ThucPhamThua.luong_thua_kg).label('tong_kg'),
        func.avg(ThucPhamThua.luong_thua_kg).label('tb_kg')
    ).join(ThucPhamThua, ThucPhamThua.mon_an_id == MonAn.id)\
     .filter(ThucPhamThua.ngay >= start_date, ThucPhamThua.don_vi_id == dvid)\
     .group_by(MonAn.id)\
     .order_by(func.sum(ThucPhamThua.luong_thua_kg).desc())\
     .all()
    
    result = []
    for s in stats:
        canh_bao = 'cao' if s.tong_kg > 10 else ('trung_binh' if s.tong_kg > 5 else 'thap')
        result.append({
            'mon_an_id': s.id, 'ten_mon': s.ten,
            'so_lan_du': s.so_lan,
            'tong_kg': round(float(s.tong_kg), 1),
            'trung_binh_kg': round(float(s.tb_kg), 1),
            'muc_canh_bao': canh_bao
        })
    
    tong_thua = sum(s.tong_kg for s in stats) if stats else 0
    return jsonify({
        'thoi_gian': f'{days} ngày gần nhất',
        'tong_luong_thua_kg': round(float(tong_thua), 1),
        'chi_tiet': result
    })


@waste_bp.route('/api/waste/daily')
@login_required
def get_daily_waste():
    """Lấy thực phẩm thừa theo ngày (theo đơn vị)"""
    dvid = get_user_don_vi_id()
    days = request.args.get('days', 14, type=int)
    start_date = date.today() - timedelta(days=days)
    
    records = db.session.query(
        ThucPhamThua.ngay,
        func.sum(ThucPhamThua.luong_thua_kg).label('tong_kg')
    ).filter(ThucPhamThua.ngay >= start_date, ThucPhamThua.don_vi_id == dvid)\
     .group_by(ThucPhamThua.ngay)\
     .order_by(ThucPhamThua.ngay)\
     .all()
    
    return jsonify([{
        'ngay': r.ngay.isoformat(),
        'tong_kg': round(float(r.tong_kg), 1)
    } for r in records])
