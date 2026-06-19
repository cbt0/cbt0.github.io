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
