# RoomBook - 회의실 예약 시스템

모바일 중심의 간편하고 빠른 회의실 예약 서비스입니다.

## 🚀 주요 기능

- **📱 모바일 최적화**: 아이폰 UI 스타일의 반응형 웹앱
- **🏠 PWA 지원**: 홈 화면에 앱 아이콘으로 설치 가능
- **📊 구글 시트 연동**: 별도 데이터베이스 없이 구글 시트 활용
- **⚡ 실시간 현황**: 회의실 사용 여부 실시간 확인
- **🔒 예약 충돌 방지**: 중복 예약 자동 차단
- **📅 직관적인 UI**: 네이버 예약 시스템과 유사한 UX

## 🛠 기술 스택

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: TailwindCSS, Lucide React Icons
- **Backend**: Next.js API Routes
- **Database**: Google Sheets API
- **Deployment**: Vercel (권장)

## 📋 사전 요구사항

- Node.js 18.0 이상
- npm 또는 yarn
- Google Cloud Console 계정
- Google Sheets 계정

## 🔧 설치 및 설정

### 1. 프로젝트 클론 및 패키지 설치

```bash
git clone <repository-url>
cd roombook
npm install
```

### 2. 구글 클라우드 프로젝트 설정

1. [Google Cloud Console](https://console.cloud.google.com/)에 접속
2. 새 프로젝트 생성 또는 기존 프로젝트 선택
3. Google Sheets API 활성화
   - API 및 서비스 > 라이브러리
   - "Google Sheets API" 검색 후 활성화

### 3. 서비스 계정 생성

1. IAM 및 관리자 > 서비스 계정
2. "서비스 계정 만들기" 클릭
3. 서비스 계정 정보 입력:
   - 이름: `roombook-service`
   - 설명: `RoomBook Google Sheets API 액세스`
4. 역할 설정: 없음 (기본값)
5. 키 생성:
   - 서비스 계정 클릭 > 키 탭
   - "키 추가" > "새 키 만들기" > JSON 선택
   - 생성된 JSON 파일 다운로드 및 안전한 곳에 보관

### 4. 구글 시트 설정

1. [Google Sheets](https://sheets.google.com)에서 새 스프레드시트 생성
2. 스프레드시트 이름: `RoomBook Database`
3. 다음 3개의 워크시트 생성:

#### 📊 rooms 워크시트
```
| A (id) | B (name) | C (capacity) | D (location) | E (equipment) | F (status) |
|--------|----------|--------------|--------------|---------------|------------|
| room1  | 회의실 A | 4            | 2층          | TV,화이트보드 | active     |
| room2  | 회의실 B | 8            | 2층          | TV,프로젝터   | active     |
| room3  | 회의실 C | 6            | 3층          | 화이트보드    | active     |
| room4  | 대회의실 | 12           | 3층          | TV,프로젝터,마이크 | active  |
```

#### 📋 bookings 워크시트
```
| A (id) | B (roomId) | C (roomName) | D (title) | E (bookerName) | F (bookerEmail) | G (startTime) | H (endTime) | I (date) | J (status) | K (purpose) | L (participants) | M (createdAt) | N (updatedAt) |
|--------|------------|--------------|-----------|----------------|-----------------|---------------|-------------|----------|------------|-------------|------------------|---------------|---------------|
```

#### 👥 users 워크시트 (향후 확장용)
```
| A (id) | B (name) | C (email) | D (department) | E (role) |
|--------|----------|-----------|----------------|----------|
```

4. 스프레드시트 공유:
   - 우측 상단 "공유" 버튼 클릭
   - 서비스 계정 이메일 주소 추가 (JSON 파일의 `client_email`)
   - 권한: "편집자" 설정

### 5. 환경변수 설정

1. `.env.example` 파일을 `.env.local`로 복사
```bash
cp .env.example .env.local
```

2. `.env.local` 파일 수정:
```env
# Google Sheets API 설정
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour private key here\n-----END PRIVATE KEY-----\n"
GOOGLE_SHEETS_SPREADSHEET_ID=1abcdefghijklmnopqrstuvwxyz0123456789

# 스프레드시트 ID 찾기: 구글 시트 URL에서
# https://docs.google.com/spreadsheets/d/[SPREADSHEET_ID]/edit
```

### 6. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 `http://localhost:3000` 접속

## 📱 PWA 설치 (모바일)

### iOS (Safari)
1. Safari로 사이트 접속
2. 하단 공유 버튼 탭
3. "홈 화면에 추가" 선택

### Android (Chrome)
1. Chrome으로 사이트 접속
2. 브라우저 메뉴 > "홈 화면에 추가"
3. 또는 자동으로 나타나는 설치 배너 사용

## 🚀 배포 (Vercel)

### 1. Vercel 프로젝트 생성
```bash
npm install -g vercel
vercel login
vercel
```

### 2. 환경변수 설정
Vercel 대시보드 > Settings > Environment Variables에서 다음 변수들 추가:
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `GOOGLE_PRIVATE_KEY`
- `GOOGLE_SHEETS_SPREADSHEET_ID`

### 3. 도메인 설정
- Vercel에서 자동 생성된 URL 사용
- 또는 커스텀 도메인 연결

## 📖 API 문서

### 회의실 API

#### GET /api/rooms
회의실 목록 조회
```
Query Parameters:
- includeBookings: boolean (예약 정보 포함 여부)

Response:
{
  "success": true,
  "data": [...],
  "count": 4
}
```

### 예약 API

#### GET /api/bookings
예약 목록 조회
```
Query Parameters:
- date: string (YYYY-MM-DD)
- roomId: string
- status: string (confirmed|pending|cancelled)
```

#### POST /api/bookings
새 예약 생성
```json
{
  "roomId": "room1",
  "title": "팀 미팅",
  "bookerName": "김철수",
  "bookerEmail": "kim@company.com",
  "startTime": "14:00",
  "endTime": "15:30",
  "date": "2024-01-15",
  "purpose": "프로젝트 회의",
  "participants": 5
}
```

#### PATCH /api/bookings
예약 상태 업데이트
```json
{
  "bookingId": "booking_123",
  "status": "cancelled"
}
```

## 🔧 커스터마이징

### 회의실 정보 수정
`rooms` 워크시트에서 직접 수정 가능:
- 회의실 추가/삭제
- 수용인원 변경
- 장비 정보 업데이트

### 예약 규칙 변경
`.env.local`에서 설정 변경:
```env
MAX_BOOKING_DAYS_AHEAD=30          # 최대 예약 가능 일수
MIN_BOOKING_DURATION_MINUTES=30    # 최소 예약 시간
MAX_BOOKING_DURATION_HOURS=8       # 최대 예약 시간
```

### UI 테마 변경
`tailwind.config.js`에서 컬러 팔레트 수정:
```javascript
colors: {
  primary: {
    500: '#your-color',  // 메인 브랜드 컬러
    // ...
  }
}
```

## 🐛 트러블슈팅

### 구글 시트 연결 오류
1. 서비스 계정 이메일이 시트에 공유되었는지 확인
2. `GOOGLE_PRIVATE_KEY`의 줄바꿈 문자(`\n`) 확인
3. 스프레드시트 ID가 정확한지 확인

### PWA 설치 안됨
1. HTTPS 연결 확인 (로컬은 localhost 가능)
2. `manifest.json` 파일 존재 확인
3. Service Worker 등록 확인

### 예약 생성 실패
1. 워크시트 이름이 정확한지 확인 (`rooms`, `bookings`)
2. 헤더 행이 올바른지 확인
3. 시간 형식이 HH:MM인지 확인

## 📄 라이선스

MIT License

## 🤝 기여하기

1. Fork 프로젝트
2. Feature 브랜치 생성 (`git checkout -b feature/amazing-feature`)
3. 변경사항 커밋 (`git commit -m 'Add amazing feature'`)
4. 브랜치에 Push (`git push origin feature/amazing-feature`)
5. Pull Request 생성

## 📞 지원

이슈가 있으시면 GitHub Issues에 문의해주세요.

---

**RoomBook** - 간편하고 빠른 회의실 예약의 새로운 경험 🚀 