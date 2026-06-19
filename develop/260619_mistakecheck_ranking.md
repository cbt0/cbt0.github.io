# 260619 01:16 v1.19
## 오답풀이
현재 사용 중인 AI 에디터(Cursor, Copilot 등)에 아래 프롬프트를 복사하여 붙여넣으세요.
현재 Vanilla JS 기반의 CBT SPA 웹앱(cbt0.github.io)을 고도화하고 있습니다.
기존의 '실시간 채점' 시스템에 더해 1) 문제 필터링, 2) 가상 오답 회차 생성, 3) 채점 결과 로그 및 실시간 순위(Leaderboard) 갱신 기능을 추가하려고 합니다. 아래 요구사항에 맞게 코드를 작성해 주세요.

[1. HTML/CSS 수정 요구사항]
- 회차 선택 화면 상단(.rounds-header)에 <button id="btn-review-wrong" class="btn btn-warning">🔥 오답 모아 풀기</button> 를 추가하세요.
- 문제 풀이 화면 상단(.quiz-header-right)에 문제 표시 모드 필터(<select id="question-filter"> 전체 / 오답 / 미제출)를 추가하세요.

[2. JS (app.js) 수정: 문제 필터링 및 건너뛰기]
- `state.questionFilter` 상태를 추가하고, #question-filter 변경 시 이 값을 업데이트하세요.
- 전체(60문제), 오답(정답과 다르게 마킹된 문제), 미제출(마킹 안 한 문제) 조건에 따라 하단 OMR 마킹판(.marking-btn)의 표시 여부(display:none 등)를 제어하세요.
- '이전/다음' 버튼 클릭 또는 스와이프 시, 필터 조건에 맞지 않는 문제는 건너뛰고 조건에 맞는 다음 문제 번호로 점프하도록 내비게이션 로직(`renderActiveQuestion`, `nextQuestion`, `prevQuestion`)을 정교하게 수정하세요.

[3. JS (app.js) 수정: 가상 오답 복습 회차 생성]
- #btn-review-wrong 클릭 시, localStorage의 해당 과목 과거 세션들을 뒤져 틀렸던 문제 객체들만 추출해 "오답 복습 회차"라는 새로운 배열을 만드세요.
- 추출된 배열로 `startQuiz(customRound)`를 강제 실행하여, 틀린 문제들만 모아 다시 풀 수 있도록 진입시키세요. (오답이 없으면 alert 처리)

[4. JS (app.js) 수정: 채점 시 핵심 로그 기록 및 실시간 순위 갱신]
- `submitExam()` (제출 및 채점) 함수가 실행되어 채점이 완료되는 시점에 아래 두 가지 작업을 반드시 추가로 실행해 주세요.
  가. 무의미한 로그인/로그아웃 기록은 무시하고, 오직 채점 결과만 로그로 남깁니다. "[과목명] [회차명] - [점수]점 ([합격/불합격])" 형태의 문자열과 현재 타임스탬프를 묶어 localStorage의 유저별 로그 배열(예: `cbt_logs_[userid]`)에 추가하세요.
  나. 채점이 끝난 직후, 방금 푼 문제 수를 해당 유저의 누적 푼 문제 수 통계(예: `cbt_global_stats`)에 합산하여 갱신하세요.
  다. 갱신이 완료되면 즉시 `renderLeaderboard()` (또는 관련 순위 렌더링 함수)를 호출하여, '채점' 탭 내부의 사용자 순위 리스트가 방금 획득한 점수/문제 수를 바탕으로 실시간으로 변동되어 보이도록 처리해 주세요.
💡 프롬프트 설계 포인트:
로그인/로그아웃과 같은 불필요한 상태 추적 코드를 생성하지 못하도록 **"오직 채점 결과만 로그로 남긴다"**라고 명시적으로 제한했습니다.
채점이 완료되는 submitExam() 함수 안에서 로그 저장과 순위 데이터 갱신(renderLeaderboard)이 한 번에 연쇄적으로 일어나도록 묶어두었기 때문에, 사용자가 시험을 제출하는 즉시 자신의 순위가 올라가는 것을 '채점' 탭에서 짜릿하게 확인할 수 있게 됩니다.


-------------------------------
## 로그및 순위기록
현재 Vanilla JS 기반의 CBT SPA 웹앱(cbt0.github.io)을 고도화하고 있습니다.
채점 탭의 '전체 순위(Leaderboard)' 시스템에 게이미피케이션 요소를 도입하여, 단순 점수가 아닌 '시간 보너스가 포함된 종합 게임 스코어'를 기준으로 순위를 산정하려고 합니다.

js/app.js 파일의 관련 로직을 아래 요구사항에 맞게 수정해 주세요.

[1. 과목명/회차명 축약 헬퍼 함수 생성]
- `abbreviateText(subject, round)` 라는 헬퍼 함수를 만들어 주세요.
- 조건에 따라 긴 텍스트를 짧게 변환하여 반환합니다.
  - "에너지관리산업기사" -> "에너지산기"
  - "에너지관리기능장" -> "에너지기능장"
  - "가스기능사" -> "가스기능사"
  - "오답 복습 회차" (또는 유사 텍스트) -> "오답"
  - "n회차" -> "n회"
  - 반환 예시: "에너지산기 1회", "가스기능사 오답"

[2. submitExam() 함수 수정: 게임 스코어 산출 및 랭킹 저장]
- 시험 제출 시 채점이 완료되는 부분에 아래의 게임 스코어 공식을 적용해 주세요.
  - `const timeMinutes = state.timeSpentSeconds / 60;` (푼 시간 분 단위)
  - `const baseScore = (correctCount / state.currentQuestions.length) * 100;` (기본 점수)
  - `const timeBonus = (1 - (timeMinutes / 100)) * 100;` (시간 보너스 점수. 단, 음수가 되지 않도록 Math.max(0, timeBonus) 처리)
  - `const gameScore = Math.round(baseScore + timeBonus);` (최종 게임 스코어, 반올림 정수처리)
- `cbt_leaderboard` 라는 localStorage 배열 키에 아래 구조로 저장해 주세요.
  {
    userId: state.currentUser,
    gameScore: gameScore, // 합산된 게임 점수
    baseScore: Math.round(baseScore), // 100점 만점 기준 원래 점수
    timeSpent: state.timeSpentSeconds, 
    summary: abbreviateText(state.activeSubject, state.activeRound.name),
    timestamp: new Date().getTime()
  }

[3. renderLeaderboard() 함수 수정: 정렬 및 UI 렌더링]
- localStorage의 `cbt_leaderboard` 데이터를 불러옵니다.
- **정렬 기준:** 오직 `gameScore` 내림차순(고득점순)으로만 정렬해 주세요.
- 한 유저가 같은 과목을 여러 번 푼 경우, `gameScore`가 가장 높은 최고 기록 1개만 순위표에 남기도록 중복 제거 로직을 정렬 전에 추가해 주세요.
- 정렬된 배열을 순회하며 `#leaderboard-list` 내부에 순위 아이템을 렌더링하세요.
- HTML 구조 예시:
  <div class="ranking-item">
    <div class="ranking-user-info">
      <div class="rank-badge rank-1">1</div> <!-- 1~3등은 rank-1,2,3 클래스 부여 -->
      <div class="rank-user-name">${data.userId}</div>
    </div>
    <div class="rank-details" style="text-align: right;">
      <div class="rank-score" style="color:var(--warning); font-size:16px;">🎮 ${data.gameScore}점</div>
      <div class="rank-subject" style="font-size:12px; color:var(--text-muted);">${data.summary} (정답 ${data.baseScore}점)</div>
    </div>
  </div>
💡 설계 포인트:
시간 초과 페널티 방지: 혹시라도 사용자가 100분 이상 켜두었을 때 보너스 점수가 마이너스가 되어 오히려 정답 점수를 깎아 먹는 일이 없도록 Math.max(0, timeBonus) 방어 코드를 지시어에 살짝 추가했습니다.
UI 디자인: 리더보드에는 가장 눈에 잘 띄게 "🎮 185점" 형태로 화려한 게임 스코어가 표시되고, 그 아래 작게 원래 맞은 점수(예: 정답 85점)와 축약된 과목명이 보이도록 설계하여 진짜 게임 랭킹을 보는 듯한 쾌감을 주도록 배치했습니다.
## 구현 계획
1. HTML/CSS 추가
   - `.rounds-header` 상단에 `<button id="btn-review-wrong" class="btn btn-warning">🔥 오답 모아 풀기</button>` 추가
   - `.quiz-header-right` 상단에 `<select id="question-filter">`를 추가하고 옵션으로 `전체 / 오답 / 미제출` 제공

2. `app.js` 문제 필터링
   - `state.questionFilter` 상태 초기화(`all`, `wrong`, `unanswered` 등)
   - `#question-filter` `change` 이벤트에서 `state.questionFilter` 업데이트
   - 현재 질문의 OMR 상태를 체크하여 `.marking-btn` 보이기/숨기기 제어
   - `renderActiveQuestion`, `nextQuestion`, `prevQuestion` 로직을 수정하여 필터 조건을 만족하지 않는 문제는 자동으로 건너뛰고 다음/이전 필터 대상 문제로 이동

3. 가상 오답 복습 회차 생성
   - `#btn-review-wrong` 클릭 핸들러 추가
   - localStorage에서 해당 과목의 과거 세션 데이터를 검사하여 틀린 문제만 추출
   - 추출 결과로 `customRound` 배열 생성 후 `startQuiz(customRound)` 실행
   - 틀린 문제가 없으면 `alert('오답이 없습니다.')` 형태로 안내

4. 채점 로그 및 실시간 순위 갱신
   - `submitExam()` 채점 완료 직후 로그 저장 및 통계 갱신 추가
   - `cbt_logs_[userid]`에 `[과목명] [회차명] - [점수]점 ([합격/불합격])` 형태와 타임스탬프 저장
   - `cbt_global_stats`에 이번 회차의 푼 문제 수 누적 합산
   - 갱신 완료 후 즉시 `renderLeaderboard()` 호출하여 순위 갱신

5. 게임 점수 및 리더보드 로직
   - `abbreviateText(subject, round)` 헬퍼 함수 구현
   - `submitExam()`에서 `timeMinutes`, `baseScore`, `timeBonus`, `gameScore` 계산
   - `cbt_leaderboard` localStorage 배열에 `userId`, `gameScore`, `baseScore`, `timeSpent`, `summary`, `timestamp` 저장
   - `renderLeaderboard()`에서 최고 기록 1개만 남기고 `gameScore` 내림차순 정렬
   - `#leaderboard-list`에 순위 아이템 렌더링

6. 검증 및 테스트
   - 필터 변경 시 OMR 표시/이동 여부 동작 확인
   - 오답 복습 회차 버튼 클릭 시 틀린 문제로 진입되는지 검증
   - 제출 후 로그 저장, 통계 업데이트, 리더보드 즉시 반영 확인
   - `abbreviateText()` 축약 결과가 의도대로 나오는지 확인

## 작업 요약 (작성 완료)
- 회차 선택 화면 상단에 `#btn-review-wrong` 버튼 추가
- 문제 풀이 화면 상단에 `#question-filter` 추가 및 `전체 / 오답 / 미제출` 필터링 UI 적용
- `state.questionFilter` 추가, 필터 변경 시 상태 업데이트
- `renderMarkingSheet()` 및 `updateMarkingStatus()`에서 필터 조건에 따라 `.marking-btn` 표시/숨김 처리
- `prevQuestion()` / `nextQuestion()`에서 필터 조건에 맞는 다음/이전 문제로 이동하도록 로직 수정
- `#btn-review-wrong` 클릭 시 과거 세션에서 틀린 문제만 모아 `startQuiz(customRound)` 실행하는 가상 오답 복습 회차 기능 구현
- `submitExam()`에 채점 결과 로그 저장(`cbt_logs_[userid]`), 누적 통계 갱신, 리더보드 즉시 갱신 로직 추가
- `abbreviateText(subject, round)` 헬퍼 구현
- `submitExam()`에 게임 스코어 공식 적용 (`timeMinutes`, `baseScore`, `timeBonus`, `gameScore`)
- `cbt_leaderboard`에 랭킹 엔트리 저장
- `renderLeaderboard()`를 `gameScore` 기준 내림차순 정렬하고 동일 사용자의 최고 기록만 남기도록 처리

## 변경 파일
- `index.html`
- `js/app.js`
