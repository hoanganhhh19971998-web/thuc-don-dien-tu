"""
Dữ liệu mẫu cho hệ thống thực đơn điện tử quân đội
"""
from database import db, DonVi, ChienSi, MonAn, ThucDon, DanhGia, GopY, BinhChon, CatCom, ThucPhamThua, ThiDua, ThongBaoHauCan, HuongViQueNha
from datetime import date, datetime, timedelta
import random


def seed_data():
    """Tạo dữ liệu mẫu phong phú"""
    
    # === ĐƠN VỊ ===
    dai_doi = DonVi(ten='Đại đội 1', cap_do='dai_doi')
    db.session.add(dai_doi)
    db.session.flush()

    trung_doi_1 = DonVi(ten='Trung đội 1', cap_do='trung_doi', don_vi_cha_id=dai_doi.id)
    trung_doi_2 = DonVi(ten='Trung đội 2', cap_do='trung_doi', don_vi_cha_id=dai_doi.id)
    trung_doi_3 = DonVi(ten='Trung đội 3', cap_do='trung_doi', don_vi_cha_id=dai_doi.id)
    db.session.add_all([trung_doi_1, trung_doi_2, trung_doi_3])
    db.session.flush()

    tieu_doi_list = []
    for td in [trung_doi_1, trung_doi_2, trung_doi_3]:
        for i in range(1, 4):
            tdoi = DonVi(ten=f'Tiểu đội {i} - {td.ten}', cap_do='tieu_doi', don_vi_cha_id=td.id)
            tieu_doi_list.append(tdoi)
    db.session.add_all(tieu_doi_list)
    db.session.flush()

    # === CHIẾN SĨ ===
    cap_bac_list = ['Binh nhì', 'Binh nhất', 'Hạ sĩ', 'Trung sĩ', 'Thượng sĩ']
    que_quan_data = [
        ('Hà Nội', 'bac'), ('Hải Phòng', 'bac'), ('Nam Định', 'bac'),
        ('Nghệ An', 'trung'), ('Huế', 'trung'), ('Đà Nẵng', 'trung'),
        ('Quảng Nam', 'trung'), ('Bình Định', 'trung'),
        ('TP.HCM', 'nam'), ('Cần Thơ', 'nam'), ('Đồng Nai', 'nam'),
        ('Bình Dương', 'nam'), ('An Giang', 'nam'), ('Lâm Đồng', 'nam'),
        ('Thanh Hóa', 'bac'), ('Hà Tĩnh', 'trung'), ('Quảng Bình', 'trung'),
        ('Sơn La', 'bac'), ('Lào Cai', 'bac'), ('Bắc Giang', 'bac'),
    ]
    ho_list = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Vũ', 'Đặng', 'Bùi', 'Đỗ', 'Hồ']
    ten_dem = ['Văn', 'Đức', 'Minh', 'Quang', 'Hữu', 'Thanh', 'Công', 'Đình', 'Xuân', 'Trung']
    ten_list = ['Hùng', 'Mạnh', 'Dũng', 'Tuấn', 'Anh', 'Hoàng', 'Long', 'Đức', 'Phong', 'Khải',
                'Nam', 'Thắng', 'Trung', 'Hải', 'Sơn', 'Bình', 'Quốc', 'Tâm', 'Kiên', 'Hiếu']
    
    all_chien_si = []
    for idx, tdoi in enumerate(tieu_doi_list):
        so_quan = random.randint(8, 12)
        for i in range(so_quan):
            que, vung = random.choice(que_quan_data)
            cs = ChienSi(
                ho_ten=f'{random.choice(ho_list)} {random.choice(ten_dem)} {random.choice(ten_list)}',
                cap_bac=random.choice(cap_bac_list),
                chuc_vu='Tiểu đội trưởng' if i == 0 else ('Phó tiểu đội trưởng' if i == 1 else 'Chiến sĩ'),
                que_quan=que,
                vung_mien=vung,
                ngay_sinh=date(random.randint(2000, 2005), random.randint(1, 12), random.randint(1, 28)),
                don_vi_id=tdoi.id,
                trang_thai='tai_vi'
            )
            all_chien_si.append(cs)
    db.session.add_all(all_chien_si)
    db.session.flush()

    # === MÓN ĂN ===
    mon_an_data = [
        # Món chính
        ('Thịt lợn kho tàu', 'Thịt ba chỉ kho với nước dừa và trứng cút', 'mon_chinh', 'nam', 350, 25, 22, 10, 0, 0, 15, 2.5),
        ('Cá kho tộ', 'Cá basa kho trong tộ đất với tiêu và nước mắm', 'mon_chinh', 'nam', 280, 30, 14, 5, 50, 0, 40, 1.8),
        ('Gà rang muối', 'Gà ta rang với muối ớt, lá chanh', 'mon_chinh', 'chung', 320, 28, 18, 8, 30, 5, 12, 1.5),
        ('Thịt bò xào sả ớt', 'Bò xào với sả, ớt, hành tây', 'mon_chinh', 'trung', 300, 26, 16, 12, 20, 15, 10, 3.0),
        ('Cá rô phi chiên giòn', 'Cá rô phi tẩm bột chiên vàng', 'mon_chinh', 'bac', 310, 24, 20, 8, 40, 0, 35, 1.2),
        ('Đậu phụ sốt cà chua', 'Đậu phụ rán sốt với cà chua tươi', 'mon_chinh', 'bac', 200, 14, 10, 18, 60, 20, 150, 2.0),
        ('Thịt lợn luộc', 'Thịt lợn ba chỉ luộc chấm mắm tôm', 'mon_chinh', 'bac', 280, 22, 18, 2, 0, 0, 8, 1.0),
        ('Trứng đúc thịt', 'Trứng gà đúc với thịt lợn xay và mộc nhĩ', 'mon_chinh', 'bac', 250, 18, 16, 6, 200, 0, 50, 2.0),
        ('Sườn xào chua ngọt', 'Sườn lợn xào với dứa, cà chua, ớt chuông', 'mon_chinh', 'bac', 380, 24, 20, 22, 40, 30, 20, 1.5),
        ('Cá thu kho', 'Cá thu kho mặn đậm đà', 'mon_chinh', 'trung', 290, 28, 16, 4, 80, 0, 30, 2.2),
        
        # Canh
        ('Canh rau muống nấu tôm', 'Canh rau muống với tôm tươi', 'canh', 'bac', 80, 6, 2, 8, 300, 30, 60, 1.5),
        ('Canh chua cá lóc', 'Canh chua nấu với cá lóc, bạc hà, giá', 'canh', 'nam', 120, 15, 3, 10, 100, 25, 30, 1.0),
        ('Canh bí đao nấu xương', 'Canh bí đao nấu với xương lợn', 'canh', 'chung', 90, 8, 3, 8, 20, 10, 25, 0.5),
        ('Canh mồng tơi thịt bằm', 'Canh mồng tơi nấu với thịt lợn bằm', 'canh', 'bac', 100, 10, 4, 6, 250, 15, 80, 1.2),
        ('Canh khổ qua nhồi thịt', 'Mướp đắng nhồi thịt lợn nấu canh', 'canh', 'nam', 110, 12, 4, 8, 150, 40, 20, 1.0),
        
        # Món phụ
        ('Rau muống xào tỏi', 'Rau muống xào với tỏi phi vàng', 'mon_phu', 'chung', 60, 3, 3, 5, 350, 35, 70, 2.0),
        ('Dưa chuột muối', 'Dưa chuột ngâm muối chua ngọt', 'mon_phu', 'bac', 20, 1, 0, 4, 10, 5, 15, 0.3),
        ('Rau cải xào', 'Cải ngọt xào với tỏi', 'mon_phu', 'chung', 50, 2, 2, 5, 200, 40, 100, 1.5),
        ('Kim chi', 'Kim chi cải thảo lên men', 'mon_phu', 'chung', 35, 2, 0, 6, 100, 20, 30, 0.8),
        ('Nộm đu đủ', 'Gỏi đu đủ xanh trộn rau thơm', 'mon_phu', 'chung', 70, 2, 3, 8, 80, 50, 25, 0.5),
        
        # Tráng miệng
        ('Chè đỗ xanh', 'Chè đỗ xanh nấu nhừ với đường', 'trang_mieng', 'bac', 150, 6, 1, 28, 5, 2, 30, 1.5),
        ('Chuối', 'Chuối tiêu chín', 'trang_mieng', 'chung', 90, 1, 0, 23, 10, 9, 5, 0.3),
        ('Dưa hấu', 'Dưa hấu tươi mát', 'trang_mieng', 'chung', 60, 1, 0, 15, 30, 12, 8, 0.2),
        
        # Đặc sản vùng miền
        ('Bún chả Hà Nội', 'Bún chả nướng kiểu Hà Nội', 'mon_chinh', 'bac', 450, 30, 18, 40, 20, 10, 15, 2.0),
        ('Bún bò Huế', 'Bún bò cay nồng đặc trưng xứ Huế', 'mon_chinh', 'trung', 420, 28, 16, 38, 30, 8, 20, 2.5),
        ('Phở bò', 'Phở bò truyền thống Hà Nội', 'mon_chinh', 'bac', 400, 25, 12, 45, 10, 5, 30, 1.8),
        ('Cơm tấm sườn', 'Cơm tấm sườn nướng Sài Gòn', 'mon_chinh', 'nam', 550, 30, 22, 50, 15, 8, 20, 2.0),
        ('Bánh cuốn', 'Bánh cuốn nhân thịt chấm nước mắm', 'mon_chinh', 'bac', 300, 15, 8, 40, 25, 3, 10, 1.0),
        ('Mì Quảng', 'Mì Quảng truyền thống Đà Nẵng', 'mon_chinh', 'trung', 420, 25, 15, 45, 40, 15, 25, 2.0),
        ('Hủ tiếu Nam Vang', 'Hủ tiếu nước trong veo kiểu miền Nam', 'mon_chinh', 'nam', 380, 22, 12, 42, 15, 5, 18, 1.5),
    ]
    
    all_mon_an = []
    for data in mon_an_data:
        ma = MonAn(
            ten=data[0], mo_ta=data[1], loai=data[2], vung_mien=data[3],
            calo=data[4], protein=data[5], fat=data[6], carbs=data[7],
            vitamin_a=data[8], vitamin_c=data[9], canxi=data[10], sat=data[11],
            hinh_anh=None, don_vi_id=dai_doi.id
        )
        all_mon_an.append(ma)
    db.session.add_all(all_mon_an)
    db.session.flush()

    # === THỰC ĐƠN 7 NGÀY ===
    today = date.today()
    mon_chinh = [m for m in all_mon_an if m.loai == 'mon_chinh' and m.vung_mien != 'bac']
    mon_phu = [m for m in all_mon_an if m.loai == 'mon_phu']
    canh = [m for m in all_mon_an if m.loai == 'canh']
    trang_mieng = [m for m in all_mon_an if m.loai == 'trang_mieng']

    all_thuc_don = []
    for day_offset in range(-3, 4):  # 3 ngày trước đến 3 ngày sau
        ngay = today + timedelta(days=day_offset)
        for bua in ['sang', 'trua', 'toi']:
            td = ThucDon(ngay=ngay, bua=bua, don_vi_id=dai_doi.id)
            if bua == 'sang':
                td.mon_an_list = random.sample(all_mon_an[:10], min(2, len(all_mon_an[:10]))) + \
                                  random.sample(mon_phu, min(1, len(mon_phu)))
            elif bua == 'trua':
                td.mon_an_list = random.sample(all_mon_an[:10], min(2, len(all_mon_an[:10]))) + \
                                  random.sample(canh, min(1, len(canh))) + \
                                  random.sample(mon_phu, min(1, len(mon_phu))) + \
                                  random.sample(trang_mieng, min(1, len(trang_mieng)))
            else:
                td.mon_an_list = random.sample(all_mon_an[:10], min(2, len(all_mon_an[:10]))) + \
                                  random.sample(canh, min(1, len(canh))) + \
                                  random.sample(mon_phu, min(1, len(mon_phu)))
            all_thuc_don.append(td)
    db.session.add_all(all_thuc_don)
    db.session.flush()

    # === ĐÁNH GIÁ MẪU ===
    binh_luan_mau = [
        'Rất ngon, đậm đà vừa miệng!',
        'Hôm nay bếp nấu tốt lắm!',
        'Cơm hơi khô một chút',
        'Canh hơi mặn',
        'Thịt mềm, vừa ăn',
        'Lượng cơm vừa đủ',
        'Rau hơi già, cần chọn kỹ hơn',
        'Món này rất phù hợp khẩu vị',
        'Nên thêm gia vị một chút',
        'Tuyệt vời! Đề nghị nấu lại tuần sau',
    ]
    
    danh_gia_list = []
    for td in all_thuc_don[:15]:  # đánh giá 15 bữa đầu
        so_danh_gia = random.randint(5, 15)
        for _ in range(so_danh_gia):
            cs = random.choice(all_chien_si)
            dg = DanhGia(
                thuc_don_id=td.id,
                don_vi_id=dai_doi.id,
                chien_si_id=cs.id if random.random() > 0.3 else None,
                so_sao=random.randint(2, 5),
                binh_luan=random.choice(binh_luan_mau) if random.random() > 0.4 else None,
                an_danh=random.random() > 0.6,
                ngay_tao=datetime.combine(td.ngay, datetime.min.time()) + timedelta(hours=random.randint(6, 20))
            )
            danh_gia_list.append(dg)
    db.session.add_all(danh_gia_list)

    # === GÓP Ý MẪU ===
    gop_y_data = [
        ('Canh hôm qua hơi mặn, mong bếp điều chỉnh lại ạ', True),
        ('Cơm bữa trưa hôm nay bị khô quá', True),
        ('Đề xuất thêm món rau xào vào bữa tối', False),
        ('Thịt kho hôm nay rất ngon, cảm ơn bếp ạ!', False),
        ('Nên có thêm trái cây tráng miệng vào bữa trưa', True),
        ('Mong bếp nấu phở vào cuối tuần', True),
    ]
    
    gop_y_list = []
    for noi_dung, an_danh in gop_y_data:
        cs = random.choice(all_chien_si)
        gy = GopY(
            chien_si_id=cs.id if not an_danh else None,
            don_vi_id=dai_doi.id,
            noi_dung=noi_dung,
            an_danh=an_danh,
            da_doc=random.random() > 0.5,
            ngay_tao=datetime.now() - timedelta(days=random.randint(0, 7))
        )
        gop_y_list.append(gy)
    db.session.add_all(gop_y_list)
    db.session.flush()

    # Phản hồi mẫu cho góp ý
    if gop_y_list:
        gop_y_list[0].phan_hoi = 'Ghi nhận ý kiến, bếp sẽ điều chỉnh lượng muối. Cảm ơn đồng chí!'
        gop_y_list[0].da_doc = True
        gop_y_list[0].ngay_phan_hoi = datetime.now() - timedelta(days=1)

    # === BÌNH CHỌN MẪU ===
    mon_dac_san = [m for m in all_mon_an if m.vung_mien != 'chung' and m.loai == 'mon_chinh']
    tuan_nay = today.isocalendar()
    tuan_str = f"{tuan_nay[0]}-W{tuan_nay[1]:02d}"
    
    binh_chon_list = []
    for cs in random.sample(all_chien_si, min(30, len(all_chien_si))):
        bc = BinhChon(
            chien_si_id=cs.id,
            mon_an_id=random.choice(mon_dac_san).id,
            tuan=tuan_str
        )
        binh_chon_list.append(bc)
    db.session.add_all(binh_chon_list)

    # === CẮT CƠM MẪU ===
    ly_do_list = ['cong_tac', 'gac', 'phep', 'nhiem_vu']
    cat_com_list = []
    for cs in random.sample(all_chien_si, min(8, len(all_chien_si))):
        cc = CatCom(
            chien_si_id=cs.id,
            ngay_bat_dau=today,
            ngay_ket_thuc=today + timedelta(days=random.randint(1, 5)),
            ly_do=random.choice(ly_do_list),
            loai=random.choice(['cat_com', 'com_hop']),
            nguoi_bao='TĐT ' + cs.don_vi.ten[:15] if cs.don_vi else 'N/A'
        )
        cat_com_list.append(cc)
        cs.trang_thai = 'cong_tac' if cc.ly_do == 'cong_tac' else ('phep' if cc.ly_do == 'phep' else 'gac')
    db.session.add_all(cat_com_list)

    # === THỰC PHẨM THỪA MẪU ===
    tp_thua_list = []
    for day_offset in range(-7, 0):
        ngay = today + timedelta(days=day_offset)
        for _ in range(random.randint(1, 3)):
            tpt = ThucPhamThua(
                mon_an_id=random.choice(all_mon_an).id,
                don_vi_id=dai_doi.id,
                ngay=ngay,
                luong_thua_kg=round(random.uniform(0.5, 5.0), 1),
                ghi_chu='Dư nhiều' if random.random() > 0.5 else None
            )
            tp_thua_list.append(tpt)
    db.session.add_all(tp_thua_list)

    # === THI ĐUA MẪU ===
    thi_dua_list = []
    for td in [trung_doi_1, trung_doi_2, trung_doi_3]:
        for day_offset in range(-7, 1):
            ngay = today + timedelta(days=day_offset)
            thdua = ThiDua(
                don_vi_id=td.id,
                ngay=ngay,
                diem_dung_gio=round(random.uniform(7, 10), 1),
                diem_ve_sinh=round(random.uniform(6, 10), 1),
                diem_tiet_kiem=round(random.uniform(5, 10), 1)
            )
            thi_dua_list.append(thdua)
    db.session.add_all(thi_dua_list)

    # === THÔNG BÁO HẬU CẦN MẪU ===
    thong_bao_list = [
        ThongBaoHauCan(
            tieu_de='Điều chỉnh thực đơn tuần tới',
            noi_dung='Do nguồn cung thịt lợn từ trạm tăng gia bị gián đoạn, bếp ăn sẽ thay thế bằng thịt gà và cá trong 3 ngày đầu tuần. Mong các đồng chí thông cảm.',
            loai='thong_bao', don_vi_id=dai_doi.id,
            ghim=True
        ),
        ThongBaoHauCan(
            tieu_de='Phản hồi ý kiến về canh mặn',
            noi_dung='Ghi nhận ý kiến của các đồng chí. Bếp ăn đã nhắc nhở nhân viên nấu nướng và sẽ kiểm tra lại quy trình nêm nếm.',
            loai='phan_hoi', don_vi_id=dai_doi.id,
            gop_y_id=gop_y_list[0].id if gop_y_list else None
        ),
        ThongBaoHauCan(
            tieu_de='Kết quả bình chọn món cuối tuần',
            noi_dung='Món được bình chọn nhiều nhất tuần này là Bún chả Hà Nội. Bếp sẽ phục vụ vào trưa Chủ nhật.',
            loai='thong_bao', don_vi_id=dai_doi.id
        ),
    ]
    db.session.add_all(thong_bao_list)

    # === HƯƠNG VỊ QUÊ NHÀ ===
    hvqn = HuongViQueNha(
        mon_an_id=all_mon_an[24].id,  # Bún bò Huế
        don_vi_id=dai_doi.id,
        thang=today.month,
        nam=today.year,
        mo_ta='Nhân dịp sinh nhật các chiến sĩ quê miền Trung trong tháng, nhà ăn phục vụ món Bún bò Huế - hương vị đặc trưng xứ Cố đô với nước dùng đậm đà, cay nồng.'
    )
    db.session.add(hvqn)

    db.session.commit()
    print(f"[OK] Seed xong: {len(all_chien_si)} chien si, {len(all_mon_an)} mon an, {len(all_thuc_don)} thuc don")
