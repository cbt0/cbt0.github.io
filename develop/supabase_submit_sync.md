# submitExam() 서버 동기화 구현 기록

작업 내용 요약

- 파일: `js/app.js`
- 변경: `submitExam()`에 Supabase 동기화 로직 추가
  - 시험 제출 시 로컬(localStorage)에 저장하던 기존 동작을 유지하면서, 로그인된 사용자에 한해 다음을 수행합니다.
    1. `cbt_progress` 테이블에 시험 결과를 insert
    2. `user_stats` 테이블을 조회하여 기존 집계를 가져오고, 이번 시험 결과를 반영해 upsert
    3. `syncDataFromCloud(userId, username)` 호출로 클라우드 데이터를 로컬에 덮어써 단일 소스 진실성 확보

설계 의도

- "클라우드 우선(Cloud-First) 동기화" 전략을 적용하여 다중 기기(스마트폰, PC) 사용 시 데이터 충돌 및 분기 상태를 방지합니다.
- 클라이언트는 항상 Supabase의 인증된 데이터를 신뢰하며, 로컬은 필요 시 클라우드 최신 상태로 덮어씁니다.

테스트 방법

1. Supabase에 미리 생성된 사용자가 있어야 합니다. (로그인 테스트)
2. 로컬에서 시험을 풀고 `제출` 버튼을 눌러주세요.
3. Supabase Table Editor에서 `cbt_progress`에 새 레코드가 생성되었는지 확인하세요.
4. `user_stats` 테이블에서 사용자의 누적 통계가 업데이트되었는지 확인하세요.
5. 다른 기기에서 동일 계정으로 로그인하면 `syncDataFromCloud()`에 의해 로컬이 서버 데이터로 덮어써집니다.

주의사항

- 클라이언트는 브라우저에서 실행되므로, Supabase의 publishable key만 사용합니다. 민감한 서비스 역할 키는 절대 클라이언트에 포함하지 마세요.
- RLS(정책)가 올바르게 설정되어 있어야 insert/upsert 권한이 부여됩니다. (예: auth.uid() 기준)

커밋 정보

- 변경 파일: `js/app.js`, `develop/supabase_submit_sync.md`
- 커밋 메시지 예: `js/app.js> submitExam 서버 동기화 추가 및 문서화`

문의

- E2E 테스트, 충돌 시 병합 전략(advanced merge), 또는 서버 사이드 마이그레이션 스크립트가 필요하시면 알려주세요.
