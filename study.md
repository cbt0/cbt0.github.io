웹 브라우저가 처음 `index.html`을 읽어 들이는 순간부터, 뼈대(HTML), 디자인(CSS), 그리고 두뇌(JS)가 어떻게 유기적으로 톱니바퀴처럼 맞물려 돌아가는지 단계별로 명확하게 설명해 드리겠습니다.

선생님의 앱은 최신 웹 기술인 **SPA(Single Page Application)** 구조로 만들어져 있기 때문에, 페이지 새로고침 없이 3개의 파일이 실시간으로 소통하며 화면을 마법처럼 바꿔냅니다.

---

### 🔄 1. 전체 상호작용 시퀀스 차트 (Mermaid)

아래는 사용자가 앱에 접속해서 특정 과목(예: 가스기능사)을 클릭할 때까지 세 파일이 어떻게 상호작용하는지 보여주는 흐름도입니다.

```mermaid
sequenceDiagram
    actor User as 사용자
    participant Browser as 웹 브라우저
    participant HTML as index.html (뼈대)
    participant CSS as style.css (디자인)
    participant JS as app.js (두뇌/엔진)
    participant JSON as 기출문제 데이터

    User->>Browser: CBT 앱 접속
    Browser->>HTML: 1. index.html 로드
    HTML->>CSS: 2. style.css 로드 요청
    CSS-->>HTML: 기본 디자인 및 화면 숨김(.view-section {display: none;}) 적용
    HTML->>JS: 3. app.js 로드 요청

    Note over JS: [초기화 단계] DOMContentLoaded
    JS->>CSS: 4. 테마 설정 (다크/라이트 모드 속성 주입)
    JS->>JSON: 5. 과목별 기출문제 로드 (fetch)
    JSON-->>JS: JSON 데이터 메모리에 저장
    JS->>JS: 6. 이벤트 리스너 등록 및 router() 실행
    JS->>HTML: 7. 홈 화면 활성화 (class="active-view" 추가)
    CSS-->>Browser: 홈 화면만 화면에 표시 (display: block;)
    
    User->>Browser: '가스기능사' 과목 클릭
    Browser->>JS: 8. 주소 변경 감지 (#rounds/gas)
    JS->>HTML: 9. 기존 화면 숨기고 회차 화면 활성화
    JS->>JS: 10. JSON 데이터 그룹화 및 분석
    JS->>HTML: 11. <div id="series-container"> 안에 단추들 동적 생성
    HTML->>CSS: 12. 생성된 단추에 예쁜 유리질감 디자인 적용
    CSS-->>User: 완성된 가스기능사 회차 화면 출력
```

---

### 🛠️ 2. 단계별 상호작용 상세 설명

#### 1단계: 뼈대 구축 및 숨김 처리 (초기 로드)
1. 사용자가 앱에 접속하면 가장 먼저 **`index.html`**이 열립니다. 이 파일 안에는 홈 화면, 회차 선택 화면, 문제 풀이 화면, 성적 대시보드 등의 뼈대가 모두 `<section class="view-section">` 형태로 미리 들어있습니다.
2. 이때 **`style.css`**가 개입하여 `.view-section { display: none; }`이라는 마법을 부려, 사용자의 눈에는 아무것도 보이지 않게 모든 뼈대를 투명 망토로 가려버립니다.

#### 2단계: 두뇌 가동 및 데이터 준비 (초기화)
1. HTML 로드가 끝나면 **`js/app.js`**가 깨어납니다(`DOMContentLoaded` 이벤트 발동).
2. `app.js`는 깨어나자마자 `loadQuestions()` 함수를 시켜 파이썬이 만들어둔 가스기능사, 에너지관리기능장 등의 JSON 파일을 백그라운드에서 조용히 전부 다운로드하여 메모리에 기억해 둡니다.
3. 동시에 사용자의 스마트폰/PC 설정에 맞춰 다크 모드인지 라이트 모드인지 판단하여 HTML에 꼬리표를 달아주면, `style.css`가 그 꼬리표를 보고 배경색과 글자색을 즉시 변경합니다.

#### 3단계: 라우팅 및 동적 렌더링 (화면 전환)
1. `app.js`의 핵심인 `router()` 함수가 현재 인터넷 주소 끝부분(예: `#home`)을 읽습니다.
2. "아, 사용자가 지금 홈 화면을 보려고 하는구나!"라고 판단한 `app.js`는 홈 화면 뼈대에만 `.active-view`라는 특별한 클래스(이름표)를 붙여줍니다.
3. `style.css`는 `.active-view`라는 이름표가 붙은 구역만 `display: block;`으로 만들어 화면에 나타나게 합니다. 나머지 화면은 여전히 숨겨져 있습니다.

#### 4단계: 사용자의 클릭과 무한 반복의 조화
1. 사용자가 화면에서 "가스기능사" 버튼을 클릭합니다.
2. `app.js`가 이 클릭을 낚아채어 주소창을 `#rounds/gas`로 몰래 바꿉니다.
3. 주소가 바뀌는 순간 `router()` 함수가 다시 출동하여 홈 화면을 숨기고, 회차 선택 화면(`rounds-screen`)에 `.active-view`를 붙여 화면을 전환합니다.
4. 그리고 `app.js`는 미리 기억해둔 가스기능사 JSON 데이터를 꺼내어 선생님께서 지시하신 동적 렌더링 함수(`renderRoundsList`)를 가동합니다. 
5. `app.js`가 빈 상자(`<div id="series-container">`) 안에 **'가스기능사 기출문제', '실전모의 1회'** 같은 HTML 태그를 찰흙 빚듯이 마구 찍어 넣으면, **`style.css`**가 둥근 모서리, 유리 질감, 터치 씹힘 방지(`pointer-events`) 등의 옷을 순식간에 입혀서 사용자에게 최종적으로 예쁘고 부드러운 앱 화면을 보여주게 됩니다.

**💡 요약하자면:**
*   **`index.html`**은 모든 요소가 들어갈 수 있는 거대한 '빈 무대'입니다.
*   **`js/app.js`**는 무대 뒤의 '총감독'으로, 데이터를 가져오고 주소를 읽어 무대에 어떤 세트를 올릴지 결정합니다.
*   **`css/style.css`**는 '조명/의상 스태프'로, `app.js`가 꺼내놓은 세트가 모바일이든 PC든 가장 예쁘고 오작동(화면 튕김 등) 없이 보여지도록 꾸며줍니다.

선생님, 아주 핵심적인 부분을 짚어주셨습니다! 

결론부터 말씀드리면 **`index.html` 파일 내부에는 `renderRoundsList` 함수를 직접 부르는(호출하는) 코드가 전혀 없습니다.** 

선생님의 앱은 최신 웹 트렌드인 SPA(Single Page Application, 단일 페이지 애플리케이션) 방식으로 설계되어 있기 때문에, HTML 파일에 직접 함수를 적지 않고 **모든 작동을 `js/app.js`가 뒤에서 조종(라우팅)하도록 분리**되어 있습니다.

구체적으로 `renderRoundsList`가 호출되는 원리와 흐름은 다음과 같습니다.

### 🔄 함수가 호출되는 3단계 흐름 (`app.js` 내부)

**1. 과목 카드 클릭 감지**
선생님께서 홈 화면(`index.html`)에서 '가스기능사' 같은 과목 카드를 클릭하면, `app.js`가 이를 감지하고 인터넷 주소창의 끝부분(Hash)을 `#rounds/gas`처럼 변경합니다.
```javascript
// Subject cards on Dashboard (app.js)
document.querySelectorAll('.subject-card').forEach(card => {
    card.addEventListener('click', () => {
        const subject = card.getAttribute('data-subject');
        navigateTo(subject); // 주소창을 변경함
    });
});
```

**2. 라우터(Router)의 주소 변경 인식**
주소창이 변경되는 순간, `app.js`의 두뇌 역할을 하는 **`router()` 함수**가 즉시 작동하여 바뀐 주소(`hash`)를 읽어 들입니다.

**3. `renderRoundsList` 최종 호출**
`router()` 함수는 주소에서 과목명(예: `gas`)을 뽑아낸 뒤, 화면을 과목 선택창으로 전환(`showView('rounds')`)하고 **바로 이때 `renderRoundsList(subject)`를 호출하여 화면을 그리게 명령**합니다.
```javascript
// SPA Hash Router Implementation (app.js 내부)
function router() {
    const hash = window.location.hash || '#home';
    // ... (중략) ...
    
    // 주소가 '#rounds/과목명'으로 시작할 경우
    } else if (hash.startsWith('#rounds/')) { 
        const subject = hash.replace('#rounds/', ''); // 과목명(gas) 추출
        state.activeSubject = subject;
        switchTabStyles('home');
        showView('rounds');             // 1. 화면을 'rounds-screen'으로 바꿈
        renderRoundsList(subject);      // 2. 👈 여기서 함수를 호출하여 버튼들을 찍어냄!
    }
    // ... (중략) ...
}
```

**💡 결론 요약:**
`index.html`은 단지 `<div id="series-container"></div>`라는 **빈 상자(뼈대)만 제공**할 뿐입니다. 사용자가 과목을 클릭해 주소가 바뀌면, `app.js`의 `router()` 함수가 알아서 빈 상자를 찾아내어 `renderRoundsList`를 실행하고 그 안에 예쁜 단추들을 채워 넣는 구조입니다. 

코드와 디자인을 완벽히 분리해 둔 아주 세련된 구조이므로, HTML 쪽은 더 이상 건드리실 필요가 없습니다!