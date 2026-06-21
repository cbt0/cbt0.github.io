---
날짜: 2026년 6월 21일
시간: 오후 1시 12분
타임스탬프: 2026-06-21T13:12:44+09:00
---

# Supabase Database 연동 및 데이터 동기화 & 다중 이어 풀기 구현 계획

이 계획서는 Supabase 데이터베이스와의 동기화 및 사용자의 학습 편의성을 극대화하기 위한 과목별 이어 풀기(임시 저장) 기능 개선 구현 방안을 정의합니다.

## User Review Required

> [!NOTE]
> **과목별 이어 풀기 개별 관리**
> * **홈 화면 (과목 선택 UI)**: 모든 과목을 통틀어 가장 최근에 풀던 세션을 찾아 전체 이어 풀기 버튼(`homeResumeBtn`)을 노출합니다.
> * **각 과목 화면 (회차 선택 UI)**: 해당 과목에서 풀고 있던 세션이 존재할 때만 과목별 이어 풀기 버튼(`roundsResumeBtn`)을 상단에 노출합니다.
> * **임시 저장 세션 키 형식 변경**: 기존 `cbt_${username}_autosave_session` 단일 키에서 `cbt_${username}_autosave_${subject}` 과목별 키로 세분화하여 저장합니다.

> [!IMPORTANT]
> **양방향 동기화 방식 (기존 계획 유지)**
> 사용자가 새로운 브라우저나 기기에서 로그인하더라도 클라우드에 저장된 정보가 자동으로 로컬 환경(`localStorage`)과 병합되도록 구현합니다. 
> * **클라우드 저장**: 시험 제출 시점(`submitExam`), 통계 누적 시점(`updateGlobalStats`), 로그 생성 시점(`logUserActivity`)에 Supabase에 비동기로 데이터를 전송합니다.
> * **로컬 동기화 (Hydration)**: 로그인 성공 시 Supabase에서 사용자의 모든 기록을 불러와 `localStorage`에 복원한 후 대시보드를 갱신합니다.

## Proposed Changes

### [HTML UI Changes]

`index.html`의 회차 선택 화면(`rounds-screen`)에 과목별 이어 풀기 버튼을 추가합니다.

---

#### [MODIFY] [index.html](file:///d:/git/cbt0.github.io/index.html)

* **회차 선택 헤더 수정** (line 146 부근):
  * `btn-review-wrong` 버튼 옆에 `btn-rounds-resume` 버튼을 추가합니다.
  ```html
  <div class="rounds-header">
      <h2 id="rounds-title" class="rounds-subject-title">가스기능사</h2>
      <p class="rounds-subtitle">풀어볼 기출문제의 회차를 선택해 주세요.</p>
      <div class="rounds-actions" style="display: flex; gap: 8px; margin-top: 12px;">
          <button id="btn-review-wrong" class="btn btn-warning">🔥 오답 모아 풀기</button>
          <button id="btn-rounds-resume" class="btn btn-primary hidden">▶ 이어서 풀기</button>
      </div>
  </div>
  ```

---

### [Database & State Synchronization]

`js/app.js`에서 데이터 저장 및 로드 로직을 개선하여 로컬 스토리지와 Supabase DB 간의 동기화 및 다중 이어 풀기를 처리합니다.

---

#### [MODIFY] [app.js](file:///d:/git/cbt0.github.io/js/app.js)

* **UI 엘리먼트 매핑 추가 (`dom.roundsResumeBtn`)**:
  * `btn-rounds-resume` 엘리먼트를 매핑합니다.
* **임시 세션 관리 수정 (`autoSaveSession` / `startQuiz` / `submitExam` / `updateHomeResumeButton` / `updateRoundsResumeButton`)**:
  * `autoSaveSession()`: 저장 키를 `cbt_${state.currentUser}_autosave_${state.activeSubject}`로 변경하고 저장 데이터 객체에 `timestamp: Date.now()`를 추가합니다.
  * `updateHomeResumeButton()`: `gas`, `energy_master`, `energy_industrial`, `energy_craftsman`, `air_conditioning` 등 모든 과목의 세션 키를 검사하여 가장 최근 `timestamp`를 가진 세션 정보를 기반으로 홈 화면 이어하기 버튼을 구성합니다.
  * `updateRoundsResumeButton(subject)` [신규 함수]: 회차 화면 렌더링 시 해당 과목의 세션 키(`cbt_${state.currentUser}_autosave_${subject}`)가 존재하는 경우 `btn-rounds-resume`을 활성화하고 텍스트를 업데이트합니다.
  * `renderRoundsList()`: 리스트 렌더링 시 `updateRoundsResumeButton(subject)`을 호출합니다.
  * `submitExam()`: 제출 성공 후 해당 과목의 세션 키(`cbt_${state.currentUser}_autosave_${state.activeSubject}`)를 제거합니다.
* **로그인 성공 후 데이터 동기화 (`syncDataFromSupabase`) [신규 함수]**:
  * 로그인 성공 직후 호출됩니다.
  * Supabase `profiles` 테이블에 유저 정보가 있는지 확인하고, 없으면 신규 행을 인서트(Upsert)합니다.
  * Supabase `user_stats`에서 통계 데이터를 가져와 `cbt_${username}_global_stats` 형식으로 `localStorage`에 동기화합니다.
  * Supabase `cbt_progress`에서 해당 유저의 모든 시험 기록을 가져와 `cbt_progress_${username}_${subject}_${roundKey}` 형식으로 복원합니다.
  * Supabase `user_logs`에서 최근 활동 이력을 가져와 `cbt_${username}_logs` 형식으로 복원합니다.
  * 복원 완료 후 대시보드 및 이어 풀기 상태를 갱신합니다.
* **이벤트 리스너 등록 (`registerEventListeners`)**:
  * `btn-rounds-resume` 클릭 시 해당 과목의 임시 저장 데이터를 읽어와 `startQuiz(session.activeRound, true)`를 호출하도록 리스너를 추가합니다.
* **로그인 함수(`login`) 연동**:
  * Supabase 로그인 성공 시 `syncDataFromSupabase()`를 호출하도록 추가합니다.
* **활동 로그 기록 (`logUserActivity` / `addExamResultLog`) 수정**:
  * 로그를 기존 `localStorage`에 남기는 것과 동시에 Supabase의 `user_logs` 테이블에도 비동기로 인서트(Insert)합니다.
* **전체 통계 갱신 (`updateGlobalStats`) 수정**:
  * 기존 `localStorage` 연동 후, Supabase의 `user_stats` 테이블에 누적된 성적 지표를 업데이트(Upsert)합니다.
* **시험 제출 (`submitExam`) 수정**:
  * 채점 후 `cbt_progress` 테이블에 현재 회차의 시험 결과를 비동기로 인서트(Insert)합니다.

## Verification Plan

### Manual Verification
1. **기존 데이터 초기화 및 브라우저 로그인**:
   * 브라우저 `localStorage`를 깨끗이 지웁니다.
   * 테스트 계정으로 로그인 시도하여 Supabase 클라우드에서 이전 기록들이 복원되는지 확인합니다.
2. **다중 이어 풀기 테스트**:
   * "가스기능사" 1회 시험을 시작하고 몇 문제 푼 뒤 "홈"으로 이동합니다.
   * 홈 화면에서 가스기능사 이어 풀기 버튼이 표시되는지 확인합니다.
   * "에너지관리기능장" 1회 시험을 시작하고 몇 문제 푼 뒤 "홈"으로 이동합니다.
   * 홈 화면의 이어하기가 가장 최근인 "에너지관리기능장"으로 매핑되어 표시되는지 확인합니다.
   * "가스기능사" 과목 선택 시 가스기능사 회차 화면 상단에 가스기능사 전용 이어 풀기 버튼이 표시되는지 확인합니다.
3. **시험 제출 시 세션 만료 및 동기화 테스트**:
   * 가스기능사 시험을 제출하여 완료합니다.
   * 가스기능사의 이어하기 버튼이 사라지는지 확인합니다.
   * Supabase 대시보드에서 `cbt_progress`, `user_stats`, `user_logs` 테이블에 정상적으로 동기화되는지 확인합니다.
