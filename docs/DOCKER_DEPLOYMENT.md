# Docker 배포 가이드

Digital Canvas를 Docker를 사용하여 배포하는 방법입니다.

## 필요 사항

- Docker 20.10+
- Docker Compose 2.0+

## 빠른 시작

### 1. 프로젝트 클론

```bash
git clone <repository-url>
cd digital-canvas
```

### 2. 환경 변수 설정

`.env` 파일을 생성하여 설정을 변경할 수 있습니다:

```bash
# 애플리케이션 포트
PORT=7400

# 관리자 계정 설정
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
```

`.env.example` 파일을 참고하여 `.env` 파일을 생성하세요.

**중요**: 프로덕션 환경에서는 반드시 `ADMIN_USERNAME`과 `ADMIN_PASSWORD`를 변경하세요!

### 3. Docker 이미지 빌드 및 실행

```bash
# 이미지 빌드 및 컨테이너 시작
docker-compose up -d

# 로그 확인
docker-compose logs -f

# 상태 확인
docker-compose ps
```

### 4. 접속

- 뷰어: http://localhost:7400/
- 관리자: http://localhost:7400/admin

## 관리 명령어

### 컨테이너 중지

```bash
docker-compose down
```

### 컨테이너 재시작

```bash
docker-compose restart
```

### 로그 확인

```bash
# 실시간 로그
docker-compose logs -f

# 최근 100줄
docker-compose logs --tail=100
```

### 컨테이너 내부 접속

```bash
docker-compose exec app sh
```

### 데이터베이스 상태 확인

```bash
# Prisma 마이그레이션 상태
docker-compose exec app npx prisma migrate status

# Prisma Studio (웹 GUI)
docker-compose exec app npx prisma studio
# 브라우저에서 http://localhost:5555 접속
```

### 이미지 재빌드

```bash
# 캐시 없이 재빌드
docker-compose build --no-cache

# 재빌드 후 재시작
docker-compose up -d --build
```

## 데이터 영속성

Docker Compose는 다음 볼륨을 사용하여 데이터를 영구 저장합니다:

- `digital-canvas_uploads`: 업로드된 이미지 파일
- `digital-canvas_db`: SQLite 데이터베이스 파일

### 볼륨 확인

```bash
docker volume ls | grep digital-canvas
```

### 볼륨 삭제 (주의: 모든 데이터가 삭제됩니다)

```bash
docker-compose down -v
```

### 볼륨 백업

```bash
# 업로드된 이미지 백업
docker run --rm -v digital-canvas_uploads:/data -v $(pwd):/backup alpine tar czf /backup/uploads-backup.tar.gz -C /data .

# 데이터베이스 백업
docker run --rm -v digital-canvas_db:/data -v $(pwd):/backup alpine tar czf /backup/db-backup.tar.gz -C /data .
```

### 볼륨 복원

```bash
# 업로드된 이미지 복원
docker run --rm -v digital-canvas_uploads:/data -v $(pwd):/backup alpine tar xzf /backup/uploads-backup.tar.gz -C /data

# 데이터베이스 복원
docker run --rm -v digital-canvas_db:/data -v $(pwd):/backup alpine tar xzf /backup/db-backup.tar.gz -C /data
```

## Dockerfile 구조

### 멀티 스테이지 빌드

1. **Builder Stage**: TypeScript 컴파일 및 Prisma Client 생성
2. **Production Stage**: 프로덕션 실행 환경

### 주요 특징

- Node.js 18 Alpine 이미지 사용 (경량화)
- Non-root 사용자 실행 (보안)
- dumb-init 사용 (시그널 처리)
- Health check 포함

## 문제 해결

### 컨테이너가 시작되지 않을 때

```bash
# 로그 확인
docker-compose logs app

# 컨테이너 상태 확인
docker-compose ps -a

# 수동 실행 (디버깅)
docker-compose run --rm app sh
```

### 데이터베이스 마이그레이션 실패

```bash
# 마이그레이션 상태 확인
docker-compose exec app npx prisma migrate status

# 마이그레이션 재실행
docker-compose exec app npx prisma migrate deploy

# 데이터베이스 초기화 (주의: 모든 데이터 삭제)
docker-compose exec app npx prisma migrate reset
```

### 포트 충돌

`.env` 파일에서 포트를 변경하거나, `docker-compose.yml`에서 포트 매핑을 수정하세요:

```yaml
ports:
  - "7401:7400"  # 호스트:컨테이너
```

또는 `.env` 파일에서 `PORT` 환경 변수를 변경하세요.

### 디스크 공간 부족

```bash
# 사용하지 않는 이미지 정리
docker system prune -a

# 볼륨 확인
docker volume ls
```

## 보안 권장사항

1. **환경 변수**: 민감한 정보는 환경 변수로 관리
2. **Non-root 사용자**: 컨테이너는 node 사용자로 실행
3. **네트워크**: 필요한 경우 내부 네트워크만 사용
4. **업데이트**: 정기적으로 이미지 업데이트

## 프로덕션 배포

### 환경 변수 설정

프로덕션 환경에서는 `.env` 파일을 사용하거나 환경 변수를 직접 설정할 수 있습니다:

```bash
# .env 파일 사용 (권장)
PORT=7400
ADMIN_USERNAME=myadmin
ADMIN_PASSWORD=secure_password_here
NODE_ENV=production

# 또는 환경 변수로 직접 설정
export PORT=7400
export ADMIN_USERNAME=myadmin
export ADMIN_PASSWORD=secure_password_here
export NODE_ENV=production
docker-compose up -d
```

**중요**: 프로덕션 환경에서는 반드시 `ADMIN_USERNAME`과 `ADMIN_PASSWORD`를 변경하세요!

### 리버스 프록시 설정 (Nginx 예시)

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:7400;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 자동 재시작

`docker-compose.yml`에 `restart: unless-stopped` 설정이 포함되어 있어, 컨테이너가 자동으로 재시작됩니다.

## 모니터링

### Health Check

컨테이너는 Health Check를 통해 상태를 확인합니다:

```bash
# Health Check 상태 확인
docker inspect digital-canvas-app | grep -A 10 Health
```

### 리소스 사용량 확인

```bash
docker stats digital-canvas-app
```

---

Docker로 간편하게 배포하는 Digital Canvas!

