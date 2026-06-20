# Supabase Auth 연동 및 로그인 구현 계획서

이 계획서는 프론트엔드로만 작동하던 CBT 문제풀이 서비스에 **Supabase Auth**를 연동하여 실제 사용자 계정으로 로그인 및 로그아웃을 처리하는 기능의 구현 방안을 정의합니다.

## User Review Required

> [!IMPORTANT]
> **Supabase 프로젝트 정보 확인**
> 이전에 사용하시던 설정 정보인 아래 URL과 Key를 사용하여 연동을 진행하고자 합니다. 만약 새로운 프로젝트를 사용하시거나 Key가 변경되었다면 알려주세요.
> * **Supabase URL**: `https://yjtfdxeuslkjyxklitsp.supabase.co`
> * **Publishable Key (anon key)**: `sb_publishable_DEJKbgIeEmgBMXb89lbVMw_TC4DXxDn`

> [!WARNING]
> **로그인 테스트 전 필수 작업**
> Supabase 대시보드(Authentication -> Users)에서 테스트 계정을 생성해 두셔야 실제 로그인이 가능합니다.
> * 예: 아이디 `testid`로 로그인하려면 `testid@cbt.com` 이메일로 사용자를 추가해야 합니다.
> * 대시보드의 Authentication -> Providers -> Email 설정에서 **Confirm email** 옵션은 비활성화(Off) 해두시는 것을 권장합니다.

## Proposed Changes

### [Frontend & Authentication Core]

Supabase SDK를 추가하고, 기존 `login()` 및 `logout()` 함수를 Supabase Auth API를 사용하도록 변경합니다.

---

#### [MODIFY] [index.html](file:///d:/git/cbt0.github.io/index.html)

* 파일 하단의 `js/app.js` 로드 직전에 Supabase JS 라이브러리(CDN) 스크립트를 추가합니다.

```html
    <!-- Supabase JS Library -->
    <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
    <!-- Custom JavaScript -->
    <script src="js/app.js?v=1.1.8"></script>
```

---

#### [MODIFY] [app.js](file:///d:/git/cbt0.github.io/js/app.js)

* **Supabase 클라이언트 초기화**: 파일 맨 위에 Supabase SDK 초기화 코드를 작성합니다.
* **`login()` 리팩토링**:
  * 고정된 비밀번호 `'dongbu'` 체크 대신 `supabase.auth.signInWithPassword`를 사용해 인증을 진행합니다.
  * 입력된 아이디가 이메일 형식이 아닐 경우 자동으로 `@cbt.com`을 붙여서 이메일 로그인 규격에 맞춥니다.
  * 인증 성공 시 기존 UI 상태 변화와 `localStorage` 저장을 동일하게 수행하여 기존 학습 통계, 활동 로그, 이어 풀기 로직이 깨지지 않게 보존합니다.
* **`logout()` 리팩토링**:
  * `supabase.auth.signOut()`을 비동기 호출하여 세션을 종료합니다.

```javascript
// js/app.js 파일 상단 추가 코드 예시
const SUPABASE_URL = 'https://yjtfdxeuslkjyxklitsp.supabase.co';
const SUPABASE_KEY = 'sb_publishable_DEJKbgIeEmgBMXb89lbVMw_TC4DXxDn';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
```

```javascript
// login 함수 리팩토링 예시
async function login() {
    const username = dom.loginId.value.trim();
    const password = dom.loginPw.value;

    if (!username) {
        alert('아이디를 입력해 주세요.');
        dom.loginId.focus();
        return;
    }
    if (!password) {
        alert('비밀번호를 입력해 주세요.');
        dom.loginPw.focus();
        return;
    }

    // 아이디를 이메일 형식으로 변환
    const email = username.includes('@') ? username : `${username}@cbt.com`;

    try {
        // Supabase Auth 로그인 시도
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (error) {
            alert('로그인 실패: ' + error.message);
            dom.loginPw.focus();
            return;
        }

        // 로그인 성공 시 이후 로직 (기존 로직 보존)
        localStorage.setItem('cbt_current_user', username);
        state.currentUser = username;

        // UI 전환 및 타이머 리셋 등
        dom.loginFormContainer.classList.add('hidden');
        dom.welcomeContainer.classList.remove('hidden');
        dom.welcomeUsername.innerText = username;
        dom.subjectSelectionSection.classList.remove('hidden');
        if (dom.loginSubmitBtn) dom.loginSubmitBtn.classList.add('hidden');

        updateHomeResumeButton();
        logUserActivity('로그인 성공');
        resetIdleTimer();

        setTimeout(() => {
            dom.subjectSelectionSection.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    } catch (e) {
        alert('로그인 처리 중 에러 발생: ' + e.message);
    }
}
```

```javascript
// logout 함수 리팩토링 예시
async function logout() {
    if (state.currentUser) {
        logUserActivity('로그아웃');
    }
    
    try {
        await supabase.auth.signOut();
    } catch (e) {
        console.error('Supabase 로그아웃 에러:', e);
    }

    localStorage.removeItem('cbt_current_user');
    state.currentUser = null;
    dom.loginId.value = '';
    dom.loginPw.value = '';
    
    if (idleTimer) clearTimeout(idleTimer);
    if (state.timerInterval) clearInterval(state.timerInterval);
    
    checkLoginState();
    switchTab('home');
}
```

## Verification Plan

### Manual Verification
1. **로컬 서버 실행**: `python3 -m http.server 8000` 등으로 서버 기동 후 접속.
2. **계정 확인**: Supabase Console에 등록해 둔 `testid@cbt.com` 계정 정보로 로그인 시도.
3. **아이디 변환 테스트**: 
   * `testid` 입력 시 -> 성공 여부 확인
   * `testid@cbt.com` 입력 시 -> 성공 여부 확인
4. **오동작 테스트**: 잘못된 비밀번호 입력 시 오류 메시지가 잘 나오는지 확인.
5. **로그아웃 테스트**: 로그아웃 시 세션이 완전히 정리되고 로그인 폼으로 회귀하는지 확인.
