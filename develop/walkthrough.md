# Supabase Auth 연동 완료 보고서 (Walkthrough)

CBT 웹 앱의 로그인 및 로그아웃 방식을 기존 로컬의 하드코딩 방식(`password === 'dongbu'`)에서 클라우드 데이터베이스 서비스인 **Supabase Auth** 연동 방식으로 변경 및 적용을 완료했습니다.

## 변경 사항 요약 (Changes)

### 1. [index.html](file:///d:/git/cbt0.github.io/index.html)
* 하단 `js/app.js` 로드 바로 직전에 Supabase JS SDK (v2) CDN 스크립트 태그를 탑재했습니다.
```html
    <!-- Supabase JS Library -->
    <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
    <!-- Custom JavaScript -->
    <script src="js/app.js?v=1.1.8"></script>
```

### 2. [js/app.js](file:///d:/git/cbt0.github.io/js/app.js)
* **Supabase 클라이언트 초기화**:
  * 이전에 검증된 프로젝트 URL(`https://yjtfdxeuslkjyxklitsp.supabase.co`) 및 Publishable Key(`sb_publishable_DEJKbgIeEmgBMXb89lbVMw_TC4DXxDn`)를 사용하여 파일 맨 위에서 Supabase 클라이언트를 초기화했습니다.
* **로그인 함수(`login`) 리팩토링**:
  * `async/await` 비동기 처리를 도입하고 `supabase.auth.signInWithPassword` API를 연동했습니다.
  * 아이디 입력값 검사 후, 일반 아이디 형식(예: `dj`)인 경우 자동으로 `@cbt.com`을 접미사로 붙여서 이메일 형식(`dj@cbt.com`)으로 변환한 뒤 Supabase Auth 로그인을 요청하도록 자동 변환 로직을 통합했습니다.
  * 아이디에 `@`가 포함된 경우(예: `dj@gmail.com`)에는 변환 없이 입력된 이메일 계정을 그대로 사용하여 로그인합니다.
  * 로그인 성공 시 기존의 `localStorage` 연동 및 UI 동작(학습 과목 선택 활성화, 스크롤 이동, 세션 복구) 흐름을 그대로 유지하여 기존 기능이 안전하게 구동되도록 이식했습니다.
* **로그아웃 함수(`logout`) 리팩토링**:
  * 로그아웃 호출 시 `supabase.auth.signOut()`을 연동하여 Supabase 인증 세션도 함께 비동기로 끊어주도록 수정했습니다.

---

## 검증 계획 (Verification Plan)

### 수동 테스트 절차 (Manual Testing)
1. **로컬 웹 서버 시작**:
   터미널에서 `python3 -m http.server 8000`를 실행한 후 브라우저로 `http://localhost:8000`에 접속합니다.
2. **이메일형 ID 로그인 테스트**:
   * ID: `dj@gmail.com`
   * Password: `dj1000` (Supabase에 가입된 정보)
   * 정상적으로 로그인되어 홈 화면에 사용자 정보와 과목 선택 목록이 노출되는지 확인합니다.
3. **일반 ID 로그인 테스트**:
   * ID: `dj`
   * Password: `dj1000` (Supabase에 `dj@cbt.com` 계정이 등록되어 있어야 함)
   * 자동으로 `dj@cbt.com`으로 로그인되어 인증이 성공하는지 확인합니다.
4. **로그인 실패 케이스**:
   * 존재하지 않는 계정이나 잘못된 비밀번호를 입력했을 때 Supabase Auth가 반환하는 경고창(`로그인 실패: ...`)이 알맞게 노출되는지 확인합니다.
5. **로그아웃 테스트**:
   * 설정 탭에서 로그아웃 버튼 클릭 시 세션이 해제되고 로그인 폼으로 돌아가는지 확인합니다.
