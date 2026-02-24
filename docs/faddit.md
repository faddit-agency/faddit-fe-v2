# Faddit 앱 구조 및 규칙

이 문서는 **Faddit 전용** 코드의 위치, 라우트, 레이아웃, 규칙을 정리합니다.  
템플릿(Cruip Mosaic) 관련 내용은 `docs/template-mosaic.md`를 참고하세요.

---

## Faddit 전용 디렉터리·파일

### 페이지 (Pages)

| 경로 | 설명 |
|------|------|
| `src/pages/faddit/auth/Login.tsx` | 로그인 |
| `src/pages/faddit/auth/Signup.tsx` | 회원가입 |
| `src/pages/faddit/Main.tsx` | 메인(로그인 후) |
| `src/pages/faddit/Home.tsx` | 홈 |

**규칙**: 새 화면은 `pages/faddit/` 아래에 도메인·기능별로 추가 (예: `pages/faddit/community/`, `pages/faddit/settings/`).

### 레이아웃 (Layouts)

| 경로 | 용도 |
|------|------|
| `src/layouts/AuthLayout.tsx` | 로그인/회원가입 등 인증 화면 공통 레이아웃 |
| `src/layouts/MainLayout.tsx` | 로그인 후 메인 앱 공통 레이아웃 (사이드바 등) |

### 컴포넌트

| 경로 | 용도 |
|------|------|
| `src/components/atoms/` | Atomic Design 기준 원자 단위 컴포넌트 (예: `Img.tsx`) |

앱 전용 컴포넌트는 `components/` 또는 `components/atoms/` 등에 두고, 필요 시 `components/faddit/` 같은 하위 폴더로 확장 가능.

### 상수·설정

| 경로 | 용도 |
|------|------|
| `src/constants/agreements.ts` | 약관 등 앱 전용 상수 |

### 이미지·에셋

- `src/images/icons/`: faddit 로고, 소셜 로고(naver, kakao, google) 등
- `src/images/faddit/`: Faddit 전용 이미지 (예: bg-main.jpg)
- `public/logo/`: 로고 등 public 에셋

### 유틸·라이브러리

- `src/lib/utils.js`: 공통 유틸 (예: `cn` 등) — 템플릿과 공유 가능

---

## 라우트 (App.tsx 기준)

Faddit 라우트는 아래와 같이 레이아웃으로 감싸져 있습니다.

| 경로 | 레이아웃 | 페이지 |
|------|----------|--------|
| `/faddit/sign/in` | AuthLayout | Login |
| `/faddit/sign/up` | AuthLayout | Signup |
| `/faddit/home` | MainLayout | FadditHome |
| `/faddit/main` | MainLayout | FadditMain |

- **AuthLayout**: 인증 전 전용
- **MainLayout**: 인증 후 앱 전용

---

## 규칙 요약

1. **앱 전용 페이지**는 `src/pages/faddit/` 아래에만 추가
2. **공통 레이아웃**은 `src/layouts/` 사용 (AuthLayout, MainLayout)
3. **가장 작은 UI 단위**는 `src/components/atoms/` 에 두기
4. **앱 전용 상수**는 `src/constants/` 에 두기
5. **템플릿 정리** 시에는 `docs/template-mosaic.md` 목록을 참고해 사용하지 않는 것부터 점진적으로 제거

---

## 문서 인덱스

- **템플릿 정보·제거 참고**: [template-mosaic.md](./template-mosaic.md)
- **Faddit 구조·규칙**: 이 문서 (faddit.md)
