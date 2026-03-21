"""
Routes cho thực đơn và dinh dưỡng — Multi-tenant
"""
from flask import Blueprint, jsonify, request
from flask_login import current_user, login_required
from database import db, ThucDon, MonAn, get_user_don_vi_id
from datetime import date, datetime, timedelta

menu_bp = Blueprint('menu', __name__)


@menu_bp.route('/api/menu/today')
@login_required
def get_today_menu():
    """Lấy thực đơn hôm nay (theo đơn vị)"""
    today = date.today()
    dvid = get_user_don_vi_id()
    menus = ThucDon.query.filter_by(ngay=today, don_vi_id=dvid).all()
    result = {}
    for m in menus:
        result[m.bua] = m.to_dict()
    return jsonify(result)


@menu_bp.route('/api/menu/week')
@login_required
def get_week_menu():
    """Lấy thực đơn cả tuần (theo đơn vị)"""
    today = date.today()
    dvid = get_user_don_vi_id()
    start = today - timedelta(days=today.weekday())
    end = start + timedelta(days=6)
    menus = ThucDon.query.filter(
        ThucDon.ngay >= start, ThucDon.ngay <= end,
        ThucDon.don_vi_id == dvid
    ).order_by(ThucDon.ngay).all()
    
    result = {}
    for m in menus:
        day_str = m.ngay.isoformat()
        if day_str not in result:
            result[day_str] = {}
        result[day_str][m.bua] = m.to_dict()
    return jsonify(result)


@menu_bp.route('/api/menu/date/<date_str>')
@login_required
def get_menu_by_date(date_str):
    """Lấy thực đơn theo ngày (theo đơn vị)"""
    try:
        d = datetime.strptime(date_str, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'error': 'Invalid date format'}), 400
    
    dvid = get_user_don_vi_id()
    menus = ThucDon.query.filter_by(ngay=d, don_vi_id=dvid).all()
    result = {}
    for m in menus:
        result[m.bua] = m.to_dict()
    return jsonify(result)


@menu_bp.route('/api/menu', methods=['POST'])
@login_required
def create_menu():
    """Tạo thực đơn mới (gán đơn vị)"""
    data = request.json
    dvid = get_user_don_vi_id()
    td = ThucDon(
        ngay=datetime.strptime(data['ngay'], '%Y-%m-%d').date(),
        bua=data['bua'],
        don_vi_id=dvid,
        ghi_chu=data.get('ghi_chu')
    )
    if 'mon_an_ids' in data:
        mon_list = MonAn.query.filter(MonAn.id.in_(data['mon_an_ids']), MonAn.don_vi_id == dvid).all()
        td.mon_an_list = mon_list
    db.session.add(td)
    db.session.commit()
    return jsonify(td.to_dict()), 201


@menu_bp.route('/api/dishes')
@login_required
def get_all_dishes():
    """Lấy danh sách món ăn (theo đơn vị)"""
    dvid = get_user_don_vi_id()
    loai = request.args.get('loai')
    query = MonAn.query.filter_by(don_vi_id=dvid)
    if loai:
        query = query.filter_by(loai=loai)
    return jsonify([m.to_dict() for m in query.all()])


@menu_bp.route('/api/dishes/<int:dish_id>')
@login_required
def get_dish(dish_id):
    """Lấy chi tiết món ăn"""
    dish = MonAn.query.get_or_404(dish_id)
    return jsonify(dish.to_dict())


@menu_bp.route('/api/nutrition/daily/<date_str>')
@login_required
def get_daily_nutrition(date_str):
    """Lấy tổng dinh dưỡng theo ngày (theo đơn vị)"""
    try:
        d = datetime.strptime(date_str, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'error': 'Invalid date format'}), 400
    
    dvid = get_user_don_vi_id()
    menus = ThucDon.query.filter_by(ngay=d, don_vi_id=dvid).all()
    total = {'calo': 0, 'protein': 0, 'fat': 0, 'carbs': 0, 'vitamin_a': 0, 'vitamin_c': 0, 'canxi': 0, 'sat': 0}
    by_meal = {}
    
    for m in menus:
        meal_total = {'calo': 0, 'protein': 0, 'fat': 0, 'carbs': 0}
        for mon in m.mon_an_list:
            for key in total:
                total[key] += getattr(mon, key, 0)
            for key in meal_total:
                meal_total[key] += getattr(mon, key, 0)
        by_meal[m.bua] = meal_total
    
    return jsonify({
        'ngay': d.isoformat(),
        'tong': {k: round(v, 1) for k, v in total.items()},
        'theo_bua': by_meal
    })
