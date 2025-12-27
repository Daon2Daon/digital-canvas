# Digital Canvas (디지털 액자)

Node.js 스택 기반 디지털 액자 솔루션

---

## 주요 기능

### 뷰어
- **전체 화면 모드** - 더블 클릭으로 전체 화면 전환
- **자동 슬라이드쇼** - 설정 가능한 시간 간격
- **부드러운 전환 효과** - Fade 애니메이션
- **두 가지 표시 모드**:
  - 전체 화면 채우기 (Cover)
  - 이미지 전체 보기 (Contain)
- **홈 화면 웹앱** - 아이콘 터치로 즉시 실행
- **자동 갱신** - 10분마다 새 이미지 확인
- **오류 복구** - 네트워크 문제 시 자동 재시도
- **파일명 표시** - 단일 클릭으로 현재 이미지 파일명 확인

### 관리자
- **이미지 업로드** - 드래그 앤 드롭 지원 (JPG, PNG, WEBP)
- **자동 리사이징** - 1920px로 최적화
- **이미지 관리** - 순서 변경, 삭제
- **설정 관리**:
  - 슬라이드 시간 (1-60초)
  - 전환 효과 (Fade/None)
  - 전환 속도 (0.1-5초)
  - 표시 모드 (Cover/Contain)
  - 랜덤 순서 옵션
- **실시간 미리보기**
- **로그인/로그아웃** - 관리자 인증 기능

---

## 빠른 시작

### 필요 사항
- Node.js 18+
- SQLite (내장, 별도 설치 불필요)

### 로컬 개발

```bash
# 1. 의존성 설치
npm install

# 2. 환경 변수 설정
cp env.example .env
# .env 파일 편집 (PORT, ADMIN_USERNAME, ADMIN_PASSWORD 등)

# 3. 데이터베이스 마이그레이션
npm run db:setup

# 4. 개발 서버 시작
npm run dev
```

서버가 시작되면:
- 뷰어: http://localhost:7400/
- 관리자: http://localhost:7400/admin

### 프로덕션 빌드

```bash
# 1. TypeScript 컴파일
npm run build

# 2. 서버 시작
npm start
```

### Docker 배포

```bash
# 1. Docker 이미지 빌드 및 컨테이너 시작
docker-compose up -d

# 2. 로그 확인
docker-compose logs -f

# 3. 접속
# 뷰어: http://localhost:7400/
# 관리자: http://localhost:7400/admin
```

자세한 내용: **[docs/DOCKER_DEPLOYMENT.md](./docs/DOCKER_DEPLOYMENT.md)**

---

## 기술 스택

### Backend
- **TypeScript** - 타입 안정성
- **Express.js** - 웹 서버
- **Prisma** - ORM
- **SQLite** - 데이터베이스
- **Sharp** - 이미지 처리
- **Multer** - 파일 업로드

### Frontend
- **최신 JavaScript (ES6+)** - 모던 브라우저 지원
- **Pure HTML/CSS** - 최소 의존성
- **Web App Manifest** - 홈 화면 추가

---

## 프로젝트 구조

```
digital-canvas/
├── src/
│   └── server.ts              # Express 서버 (TypeScript)
├── public/
│   ├── viewer.html            # 뷰어 페이지
│   ├── admin.html             # 관리자 페이지
│   ├── manifest.json          # 웹앱 매니페스트
│   └── uploads/               # 업로드된 이미지
├── prisma/
│   ├── schema.prisma          # 데이터베이스 스키마
│   └── migrations/            # 마이그레이션
├── dist/                      # 컴파일된 JavaScript
├── package.json
├── tsconfig.json
└── .env
```

---

## 설정

### 환경 변수 (.env)

`.env.example` 파일을 참고하여 `.env` 파일을 생성하세요:

```bash
# 애플리케이션 포트
PORT=3000

# Node 환경
NODE_ENV=production

# Prisma (SQLite)
DATABASE_URL="file:./prisma/database.db"

# 관리자 계정 설정
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
```

**중요**: 프로덕션 환경에서는 반드시 `ADMIN_USERNAME`과 `ADMIN_PASSWORD`를 변경하세요!

### 슬라이드쇼 설정 (관리자 페이지)

- **슬라이드 시간**: 1-60초 (기본 10초)
- **전환 효과**: Fade / None (기본 Fade)
- **전환 속도**: 0.1-5초 (기본 1초)
- **표시 모드**: Cover / Contain (기본 Cover)
- **랜덤 순서**: 활성화/비활성화

---

## API 엔드포인트

### 뷰어 API
- `GET /api/viewer/images` - 이미지 목록 및 설정

### 인증 API
- `POST /api/auth/login` - 로그인
- `POST /api/auth/logout` - 로그아웃
- `GET /api/auth/status` - 로그인 상태 확인

### 관리자 API
- `GET /api/admin/images` - 이미지 목록 (관리용, 인증 필요)
- `POST /api/admin/upload` - 이미지 업로드 (인증 필요)
- `DELETE /api/admin/images/:id` - 이미지 삭제 (인증 필요)
- `POST /api/admin/images/delete-multiple` - 여러 이미지 삭제 (인증 필요)
- `GET /api/admin/settings` - 설정 조회 (인증 필요)
- `PUT /api/admin/settings` - 설정 업데이트 (인증 필요)

---

## 개발

### 개발 서버 실행

```bash
npm run dev
```

### 데이터베이스 관리

```bash
# 마이그레이션 생성 및 적용
npm run db:setup

# 마이그레이션 생성 (개발용)
npm run db:migrate

# Prisma Studio (DB GUI)
npm run db:studio

# 데이터 초기화 (주의: 모든 데이터 삭제)
npm run db:reset

# Prisma Client 생성
npm run db:generate
```

**데이터베이스 설정 문제 해결**: [docs/DATABASE_SETUP.md](./docs/DATABASE_SETUP.md)

### 빌드

```bash
# TypeScript 컴파일
npm run build

# 컴파일된 파일 실행
npm start
```

---

## 사용 예시

### 1. 이미지 업로드 (PC)

```
http://localhost:7400/admin 접속
→ 이미지 파일 드래그 앤 드롭
→ 자동으로 1920px 리사이징
→ 업로드 완료
```

### 2. 설정 변경 (PC)

```
관리자 페이지 하단
→ 슬라이드 시간: 10초
→ 전환 효과: Fade
→ 전환 속도: 1초
→ 표시 모드: 전체 화면 채우기
→ "설정 저장" 클릭
```

### 3. 뷰어에서 즐기기

```
http://localhost:7400/ 접속
→ 전체 화면 실행
→ 자동 슬라이드쇼 시작
→ 설정한 시간마다 자동 전환
```

---

## 기존 프로젝트와의 차이점

`digital-album` 프로젝트를 Node.js 스택으로 구현한 버전입니다.

### 주요 변경사항
- **TypeScript** 사용 - 타입 안정성 향상
- **ES6+ 문법** - async/await, const/let, 화살표 함수 등
- **Multer 사용** - Formidable 대신 더 모던한 파일 업로드 방식
- **최신 Express 패턴** - 타입 정의 포함
- **프론트엔드도 ES6+** - 기존 ES5에서 모던 JavaScript로 업그레이드
- **포트 변경** - 8754 → 7400
- **로그인/로그아웃 기능** - 관리자 인증 기능 추가 (express-session 기반)

---

## 라이선스

MIT License

---
