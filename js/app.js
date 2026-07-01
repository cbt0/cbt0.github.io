/**
 * Antigravity CBT - Core Application Script V1.9924
 * Handled features: SPA routing, JSON loading, Quiz state, grading engine, and localStorage stats.
 */

// Global Idle Timer for Auto-Logout
let idleTimer;
// Base Time for Delta-encoding log system
let sessionBaseTime = parseInt(localStorage.getItem('session_base_time')) || null;

// --- [추가] 앱 버전 관리 (업데이트 시 이 숫자를 올려주세요!) ---
const APP_VERSION = "1.9924"; 

function checkAppUpdate() {
    const storedVersion = localStorage.getItem('cbt_app_version');

    // 저장된 버전과 현재 버전이 다르면 (최초 접속이거나 업데이트가 발생했을 때)
    if (storedVersion !== APP_VERSION) {
        // 사용자에게 알림창 띄우기
        const doUpdate = confirm("🎉 CBT 웹앱이 새롭게 업데이트 되었습니다!\n원활한 환경을 위해 최신 버전으로 갱신하시겠습니까?\n(※ 이어하기 데이터 및 성적은 안전하게 보존됩니다.)");

        if (doUpdate) {
            // 새 버전을 로컬 스토리지에 저장
            localStorage.setItem('cbt_app_version', APP_VERSION);
            
            // 캐시를 무시하고 최신 파일을 강제 다운로드하도록 주소 뒤에 ?v=버전 파라미터를 붙여서 새로고침
            try {
                const url = new URL(window.location.href);
                url.searchParams.set('v', APP_VERSION);
                window.location.href = url.toString();
            } catch (e) {
                window.location.reload();
            }
        } else {
            // 나중에 하기로 한 경우, 일단 버전만 갱신해두어 다음 접속 시 귀찮게 묻지 않음
            localStorage.setItem('cbt_app_version', APP_VERSION);
        }
    }
}

// ==========================================
// 🚨 글로벌 에러 및 통신 끊김 추적 로거
// ==========================================
window.addEventListener('error', function(event) {
    const errorMsg = `[시스템 에러] ${event.message} (Line: ${event.lineno})`;
    console.error(errorMsg);
    // 로그인 상태라면 대시보드 활동 로그에 즉시 기록
    if (state.currentUser) {
        logUserActivity(errorMsg);
    }
});

window.addEventListener('unhandledrejection', function(event) {
    const errorMsg = `[통신/비동기 에러] 네트워크 불안정 또는 파일 로드 실패`;
    console.error(errorMsg, event.reason);
    if (state.currentUser) {
        logUserActivity(errorMsg);
    }
});

// Application Global State
const state = {
    exams: {},              // Loaded exam data by subject
    activeSubject: 'home',  // 'home', 'gas', 'energy_craftsman', etc.
    activeRound: null,      // Active round object
    activeQuestionIndex: 0, // 0 to 59
    userAnswers: {},        // {questionIndex: selectedOption}
    checkedQuestions: {},   // {questionIndex: true/false} (체크 마킹 여부)
    permanentlyWrong: {},   // {questionIndex: true} (최초 오답 선택 및 미제출 상태 힌트 사용 영구 낙인 기록)
    permanentlyCorrect: {}, // {questionIndex: true} (최초 정답 선택 영구 기록)
    questionTimeSpent: {},  // {questionIndex: seconds} (각 문항 최초 풀이 소요 시간)
    questionStartTime: null, // (현재 문항 진입 시점 타임스탬프)
    quizMode: 'solving',    // 'solving' (active test), 'review' (checking answers after submission)
    timerInterval: null,
    timeSpentSeconds: 0,
    currentQuestions: [],   // Active question list (usually 60)
    questionFilter: 'all', // 'all', 'wrong', 'unanswered'
    currentUser: null,      // Logged in user ID
    autoLogoutMinutes: 30,  // Auto-logout idle timeout minutes
    maxSystemLogs: 100,     // 최대 시스템 로그 보관 개수 (디폴트 100)
    lastActiveQuestionIndex: null,
    hasSuggestedSubmit: false // 모든 문제 완료 후 최초 1회만 제출 안내 제안을 띄우기 위한 플래그
};

// Mock Exam Database for other subjects
const mockExams = {
    energy_craftsman: [
        {
            subject: "에너지기능사",
            year: 2025,
            round: "샘플 기출회차",
            questions: [
                {
                    num: 1,
                    question: "보일러 전열면에 스케일(Scale)이 부착되었을 때 나타나는 현상으로 틀린 것은?",
                    options: [
                        "보일러 열효율이 저하된다.",
                        "보일러 전열면 판의 온도가 국부 과열된다.",
                        "보일러 전열관의 부식을 억제한다.",
                        "수관식 보일러의 경우 관내 물 순환을 방해한다."
                    ],
                    answer: 3,
                    hint: "정답은 ③번입니다.\n스케일은 열전달을 방해하여 효율을 저하시킬 뿐만 아니라, 국부 과열을 일으켜 재질의 노화 및 관의 파열을 유발하고 부식을 오히려 촉진합니다."
                },
                {
                    num: 2,
                    question: "보일러의 보존 방법 중 건식 보존법의 설명으로 가장 적합한 것은?",
                    options: [
                        "동절기에 1개월 이내 단기 보존 시 사용한다.",
                        "보일러 물을 가득 채우고 약품을 투여하여 보존한다.",
                        "보일러 내부 물을 전부 배출하고 건조제(실리카겔 등)를 넣어 보존한다.",
                        "보일러 내부에 수돗물을 채운 후 밀폐시킨다."
                    ],
                    answer: 3,
                    hint: "정답은 ③번입니다.\n건식 보존법은 동절기 동파 우려가 있거나 장기 보존 시 적합하며, 보일러 내 배수를 완전히 진행한 후 실리카겔이나 생석회 등의 건조제를 넣어 밀폐 보존합니다."
                },
                {
                    num: 3,
                    question: "다음 보일러 안전밸브 중 분출 계수가 가장 큰 형식은?",
                    options: [
                        "양정식(High lift type)",
                        "전리식(Full bore type)",
                        "보통 리프트식(Low lift type)",
                        "레버식(Lever type)"
                    ],
                    answer: 2,
                    hint: "정답은 ②번입니다.\n전리식(Full bore) 안전밸브는 밸브 시트 구경과 유로 면적이 동일하게 확보되므로 분출 계수와 분출량이 가장 큽니다."
                }
            ]
        }
    ],
    energy_industrial: [
        {
            subject: "에너지산업관리기사",
            year: 2025,
            round: "샘플 기출회차",
            questions: [
                {
                    num: 1,
                    question: "보일러 연소 가스 중 질소산화물(NOx)의 발생을 줄이는 연소 제어 방법이 아닌 것은?",
                    options: [
                        "2단 연소법(Two-stage combustion) 적용",
                        "배기가스 재순환(EGR) 기법 적용",
                        "연소실 내 노내 화염 온도 상승",
                        "저 NOx 버너 사용"
                    ],
                    answer: 3,
                    hint: "정답은 ③번입니다.\n질소산화물(특히 Thermal NOx)은 화염 온도가 고온(1500℃ 이상)일 때 급격히 발생하므로, 노내 온도를 낮추어야 NOx가 저감됩니다."
                },
                {
                    num: 2,
                    question: "열역학 제2법칙에 관한 설명으로 옳지 않은 것은?",
                    options: [
                        "열은 저온체에서 고온체로 아무런 변화 없이 스스로 이동할 수 없다.",
                        "제2종 영구기관은 제작이 가능하다.",
                        "자연계에서 일어나는 모든 실제 변화는 비가역 변화이다.",
                        "우주의 엔트로피는 항상 증가하는 방향으로 진행된다."
                    ],
                    answer: 2,
                    hint: "정답은 ②번입니다.\n열역학 제2법칙에 따라 하나의 열원으로부터 열을 받아 이를 100% 일로 변환하는 기기관(제2종 영구기관)은 제작이 불가능합니다."
                }
            ]
        }
    ],
    energy_master: [
        {
            subject: "에너지기능장",
            year: 2025,
            round: "샘플 기출회차",
            questions: [
                {
                    num: 1,
                    question: "에너지이용합리화법상 열사용기자재 관리 요령 중 검사대상기기 조종자의 선임 및 해임에 대한 내용으로 옳은 것은?",
                    options: [
                        "조종자를 선임하거나 해임한 날로부터 30일 이내에 신고해야 한다.",
                        "조종자를 선임하거나 해임한 날로부터 15일 이내에 한국에너지공단에 신고해야 한다.",
                        "조종자를 선임하거나 해임한 날로부터 7일 이내에 시장·군수·구청장에게 신고해야 한다.",
                        "조종자는 자격증 소지 여부와 관계없이 실무 경력만으로 선임 가능하다."
                    ],
                    answer: 1,
                    hint: "정답은 ①번입니다.\n에너지이용 합리화법 규정에 의거, 검사대상기기 조종자를 선임 또는 해임한 자는 그 날부터 30일 이내에 신고서를 제출해야 합니다."
                }
            ]
        }
    ],
    air_conditioning: [
        {
            subject: "공조기능사",
            year: 2025,
            round: "샘플 기출회차",
            questions: [
                {
                    num: 1,
                    question: "냉동 사이클 장치에서 플래시 가스(Flash Gas)가 발생하는 주요 원인으로 가장 타당한 것은?",
                    options: [
                        "흡입 가스의 과열도가 너무 낮을 때",
                        "응축 압력이 너무 낮고 증발 온도가 높을 때",
                        "액관의 압력 강하 또는 액관 온도 상승으로 팽창밸브 직전 냉매액이 기화될 때",
                        "압축기 피스톤의 틈새가 너무 작을 때"
                    ],
                    answer: 3,
                    hint: "정답은 ③번입니다.\n플래시 가스는 팽창 밸브 유입 직전에 온도 상승이나 압력 저하로 인해 액상 냉매가 미리 기화하여 배관 내 유동 저항을 늘리는 현상입니다."
                },
                {
                    num: 2,
                    question: "공기조화 방식 중 단일덕트 방식(Single Duct System)의 특징으로 틀린 것은?",
                    options: [
                        "설비비가 저렴하고 운전 보수가 비교적 용이하다.",
                        "실별로 부하 변동이 심한 다실 건물에서 각 방마다 개별 제어가 매우 용이하다.",
                        "실내 청정도를 유지하기 쉬우며 환기 성능이 우수하다.",
                        "덕트 스페이스가 크게 요구된다."
                    ],
                    answer: 2,
                    hint: "정답은 ②번입니다.\n단일덕트 방식은 중앙에서 전체 냉난방 공기를 송풍하므로 실별 부하 변동에 유연하게 대처하는 개별 조절 성능이 떨어집니다."
                }
            ]
        }
    ]
};

// UI Elements mapping
const dom = {
    screens: {
        home: document.getElementById('home-screen'),
        rounds: document.getElementById('rounds-screen'),
        quiz: document.getElementById('quiz-screen'),
        grading: document.getElementById('grading-screen'),
        settings: document.getElementById('settings-screen')
    },
    nav: {
        home: document.getElementById('nav-home'),
        quiz: document.getElementById('nav-quiz'),
        grading: document.getElementById('nav-grading'),
        settings: document.getElementById('nav-settings')
    },
    themeToggle: document.getElementById('theme-toggle'),
    loginSubmitBtn: document.getElementById('login-submit-btn'),
    
    // Login / Welcome widget elements
    loginFormContainer: document.getElementById('login-form-container'),
    welcomeContainer: document.getElementById('welcome-container'),
    loginId: document.getElementById('login-id'),
    loginPw: document.getElementById('login-pw'),
    logoutBtn: document.getElementById('logout-btn'),
    homeResumeBtn: document.getElementById('home-resume-btn'),
    saveIdCheck: document.getElementById('save-id-check'),
    autoLogoutSelect: document.getElementById('auto-logout-select'),
    maxLogsSelect: document.getElementById('max-logs-select'),
    subjectSelectionSection: document.getElementById('subject-selection-section'),
    
    // Grading dashboard elements
    userActivityLogs: document.getElementById('user-activity-logs'),
    lastSolvedInfo: document.getElementById('last-solved-info'),
    
    // Stats elements
    stats: {
        totalSolved: document.getElementById('stats-total-solved'),
        correctRate: document.getElementById('stats-correct-rate'),
        passedExams: document.getElementById('stats-passed-exams')
    },
    
    // Rounds screen elements
    roundsTitle: document.getElementById('rounds-title'),
    roundsList: document.getElementById('rounds-list'),
    
    // Quiz screen elements
    quizSubjectName: document.getElementById('quiz-subject-name'),
    quizRoundName: document.getElementById('quiz-round-name'),
    timerText: document.getElementById('timer-text'),
    scoreText: document.getElementById('score-text'),
    scoreContainer: document.getElementById('quiz-score-container'),
    markingSheet: document.getElementById('marking-sheet'),
    quizProgressText: document.getElementById('quiz-progress-text'),
    quizSubmitBtn: document.getElementById('quiz-submit-btn'),
    quizTopSubmitBtn: document.getElementById('quiz-top-submit-btn'),
    calculatorBtn: document.getElementById('calculator-btn'),
    calculatorModal: document.getElementById('calculator-modal'),
    calculatorHeader: document.getElementById('calculator-header'), // 👈 드래그켜기
    calculatorDisplay: document.getElementById('calculator-display'),
    calculatorButtons: document.querySelectorAll('.calculator-btn'),
    calculatorCloseBtn: document.getElementById('calculator-close-btn'),
    reviewWrongBtn: document.getElementById('btn-review-wrong'),
    questionFilter: document.getElementById('question-filter'),
    leaderboardList: document.getElementById('leaderboard-list'),
    
    // Active Question elements
    questionNum: document.getElementById('question-num'),
    questionText: document.getElementById('question-text'),
    choicesContainer: document.getElementById('choices-container'),
    choices: document.querySelectorAll('.choice-item'),
    prevBtn: document.getElementById('prev-question-btn'),
    nextBtn: document.getElementById('next-question-btn'),
    hintBtn: document.getElementById('hint-toggle-btn'),
    explanationBox: document.getElementById('explanation-box'),
    explanationText: document.getElementById('explanation-text'),
    
    // Modal Result elements
    resultModal: document.getElementById('result-modal'),
    resultScore: document.getElementById('result-score'),
    resultPercent: document.getElementById('result-percent'),
    resultStatusBadge: document.getElementById('result-status-badge'),
    resultTimeSpent: document.getElementById('result-time-spent'),
    resultCorrectCount: document.getElementById('result-correct-count'),
    resultWrongCount: document.getElementById('result-wrong-count'),
    resultMsgText: document.getElementById('result-msg-text'),
    resultReviewBtn: document.getElementById('result-review-btn'),
    resultCloseBtn: document.getElementById('result-close-btn'),
    scoreRingBar: document.getElementById('score-ring-bar'),
    // (기존 코드) Modal Result elements 부근 아래에 추가
    questionJumpModal: document.getElementById('question-jump-modal'),
    questionJumpGrid: document.getElementById('question-jump-grid'),
    questionJumpCloseBtn: document.getElementById('question-jump-close-btn') // 맨 마지막 항목은 쉼
};

// Subject mapping details
const subjectDetails = {
    home: { name: '소개말', isReal: false },
    gas: { name: '가스기능사', isReal: true },
    energy_craftsman: { name: '에너지기능사', isReal: false },
    energy_industrial: { name: '에너지관리산업기사', isReal: true },
    energy_master: { name: '에너지관리기능장', isReal: true },
    air_conditioning: { name: '공조기능사', isReal: false }
};

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
    checkAppUpdate(); // 🔥 화면이 켜지자마자 가장 먼저 업데이트 확인
    
    // 홈페이지 타이틀 버전 동적 반영
    const heroTitle = document.querySelector('.hero-title .gradient-text');
    if (heroTitle) {
        heroTitle.innerText = `CBT V${APP_VERSION}`;
    }
    
    initTheme();
    initAutoLogoutSettings();
    initMaxSystemLogsSettings();
    checkLoginState();
    loadQuestions();
    registerEventListeners();
    
    if (state.currentUser) {
        resetIdleTimer();
    }
    
    router(); // Run initial routing based on page load hash state
});

// Check User Login State
function checkLoginState() {
    const savedUser = localStorage.getItem('cbt_current_user');
    const navSettingsText = dom.nav && dom.nav.settings ? dom.nav.settings.querySelector('.nav-text') : null;
    if (savedUser) {
        state.currentUser = savedUser;
        dom.loginFormContainer.classList.add('hidden');
        dom.subjectSelectionSection.classList.remove('hidden');
        if (dom.loginSubmitBtn) dom.loginSubmitBtn.classList.add('hidden');
        if (navSettingsText) {
            navSettingsText.innerText = savedUser;
        }
        updateHomeResumeButton();
    } else {
        state.currentUser = null;
        dom.loginFormContainer.classList.remove('hidden');
        if (dom.welcomeContainer) dom.welcomeContainer.classList.add('hidden');
        dom.subjectSelectionSection.classList.add('hidden');
        if (dom.loginSubmitBtn) dom.loginSubmitBtn.classList.remove('hidden');
        if (navSettingsText) {
            navSettingsText.innerText = '설정';
        }
        updateHomeResumeButton();
        
        // Load saved ID if present
        const savedId = localStorage.getItem('cbt_saved_id');
        if (savedId) {
            if (dom.loginId) dom.loginId.value = savedId;
            if (dom.saveIdCheck) dom.saveIdCheck.checked = true;
        }
    }
}

// Update Home Resume Button Visibility & Text
function updateHomeResumeButton() {
    if (!state.currentUser) {
        if (dom.homeResumeBtn) dom.homeResumeBtn.classList.add('hidden');
        if (dom.welcomeContainer) dom.welcomeContainer.classList.add('hidden');
        return;
    }
    
    const key = `cbt_${state.currentUser}_autosave_session`;
    const sessionStr = localStorage.getItem(key);
    
    if (sessionStr) {
        try {
            const session = JSON.parse(sessionStr);
            if (session && session.activeRound) {
                const round = session.activeRound;
                const subjectName = round.subject || '';
                const roundName = round.year ? `${round.year}년 ${round.round}` : round.round;
                const questionNum = (round.questions && round.questions[session.activeQuestionIndex])
                    ? round.questions[session.activeQuestionIndex].num
                    : (session.activeQuestionIndex + 1);
                
                if (dom.homeResumeBtn) {
                    dom.homeResumeBtn.innerText = `▶ ${subjectName} ${roundName}`;
                    dom.homeResumeBtn.classList.remove('hidden');
                }
                if (dom.welcomeContainer) {
                    dom.welcomeContainer.classList.remove('hidden');
                }
            } else {
                if (dom.homeResumeBtn) dom.homeResumeBtn.classList.add('hidden');
                if (dom.welcomeContainer) dom.welcomeContainer.classList.add('hidden');
            }
        } catch (e) {
            console.error('Error parsing session data:', e);
            if (dom.homeResumeBtn) dom.homeResumeBtn.classList.add('hidden');
            if (dom.welcomeContainer) dom.welcomeContainer.classList.add('hidden');
        }
    } else {
        if (dom.homeResumeBtn) dom.homeResumeBtn.classList.add('hidden');
        if (dom.welcomeContainer) dom.welcomeContainer.classList.add('hidden');
    }
}

// Auto Save Quiz Session State to LocalStorage
function autoSaveSession() {
    if (!state.currentUser || !state.activeRound || state.quizMode !== 'solving') return;
    if (state.activeRound.sessionType === 'wrong-review') return; // 👈 오답 복습 회차는 자동저장 생략
    
    const sessionData = {
        subject: state.activeSubject,
        activeRound: state.activeRound,
        activeQuestionIndex: state.activeQuestionIndex,
        userAnswers: state.userAnswers,
        checkedQuestions: state.checkedQuestions,
        permanentlyWrong: state.permanentlyWrong,
        permanentlyCorrect: state.permanentlyCorrect,
        questionTimeSpent: state.questionTimeSpent,
        timeSpentSeconds: state.timeSpentSeconds,
        timestamp: Date.now()
    };
    
    // 1. 전체 마지막 이어하기 세션 저장
    const globalKey = `cbt_${state.currentUser}_autosave_session`;
    localStorage.setItem(globalKey, JSON.stringify(sessionData));
    
    // 2. 해당 과목별 이어하기 세션 저장
    const subjectKey = `cbt_${state.currentUser}_autosave_session_${state.activeSubject}`;
    localStorage.setItem(subjectKey, JSON.stringify(sessionData));
}

// Reset Idle Timeout Auto-Logout Timer
function resetIdleTimer() {
    if (idleTimer) {
        clearTimeout(idleTimer);
    }
    
    if (!state.currentUser) return;
    
    const timeoutMs = (state.autoLogoutMinutes || 30) * 60 * 1000;
    idleTimer = setTimeout(() => {
        alert("장시간 조작이 없어 안전을 위해 자동 로그아웃 되었습니다.");
        logout();
    }, timeoutMs);
}

// Initialize Auto-Logout settings from localStorage
function initAutoLogoutSettings() {
    const savedMinutes = localStorage.getItem('cbt_auto_logout_minutes');
    if (savedMinutes) {
        state.autoLogoutMinutes = parseInt(savedMinutes, 10);
    } else {
        state.autoLogoutMinutes = 30; // default
    }
    
    if (dom.autoLogoutSelect) {
        dom.autoLogoutSelect.value = String(state.autoLogoutMinutes);
    }
}

// Initialize Max System Logs settings from localStorage
function initMaxSystemLogsSettings() {
    const savedMaxLogs = localStorage.getItem('cbt_max_system_logs');
    if (savedMaxLogs) {
        state.maxSystemLogs = parseInt(savedMaxLogs, 10);
    } else {
        state.maxSystemLogs = 100; // default
    }
    
    if (dom.maxLogsSelect) {
        dom.maxLogsSelect.value = String(state.maxSystemLogs);
    }
}

// Perform Login
function login() {
    const username = dom.loginId.value.trim();
    const password = dom.loginPw.value;

    if (!username) {
        alert('아이디를 입력해 주세요.');
        dom.loginId.focus();
        return;
    }

    if (password !== 'dongbu') {
        alert('비밀번호가 맞지 않습니다. (비밀번호: dongbu)');
        dom.loginPw.focus();
        return;
    }

    // Save ID check logic
    if (dom.saveIdCheck) {
        if (dom.saveIdCheck.checked) {
            localStorage.setItem('cbt_saved_id', username);
        } else {
            localStorage.removeItem('cbt_saved_id');
        }
    }

    // Login success
    localStorage.setItem('cbt_current_user', username);
    state.currentUser = username;
    
    // Base time initialization at login
    const now = Date.now();
    localStorage.setItem('session_base_time', now.toString());
    sessionBaseTime = now;
    logSystem('L01', 'OK', username);
    
    // UI transition
    dom.loginFormContainer.classList.add('hidden');
    dom.subjectSelectionSection.classList.remove('hidden');
    if (dom.loginSubmitBtn) dom.loginSubmitBtn.classList.add('hidden');
    
    const navSettingsText = dom.nav && dom.nav.settings ? dom.nav.settings.querySelector('.nav-text') : null;
    if (navSettingsText) {
        navSettingsText.innerText = username;
    }
    
    updateHomeResumeButton();
    logUserActivity('로그인 성공');
    
    // Start idle timer
    resetIdleTimer();
    
    // Smooth scroll to subject list
    setTimeout(() => {
        dom.subjectSelectionSection.scrollIntoView({ behavior: 'smooth' });
    }, 100);
}

// Perform Logout
function logout() {
    if (state.currentUser) {
        logUserActivity('로그아웃');
        logSystem('L02', 'OK', `로그아웃 시간: ${new Date().toLocaleString()}`);
    }
    localStorage.removeItem('cbt_current_user');
    localStorage.removeItem('session_base_time');
    sessionBaseTime = null;
    state.currentUser = null;
    dom.loginId.value = '';
    dom.loginPw.value = '';
    
    // Clear auto-logout idle timer
    if (idleTimer) {
        clearTimeout(idleTimer);
    }
    
    // Stop the quiz timer if running
    if (state.timerInterval) {
        clearInterval(state.timerInterval);
    }
    
    checkLoginState();
    switchTab('home');
}

// Log User Activity
function logUserActivity(msg) {
    if (!state.currentUser) return;
    const logsKey = `cbt_${state.currentUser}_logs`;
    const logs = JSON.parse(localStorage.getItem(logsKey)) || [];
    const now = new Date();
    const timeStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    
    logs.unshift({
        time: timeStr,
        message: msg
    });
    
    if (logs.length > 50) logs.pop();
    localStorage.setItem(logsKey, JSON.stringify(logs));
}

// Render Grading Dashboard
function renderGradingDashboard() {
    if (!state.currentUser) {
        dom.userActivityLogs.innerHTML = '<p class="no-data-msg">로그인이 필요한 서비스입니다.</p>';
        dom.lastSolvedInfo.innerHTML = '<p class="no-data-msg">로그인이 필요한 서비스입니다.</p>';
        dom.stats.totalSolved.innerText = '0';
        dom.stats.correctRate.innerText = '0%';
        dom.stats.passedExams.innerText = '0';
        return;
    }

    // Load stats
    const statsKey = `cbt_${state.currentUser}_global_stats`;
    const stats = JSON.parse(localStorage.getItem(statsKey)) || {
        totalSolved: 0,
        totalExamsAttempted: 0,
        passedExamsCount: 0,
        averageSum: 0
    };
    
    const averageRate = stats.totalExamsAttempted > 0 
        ? Math.round(stats.averageSum / stats.totalExamsAttempted) 
        : 0;
        
    dom.stats.totalSolved.innerText = stats.totalSolved.toLocaleString();
    dom.stats.correctRate.innerText = `${averageRate}%`;
    dom.stats.passedExams.innerText = stats.passedExamsCount.toLocaleString();

    // Load Last Solved Info
    const lastSolvedKey = `cbt_${state.currentUser}_last_solved`;
    const lastSolved = JSON.parse(localStorage.getItem(lastSolvedKey));
    if (lastSolved) {
        dom.lastSolvedInfo.innerHTML = `
            <div class="last-solved-item">
                <div class="last-solved-title">${lastSolved.subjectName}</div>
                <div class="last-solved-meta">
                    ${lastSolved.year ? lastSolved.year + '년 ' : ''}${lastSolved.round} / ${lastSolved.questionNum}번 문제 풀이 중
                    <br><span style="font-size: 11px; color: var(--text-muted);">최근 학습 시간: ${lastSolved.time}</span>
                </div>
                <div class="last-solved-actions">
                    <button class="btn btn-primary btn-sm" id="btn-resume-solving">이어 풀기 <i class="fa-solid fa-play"></i></button>
                </div>
            </div>
        `;
        
        document.getElementById('btn-resume-solving').addEventListener('click', () => {
            resumeLastSolved(lastSolved);
        });
    } else {
        dom.lastSolvedInfo.innerHTML = '<p class="no-data-msg">최근 학습한 이력이 없습니다.</p>';
    }

    // Load Activity Logs
    const logsKey = `cbt_${state.currentUser}_logs`;
    const logs = JSON.parse(localStorage.getItem(logsKey)) || [];
    if (logs.length > 0) {
        dom.userActivityLogs.innerHTML = logs.map(log => `
            <div class="log-item">
                <div class="log-header">
                    <span class="log-time">${log.time}</span>
                </div>
                <span class="log-message">${log.message}</span>
            </div>
        `).join('');
    } else {
        dom.userActivityLogs.innerHTML = '<p class="no-data-msg">활동 로그가 없습니다.</p>';
    }

    // Load Ranking Leaderboard
    renderLeaderboard();
}

// Resume Last Solved Question
function resumeLastSolved(lastSolved) {
    let roundsData = [];
    if (lastSolved.subject === 'gas') {
        roundsData = state.exams.gas || [];
    } else if (lastSolved.subject === 'energy_master') {
        roundsData = state.exams.energy_master || [];
    } else if (lastSolved.subject === 'energy_industrial') {
        roundsData = state.exams.energy_industrial || [];
    }
    
    const matchedRound = roundsData.find(r => r.year === lastSolved.year && r.round === lastSolved.round);
    if (matchedRound) {
        state.activeSubject = lastSolved.subject;
        state.activeRound = matchedRound;
        state.currentQuestions = matchedRound.questions;
        state.activeQuestionIndex = lastSolved.questionIndex;
        state.userAnswers = {};
        state.quizMode = 'solving';
        state.timeSpentSeconds = 0;
        
        dom.quizSubjectName.innerText = matchedRound.subject;
        dom.quizRoundName.innerText = matchedRound.year ? `${matchedRound.year}년 ${matchedRound.round}` : matchedRound.round;
        
        dom.explanationBox.classList.add('collapsed');
        renderMarkingSheet();
        renderActiveQuestion();
        
        // Start timer
        clearInterval(state.timerInterval);
        state.timerInterval = setInterval(() => {
            state.timeSpentSeconds++;
            const mins = String(Math.floor(state.timeSpentSeconds / 60)).padStart(2, '0');
            const secs = String(state.timeSpentSeconds % 60).padStart(2, '0');
            dom.timerText.innerText = `${mins}:${secs}`;
        }, 1000);
        
        logUserActivity(`${matchedRound.subject} ${matchedRound.round} ${lastSolved.questionNum}번부터 이어 풀기 시작`);
        const roundKey = `${matchedRound.subject}_${matchedRound.year || ''}_${matchedRound.round}`;
        logSystem('S01', 'OK', 'RESUME:' + roundKey + ':Q' + (lastSolved.questionIndex + 1));
        switchTab('quiz');
    } else {
        alert('해당 시험 데이터를 로드할 수 없습니다.');
    }
}

// Theme Control (Dark/Light Mode)
function initTheme() {
    const savedTheme = localStorage.getItem('cbt_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
}

function updateThemeIcon(theme) {
    const icon = dom.themeToggle.querySelector('i');
    if (theme === 'light') {
        icon.className = 'fa-solid fa-sun';
    } else {
        icon.className = 'fa-solid fa-moon';
    }
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('cbt_theme', newTheme);
    updateThemeIcon(newTheme);
}

// Load JSON Databases
async function loadQuestions() {
    // Gas Questions
    try {
        const response = await fetch('data/gas/gas_questions.json');
        if (response.ok) {
            state.exams.gas = await response.json();
            console.log('가스기능사 데이터 로드 완료:', state.exams.gas.length, '회차');
        } else {
            state.exams.gas = [];
        }
    } catch (error) {
        console.error('가스기능사 기출문제 파일 로드 에러:', error);
        logSystem('ERROR', '가스기능사 기출문제 파일 로드 실패', error.stack || error.message || error);
        state.exams.gas = [];
    }

    // Energy Master Questions
    try {
        const response = await fetch('data/energy_ginungjang/energy_ginungjang_questions.json');
        if (response.ok) {
            state.exams.energy_master = await response.json();
            console.log('에너지관리기능장 데이터 로드 완료:', state.exams.energy_master.length, '회차');
        } else {
            state.exams.energy_master = [];
        }
    } catch (error) {
        console.error('에너지관리기능장 기출문제 파일 로드 에러:', error);
        logSystem('ERROR', '에너지관리기능장 기출문제 파일 로드 실패', error.stack || error.message || error);
        state.exams.energy_master = [];
    }

    // Energy Industrial Gisa Questions
    try {
        const response = await fetch('data/energy_sanupgisa/energy_sanupgisa_questions.json');
        if (response.ok) {
            state.exams.energy_industrial = await response.json();
            console.log('에너지관리산업기사 데이터 로드 완료:', state.exams.energy_industrial.length, '회차');
        } else {
            state.exams.energy_industrial = [];
        }
    } catch (error) {
        console.error('에너지관리산업기사 기출문제 파일 로드 에러:', error);
        logSystem('ERROR', '에너지관리산업기사 기출문제 파일 로드 실패', error.stack || error.message || error);
        state.exams.energy_industrial = [];
    }
}

// Register Listeners
function registerEventListeners() {
    // Top Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            const tab = e.currentTarget.getAttribute('data-tab');
            switchTab(tab);
        });
    });
    

    
    // Theme Toggle
    if (dom.themeToggle) {
        dom.themeToggle.addEventListener('click', toggleTheme);
    }
    
    // Login Button on Dashboard
    if (dom.loginSubmitBtn) {
        dom.loginSubmitBtn.addEventListener('click', (e) => {
            e.preventDefault(); // 👈 [핵심] 로그인 시 화면 강제 새로고침 완벽 차단
            login();
        });
    }

    // Sub-tab toggling in Grading Dashboard
    document.querySelectorAll('.sub-tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const subtab = e.currentTarget.getAttribute('data-subtab');
            
            // Toggle active class on buttons
            document.querySelectorAll('.sub-tab-btn').forEach(b => b.classList.remove('active'));
            e.currentTarget.classList.add('active');
            
            // Toggle active class on contents
            document.querySelectorAll('.subtab-content').forEach(c => c.classList.remove('active'));
            const targetContent = document.getElementById(`subtab-content-${subtab}`);
            if (targetContent) targetContent.classList.add('active');
        });
    });
    
    // Logout Button
    if (dom.logoutBtn) {
        dom.logoutBtn.addEventListener('click', logout);
    }
    
    // Auto-logout select change
    if (dom.autoLogoutSelect) {
        dom.autoLogoutSelect.addEventListener('change', (e) => {
            const minutes = parseInt(e.target.value, 10);
            state.autoLogoutMinutes = minutes;
            localStorage.setItem('cbt_auto_logout_minutes', minutes);
            resetIdleTimer();
        });
    }
    
    // System logs max count select change
    if (dom.maxLogsSelect) {
        dom.maxLogsSelect.addEventListener('change', (e) => {
            const maxLogs = parseInt(e.target.value, 10);
            state.maxSystemLogs = maxLogs;
            localStorage.setItem('cbt_max_system_logs', maxLogs);
            
            // 설정 범위 초과 로그 잘라내기
            const user = state.currentUser || 'GUEST';
            let logs = [];
            try {
                logs = JSON.parse(localStorage.getItem(`cbt_${user}_system_logs`)) || [];
            } catch (err) {
                logs = [];
            }
            if (Array.isArray(logs) && logs.length > maxLogs) {
                logs.length = maxLogs;
                localStorage.setItem(`cbt_${user}_system_logs`, JSON.stringify(logs));
                renderSystemLogs();
            }
        });
    }
    
    // Global Idle Detection Events (only works if user logged in)
    const idleEvents = ['mousemove', 'click', 'keydown', 'scroll', 'touchstart'];
    idleEvents.forEach(evt => {
        document.addEventListener(evt, () => {
            if (state.currentUser) {
                resetIdleTimer();
            }
        });
    });
    
    // Home Resume Button
    if (dom.homeResumeBtn) {
        dom.homeResumeBtn.addEventListener('click', () => {
            if (!state.currentUser) return;
            const key = `cbt_${state.currentUser}_autosave_session`;
            const sessionStr = localStorage.getItem(key);
            if (!sessionStr) return;
            
            try {
                const session = JSON.parse(sessionStr);
                if (session && session.activeRound && Array.isArray(session.activeRound.questions) && session.activeRound.questions.length > 0) {
                    // Restore state variables
                    state.activeSubject = session.subject;
                    state.activeRound = session.activeRound;
                    state.activeQuestionIndex = session.activeQuestionIndex;
                    state.userAnswers = session.userAnswers || {};
                    state.checkedQuestions = session.checkedQuestions || {};
                    state.permanentlyWrong = session.permanentlyWrong || {};
                    state.permanentlyCorrect = session.permanentlyCorrect || {};
                    state.questionTimeSpent = session.questionTimeSpent || {};
                    state.timeSpentSeconds = session.timeSpentSeconds || 0;
                    state.lastActiveQuestionIndex = null;
                    if (dom.explanationBox) {
                        dom.explanationBox.classList.add('collapsed');
                    }
                    
                    // Call startQuiz with isResume = true
                    startQuiz(session.activeRound, true);
                } else {
                    localStorage.removeItem(key);
                    if (dom.homeResumeBtn) dom.homeResumeBtn.classList.add('hidden');
                    alert('이어할 수 있는 유효한 풀이 세션이 없습니다.');
                }
            } catch (e) {
                console.error('Error resuming session:', e);
                logSystem('ERROR', '홈 화면 이어하기 세션 복원 오류', e.stack || e.message || e);
                localStorage.removeItem(key);
                if (dom.homeResumeBtn) dom.homeResumeBtn.classList.add('hidden');
                alert('이어하기 중 오류가 발생했습니다.');
            }
        });
    }
    
    // Password Enter Key
    if (dom.loginPw) {
        dom.loginPw.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault(); // 👈 [핵심] 엔터키 입력 시 화면 강제 새로고침 완벽 차단
                login();
            }
        });
    }
    
    // Subject cards on Dashboard
    document.querySelectorAll('.subject-card').forEach(card => {
        card.addEventListener('click', () => {
            const subject = card.getAttribute('data-subject');
            navigateTo(subject);
        });
    });
    
    // Quiz navigation buttons (화면 튕김 방지 적용)
    dom.prevBtn.addEventListener('click', (e) => {
        e.preventDefault(); // 👈 [핵심] 이전 버튼 클릭 시 1번으로 튕기는 현상 완벽 차단
        prevQuestion();
    });
    dom.nextBtn.addEventListener('click', (e) => {
        e.preventDefault(); // 👈 [핵심] 다음 버튼 클릭 시 튕김 방지
        nextQuestion();
    });
    
    // 마킹 필터 버튼 클릭 이벤트 바인딩
    const filterBtns = document.querySelectorAll('.marking-filter-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const filterValue = btn.getAttribute('data-filter');
            state.questionFilter = filterValue;
            
            syncFilterButtonsUI();
            applyQuestionFilter();
            renderMarkingSheet();
            renderActiveQuestion();
            
            // 문제 이동 모달창이 열려있다면 모달 내부 그리드 필터링 갱신
            if (dom.questionJumpModal && dom.questionJumpModal.classList.contains('active')) {
                openQuestionJumpModal();
            }
        });
    });

    // Review wrong answer button
    if (dom.reviewWrongBtn) {
        dom.reviewWrongBtn.addEventListener('click', reviewWrongAnswers);
    }

    // Calculator button and modal
    if (dom.calculatorBtn) {
        dom.calculatorBtn.addEventListener('click', () => {
            if (dom.calculatorModal) dom.calculatorModal.classList.add('active');
        });
    }
    if (dom.calculatorCloseBtn) {
        dom.calculatorCloseBtn.addEventListener('click', () => {
            if (dom.calculatorModal) dom.calculatorModal.classList.remove('active');
        });
    }
    if (dom.calculatorButtons) {
        dom.calculatorButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                handleCalculatorInput(e.currentTarget.getAttribute('data-value'));
            });
        });
    }
    if (dom.calculatorModal) {
        dom.calculatorModal.addEventListener('click', (e) => {
            if (e.target === dom.calculatorModal) {
                dom.calculatorModal.classList.remove('active');
            }
        });
    }
    
    // 키보드로 계산기 입력 지원 (계산기가 활성화된 상태에서만 작동)
    document.addEventListener('keydown', (e) => {
        if (!dom.calculatorModal || !dom.calculatorModal.classList.contains('active')) return;
        
        const key = e.key;
        if (/^[0-9\+\-\.\(\)]$/.test(key)) {
            e.preventDefault();
            handleCalculatorInput(key);
        } else if (key === '*') {
            e.preventDefault();
            handleCalculatorInput('×'); // * 누르면 화면에는 곱하기 기호(×) 입력
        } else if (key === '/') {
            e.preventDefault();
            handleCalculatorInput('÷'); // / 누르면 화면에는 나누기 기호(÷) 입력
        } else if (key === '^') {
            e.preventDefault();
            handleCalculatorInput('^');
        } else if (key === 'Enter' || key === '=') {
            e.preventDefault();
            handleCalculatorInput('=');
        } else if (key === 'Backspace') {
            e.preventDefault();
            handleCalculatorInput('backspace');
        } else if (key === 'Escape' || key === 'c' || key === 'C') {
            e.preventDefault();
            handleCalculatorInput('C');
        }
    });
    
    // Manual Toggle Hint
    //dom.hintBtn.addEventListener('click', toggleHintBox);
    // Manual Toggle Hint (화면 튕김 방지 적용)
    dom.hintBtn.addEventListener('click', (e) => {
        e.preventDefault(); // 👈 [핵심] 버튼 본연의 새로고침/이동 속성을 완벽히 차단합니다.
        toggleHintBox();
    });
    
    // Choice selection buttons (화면 튕김 방지 및 번호/지문 클릭 분리)
    document.querySelectorAll('.choice-item').forEach(item => {
        const numBtn = item.querySelector('.choice-num-btn');
        const textBtn = item.querySelector('.choice-text-btn');
        const choiceNum = parseInt(item.getAttribute('data-choice'));
        
        if (numBtn) {
            numBtn.addEventListener('click', (e) => {
                e.preventDefault();
                handleSelectAnswer(choiceNum, true); // 번호 클릭 -> 체크 모드
            });
        }
        if (textBtn) {
            textBtn.addEventListener('click', (e) => {
                e.preventDefault();
                handleSelectAnswer(choiceNum, false); // 지문 클릭 -> 일반 마킹 모드
            });
        }
    });
    
    // Submit Exam
    dom.quizSubmitBtn.addEventListener('click', submitExam);
    if (dom.quizTopSubmitBtn) {
        dom.quizTopSubmitBtn.addEventListener('click', submitExam);
    }
    
    // Modal buttons
    dom.resultReviewBtn.addEventListener('click', () => {
        dom.resultModal.classList.remove('active');
        enterReviewMode();
    });
    
    dom.resultCloseBtn.addEventListener('click', () => {
        dom.resultModal.classList.remove('active');
        navigateTo(state.activeSubject);
    });
    // --- 문제 번호 뱃지 클릭 시 이동 모달 띄우기 ---
    if (dom.questionNum) {
        dom.questionNum.addEventListener('click', openQuestionJumpModal);
    }

    // --- 문제 이동 모달 닫기 ---
    if (dom.questionJumpCloseBtn) {
        dom.questionJumpCloseBtn.addEventListener('click', () => {
        if (dom.questionJumpModal) dom.questionJumpModal.classList.remove('active');
        });
    }

    // --- 문제 이동 모달 바깥 영역(어두운 배경) 클릭 시 닫기 ---
    if (dom.questionJumpModal) {
        dom.questionJumpModal.addEventListener('click', (e) => {
        if (e.target === dom.questionJumpModal) {
            dom.questionJumpModal.classList.remove('active');
        }
        });
    }
    
    // 시스템 로그 지우기 / 복사 이벤트 등록
    const clearLogsBtn = document.getElementById('clear-logs-btn');
    if (clearLogsBtn) {
        clearLogsBtn.addEventListener('click', () => {
            if (confirm('모든 시스템 로그를 삭제하시겠습니까?')) {
                const user = state.currentUser || 'GUEST';
                localStorage.removeItem(`cbt_${user}_system_logs`);
                renderSystemLogs();
            }
        });
    }
    
    const copyKoLogsBtn = document.getElementById('copy-ko-logs-btn');
    if (copyKoLogsBtn) {
        copyKoLogsBtn.addEventListener('click', () => {
            const user = state.currentUser || 'GUEST';
            let logs = [];
            try {
                logs = JSON.parse(localStorage.getItem(`cbt_${user}_system_logs`)) || [];
            } catch (e) {
                logs = [];
            }
            if (logs.length === 0) {
                alert('복사할 로그가 없습니다.');
                return;
            }
            const text = logs.map(log => {
                if (typeof log === 'string') {
                    const parts = log.split('|');
                    const offset = parts[0] || '+0';
                    const actionCode = parts[1] || '???';
                    const status = parts[2] || 'OK';
                    const stateInfo = parts.slice(3).join('|') || '';
                    
                    let absoluteTimeStr = '';
                    if (sessionBaseTime) {
                        const offsetSecs = parseInt(offset.replace('+', ''));
                        if (!isNaN(offsetSecs)) {
                            const absTime = new Date(sessionBaseTime + offsetSecs * 1000);
                            absoluteTimeStr = `${absTime.getFullYear()}-${String(absTime.getMonth() + 1).padStart(2, '0')}-${String(absTime.getDate()).padStart(2, '0')} ` +
                                              `${String(absTime.getHours()).padStart(2, '0')}:${String(absTime.getMinutes()).padStart(2, '0')}:${String(absTime.getSeconds()).padStart(2, '0')}`;
                        }
                    }
                    const timeDisplay = absoluteTimeStr ? `${absoluteTimeStr} (${offset}초)` : `${offset}초`;
                    
                    let actionName = actionCode;
                    let detailParsed = '';
                    switch (actionCode) {
                        case 'L01':
                            actionName = '로그인 완료';
                            detailParsed = `사용자 ID: ${stateInfo}`;
                            break;
                        case 'L02':
                            actionName = '로그아웃 완료';
                            detailParsed = stateInfo;
                            break;
                        case 'S01':
                            actionName = '시험 시작';
                            if (stateInfo.startsWith('START:')) {
                                detailParsed = `신규 시험 시작 - 회차: ${stateInfo.substring(6)}`;
                            } else if (stateInfo.startsWith('RESUME:')) {
                                detailParsed = `시험 이어 풀기 시작 - 회차: ${stateInfo.substring(7)}`;
                            } else {
                                detailParsed = `회차 정보: ${stateInfo}`;
                            }
                            break;
                        case 'A01':
                            actionName = '답안 마킹';
                            const aMatch = stateInfo.match(/^Q(\d+):(.*)$/);
                            if (aMatch) {
                                const ans = aMatch[2];
                                detailParsed = `${aMatch[1]}번 문제 정답 선택 (선택 번호: ${ans === '_' ? '없음/취소' : ans + '번'})`;
                            } else {
                                detailParsed = `마킹 정보: ${stateInfo}`;
                            }
                            break;
                        case 'H01':
                            actionName = '해설 토글';
                            const hMatch = stateInfo.match(/^Q(\d+):(COLLAPSED|EXPANDED)$/);
                            if (hMatch) {
                                detailParsed = `${hMatch[1]}번 문제 해설창 ${hMatch[2] === 'COLLAPSED' ? '닫음' : '엶'}`;
                            } else {
                                detailParsed = `해설 토글 상태: ${stateInfo}`;
                            }
                            break;
                        case 'N01':
                            actionName = '문제 이동';
                            const nMatch = stateInfo.match(/^Q(\d+)$/);
                            const routeMatch = stateInfo.match(/^Route:(.*)$/);
                            const navToMatch = stateInfo.match(/^NavTo:(.*)$/);
                            const switchTabMatch = stateInfo.match(/^SwitchTab:(.*)$/);
                            if (nMatch) {
                                detailParsed = `${nMatch[1]}번 문제로 화면 이동`;
                            } else if (routeMatch) {
                                detailParsed = `라우터 이동 (경로: ${routeMatch[1]})`;
                            } else if (navToMatch) {
                                detailParsed = `SPA 네비게이션 이동 (과목: ${navToMatch[1]})`;
                            } else if (switchTabMatch) {
                                detailParsed = `화면 탭 전환 (탭: ${switchTabMatch[1]})`;
                            } else {
                                detailParsed = `이동 정보: ${stateInfo}`;
                            }
                            break;
                        case 'J01':
                            actionName = '문제 점프';
                            const jMatch = stateInfo.match(/^JumpQ:(\d+)(.*)$/);
                            if (jMatch) {
                                detailParsed = `OMR 마킹판 또는 점프 모달에서 ${jMatch[1]}번 문제로 즉시 점프${jMatch[2] ? ' ' + jMatch[2] : ''}`;
                            } else {
                                detailParsed = `점프 대상: ${stateInfo}`;
                            }
                            break;
                        case 'M01':
                            actionName = '복습 진입';
                            detailParsed = '시험 복습(Review) 모드로 상태 강제 변경';
                            break;
                        case 'M02':
                            actionName = '오답 복습';
                            detailParsed = `오답 복습 세션 시작 - ${stateInfo}`;
                            break;
                        case 'E01':
                            actionName = '시스템 오류';
                            if (stateInfo.startsWith('ERR:')) {
                                detailParsed = `오류 상세 내용: ${stateInfo.substring(4)}`;
                            } else {
                                detailParsed = `오류 내용: ${stateInfo}`;
                            }
                            break;
                        default:
                            actionName = `이벤트(${actionCode})`;
                            detailParsed = stateInfo;
                    }
                    const level = (actionCode === 'E01' || status.includes('ERR')) ? 'ERROR' : (status.includes('WARN') ? 'WARNING' : 'INFO');
                    const message = `${actionName} (상태: ${status})`;
                    return `[${timeDisplay}] [${level}] ${message}\n상세 정보: ${detailParsed}\n----------------------------------`;
                } else {
                    return `[${log.timestamp}] [${log.level}] ${log.message}\n${log.details}\n----------------------------------`;
                }
            }).join('\n');
            navigator.clipboard.writeText(text)
                .then(() => alert('한글 번역 로그가 클립보드에 복사되었습니다.'))
                .catch(err => alert('복사 실패: ' + err));
        });
    }

    const copyRawLogsBtn = document.getElementById('copy-raw-logs-btn');
    if (copyRawLogsBtn) {
        copyRawLogsBtn.addEventListener('click', () => {
            const user = state.currentUser || 'GUEST';
            let logs = [];
            try {
                logs = JSON.parse(localStorage.getItem(`cbt_${user}_system_logs`)) || [];
            } catch (e) {
                logs = [];
            }
            if (logs.length === 0) {
                alert('복사할 로그가 없습니다.');
                return;
            }
            const text = logs.map(log => {
                if (typeof log === 'string') {
                    return log;
                } else {
                    const offset = log.timestamp || '+0';
                    const code = log.level === 'ERROR' ? 'E01' : 'U01';
                    const status = log.level || 'INFO';
                    const details = log.message + (log.details ? ' : ' + log.details : '');
                    return `${offset}|${code}|${status}|${details.replace(/[\r\n|]+/g, ' ')}`;
                }
            }).join('\n');
            navigator.clipboard.writeText(text)
                .then(() => alert('압축된 원본 로그가 클립보드에 복사되었습니다.'))
                .catch(err => alert('복사 실패: ' + err));
        });
    }
    
    // 시스템 로그 크게보기 모달 관련 리스너
    const viewLogsBtn = document.getElementById('view-logs-btn');
    const systemLogsModal = document.getElementById('system-logs-modal');
    const systemLogsCloseBtn = document.getElementById('system-logs-close-btn');
    
    if (viewLogsBtn && systemLogsModal) {
        viewLogsBtn.addEventListener('click', () => {
            systemLogsModal.classList.add('active');
            renderSystemLogs();
        });
    }
    
    if (systemLogsCloseBtn && systemLogsModal) {
        systemLogsCloseBtn.addEventListener('click', () => {
            systemLogsModal.classList.remove('active');
        });
        
        systemLogsModal.addEventListener('click', (e) => {
            if (e.target === systemLogsModal) {
                systemLogsModal.classList.remove('active');
            }
        });
    }
    
    // 모달 내 기능 버튼들의 동작을 기존 설정화면의 버튼에 위임(클릭 트리거)
    const modalClearBtn = document.getElementById('modal-clear-logs-btn');
    if (modalClearBtn) {
        modalClearBtn.addEventListener('click', () => {
            const btn = document.getElementById('clear-logs-btn');
            if (btn) btn.click();
        });
    }
    
    const modalCopyKoBtn = document.getElementById('modal-copy-ko-btn');
    if (modalCopyKoBtn) {
        modalCopyKoBtn.addEventListener('click', () => {
            const btn = document.getElementById('copy-ko-logs-btn');
            if (btn) btn.click();
        });
    }
    
    const modalCopyRawBtn = document.getElementById('modal-copy-raw-btn');
    if (modalCopyRawBtn) {
        modalCopyRawBtn.addEventListener('click', () => {
            const btn = document.getElementById('copy-raw-logs-btn');
            if (btn) btn.click();
        });
    }

    // Hash Routing Listeners
    window.addEventListener('hashchange', router);
    window.addEventListener('load', router);
}

// SPA Navigation Control
function navigateTo(subject) {
    logSystem('N01', 'OK', 'NavTo:' + subject);
    if (subject === 'home' || !subject) {
        window.location.hash = '#home';
    } else {
        window.location.hash = `#rounds/${subject}`;
    }
}

function switchTabStyles(tabName) {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('data-tab') === tabName) {
            item.classList.add('active');
        }
    });
}

function switchTab(tabName) {
    logSystem('N01', 'OK', 'SwitchTab:' + tabName);
    if (tabName === 'home') {
        window.location.hash = '#home';
    } else {
        window.location.hash = `#${tabName}`;
    }
}

function showView(viewName) {
    Object.keys(dom.screens).forEach(key => {
        if (key === viewName) {
            dom.screens[key].classList.add('active-view');
        } else {
            dom.screens[key].classList.remove('active-view');
        }
    });
    // Smooth scroll to top on view change
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// SPA Hash Router Implementation
function router() {
    logSystem('N01', 'OK', 'Route:' + (window.location.hash || '#home'));
    const hash = window.location.hash || '#home';
    
    // Login Session Protection: Intercept unauthenticated hash changes
    const isLoggedIn = !!state.currentUser;
    if (!isLoggedIn && hash !== '#home') {
        window.location.hash = '#home';
        return;
    }
    
    // Stop timers and reset active round if we leave quiz flow
    // (We allow '#settings' temporarily without clearing the quiz state)
    if (hash !== '#quiz' && hash !== '#grading' && hash !== '#settings') {
        if (state.timerInterval) {
            clearInterval(state.timerInterval);
        }
        state.activeRound = null;
        state.quizMode = 'solving';
    }
    
    if (hash === '#home') {
        state.activeSubject = 'home';
        switchTabStyles('home');
        showView('home');
        checkLoginState();
    } else if (hash.startsWith('#rounds/')) {
        const subject = hash.replace('#rounds/', '');
        state.activeSubject = subject;
        switchTabStyles('home');
        showView('rounds');
        renderRoundsList(subject);
    } else if (hash === '#quiz') {
        if (!state.activeRound) {
            alert('진행 중인 시험이 없습니다. 홈 화면에서 시험을 시작해 주세요.');
            window.location.hash = '#home';
            return;
        }
        switchTabStyles('quiz');
        showView('quiz');
        const quizScreen = document.getElementById('quiz-screen');
        if (quizScreen) {
            quizScreen.classList.add('show-quiz-main');
            quizScreen.classList.remove('show-quiz-sidebar');
        }
    } else if (hash === '#grading') {
        // 🔥 수정된 부분: 문제 풀이 중이든 아니든 무조건 성적 대시보드를 엽니다.
        switchTabStyles('grading');
        showView('grading');
        renderGradingDashboard();
    } else if (hash === '#settings') {
        switchTabStyles('settings');
        showView('settings');
        renderSystemLogs();
    } else {
        // Fallback for unknown hashes
        window.location.hash = '#home';
    }
}

// Render available rounds grid (V1.961 다중 시리즈 그룹핑 및 기존 디자인 완벽 복원)
function renderRoundsList(subject) {
    const seriesContainer = document.getElementById('series-container');
    if (!seriesContainer) return;

    seriesContainer.innerHTML = ''; // 화면 초기화

    let roundsData = [];
    if (subject === 'gas') {
        roundsData = state.exams.gas || [];
    } else if (subject === 'energy_master') {
        roundsData = state.exams.energy_master || [];
    } else if (subject === 'energy_industrial') {
        roundsData = state.exams.energy_industrial || [];
    } else {
        roundsData = mockExams[subject] || [];
    }

    // 데이터 로딩 지연 처리
    if (roundsData.length === 0) {
        seriesContainer.innerHTML = `<div class="no-data-msg" style="text-align: center; padding: 40px; color: var(--text-muted);">
            <i class="fa-solid fa-spinner fa-spin" style="font-size: 32px; margin-bottom: 15px; display: block; color: var(--primary);"></i>
            기출문제 데이터를 로딩하고 있습니다. 잠시만 기다려주세요...
        </div>`;
        setTimeout(() => renderRoundsList(subject), 500);
        return;
    }

    // 🔥 1. JSON 데이터를 '시리즈 제목(round.subject)' 기준으로 그룹화
    const groupedRounds = {};
    roundsData.forEach(round => {
        // [안전장치]: 과목명이 비어있을 경우 기존 설정된 이름으로 대처하여 앱 멈춤 방지
        const seriesName = round.subject || (subjectDetails[subject] ? subjectDetails[subject].name : '기출문제');
        if (!groupedRounds[seriesName]) {
            groupedRounds[seriesName] = [];
        }
        groupedRounds[seriesName].push(round);
    });

    // 🔥 2. 그룹별로 UI 블록 반복 생성 (선생님의 기존 디자인 100% 복원)
    Object.keys(groupedRounds).forEach(seriesName => {
        const seriesData = groupedRounds[seriesName];

        // A. 시리즈 전체를 감싸는 래퍼 박스
        const seriesWrapper = document.createElement('div');
        seriesWrapper.className = 'series-wrapper';
        seriesWrapper.style.marginBottom = '50px'; // 시리즈 간 넉넉한 간격 유지

        // B. 상단 헤더 영역 (과목명, 이어하기, 오답풀기 3개 단추 배치)
        const headerDiv = document.createElement('div');
        headerDiv.className = 'rounds-header';
        headerDiv.style.display = 'flex';
        headerDiv.style.alignItems = 'center';
        headerDiv.style.justifyContent = 'space-between';
        headerDiv.style.borderBottom = '1px solid var(--glass-border)';
        headerDiv.style.paddingBottom = '15px';
        headerDiv.style.marginBottom = '20px';
        headerDiv.style.gap = '8px'; // 단추 간 좁은 모바일 화면 대응 간격

        // B-1. 과목명 단추 (클릭 시 홈으로 이동)
        const subjectBtn = document.createElement('button');
        subjectBtn.className = 'btn btn-outline';
        subjectBtn.innerText = seriesName;
        subjectBtn.style.flex = '1';
        subjectBtn.style.maxWidth = '180px'; // 데스크탑에서 너무 커지지 않도록 폭 제한
        subjectBtn.style.textAlign = 'center';
        subjectBtn.style.whiteSpace = 'nowrap';
        subjectBtn.style.overflow = 'hidden';
        subjectBtn.style.textOverflow = 'ellipsis';
        subjectBtn.style.fontSize = '14px';
        subjectBtn.style.padding = '8px 4px'; // 좁은 화면 대비 패딩 축소
        subjectBtn.addEventListener('click', () => {
            window.location.hash = '#home';
        });

        // B-2. 과목별 이어하기 단추
        const resumeBtn = document.createElement('button');
        resumeBtn.className = 'btn btn-primary';
        resumeBtn.innerText = '이어하기';
        resumeBtn.style.flex = '1';
        resumeBtn.style.maxWidth = '180px'; // 데스크탑에서 너무 커지지 않도록 폭 제한
        resumeBtn.style.fontSize = '14px';
        resumeBtn.style.padding = '8px 4px';
        
        const sessionKey = `cbt_${state.currentUser}_autosave_session_${subject}`;
        const sessionStr = localStorage.getItem(sessionKey);
        
        if (!sessionStr) {
            resumeBtn.disabled = true;
            resumeBtn.style.opacity = '0.5';
            resumeBtn.style.cursor = 'not-allowed';
        } else {
            try {
                const session = JSON.parse(sessionStr);
                if (session && session.activeRound) {
                    const r = session.activeRound;
                    const roundName = r.year ? `${r.year}년 ${r.round}` : r.round;
                    resumeBtn.innerText = `▶ ${roundName}`;
                }
            } catch (e) {
                console.error('Error parsing resume button session:', e);
            }
            
            resumeBtn.addEventListener('click', () => {
                try {
                    const session = JSON.parse(sessionStr);
                    if (session && session.activeRound && Array.isArray(session.activeRound.questions) && session.activeRound.questions.length > 0) {
                        state.activeSubject = session.subject;
                        state.activeRound = session.activeRound;
                        state.activeQuestionIndex = session.activeQuestionIndex;
                        state.userAnswers = session.userAnswers || {};
                        state.checkedQuestions = session.checkedQuestions || {};
                        state.permanentlyWrong = session.permanentlyWrong || {};
                        state.permanentlyCorrect = session.permanentlyCorrect || {};
                        state.questionTimeSpent = session.questionTimeSpent || {};
                        state.timeSpentSeconds = session.timeSpentSeconds || 0;
                        state.lastActiveQuestionIndex = null;
                        if (dom.explanationBox) {
                            dom.explanationBox.classList.add('collapsed');
                        }
                        
                        startQuiz(session.activeRound, true);
                    } else {
                        alert('이어할 수 있는 유효한 풀이 세션이 없습니다.');
                    }
                } catch (e) {
                    console.error('Error resuming session:', e);
                    logSystem('ERROR', `과목 상세(${subject}) 이어하기 세션 복원 오류`, e.stack || e.message || e);
                    alert('이어하기 중 오류가 발생했습니다.');
                }
            });
        }

        // B-3. 오답풀기 단추 (불필요한 이모지 제거하여 단축폭 축소)
        const reviewBtn = document.createElement('button');
        reviewBtn.className = 'btn btn-warning'; 
        reviewBtn.innerText = '오답풀기';
        reviewBtn.style.flex = '1';
        reviewBtn.style.maxWidth = '180px'; // 데스크탑에서 너무 커지지 않도록 폭 제한
        reviewBtn.style.fontSize = '14px';
        reviewBtn.style.padding = '8px 4px';
        reviewBtn.addEventListener('click', () => {
            reviewWrongAnswers();
        });

        headerDiv.appendChild(subjectBtn);
        headerDiv.appendChild(resumeBtn);
        headerDiv.appendChild(reviewBtn);

        // C. 하단 회차 단추들을 담을 그리드 영역
        const gridDiv = document.createElement('div');
        gridDiv.className = 'rounds-grid';

        seriesData.forEach(round => {
            const card = document.createElement('div');
            card.className = 'round-card';

            // 진행도(score/total) 표시 가져오기
            const progressKey = `cbt_progress_${state.currentUser ? state.currentUser + '_' : ''}${subject}_${round.year}_${round.round}`;
            const progress = JSON.parse(localStorage.getItem(progressKey)) || { score: 0, total: 0, completed: false };

            let completedText = '';
            if (progress.completed) {
                completedText = `<span class="round-complete-status">풀이완료 (${progress.score}/${progress.total})</span>`;
            }

            // V8.4에서 수정한 "2017년 1회" 또는 "실전모의 1회" 단추 렌더링
            card.innerHTML = `
                <div class="round-info-line">
                    <span class="round-title">${round.year ? `${round.year}년 ` : ''}${round.round}</span>
                    <span class="round-desc">(${round.questions.length}문제)</span>
                    ${completedText}
                </div>
            `;

            // 클릭 시 해당 회차 퀴즈 시작
            card.addEventListener('click', () => {
                startQuiz(round);
            });

            gridDiv.appendChild(card);
        });

        // D. 뼈대에 조립하여 최종 부착
        seriesWrapper.appendChild(headerDiv);
        seriesWrapper.appendChild(gridDiv);
        seriesContainer.appendChild(seriesWrapper);
    });
}
function startQuiz(round, isResume = false) {
    state.activeRound = round;
    
    // Inject source metadata cleanly without mutating the original questions list
    const subject = state.activeSubject;
    const year = round.year || '';
    const roundName = round.round;
    const roundKey = `${subject}_${year}_${roundName}`;
    
    state.currentQuestions = (round.questions || []).map(q => {
        const sourceRoundKey = q.sourceRoundKey || roundKey;
        return {
            ...q,
            sourceRoundKey,
            sourceQuestionKey: q.sourceQuestionKey || `${sourceRoundKey}_${q.num}`
        };
    });

    if (!isResume) {
        state.activeQuestionIndex = 0;
        state.userAnswers = {};
        state.checkedQuestions = {};
        state.questionTimeSpent = {};
        state.timeSpentSeconds = 0;
        state.questionFilter = 'all';
        state.lastActiveQuestionIndex = null;
        state.hasSuggestedSubmit = false;

        if (round.sessionType === 'wrong-review') {
            // 오답 복습 모드인 경우: 모든 문제를 최초 오답(빨간색)으로 세팅하여 사이드바 결과 동기화
            state.permanentlyWrong = {};
            state.permanentlyCorrect = {};
            round.questions.forEach((_, idx) => {
                state.permanentlyWrong[idx] = true;
            });
        } else {
            state.permanentlyWrong = {};
            state.permanentlyCorrect = {};
        }

        if (dom.explanationBox) {
            dom.explanationBox.classList.add('collapsed');
        }
        if (dom.questionFilter) {
            dom.questionFilter.value = 'all';
        }
    }
    state.quizMode = 'solving';
    syncFilterButtonsUI();
    
    logUserActivity(`${round.subject} ${round.round} 시험 시작` + (isResume ? ' (이어하기)' : ''));
    
    if (!localStorage.getItem('session_base_time')) {
        const now = Date.now();
        localStorage.setItem('session_base_time', now.toString());
        sessionBaseTime = now;
    }
    logSystem('S01', 'OK', (isResume ? 'RESUME:' : 'START:') + roundKey);
    
    // Set Header titles
    dom.quizSubjectName.innerText = round.subject;
    dom.quizRoundName.innerText = round.year ? `${round.year}년 ${round.round}` : round.round;
    
    // Clear elements styling
    dom.explanationBox.classList.add('collapsed');
    
    // Render Marking sheet
    renderMarkingSheet();
    
    // Render first question
    renderActiveQuestion();
    
    // Start timer
    clearInterval(state.timerInterval);
    const initialMins = String(Math.floor(state.timeSpentSeconds / 60)).padStart(2, '0');
    const initialSecs = String(state.timeSpentSeconds % 60).padStart(2, '0');
    dom.timerText.innerText = `${initialMins}:${initialSecs}`;
    
    state.timerInterval = setInterval(() => {
        state.timeSpentSeconds++;
        const mins = String(Math.floor(state.timeSpentSeconds / 60)).padStart(2, '0');
        const secs = String(state.timeSpentSeconds % 60).padStart(2, '0');
        dom.timerText.innerText = `${mins}:${secs}`;
    }, 1000);
    
    // Show screen and switch tab to quiz
    switchTab('quiz');
    
    // Auto-save session
    autoSaveSession();
}

// Render Left side markings grid (1~60)
function renderMarkingSheet() {
    dom.markingSheet.innerHTML = '';
    
    state.currentQuestions.forEach((q, idx) => {
        const btn = document.createElement('button');
        btn.className = 'marking-btn';
        btn.innerText = q.num;
        btn.id = `marking-num-${idx}`;
        
        btn.addEventListener('click', () => {
            state.activeQuestionIndex = idx;
            renderActiveQuestion();
            switchTab('quiz'); // Switch view tab to quiz
            logSystem('J01', 'OK', 'JumpQ:' + (idx + 1));
        });
        
        dom.markingSheet.appendChild(btn);
    });
    
    updateMarkingStatus();
}

function doesQuestionMatchFilter(index) {
    const q = state.currentQuestions[index];
    if (!q) return false;

    const userAnswer = state.userAnswers[index];
    const isPermanentlyCorrect = state.permanentlyCorrect[index] === true;
    const isPermanentlyWrong = state.permanentlyWrong[index] === true;

    if (state.questionFilter === 'wrong') {
        // 최초 오답 판정을 받았거나, 아직 판정이 안 났는데 임시 답안이 오답인 경우
        return isPermanentlyWrong || (!isPermanentlyCorrect && userAnswer !== undefined && userAnswer !== q.answer);
    }
    if (state.questionFilter === 'unanswered') {
        // 최초 판정이 전혀 없고, 현재 임시 답안도 없는 미풀이 상태
        return !isPermanentlyCorrect && !isPermanentlyWrong && userAnswer === undefined;
    }
    if (state.questionFilter === 'checked') {
        return state.checkedQuestions[index] === true;
    }
    return true;
}

function getAdjacentFilteredIndex(direction) {
    let idx = state.activeQuestionIndex + direction;
    while (idx >= 0 && idx < state.currentQuestions.length) {
        if (doesQuestionMatchFilter(idx)) {
            return idx;
        }
        idx += direction;
    }
    return null;
}

// 특정 필터명에 대응하는 질문들이 존재하는지 판단하는 헬퍼 함수
function hasQuestionsForFilter(filterName) {
    if (!state.currentQuestions || state.currentQuestions.length === 0) return false;
    return state.currentQuestions.some((q, index) => {
        const userAnswer = state.userAnswers[index];
        const isPermanentlyCorrect = state.permanentlyCorrect[index] === true;
        const isPermanentlyWrong = state.permanentlyWrong[index] === true;

        if (filterName === 'wrong') {
            return isPermanentlyWrong || (!isPermanentlyCorrect && userAnswer !== undefined && userAnswer !== q.answer);
        }
        if (filterName === 'checked') {
            return state.checkedQuestions[index] === true;
        }
        if (filterName === 'unanswered') {
            return !isPermanentlyCorrect && !isPermanentlyWrong && userAnswer === undefined;
        }
        return true; // 'all' (전체)은 항상 참
    });
}

function syncFilterButtonsUI() {
    // 1. 현재 선택된 필터에 해당하는 문제가 없다면 자동으로 'all'로 리셋
    if (state.questionFilter !== 'all' && !hasQuestionsForFilter(state.questionFilter)) {
        state.questionFilter = 'all';
    }

    const filterBtns = document.querySelectorAll('.marking-filter-btn');
    filterBtns.forEach(btn => {
        const filterVal = btn.getAttribute('data-filter');
        const hasData = hasQuestionsForFilter(filterVal);
        
        // 데이터가 없으면 버튼을 비활성화
        btn.disabled = !hasData;
        
        if (filterVal === state.questionFilter) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    // 상단 헤더의 필터 모드 배지 상태 업데이트
    const statusBadge = document.getElementById('filter-status-badge');
    if (statusBadge) {
        statusBadge.className = 'filter-badge'; // 기본화
        if (state.questionFilter === 'all') {
            statusBadge.innerText = '전체';
            statusBadge.classList.add('badge-all');
        } else if (state.questionFilter === 'wrong') {
            statusBadge.innerText = '오답';
            statusBadge.classList.add('badge-wrong');
        } else if (state.questionFilter === 'checked') {
            statusBadge.innerText = '체크';
            statusBadge.classList.add('badge-checked');
        }
    }
}

function applyQuestionFilter() {
    // 강제 문제 점프 및 Alert 경고창 제거하여 오직 UI만 동기화하도록 함
    syncFilterButtonsUI();
}

function updateMarkingStatus() {
    state.currentQuestions.forEach((q, idx) => {
        const btn = document.getElementById(`marking-num-${idx}`);
        if (!btn) return;
        
        btn.className = 'marking-btn';
        btn.style.display = doesQuestionMatchFilter(idx) ? 'inline-flex' : 'none';
        
        const userAnswer = state.userAnswers[idx];
        const isPermanentlyCorrect = state.permanentlyCorrect[idx] === true;
        const isPermanentlyWrong = state.permanentlyWrong[idx] === true;
        
        if (isPermanentlyCorrect) {
            btn.classList.add('correct'); // 최초 정답 -> 실시간 풀이 중에도 녹색 고정!
        } else if (isPermanentlyWrong) {
            btn.classList.add('wrong');   // 최초 오답 -> 실시간 풀이 중에도 빨간색 고정!
        } else if (userAnswer !== undefined && userAnswer !== null) {
            if (state.quizMode === 'solving') {
                // 풀이 도중 최초 판정이 나기 전에는 일반 마킹(solved) vs 체크 마킹(checked=주황색) 구분
                const isChecked = state.checkedQuestions[idx] === true;
                if (isChecked) {
                    btn.classList.add('checked');
                } else {
                    btn.classList.add('solved');
                }
            } else if (state.quizMode === 'review') {
                // 리뷰 모드일 때만 채점 결과(correct=녹색, wrong=빨간색) 반영
                const correctAnswer = q.answer;
                if (Number(userAnswer) === Number(correctAnswer)) {
                    btn.classList.add('correct');
                } else {
                    btn.classList.add('wrong');
                }
            }
        }
        
        // Active highlight (border and shadow)
        if (state.activeQuestionIndex === idx) {
            btn.classList.add('active');
        }
    });
    
    // Progress counter
    const answeredCount = state.currentQuestions.filter((_, idx) => {
        return state.permanentlyCorrect[idx] === true || 
               state.permanentlyWrong[idx] === true || 
               (state.userAnswers[idx] !== undefined && state.userAnswers[idx] !== null);
    }).length;
    dom.quizProgressText.innerText = `${answeredCount} / ${state.currentQuestions.length}`;
    
    // 실시간 스코어판 갱신
    updateRealtimeScore();
}

function updateRealtimeScore() {
    if (!dom.scoreText) return;
    
    let totalScore = 0;
    state.currentQuestions.forEach((q, idx) => {
        const isPermanentlyCorrect = state.permanentlyCorrect[idx] === true;
        
        if (isPermanentlyCorrect) {
            const timeSpent = state.questionTimeSpent[idx];
            let speedBonus = 0;
            if (timeSpent !== undefined && timeSpent !== null && timeSpent < 100) {
                speedBonus = 100 - timeSpent;
            }
            totalScore += (100 + speedBonus);
        }
    });
    
    dom.scoreText.innerText = totalScore;
}

function initializeQuestionFilter() {
    if (dom.questionFilter) {
        dom.questionFilter.value = state.questionFilter;
    }
}

// Render active question to view pane
function renderActiveQuestion(keepExplanationOpen = false) {
    // ⚠️ 주의: 이 함수는 state를 변경하지 않습니다 (Read-Only View).
    //         인덱스 변경은 nextQuestion/prevQuestion/filter 핸들러에서만 수행되어야 합니다.
    const q = state.currentQuestions[state.activeQuestionIndex];
    if (!q) return;
    
    // 문제 변경 감지
    const isQuestionChanged = state.lastActiveQuestionIndex !== state.activeQuestionIndex;
    state.lastActiveQuestionIndex = state.activeQuestionIndex;
    
    // 개별 문제 풀이 타이머 시작 지점 기록
    if (state.quizMode === 'solving') {
        const activeIdx = state.activeQuestionIndex;
        const hasJudgment = state.permanentlyCorrect[activeIdx] === true || state.permanentlyWrong[activeIdx] === true;
        if (!hasJudgment) {
            state.questionStartTime = Date.now();
        } else {
            state.questionStartTime = null; // 계측 정지
        }
    }
    
    // Save last solved question info for resume
    if (state.currentUser && state.activeRound && state.quizMode === 'solving') {
        const lastSolvedKey = `cbt_${state.currentUser}_last_solved`;
        const now = new Date();
        const timeStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
        localStorage.setItem(lastSolvedKey, JSON.stringify({
            subject: state.activeSubject,
            subjectName: subjectDetails[state.activeSubject].name,
            year: state.activeRound.year,
            round: state.activeRound.round,
            questionIndex: state.activeQuestionIndex,
            questionNum: q.num,
            time: timeStr
        }));
    }
    
    // Question layout (remove "Q. " prefix)
    dom.questionNum.innerText = String(q.num).padStart(2, '0');
    dom.questionText.innerHTML = q.question;
    
    // Sync active question num badge color based on grading (최초 판정 기준 고정: 맞춘 건 녹색, 틀린 건 빨간색)
    if (dom.questionNum) {
        dom.questionNum.className = 'question-num-badge'; // 기본화
        const isPermanentlyCorrect = state.permanentlyCorrect[state.activeQuestionIndex] === true;
        const isPermanentlyWrong = state.permanentlyWrong[state.activeQuestionIndex] === true;
        if (isPermanentlyCorrect) {
            dom.questionNum.classList.add('correct');
        } else if (isPermanentlyWrong) {
            dom.questionNum.classList.add('wrong');
        }
    }
    
    // Options HTML binding
    dom.choices.forEach((item, idx) => {
        const choiceNum = idx + 1;
        const textBtn = item.querySelector('.choice-text-btn');
        if (textBtn) {
            textBtn.innerHTML = q.options[idx] || '';
        }
        
        // Reset option styles
        item.className = 'choice-item';
        
        const userAnswer = state.userAnswers[state.activeQuestionIndex];
        const correctAnswer = q.answer;
        
        if (userAnswer !== undefined && userAnswer !== null) {
            if (state.quizMode === 'solving') {
                // 1) 풀이 모드: 선택한 보기가 정답이면 녹색(correct), 오답이면 빨간색(wrong)으로 보기 번호와 보기 지문 모두 처리
                if (choiceNum === userAnswer) {
                    const isCorrect = Number(userAnswer) === Number(correctAnswer);
                    if (isCorrect) {
                        item.classList.add('correct');
                        
                        // 만약 번호를 클릭해 체크 마킹한 상태라면 주황색 체크 아이콘 오버레이도 함께 띄워줌
                        const isChecked = state.checkedQuestions[state.activeQuestionIndex] === true;
                        if (isChecked) {
                            item.classList.add('checked');
                        }
                    } else {
                        item.classList.add('wrong');
                        
                        // 만약 번호를 클릭해 체크 마킹한 상태라면 주황색 체크 아이콘 오버레이도 함께 띄워줌
                        const isChecked = state.checkedQuestions[state.activeQuestionIndex] === true;
                        if (isChecked) {
                            item.classList.add('checked');
                        }
                    }
                }
            } else if (state.quizMode === 'review') {
                // 2) 리뷰 모드: 채점 결과 데코레이션
                if (Number(userAnswer) === Number(correctAnswer)) {
                    // 맞춘 문항: 정답 보기만 초록색으로 칠함
                    if (choiceNum === correctAnswer) {
                        item.classList.add('correct');
                    }
                } else {
                    // 틀린 문항: 고른 답은 빨강, 실제 정답은 reveal-correct로 칠함
                    if (choiceNum === correctAnswer) {
                        item.classList.add('reveal-correct');
                    } else if (choiceNum === userAnswer) {
                        item.classList.add('wrong');
                    }
                }
            }
        }
    });
    
    // Hint & Explanation Box
    dom.explanationText.innerHTML = q.hint || '이 문제에 대한 별도 해설 정보가 없습니다.';
    
    const userAnswer = state.userAnswers[state.activeQuestionIndex];
    // 리뷰 모드일 때만 이미 푼 문제의 해설 박스를 자동으로 열어줌! (풀이 중엔 닫음)
    if (userAnswer !== undefined && state.quizMode === 'review') {
        dom.explanationBox.classList.remove('collapsed');
    } else if (isQuestionChanged && !keepExplanationOpen) {
        dom.explanationBox.classList.add('collapsed');
    }
    
    // Prev/Next buttons state
    dom.prevBtn.disabled = state.activeQuestionIndex === 0;
    dom.nextBtn.disabled = state.activeQuestionIndex === state.currentQuestions.length - 1;
    
    // Sync marking board navigation
    updateMarkingStatus();
    
    // Auto-save session
    autoSaveSession();
}

// Choice Click logic (번호 클릭 시 체크 모드 토글, 지문 클릭 시 일반 마킹으로 전이)
function handleSelectAnswer(choiceNum, isCheckMode = false) {
    if (state.quizMode === 'review') return;
    
    const activeIdx = state.activeQuestionIndex;
    const currentAnswer = state.userAnswers[activeIdx];
    const isCurrentlyChecked = state.checkedQuestions[activeIdx] === true;
    
    const q = state.currentQuestions[activeIdx];
    // 오답 복습 모드에서는 고정 채점이 아닌 실시간 재채점이 허용되어야 합니다.
    const isWrongReview = state.activeRound && state.activeRound.sessionType === 'wrong-review';
    const hasJudgment = !isWrongReview && (state.permanentlyCorrect[activeIdx] === true || state.permanentlyWrong[activeIdx] === true);
    
    if (hasJudgment) {
        // 1) 이미 최초 채점이 끝난 문항: 단순 답안 선택 변경만 허용 (추가 판정이나 경과 시간 계산 안 함)
        if (isCheckMode) {
            if (currentAnswer === choiceNum) {
                if (isCurrentlyChecked) {
                    delete state.userAnswers[activeIdx];
                    delete state.checkedQuestions[activeIdx];
                } else {
                    state.checkedQuestions[activeIdx] = true;
                }
            } else {
                state.userAnswers[activeIdx] = choiceNum;
                state.checkedQuestions[activeIdx] = true;
            }
        } else {
            if (currentAnswer === choiceNum) {
                if (!isCurrentlyChecked) {
                    delete state.userAnswers[activeIdx];
                    delete state.checkedQuestions[activeIdx];
                } else {
                    state.checkedQuestions[activeIdx] = false;
                }
            } else {
                state.userAnswers[activeIdx] = choiceNum;
                state.checkedQuestions[activeIdx] = false;
            }
        }
    } else {
        // 2) 최초 풀이인 문항 (또는 오답 복습 중 재채점): 신규 채점 및 시간 기록 수행
        if (isCheckMode) {
            if (currentAnswer === choiceNum) {
                if (isCurrentlyChecked) {
                    delete state.userAnswers[activeIdx];
                    delete state.checkedQuestions[activeIdx];
                    // 마킹이 완전히 해제된 경우 정오답 상태 정보도 함께 완전히 제거
                    delete state.permanentlyCorrect[activeIdx];
                    delete state.permanentlyWrong[activeIdx];
                } else {
                    state.checkedQuestions[activeIdx] = true;
                    if (q) {
                        if (Number(choiceNum) === Number(q.answer)) {
                            state.permanentlyCorrect[activeIdx] = true;
                            delete state.permanentlyWrong[activeIdx];
                        } else {
                            state.permanentlyWrong[activeIdx] = true;
                            delete state.permanentlyCorrect[activeIdx];
                        }
                    }
                }
            } else {
                state.userAnswers[activeIdx] = choiceNum;
                state.checkedQuestions[activeIdx] = true;
                if (q) {
                    if (Number(choiceNum) === Number(q.answer)) {
                        state.permanentlyCorrect[activeIdx] = true;
                        delete state.permanentlyWrong[activeIdx];
                    } else {
                        state.permanentlyWrong[activeIdx] = true;
                        delete state.permanentlyCorrect[activeIdx];
                    }
                }
            }
        } else {
            if (currentAnswer === choiceNum) {
                if (!isCurrentlyChecked) {
                    delete state.userAnswers[activeIdx];
                    delete state.checkedQuestions[activeIdx];
                    delete state.permanentlyCorrect[activeIdx];
                    delete state.permanentlyWrong[activeIdx];
                } else {
                    state.checkedQuestions[activeIdx] = false;
                    if (q) {
                        if (Number(choiceNum) === Number(q.answer)) {
                            state.permanentlyCorrect[activeIdx] = true;
                            delete state.permanentlyWrong[activeIdx];
                        } else {
                            state.permanentlyWrong[activeIdx] = true;
                            delete state.permanentlyCorrect[activeIdx];
                        }
                    }
                }
            } else {
                state.userAnswers[activeIdx] = choiceNum;
                state.checkedQuestions[activeIdx] = false;
                if (q) {
                    if (Number(choiceNum) === Number(q.answer)) {
                        state.permanentlyCorrect[activeIdx] = true;
                        delete state.permanentlyWrong[activeIdx];
                    } else {
                        state.permanentlyWrong[activeIdx] = true;
                        delete state.permanentlyCorrect[activeIdx];
                    }
                }
            }
        }
        
        // 최초 답변 마킹 시 걸린 시간 기록
        if (state.userAnswers[activeIdx] !== undefined && state.userAnswers[activeIdx] !== null) {
            if (state.questionTimeSpent[activeIdx] === undefined) {
                const elapsed = Math.floor((Date.now() - (state.questionStartTime || Date.now())) / 1000);
                state.questionTimeSpent[activeIdx] = Math.max(1, elapsed);
            }
        }
    }
    
    // Render current question updates (apply colors, OMR sync)
    renderActiveQuestion();
    updateMarkingStatus();
    
    // Auto-save session
    autoSaveSession();
    
    logSystem('A01', 'OK', 'Q' + (activeIdx + 1) + ':' + (state.userAnswers[activeIdx] || '_'));

    // 전체 최초 채점 완료 개수를 세어 제출 제안 팝업 노출 (세션 중 딱 1회만 노출)
    const completedCount = state.currentQuestions.filter((_, idx) => {
        return state.permanentlyCorrect[idx] === true || state.permanentlyWrong[idx] === true;
    }).length;

    if (completedCount === state.currentQuestions.length) {
        if (!state.hasSuggestedSubmit) {
            state.hasSuggestedSubmit = true;
            setTimeout(() => {
                if (confirm("마지막 문제까지 모두 풀었습니다!\n시험지를 제출하고 최종 결과를 확인하시겠습니까?")) {
                    submitExam();
                }
            }, 1000);
        }
    }
}

// Navigation between questions
function prevQuestion() {
    const prevIndex = getAdjacentFilteredIndex(-1);
    if (prevIndex !== null) {
        state.activeQuestionIndex = prevIndex;
        renderActiveQuestion();
        logSystem('N01', 'OK', 'Q' + (prevIndex + 1));
    } else {
        const isWrongFilter = state.questionFilter === 'wrong';
        const isWrongReview = state.activeRound && state.activeRound.sessionType === 'wrong-review';
        if (isWrongFilter || isWrongReview) {
            const hasAnyRemaining = state.currentQuestions.some((_, idx) => doesQuestionMatchFilter(idx));
            if (!hasAnyRemaining) {
                alert('더 이상 풀 문제가 없습니다. 모든 오답을 해결하셨습니다!');
            }
        }
    }
}

function nextQuestion() {
    const nextIndex = getAdjacentFilteredIndex(1);
    if (nextIndex !== null) {
        state.activeQuestionIndex = nextIndex;
        renderActiveQuestion();
        logSystem('N01', 'OK', 'Q' + (nextIndex + 1));
    } else {
        const isWrongFilter = state.questionFilter === 'wrong';
        const isWrongReview = state.activeRound && state.activeRound.sessionType === 'wrong-review';
        if (isWrongFilter || isWrongReview) {
            const hasAnyRemaining = state.currentQuestions.some((_, idx) => doesQuestionMatchFilter(idx));
            if (!hasAnyRemaining) {
                alert('더 이상 풀 문제가 없습니다. 모든 오답을 해결하셨습니다!');
            }
        }
    }
}

// Manual Toggle Explanation Box
function toggleHintBox() {
    dom.explanationBox.classList.toggle('collapsed');
    const isCollapsed = dom.explanationBox.classList.contains('collapsed');
    
    // 힌트를 켜면 즉시 영구 오답으로 등록 (단, 이미 최초 정답 처리가 완료된 경우는 제외)
    if (!isCollapsed && state.quizMode === 'solving') {
        const activeIdx = state.activeQuestionIndex;
        if (state.permanentlyCorrect[activeIdx] !== true) {
            state.permanentlyWrong[activeIdx] = true;
            renderActiveQuestion(true);
            updateMarkingStatus();
            autoSaveSession();
        }
    }
    
    logSystem('H01', 'OK', 'Q' + (state.activeQuestionIndex + 1) + ':' + (isCollapsed ? 'COLLAPSED' : 'EXPANDED'));
}

// Grading Engine & Result Modal
function submitExam() {
    clearInterval(state.timerInterval);
    
    const total = state.currentQuestions.length;
    let correct = 0;
    
    let totalSpeedBonus = 0;
    state.currentQuestions.forEach((q, idx) => {
        const isPermanentlyCorrect = state.permanentlyCorrect[idx] === true;
        if (isPermanentlyCorrect) {
            correct++;
            const timeSpent = state.questionTimeSpent[idx];
            if (timeSpent !== undefined && timeSpent !== null && timeSpent < 100) {
                totalSpeedBonus += (100 - timeSpent);
            }
        }
    });
    
    const scoreVal = Math.round((correct / total) * 100);
    const passScore = 60; // Standard qualification pass limit is 60 points
    const isPass = scoreVal >= passScore;
    const baseScore = (correct / total) * 100;
    const averageSpeedBonus = totalSpeedBonus / total;
    const gameScore = Math.round(baseScore + averageSpeedBonus);
    
    // Bind stats to modal
    dom.resultScore.innerText = `${correct} / ${total} (스피드보너스: +${Math.round(averageSpeedBonus)}점)`;
    dom.resultPercent.innerText = `${scoreVal}점 (랭킹스코어: ${gameScore}점)`;
    
    if (isPass) {
        dom.resultStatusBadge.className = 'result-status-badge pass';
        dom.resultStatusBadge.innerText = '합격 (PASS)';
        dom.resultMsgText.innerText = `축하합니다! 기준 점수(${passScore}점)를 초과하여 합격권에 도달하셨습니다.`;
    } else {
        dom.resultStatusBadge.className = 'result-status-badge fail';
        dom.resultStatusBadge.innerText = '불합격 (FAIL)';
        dom.resultMsgText.innerText = `아쉽게도 합격 기준 점수(${passScore}점)에 도달하지 못했습니다. 오답을 확인하고 재시도해 보세요.`;
    }
    
    // Time formatter
    const mins = Math.floor(state.timeSpentSeconds / 60);
    const secs = state.timeSpentSeconds % 60;
    dom.resultTimeSpent.innerText = `${mins}분 ${secs}초`;
    dom.resultCorrectCount.innerText = `${correct}문제`;
    dom.resultWrongCount.innerText = `${total - correct}문제`;
    
    // Radial circular progress transition animation
    const circleCircumference = 2 * Math.PI * 70; // 439.8
    const dashOffset = circleCircumference * (1 - scoreVal / 100);
    
    // Reset ring first
    dom.scoreRingBar.style.strokeDashoffset = circleCircumference;
    
    // Trigger animation in next frame
    setTimeout(() => {
        dom.scoreRingBar.style.dashoffset = dashOffset; // using simple property mapping
        dom.scoreRingBar.style.strokeDashoffset = dashOffset;
    }, 100);
    
    // Save progress to LocalStorage
    const roundKey = `${state.activeRound.year}_${state.activeRound.round}`;
    const progressKey = `cbt_progress_${state.currentUser ? state.currentUser + '_' : ''}${state.activeSubject}_${roundKey}`;
    localStorage.setItem(progressKey, JSON.stringify({
        score: correct,
        total: total,
        completed: true,
        percent: scoreVal,
        time: state.timeSpentSeconds
    }));
    
    // Persist wrong answer history for this subject
    saveWrongHistory();

    // Save exam result log and update global stats
    if (state.currentUser) {
        addExamResultLog(scoreVal, isPass);
        updateGlobalStats(scoreVal, total, isPass);
        saveLeaderboardEntry(gameScore, Math.round(baseScore), state.timeSpentSeconds);
        localStorage.removeItem(`cbt_${state.currentUser}_last_solved`);
        localStorage.removeItem(`cbt_${state.currentUser}_autosave_session`);
        localStorage.removeItem(`cbt_${state.currentUser}_autosave_session_${state.activeSubject}`);
        updateHomeResumeButton();
    }
    
    // Refresh leaderboard immediately
    renderLeaderboard();
    
    // Display Modal
    dom.resultModal.classList.add('active');
}

// Enter post-submission review mode
function enterReviewMode() {
    logSystem('M01', 'OK', 'ReviewMode');
    state.quizMode = 'review';
    state.activeQuestionIndex = 0;
    renderMarkingSheet();
    renderActiveQuestion();
}

// LocalStorage User Stats Tracker
function updateGlobalStats(scoreVal, total, isPass) {
    const statsKey = `cbt_${state.currentUser}_global_stats`;
    const stats = JSON.parse(localStorage.getItem(statsKey)) || {
        totalSolved: 0,
        totalExamsAttempted: 0,
        passedExamsCount: 0,
        averageSum: 0
    };
    
    stats.totalSolved += total;
    stats.totalExamsAttempted += 1;
    if (isPass) {
        stats.passedExamsCount += 1;
    }
    stats.averageSum += scoreVal;
    localStorage.setItem(statsKey, JSON.stringify(stats));

    const globalStatsKey = 'cbt_global_stats';
    const globalStats = JSON.parse(localStorage.getItem(globalStatsKey)) || {};
    globalStats[state.currentUser] = {
        totalSolved: stats.totalSolved,
        totalExamsAttempted: stats.totalExamsAttempted,
        passedExamsCount: stats.passedExamsCount,
        averageRate: Math.round(stats.averageSum / stats.totalExamsAttempted)
    };
    localStorage.setItem(globalStatsKey, JSON.stringify(globalStats));
}

function addExamResultLog(scoreVal, isPass) {
    const logsKey = `cbt_logs_${state.currentUser}`;
    const logs = JSON.parse(localStorage.getItem(logsKey)) || [];
    const summary = `${state.activeRound.subject} ${state.activeRound.round} - ${scoreVal}점 (${isPass ? '합격' : '불합격'})`;
    logs.unshift({ timestamp: Date.now(), summary });
    if (logs.length > 50) logs.pop();
    localStorage.setItem(logsKey, JSON.stringify(logs));
}

function saveLeaderboardEntry(gameScore, baseScore, timeSpent) {
    const boardKey = 'cbt_leaderboard';
    const entries = JSON.parse(localStorage.getItem(boardKey)) || [];
    entries.push({
        userId: state.currentUser,
        gameScore,
        baseScore,
        timeSpent,
        summary: abbreviateText(state.activeRound.subject, state.activeRound.round),
        timestamp: Date.now()
    });
    localStorage.setItem(boardKey, JSON.stringify(entries));
}

function abbreviateText(subject, round) {
    const subjectMap = {
        '에너지관리산업기사': '에너지산기',
        '에너지관리기능장': '에너지기능장',
        '가스기능사': '가스기능사',
        '에너지기능사': '에너지기능사',
        '공조기능사': '공조기능사'
    };
    let summary = subjectMap[subject] || subject;
    if (/오답/i.test(round)) {
        summary = `${summary} 오답`;
    } else {
        const match = round.match(/(\d+)회차?/);
        if (match) {
            summary = `${summary} ${match[1]}회`;
        } else {
            summary = `${summary} ${round}`;
        }
    }
    return summary;
}

function saveWrongHistory() {
    if (!state.currentUser || !state.activeRound) return;
    const dbKey = `cbt_${state.currentUser}_wrong_db`;
    const wrongDb = JSON.parse(localStorage.getItem(dbKey)) || {};
    
    let hasChanges = false;
    
    state.currentQuestions.forEach((q, idx) => {
        const selected = state.userAnswers[idx];
        const isAnswered = selected !== undefined && selected !== null;
        
        if (isAnswered) {
            const isPermanentlyCorrect = state.permanentlyCorrect[idx] === true;
            if (!isPermanentlyCorrect) {
                // Save/update wrong question with minimal fields
                const prev = wrongDb[q.sourceQuestionKey];
                wrongDb[q.sourceQuestionKey] = {
                    subject: state.activeSubject,
                    sourceRoundKey: q.sourceRoundKey,
                    sourceQuestionKey: q.sourceQuestionKey,
                    num: q.num,
                    question: q.question,
                    options: q.options,
                    answer: q.answer,
                    hint: q.hint || '',
                    selectedAnswer: selected,
                    wrongCount: prev ? (prev.wrongCount || 0) + 1 : 1,
                    lastWrongAt: Date.now()
                };
                hasChanges = true;
            } else {
                // If it is in the database and user answered it correctly, delete it
                if (wrongDb[q.sourceQuestionKey]) {
                    delete wrongDb[q.sourceQuestionKey];
                    hasChanges = true;
                }
            }
        }
    });
    
    if (hasChanges) {
        localStorage.setItem(dbKey, JSON.stringify(wrongDb));
    }
}

function handleCalculatorInput(value) {
    const formulaEl = document.getElementById('calculator-formula');
    const resultEl = document.getElementById('calculator-result');
    if (!formulaEl || !resultEl) return;
    
    let currentFormula = formulaEl.innerText || '0';
    let currentResult = resultEl.innerText || '';
    
    if (value === 'C') {
        formulaEl.innerText = '0';
        resultEl.innerHTML = '&nbsp;';
        return;
    }
    
    if (value === 'backspace') {
        if (currentFormula === 'Error' || currentFormula.length <= 1) {
            formulaEl.innerText = '0';
        } else {
            formulaEl.innerText = currentFormula.slice(0, -1);
        }
        resultEl.innerHTML = '&nbsp;';
        return;
    }
    
    if (value === '=') {
        let expr = currentFormula;
        if (expr === 'Error' || expr === '') return;
        
        // [괄호 자동 완성]
        const openParens = (expr.match(/\(/g) || []).length;
        const closeParens = (expr.match(/\)/g) || []).length;
        if (openParens > closeParens) {
            expr += ')'.repeat(openParens - closeParens);
            formulaEl.innerText = expr;
        }
        
        try {
            const sanitized = expr
                .replace(/÷/g, '/')
                .replace(/×/g, '*')
                .replace(/\^2/g, '**2')
                .replace(/\^3/g, '**3');
            const result = evaluateCalculatorExpression(sanitized);
            resultEl.innerText = '= ' + String(result);
        } catch (e) {
            resultEl.innerText = 'Error';
        }
        return;
    }
    
    // 결과값이 존재하는 상태에서 입력 분기 처리
    if (currentResult !== '' && currentResult !== ' ' && resultEl.innerHTML !== '&nbsp;') {
        const lastResultValue = currentResult.replace(/^=\s*/, '');
        if (/^[\+\-\×\÷\^]/.test(value)) {
            // 연산자를 누른 경우: 이전 결과값을 공식창으로 가져와 연산
            if (lastResultValue !== 'Error') {
                formulaEl.innerText = lastResultValue + value;
                resultEl.innerHTML = '&nbsp;';
                return;
            }
        }
        // 숫자나 다른 함수를 누른 경우: 초기화 후 새 공식 시작
        formulaEl.innerText = '0';
        resultEl.innerHTML = '&nbsp;';
        currentFormula = '0';
    }
    
    if (currentFormula === '0' && !/[\+\-\×\÷\^\.]/.test(value) && !value.includes('(')) {
        currentFormula = '';
    }
    
    formulaEl.innerText = currentFormula + value;
}

function evaluateCalculatorExpression(expr) {
    const cleaned = expr
        .replace(/sqrt\(/g, 'Math.sqrt(')
        .replace(/log\(/g, 'Math.log10(')
        .replace(/ln\(/g, 'Math.log(')
        .replace(/\^/g, '**');
    return Function(`"use strict"; return (${cleaned})`)();
}

function gatherWrongReviewQuestions() {
    if (!state.currentUser || !state.activeSubject) return [];
    const dbKey = `cbt_${state.currentUser}_wrong_db`;
    const wrongDb = JSON.parse(localStorage.getItem(dbKey)) || {};
    
    // Filter questions by current active subject and sort by lastWrongAt descending
    const wrongQuestions = Object.values(wrongDb)
        .filter(item => item.subject === state.activeSubject)
        .sort((a, b) => b.lastWrongAt - a.lastWrongAt)
        .map(item => ({
            num: item.num,
            question: item.question,
            options: item.options,
            answer: item.answer,
            hint: item.hint || '',
            sourceRoundKey: item.sourceRoundKey,
            sourceQuestionKey: item.sourceQuestionKey
        }));
        
    return wrongQuestions;
}

function reviewWrongAnswers() {
    if (!state.currentUser) {
        alert('로그인 후 사용할 수 있습니다.');
        return;
    }
    const wrongQuestions = gatherWrongReviewQuestions();
    if (wrongQuestions.length === 0) {
        alert('오답 복습 가능한 문제가 없습니다. 먼저 시험을 풀어주세요.');
        return;
    }

    const customRound = {
        subject: subjectDetails[state.activeSubject]?.name || '오답 복습 회차',
        year: new Date().getFullYear(),
        round: '오답 복습 회차',
        sessionType: 'wrong-review',
        questions: wrongQuestions
    };
    state.questionFilter = 'all';
    if (dom.questionFilter) dom.questionFilter.value = 'all';
    logSystem('M02', 'OK', 'ReviewWrong:' + wrongQuestions.length + 'Q');
    startQuiz(customRound);
}

// Render Leaderboard Ranking
function renderLeaderboard() {
    const rankingList = document.getElementById('leaderboard-list');
    if (!rankingList) return;

    const stored = JSON.parse(localStorage.getItem('cbt_leaderboard')) || [];
    if (!Array.isArray(stored) || stored.length === 0) {
        rankingList.innerHTML = '<p class="no-data-msg">순위 정보가 없습니다.</p>';
        return;
    }

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

    rankingList.innerHTML = bestRecords.map((data, index) => {
        const rank = index + 1;
        let rankClass = '';
        if (rank === 1) rankClass = 'rank-1';
        else if (rank === 2) rankClass = 'rank-2';
        else if (rank === 3) rankClass = 'rank-3';
        const isMe = data.userId === state.currentUser;
        const meTag = isMe ? ' <span style="font-size: 11px; padding: 2px 6px; border-radius: 10px; background: var(--primary); color: white; margin-left: 4px;">나</span>' : '';
        return `
            <div class="ranking-item ${isMe ? 'current-user' : ''}">
                <div class="ranking-user-info">
                    <div class="rank-badge ${rankClass}">${rank}</div>
                    <div class="rank-user-name">${data.userId}${meTag}</div>
                </div>
                <div class="rank-details" style="text-align: right;">
                    <div class="rank-score" style="color:var(--warning); font-size:16px;">🎮 ${data.gameScore}점</div>
                    <div class="rank-subject" style="font-size:12px; color:var(--text-muted);">${data.summary} (정답 ${data.baseScore}점)</div>
                </div>
            </div>
        `;
    }).join('');
}


// --- 계산기 드래그 앤 드롭 이동 로직 (PC 마우스 & 모바일 터치 통합) ---
if (dom.calculatorHeader && dom.calculatorModal) {
  const calcCard = dom.calculatorModal.querySelector('.calculator-card');
  let isDragging = false;
  let startX, startY, initialLeft, initialTop;

  // 공통 드래그 시작 함수
  const dragStart = (e) => {
    isDragging = true;
    // 🐛 버그 수정: e.touches[0]을 사용하여 첫 번째 손가락의 좌표를 정확히 추출
    const clientX = e.type.includes('touch') ? (e.touches && e.touches[0] ? e.touches[0].clientX : e.clientX) : e.clientX;
    const clientY = e.type.includes('touch') ? (e.touches && e.touches[0] ? e.touches[0].clientY : e.clientY) : e.clientY;
    
    startX = clientX;
    startY = clientY;
    const rect = calcCard.getBoundingClientRect();
    initialLeft = rect.left;
    initialTop = rect.top;
    calcCard.style.left = initialLeft + 'px';
    calcCard.style.top = initialTop + 'px';
    calcCard.style.right = 'auto'; // right 속성 해제
    calcCard.style.transform = 'none'; // 혹시 모를 충돌 방지
  };

  // 공통 드래그 이동 함수
  const dragMove = (e) => {
    if (!isDragging) return;
    // 모바일에서 드래그할 때 화면이 같이 스크롤되는 현상 방지
    if (e.type.includes('touch')) e.preventDefault();
    
    // 🐛 버그 수정: e.touches[0] 적용
    const clientX = e.type.includes('touch') ? (e.touches && e.touches[0] ? e.touches[0].clientX : e.clientX) : e.clientX;
    const clientY = e.type.includes('touch') ? (e.touches && e.touches[0] ? e.touches[0].clientY : e.clientY) : e.clientY;
    
    const dx = clientX - startX;
    const dy = clientY - startY;
    calcCard.style.left = (initialLeft + dx) + 'px';
    calcCard.style.top = (initialTop + dy) + 'px';
  };

  // 공통 드래그 종료 함수
  const dragEnd = () => {
    isDragging = false;
  };

  // 🖱 PC 마우스 이벤트 등록
  dom.calculatorHeader.addEventListener('mousedown', dragStart);
  document.addEventListener('mousemove', dragMove);
  document.addEventListener('mouseup', dragEnd);

  // 👆 모바일 터치 이벤트 등록
  dom.calculatorHeader.addEventListener('touchstart', dragStart, { passive: false });
  document.addEventListener('touchmove', dragMove, { passive: false });
  document.addEventListener('touchend', dragEnd);
}

// --- [최종 완벽판] 상수 모달 제어 및 입력 로직 (이벤트 위임 방식) ---
document.addEventListener('click', (e) => {
    // 1. 상수(π) 버튼 클릭 시 팝업 열기
    if (e.target.closest('#calc-constant-btn')) {
        const constantModal = document.getElementById('constant-modal');
        if (constantModal) constantModal.classList.add('active');
    }

    // 2. 닫기 버튼(X) 클릭 시 팝업 닫기
    if (e.target.closest('#constant-close-btn')) {
        const constantModal = document.getElementById('constant-modal');
        if (constantModal) constantModal.classList.remove('active');
    }

    // 3. 리스트에서 상수 항목 선택 시 계산기 액정에 입력하고 팝업 닫기
    const constantItem = e.target.closest('.constant-item');
    if (constantItem) {
        const val = constantItem.getAttribute('data-val');
        const display = document.getElementById('calculator-display');
        
        if (val && display) {
            let current = display.value || '';
            // 에러 상태이거나 숫자 0만 있을 때는 화면을 지우고 깔끔하게 새 숫자 입력
            if (current === '0' || current === 'Error') {
                current = '';
            }
            display.value = current + val;
        }
        
        // 입력이 끝난 후 상수 창은 자동으로 닫기
        const constantModal = document.getElementById('constant-modal');
        if (constantModal) constantModal.classList.remove('active');
    }
});

// ==========================================
// 문제 이동 팝업 제어 함수
// ==========================================
function openQuestionJumpModal() {
  if (!state.currentQuestions || state.currentQuestions.length === 0) return;
  if (!dom.questionJumpGrid || !dom.questionJumpModal) return;

  // 기존 내용을 비우고 새로 그림
  dom.questionJumpGrid.innerHTML = '';
  
  state.currentQuestions.forEach((q, idx) => {
    const btn = document.createElement('button');
    btn.className = 'marking-btn';
    btn.innerText = q.num;
    
    // 1. 필터 조건(틀린 문제만 보기 등)에 맞지 않으면 숨김
    if (!doesQuestionMatchFilter(idx)) {
      btn.style.display = 'none';
    }
    
    // 2. 현재 화면에 띄워진 문제 번호 하이라이트
    if (state.activeQuestionIndex === idx) {
      btn.classList.add('active');
    }
    
    // 3. 풀이 모드 및 리뷰 모드 모두 정답/오답 색상 표시 (사이드바 OMR 마킹판 및 문제번호 배지와 연동)
    const userAnswer = state.userAnswers[idx];
    const isPermanentlyCorrect = state.permanentlyCorrect[idx] === true;
    const isPermanentlyWrong = state.permanentlyWrong[idx] === true;
    
    if (isPermanentlyCorrect) {
        btn.classList.add('correct');
    } else if (isPermanentlyWrong) {
        btn.classList.add('wrong');
    } else if (userAnswer !== undefined && userAnswer !== null) {
        if (state.quizMode === 'solving') {
            const isChecked = state.checkedQuestions[idx] === true;
            if (isChecked) {
                btn.classList.add('checked');
            } else {
                btn.classList.add('solved');
            }
        } else if (state.quizMode === 'review') {
            const correctAnswer = q.answer;
            if (Number(userAnswer) === Number(correctAnswer)) {
                btn.classList.add('correct');
            } else {
                btn.classList.add('wrong');
            }
        }
    }
    
    // 4. 클릭 시 해당 문제로 점프하고 모달 닫기
    btn.addEventListener('click', () => {
      state.activeQuestionIndex = idx;
      renderActiveQuestion();
      dom.questionJumpModal.classList.remove('active');
      logSystem('J01', 'OK', 'JumpQ:' + (idx + 1));
    });
    
    dom.questionJumpGrid.appendChild(btn);
  });
  
    // 모달 화면에 표시
  dom.questionJumpModal.classList.add('active');
}

// ==========================================
// 시스템 로그 시스템 (강력한 로깅 및 상세 조회)
// ==========================================

// 델타 인코딩 로그 시간 계산기
function getLogOffsetSeconds() {
    if (!sessionBaseTime) {
        sessionBaseTime = parseInt(localStorage.getItem('session_base_time'));
        if (!sessionBaseTime) {
            sessionBaseTime = Date.now();
            localStorage.setItem('session_base_time', sessionBaseTime.toString());
        }
    }
    const diffMs = Date.now() - sessionBaseTime;
    return Math.floor(diffMs / 1000);
}

// 상태 스냅샷 압축 함수
function getAppStateDetails(customDetails = '') {
    const activeIdx = state.activeQuestionIndex;
    const qNum = activeIdx + 1;
    const answer = state.userAnswers[activeIdx] !== undefined ? state.userAnswers[activeIdx] : '_';
    
    // 기본 상태 코드 예시: Q9:3 (9번 문제에 3번 마킹 상태)
    let stateStr = `Q${qNum}:${answer}`;
    
    // 에러나 커스텀 정보가 제공되면 추가
    if (customDetails) {
        let clean = customDetails.toString()
            .replace(/[\r\n]+/g, ' ')
            .replace(/\s+/g, '')
            .substring(0, 100);
        return `ERR:${clean}`;
    }
    
    return stateStr;
}

// 시스템 로그 기록 (Delta Encoding 적용)
function logSystem(actionCode, status, details = '') {
    const user = state.currentUser || 'GUEST';
    
    let code = actionCode;
    let stat = status;
    let det = details;
    
    // 하위 호환성을 위해 기존 ERROR/WARNING 레벨 매핑
    if (actionCode === 'ERROR') {
        code = 'E01';
        stat = 'ERR';
        det = status + (details ? ' | ' + details : '');
    } else if (actionCode === 'WARNING') {
        code = 'E01';
        stat = 'WARN';
        det = status + (details ? ' | ' + details : '');
    }
    
    const offset = getLogOffsetSeconds();
    const offsetStr = `+${offset}`;
    
    const stateSnapshot = code === 'E01' ? getAppStateDetails(det) : det;
    const newLogStr = `${offsetStr}|${code}|${stat}|${stateSnapshot}`;
    
    let logs = [];
    try {
        logs = JSON.parse(localStorage.getItem(`cbt_${user}_system_logs`)) || [];
    } catch (e) {
        logs = [];
    }
    
    if (!Array.isArray(logs)) logs = [];
    
    // 중복 제거 및 압축 필터 (Deduping)
    let isDup = false;
    if (logs.length > 0) {
        const lastLog = logs[0];
        const lastParts = lastLog.split('|');
        const lastCode = lastParts[1];
        const lastDet = lastParts.slice(3).join('|') || '';
        
        const dupMatch = lastDet.match(/^(.*) \(x(\d+)\)$/);
        let cleanLastDet = lastDet;
        let dupCount = 1;
        if (dupMatch) {
            cleanLastDet = dupMatch[1];
            dupCount = parseInt(dupMatch[2], 10);
        }
        
        if (lastCode === code && cleanLastDet === stateSnapshot) {
            dupCount++;
            logs[0] = `${offsetStr}|${code}|${stat}|${stateSnapshot} (x${dupCount})`;
            isDup = true;
        }
    }
    
    if (!isDup) {
        logs.unshift(newLogStr);
    }
    
    const maxLogs = state.maxSystemLogs || 100;
    if (logs.length > maxLogs) {
        logs.length = maxLogs;
    }
    
    try {
        localStorage.setItem(`cbt_${user}_system_logs`, JSON.stringify(logs));
    } catch (e) {
        console.error('Failed to save system logs:', e);
    }
    
    if (window.location.hash === '#settings') {
        renderSystemLogs();
    }
}

// 시스템 로그 렌더링
function createLogItemNode(idx, fontSize, levelColor, timestamp, details, message, status) {
    const item = document.createElement('div');
    item.style.borderBottom = '1px solid rgba(255, 255, 255, 0.05)';
    item.style.padding = '3px 4px';
    item.style.transition = 'background-color 0.2s';
    
    // 시간 표시 (맨 앞 흰색)
    const timeSpan = timestamp 
        ? `<span style="color: #ffffff; font-size: ${fontSize}px; margin-right: 8px; white-space: nowrap;">[${timestamp}]</span>` 
        : '';

    // 본문 내용 (상세가 없으면 분류를 노출)
    const displayText = details || message;
    
    // 상태값(OK, ERR, WARN 등)의 색상 매핑
    let statusColor = 'var(--text-secondary)';
    if (status.includes('ERR') || status.includes('ERROR')) {
        statusColor = '#ff4444'; // 에러: 빨간색
    } else if (status.includes('WARN') || status.includes('WARNING')) {
        statusColor = '#fbbf24'; // 경고: 노란색
    } else if (status === 'OK') {
        statusColor = '#10b981'; // 성공: 녹색 (Emerald)
    }
    
    const statusSpan = status 
        ? `<span style="color: ${statusColor}; font-weight: bold; margin-left: 4px; white-space: nowrap;">(${status})</span>` 
        : '';
    
    item.innerHTML = `
        <div style="display: flex; align-items: flex-start; gap: 4px; font-size: ${fontSize}px; line-height: 1.4;">
            ${timeSpan}
            <span style="flex: 1; word-break: break-all; color: var(--text-primary);">${displayText}${statusSpan}</span>
        </div>
    `;
    
    item.addEventListener('mouseover', () => {
        item.style.backgroundColor = 'rgba(255, 255, 255, 0.02)';
    });
    item.addEventListener('mouseout', () => {
        item.style.backgroundColor = 'transparent';
    });
    
    return item;
}

// 시스템 로그 렌더링
function renderSystemLogs() {
    const container = document.getElementById('system-logs-container');
    const modalContainer = document.getElementById('modal-system-logs-container');
    
    const user = state.currentUser || 'GUEST';
    let logs = [];
    try {
        logs = JSON.parse(localStorage.getItem(`cbt_${user}_system_logs`)) || [];
    } catch (e) {
        logs = [];
    }
    
    const noLogsHtml = '<div style="color: var(--text-muted); text-align: center; padding: 20px;">로그 내역이 없습니다.</div>';
    
    if (container) container.innerHTML = '';
    if (modalContainer) modalContainer.innerHTML = '';
    
    if (!Array.isArray(logs) || logs.length === 0) {
        if (container) container.innerHTML = noLogsHtml;
        if (modalContainer) modalContainer.innerHTML = noLogsHtml;
        return;
    }
    
    logs.forEach((log, idx) => {
        let level = 'INFO';
        let message = '';
        let timestamp = '';
        let details = '';
        let status = 'OK';
        
        if (typeof log === 'string') {
            const parts = log.split('|');
            const offset = parts[0] || '+0';
            const actionCode = parts[1] || '???';
            status = parts[2] || 'OK';
            const stateInfo = parts.slice(3).join('|') || '';
            
            // 1. 오프셋을 절대 시간으로 복원 계산 (날짜와 초 정보를 제외하고 시간만 추출)
            let timeStr = '';
            if (sessionBaseTime) {
                const offsetSecs = parseInt(offset.replace('+', ''));
                if (!isNaN(offsetSecs)) {
                    const absTime = new Date(sessionBaseTime + offsetSecs * 1000);
                    timeStr = `${String(absTime.getHours()).padStart(2, '0')}:${String(absTime.getMinutes()).padStart(2, '0')}:${String(absTime.getSeconds()).padStart(2, '0')}`;
                }
            }
            timestamp = timeStr || '';
            
            // 2. 액션 코드 해석 (사람이 읽을 수 있게 상세히 표기)
            let actionName = actionCode;
            let detailParsed = '';
            
            switch (actionCode) {
                case 'L01':
                    actionName = '로그인 완료';
                    detailParsed = `사용자 ID: ${stateInfo}`;
                    break;
                case 'L02':
                    actionName = '로그아웃 완료';
                    detailParsed = stateInfo;
                    break;
                case 'S01':
                    actionName = '시험 시작';
                    if (stateInfo.startsWith('START:')) {
                        detailParsed = `신규 시험 시작 - 회차: ${stateInfo.substring(6)}`;
                    } else if (stateInfo.startsWith('RESUME:')) {
                        detailParsed = `시험 이어 풀기 시작 - 회차: ${stateInfo.substring(7)}`;
                    } else {
                        detailParsed = `회차 정보: ${stateInfo}`;
                    }
                    break;
                case 'A01':
                    actionName = '답안 마킹';
                    const aMatch = stateInfo.match(/^Q(\d+):(.*)$/);
                    if (aMatch) {
                        const ans = aMatch[2];
                        detailParsed = `${aMatch[1]}번 문제 정답 선택 (선택 번호: ${ans === '_' ? '없음/취소' : ans + '번'})`;
                    } else {
                        detailParsed = `마킹 정보: ${stateInfo}`;
                    }
                    break;
                case 'H01':
                    actionName = '해설 토글';
                    const hMatch = stateInfo.match(/^Q(\d+):(COLLAPSED|EXPANDED)$/);
                    if (hMatch) {
                        detailParsed = `${hMatch[1]}번 문제 해설창 ${hMatch[2] === 'COLLAPSED' ? '닫음' : '엶'}`;
                    } else {
                        detailParsed = `해설 토글 상태: ${stateInfo}`;
                    }
                    break;
                case 'N01':
                    actionName = '문제 이동';
                    const nMatch = stateInfo.match(/^Q(\d+)$/);
                    const routeMatch = stateInfo.match(/^Route:(.*)$/);
                    const navToMatch = stateInfo.match(/^NavTo:(.*)$/);
                    const switchTabMatch = stateInfo.match(/^SwitchTab:(.*)$/);
                    if (nMatch) {
                        detailParsed = `${nMatch[1]}번 문제로 화면 이동`;
                    } else if (routeMatch) {
                        detailParsed = `라우터 이동 (경로: ${routeMatch[1]})`;
                    } else if (navToMatch) {
                        detailParsed = `SPA 네비게이션 이동 (과목: ${navToMatch[1]})`;
                    } else if (switchTabMatch) {
                        detailParsed = `화면 탭 전환 (탭: ${switchTabMatch[1]})`;
                    } else {
                        detailParsed = `이동 정보: ${stateInfo}`;
                    }
                    break;
                case 'J01':
                    actionName = '문제 점프';
                    const jMatch = stateInfo.match(/^JumpQ:(\d+)(.*)$/);
                    if (jMatch) {
                        detailParsed = `OMR 마킹판 또는 점프 모달에서 ${jMatch[1]}번 문제로 즉시 점프${jMatch[2] ? ' ' + jMatch[2] : ''}`;
                    } else {
                        detailParsed = `점프 대상: ${stateInfo}`;
                    }
                    break;
                case 'M01':
                    actionName = '복습 진입';
                    detailParsed = '시험 복습(Review) 모드로 상태 강제 변경';
                    break;
                case 'M02':
                    actionName = '오답 복습';
                    detailParsed = `오답 복습 세션 시작 - ${stateInfo}`;
                    break;
                case 'E01':
                    actionName = '시스템 오류';
                    if (stateInfo.startsWith('ERR:')) {
                        detailParsed = `오류 상세 내용: ${stateInfo.substring(4)}`;
                    } else {
                        detailParsed = `오류 내용: ${stateInfo}`;
                    }
                    break;
                default:
                    actionName = `이벤트(${actionCode})`;
                    detailParsed = stateInfo;
            }
            
            level = (actionCode === 'E01' || status.includes('ERR')) ? 'ERROR' : (status.includes('WARN') ? 'WARNING' : 'INFO');
            message = `${actionName} (상태: ${status})`;
            details = detailParsed;
        } else {
            // 구 버전 호환용
            level = log.level || 'INFO';
            message = log.message || '';
            timestamp = log.timestamp || '';
            details = log.details || '';
            status = log.level || 'INFO';
        }
        
        let levelColor = '#94a3b8';
        if (level === 'ERROR') levelColor = '#ff4444';
        if (level === 'WARNING') levelColor = '#fbbf24';
        
        if (container) {
            const item = createLogItemNode(`mini-${idx}`, 13, levelColor, timestamp, details, message, status);
            container.appendChild(item);
        }
        if (modalContainer) {
            const item = createLogItemNode(`modal-${idx}`, 13, levelColor, timestamp, details, message, status);
            modalContainer.appendChild(item);
        }
    });
}

// 전역 에러 핸들러 등록
window.onerror = function (message, source, lineno, colno, error) {
    const details = `Source: ${source}\nLine: ${lineno}:${colno}\nStack: ${error ? error.stack : 'N/A'}\nActive Subject: ${state.activeSubject}\nQuiz Mode: ${state.quizMode}\nRound: ${state.activeRound ? state.activeRound.round : 'N/A'}`;
    logSystem('ERROR', `전역 스크립트 오류: ${message}`, details);
    return false; // 콘솔에도 나오게 함
};

window.onunhandledrejection = function (event) {
    const error = event.reason;
    const details = `Stack: ${error && error.stack ? error.stack : 'N/A'}\nReason: ${error}\nActive Subject: ${state.activeSubject}\nQuiz Mode: ${state.quizMode}`;
    logSystem('ERROR', `비동기 거부 오류: ${error ? error.message : 'N/A'}`, details);
};