현재 Vanilla JS 기반의 CBT SPA 웹앱(cbt0.github.io)을 고도화하고 있습니다.
기존에 작성한 '실시간 자동 저장 및 이어하기' 기능과 함께, 보안 강화를 위한 '전역 유휴 시간 자동 로그아웃(Global Idle Auto-Logout)' 기능을 js/app.js에 충돌 없이 통합하려고 합니다.

아래의 통합 요구사항을 엄격히 준수하여 코드를 수정 및 추가해 주세요.

[1. 전역 유휴 시간 로그아웃 구현]
- `let idleTimer;` 를 전역으로 선언하고, `resetIdleTimer()` 함수를 만들어 주세요.
- 유휴 제한 시간은 30분(30 * 60 * 1000 ms)으로 설정해 주세요.
- 사용자가 로그인(`login()`)에 성공한 직후부터 `resetIdleTimer()`를 최초 실행하여 백그라운드 카운트다운을 시작해 주세요.
- `document` 객체에 'mousemove', 'click', 'keydown', 'scroll', 'touchstart' 이벤트 리스너를 달아, 액션이 감지될 때마다 `resetIdleTimer()`를 호출해 타이머를 0으로 초기화해 주세요. (단, 로그인된 상태일 때만 작동해야 함)

[2. 로그아웃 함수(logout)의 충돌 방지 및 타이머 정리 (매우 중요)]
- 30분 유휴 시간이 만료되면 "장시간 조작이 없어 안전을 위해 자동 로그아웃 되었습니다."라는 alert 창을 띄우고 `logout()` 함수를 강제 호출해 주세요.
- `logout()` 함수 내부 로직 작성 시 주의사항:
  1) 절대 `localStorage.clear()`를 사용하지 마세요. (자동 저장된 이어풀기 데이터가 날아가는 것을 방지)
  2) `localStorage.removeItem('cbt_current_user')` 등 인증 관련 키만 명시적으로 삭제해 주세요.
  3) 시험 타이머인 `clearInterval(state.timerInterval)`을 반드시 실행하여 퀴즈 시계를 멈춰주세요.
  4) `switchTab('home')`을 호출하여 로그인 화면으로 돌려보내 주세요.

[3. 실시간 자동 저장(Auto-Save) 유지]
- 기존에 지시했던 `autoSaveSession()` 로직은 그대로 유지합니다.
- `startQuiz()`, `renderActiveQuestion()`, `handleSelectAnswer()` 함수가 끝나는 시점에 `autoSaveSession()`이 호출되도록 하여, 유휴 시간으로 강제 로그아웃이 되더라도 마지막 액션 시점의 과목, 회차, 문제번호, 마킹답안(`state.userAnswers`)이 완벽하게 보존되도록 보장해 주세요.


현재 저는 Vanilla JS 기반의 CBT SPA 웹앱(cbt0.github.io)을 고도화하고 있습니다.
기존의 로그인 폼(.login-box)에 사용자 편의성을 위한 '아이디 저장(Save ID)' 기능을 추가하려고 합니다. (비밀번호 저장은 보안상 구현하지 않습니다.)

아래 요구사항에 맞게 index.html과 js/app.js 코드를 수정해 주세요.

[HTML 수정 요구사항 (index.html)]
- .login-inputs 컨테이너 내부, 아이디(login-id)와 비밀번호(login-pw) 입력창 주변 적절한 위치에 '아이디 저장' 체크박스(<input type="checkbox" id="save-id-check">)를 추가해 주세요.
- 체크박스의 디자인이 기존 다크 테마(Glassmorphism)와 잘 어울리도록 CSS(style.css)도 조금 다듬어 주세요.

[JS 수정 요구사항 (app.js)]
1. 저장 로직:
   - 사용자가 로그인 버튼(login-submit-btn)을 눌러 로그인을 처리하는 `login()` 함수 내부에 로직을 추가합니다.
   - 인증이 성공했을 때, `#save-id-check`가 체크되어 있다면 `localStorage.setItem('cbt_saved_id', 입력한아이디)`를 실행하세요.
   - 만약 체크되어 있지 않다면 `localStorage.removeItem('cbt_saved_id')`를 실행하여 기존 기록을 지워주세요.
2. 불러오기 로직:
   - 앱이 처음 초기화되거나 홈 화면이 렌더링될 때 실행되도록 로직을 추가합니다.
   - `localStorage.getItem('cbt_saved_id')` 값이 존재한다면, 해당 값을 `#login-id` input의 value에 자동으로 채워 넣고 `#save-id-check`의 상태를 checked로 설정해 주세요.

---

## 개발 계획 (Development Plan)

자동 로그아웃 및 아이디 저장 기능의 구체적인 구현을 위한 세부 개발 계획입니다.

### 1. HTML 및 CSS 레이아웃 설계 (`index.html`, `css/style.css`)
- **로그인 박스 구조 개선:**
  - `index.html`에서 기존 `.login-inputs`를 감싸는 `.login-inputs-wrapper`를 생성하여 아래와 같이 레이아웃을 다단(Column) 구조로 배치합니다.
  - Wrapper 구조:
    ```html
    <div class="login-inputs-wrapper">
        <div class="login-inputs">
            <!-- 사용자 ID / 비밀번호 input-field -->
        </div>
        <div class="login-options">
            <label for="save-id-check" class="save-id-label">
                <input type="checkbox" id="save-id-check">
                <span>아이디 저장</span>
            </label>
        </div>
    </div>
    ```
- **설정 화면에 자동 로그아웃 시간 조절 UI 추가:**
  - `index.html` 내의 설정 화면(`.settings-list` 내부)에 자동 로그아웃 대기 시간을 선택할 수 있는 드롭다운 메뉴를 배치합니다.
    ```html
    <div class="settings-item">
        <div class="settings-info">
            <span class="settings-label">자동 로그아웃 시간</span>
            <span class="settings-desc">마우스 이동 등 조작이 없을 때 안전을 위해 로그아웃되는 유휴 시간입니다.</span>
        </div>
        <select id="auto-logout-select" class="settings-select">
            <option value="10">10분</option>
            <option value="30" selected>30분</option>
            <option value="50">50분</option>
        </select>
    </div>
    ```
- **CSS 테마 디자인 (`css/style.css`):**
  - **체크박스 스타일:** 브라우저 기본 체크박스 대신 `appearance: none;` 처리 후, 은은한 배경(`rgba(255,255,255,0.05)`)과 투명 테두리를 설정합니다. 체크 시 메인 테마 색상(`var(--primary)`)과 Font Awesome 체크 아이콘(`\f00c`) 가상 요소를 적용해 고급스럽게 표현합니다.
  - **설정 드롭다운 스타일:** `.settings-select` 클래스를 생성하여 Glassmorphism 디자인 언어에 맞게 어두운 배경, 얇은 반투명 테두리, 그리고 깔끔한 화살표 아이콘을 포함하는 셀렉트 박스 스타일을 작성합니다.

### 2. State & DOM 객체 매핑 (`js/app.js`)
- `state` 전역 객체에 자동 로그아웃 설정 시간 필드를 추가합니다.
  - `state.autoLogoutMinutes = 30;` (기본값 30분)
- `const dom` 객체에 새로운 DOM 요소들을 매핑합니다.
  - `saveIdCheck: document.getElementById('save-id-check')`
  - `autoLogoutSelect: document.getElementById('auto-logout-select')`

### 3. 아이디 저장 기능 구현
- **로그인 성공 시 저장 로직 (`login()`):**
  - 로그인 성공 핸들러 내부에서 `#save-id-check` 체크 여부를 판별하여, 체크되어 있으면 `localStorage.setItem('cbt_saved_id', username)`을 실행하고 없으면 삭제합니다.
- **자동 불러오기 로직:**
  - `checkLoginState()` 호출 시점 혹은 초기 로드 단계에서 `localStorage.getItem('cbt_saved_id')` 값을 조회하여 존재하면 `#login-id` input의 가치(value)로 채우고 `#save-id-check`를 체크 상태로 전환합니다.

### 4. 전역 유휴 시간 로그아웃 기능 구현 (`js/app.js`)
- **설정 값 저장 및 로딩:**
  - 앱 초기화 단계에서 `localStorage.getItem('cbt_auto_logout_minutes')` 값을 읽어 `state.autoLogoutMinutes`에 할당합니다.
  - 설정 창의 `#auto-logout-select` 값이 변경(`change` 이벤트)되면 이 값을 업데이트하고 `localStorage`에 기록한 뒤 `resetIdleTimer()`를 실행하여 즉시 반영합니다.
- **전역 변수 및 타이머 함수 정의:**
  - `let idleTimer;` 전역 선언.
  - `function resetIdleTimer()`: `state.autoLogoutMinutes`를 참조하여 밀리초 단위 시간(분 * 60 * 1000)으로 카운트다운하는 `setTimeout`을 시작/재설정합니다.
  - 시간 경과 시 경고 얼럿창을 띄우고 `logout()`을 호출합니다.
- **이벤트 감지 리스너 연동:**
  - `document` 객체에 `mousemove`, `click`, `keydown`, `scroll`, `touchstart` 이벤트를 등록하여 조작이 감지될 때마다 `state.currentUser` 로그인 여부를 확인 후 `resetIdleTimer()`를 호출합니다.
- **로그인 및 로그아웃 연동:**
  - `login()` 직후 `resetIdleTimer()`를 작동하여 타이머를 가동하고, `logout()` 호출 시 `clearTimeout(idleTimer)`로 유휴 타이머를 확실히 소멸시킵니다.

### 5. 로그아웃 동작 안정성 확보 및 세션 보존
- **로그아웃(`logout()`) 함수 고도화:**
  - 로컬스토리지를 일괄 삭제(`localStorage.clear()`)하는 대신, 사용자 인증 데이터(`cbt_current_user`)만 제거하여 **세션 자동저장 데이터가 훼손되지 않도록** 보장합니다.
  - 진행 중이던 시험 타이머 `clearInterval(state.timerInterval)`을 확실하게 호출하여 백그라운드 스크립트 실행을 중지합니다.
  - `switchTab('home')`을 통해 자연스럽게 홈 화면으로 되돌려 보냅니다.


