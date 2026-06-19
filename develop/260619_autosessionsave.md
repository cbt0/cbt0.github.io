## 260619 10:28 auto session save
현재 저는 Vanilla JS와 HTML/CSS 기반의 반응형 SPA CBT 문제풀이 웹앱을 고도화하고 있습니다.
기존 시스템에 '완벽한 실시간 자동 저장(Auto-Save)'과 로그인 직후 바로 학습을 재개할 수 있는 '이어하기(Resume)' 기능을 도입하고자 합니다.

아래 요구사항에 맞게 index.html과 js/app.js 파일을 수정해 주세요.

[HTML (index.html) 수정 요구사항]
1. 로그아웃 버튼 이동: 로그인 환영 박스(.welcome-box) 내부에 있던 기존 '로그아웃' 버튼 코드를 삭제하고, 해당 버튼을 설정 탭(#settings-screen 또는 .settings-list 내부)으로 이동시켜 주세요.
2. 이어하기 버튼 생성: 로그아웃 버튼이 빠진 원래 그 자리(.welcome-box 내부)에 `id="home-resume-btn"` 속성을 가진 이어하기 버튼(<button class="btn btn-primary">)을 새로 생성해 주세요.

[JS (app.js) 수정 요구사항]
1. 자동 저장 함수 생성: 
   - `autoSaveSession()` 이라는 함수를 만들어 주세요.
   - 현재 로그인한 유저의 ID를 기반으로 `localStorage`에 현재 시험 상태를 JSON 형태로 저장해야 합니다.
   - 저장할 데이터: 현재 과목 및 회차명(`state.activeRound`), 현재 문제 인덱스(`state.activeQuestionIndex`), 지금까지 마킹한 답안 배열(`state.userAnswers`).

2. 자동 저장 트리거 연결 (총 3곳):
   - 시험 시작 시: `startQuiz()` 함수의 맨 마지막 부분(모든 state 초기화 및 1번 문제 렌더링, 탭 전환이 끝난 직후)에 호출하세요.
   - 화면 이동 시: '이전/다음' 버튼이나 OMR 마킹판을 눌러 문제 화면이 전환될 때 실행되는 `renderActiveQuestion()` 함수의 마지막 부분에 호출하세요.
   - 답안 마킹 시: 사용자가 보기를 클릭하여 답을 고르는 `handleSelectAnswer()` 함수의 마지막 부분(답안이 state에 기록된 직후)에 호출하세요.

3. 홈 화면 이어하기 버튼 UI 제어:
   - 로그인이 성공하여 홈 화면이 렌더링될 때, `localStorage`를 검사하여 유저의 최근 학습 기록이 있는지 확인해 주세요.
   - 기록이 있다면 `#home-resume-btn`의 텍스트를 "▶ 이어하기 : [과목명] [회차명] (Q. [문제번호])" 형태로 변경하고 버튼을 노출해 주세요. 기록이 없다면 버튼을 숨겨주세요.

4. 이어하기 실행 로직 연결:
   - `#home-resume-btn`을 클릭하면 작동하는 이벤트 리스너를 작성해 주세요.
   - 실행 흐름: localStorage에 저장된 과목/회차, 문제 인덱스(`state.activeQuestionIndex`), 그리고 가장 중요한 **마킹된 답안 배열(`userAnswers`)**을 전역 `state` 객체에 먼저 복구해 주세요.
   - 그 다음 퀴즈 화면으로 강제 전환(`switchTab('quiz')`)시키고 화면을 그려주어 곧바로 마지막 상태부터 이어서 풀 수 있게 연결해 주세요.
   - (주의: 기존 `startQuiz()` 함수를 재사용할 경우 `userAnswers`가 다시 빈 배열로 초기화되지 않도록 복구 순서나 예외 처리(isResume 플래그 등)에 각별히 신경 써서 완벽한 코드를 짜주세요.)

---

## 개발 계획 (Development Plan)

세션 자동 저장 및 이어하기 기능의 구체적인 구현을 위한 세부 개발 계획입니다.

### 1. HTML 구조 수정 (`index.html`)
- **로그아웃 버튼 이동:**
  - 홈 화면의 사용자 환영 영역(`.welcome-box` / `#welcome-container` 내부)에 있는 `logout-btn`을 제거합니다.
  - 설정 화면(`#settings-screen` 내부의 `.settings-list`)에 새로운 `.settings-item`을 추가하고, 여기에 `logout-btn`을 배치합니다.
- **이어하기 버튼 생성:**
  - 로그아웃 버튼이 제거된 `.welcome-box` 내부에 이어하기 버튼을 추가합니다.
  - 태그 형식: `<button class="btn btn-primary btn-sm hidden" id="home-resume-btn">▶ 이어하기</button>` (초기에는 숨김 처리)

### 2. State & DOM 객체 매핑 (`js/app.js`)
- `const dom` 객체에 `homeResumeBtn: document.getElementById('home-resume-btn')`를 추가하여 새로 생성된 버튼을 매핑합니다.

### 3. 세션 자동 저장 기능 구현 (`autoSaveSession()`)
- **함수 정의:** `function autoSaveSession()`
- **동작 방식:**
  - 유저 세션 키: `cbt_${state.currentUser}_autosave_session`
  - 현재 유저가 로그인해 있고, 풀이 상태(`state.quizMode === 'solving'`)이며, 활성화된 시험 정보(`state.activeRound`)가 있을 때만 자동 저장을 수행합니다.
  - **저장 데이터 구조:**
    ```json
    {
      "subject": "activeSubject(예: gas)",
      "activeRound": "state.activeRound 객체 전체",
      "activeQuestionIndex": "state.activeQuestionIndex (현재 보고 있는 문제 번호 인덱스)",
      "userAnswers": "state.userAnswers (마킹 정보 객체)",
      "timeSpentSeconds": "state.timeSpentSeconds (누적 풀이 시간)"
    }
    ```
- **자동 저장 트리거 연동:**
  - **트리거 1 (시험 시작):** `startQuiz()` 함수의 끝부분(`switchTab('quiz')` 직후)에 `autoSaveSession()` 추가
  - **트리거 2 (화면 이동):** 문제 번호가 변경되거나 화면이 렌더링될 때 호출되는 `renderActiveQuestion()` 끝부분에 `autoSaveSession()` 추가
  - **트리거 3 (마킹 선택):** 답안을 마킹하는 `handleSelectAnswer()` 함수 내에서 `state.userAnswers`가 업데이트된 직후 `autoSaveSession()` 추가
- **세션 초기화 (Clear Session):**
  - 시험을 최종 제출하는 `submitExam()` 시점에 `localStorage.removeItem(`cbt_${state.currentUser}_autosave_session`)`을 호출하여 완료된 세션을 제거합니다.

### 4. 홈 화면 이어하기 버튼 제어 (`updateHomeResumeButton()`)
- **함수 정의:** `function updateHomeResumeButton()`
- **동작 방식:**
  - 로그인 상태이면서 해당 사용자의 `localStorage`에 자동 저장 데이터(`cbt_${state.currentUser}_autosave_session`)가 존재하면,
    - 버튼 텍스트를 `"▶ 이어하기 : [과목명] [회차명] (Q. [문제번호])"` 형태로 업데이트합니다.
      - 예시: `▶ 이어하기 : 가스기능사 2025년 샘플 기출회차 (Q. 1)`
    - 버튼의 `hidden` 클래스를 제거하여 노출합니다.
  - 자동 저장 데이터가 없다면 버튼을 숨김 처리(`hidden` 클래스 추가)합니다.
- **연동 위치:**
  - `checkLoginState()`가 성공하여 홈 화면을 그릴 때 호출
  - `login()`이 성공적으로 처리된 직후 호출
  - 로그아웃(`logout()`) 시 또는 시험 제출 시 버튼을 숨기기 위해 호출

### 5. 이어하기 실행 및 State 복구 로직 구현
- **기존 `startQuiz(round)` 함수 확장:**
  - `startQuiz(round, isResume = false)` 형태로 인자를 변경합니다.
  - `isResume`이 `true`로 넘어올 경우, `state.activeQuestionIndex = 0`, `state.userAnswers = {}`, `state.timeSpentSeconds = 0` 초기화 단계를 건너뜁니다.
- **이어하기 이벤트 리스너 등록:**
  - `#home-resume-btn` 클릭 시:
    1. 로컬스토리지에서 세션 데이터를 파싱합니다.
    2. 전역 `state` 변수들을 복구합니다.
       - `state.activeSubject = session.subject;`
       - `state.activeRound = session.activeRound;`
       - `state.currentQuestions = session.activeRound.questions;`
       - `state.activeQuestionIndex = session.activeQuestionIndex;`
       - `state.userAnswers = session.userAnswers || {};`
       - `state.timeSpentSeconds = session.timeSpentSeconds || 0;`
    3. `startQuiz(session.activeRound, true)`를 호출하여 타이머를 재개하고, 퀴즈 탭으로 화면을 전환한 뒤 OMR과 문제를 그려줍니다.

