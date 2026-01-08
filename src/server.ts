/**
 * Express.js 서버 (TypeScript)
 * 최신 Node.js 스택 기반 디지털 액자
 */

import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import session from 'express-session';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import { randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';

const app = express();
const prisma = new PrismaClient();

// 리버스 프록시 신뢰 설정 (Nginx, Traefik 등 뒤에서 실행 시 필요)
app.set('trust proxy', 1);

// 환경 변수 검증 (프로덕션 환경에서 필수)
const PORT = parseInt(process.env.PORT || '20010', 10);
const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const SESSION_SECRET = process.env.SESSION_SECRET;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// 프로덕션 환경에서 필수 환경변수 검증
if (IS_PRODUCTION) {
  const missingVars: string[] = [];
  if (!ADMIN_USERNAME) missingVars.push('ADMIN_USERNAME');
  if (!ADMIN_PASSWORD) missingVars.push('ADMIN_PASSWORD');
  if (!SESSION_SECRET) missingVars.push('SESSION_SECRET');

  if (missingVars.length > 0) {
    console.error(`[ERROR] Missing required environment variables: ${missingVars.join(', ')}`);
    process.exit(1);
  }
}

// 개발 환경 기본값 (경고 출력)
const adminUsername = ADMIN_USERNAME || 'admin';
const adminPassword = ADMIN_PASSWORD || 'admin123';
const sessionSecret = SESSION_SECRET || 'dev-secret-' + randomUUID();

if (!IS_PRODUCTION && (!ADMIN_USERNAME || !ADMIN_PASSWORD)) {
  console.warn('[WARN] Using default credentials. Set ADMIN_USERNAME and ADMIN_PASSWORD in production.');
}

// 비밀번호 해시 생성 (서버 시작 시 1회)
const adminPasswordHash = bcrypt.hashSync(adminPassword, 10);

// 세션 설정
app.use(
  session({
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: IS_PRODUCTION, // 프로덕션에서는 HTTPS 필수
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24시간
      sameSite: 'strict', // CSRF 보호 강화
    },
  })
);

// 미들웨어
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// CORS 설정 제거 (같은 origin에서 실행되므로 불필요)
// 세션 쿠키는 같은 origin이므로 자동으로 전송됨

// 업로드 디렉토리 생성
const uploadDir = path.join(__dirname, '..', 'public', 'uploads');
if (!existsSync(uploadDir)) {
  fs.mkdir(uploadDir, { recursive: true }).catch(console.error);
}

// Multer 설정 (메모리 스토리지 사용)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    const extname = path.extname(file.originalname).toLowerCase();
    const mimetype = file.mimetype;

    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

    if (allowedMimeTypes.includes(mimetype) && allowedExtensions.includes(extname)) {
      return cb(null, true);
    } else {
      cb(new Error('JPG, PNG, WEBP 파일만 업로드 가능합니다.'));
    }
  },
});

// ==================== 뷰어 API ====================

/**
 * 뷰어용 이미지 목록 및 설정 조회
 * GET /api/viewer/images
 */
app.get('/api/viewer/images', async (req: Request, res: Response) => {
  try {
    const images = await prisma.image.findMany({
      orderBy: [
        { displayOrder: 'asc' },
        { createdAt: 'desc' },
      ],
    });

    let settings = await prisma.settings.findUnique({
      where: { id: 1 },
    });

    if (!settings) {
      settings = await prisma.settings.create({
        data: {
          id: 1,
          slideDuration: 10000,
          transitionEffect: 'fade',
          transitionSpeed: 1000,
          displayMode: 'cover',
          randomOrder: false,
        },
      });
    }

    // 랜덤 순서 옵션이 활성화된 경우 배열을 섞음
    let shuffledImages = [...images];
    if (settings.randomOrder) {
      // Fisher-Yates 셔플 알고리즘
      for (let i = shuffledImages.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledImages[i], shuffledImages[j]] = [shuffledImages[j], shuffledImages[i]];
      }
    }

    res.json({
      success: true,
      images: shuffledImages.map((img) => ({
        id: img.id,
        originalName: img.originalName,
        filename: img.filename,
        url: img.url,
        width: img.width,
        height: img.height,
      })),
      settings: {
        slideDuration: settings.slideDuration,
        transitionEffect: settings.transitionEffect,
        transitionSpeed: settings.transitionSpeed,
        displayMode: settings.displayMode,
        randomOrder: settings.randomOrder,
      },
    });
    
    // 디버깅 로그
    console.log(`[Viewer API] Returning ${shuffledImages.length} images`);
  } catch (error) {
    console.error('[Viewer API] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch images',
    });
  }
});

// ==================== 인증 미들웨어 ====================

declare module 'express-session' {
  interface SessionData {
    isAuthenticated?: boolean;
    username?: string;
  }
}

const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (req.session.isAuthenticated) {
    return next();
  }
  res.status(401).json({
    success: false,
    error: '인증이 필요합니다.',
  });
};

// ==================== 인증 API ====================

/**
 * 로그인
 * POST /api/auth/login
 */
app.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: '사용자명과 비밀번호를 입력해주세요.',
      });
    }

    // 관리자 정보 확인 (bcrypt 해시 비교)
    const isValidUsername = username === adminUsername;
    const isValidPassword = await bcrypt.compare(password, adminPasswordHash);

    if (isValidUsername && isValidPassword) {
      req.session.isAuthenticated = true;
      req.session.username = username;

      res.json({
        success: true,
        message: '로그인 성공',
      });
    } else {
      res.status(401).json({
        success: false,
        error: '사용자명 또는 비밀번호가 올바르지 않습니다.',
      });
    }
  } catch (error) {
    console.error('[Login] Error:', error);
    res.status(500).json({
      success: false,
      error: '로그인 중 오류가 발생했습니다.',
    });
  }
});

/**
 * 로그아웃
 * POST /api/auth/logout
 */
app.post('/api/auth/logout', (req: Request, res: Response) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('[Logout] Error:', err);
      return res.status(500).json({
        success: false,
        error: '로그아웃 중 오류가 발생했습니다.',
      });
    }
    res.json({
      success: true,
      message: '로그아웃 성공',
    });
  });
});

/**
 * 로그인 상태 확인
 * GET /api/auth/status
 */
app.get('/api/auth/status', (req: Request, res: Response) => {
  res.json({
    success: true,
    isAuthenticated: !!req.session.isAuthenticated,
    username: req.session.username || null,
  });
});

// ==================== 관리자 API ====================

/**
 * 이미지 목록 조회
 * GET /api/admin/images
 */
app.get('/api/admin/images', requireAuth, async (req: Request, res: Response) => {
  try {
    const sortBy = req.query.sortBy as string || 'createdAt'; // 'createdAt' | 'originalName'
    const sortOrder = req.query.sortOrder as string || 'desc'; // 'asc' | 'desc'
    
    let orderBy: any[] = [];
    
    if (sortBy === 'originalName') {
      orderBy = [{ originalName: sortOrder as 'asc' | 'desc' }];
    } else if (sortBy === 'createdAt') {
      orderBy = [{ createdAt: sortOrder as 'asc' | 'desc' }];
    } else {
      // 기본값: displayOrder 우선, 그 다음 createdAt
      orderBy = [
        { displayOrder: 'asc' },
        { createdAt: 'desc' },
      ];
    }
    
    const images = await prisma.image.findMany({
      orderBy,
    });

    res.json({
      success: true,
      images,
    });
  } catch (error) {
    console.error('[Admin API] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch images',
    });
  }
});

/**
 * 이미지 업로드
 * POST /api/admin/upload
 */
app.post('/api/admin/upload', requireAuth, upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file provided',
      });
    }

    // UUID 생성
    const uuid = randomUUID();
    const filename = `${uuid}.jpg`;
    const filepath = path.join(uploadDir, filename);

    // 이미지 리사이징 (1920px 제한)
    await sharp(req.file.buffer)
      .resize(1920, 1920, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality: 85 })
      .toFile(filepath);

    // 메타데이터 추출
    const metadata = await sharp(filepath).metadata();
    const stats = await fs.stat(filepath);

    // DB에 저장
    const image = await prisma.image.create({
      data: {
        originalName: req.file.originalname || 'unknown.jpg',
        filename,
        url: `/uploads/${filename}`,
        size: stats.size,
        width: metadata.width || null,
        height: metadata.height || null,
      },
    });

    console.log('[Upload] Success:', filename);
    res.json({
      success: true,
      image,
    });
  } catch (error) {
    console.error('[Upload] Error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed',
    });
  }
});

/**
 * 이미지 삭제
 * DELETE /api/admin/images/:id
 */
app.delete('/api/admin/images/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const imageId = parseInt(req.params.id, 10);

    const image = await prisma.image.findUnique({
      where: { id: imageId },
    });

    if (!image) {
      return res.status(404).json({
        success: false,
        error: 'Image not found',
      });
    }

    // 파일 삭제
    const filepath = path.join(__dirname, '..', 'public', image.url);
    try {
      await fs.unlink(filepath);
    } catch (err) {
      // 파일이 이미 없는 경우 무시
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
    }

    // DB에서 삭제
    await prisma.image.delete({
      where: { id: imageId },
    });

    console.log('[Delete] Success:', image.filename);
    res.json({
      success: true,
      message: 'Image deleted',
    });
  } catch (error) {
    console.error('[Delete] Error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Delete failed',
    });
  }
});

/**
 * 여러 이미지 삭제
 * POST /api/admin/images/delete-multiple
 */
app.post('/api/admin/images/delete-multiple', requireAuth, async (req: Request, res: Response) => {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: '삭제할 이미지 ID 목록이 필요합니다.',
      });
    }

    const imageIds = ids.map((id: any) => parseInt(String(id), 10)).filter((id: number) => !isNaN(id));

    if (imageIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: '유효한 이미지 ID가 없습니다.',
      });
    }

    // 이미지 목록 조회
    const images = await prisma.image.findMany({
      where: {
        id: { in: imageIds },
      },
    });

    if (images.length === 0) {
      return res.status(404).json({
        success: false,
        error: '삭제할 이미지를 찾을 수 없습니다.',
      });
    }

    // 파일 삭제 및 DB 삭제
    const deletePromises = images.map(async (image) => {
      const filepath = path.join(__dirname, '..', 'public', image.url);
      try {
        await fs.unlink(filepath);
      } catch (err) {
        // 파일이 이미 없는 경우 무시
        if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
      }
      return prisma.image.delete({
        where: { id: image.id },
      });
    });

    await Promise.all(deletePromises);

    console.log(`[Delete Multiple] Success: ${images.length} images deleted`);
    res.json({
      success: true,
      message: `${images.length}개의 이미지가 삭제되었습니다.`,
      deletedCount: images.length,
    });
  } catch (error) {
    console.error('[Delete Multiple] Error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Delete failed',
    });
  }
});

/**
 * 설정 조회
 * GET /api/admin/settings
 */
app.get('/api/admin/settings', requireAuth, async (req: Request, res: Response) => {
  try {
    let settings = await prisma.settings.findUnique({
      where: { id: 1 },
    });

    if (!settings) {
      settings = await prisma.settings.create({
        data: {
          id: 1,
          slideDuration: 10000,
          transitionEffect: 'fade',
          transitionSpeed: 1000,
          displayMode: 'cover',
          randomOrder: false,
        },
      });
    }

    res.json({
      success: true,
      settings,
    });
  } catch (error) {
    console.error('[Settings] Error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch settings',
    });
  }
});

/**
 * 설정 업데이트
 * PUT /api/admin/settings
 */
app.put('/api/admin/settings', requireAuth, async (req: Request, res: Response) => {
  try {
    const data = req.body;

    const settings = await prisma.settings.upsert({
      where: { id: 1 },
      update: {
        slideDuration: data.slideDuration || 10000,
        transitionEffect: data.transitionEffect || 'fade',
        transitionSpeed: data.transitionSpeed || 1000,
        displayMode: data.displayMode || 'cover',
        randomOrder: data.randomOrder !== undefined ? data.randomOrder : false,
      },
      create: {
        id: 1,
        slideDuration: data.slideDuration || 10000,
        transitionEffect: data.transitionEffect || 'fade',
        transitionSpeed: data.transitionSpeed || 1000,
        displayMode: data.displayMode || 'cover',
        randomOrder: data.randomOrder !== undefined ? data.randomOrder : false,
      },
    });

    res.json({
      success: true,
      settings,
    });
  } catch (error) {
    console.error('[Settings Update] Error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update settings',
    });
  }
});

// ==================== 정적 페이지 라우트 ====================

// 뷰어
app.get('/', (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'viewer.html'));
});

// 관리자 페이지
app.get('/admin', (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'admin.html'));
});

// ==================== 서버 시작 ====================

app.listen(PORT, '0.0.0.0', () => {
  console.log('===========================================');
  console.log('Digital Canvas Server (TypeScript)');
  console.log('===========================================');
  console.log(`Server: http://0.0.0.0:${PORT}`);
  console.log(`Viewer: http://0.0.0.0:${PORT}/`);
  console.log(`Admin:  http://0.0.0.0:${PORT}/admin`);
  console.log('===========================================');
});

// 프로세스 종료 처리
process.on('SIGINT', async () => {
  console.log('\nShutting down server...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\nShutting down server...');
  await prisma.$disconnect();
  process.exit(0);
});

