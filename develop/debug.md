# 🐞 CBT 웹 애플리케이션 필터 바운싱 버그 분석 및 해결 보고서 (debug.md)

이 문서는 오답/미제출 필터가 적용된 상태에서 문항을 마킹하거나 탐색할 때, 사용자가 의도하지 않게 1번 문항으로 튕기던(Bouncing) 2가지 핵심 버그에 대한 원인 분석과 해결 결과를 기록한 기술 디버깅 보고서입니다.

---

## ⚠️ 1. 발견된 2가지 버그 현상

### 🐞 버그 1: 오답 필터 ON 상태에서 정답 마킹 시 1번 문제로 강제 이동
- **재현 경로**:
  1. 홈 화면에서 기출 회차를 시작합니다.
  2. 오답 필터를 활성화하고 틀린 문제(예: 5번 문항)로 이동합니다.
  3. 5번 문항에서 정답 보기를 클릭하여 문제를 맞힙니다.
- **실제 현상**: 5번 문항의 채점 결과(초록색 하이라이트)와 우측 하단의 해설 패널을 확인할 겨를도 없이, 화면이 즉시 첫 번째 오답 문항(1번 문제)으로 강제로 전환되어 버립니다.

### 🐞 버그 2: 필터 ON 상태에서 '다음' 버튼 클릭 시 1번 문제로 튕김
- **재현 경로**:
  1. 오답 필터를 켭니다.
  2. 5번 문항에서 '다음' 버튼을 클릭합니다.
- **실제 현상**: `getAdjacentFilteredIndex(1)`는 다음 오답 문항인 6번 문항을 올바르게 찾아내지만, 화면은 6번 문항이 아닌 1번 문항으로 튕겨서 렌더링됩니다.

---

## 🔍 2. 근본 원인 분석 (Root Cause Analysis)

두 버그의 원인은 **`renderActiveQuestion()` 내부에서 호출되던 `applyQuestionFilter()`의 중복 실행 및 관심사 분리 실패**에 있었습니다.

```javascript
// [개선 전 js/app.js]
function renderActiveQuestion() {
    applyQuestionFilter(); // 💥 모든 버그의 근원
    const q = state.currentQuestions[state.activeQuestionIndex];
    ...
}
```

### 1) 버그 1의 동작 매커니즘
- 사용자가 5번 문항의 정답을 마킹하는 순간, 5번 문항은 더 이상 "오답"이 아니게 됩니다 (`doesQuestionMatchFilter(5)`가 `false`를 반환).
- 답안 선택 후 화면을 갱신하기 위해 `renderActiveQuestion()`이 호출됩니다.
- 내부의 `applyQuestionFilter()`가 실행되면서 "현재 문항(5번)이 필터 조건에서 탈락했다"고 판정합니다.
- 이에 따라 `state.activeQuestionIndex`를 0번 인덱스부터 검색하여 첫 번째로 필터 조건에 부합하는 문항(1번 문제)으로 **덮어써서 변경**해버립니다.
- 결과적으로 5번 화면이 그려지지 않고 1번 화면이 렌더링됩니다.

### 2) 버그 2의 동작 매커니즘
- 사용자가 '다음' 버튼을 누르면 `nextQuestion()`에서 `getAdjacentFilteredIndex(1)`를 호출하여 다음 오답인 6번 인덱스를 정확히 찾아냅니다.
- `state.activeQuestionIndex = 6`으로 올바르게 설정한 후 `renderActiveQuestion()`을 호출합니다.
- 하지만 내부의 `applyQuestionFilter()`가 다시 한번 0번 인덱스부터 전체 문항을 재검색하여, `state.activeQuestionIndex`를 최초 매칭 지점(1번 문제)으로 강제로 덮어써서 튕겨버립니다.
- 즉, **이동을 계산하는 함수**(`getAdjacentFilteredIndex`)와 **그리는 중 강제 재필터링하는 함수**(`applyQuestionFilter`)가 충돌한 것입니다.

---

## ✅ 3. 버그 해결 방안 (Bug Fixes)

### 1️⃣ `renderActiveQuestion()`에서 필터 강제 재배치 코드 제거
- **수정 코드 ([js/app.js](file:///D:/git/cbt0.github.io/js/app.js))**:
  ```javascript
  // Render active question to view pane
  function renderActiveQuestion() {
      // applyQuestionFilter(); // 👈 과감히 삭제!
      const q = state.currentQuestions[state.activeQuestionIndex];
      if (!q) return;
      ...
  }
  ```
- **효과**: 렌더링 함수는 오직 **"현재 설정된 인덱스의 화면을 그리는 역할"**만 수행하도록 책임을 제한했습니다. 답을 맞혀 조건에서 탈락하더라도 그 자리에서 정답과 해설을 안전하게 확인할 수 있으며, 다음 버튼 클릭 시에도 연산된 인덱스로 정확히 이동합니다.

### 2️⃣ 필터 실행 조건 명확화 (관심사 분리)
- 필터링은 오직 **"사용자가 필터 드롭다운 값을 직접 변경했을 때"**에만 동작해야 합니다. 이 시나리오는 이미 이벤트 핸들러가 완벽히 보장하고 있습니다.
  ```javascript
  if (dom.questionFilter) {
      dom.questionFilter.addEventListener('change', (e) => {
          state.questionFilter = e.target.value;
          applyQuestionFilter(); // 👈 필터 설정을 변경했을 때만 실행!
          renderMarkingSheet();
          renderActiveQuestion();
      });
  }
  ```

### 3️⃣ 신규 세션 시작 시 필터 초기화 안전장치 추가
- 이전 퀴즈에서 오답 필터를 켠 상태로 새로운 시험을 시작할 경우, 첫 화면에서 OMR이 숨겨지거나 오작동하는 현상을 방지하기 위해 `startQuiz`에 필터 초기화 로직을 추가했습니다.
  ```javascript
  function startQuiz(round, isResume = false) {
      state.activeRound = round;
      state.currentQuestions = round.questions;
      if (!isResume) {
          state.activeQuestionIndex = 0;
          state.userAnswers = {};
          state.timeSpentSeconds = 0;
          state.questionFilter = 'all'; // 👈 신규 시작 시 필터 전체로 강제 초기화
          if (dom.questionFilter) {
              dom.questionFilter.value = 'all';
          }
      }
      ...
  }
  ```

---

## 🎯 4. Antigravity의 종합 의견 및 평가

- **평가**: 사용자가 주신 디버깅 분석과 숲과 나무를 동시에 보는 **비유(내비게이션과 동승자, 교실 안의 오답 학생)**는 버그의 본질을 100% 꿰뚫고 있습니다.
- **핵심 원칙 (관심사 분리 - Separation of Concerns)**:
  `renderActiveQuestion()`은 순수 뷰(View) 렌더링 함수이어야 하며, 렌더링 도중 전역 데이터나 라우팅 포커스(`activeQuestionIndex`)를 수정하는 사이드 이펙트(Side Effect)를 일으켜서는 안 됩니다.
- **단방향 데이터 흐름 (Unidirectional Data Flow)**:
  - **Before**: `renderActiveQuestion()`이 그리기 외에 `activeQuestionIndex`를 직접 덮어쓰는(Write) 책임을 가짐으로써 오작동 및 순환 충돌 발생.
  - **After**: `renderActiveQuestion()`은 `state`를 오직 **읽기(Read-Only)**만 하고, 상태의 변경(Mutation)은 오직 컨트롤러 영역(`nextQuestion`, `prevQuestion`, `#question-filter` 체인지 이벤트 핸들러)에서만 이루어지도록 통일하여 튕김 현상을 차단했습니다.
- **CSS 특정성(CSS Specificity) 및 장기적 유지보수성**:
  - **Before**: 정오답 버튼과 액티브 보더가 겹칠 때 `!important`를 선언하여 강제 덮어쓰기를 처리.
  - **After**: `!important`를 완전히 걷어내는 대신 결합 선택자(`.marking-btn.correct.active`, `.marking-btn.wrong.active`)를 명시하여 CSS 가중치 특정성(Specificity)을 자연스럽게 상향(`0, 3, 0` vs `0, 2, 0`)시켜 테두리 파란색이 우선하도록 유도했습니다. 특정성 충돌의 악순환을 예방하여 장기적 유지보수성을 극대화했습니다.

---

## 💻 5. 코드 변경 사항 (Git Commit Reference)

이 버그 수정에 대한 실제 소스 코드 변경 내역은 Git 커밋 내역에 안전하게 영구 기록되어 있습니다. 상세한 코드 Diff는 아래 커밋 해시를 통해 확인하실 수 있습니다:

- **커밋 해시**: [`aab1c88b83301838bed92b50a608d03b5635bf11`](https://github.com/cbt0/cbt0.github.io/commit/aab1c88b83301838bed92b50a608d03b5635bf11)
- **주요 수정 파일**:
  - [js/app.js](file:///D:/git/cbt0.github.io/js/app.js) (bouncing 버그 해결 및 전역 에러 로그 핸들러 추가)
  - [css/style.css](file:///D:/git/cbt0.github.io/css/style.css) (OMR 마킹 버튼의 활성화 특정성 가중치 수정)

---

## ✅ 6. 회귀 테스트 체크리스트 (Regression Test Checklist)

수정 완료 후 기능의 안전성 유지를 위해 수행해야 할 테스트 케이스 목록입니다.

- [ ] **오답 필터동작 확인 (버그1 해결)**: 오답 필터 ON → 특정 문항 정답 마킹 → 튕김 없이 그 자리에 유지되어 피드백과 해설 확인 가능한지 검증.
- [ ] **다음/이전 버튼 연동 (버그2 해결)**: 오답 필터 ON → 다음 문항 이동 → 1번으로 가지 않고 다음 번의 올바른 오답 번호로 정상 랜딩되는지 검증.
- [ ] **필터 드롭다운 변경 (회귀 방지)**: 퀴즈 푸는 중 필터 드롭다운 설정을 변경하면 첫 번째 매칭 문항으로 화면이 즉시 갱신되는지 검증 (`applyQuestionFilter`가 체인지 리스너에서 잘 생존하여 동작하는지 점검).
- [ ] **신규 세션 시작 시 필터 초기화**: 이전 시험에서 필터가 활성화되어 있었더라도, 다른 회차의 새 시험을 시작할 때 필터가 `'all'`로 자동 리셋되는지 검증.
- [ ] **마지막 문제 경계값**: 60번 문항에서 다음 문항 클릭 시 정상 방어 처리되는지 확인.
- [ ] **첫 문제 경계값**: 1번 문항에서 이전 문항 클릭 시 정상 방어 처리되는지 확인.

---

## ✅ 7. 마킹 시트 색상 표시 테스트 케이스 (OMR Sheet Color Validation)

사용자가 문제를 풀 때 OMR 번호의 실시간 정오답 상태를 검증하기 위한 회귀 테스트 항목입니다.

- [ ] **정답 선택 시**: 보기를 클릭하여 정답을 선택하면 OMR 번호의 배경색이 즉시 초록색(`.correct`)으로 변경되는지 검증.
- [ ] **오답 선택 시**: 보기를 클릭하여 오답을 선택하면 OMR 번호의 배경색이 즉시 빨간색(`.wrong`)으로 변경되는지 검증.
- [ ] **답 변경 시**: 이미 입력된 답안을 오답에서 정답으로 변경했을 때 OMR 배경색이 빨간색에서 초록색으로 갱신되는지 검증.
- [ ] **미선택 상태**: 답을 선택하지 않은 문항은 디폴트 회색 배경을 유지하는지 검증.
- [ ] **현재 위치 테두리 중첩**: 현재 풀고 있는 활성 문항은 배경색(초록/빨강/회색)과 상관없이 파란색 테두리(`.active`)가 중첩되어 시인성이 유지되는지 검증.
- [ ] **위치 이동 시 이전 테두리 소멸**: 다른 문제 번호로 이동했을 때 이전 문항의 파란색 테두리가 소멸하는지 검증.
- [ ] **타입 비교 정상 검증**: 로컬스토리지 복원이나 문자열 스왑 시에도 타입 불일치 에러 없이 `Number`로 안전하게 캐스팅 비교되는지 검증.

---

## 🏗️ 8. 과목별/회차별 누적 오답 DB 아키텍처 개편 내역

다양한 회차의 오답 문항들을 안정적으로 누적 관리하고, 특정 시점에 오답 복습 모드로 한꺼번에 풀 수 있도록 데이터 구조와 로직을 전면적으로 고도화했습니다.

### ① 식별자 이원화 설계 (Approach B)
* **런타임 퀴즈 세션 (`state.userAnswers`)**: 가상 오답 회차 내에서 발생할 수 있는 동일 문제 번호(예: 2017년 12번과 2018년 12번이 동일 가상 회차에 섞이는 상황) 간의 데이터 충돌을 원천 차단하기 위해, **배열 인덱스(`idx`: 0 ~ 59)** 기반 식별을 유지합니다.
* **영구 오답 저장소 (`wrongDb`)**: 개별 문항의 원본 소속을 유일하게 정의하기 위해 **`sourceQuestionKey` (`${subject}_${year}_${round}_${q.num}`)**를 도입하여 로컬스토리지에 저장합니다.

### ② Immutability(불변성) 준수 및 부작용 제거
* `startQuiz()` 진입 시 원본 문제 배열을 직접 수정(Mutation)하여 오염시키는 대신, `Array.prototype.map()`을 이용해 새 객체 배열로 복제하고 여기에 `sourceRoundKey` 및 `sourceQuestionKey` 메타데이터를 안전하게 동적 주입합니다.

### ③ 맞히면 졸업 (Graduation) 채점 정책
* `submitExam()` 실행 시 동작하는 `saveWrongHistory()`는 다음 정책을 수행합니다:
  - **틀린 문항**: 오답 DB(`cbt_${user}_wrong_db`)에 문제 내용과 메타데이터(`wrongCount`, `lastWrongAt`, `selectedAnswer`)를 저장 및 업데이트합니다.
  - **맞힌 문항**: 오답 DB에 해당 `sourceQuestionKey`가 존재하면 **완전 삭제**하여 오답 노트에서 졸업시킵니다.

### ④ 가상 회차 예외 및 안전장치
* 오답 복습 회차 기동 시 `sessionType: 'wrong-review'` 플래그를 회차 객체에 부여하고, `autoSaveSession()`에서 이 플래그를 감지하면 임시 세션 저장을 건너뜀으로써 불필요한 자동 저장 파일 오염을 차단했습니다.
* 홈 화면에서 세션을 복원하여 이어서 풀기 시점에도 문제 배열 존재 여부 및 데이터 유효성을 사전 검증하는 가드를 주입했습니다.
* **복원 에러 자가 복구 (Self-Healing)**: 이어하기 검증에 실패하거나 JSON 파싱 에러(`catch` 블록 진입) 발생 시, 단순히 버튼을 감추는 것을 넘어 `localStorage.removeItem()`을 호출해 오염되거나 깨진 세션 데이터를 완전히 청소하도록 개선하여 무한 에러 유발 현상을 예방했습니다.

### ⑤ 데이터 구조 및 스키마 일관성 검토
* **단일 진실 소스(Single Source of Truth) 일치**: `activeRound.questions` 원본 참조 사용처를 추적 및 전수 검사하여, 런타임 상의 모든 문제지 그리기 및 채점 제어가 불변 복제본인 `state.currentQuestions`를 바라보도록 완벽하게 통일했습니다.
* **필드명 일관성 검증**: 오답 DB 저장 스키마의 각 필드명(`options`, `hint`)이 실제 문제 JSON 구조 및 HTML 화면을 렌더링하는 `js/app.js` 소스 코드(`q.options[idx]`, `q.hint`)와 100% 매칭됨을 교차 확인 완료하여 렌더링 유실 오류를 원천 차단했습니다.

---

## 🐞 9. [2026-06-30] 사이드바 상태 불일치 및 오답 복습 모드 정오답 동기화 버그

### 🐞 버그 현상
1. **임시 보기 변경 시 사이드바 필터 동작 불일치**:
   - 오답 필터가 켜진 상태에서, 최초 오답 판정을 받아 빨간색으로 마킹된 문항의 보기를 사용자가 공부용으로 정답 보기로 변경하면, 해당 문제가 필터에 부합하지 않는 것으로 판정되어 사이드바에서 사라지는 현상.
   - 이미 풀이가 완료되어 채점된 문항의 보기 마킹을 해제하면 미풀이 필터 대상에 포함되거나 진행도(`answeredCount`)가 줄어드는 모순 발생.
2. **제출 확인 팝업 중복 노출**: 
   - 60문제를 다 풀고 난 뒤에 보기를 다른 번호로 수정하거나 해제했다 다시 마킹하는 과정에서, `userAnswers` 개수가 다시 60개에 도달할 때마다 제출 안내 `confirm` 팝업창이 계속 중복 노출되는 문제.
3. **오답 복습 모드 (`wrong-review`) 기획 누락**:
   - 오답 복습 모드 진입 시 이전에 본 시험의 답안 마킹(`userAnswers`)이 비워지는 것은 맞으나, 사이드바 버튼들이 모두 미풀이(회색) 상태로 로드되어 자신이 틀린 문항이라는 시각적 힌트가 누락됨.
   - 복습 모드에서도 일반 모드용 2번 채점 방지 룰이 적용되어, 정답을 골라 복습을 극복하여도 마킹 상태(빨간색 ➔ 초록색)가 갱신되지 않는 문제.
   - 정답 선택 시 자동으로 다음 문제로 넘어가 버려 오답 해설을 찬찬히 볼 틈이 없거나, 오답 완주 시 인지할 수 있는 피드백이 부족했던 UX 문제.

### 🔍 원인 분석
1. **임시 상태 종속**: 필터(`doesQuestionMatchFilter`)와 진행도 계산 시 최초 고정 판정 상태(`permanentlyCorrect`/`Wrong`)가 아닌 임시 답안 기록(`userAnswers`)만을 기준으로 연산했기 때문에, 공부용 보기 변경으로 인해 사이드바 상태가 흔들렸습니다.
2. **제출 팝업 유도 플래그 부재**: 시험지 완료 상태에 대한 세션당 노출 제어용 플래그가 없었습니다.
3. **오답 복습 모드 예외 정책 미비**: 오답 복습 회차에 대해서만 정오답 실시간 재채점(판정 갱신)이 허용되도록 하는 예외 제어가 없었고, 진입 시점에 `permanentlyWrong`을 강제 세팅하는 로직이 없었습니다.

### ✅ 해결 방안
1. **최초 판정값 기준 필터링 및 카운트 개편**: 
   - `doesQuestionMatchFilter` 함수가 `permanentlyCorrect`/`Wrong`을 기준으로 필터링하도록 수정하여, 공부용 보기 변경으로 인해 사이드바에서 문제가 누락되지 않게 격리.
   - 진행도 카운트 또한 최초 판정 기록이나 임시 답안 존재 여부를 모두 카운트하여 답안 해제 시 진행도가 훼손되지 않도록 수정.
2. **재채점 분리 및 중복 팝업 제어**:
   - `state.hasSuggestedSubmit` 플래그를 도입하여 완료 팝업은 세션 내 딱 1회만 뜨도록 제한.
   - `handleSelectAnswer` 함수에서 이미 최초 채점이 끝난 문항은 `hasJudgment === true` 분기를 타게 하여 2번 채점이나 시간 계측이 발생하지 않고 보기 마킹만 업데이트되도록 전면 분리.
3. **오답 복습 모드 (`wrong-review`) 전용 룰 적용**:
   - 진입 시점(`startQuiz`)에 모든 오답 문항의 마킹은 초기화하되, `permanentlyWrong[idx] = true`로 세팅하여 사이드바가 빨간색(오답)으로 꽉 찬 상태에서 복습을 시작하도록 개선.
   - 오답 복습 모드에서는 `hasJudgment` 판단 시 무조건 `false`로 취급하게 하여, 실시간으로 정오답 판정이 업데이트(재채점)되어 오답을 극복(빨간색 ➔ 초록색)할 수 있도록 허용.
   - 자동 넘김 대신, 사용자가 이전/다음 수동 이동 시 갱신된 필터를 반영해 이미 맞춘 문제는 건너뛰도록 개선하고, 남은 오답이 전혀 없을 때 수동 이동을 시도하면 완료 alert 팝업을 출력해 완주를 격려하도록 보완.
