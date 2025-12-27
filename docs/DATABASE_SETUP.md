# 데이터베이스 설정 가이드

## 문제: "The table `main.Image` does not exist" 에러

이 에러는 Prisma 마이그레이션이 실행되지 않아서 데이터베이스 테이블이 생성되지 않았을 때 발생합니다.

## 해결 방법

### Docker로 실행하는 경우

**중요**: 마이그레이션 파일을 추가한 후에는 **반드시 Docker 이미지를 재빌드**해야 합니다!

Docker 컨테이너가 시작될 때 `entrypoint.sh`에서 자동으로 마이그레이션을 실행합니다. 하지만 마이그레이션 파일이 이미지에 포함되어 있지 않으면 실행되지 않습니다.

#### 1. Docker 이미지 재빌드 (가장 중요!)

```bash
# 기존 컨테이너 중지 및 제거
docker-compose down

# 이미지 재빌드 (캐시 없이)
docker-compose build --no-cache

# 컨테이너 시작
docker-compose up -d

# 로그 확인 (마이그레이션 성공 메시지 확인)
docker-compose logs -f app
```

또는 한 번에:

```bash
docker-compose up -d --build
```

**주의**: 단순히 `docker-compose restart`만으로는 마이그레이션 파일이 포함되지 않습니다!

#### 2. 마이그레이션 수동 실행 (필요시)

```bash
docker-compose exec app npx prisma migrate deploy
```

#### 3. 마이그레이션 상태 확인

```bash
docker-compose exec app npx prisma migrate status
```

### 로컬 개발 환경인 경우

#### 1. 마이그레이션 실행

```bash
npm run db:setup
```

또는

```bash
npx prisma migrate deploy
npx prisma generate
```

#### 2. 마이그레이션 상태 확인

```bash
npx prisma migrate status
```

## 마이그레이션 파일 확인

마이그레이션 파일은 `prisma/migrations/` 디렉토리에 있습니다:

```
prisma/
├── migrations/
│   ├── migration_lock.toml
│   └── 0_init/
│       └── migration.sql
└── schema.prisma
```

## 데이터베이스 파일 위치

SQLite 데이터베이스 파일은 다음 위치에 생성됩니다:

- 로컬 개발: `prisma/database.db`
- Docker: `/app/prisma/database.db` (볼륨으로 관리됨)

## Prisma Studio (데이터베이스 GUI)

데이터베이스를 시각적으로 확인하고 싶다면:

```bash
# Docker
docker-compose exec app npx prisma studio

# 로컬
npx prisma studio
```

브라우저에서 http://localhost:5555 로 접속하세요.

## 문제 해결

### 마이그레이션이 계속 실패하는 경우

1. 데이터베이스 파일 삭제 (주의: 모든 데이터가 삭제됩니다)

```bash
# Docker
docker-compose exec app rm -f /app/prisma/database.db

# 로컬
rm -f prisma/database.db
```

2. 마이그레이션 재실행

```bash
# Docker
docker-compose exec app npx prisma migrate deploy

# 로컬
npx prisma migrate deploy
```

### 마이그레이션 파일이 없는 경우

마이그레이션 파일을 생성:

```bash
# Docker
docker-compose exec app npx prisma migrate dev --name init

# 로컬
npx prisma migrate dev --name init
```

---

데이터베이스가 정상적으로 설정되면 이미지 업로드가 정상적으로 작동합니다!

