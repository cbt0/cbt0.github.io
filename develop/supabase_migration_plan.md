# 20260619 18:20 Supabase 마이그레이션 계획서

목적
- `cbt0.github.io`의 클라이언트(localStorage 기반)를 Supabase(Auth + PostgreSQL)로 마이그레이션하여 글로벌 순위, 진도 동기화, 영구 저장을 구현.

전제
- Supabase 프로젝트 URL: https://yjtfdxeuslkjyxklitsp.supabase.co
- 클라이언트에는 **Publishable (anon / sb_publishable_...)** 키만 사용. 서버 전용 **sb_secret_...** 키는 절대 공개 저장소에 저장 금지.

전체 단계 요약
1. 브랜치 생성: `supabase` 브랜치를 새로 만듭니다. (권장)
2. DB 스키마 생성: `profiles`, `user_stats`, `cbt_progress`, `user_logs` 테이블 생성 SQL 실행
3. RLS 활성화 및 정책 설정: `auth.uid()` 기반으로 본인 데이터만 CRUD 허용
4. 프론트엔드 연동: `js/app.js`에 Supabase 초기화 및 `login`/`logout`/`submitExam`/`loadProgress` 리팩토링
5. 테스트: 대시보드에서 테스트 계정 생성 후 로컬에서 시나리오 검증
6. 배포: PR → 코드리뷰 → `main` 병합 → GitHub Pages 재배포

권장 DB 스키마 (SQL)
-- profiles
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  created_at timestamptz DEFAULT now()
);

-- user_stats
CREATE TABLE user_stats (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  total_solved int DEFAULT 0,
  total_exams_attempted int DEFAULT 0,
  passed_exams_count int DEFAULT 0,
  average_sum int DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

-- cbt_progress (사용자별 과목 진행/점수 기록)
CREATE TABLE cbt_progress (
  id bigserial PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  round_key TEXT NOT NULL,
  score int,
  total int,
  percent int,
  time_seconds int,
  created_at timestamptz DEFAULT now()
);

-- user_logs
CREATE TABLE user_logs (
  id bigserial PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT,
  message TEXT,
  created_at timestamptz DEFAULT now()
);

RLS(권장) — 모든 테이블에 대해 RLS 활성화 및 기본 정책 예시
-- 예: user_stats
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_manage_own_stats"
  ON user_stats
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_edit_own"
  ON profiles
  FOR ALL
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- cbt_progress
ALTER TABLE cbt_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "progress_insert_own"
  ON cbt_progress
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "progress_select_own"
  ON cbt_progress
  FOR SELECT
  USING (auth.uid() = user_id);

-- user_logs
ALTER TABLE user_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "logs_own"
  ON user_logs
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

프론트엔드 초기화 (예시)
```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script>
  const SUPABASE_URL = 'https://yjtfdxeuslkjyxklitsp.supabase.co';
  const SUPABASE_KEY = 'YOUR_PUBLISHABLE_KEY_HERE'; // sb_publishable_xxx
  const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
</script>
```

프론트엔드 리팩토링 포인트
- `login()` : `supabase.auth.signInWithPassword({ email, password })` 사용 (아이디->가상 이메일 변환 가능)
- `logout()` : `supabase.auth.signOut()` 호출
- `submitExam()` : 로컬 저장 유지 또는 upsert로 `cbt_progress`에 기록하고 `user_stats` 집계 업데이트
- `loadProgress()` : 클라이언트 시작 시 `cbt_progress`와 `user_stats`를 읽어 UI 동기화
- `logUserActivity()` : 간단한 이벤트는 `user_logs`에 insert

테스트 체크리스트
- SQL을 Supabase SQL Editor에서 실행하여 테이블 생성 확인
- RLS 켜져 있을 때 publishable 키로 데이터 쓰기/읽기 동작 확인
- 테스트 유저 생성: Supabase Auth -> Add user (email, password)
- 브랜치 `supabase`에서 커밋 및 PR 생성

배포 및 보안
- `sb_secret_...` (service role)은 서버 전용으로만 사용
- GitHub Actions나 서버에서 백엔드 작업이 필요하면 `sb_secret_...`를 GitHub Secrets에 저장

다음 행동 제안
- 제가 위 SQL을 직접 준비해서 복사 가능한 블록으로 남겨드렸습니다. 원하시면 저는 다음으로 `js/app.js`에 초기화 코드와 `login()` 리팩토링 패치를 작성하겠습니다.


---
작성자: 자동문서화 by Copilot

## 20260619 수행 작업 기록

요약: 아래 변경은 로컬 개발 환경에서 클라이언트-사이드 연동을 빠르게 테스트하기 위해 적용한 내용입니다. 서버 비밀키(`sb_secret_...`)는 절대 코드에 넣지 않았습니다.

1) HTML 변경
- 파일: `index.html`
- 작업: Supabase JavaScript SDK(CDN)를 `js/app.js` 로드 이전에 추가했습니다. (이로써 `window.supabase`를 사용할 수 있습니다.)

2) 클라이언트 자바스크립트 변경
- 파일: `js/app.js`
- 작업: Supabase 클라이언트 초기화를 실제 프로젝트 URL과 publishable 키(`sb_publishable_...`)로 설정했습니다. 또한 기존의 로컬 전용 인증(고정 비밀번호)을 Supabase Auth 기반으로 리팩토링했습니다:
  - `login()` → `supabase.auth.signInWithPassword(...)` 사용. 로그인 성공 시 `profiles`와 `user_stats`를 upsert하여 기본 레코드를 생성합니다.
  - `logout()` → `supabase.auth.signOut()` 호출로 세션 종료.
  - `logUserActivity()` → 로컬 로그 유지 + Supabase `user_logs` 테이블에 비동기 기록 시도(실패해도 UI 차단하지 않음).

3) DB / RLS
- 작업: 테이블 생성 및 RLS 정책 적용용 SQL 스크립트를 준비하여 문서에 포함했습니다(`profiles`, `user_stats`, `cbt_progress`, `user_logs`).
- 상태: 해당 SQL은 아직 Supabase SQL Editor에서 실행되지 않았습니다. (실행 권한은 사용자가 Supabase 콘솔에서 직접 수행해야 합니다.)

4) 안전 및 권장사항
- 클라이언트 코드에는 `sb_publishable_...` (publishable)만 사용해야 합니다. `sb_secret_...`(service role)는 절대 클라이언트에 노출하지 않습니다.
- SQL 실행 전 반드시 백업 또는 개발용 프로젝트에서 테스트하세요.

Rollback (간단)
- `index.html`에서 추가한 CDN 라인을 제거하면 SDK가 로드되지 않습니다.
- `js/app.js` 변경은 커밋으로 관리되므로 되돌리려면 git에서 해당 파일을 이전 커밋으로 리셋하세요.

다음 작업 제안
- 제가 지금 변경한 파일들을 로컬에서 개별 커밋하겠습니다(요청하신 커밋 포맷으로). 원하시면 커밋 메시지를 수정할 수 있습니다.

