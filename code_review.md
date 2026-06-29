# 🎓 CBT 웹 애플리케이션 상세 코드 분석 및 기술 명세서 (code_review.md)

본 문서는 최강 CBT 스타일 문제풀이 웹 애플리케이션의 핵심 소스 코드인 `index.html`, `js/app.js`, `css/style.css`를 정밀하게 분석하여 프로그램의 구조, 흐름, 상태 전이 및 함수별 세부 명세를 기록한 개발자 기술 검토서입니다.

---

## 📌 1. 전체 프로그램 아키텍처 및 실행 흐름도

애플리케이션은 **Vanilla JS와 SPA(Single Page Application) 패턴**을 취하고 있으며, 사용자의 브라우저 URL 해시(hash) 변화를 라우터가 감지하여 화면을 그리는 구조입니다.

### 🏗️ 전체 앱 실행 흐름도 (Application Lifecycle Flowchart)
```mermaid
graph TD
    %% Node Definitions
    START(["시작: DOMContentLoaded"]) --> INIT_THEME["테마 초기화: initTheme()"]
    INIT_THEME --> INIT_LOGOUT["유휴 로그아웃 설정 로드: initAutoLogoutSettings()"]
    INIT_LOGOUT --> CHECK_AUTH["로그인 상태 검사: checkLoginState()"]
    CHECK_AUTH --> LOAD_JSON["JSON DB 로딩: loadQuestions()"]
    LOAD_JSON --> REG_EVENTS["이벤트 리스너 바인딩: registerEventListeners()"]
    REG_EVENTS --> ROUTER["SPA 라우터 실행: router()"]
    
    %% Router Routing Paths
    ROUTER --> |"#home"| VIEW_HOME["홈 화면 노출<br>(비로그인 시 로그인 위젯, 로그인 시 과목 그리드)"]
    ROUTER --> |"#rounds/{subject}"| VIEW_ROUNDS["회차 선택 화면 노출<br>(renderRoundsList 실행)"]
    ROUTER --> |"#quiz"| VIEW_QUIZ["문제 풀이 화면 노출<br>(renderActiveQuestion 실행)"]
    ROUTER --> |"#grading"| VIEW_GRADING["성적 및 대시보드 탭 노출<br>(renderGradingDashboard 실행)"]
    ROUTER --> |"#settings"| VIEW_SETTINGS["설정 화면 노출"]

    %% Authentication Path
    VIEW_HOME --> |"아이디 & 비밀번호('dongbu') 입력"| AUTH_ACT{"로그인 인증"}
    AUTH_ACT --> |"실패"| AUTH_FAIL["오류 메시지 경고"]
    AUTH_ACT --> |"성공"| AUTH_SUCCESS["아이디 저장 판단 & currentUser 설정<br>ID별 통계 로드 및 이어하기 감지"]
    AUTH_SUCCESS --> RESET_IDLE["유휴 시간 타이머 시작: resetIdleTimer()"]
    RESET_IDLE --> VIEW_SUBJECTS["학습 과목 그리드 노출"]
    
    %% Exam Sequence
    VIEW_SUBJECTS --> |"과목 카드 선택"| ROUTER
    VIEW_ROUNDS --> |"회차 카드 클릭"| START_QUIZ["퀴즈 세션 시작: startQuiz()"]
    START_QUIZ --> |"타이머 구동 & userAnswers 초기화"| SOLVING_LOOP["문제 풀이 및 마킹 피드백 Loop"]
    SOLVING_LOOP --> |"답안 마킹 & 힌트 자동 활성화"| AUTOSAVE["세션 자동 저장: autoSaveSession()"]
    AUTOSAVE --> SOLVING_LOOP
    SOLVING_LOOP --> |"제출 버튼 클릭 / 전체 마킹 시"| SUBMIT_EXAM["시험 제출: submitExam()"]
    SUBMIT_EXAM --> STOP_TIMER["타이머 정지 및 게임 스코어 연산"]
    STOP_TIMER --> SAVE_STATS["로컬 통계 적재 & 로그/리더보드 기록"]
    SAVE_STATS --> SHOW_RESULT["결과 리포트 모달 활성화<br>(SVG Dashoffset 애니메이션)"]
    
    %% Review & Restart Path
    SHOW_RESULT --> |"오답 확인하기"| REVIEW_MODE["오답 검토: enterReviewMode()"]
    REVIEW_MODE --> |"틀린 문제 시각 장식 및 해설 노출"| ROUTER
    SHOW_RESULT --> |"완료"| ROUTER
```

---

## 📌 2. 구조 다이어그램 (Class & State Chart)

자바스크립트의 전역 상태 객체(`state`), DOM 엘리먼트 캐시(`dom`), 기출 매핑 정보 및 유휴 리스너들의 정적 연결 구조입니다.

```mermaid
classDiagram
    class State {
        +Object exams
        +String activeSubject
        +Object activeRound
        +Number activeQuestionIndex
        +Object userAnswers
        +String quizMode
        +Object timerInterval
        +Number timeSpentSeconds
        +Array currentQuestions
        +String questionFilter
        +String currentUser
        +Number autoLogoutMinutes
    }

    class DOM {
        +Object screens
        +Object nav
        +HTMLElement logo
        +HTMLElement themeToggle
        +HTMLElement loginSubmitBtn
        +HTMLElement loginFormContainer
        +HTMLElement welcomeContainer
        +HTMLElement welcomeUsername
        +HTMLElement loginId
        +HTMLElement loginPw
        +HTMLElement logoutBtn
        +HTMLElement homeResumeBtn
        +HTMLElement saveIdCheck
        +HTMLElement autoLogoutSelect
        +HTMLElement userActivityLogs
        +HTMLElement lastSolvedInfo
        +Object stats
        +HTMLElement roundsTitle
        +HTMLElement roundsList
        +HTMLElement roundsBackBtn
        +HTMLElement quizSubjectName
        +HTMLElement quizRoundName
        +HTMLElement timerText
        +HTMLElement markingSheet
        +HTMLElement quizProgressText
        +HTMLElement quizSubmitBtn
        +HTMLElement quizTopSubmitBtn
        +HTMLElement calculatorBtn
        +HTMLElement calculatorModal
        +HTMLElement calculatorHeader
        +HTMLElement calculatorDisplay
        +NodeList calculatorButtons
        +HTMLElement calculatorCloseBtn
        +HTMLElement reviewWrongBtn
        +HTMLElement questionFilter
        +HTMLElement leaderboardList
        +HTMLElement questionNum
        +HTMLElement questionText
        +HTMLElement choicesContainer
        +NodeList choices
        +HTMLElement prevBtn
        +HTMLElement nextBtn
        +HTMLElement hintBtn
        +HTMLElement explanationBox
        +HTMLElement explanationText
        +HTMLElement resultModal
        +HTMLElement resultScore
        +HTMLElement resultPercent
        +HTMLElement resultStatusBadge
        +HTMLElement resultTimeSpent
        +HTMLElement resultCorrectCount
        +HTMLElement resultWrongCount
        +HTMLElement resultMsgText
        +HTMLElement resultReviewBtn
        +HTMLElement resultCloseBtn
        +HTMLElement scoreRingBar
        +HTMLElement questionJumpModal
        +HTMLElement questionJumpGrid
        +HTMLElement questionJumpCloseBtn
    }

    class SubjectDetails {
        +home: Object
        +gas: Object
        +energy_craftsman: Object
        +energy_industrial: Object
        +energy_master: Object
        +air_conditioning: Object
    }

    class App {
        +idleTimer: Timer
        +initTheme()
        +initAutoLogoutSettings()
        +checkLoginState()
        +loadQuestions()
        +registerEventListeners()
        +router()
    }

    App --> State : 상태를 갱신 및 참조
    App --> DOM : UI를 제어 및 이벤트 매핑
    App --> SubjectDetails : 과목 명칭 검색
```

---

## 📌 3. 흐름 시나리오 (Sequence Chart)

### 시나리오 A: 로그인 처리, 세션 세이브 및 퀴즈 시작 흐름
```mermaid
sequenceDiagram
    autonumber
    actor User as 사용자
    participant UI as index.html
    participant JS as js/app.js
    participant LS as LocalStorage
    
    User ->> UI: 아이디 / 비밀번호(dongbu) 입력 & 로그인 클릭
    UI ->> JS: login() 함수 실행
    alt 인증 실패
        JS -->> User: 경고창(Alert): 비밀번호 불일치
    else 인증 성공
        JS ->> LS: 아이디 저장 여부에 따라 cbt_saved_id 셋/제거
        JS ->> LS: cbt_current_user 설정
        JS ->> JS: checkLoginState() & updateHomeResumeButton()
        JS ->> JS: resetIdleTimer() 유휴 로그아웃 카운트 가동
        JS -->> UI: 로그인 영역 은닉 및 과목선택 그리드 페이드인 노출
    end
    
    User ->> UI: 과목 및 회차 카드 클릭
    UI ->> JS: startQuiz(round) 호출
    JS ->> JS: state 초기화 (userAnswers={})
    JS ->> JS: 타이머 setInterval 가동
    JS ->> UI: 1번 문제 & OMR 답안 마킹 시트 렌더링
    JS ->> LS: cbt_{user}_autosave_session 에 퀴즈 세션 최초 자동 저장
```

### 시나리오 B: 문항 선택, 피드백, 필터링 및 최종 제출 흐름
```mermaid
sequenceDiagram
    autonumber
    actor User as 사용자
    participant UI as index.html
    participant JS as js/app.js
    participant LS as LocalStorage

    User ->> UI: 1번 문항 보기 (예: 3번) 체크
    UI ->> JS: handleSelectAnswer(3) 실행
    JS ->> JS: state.userAnswers[0] = 3 기록
    JS ->> JS: renderActiveQuestion() 실행
    JS ->> UI: 선택한 보기에 정답/오답 컬러 입힘 & 해설 상자 자동 확장
    JS ->> LS: cbt_{user}_autosave_session 세션 실시간 누적 저장
    
    User ->> UI: 문제 표시 필터 변경 (예: 오답만 보기)
    UI ->> JS: questionFilter 이벤트 리스너 동작
    JS ->> JS: state.questionFilter = "wrong" 변경
    JS ->> JS: applyQuestionFilter()
    JS ->> JS: renderMarkingSheet() & updateMarkingStatus()
    JS -->> UI: OMR 시트에서 맞은 문제는 숨기고 틀린 문제만 노출
    
    User ->> UI: 시험 최종 제출 클릭
    UI ->> JS: submitExam() 실행
    JS ->> JS: clearInterval(timerInterval) 타이머 스톱
    JS ->> JS: 정답 개수 연산 & 합격 여부 판단
    JS ->> JS: 게임 스코어 연산 (점수 + 시간 보너스)
    JS ->> LS: 사용자별 학습 이력(cbt_logs_{user}) & 통계(cbt_global_stats) 갱신
    JS ->> LS: 리더보드 최고 기록(cbt_leaderboard) 갱신
    JS ->> LS: autosave 세션 및 이어하기 흔적 제거
    JS ->> JS: renderLeaderboard() 리더보드 순위 목록 즉시 갱신
    JS ->> JS: SVG Dashoffset 애니메이션 연산
    JS -->> UI: 결과 리포트 팝업 모달 노출 (SVG 원형 진행바 채워지는 효과)
```

### 시나리오 C: 드래그 앤 드롭 계산기 및 상수/점프 제어 흐름
```mermaid
sequenceDiagram
    autonumber
    actor User as 사용자
    participant UI as index.html
    participant JS as js/app.js

    User ->> UI: 계산기 버튼 클릭
    UI ->> JS: calculatorModal 활성화
    User ->> UI: 계산기 드래그 헤더 마우스다운 / 터치스타트
    UI ->> JS: dragStart() 좌표 캡처
    User ->> UI: 계산기 윈도우 드래그 이동
    UI ->> JS: dragMove() 실행 (touches / mouse 좌표 연산 후 style.left/top 갱신)
    JS -->> UI: 계산기 팝업 실시간 부드러운 이동
    
    User ->> UI: 계산기 내부 'π' 버튼 클릭
    UI ->> JS: constant-modal 활성화 (완전 불투명 창으로 덮음)
    User ->> UI: '물 비열(kJ) : 4.186' 상수 클릭
    UI ->> JS: document.click 위임 핸들러 감지
    JS ->> UI: 계산기 액정(calculator-display)에 '4.186' 입력
    JS ->> UI: constant-modal 비활성화
    
    User ->> UI: '=' 버튼 클릭
    UI ->> JS: handleCalculatorInput('=') 호출
    JS ->> JS: evaluateCalculatorExpression() 수식 검사 및 괄호 쌍 보정
    JS ->> UI: 계산된 결과 값 액정 출력
```

---

## 📌 4. 전역 변수 및 DOM 매핑 명세 (Static Variables & DOM Map)

### ① 설정 변수 명세
- **`subjectDetails` (Object)**: 과목 키값(`gas`, `energy_master` 등)과 화면에 렌더링될 과목명 및 실제 기출 데이터 여부(`isReal`)를 한데 모은 상수 맵입니다.
- **`mockExams` (Object)**: 기출 복원이 준비 중인 과목(에너지기능사, 공조기능사 등)에 대한 샘플 문제(3~4문항)를 담은 하드코딩된 데이터베이스 구조입니다.

### ② DOM 요소 바인딩 명세 (`dom` 객체)
스크립트 가동 속도 최적화 및 잦은 `document.getElementById` 호출 방지를 위해 아래와 같이 UI 요소들을 그룹화하여 최초 1회 로딩 시 캐싱합니다.

| 분류 | 변수명 (DOM ID / Selector) | 역할 |
| :--- | :--- | :--- |
| **화면** | `dom.screens.home`, `.rounds`, `.quiz`, `.grading`, `.settings` | SPA 각 페이지용 `<section>` 컨테이너 매핑 |
| **네비게이션** | `dom.nav.home`, `.quiz`, `.grading`, `.settings` | 상단 고정 헤더 메뉴 탭 버튼 매핑 |
| **로고/테마** | `dom.logo` (#logo-btn), `dom.themeToggle` (#theme-toggle) | 홈 이동 및 다크/라이트 테마 변경 버튼 |
| **로그인** | `dom.loginFormContainer`, `dom.welcomeContainer`, `dom.loginId`, `dom.loginPw` | 사용자 인증 폼 요소 및 로그인 세션 제어용 뷰 |
| **이어하기** | `dom.homeResumeBtn` (#home-resume-btn) | 홈 화면에 표시되는 복원 큐 |
| **대시보드** | `dom.userActivityLogs`, `dom.lastSolvedInfo`, `dom.stats.*` | 누적 활동 이력, 이어 풀기 카드, 누적 점수 통계 |
| **회차 선택** | `dom.roundsTitle`, `dom.roundsList`, `dom.roundsBackBtn` | 과목별 기출 회차 렌더링 공간 및 뒤로가기 제어 |
| **퀴즈 화면** | `dom.quizSubjectName`, `dom.quizRoundName`, `dom.timerText` | 메타 정보(과목명, 회차명) 바인딩 및 초시계 |
| **답안 시트** | `dom.markingSheet`, `dom.quizProgressText` | OMR 마킹 버튼 그리드 및 문항 진도율 정보 |
| **문제 카드** | `dom.questionNum`, `dom.questionText`, `dom.choices` | 문제 번호 뱃지, 문제 내용, 1~4번 보기 엘리먼트 |
| **액션 컨트롤** | `dom.prevBtn`, `dom.nextBtn`, `dom.hintBtn`, `dom.explanationBox` | 이전/다음 문제 전환, 해설 영역 온/오프 토글 제어 |
| **성적 모달** | `dom.resultModal`, `dom.resultScore`, `dom.scoreRingBar` | 제출 결과 팝업, SVG stroke-dashoffset 링 |
| **계산기** | `dom.calculatorModal`, `dom.calculatorDisplay`, `dom.calculatorHeader` | 공학 계산기 팝업, 드래그 손잡이 및 수식 입력 액정 |
| **점프 모달** | `dom.questionJumpModal`, `dom.questionJumpGrid` | 특정 문항으로 즉시 점프할 수 있는 번호판 팝업 |

---

## 📌 5. 함수(Functions) 명세 및 상세 분석표

`js/app.js`에 정의된 핵심 동작 로직의 명세서입니다.

| 함수명 | 입력 매개변수 | 반환값 (Type) | 상세 동작 및 부작용 (Side Effects) |
| :--- | :--- | :--- | :--- |
| `initTheme` | 없음 | 없음 | 로컬스토리지의 `cbt_theme`를 읽어 다크/라이트 테마를 바인딩합니다. |
| `toggleTheme` | 없음 | 없음 | `data-theme` 속성을 스왑하고 로컬스토리지 상태를 토글 갱신합니다. |
| `checkLoginState` | 없음 | 없음 | `cbt_current_user` 유무를 확인해 로그인 폼과 과목선택 섹션을 활성/은닉합니다. |
| `login` | 없음 | 없음 | ID 유효성 및 PW('dongbu') 인증 후 세션을 시작하고, 아이디 저장을 수행합니다. |
| `logout` | 없음 | 없음 | 인증 키를 로컬스토리지에서 지우고 퀴즈 타이머를 소멸시킨 후 홈 화면으로 튕겨냅니다. |
| `resetIdleTimer` | 없음 | 없음 | 유휴 시간 감지 `setTimeout`을 재가동합니다. 30분 초과 시 자동 로그아웃을 유도합니다. |
| `logUserActivity` | `msg` (String) | 없음 | 사용자 행위를 타임스탬프와 함께 로컬로그(`cbt_{user}_logs`) 배열 맨 앞에 주입합니다. |
| `loadQuestions` | 없음 | `Promise<void>` | `data/` 경로의 기출문제 JSON 데이터를 비동기 fetch하여 `state.exams`에 캐싱합니다. |
| `router` | 없음 | 없음 | URL 해시 상태를 해석하여 해당 SPA 뷰 섹션과 상단 네비게이션 활성 클래스를 토글합니다. |
| `renderRoundsList`| `subject` (String) | 없음 | 과목 JSON 데이터를 읽어 시리즈(`round.subject`) 단위로 그룹화한 후 1줄 단추들을 그립니다. |
| `startQuiz` | `round` (Object), `isResume` (Bool) | 없음 | 퀴즈 세션을 초기화하고, 타이머 인터벌을 가동시키며 1번 문제를 렌더링합니다. |
| `renderActiveQuestion`| 없음 | 없음 | 현재 인덱스의 문제를 문제 카드에 그리며, 풀이 여부에 따라 해설 상자를 열거나 닫습니다. |
| `handleSelectAnswer`| `choiceNum` (Number) | 없음 | 보기를 체크하면 정오답 피드백 색상을 주입하고, 해설을 열고, 진척을 자동 세이브합니다. |
| `doesQuestionMatchFilter`| `index` (Number) | `Boolean` | 특정 문항이 현재 필터(전체, 오답, 미제출)에 부합하는 상태인지 검증합니다. |
| `getAdjacentFilteredIndex`| `direction` (Number) | `Number/Null` | 필터 조건에 부합하는 이전(-1) 또는 다음(+1) 유효 문제 번호 인덱스를 탐색해 반환합니다. |
| `submitExam` | 없음 | 없음 | 문제를 채점하여 100점 점수 및 게임 스코어를 구하고, 통계 적재 후 모달창을 오픈합니다. |
| `reviewWrongAnswers`| 없음 | 없음 | 로컬스토리지의 이력을 역추적해 틀렸던 문항들만으로 이뤄진 가상 오답 회차를 기동합니다. |
| `renderLeaderboard` | 없음 | 없음 | 최고 게임 점수 순위표 데이터를 내림차순 정렬하여 순위 탭에 메달 배지와 함께 렌더링합니다. |
| `handleCalculatorInput`| `value` (String) | 없음 | 액정에 수식을 기입하며, 백스페이스, 초기화(C), 수식 연산(=) 처리를 분기 작동합니다. |
| `evaluateCalculatorExpression`| `expr` (String) | `Number` | 수식의 열려 있는 괄호를 완성하고 안전하게 계산해 줍니다. |
| `openQuestionJumpModal`| 없음 | 없음 | 문제 번호 뱃지 클릭 시 60문항의 동적 점프 그리드판 모달을 렌더링하고 출력합니다. |

---

## 📌 6. 핵심 소스 코드 파일별 기술 분석

### 1. HTML 마크업 아키텍처 ([index.html](file:///D:/git/cbt0.github.io/index.html))
- **SPA 뷰 스위칭 프레임**: 
  여러 HTML 페이지로 분기하는 대신 단일 도큐먼트 내에 다수의 `<section class="view-section">`을 배치하여 브라우저의 리스크를 없애고 렌더링 전환 효과를 유도합니다.
- **모달 오버레이 구조**: 
  결과 리포트, 계산기, 상수 선택, 문제 점프 팝업을 모두 최상위 레벨의 공통 모달 오버레이 구조(`.modal-overlay`)로 선언하여 `z-index` 충돌을 미연에 방지하고 일관된 오프너 제어(클래스 `.active` 토글)가 가능하도록 통일했습니다.

### 2. 프리미엄 다크/라이트 CSS 디자인 시스템 ([css/style.css](file:///D:/git/cbt0.github.io/css/style.css))
- **테마 변수 시스템**:
  `:root` 및 `[data-theme="light"]` 내에 배경색, 전경색, 유리 질감 테두리, 그림자, 주요 브랜드 컬러 변수를 선언하여 스크립트에서 단 한 줄의 제어로 테마 전체가 부드럽게 스왑되도록 빌드했습니다.
- **포인터 이벤트 충돌 차단**:
  계산기가 화면 우측에 항시 띄워진 채로 뒤쪽의 문항을 원활하게 클릭할 수 있도록 하기 위해, 오버레이 컨테이너에는 `pointer-events: none`을 주어 뚫리게 하고, 계산기 본체 카드에만 `pointer-events: auto`를 명시적으로 주어 터치 간섭 버그를 완벽하게 차단했습니다.
- **Nested Table 스타일**:
  지문 및 해설에 들어가는 중첩 표(`.nested-table`)의 테두리를 은은한 반투명 색상으로 장식하고 `white-space: normal` 속성을 주어 모바일 뷰포트 너비에 맞게 표 셀 내부 텍스트가 자동 개행되도록 설계했습니다.

### 3. 고성능 Vanilla JS 퀴즈 엔진 및 유틸리티 ([js/app.js](file:///D:/git/cbt0.github.io/js/app.js))
- **중복 배제 정렬 랭킹 알고리즘**:
  ```javascript
  const bestByUser = new Map();
  stored.forEach(entry => {
      const key = `${entry.userId}-${entry.summary}`;
      const existing = bestByUser.get(key);
      if (!existing || entry.gameScore > existing.gameScore) {
          bestByUser.set(key, entry);
      }
  });
  const bestRecords = Array.from(bestByUser.values());
  bestRecords.sort((a, b) => b.gameScore - a.gameScore);
  ```
  단순 랭킹이 아닌 동일 과목/회차의 최고 득점만을 추려 리더보드에 출력하는 구조를 JS 맵(`Map`) 객체와 키 매핑 조합으로 시간 복잡도 $O(N)$ 내에 고속 집계합니다.
- **괄호 자동 보정식 계산기 파서**:
  ```javascript
  const openParens = (current.match(/\(/g) || []).length;
  const closeParens = (current.match(/\)/g) || []).length;
  if (openParens > closeParens) {
      current += ')'.repeat(openParens - closeParens);
  }
  ```
  자연로그 `ln(` 나 루트 `sqrt(` 처럼 열린 괄호만 남은 채 사용자가 `=`를 누를 경우, 정규식 매칭을 통해 부족한 개수만큼 닫는 괄호를 수식 후미에 동적으로 이어 붙여 구문 오류(Syntax Error)를 방지하는 방어형 계산기 알고리즘을 담고 있습니다.
