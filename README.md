# 🛡️ Access Logger Tool (`access-logger`)

Công cụ ghi nhận và phân tích log truy cập cho **chính website/server của bạn**: lưu lại địa chỉ IP, thông tin thiết bị (User-Agent → trình duyệt, hệ điều hành) và thời gian của mỗi request gửi tới endpoint ghi log. Dùng cho mục đích analytics, giám sát bảo mật và chống lạm dụng trên hạ tầng bạn sở hữu, với lưu ý rằng khách truy cập cần được thông báo về việc thu thập này.

---

## 🚀 Mục tiêu dự án
* Xây dựng một lightweight server bằng Node.js / Express + TypeScript.
* Thu thập thông tin cơ bản của request (IP, Browser, OS, Timestamp) trên site của chính mình.
* Lưu trữ log vào tệp cục bộ hoặc cơ sở dữ liệu nhẹ (SQLite).
* Tích hợp Markdown Checklist để dễ theo dõi tiến độ phát triển.

---

## 📋 Tiến độ dự án (Task Checklist)

### Giai đoạn 1: Khởi tạo và Cấu hình Môi trường
- [x] Khởi tạo dự án Node.js với TypeScript (`npm init` & `tsconfig.json`) <!-- id: 1 -->
- [x] Cài đặt các thư viện cốt lõi (`express`, `@types/node`, `@types/express`, `cors`) <!-- id: 2 -->
- [x] Thiết lập cấu trúc thư mục dự án chuẩn (`src/`, `logs/`) <!-- id: 3 -->

### Giai đoạn 2: Phát triển tính năng cốt lõi (Core Logic)
- [x] Viết API endpoint bắt request (`GET /track`) <!-- id: 4 -->
- [x] Viết hàm trích xuất địa chỉ IP thực tế (xử lý qua Header `x-forwarded-for` và `req.ip`) <!-- id: 5 -->
- [x] Thu thập thông tin thiết bị từ `User-Agent` (Trình duyệt, Hệ điều hành) <!-- id: 6 -->

### Giai đoạn 3: Lưu trữ và Trực quan hóa Log
- [x] Cấu hình ghi log ra tệp `access.log` hoặc lưu vào SQLite <!-- id: 7 -->
- [x] Xây dựng giao diện dashboard đơn giản hoặc API xem lại danh sách log đã ghi <!-- id: 8 -->

### Giai đoạn 4: Kiểm thử và Triển khai
- [x] Viết kịch bản test thử nghiệm trên môi trường local <!-- id: 9 -->
- [x] Triển khai lên cloud hosting miễn phí (như Render hoặc Vercel nếu hỗ trợ serverless) <!-- id: 10 -->

---

## ⚙️ Cách chạy

```bash
npm install
npm run dev        # chạy dev với ts-node-dev
# hoặc
npm run build && npm start
```

- Kiểm tra server: `http://localhost:3000/health`
- Ghi log thử: `http://localhost:3000/track` (thêm `?debug=1` để xem entry dạng JSON)
- Log được ghi vào `logs/access.log`, mỗi request một dòng JSON.

### Biến môi trường
| Biến | Ý nghĩa | Mặc định |
|------|---------|----------|
| `PORT` | Cổng server | `3000` |
| `TRUST_PROXY` | Số lớp reverse proxy đứng trước (để `req.ip` lấy đúng IP thật) | `1` |
| `LOG_DIR` | Thư mục chứa file log | `./logs` |

> ⚠️ Lưu ý: một địa chỉ IP thô không định danh chắc chắn một cá nhân (VPN, NAT/CGNAT, IP động, proxy). Dữ liệu này phù hợp cho analytics và chống lạm dụng hơn là để khẳng định danh tính. Hãy thông báo cho khách truy cập về việc thu thập log (privacy notice).

---

## 🧪 Kiểm thử (id 9)

```bash
npm install
npm test
```

Dùng test runner tích hợp của Node (`node:test`) + `supertest`, chạy qua `tsx` (không cần build). Các test (`test/api.test.ts`) kiểm tra: `/health`, `/track?debug=1` (parse đúng IP từ `x-forwarded-for` và nhận diện Browser/OS), beacon GIF, `/api/logs` đọc lại được log vừa ghi và lọc theo IP. Test ghi log vào thư mục tạm nên **không đụng** vào `logs/access.log` thật. Yêu cầu Node ≥ 18.19.

## ☁️ Triển khai (id 10)

**Render (khuyến nghị)** — file `render.yaml` đã có sẵn:
1. Push repo lên GitHub.
2. Trên Render: **New → Blueprint**, trỏ vào repo này (Render tự đọc `render.yaml`).
3. Blueprint đã cấu hình `build`/`start`, health check `/health`, `TRUST_PROXY=1`, và một **disk 1GB** mount vào `/var/data` với `LOG_DIR=/var/data/logs` để log không mất khi restart.

**Vercel + Upstash Redis** — Vercel chạy serverless không ghi file bền vững, nên dùng Upstash Redis (free tier) làm nơi lưu log. App tự chọn backend: có biến môi trường Upstash → dùng Redis; không có → ghi file (`logs/access.log`) cho local/Render.

1. Tạo một database tại [upstash.com](https://upstash.com) (Redis, Global). Cách nhanh nhất: trên Vercel vào tab **Storage → Marketplace → Upstash**, nó tự thêm biến môi trường cho project.
2. Nếu tạo thủ công, copy **REST URL** và **REST Token** rồi thêm vào Vercel (**Settings → Environment Variables**):

| Biến | Giá trị |
|------|---------|
| `UPSTASH_REDIS_REST_URL` | REST URL từ Upstash |
| `UPSTASH_REDIS_REST_TOKEN` | REST Token từ Upstash |
| `TRUST_PROXY` | `1` |

3. Redeploy. Lúc này `/dashboard` trên Vercel sẽ lưu và hiển thị log bền vững (giữ tối đa 5000 bản ghi gần nhất).

> Deploy trên Vercel: dự án theo chuẩn Express preset (zero-config) — `src/index.ts` export app, không cần `vercel.json` hay thư mục `api/`.
