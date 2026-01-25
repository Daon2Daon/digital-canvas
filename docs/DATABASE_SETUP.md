# 데이터베이스 설정 가이드

## 문제: "The table `main.Image` does not exist" 에러

이 에러는 Prisma 마이그레이션이 실행되지 않아서 데이터베이스 테이블이 생성되지 않았을 때 발생합니다.

---

## 해결 방법

### Portainer (프로덕션) 환경

Docker 컨테이너가 시작될 때 `entrypoint.sh`에서 자동으로 마이그레이션을 실행합니다.

#### 1. 마이그레이션 자동 실행 확인

Portainer에서 컨테이너 로그를 확인하여 마이그레이션이 성공했는지 확인하세요:

```
Applying database migrations...
Environment variables loaded
Prisma schema loaded from prisma/schema.prisma
Datasource "db": SQLite database "database.db" at "file:/app/prisma/database.db"

✔ All migrations have been applied successfully
Database migrations completed successfully
```

이 메시지가 보이면 마이그레이션이 성공한 것입니다.

#### 2. 마이그레이션 수동 실행 (필요시)

Portainer 컨테이너 콘솔에서:

```bash
npx prisma migrate deploy
```

#### 3. 마이그레이션 상태 확인

```bash
npx prisma migrate status
```

#### 4. 데이터베이스 초기화 (주의: 모든 데이터 삭제)

문제가 계속되면 데이터베이스를 초기화할 수 있습니다:

```bash
# Portainer 콘솔에서
rm -f /app/prisma/database.db
npx prisma migrate deploy
```

또는 NAS에서 직접 삭제:

```bash
# NAS SSH 접속 후
rm -f /volume1/docker/digital-canvas/db/database.db
```

그 다음 Portainer에서 컨테이너를 재시작하세요.

---

### 로컬 Docker (docker-compose.local.yml)

로컬 Docker 환경에서도 `entrypoint.sh`가 자동으로 마이그레이션을 실행합니다.

#### 1. 로그 확인

```bash
docker-compose -f docker-compose.local.yml logs -f app
```

#### 2. 마이그레이션 수동 실행 (필요시)

```bash
docker-compose -f docker-compose.local.yml exec app npx prisma migrate deploy
```

#### 3. 마이그레이션 상태 확인

```bash
docker-compose -f docker-compose.local.yml exec app npx prisma migrate status
```

#### 4. 데이터베이스 초기화 (주의: 모든 데이터 삭제)

```bash
# 컨테이너 중지
docker-compose -f docker-compose.local.yml down

# 볼륨 삭제 (모든 데이터 삭제)
docker volume rm digital-canvas-local_db

# 컨테이너 재시작
docker-compose -f docker-compose.local.yml up -d
```

---

### 로컬 개발 환경 (npm 사용)

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

#### 3. 데이터베이스 초기화 (주의: 모든 데이터 삭제)

```bash
rm -f prisma/database.db
npm run db:setup
```

---

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

GitHub에서 이미지를 받아 사용하는 경우, 마이그레이션 파일은 이미 이미지에 포함되어 있습니다.

---

## 데이터베이스 파일 위치

SQLite 데이터베이스 파일은 다음 위치에 생성됩니다:

- **로컬 개발**: `prisma/database.db`
- **로컬 Docker**: Docker 볼륨 `digital-canvas-local_db` 내부
- **Portainer (프로덕션)**: `/volume1/docker/digital-canvas/db/database.db`

---

## Prisma Studio (데이터베이스 GUI)

데이터베이스를 시각적으로 확인하고 싶다면:

### Portainer

```bash
# Portainer 콘솔에서
npx prisma studio
```

Portainer에서 포트 포워딩을 설정하여 `5555` 포트를 열어야 합니다.

### 로컬 Docker

```bash
docker-compose -f docker-compose.local.yml exec app npx prisma studio
```

### 로컬 개발

```bash
npx prisma studio
```

브라우저에서 http://localhost:5555 로 접속하세요.

---

## 문제 해결

### 마이그레이션 파일이 없는 경우

마이그레이션 파일을 생성:

```bash
# 로컬 개발 환경에서만
npx prisma migrate dev --name init
```

**주의**: Portainer나 Docker 환경에서는 이미지에 이미 마이그레이션 파일이 포함되어 있으므로, 별도로 생성할 필요가 없습니다.

### 권한 문제 (NAS)

NAS 폴더 권한을 확인하세요:

```bash
# NAS SSH 접속 후
ls -la /volume1/docker/digital-canvas/
```

`db` 폴더에 쓰기 권한이 있는지 확인하고, 없다면:

```bash
chmod 755 /volume1/docker/digital-canvas/db
```

### 컨테이너 시작 시 마이그레이션 실패

1. Portainer에서 로그 확인
2. 데이터베이스 파일 권한 확인
3. 필요시 데이터베이스 파일 삭제 후 컨테이너 재시작

---

데이터베이스가 정상적으로 설정되면 이미지 업로드가 정상적으로 작동합니다!
