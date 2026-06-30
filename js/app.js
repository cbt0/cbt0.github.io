/**
 * Antigravity CBT - Core Application Script V1.9905
 * Handled features: SPA routing, JSON loading, Quiz state, grading engine, and localStorage stats.
 */

// Global Idle Timer for Auto-Logout
let idleTimer;
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
    quizMode: 'solving',    // 'solving' (active test), 'review' (checking answers after submission)
    timerInterval: null,
    timeSpentSeconds: 0,
    currentQuestions: [],   // Active question list (usually 60)
    questionFilter: 'all', // 'all', 'wrong', 'unanswered'
    currentUser: null,      // Logged in user ID
    autoLogoutMinutes: 30   // Auto-logout idle timeout minutes
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
    initTheme();
    initAutoLogoutSettings();
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
                    dom.homeResumeBtn.innerText = `▶ : ${subjectName} ${roundName} (Q. ${questionNum})`;
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
    }
    localStorage.removeItem('cbt_current_user');
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
                    state.timeSpentSeconds = session.timeSpentSeconds || 0;
                    
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
    
    // Question filter select
    if (dom.questionFilter) {
        dom.questionFilter.addEventListener('change', (e) => {
            state.questionFilter = e.target.value;
            applyQuestionFilter();
            renderMarkingSheet();
            renderActiveQuestion();
        });
    }

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
    
    const copyLogsBtn = document.getElementById('copy-logs-btn');
    if (copyLogsBtn) {
        copyLogsBtn.addEventListener('click', () => {
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
            const text = logs.map(l => `[${l.timestamp}] [${l.level}] ${l.message}\n${l.details}\n----------------------------------`).join('\n');
            navigator.clipboard.writeText(text)
                .then(() => alert('로그가 클립보드에 복사되었습니다.'))
                .catch(err => alert('복사 실패: ' + err));
        });
    }

    // Hash Routing Listeners
    window.addEventListener('hashchange', router);
    window.addEventListener('load', router);
}

// SPA Navigation Control
function navigateTo(subject) {
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

// Render available rounds grid
// Render available rounds grid (V1.961 다중 시리즈 그룹핑 적용)
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
            resumeBtn.addEventListener('click', () => {
                try {
                    const session = JSON.parse(sessionStr);
                    if (session && session.activeRound && Array.isArray(session.activeRound.questions) && session.activeRound.questions.length > 0) {
                        state.activeSubject = session.subject;
                        state.activeRound = session.activeRound;
                        state.activeQuestionIndex = session.activeQuestionIndex;
                        state.userAnswers = session.userAnswers || {};
                        state.checkedQuestions = session.checkedQuestions || {};
                        state.timeSpentSeconds = session.timeSpentSeconds || 0;
                        
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
        state.timeSpentSeconds = 0;
        state.questionFilter = 'all';
        if (dom.questionFilter) {
            dom.questionFilter.value = 'all';
        }
    }
    state.quizMode = 'solving';
    
    logUserActivity(`${round.subject} ${round.round} 시험 시작` + (isResume ? ' (이어하기)' : ''));
    
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
        });
        
        dom.markingSheet.appendChild(btn);
    });
    
    updateMarkingStatus();
}

function doesQuestionMatchFilter(index) {
    const q = state.currentQuestions[index];
    if (!q) return false;

    const userAnswer = state.userAnswers[index];
    if (state.questionFilter === 'wrong') {
        return userAnswer !== undefined && userAnswer !== q.answer;
    }
    if (state.questionFilter === 'unanswered') {
        return userAnswer === undefined;
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

function applyQuestionFilter() {
    if (!doesQuestionMatchFilter(state.activeQuestionIndex)) {
        const firstMatch = state.currentQuestions.findIndex((_, idx) => doesQuestionMatchFilter(idx));
        if (firstMatch !== -1) {
            state.activeQuestionIndex = firstMatch;
        } else {
            state.questionFilter = 'all';
            alert('조건에 맞는 문제가 없습니다. 전체 문제 보기로 되돌립니다.');
        }
    }
}

function updateMarkingStatus() {
    state.currentQuestions.forEach((q, idx) => {
        const btn = document.getElementById(`marking-num-${idx}`);
        if (!btn) return;
        
        btn.className = 'marking-btn';
        btn.style.display = doesQuestionMatchFilter(idx) ? 'inline-flex' : 'none';
        
        const userAnswer = state.userAnswers[idx];
        if (userAnswer !== undefined && userAnswer !== null) {
            if (state.quizMode === 'solving') {
                // 풀이 도중에는 정답/오답 유출 없이, 일반 마킹(solved=녹색) vs 체크 마킹(checked=주황색) 구분
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
    const answeredCount = Object.keys(state.userAnswers).length;
    dom.quizProgressText.innerText = `${answeredCount} / ${state.currentQuestions.length}`;
}

function initializeQuestionFilter() {
    if (dom.questionFilter) {
        dom.questionFilter.value = state.questionFilter;
    }
}

// Render active question to view pane
function renderActiveQuestion() {
    // ⚠️ 주의: 이 함수는 state를 변경하지 않습니다 (Read-Only View).
    //         인덱스 변경은 nextQuestion/prevQuestion/filter 핸들러에서만 수행되어야 합니다.
    const q = state.currentQuestions[state.activeQuestionIndex];
    if (!q) return;
    
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
    
    // Sync active question num badge color based on grading (맞춘 건 녹색, 틀린 건 빨간색, 안 푼 건 하늘색/파란색)
    if (dom.questionNum) {
        dom.questionNum.className = 'question-num-badge'; // 기본화
        const userAnswer = state.userAnswers[state.activeQuestionIndex];
        if (userAnswer !== undefined && userAnswer !== null) {
            const isCorrect = Number(userAnswer) === Number(q.answer);
            if (isCorrect) {
                dom.questionNum.classList.add('correct');
            } else {
                dom.questionNum.classList.add('wrong');
            }
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
                // 1) 풀이 모드: 정오답 유출 방지 및 selected/checked 표시
                if (choiceNum === userAnswer) {
                    const isChecked = state.checkedQuestions[state.activeQuestionIndex] === true;
                    if (isChecked) {
                        item.classList.add('checked');
                    } else {
                        item.classList.add('selected');
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
    } else {
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
    
    if (isCheckMode) {
        // [번호 버튼 클릭 시 -> 체크 검토 정답 상태로]
        if (currentAnswer === choiceNum) {
            if (isCurrentlyChecked) {
                // 이미 체크 상태이면 토글하여 마킹 전체 해제
                delete state.userAnswers[activeIdx];
                delete state.checkedQuestions[activeIdx];
            } else {
                // 일반 마킹 상태였다면 체크 상태로 전이
                state.checkedQuestions[activeIdx] = true;
            }
        } else {
            // 아직 아무 마킹도 없었거나 다른 번호가 마킹된 상태라면
            state.userAnswers[activeIdx] = choiceNum;
            state.checkedQuestions[activeIdx] = true;
        }
    } else {
        // [지문(내용) 버튼 클릭 시 -> 확신 정답 마킹 상태로]
        if (currentAnswer === choiceNum) {
            if (!isCurrentlyChecked) {
                // 이미 확신 상태라면 토글하여 마킹 전체 해제
                delete state.userAnswers[activeIdx];
                delete state.checkedQuestions[activeIdx];
            } else {
                // 체크 상태였다면 확신(일반) 마킹 상태로 전이 (체크 해제)
                state.checkedQuestions[activeIdx] = false;
            }
        } else {
            // 아직 아무 마킹도 없었거나 다른 번호가 마킹된 상태라면
            state.userAnswers[activeIdx] = choiceNum;
            state.checkedQuestions[activeIdx] = false;
        }
    }
    
    // Render current question updates (apply colors, OMR sync)
    renderActiveQuestion();
    updateMarkingStatus();
    
    // Auto-save session
    autoSaveSession();
    
    // Check if ALL questions solved (Auto-submit suggestion)
    const answeredCount = Object.keys(state.userAnswers).length;
    if (answeredCount === state.currentQuestions.length) {
        setTimeout(() => {
            if (confirm("마지막 문제까지 모두 풀었습니다!\n시험지를 제출하고 최종 결과를 확인하시겠습니까?")) {
                submitExam();
            }
        }, 1000);
    }
}

// Navigation between questions
function prevQuestion() {
    const prevIndex = getAdjacentFilteredIndex(-1);
    if (prevIndex !== null) {
        state.activeQuestionIndex = prevIndex;
        renderActiveQuestion();
    }
}

function nextQuestion() {
    const nextIndex = getAdjacentFilteredIndex(1);
    if (nextIndex !== null) {
        state.activeQuestionIndex = nextIndex;
        renderActiveQuestion();
    }
}

// Manual Toggle Explanation Box
function toggleHintBox() {
    dom.explanationBox.classList.toggle('collapsed');
}

// Grading Engine & Result Modal
function submitExam() {
    clearInterval(state.timerInterval);
    
    const total = state.currentQuestions.length;
    let correct = 0;
    
    state.currentQuestions.forEach((q, idx) => {
        if (state.userAnswers[idx] === q.answer) {
            correct++;
        }
    });
    
    const scoreVal = Math.round((correct / total) * 100);
    const passScore = 60; // Standard qualification pass limit is 60 points
    const isPass = scoreVal >= passScore;
    const timeMinutes = state.timeSpentSeconds / 60;
    const baseScore = (correct / total) * 100;
    const timeBonus = Math.max(0, (1 - (timeMinutes / 100)) * 100);
    const gameScore = Math.round(baseScore + timeBonus);
    
    // Bind stats to modal
    dom.resultScore.innerText = `${correct} / ${total}`;
    dom.resultPercent.innerText = `${scoreVal}점`;
    
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
            const isCorrect = Number(selected) === Number(q.answer);
            if (!isCorrect) {
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
    if (!dom.calculatorDisplay) return;
    let current = dom.calculatorDisplay.value || '';
    if (value === 'C') {
        dom.calculatorDisplay.value = '0';
        return;
    }
    // 👇 백스페이스 기능 추가 👇
    if (value === 'backspace') {
        // 에러 상태이거나 글자가 1개만 남았을 때는 0으로 초기화
        if (current === 'Error' || current.length === 1) {
            dom.calculatorDisplay.value = '0';
        } else {
            // 맨 마지막 글자 하나만 잘라내기
            dom.calculatorDisplay.value = current.slice(0, -1);
        }
        return;
    }
    if (value === '=') {
        // 🔥 [추가] 열린 괄호만큼 닫는 괄호 자동 완성 로직
        const openParens = (current.match(/\(/g) || []).length;
        const closeParens = (current.match(/\)/g) || []).length;
        if (openParens > closeParens) {
            current += ')'.repeat(openParens - closeParens); // 부족한 만큼 ')' 추가
        }
        try {
            const sanitized = current
                .replace(/÷/g, '/')
                .replace(/×/g, '*')
                .replace(/\^2/g, '**2')
                .replace(/\^3/g, '**3');
            const result = evaluateCalculatorExpression(sanitized);
            dom.calculatorDisplay.value = String(result);
        } catch (e) {
            dom.calculatorDisplay.value = 'Error';
        }
        return;
    }

    if (current === '0' && !/[\+\-\*\/\^\.]/.test(value)) {
        current = '';
    }

    dom.calculatorDisplay.value = current + value;
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
    
    // 3. 풀이 모드 및 리뷰 모드 모두 정답/오답 색상 표시 (사이드바 OMR 마킹판과 동일하게 처리)
    const userAnswer = state.userAnswers[idx];
    if (userAnswer !== undefined && userAnswer !== null) {
      const correctAnswer = q.answer;
      if (Number(userAnswer) === Number(correctAnswer)) {
        btn.classList.add('correct');
      } else {
        btn.classList.add('wrong');
      }
    }
    
    // 4. 클릭 시 해당 문제로 점프하고 모달 닫기
    btn.addEventListener('click', () => {
      state.activeQuestionIndex = idx;
      renderActiveQuestion();
      dom.questionJumpModal.classList.remove('active');
    });
    
    dom.questionJumpGrid.appendChild(btn);
  });
  
    // 모달 화면에 표시
  dom.questionJumpModal.classList.add('active');
}

// ==========================================
// 시스템 로그 시스템 (강력한 로깅 및 상세 조회)
// ==========================================

// 시스템 로그 기록
function logSystem(level, message, details = '') {
    const user = state.currentUser || 'GUEST';
    
    let logs = [];
    try {
        logs = JSON.parse(localStorage.getItem(`cbt_${user}_system_logs`)) || [];
    } catch (e) {
        logs = [];
    }
    
    if (!Array.isArray(logs)) logs = [];
    
    const newLog = {
        timestamp: new Date().toLocaleString(),
        level: level.toUpperCase(),
        message: message,
        details: details
    };
    
    logs.unshift(newLog);
    if (logs.length > 300) { // 성능을 위해 최근 300개만 유지
        logs.length = 300;
    }
    
    try {
        localStorage.setItem(`cbt_${user}_system_logs`, JSON.stringify(logs));
    } catch (e) {
        console.error('Failed to save system logs:', e);
    }
    
    // 설정 화면에 있는 경우 즉시 반영
    if (window.location.hash === '#settings') {
        renderSystemLogs();
    }
}

// 시스템 로그 렌더링
function renderSystemLogs() {
    const container = document.getElementById('system-logs-container');
    if (!container) return;
    
    const user = state.currentUser || 'GUEST';
    let logs = [];
    try {
        logs = JSON.parse(localStorage.getItem(`cbt_${user}_system_logs`)) || [];
    } catch (e) {
        logs = [];
    }
    
    if (!Array.isArray(logs) || logs.length === 0) {
        container.innerHTML = '<div style="color: var(--text-muted); text-align: center; padding: 20px;">로그 내역이 없습니다.</div>';
        return;
    }
    
    container.innerHTML = '';
    logs.forEach((log, idx) => {
        const item = document.createElement('div');
        item.style.borderBottom = '1px solid rgba(255, 255, 255, 0.05)';
        item.style.padding = '8px 4px';
        item.style.cursor = 'pointer';
        item.style.transition = 'background-color 0.2s';
        
        let levelColor = '#94a3b8'; // info
        if (log.level === 'ERROR') levelColor = '#ff4444';
        if (log.level === 'WARNING') levelColor = '#fbbf24';
        
        item.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
                <span style="color: ${levelColor}; font-weight: bold; min-width: 60px;">[${log.level}]</span>
                <span style="flex: 1; word-break: break-all; color: var(--text-primary);">${log.message}</span>
                <span style="color: var(--text-muted); font-size: 10px; white-space: nowrap;">${log.timestamp}</span>
            </div>
            <div id="log-detail-${idx}" style="display: none; background: rgba(0, 0, 0, 0.25); border-left: 2px solid ${levelColor}; padding: 8px; margin-top: 6px; white-space: pre-wrap; word-break: break-all; font-size: 11px; color: var(--text-secondary);">
                ${log.details ? log.details : '상세 정보가 없습니다.'}
            </div>
        `;
        
        item.addEventListener('mouseover', () => {
            item.style.backgroundColor = 'rgba(255, 255, 255, 0.02)';
        });
        item.addEventListener('mouseout', () => {
            item.style.backgroundColor = 'transparent';
        });
        item.addEventListener('click', () => {
            const detail = item.querySelector(`#log-detail-${idx}`);
            if (detail) {
                const isHidden = detail.style.display === 'none';
                detail.style.display = isHidden ? 'block' : 'none';
            }
        });
        
        container.appendChild(item);
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