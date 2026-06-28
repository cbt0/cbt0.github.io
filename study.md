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