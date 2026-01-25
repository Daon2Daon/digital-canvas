#!/bin/sh
# Docker 컨테이너 시작 스크립트
# Digital Canvas - TypeScript 기반 배포용
# Using SQLite database

set -e

echo "=========================================="
echo "Digital Canvas - Starting..."
echo "=========================================="

# 1. SQLite 데이터베이스 디렉토리 확인 및 생성
echo ""
echo "🔍 Checking SQLite database directory..."
DB_DIR="/app/prisma"
DB_FILE="$DB_DIR/database.db"

if [ ! -d "$DB_DIR" ]; then
    echo "📁 Creating database directory..."
    mkdir -p "$DB_DIR"
fi

# 2. Prisma Client 생성 확인
echo ""
echo "📦 Checking Prisma Client..."
if [ ! -d "/app/node_modules/.prisma" ]; then
    echo "📦 Generating Prisma Client..."
    npx prisma generate
fi

# 3. Prisma 마이그레이션 적용
echo ""
echo "📊 Applying database migrations..."
if npx prisma migrate deploy; then
    echo "✅ Migrations applied successfully!"
else
    echo "⚠️  Migration failed, attempting recovery..."
    
    # 실패한 마이그레이션 상태 확인
    echo "Checking migration status..."
    npx prisma migrate status || true
    
    # 재시도
    echo "Retrying migration..."
    if npx prisma migrate deploy; then
        echo "✅ Migration succeeded on retry!"
    else
        echo "❌ Migration still failing, but continuing to start server..."
        echo "Please check migration status manually from the container console:"
        echo "  npx prisma migrate status"
    fi
fi

# 4. 초기 데이터 시드 (선택사항, package.json에 prisma.seed가 정의되어 있어야 함)
echo ""
echo "🌱 Checking for seed script..."
if [ -f "/app/package.json" ] && grep -q "\"prisma\"" /app/package.json && grep -q "\"seed\"" /app/package.json; then
    echo "🌱 Running seed script..."
    if npx prisma db seed; then
        echo "✅ Seed data created!"
    else
        echo "ℹ️  Seed skipped (data may already exist or seed script not configured)"
    fi
else
    echo "ℹ️  Seed script not configured, skipping..."
fi

# 5. 최종 데이터베이스 상태 확인
echo ""
echo "📋 Final database status:"
if [ -f "$DB_FILE" ]; then
    echo "✅ SQLite database file exists: $DB_FILE"
    ls -lh "$DB_FILE" || true
else
    echo "⚠️  SQLite database file not found (will be created on first use)"
fi

# 6. 빌드 확인
echo ""
echo "🔍 Checking build output..."
if [ ! -d "/app/dist" ]; then
    echo "❌ Build output (dist/) not found!"
    echo "Please rebuild the Docker image."
    exit 1
fi

if [ ! -f "/app/dist/server.js" ]; then
    echo "❌ Compiled server.js not found!"
    echo "Please rebuild the Docker image."
    exit 1
fi

echo "✅ Build output verified"

# 7. 서버 시작
echo ""
echo "=========================================="
echo "🚀 Starting Express server..."
echo "=========================================="
echo ""

exec node dist/server.js

