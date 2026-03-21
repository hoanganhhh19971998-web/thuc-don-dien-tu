"""
Routes cho dashboard hậu cần — Multi-tenant
"""
from flask import Blueprint, jsonify, request
from flask_login import current_user, login_required
from database import db, ThongBaoHauCan, GopY, DanhGia, ThucPhamThua, ChienSi, CatCom, HuongViQueNha, MonAn, get_user_don_vi_id
from datetime import date, datetime, timedelta
from sqlalchemy import func, extract

logistics_bp = Blueprint('logistics', __name__)


@logistics_bp.route('/api/logistics/dashboard')
@login_required
def get_dashboard():
    """Tổng hợp dashboard hậu cần (theo đơn vị)"""
    today = date.today()
    dvid = get_user_don_vi_id()
    
    # Thống kê đánh giá (theo đơn vị)
    rating_stats = db.session.query(
        func.avg(DanhGia.so_sao).label('tb'),
        func.count(DanhGia.id).label('tong')
    ).filter(DanhGia.don_vi_id == dvid).first()
    
    # Góp ý chưa đọc (theo đơn vị)
    gop_y_chua_doc = GopY.query.filter_by(da_doc=False, don_vi_id=dvid).count()
    
    # Thực phẩm thừa tuần này (theo đơn vị)
    start_week = today - timedelta(days=today.weekday())
    thua_tuan = db.session.query(
        func.sum(ThucPhamThua.luong_thua_kg)
    ).filter(ThucPhamThua.ngay >= start_week, ThucPhamThua.don_vi_id == dvid).scalar() or 0
    
    # Thực đơn hôm nay (theo đơn vị)
    from database import ThucDon
    so_bua_hom_nay = ThucDon.query.filter_by(ngay=today, don_vi_id=dvid).count()
    
    return jsonify({
        'danh_gia_trung_binh': round(float(rating_stats.tb or 0), 1),
        'tong_danh_gia': rating_stats.tong or 0,
        'gop_y_chua_doc': gop_y_chua_doc,
        'so_bua_hom_nay': so_bua_hom_nay,
        'thuc_pham_thua_tuan_kg': round(float(thua_tuan), 1)
    })


@logistics_bp.route('/api/logistics/announcements')
@login_required
def get_announcements():
    """Lấy danh sách thông báo hậu cần (theo đơn vị)"""
    dvid = get_user_don_vi_id()
    announcements = ThongBaoHauCan.query.filter_by(don_vi_id=dvid).order_by(
        ThongBaoHauCan.ghim.desc(),
        ThongBaoHauCan.ngay_tao.desc()
    ).all()
    return jsonify([a.to_dict() for a in announcements])


@logistics_bp.route('/api/logistics/announcements', methods=['POST'])
@login_required
def create_announcement():
    """Tạo thông báo hậu cần (gán đơn vị)"""
    dvid = get_user_don_vi_id()
    data = request.json
    tb = ThongBaoHauCan(
        tieu_de=data['tieu_de'],
        noi_dung=data['noi_dung'],
        don_vi_id=dvid,
        loai=data.get('loai', 'thong_bao'),
        gop_y_id=data.get('gop_y_id'),
        ghim=data.get('ghim', False)
    )
    db.session.add(tb)
    db.session.commit()
    return jsonify(tb.to_dict()), 201


@logistics_bp.route('/api/logistics/satisfaction-report')
@login_required
def get_satisfaction_report():
    """Báo cáo hài lòng theo tháng (theo đơn vị)"""
    dvid = get_user_don_vi_id()
    months = request.args.get('months', 3, type=int)
    
    result = []
    for i in range(months):
        d = date.today().replace(day=1) - timedelta(days=30 * i)
        month_start = d.replace(day=1)
        if d.month == 12:
            month_end = d.replace(year=d.year + 1, month=1, day=1) - timedelta(days=1)
        else:
            month_end = d.replace(month=d.month + 1, day=1) - timedelta(days=1)
        
        stats = db.session.query(
            func.avg(DanhGia.so_sao).label('tb'),
            func.count(DanhGia.id).label('tong'),
            func.sum(db.case((DanhGia.so_sao >= 4, 1), else_=0)).label('tot'),
            func.sum(db.case((DanhGia.so_sao <= 2, 1), else_=0)).label('kem')
        ).filter(
            DanhGia.don_vi_id == dvid,
            DanhGia.ngay_tao >= datetime.combine(month_start, datetime.min.time()),
            DanhGia.ngay_tao <= datetime.combine(month_end, datetime.max.time())
        ).first()
        
        result.append({
            'thang': f"{d.year}-{d.month:02d}",
            'trung_binh': round(float(stats.tb or 0), 1),
            'tong_danh_gia': stats.tong or 0,
            'danh_gia_tot': stats.tot or 0,
            'danh_gia_kem': stats.kem or 0
        })
    
    return jsonify(result)


@logistics_bp.route('/api/hometown-flavor')
@login_required
def get_hometown_flavor():
    """Lấy thông tin hương vị quê nhà tháng này (theo đơn vị)"""
    dvid = get_user_don_vi_id()
    today = date.today()
    hvqn = HuongViQueNha.query.filter_by(thang=today.month, nam=today.year, don_vi_id=dvid).first()
    
    # Chiến sĩ sinh nhật tháng này (trong đơn vị)
    birthday_soldiers = ChienSi.query.filter(
        extract('month', ChienSi.ngay_sinh) == today.month,
        ChienSi.don_vi_id.in_(
            db.session.query(db.distinct(ChienSi.don_vi_id)).filter(
                ChienSi.don_vi_id == dvid
            ) if dvid else []
        )
    ).all() if dvid else []
    
    # Phân bố vùng miền
    vung_mien_count = {}
    for cs in birthday_soldiers:
        vm = cs.vung_mien or 'chung'
        vung_mien_count[vm] = vung_mien_count.get(vm, 0) + 1
    
    return jsonify({
        'huong_vi': hvqn.to_dict() if hvqn else None,
        'chien_si_sinh_nhat': [cs.to_dict() for cs in birthday_soldiers],
        'so_sinh_nhat': len(birthday_soldiers),
        'phan_bo_vung_mien': vung_mien_count
    })
