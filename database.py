"""
Database models và setup cho Hệ Thống Thực Đơn Điện Tử Quân Đội
Multi-tenant: mỗi đơn vị có dữ liệu riêng biệt
"""
from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin, current_user
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, date

db = SQLAlchemy()


def get_user_don_vi_id():
    """Lấy don_vi_id của user đang đăng nhập.
    Nếu admin chưa có đơn vị, trả về None."""
    if current_user and current_user.is_authenticated:
        return current_user.don_vi_id
    return None


class NguoiDung(UserMixin, db.Model):
    """Tài khoản người dùng hệ thống"""
    __tablename__ = 'nguoi_dung'
    id = db.Column(db.Integer, primary_key=True)
    ten_dang_nhap = db.Column(db.String(80), unique=True, nullable=False)
    ho_ten = db.Column(db.String(150), nullable=False)
    email = db.Column(db.String(150))
    mat_khau_hash = db.Column(db.String(256), nullable=False)
    vai_tro = db.Column(db.String(20), default='chien_si')  # admin, chien_si
    don_vi_id = db.Column(db.Integer, db.ForeignKey('don_vi.id'), nullable=True)
    chien_si_id = db.Column(db.Integer, db.ForeignKey('chien_si.id'), nullable=True)
    ngay_tao = db.Column(db.DateTime, default=datetime.utcnow)
    kich_hoat = db.Column(db.Boolean, default=True)

    def set_password(self, password):
        self.mat_khau_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.mat_khau_hash, password)

    @property
    def is_admin(self):
        return self.vai_tro == 'admin'

    def to_dict(self):
        return {
            'id': self.id,
            'ten_dang_nhap': self.ten_dang_nhap,
            'ho_ten': self.ho_ten,
            'email': self.email,
            'vai_tro': self.vai_tro,
            'don_vi_id': self.don_vi_id,
            'chien_si_id': self.chien_si_id,
            'ngay_tao': self.ngay_tao.isoformat()
        }


class DonVi(db.Model):
    """Đơn vị quân đội (tiểu đội, trung đội, đại đội...)"""
    __tablename__ = 'don_vi'
    id = db.Column(db.Integer, primary_key=True)
    ten = db.Column(db.String(100), nullable=False)
    cap_do = db.Column(db.String(50))  # tieu_doi, trung_doi, dai_doi
    don_vi_cha_id = db.Column(db.Integer, db.ForeignKey('don_vi.id'), nullable=True)
    
    don_vi_cha = db.relationship('DonVi', remote_side=[id], backref='don_vi_con')
    chien_si_list = db.relationship('ChienSi', backref='don_vi', lazy=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'ten': self.ten,
            'cap_do': self.cap_do,
            'don_vi_cha_id': self.don_vi_cha_id,
            'so_quan_so': len(self.chien_si_list)
        }


class ChienSi(db.Model):
    """Quân nhân trong đơn vị"""
    __tablename__ = 'chien_si'
    id = db.Column(db.Integer, primary_key=True)
    ho_ten = db.Column(db.String(100), nullable=False)
    cap_bac = db.Column(db.String(50))  # binh_nhi, binh_nhat, ha_si...
    chuc_vu = db.Column(db.String(100))
    que_quan = db.Column(db.String(200))
    vung_mien = db.Column(db.String(50))  # bac, trung, nam
    ngay_sinh = db.Column(db.Date)
    don_vi_id = db.Column(db.Integer, db.ForeignKey('don_vi.id'), nullable=False)
    trang_thai = db.Column(db.String(50), default='tai_vi')  # tai_vi, cong_tac, phep, gac

    def to_dict(self):
        return {
            'id': self.id,
            'ho_ten': self.ho_ten,
            'cap_bac': self.cap_bac,
            'chuc_vu': self.chuc_vu,
            'que_quan': self.que_quan,
            'vung_mien': self.vung_mien,
            'ngay_sinh': self.ngay_sinh.isoformat() if self.ngay_sinh else None,
            'don_vi_id': self.don_vi_id,
            'don_vi_ten': self.don_vi.ten if self.don_vi else None,
            'trang_thai': self.trang_thai
        }


class MonAn(db.Model):
    """Món ăn với thông tin dinh dưỡng"""
    __tablename__ = 'mon_an'
    id = db.Column(db.Integer, primary_key=True)
    ten = db.Column(db.String(200), nullable=False)
    don_vi_id = db.Column(db.Integer, db.ForeignKey('don_vi.id'), nullable=True)
    mo_ta = db.Column(db.Text)
    hinh_anh = db.Column(db.String(500))  # URL hoặc path ảnh
    loai = db.Column(db.String(50))  # mon_chinh, mon_phu, canh, trang_mieng, do_uong
    vung_mien = db.Column(db.String(50))  # bac, trung, nam, chung
    # Dinh dưỡng per khẩu phần
    calo = db.Column(db.Float, default=0)
    protein = db.Column(db.Float, default=0)  # gram
    fat = db.Column(db.Float, default=0)  # gram
    carbs = db.Column(db.Float, default=0)  # gram
    vitamin_a = db.Column(db.Float, default=0)  # mcg
    vitamin_c = db.Column(db.Float, default=0)  # mg
    canxi = db.Column(db.Float, default=0)  # mg
    sat = db.Column(db.Float, default=0)  # mg

    def to_dict(self):
        return {
            'id': self.id,
            'ten': self.ten,
            'mo_ta': self.mo_ta,
            'hinh_anh': self.hinh_anh,
            'loai': self.loai,
            'vung_mien': self.vung_mien,
            'calo': self.calo,
            'protein': self.protein,
            'fat': self.fat,
            'carbs': self.carbs,
            'vitamin_a': self.vitamin_a,
            'vitamin_c': self.vitamin_c,
            'canxi': self.canxi,
            'sat': self.sat
        }


# Bảng trung gian: thực đơn - món ăn
thuc_don_mon_an = db.Table('thuc_don_mon_an',
    db.Column('thuc_don_id', db.Integer, db.ForeignKey('thuc_don.id'), primary_key=True),
    db.Column('mon_an_id', db.Integer, db.ForeignKey('mon_an.id'), primary_key=True)
)


class ThucDon(db.Model):
    """Thực đơn cho một bữa ăn trong ngày"""
    __tablename__ = 'thuc_don'
    id = db.Column(db.Integer, primary_key=True)
    ngay = db.Column(db.Date, nullable=False)
    bua = db.Column(db.String(20), nullable=False)  # sang, trua, toi
    don_vi_id = db.Column(db.Integer, db.ForeignKey('don_vi.id'), nullable=True)
    ghi_chu = db.Column(db.Text)
    
    mon_an_list = db.relationship('MonAn', secondary=thuc_don_mon_an, 
                                   backref=db.backref('thuc_don_list', lazy=True))

    def to_dict(self):
        return {
            'id': self.id,
            'ngay': self.ngay.isoformat(),
            'bua': self.bua,
            'ghi_chu': self.ghi_chu,
            'mon_an': [m.to_dict() for m in self.mon_an_list],
            'tong_calo': sum(m.calo for m in self.mon_an_list),
            'tong_protein': sum(m.protein for m in self.mon_an_list),
            'tong_fat': sum(m.fat for m in self.mon_an_list),
            'tong_carbs': sum(m.carbs for m in self.mon_an_list)
        }


class DanhGia(db.Model):
    """Đánh giá và góp ý bữa ăn"""
    __tablename__ = 'danh_gia'
    id = db.Column(db.Integer, primary_key=True)
    thuc_don_id = db.Column(db.Integer, db.ForeignKey('thuc_don.id'), nullable=False)
    don_vi_id = db.Column(db.Integer, db.ForeignKey('don_vi.id'), nullable=True)
    chien_si_id = db.Column(db.Integer, db.ForeignKey('chien_si.id'), nullable=True)  # null = ẩn danh
    so_sao = db.Column(db.Integer, nullable=False)  # 1-5
    binh_luan = db.Column(db.Text)
    hinh_anh = db.Column(db.String(500))  # đường dẫn ảnh đính kèm
    an_danh = db.Column(db.Boolean, default=False)
    ngay_tao = db.Column(db.DateTime, default=datetime.utcnow)
    
    thuc_don = db.relationship('ThucDon', backref='danh_gia_list')
    chien_si = db.relationship('ChienSi', backref='danh_gia_list')

    def to_dict(self):
        return {
            'id': self.id,
            'thuc_don_id': self.thuc_don_id,
            'chien_si_id': self.chien_si_id,
            'chien_si_ten': self.chien_si.ho_ten if self.chien_si and not self.an_danh else 'Ẩn danh',
            'so_sao': self.so_sao,
            'binh_luan': self.binh_luan,
            'hinh_anh': self.hinh_anh,
            'an_danh': self.an_danh,
            'ngay_tao': self.ngay_tao.isoformat()
        }


class GopY(db.Model):
    """Hòm thư góp ý số"""
    __tablename__ = 'gop_y'
    id = db.Column(db.Integer, primary_key=True)
    chien_si_id = db.Column(db.Integer, db.ForeignKey('chien_si.id'), nullable=True)
    don_vi_id = db.Column(db.Integer, db.ForeignKey('don_vi.id'), nullable=True)
    noi_dung = db.Column(db.Text, nullable=False)
    hinh_anh = db.Column(db.String(500))  # ảnh đính kèm
    an_danh = db.Column(db.Boolean, default=True)
    da_doc = db.Column(db.Boolean, default=False)
    phan_hoi = db.Column(db.Text)  # phản hồi từ hậu cần
    ngay_tao = db.Column(db.DateTime, default=datetime.utcnow)
    ngay_phan_hoi = db.Column(db.DateTime)

    chien_si = db.relationship('ChienSi', backref='gop_y_list')

    def to_dict(self):
        return {
            'id': self.id,
            'chien_si_id': self.chien_si_id,
            'chien_si_ten': self.chien_si.ho_ten if self.chien_si and not self.an_danh else 'Ẩn danh',
            'noi_dung': self.noi_dung,
            'hinh_anh': self.hinh_anh,
            'an_danh': self.an_danh,
            'da_doc': self.da_doc,
            'phan_hoi': self.phan_hoi,
            'ngay_tao': self.ngay_tao.isoformat(),
            'ngay_phan_hoi': self.ngay_phan_hoi.isoformat() if self.ngay_phan_hoi else None
        }


class BinhChon(db.Model):
    """Bình chọn món ăn cuối tuần"""
    __tablename__ = 'binh_chon'
    id = db.Column(db.Integer, primary_key=True)
    chien_si_id = db.Column(db.Integer, db.ForeignKey('chien_si.id'), nullable=False)
    mon_an_id = db.Column(db.Integer, db.ForeignKey('mon_an.id'), nullable=False)
    tuan = db.Column(db.String(20))  # VD: "2026-W12"
    ngay_tao = db.Column(db.DateTime, default=datetime.utcnow)
    
    chien_si = db.relationship('ChienSi', backref='binh_chon_list')
    mon_an = db.relationship('MonAn', backref='binh_chon_list')

    def to_dict(self):
        return {
            'id': self.id,
            'chien_si_id': self.chien_si_id,
            'chien_si_ten': self.chien_si.ho_ten if self.chien_si else None,
            'mon_an_id': self.mon_an_id,
            'mon_an_ten': self.mon_an.ten if self.mon_an else None,
            'tuan': self.tuan,
            'ngay_tao': self.ngay_tao.isoformat()
        }


class CatCom(db.Model):
    """Báo cắt cơm / nhận cơm hộp"""
    __tablename__ = 'cat_com'
    id = db.Column(db.Integer, primary_key=True)
    chien_si_id = db.Column(db.Integer, db.ForeignKey('chien_si.id'), nullable=False)
    ngay_bat_dau = db.Column(db.Date, nullable=False)
    ngay_ket_thuc = db.Column(db.Date, nullable=False)
    ly_do = db.Column(db.String(200))  # cong_tac, gac, phep, nhiem_vu
    loai = db.Column(db.String(50))  # cat_com, com_hop
    ghi_chu = db.Column(db.Text)
    nguoi_bao = db.Column(db.String(100))  # tiểu đội trưởng báo
    ngay_tao = db.Column(db.DateTime, default=datetime.utcnow)
    
    chien_si = db.relationship('ChienSi', backref='cat_com_list')

    def to_dict(self):
        return {
            'id': self.id,
            'chien_si_id': self.chien_si_id,
            'chien_si_ten': self.chien_si.ho_ten if self.chien_si else None,
            'don_vi_ten': self.chien_si.don_vi.ten if self.chien_si and self.chien_si.don_vi else None,
            'ngay_bat_dau': self.ngay_bat_dau.isoformat(),
            'ngay_ket_thuc': self.ngay_ket_thuc.isoformat(),
            'ly_do': self.ly_do,
            'loai': self.loai,
            'ghi_chu': self.ghi_chu,
            'nguoi_bao': self.nguoi_bao,
            'ngay_tao': self.ngay_tao.isoformat()
        }


class ThucPhamThua(db.Model):
    """Theo dõi thực phẩm thừa"""
    __tablename__ = 'thuc_pham_thua'
    id = db.Column(db.Integer, primary_key=True)
    mon_an_id = db.Column(db.Integer, db.ForeignKey('mon_an.id'), nullable=False)
    don_vi_id = db.Column(db.Integer, db.ForeignKey('don_vi.id'), nullable=True)
    ngay = db.Column(db.Date, nullable=False)
    luong_thua_kg = db.Column(db.Float, nullable=False)
    ghi_chu = db.Column(db.Text)
    ngay_tao = db.Column(db.DateTime, default=datetime.utcnow)
    
    mon_an = db.relationship('MonAn', backref='thuc_pham_thua_list')

    def to_dict(self):
        return {
            'id': self.id,
            'mon_an_id': self.mon_an_id,
            'mon_an_ten': self.mon_an.ten if self.mon_an else None,
            'ngay': self.ngay.isoformat(),
            'luong_thua_kg': self.luong_thua_kg,
            'ghi_chu': self.ghi_chu
        }


class ThiDua(db.Model):
    """Bảng thi đua nhà ăn"""
    __tablename__ = 'thi_dua'
    id = db.Column(db.Integer, primary_key=True)
    don_vi_id = db.Column(db.Integer, db.ForeignKey('don_vi.id'), nullable=False)
    ngay = db.Column(db.Date, nullable=False)
    diem_dung_gio = db.Column(db.Float, default=0)  # 0-10
    diem_ve_sinh = db.Column(db.Float, default=0)   # 0-10
    diem_tiet_kiem = db.Column(db.Float, default=0)  # 0-10
    ghi_chu = db.Column(db.Text)
    
    don_vi = db.relationship('DonVi', backref='thi_dua_list')

    @property
    def tong_diem(self):
        return round(self.diem_dung_gio + self.diem_ve_sinh + self.diem_tiet_kiem, 1)

    def to_dict(self):
        return {
            'id': self.id,
            'don_vi_id': self.don_vi_id,
            'don_vi_ten': self.don_vi.ten if self.don_vi else None,
            'ngay': self.ngay.isoformat(),
            'diem_dung_gio': self.diem_dung_gio,
            'diem_ve_sinh': self.diem_ve_sinh,
            'diem_tiet_kiem': self.diem_tiet_kiem,
            'tong_diem': self.tong_diem,
            'ghi_chu': self.ghi_chu
        }


class ThongBaoHauCan(db.Model):
    """Thông báo từ trợ lý hậu cần"""
    __tablename__ = 'thong_bao_hau_can'
    id = db.Column(db.Integer, primary_key=True)
    tieu_de = db.Column(db.String(300), nullable=False)
    don_vi_id = db.Column(db.Integer, db.ForeignKey('don_vi.id'), nullable=True)
    noi_dung = db.Column(db.Text, nullable=False)
    loai = db.Column(db.String(50), default='thong_bao')  # thong_bao, phan_hoi, canh_bao
    gop_y_id = db.Column(db.Integer, db.ForeignKey('gop_y.id'), nullable=True)
    ghim = db.Column(db.Boolean, default=False)
    ngay_tao = db.Column(db.DateTime, default=datetime.utcnow)
    
    gop_y = db.relationship('GopY', backref='thong_bao_list')

    def to_dict(self):
        return {
            'id': self.id,
            'tieu_de': self.tieu_de,
            'noi_dung': self.noi_dung,
            'loai': self.loai,
            'gop_y_id': self.gop_y_id,
            'ghim': self.ghim,
            'ngay_tao': self.ngay_tao.isoformat()
        }


class HuongViQueNha(db.Model):
    """Món đặc sản hương vị quê nhà"""
    __tablename__ = 'huong_vi_que_nha'
    id = db.Column(db.Integer, primary_key=True)
    mon_an_id = db.Column(db.Integer, db.ForeignKey('mon_an.id'), nullable=False)
    don_vi_id = db.Column(db.Integer, db.ForeignKey('don_vi.id'), nullable=True)
    thang = db.Column(db.Integer, nullable=False)  # 1-12
    nam = db.Column(db.Integer, nullable=False)
    mo_ta = db.Column(db.Text)  # câu chuyện về món ăn
    
    mon_an = db.relationship('MonAn', backref='huong_vi_list')

    def to_dict(self):
        return {
            'id': self.id,
            'mon_an_id': self.mon_an_id,
            'mon_an': self.mon_an.to_dict() if self.mon_an else None,
            'thang': self.thang,
            'nam': self.nam,
            'mo_ta': self.mo_ta
        }
