# Faddit FE v2 요구사항 정의서 (현행 구현 기준)

## 1. 문서 목적

- 본 문서는 `faddit-fe-v2` 프론트엔드 코드베이스의 **현재 구현 상태**를 기준으로 서비스 요구사항을 정의한다.
- 신규 기획 요구가 아닌, 실제 코드에서 확인된 기능/흐름/제약을 명시한다.

## 2. 범위

- 포함: Faddit 전용 라우트, 인증, Drive, Worksheet(뷰어/에디터), 휴지통, 검색, 상태관리, API 연동.
- 제외: Mosaic 템플릿 데모 페이지(이커머스/캠페인/컴포넌트 데모 등), 백엔드 내부 로직, 운영 인프라.

## 3. 시스템 개요

- 프론트엔드: React + Vite + Zustand + React Router.
- 인증/데이터 통신: Axios 기반 HTTP 클라이언트 + 토큰 리프레시 인터셉터.
- 주요 Faddit 라우트는 `src/App.tsx`에서 분리되어 관리됨.

## 4. 라우팅 요구사항

### 4.1 인증 라우트

- 로그인: `/faddit/sign/in`
- 회원가입: `/faddit/sign/up`
- 비밀번호 재설정: `/faddit/reset-password`

### 4.2 작업지시서 라우트

- 작업지시서 뷰: `/faddit/worksheet`, `/faddit/worksheet/:worksheetId`
- 작업지시서 v2 별칭: `/faddit/worksheet-v2`, `/faddit/worksheet-v2/:worksheetId`
- 작업지시서 편집: `/faddit/worksheet/edit/:worksheetId?`

### 4.3 Drive 라우트

- 드라이브: `/faddit/drive`, `/faddit/drive/:folderId`
- 휴지통: `/faddit/deleted`

### 4.4 기타

- 홈/메인: `/faddit/home`, `/faddit/main`

## 5. 기능 요구사항

### 5.1 인증(회원가입/로그인/세션)

#### FR-AUTH-01 로그인

- 사용자는 이메일/비밀번호로 로그인할 수 있어야 한다.
- 로그인 성공 시 드라이브 화면(`/faddit/drive`)으로 이동해야 한다.
- 로그인 실패 시 비밀번호 영역에 오류 메시지를 표시해야 한다.

#### FR-AUTH-02 아이디 저장

- 사용자가 아이디 저장을 선택하면 이메일을 `localStorage`에 저장해야 한다.
- 재방문 시 저장된 이메일을 로그인 폼에 자동 채움해야 한다.

#### FR-AUTH-03 회원가입 + 이메일 인증

- 회원가입 시 이름/이메일/비밀번호/약관 동의를 입력받아야 한다.
- 이메일 인증 요청 및 인증번호 검증(숫자 코드)을 수행해야 한다.
- 인증번호 유효시간(카운트다운) 및 재전송을 지원해야 한다.

#### FR-AUTH-04 비밀번호 재설정

- 이메일 기반 재설정 링크 발송을 지원해야 한다.
- `userId`/`passwordResetToken` 쿼리 파라미터가 있는 경우 토큰 유효성 검증 후 비밀번호 변경을 지원해야 한다.

#### FR-AUTH-05 세션 부트스트랩

- 앱 시작 시 세션 부트스트랩을 수행해야 한다.
- 토큰 리프레시 성공 시 사용자 정보가 불충분하면 `me` 조회로 보강해야 한다.
- 완료 여부를 전역 상태(`isSessionBootstrapped`)에 반영해야 한다.

### 5.2 Drive(파일/폴더/소재)

#### FR-DRIVE-01 폴더/파일 조회

- 루트/특정 폴더 기준 파일 및 폴더 목록을 조회/렌더링해야 한다.
- 최근 문서함 모드에서 최근 활동 기준 목록을 조회/표시해야 한다.

#### FR-DRIVE-02 폴더 생성

- 현재 폴더(또는 루트)에 폴더 생성이 가능해야 한다.

#### FR-DRIVE-03 파일 업로드 + 소재 생성

- 파일 업로드 후 생성된 `fileSystemId`로 소재 메타데이터를 생성할 수 있어야 한다.
- 소재 카테고리별 동적 필드 정의를 로드하고 입력 폼을 렌더링해야 한다.

#### FR-DRIVE-04 이동/드래그앤드롭

- 항목 단건/다건 이동을 지원해야 한다.
- 폴더를 자기 하위로 이동시키는 작업은 차단해야 한다.
- 사이드바/그리드/리스트 간 드래그앤드롭 이동이 가능해야 한다.

#### FR-DRIVE-05 즐겨찾기

- 파일/폴더 즐겨찾기 등록/해제를 지원해야 한다.
- 결과는 사이드바 즐겨찾기 섹션에 반영되어야 한다.

#### FR-DRIVE-06 삭제/복원

- 일반 삭제 시 휴지통으로 이동해야 한다.
- 최근 삭제 항목은 토스트 기반 되돌리기(복원)를 제공해야 한다.

#### FR-DRIVE-07 상세패널/수정

- 파일 선택 시 상세패널을 열어 메타정보를 표시해야 한다.
- 편집모드에서 파일명, 소재 속성, 이미지 변경 후 저장할 수 있어야 한다.
- 미저장 변경이 있을 경우 이탈 확인 모달을 통해 데이터 손실을 방지해야 한다.

#### FR-DRIVE-08 검색

- 키워드 및 카테고리 필터 기반 검색을 지원해야 한다.
- 검색 결과 총 개수를 표시해야 한다.

#### FR-DRIVE-09 활동 추적

- 폴더 진입/파일 열람/파일 수정 이벤트를 최근 활동 API에 기록해야 한다.

### 5.3 휴지통

#### FR-TRASH-01 조회

- 삭제된 폴더/파일 목록을 조회하고 그리드/리스트 뷰를 제공해야 한다.

#### FR-TRASH-02 복원

- 선택 항목 복원을 지원해야 하며, 계층 구조(상위/하위) 관계를 고려해 복원해야 한다.

#### FR-TRASH-03 완전 삭제

- 선택 항목 완전 삭제를 지원해야 하며 확인 절차를 거쳐야 한다.
- 완전 삭제 결과의 저장용량 변경값을 사용자 상태에 반영해야 한다.

### 5.4 Worksheet

#### FR-WS-01 작업지시서 생성

- Drive에서 작업지시서 생성 시 제목/기본 메타정보를 포함해 생성해야 한다.
- 생성 성공 시 해당 작업지시서 라우트로 이동해야 한다.

#### FR-WS-02 작업지시서 조회

- `worksheetId` 기반 상세 조회를 수행하고 제목/화면 상태를 초기화해야 한다.

#### FR-WS-03 Worksheet v2 화면

- 탭 기반 그리드 카드 레이아웃을 제공해야 한다(예: diagram/basic/size/cost).
- 카드 표시/숨김, 사용자 커스텀 카드, 레이아웃 변경을 지원해야 한다.

#### FR-WS-04 Worksheet 편집(legacy edit)

- 편집 화면은 문서 로드/수동저장/자동저장을 지원해야 한다.
- 저장 상태(저장중/저장완료/미저장)를 상단바에 반영해야 한다.

## 6. 데이터/상태 요구사항

### 6.1 인증 상태

- 사용자 정보, 인증 여부, 세션 부트스트랩 상태를 전역 저장소에 유지해야 한다.
- 인증 상태는 브라우저 저장소(`faddit-auth-store`)에 영속화되어야 한다.

### 6.2 Drive 상태

- 현재 폴더/경로/사이드바 트리/즐겨찾기/드래그 상태를 관리해야 한다.
- 파일별 소재 정보, 검색 로딩 상태, 최근활동 디버그 정보를 별도 스토어로 관리해야 한다.

### 6.3 Worksheet 상태

- v2 화면은 active tab, card layout, visibility, custom card, 문서 로딩 상태를 저장해야 한다.

## 7. API 연동 요구사항

- 인증 API: 가입/로그인/로그아웃/이메일인증/비밀번호재설정/토큰리프레시/내정보 조회.
- Drive API: 전체조회/최근/즐겨찾기/휴지통/이동/이름변경/별표/복원/삭제/완전삭제/파일업로드/검색/다운로드URL.
- Worksheet API: 생성/상세조회/업데이트(UI 정보 저장 포함).
- Material API: 필드정의 조회/소재 생성/파일연계 소재조회/수정.

## 8. 비기능 요구사항

- 인증 만료 시 자동 토큰 리프레시 후 원요청 재시도해야 한다.
- 주요 액션(삭제/복원/이동/즐겨찾기/저장)의 사용자 피드백(토스트/상태표시)을 제공해야 한다.
- 데스크톱/모바일을 고려한 반응형 레이아웃을 유지해야 한다.

## 9. 현재 구현 기반 제약/주의사항

- `/faddit/home`, `/faddit/main`은 실제 업무 흐름보다는 간단한 화면/샘플 성격이 강하다.
- 소셜 로그인 버튼 UI는 존재하나, 코드상 클릭 액션 연동은 구현되어 있지 않다.
- Worksheet 관련 라우트는 `worksheet`, `worksheet-v2`, `worksheet/edit`가 병행 운영되는 구조다.

## 10. 요구사항 근거 소스(핵심 파일)

- 라우팅: `src/App.tsx`
- 인증: `src/pages/faddit/auth/Login.tsx`, `src/pages/faddit/auth/Signup.tsx`, `src/pages/faddit/auth/ResetPassword.tsx`, `src/lib/api/services/authApi.ts`, `src/store/useAuthStore.ts`
- Drive: `src/pages/faddit/drive/Drive.tsx`, `src/pages/faddit/drive/DeletedDrive.tsx`, `src/context/DriveContext.tsx`, `src/partials/Drivebar.jsx`
- Worksheet: `src/pages/faddit/worksheet-v2/WorksheetV2.tsx`, `src/pages/faddit/worksheet-v2/WorksheetV2GridContent.tsx`, `src/pages/faddit/worksheet/Worksheet.tsx`, `src/pages/faddit/worksheet/WorksheetTopBar.tsx`
- API 엔드포인트: `src/lib/api/endpoints.ts`, `src/lib/api/services/driveApi.ts`, `src/lib/api/services/worksheetApi.ts`, `src/lib/api/services/materialApi.ts`
