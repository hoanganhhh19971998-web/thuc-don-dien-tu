"""
Routes cho bình chọn món ăn cuối tuần — Multi-tenant
"""
from flask import Blueprint, jsonify, request
from flask_login import login_required
from database import db, BinhChon, MonAn, get_user_don_vi_id
from datetime import date
from sqlalchemy import func

voting_bp = Blueprint('voting', __name__)


@voting_bp.route('/api/voting/current')
@login_required
def get_current_voting():
    """Lấy danh sách bình chọn tuần hiện tại (theo đơn vị)"""
    dvid = get_user_don_vi_id()
    today = date.today()
    iso = today.isocalendar()
    tuan_str = f"{iso[0]}-W{iso[1]:02d}"
    
    results = db.session.query(
        MonAn.id, MonAn.ten, MonAn.hinh_anh, MonAn.loai, MonAn.vung_mien,
        func.count(BinhChon.id).label('so_phieu')
    ).join(BinhChon, BinhChon.mon_an_id == MonAn.id)\
     .filter(BinhChon.tuan == tuan_str, MonAn.don_vi_id == dvid)\
     .group_by(MonAn.id)\
     .order_by(func.count(BinhChon.id).desc()).all()
    
    return jsonify({
        'tuan': tuan_str,
        'ket_qua': [{
            'mon_an_id': r.id, 'ten': r.ten, 'hinh_anh': r.hinh_anh,
            'loai': r.loai, 'vung_mien': r.vung_mien, 'so_phieu': r.so_phieu
        } for r in results],
        'tong_phieu': sum(r.so_phieu for r in results)
    })


@voting_bp.route('/api/voting/candidates')
@login_required
def get_voting_candidates():
    """Lấy danh sách món ăn ứng cử (theo đơn vị)"""
    dvid = get_user_don_vi_id()
    dishes = MonAn.query.filter(MonAn.loai == 'mon_chinh', MonAn.don_vi_id == dvid).all()
    return jsonify([d.to_dict() for d in dishes])


@voting_bp.route('/api/voting', methods=['POST'])
@login_required
def cast_vote():
    """Bình chọn món ăn"""
    data = request.json
    today = date.today()
    iso = today.isocalendar()
    tuan_str = f"{iso[0]}-W{iso[1]:02d}"
    
    existing = BinhChon.query.filter_by(
        chien_si_id=data['chien_si_id'], tuan=tuan_str
    ).first()
    
    if existing:
        existing.mon_an_id = data['mon_an_id']
        db.session.commit()
        return jsonify(existing.to_dict())
    
    bc = BinhChon(
        chien_si_id=data['chien_si_id'],
        mon_an_id=data['mon_an_id'],
        tuan=tuan_str
    )
    db.session.add(bc)
    db.session.commit()
    return jsonify(bc.to_dict()), 201
