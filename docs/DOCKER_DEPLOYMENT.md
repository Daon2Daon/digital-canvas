# Docker 배포 가이드

Digital Canvas의 배포 환경별 가이드입니다.

---

## 프로덕션 배포 (Portainer)

프로덕션 환경은 Portainer를 사용하여 GitHub Container Registry의 이미지를 배포합니다.

### 사전 준비

#### 1. NAS 폴더 생성

Portainer 스택 생성 전에 NAS에 다음 폴더를 생성하세요:

```bash
/volume1/docker/digital-canvas/
├── db/          # SQLite 데이터베이스 저장
└── uploads/     # 업로드된 이미지 저장
```

Synology NAS의 경우:
- File Station을 열고 `docker` 공유 폴더로 이동
- `digital-canvas` 폴더 생성
- 그 안에 `db`와 `uploads` 폴더 생성

#### 2. Portainer 스택 생성

1. Portainer 웹 UI에 접속
2. **Stacks** 메뉴 선택
3. **Add stack** 버튼 클릭
4. 스택 이름 입력: `digital-canvas`
5. Web editor에 `docker-compose.yml` 내용 붙여넣기

#### 3. 환경 변수 설정

Portainer 스택 설정에서 다음 환경 변수를 추가하세요:

| 변수명 | 설명 | 예시 |
|--------|------|------|
| `HOST_PORT` | 외부 노출 포트 | `3000` |
| `ADMIN_USERNAME` | 관리자 계정 | `admin` |
| `ADMIN_PASSWORD` | 관리자 비밀번호 | `secure_password_123` |
| `SESSION_SECRET` | 세션 암호화 키 | `random_secret_key_here` |

**중요**: 
- `ADMIN_PASSWORD`는 반드시 강력한 비밀번호로 설정하세요
- `SESSION_SECRET`은 랜덤한 문자열로 생성하세요 (30자 이상 권장)

#### 4. 스택 배포

1. 환경 변수 입력 완료
2. **Deploy the stack** 버튼 클릭
3. 컨테이너가 시작될 때까지 대기

### 접속

- 뷰어: `http://nas주소:포트번호/`
- 관리자: `http://nas주소:포트번호/admin`

예: `http://192.168.1.100:3000/`

### 자동 업데이트 (Watchtower)

`docker-compose.yml`에 Watchtower 라벨이 포함되어 있습니다:

```yaml
labels:
  - "com.centurylinklabs.watchtower.enable=true"
```

Watchtower가 실행 중이라면, GitHub에 새로운 이미지가 푸시될 때 자동으로 업데이트됩니다.

Watchtower 설정 방법:

```yaml
# Portainer에 별도 스택으로 추가
version: "3"
services:
  watchtower:
    image: containrrr/watchtower
    container_name: watchtower
    restart: unless-stopped
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    environment:
      - WATCHTOWER_CLEANUP=true
      - WATCHTOWER_LABEL_ENABLE=true
      - WATCHTOWER_INCLUDE_RESTARTING=true
    command: --interval 300 --label-enable
```

### 관리 명령어

Portainer 컨테이너 콘솔에서 실행:

```bash
# 마이그레이션 상태 확인
npx prisma migrate status

# 데이터베이스 초기화 (주의: 모든 데이터 삭제)
npx prisma migrate reset

# Prisma Studio 실행 (데이터베이스 GUI)
npx prisma studio
```

### 백업

#### 데이터베이스 백업

```bash
# NAS SSH 접속 후
cd /volume1/docker/digital-canvas/db
tar czf database-backup-$(date +%Y%m%d).tar.gz database.db
```

#### 이미지 파일 백업

```bash
# NAS SSH 접속 후
cd /volume1/docker/digital-canvas/uploads
tar czf uploads-backup-$(date +%Y%m%d).tar.gz .
```

또는 Synology의 Hyper Backup을 사용하여 `/volume1/docker/digital-canvas/` 전체를 백업하세요.

### 문제 해결

#### 컨테이너가 시작되지 않을 때

1. Portainer에서 로그 확인
2. 환경 변수가 올바르게 설정되었는지 확인
3. NAS 폴더 권한 확인

```bash
# NAS SSH 접속 후
ls -la /volume1/docker/digital-canvas/
# db와 uploads 폴더가 존재하고 쓰기 권한이 있는지 확인
```

#### 데이터베이스 에러

```bash
# Portainer 콘솔에서
npx prisma migrate deploy
```

#### 이미지가 최신으로 업데이트되지 않을 때

1. Portainer에서 스택 중지
2. **Update the stack** 버튼 클릭
3. **Pull latest image version** 체크
4. 스택 재시작

또는 Watchtower를 사용하여 자동 업데이트하세요.

---

## 로컬 개발 (docker-compose.local.yml)

로컬에서 Docker를 사용하여 개발하는 경우 `docker-compose.local.yml`을 사용합니다.

### 빠른 시작

```bash
# 1. 프로젝트 클론
git clone <repository-url>
cd digital-canvas

# 2. 환경 변수 설정 (선택사항)
cp env.example .env
# .env 파일 편집

# 3. 컨테이너 시작
docker-compose -f docker-compose.local.yml up -d

# 4. 로그 확인
docker-compose -f docker-compose.local.yml logs -f

# 5. 접속
# 뷰어: http://localhost:20010/
# 관리자: http://localhost:20010/admin
```

### 특징

- 로컬에서 소스코드를 빌드하여 이미지 생성
- Docker 볼륨 사용 (호스트 경로에 의존하지 않음)
- 개발 모드로 실행 (`NODE_ENV=development`)
- 기본 포트: 20010

### 관리 명령어

```bash
# 컨테이너 중지
docker-compose -f docker-compose.local.yml down

# 컨테이너 재시작
docker-compose -f docker-compose.local.yml restart

# 로그 확인
docker-compose -f docker-compose.local.yml logs -f

# 컨테이너 내부 접속
docker-compose -f docker-compose.local.yml exec app sh

# 이미지 재빌드
docker-compose -f docker-compose.local.yml build --no-cache
docker-compose -f docker-compose.local.yml up -d
```

### 데이터 영속성

Docker 볼륨 사용:
- `digital-canvas-local_uploads`: 업로드된 이미지 파일
- `digital-canvas-local_db`: SQLite 데이터베이스 파일

#### 볼륨 확인

```bash
docker volume ls | grep digital-canvas-local
```

#### 볼륨 삭제 (주의: 모든 데이터 삭제)

```bash
docker-compose -f docker-compose.local.yml down -v
```

#### 볼륨 백업

```bash
# 업로드된 이미지 백업
docker run --rm -v digital-canvas-local_uploads:/data -v $(pwd):/backup alpine tar czf /backup/uploads-backup.tar.gz -C /data .

# 데이터베이스 백업
docker run --rm -v digital-canvas-local_db:/data -v $(pwd):/backup alpine tar czf /backup/db-backup.tar.gz -C /data .
```

#### 볼륨 복원

```bash
# 업로드된 이미지 복원
docker run --rm -v digital-canvas-local_uploads:/data -v $(pwd):/backup alpine tar xzf /backup/uploads-backup.tar.gz -C /data

# 데이터베이스 복원
docker run --rm -v digital-canvas-local_db:/data -v $(pwd):/backup alpine tar xzf /backup/db-backup.tar.gz -C /data
```

---

## CI/CD (GitHub Actions)

코드가 `main` 브랜치에 푸시되면 자동으로:

1. Docker 이미지 빌드
2. GitHub Container Registry(GHCR)에 푸시
3. 이미지 태그: `ghcr.io/daon2daon/digital-canvas:latest`

Watchtower가 설정되어 있다면, 새로운 이미지가 푸시된 후 자동으로 컨테이너를 업데이트합니다.

### GitHub Secrets 설정

필요 없음 - `GITHUB_TOKEN`은 자동으로 제공됨

---

## Dockerfile 구조

### 멀티 스테이지 빌드

1. **Builder Stage**: TypeScript 컴파일 및 Prisma Client 생성
2. **Production Stage**: 프로덕션 실행 환경

### 주요 특징

- Node.js 18 Alpine 이미지 사용 (경량화)
- Non-root 사용자 실행 (보안)
- dumb-init 사용 (시그널 처리)
- Health check 포함

---

## 보안 권장사항

1. **환경 변수**: 민감한 정보는 환경 변수로 관리
2. **Non-root 사용자**: 컨테이너는 node 사용자로 실행
3. **강력한 비밀번호**: 프로덕션에서는 반드시 강력한 비밀번호 사용
4. **정기 업데이트**: Watchtower로 자동 업데이트 설정

---

환경에 맞는 배포 방법을 선택하여 Digital Canvas를 실행하세요!
