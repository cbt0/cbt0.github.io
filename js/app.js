/**
 * Antigravity CBT - Core Application Script
 * Handled features: SPA routing, JSON loading, Quiz state, grading engine, and localStorage stats.
 */
// 1. Supabase 설정 — Publishable(브라우저용) 키만 사용하세요
const SUPABASE_URL = 'https://yjtfdxeuslkjyxklitsp.supabase.co';
const SUPABASE_KEY = 'sb_publishable_DEJKbgIeEmgBMXb89lbVMw_TC4DXxDn';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Global Idle Timer for Auto-Logout
let idleTimer;

// Application Global State
const state = {
    exams: {},              // Loaded exam data by subject
    activeSubject: 'home',  // 'home', 'gas', 'energy_craftsman', etc.
    activeRound: null,      // Active round object
    activeQuestionIndex: 0, // 0 to 59
    userAnswers: {},        // {questionIndex: selectedOption}
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
    logo: document.getElementById('logo-btn'),
    themeToggle: document.getElementById('theme-toggle'),
    loginSubmitBtn: document.getElementById('login-submit-btn'),
    signupBtn: document.getElementById('signup-btn'),
    
    // Login / Welcome widget elements
    loginFormContainer: document.getElementById('login-form-container'),
    welcomeContainer: document.getElementById('welcome-container'),
    welcomeUsername: document.getElementById('welcome-username'),
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
    roundsBackBtn: document.getElementById('rounds-back-btn'),
    
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
    scoreRingBar: document.getElementById('score-ring-bar')
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
    if (savedUser) {
        state.currentUser = savedUser;
        dom.loginFormContainer.classList.add('hidden');
        dom.welcomeContainer.classList.remove('hidden');
        dom.welcomeUsername.innerText = savedUser;
        dom.subjectSelectionSection.classList.remove('hidden');
        if (dom.loginSubmitBtn) dom.loginSubmitBtn.classList.add('hidden');
        updateHomeResumeButton();
    } else {
        state.currentUser = null;
        dom.loginFormContainer.classList.remove('hidden');
        dom.welcomeContainer.classList.add('hidden');
        dom.subjectSelectionSection.classList.add('hidden');
        if (dom.loginSubmitBtn) dom.loginSubmitBtn.classList.remove('hidden');
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
                    dom.homeResumeBtn.innerText = `▶ 이어하기 : ${subjectName} ${roundName} (Q. ${questionNum})`;
                    dom.homeResumeBtn.classList.remove('hidden');
                }
            } else {
                if (dom.homeResumeBtn) dom.homeResumeBtn.classList.add('hidden');
            }
        } catch (e) {
            console.error('Error parsing session data:', e);
            if (dom.homeResumeBtn) dom.homeResumeBtn.classList.add('hidden');
        }
    } else {
        if (dom.homeResumeBtn) dom.homeResumeBtn.classList.add('hidden');
    }
}

// Auto Save Quiz Session State to LocalStorage
function autoSaveSession() {
    if (!state.currentUser || !state.activeRound || state.quizMode !== 'solving') return;
    
    const key = `cbt_${state.currentUser}_autosave_session`;
    const sessionData = {
        subject: state.activeSubject,
        activeRound: state.activeRound,
        activeQuestionIndex: state.activeQuestionIndex,
        userAnswers: state.userAnswers,
        timeSpentSeconds: state.timeSpentSeconds
    };
    
    localStorage.setItem(key, JSON.stringify(sessionData));
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

// 클라우드 우선 동기화: Supabase -> localStorage
async function syncDataFromCloud(userId, username) {
    if (!userId || !username) return;
    try {
        // 1) user_stats 조회
        const { data: statsRow, error: statsErr } = await supabase.from('user_stats').select('*').eq('user_id', userId).maybeSingle();
        if (!statsErr && statsRow) {
            const perUserStats = {
                totalSolved: statsRow.total_solved || 0,
                totalExamsAttempted: statsRow.total_exams_attempted || 0,
                passedExamsCount: statsRow.passed_exams_count || 0,
                averageSum: statsRow.average_sum || 0
            };

            // 덮어쓰기: 사용자별 키
            const perUserKey = `cbt_${username}_global_stats`;
            localStorage.setItem(perUserKey, JSON.stringify(perUserStats));

            // 글로벌 맵 업데이트
            const globalKey = 'cbt_global_stats';
            let globalMap = {};
            try { globalMap = JSON.parse(localStorage.getItem(globalKey)) || {}; } catch (e) { globalMap = {}; }
            const avgRate = perUserStats.totalExamsAttempted > 0 ? Math.round(perUserStats.averageSum / perUserStats.totalExamsAttempted) : 0;
            globalMap[username] = {
                totalSolved: perUserStats.totalSolved,
                totalExamsAttempted: perUserStats.totalExamsAttempted,
                passedExamsCount: perUserStats.passedExamsCount,
                averageRate: avgRate
            };
            localStorage.setItem(globalKey, JSON.stringify(globalMap));
        }

        // 2) cbt_progress 조회 및 로컬 덮어쓰기
        const { data: progressRows, error: progErr } = await supabase.from('cbt_progress').select('*').eq('user_id', userId);
        if (!progErr) {
            // 기존 로컬 progress 키 전부 제거
            Object.keys(localStorage).forEach(k => {
                if (k.startsWith('cbt_progress_')) {
                    localStorage.removeItem(k);
                }
            });

            // 클라우드 데이터를 로컬에 기록 (username 접두사 사용)
            (progressRows || []).forEach(row => {
                const subj = row.subject || 'unknown';
                const roundKey = row.round_key || (`id_${row.id || Date.now()}`);
                const key = `cbt_progress_${username}_${subj}_${roundKey}`;
                const payload = {
                    score: row.score || 0,
                    total: row.total || 0,
                    percent: row.percent || 0,
                    time: row.time_seconds || row.time || 0,
                    completed: !!row.completed
                };
                localStorage.setItem(key, JSON.stringify(payload));
            });
        }

        // 상태 업데이트
        state.currentUser = username;
        updateHomeResumeButton();
        renderGradingDashboard();
    } catch (e) {
        console.warn('syncDataFromCloud error', e);
    }
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

// Perform Login (클라우드 우선 동기화)
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

    const email = `${username}@cbt.com`;

    // 시도 1: 로그인
    try {
        const { data: signData, error: signError } = await supabase.auth.signInWithPassword({ email, password });
        if (signError) {
            // 로그인 실패 -> 신규 가입 자동 시도
            console.warn('signIn error, attempting signUp', signError.message || signError);
            const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ email, password });
            if (signUpError) {
                alert('로그인/회원가입 실패: ' + signUpError.message);
                return;
            }

            const newUser = signUpData && signUpData.user ? signUpData.user : null;
            if (!newUser) {
                alert('회원가입 처리 중 오류가 발생했습니다.');
                return;
            }

            // profiles 생성
            try {
                await supabase.from('profiles').insert([{ id: newUser.id, username: username, display_name: username }]);
            } catch (e) { console.warn('profiles insert error after signup', e.message || e); }

            // 로컬에 남아있는 데이터가 있으면 클라우드로 업로드 (user_stats, cbt_progress)
            try {
                // user_stats 업로드
                const perUserKey = `cbt_${username}_global_stats`;
                const perUserStr = localStorage.getItem(perUserKey);
                let statsPayload = {};
                if (perUserStr) {
                    try { statsPayload = JSON.parse(perUserStr); } catch (e) { statsPayload = {}; }
                } else {
                    const globalStr = localStorage.getItem('cbt_global_stats');
                    if (globalStr) {
                        try { const gm = JSON.parse(globalStr) || {}; if (gm[username]) statsPayload = gm[username]; } catch (e) { }
                    }
                }

                if (Object.keys(statsPayload).length > 0) {
                    await supabase.from('user_stats').upsert([{
                        user_id: newUser.id,
                        total_solved: statsPayload.totalSolved || statsPayload.total_solved || 0,
                        total_exams_attempted: statsPayload.totalExamsAttempted || statsPayload.totalExamsAttempted || 0,
                        passed_exams_count: statsPayload.passedExamsCount || statsPayload.passedExamsCount || 0,
                        average_sum: statsPayload.averageSum || statsPayload.average_sum || 0
                    }]);
                }

                // cbt_progress 업로드
                const progressInserts = [];
                Object.keys(localStorage).forEach(key => {
                    if (!key.startsWith('cbt_progress_')) return;
                    const raw = localStorage.getItem(key);
                    if (!raw) return;
                    try {
                        const parsed = JSON.parse(raw);
                        let suffix = key.replace('cbt_progress_', '');
                        if (suffix.startsWith(username + '_')) suffix = suffix.slice(username.length + 1);
                        const parts = suffix.split('_');
                        const subject = parts[0] || null;
                        const roundKey = parts.slice(1).join('_') || null;
                        progressInserts.push({
                            user_id: newUser.id,
                            subject: subject,
                            round_key: roundKey,
                            score: parsed.score || parsed.correct || 0,
                            total: parsed.total || 0,
                            percent: parsed.percent || 0,
                            time_seconds: parsed.time || parsed.time_seconds || 0,
                            completed: parsed.completed ? true : false
                        });
                    } catch (e) { }
                });
                if (progressInserts.length > 0) {
                    await supabase.from('cbt_progress').insert(progressInserts);
                }
            } catch (e) {
                console.warn('upload local -> cloud after signup error', e);
            }

            // 완료 메시지 및 화면 전환
            localStorage.setItem('cbt_current_user', username);
            state.currentUser = username;
            if (dom.saveIdCheck) {
                if (dom.saveIdCheck.checked) localStorage.setItem('cbt_saved_id', username);
            }

            // UI
            dom.loginFormContainer.classList.add('hidden');
            dom.welcomeContainer.classList.remove('hidden');
            dom.welcomeUsername.innerText = username;
            dom.subjectSelectionSection.classList.remove('hidden');
            if (dom.loginSubmitBtn) dom.loginSubmitBtn.classList.add('hidden');
            updateHomeResumeButton();
            logUserActivity('신규 계정 생성 및 로컬 데이터 백업 완료');
            resetIdleTimer();
            alert('새로운 클라우드 계정이 생성되고 데이터가 백업되었습니다.');
            setTimeout(() => { dom.subjectSelectionSection.scrollIntoView({ behavior: 'smooth' }); }, 100);
            return;
        }

        // 로그인 성공
        const supaUser = signData && signData.user ? signData.user : null;
        const uid = supaUser ? supaUser.id : null;

        // 클라우드 데이터 우선 동기화
        if (uid) {
            await syncDataFromCloud(uid, username);
            alert('클라우드 데이터가 동기화되었습니다.');
        }

        // 로컬 ID 저장
        if (dom.saveIdCheck) {
            if (dom.saveIdCheck.checked) localStorage.setItem('cbt_saved_id', username);
            else localStorage.removeItem('cbt_saved_id');
        }

        localStorage.setItem('cbt_current_user', username);
        state.currentUser = username;

        // ensure profile exists
        try { if (uid) await supabase.from('profiles').upsert({ id: uid, username: username, display_name: username }); } catch (e) { console.warn(e); }

        // UI transition
        dom.loginFormContainer.classList.add('hidden');
        dom.welcomeContainer.classList.remove('hidden');
        dom.welcomeUsername.innerText = username;
        dom.subjectSelectionSection.classList.remove('hidden');
        if (dom.loginSubmitBtn) dom.loginSubmitBtn.classList.add('hidden');

        updateHomeResumeButton();
        logUserActivity('로그인 성공');
        resetIdleTimer();
        setTimeout(() => { dom.subjectSelectionSection.scrollIntoView({ behavior: 'smooth' }); }, 100);

    } catch (e) {
        console.error('login flow error', e);
        alert('로그인 중 오류가 발생했습니다. 콘솔을 확인하세요.');
    }
}

// Perform Logout
function logout() {
    (async () => {
        if (state.currentUser) {
            logUserActivity('로그아웃');
        }
        try {
            await supabase.auth.signOut();
        } catch (e) {
            console.warn('Supabase signOut error', e.message || e);
        }

        localStorage.removeItem('cbt_current_user');
        state.currentUser = null;
        dom.loginId.value = '';
        dom.loginPw.value = '';

        if (idleTimer) clearTimeout(idleTimer);
        if (state.timerInterval) clearInterval(state.timerInterval);

        checkLoginState();
        switchTab('home');
    })();
}

// 회원가입 및 로컬 데이터 마이그레이션
async function signupAndMigrate() {
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

    try {
        const email = `${username}@cbt.com`;
        const { data: signData, error: signError } = await supabase.auth.signUp({ email, password });
        if (signError) {
            alert('회원가입 실패: ' + signError.message);
            return;
        }

        const newUser = signData && signData.user ? signData.user : null;
        if (!newUser) {
            alert('회원가입 처리 중 사용자 정보를 가져오지 못했습니다.');
            return;
        }

        // 1) profiles 테이블에 기본 프로필 생성
        try {
            await supabase.from('profiles').insert([{ id: newUser.id, username: username, display_name: username }]);
        } catch (e) {
            console.warn('profiles insert error', e.message || e);
        }

        // 2) 로컬 통계(user_stats) 마이그레이션
        let migratedStats = {
            totalSolved: 0,
            totalExamsAttempted: 0,
            passedExamsCount: 0,
            averageSum: 0
        };

        // Per-user key 우선
        const perUserKey = `cbt_${username}_global_stats`;
        const perUserStr = localStorage.getItem(perUserKey);
        if (perUserStr) {
            try {
                const s = JSON.parse(perUserStr);
                migratedStats.totalSolved = s.totalSolved || s.total_solved || 0;
                migratedStats.totalExamsAttempted = s.totalExamsAttempted || s.totalExamsAttempted || 0;
                migratedStats.passedExamsCount = s.passedExamsCount || s.passedExamsCount || 0;
                migratedStats.averageSum = s.averageSum || s.average_sum || 0;
            } catch (e) { /* ignore parse errors */ }
        } else {
            // 글로벌 맵에서 해당 ID 항목이 있는지 확인
            const globalStr = localStorage.getItem('cbt_global_stats');
            if (globalStr) {
                try {
                    const globalMap = JSON.parse(globalStr) || {};
                    if (globalMap[username]) {
                        const s = globalMap[username];
                        migratedStats.totalSolved = s.totalSolved || s.total_solved || 0;
                        migratedStats.totalExamsAttempted = s.totalExamsAttempted || s.totalExamsAttempted || 0;
                        migratedStats.passedExamsCount = s.passedExamsCount || s.passedExamsCount || 0;
                        migratedStats.averageSum = s.averageRate ? (s.averageRate * (s.totalExamsAttempted || 0)) : (s.averageSum || 0);
                    }
                } catch (e) { /* ignore */ }
            }
        }

        // Insert/Upsert user_stats
        try {
            await supabase.from('user_stats').upsert([{
                user_id: newUser.id,
                total_solved: migratedStats.totalSolved || 0,
                total_exams_attempted: migratedStats.totalExamsAttempted || 0,
                passed_exams_count: migratedStats.passedExamsCount || 0,
                average_sum: migratedStats.averageSum || 0
            }]);
        } catch (e) {
            console.warn('user_stats upsert error', e.message || e);
        }

        // 3) cbt_progress 항목 마이그레이션
        const progressInserts = [];
        Object.keys(localStorage).forEach(key => {
            if (!key.startsWith('cbt_progress_')) return;

            const raw = localStorage.getItem(key);
            if (!raw) return;

            try {
                const parsed = JSON.parse(raw);
                // 키에서 subject 및 round 정보를 추출: cbt_progress_[maybe username_]subject_year_round
                let suffix = key.replace('cbt_progress_', '');
                if (suffix.startsWith(username + '_')) {
                    suffix = suffix.slice(username.length + 1);
                }
                const parts = suffix.split('_');
                const subject = parts[0] || null;
                const roundKey = parts.slice(1).join('_') || null;

                const obj = {
                    user_id: newUser.id,
                    subject: subject,
                    round_key: roundKey,
                    score: parsed.score || parsed.correct || 0,
                    total: parsed.total || 0,
                    percent: parsed.percent || parsed.percent || 0,
                    time_seconds: parsed.time || parsed.time_seconds || 0,
                    completed: parsed.completed ? true : false
                };

                progressInserts.push(obj);
            } catch (e) {
                // skip invalid JSON
            }
        });

        if (progressInserts.length > 0) {
            try {
                // Bulk insert
                await supabase.from('cbt_progress').insert(progressInserts);
            } catch (e) {
                console.warn('cbt_progress insert error', e.message || e);
            }
        }

        // 완료 알림 및 입력 초기화 (사용자에게 로그인 권장)
        alert('회원가입 및 기존 학습 데이터 복구가 완료되었습니다! 로그인 버튼을 눌러 시작해주세요.');
        dom.loginId.value = '';
        dom.loginPw.value = '';

    } catch (e) {
        console.error('signupAndMigrate error', e);
        alert('회원가입 중 오류가 발생했습니다. 콘솔을 확인하세요.');
    }
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

    // Also persist to Supabase `user_logs` if authenticated
    (async () => {
        try {
            const { data: userData } = await supabase.auth.getUser();
            const uid = userData && userData.user ? userData.user.id : null;
            if (uid) {
                await supabase.from('user_logs').insert([{ user_id: uid, event_type: 'activity', message: msg }]);
            }
        } catch (e) {
            // Do not block UI on logging errors
            console.warn('user_logs insert error', e.message || e);
        }
    })();
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
    
    // Logo Click
    dom.logo.addEventListener('click', () => navigateTo('home'));
    
    // Theme Toggle
    if (dom.themeToggle) {
        dom.themeToggle.addEventListener('click', toggleTheme);
    }
    
    // Login Button on Dashboard
    if (dom.loginSubmitBtn) {
        dom.loginSubmitBtn.addEventListener('click', () => {
            login();
        });
    }

    // Signup Button (회원가입 및 로컬 데이터 마이그레이션)
    if (dom.signupBtn) {
        dom.signupBtn.addEventListener('click', () => {
            signupAndMigrate();
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
                if (session && session.activeRound) {
                    // Restore state variables
                    state.activeSubject = session.subject;
                    state.activeRound = session.activeRound;
                    state.currentQuestions = session.activeRound.questions;
                    state.activeQuestionIndex = session.activeQuestionIndex;
                    state.userAnswers = session.userAnswers || {};
                    state.timeSpentSeconds = session.timeSpentSeconds || 0;
                    
                    // Call startQuiz with isResume = true
                    startQuiz(session.activeRound, true);
                }
            } catch (e) {
                console.error('Error resuming session:', e);
                alert('이어하기 중 오류가 발생했습니다.');
            }
        });
    }
    
    // Password Enter Key
    if (dom.loginPw) {
        dom.loginPw.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
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
    
    // Back Button in Round Selector
    dom.roundsBackBtn.addEventListener('click', () => navigateTo('home'));
    
    // Quiz navigation buttons
    dom.prevBtn.addEventListener('click', prevQuestion);
    dom.nextBtn.addEventListener('click', nextQuestion);
    
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
    dom.hintBtn.addEventListener('click', toggleHintBox);
    
    // Choice selection buttons
    dom.choices.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const choiceNum = parseInt(e.currentTarget.getAttribute('data-choice'));
            handleSelectAnswer(choiceNum);
        });
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
        if (state.activeSubject && state.activeSubject !== 'home') {
            window.location.hash = `#rounds/${state.activeSubject}`;
        } else {
            window.location.hash = '#home';
        }
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
        switchTabStyles('grading');
        if (state.activeRound) {
            showView('quiz');
            const quizScreen = document.getElementById('quiz-screen');
            if (quizScreen) {
                quizScreen.classList.add('show-quiz-sidebar');
                quizScreen.classList.remove('show-quiz-main');
            }
        } else {
            showView('grading');
            renderGradingDashboard();
        }
    } else if (hash === '#settings') {
        switchTabStyles('settings');
        showView('settings');
    } else {
        // Fallback for unknown hashes
        window.location.hash = '#home';
    }
}

// Render available rounds grid
function renderRoundsList(subject) {
    const details = subjectDetails[subject];
    dom.roundsTitle.innerText = details.name;
    dom.roundsList.innerHTML = '';
    
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
    
    if (roundsData.length === 0) {
        dom.roundsList.innerHTML = `
            <div class="no-data-msg" style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-muted);">
                <i class="fa-solid fa-spinner fa-spin" style="font-size: 32px; margin-bottom: 15px; display: block; color: var(--primary);"></i>
                기출문제 데이터를 로딩하고 있습니다. 잠시만 기다려주세요...
            </div>
        `;
        // Try again in 500ms
        setTimeout(() => renderRoundsList(subject), 500);
        return;
    }
    
    roundsData.forEach((round, index) => {
        const card = document.createElement('div');
        card.className = 'round-card';
        
        // Load stats from localStorage
        const progressKey = `cbt_progress_${state.currentUser ? state.currentUser + '_' : ''}${subject}_${round.year}_${round.round}`;
        const progress = JSON.parse(localStorage.getItem(progressKey)) || { score: 0, total: 0, completed: false };
        
        let completedText = '';
        if (progress.completed) {
            completedText = `<span class="round-complete-status">풀이완료 (${progress.score}/${progress.total})</span>`;
        }
        
        card.innerHTML = `
            <div class="round-info-line">
                <span class="round-title">${round.year ? `${round.year}년 ` : ''}${round.round}</span>
                <span class="round-desc">(${round.questions.length}문제)</span>
                ${completedText}
            </div>
        `;
        
        card.addEventListener('click', () => {
            startQuiz(round);
        });
        
        dom.roundsList.appendChild(card);
    });
}

// Start Quiz Session
function startQuiz(round, isResume = false) {
    state.activeRound = round;
    state.currentQuestions = round.questions;
    if (!isResume) {
        state.activeQuestionIndex = 0;
        state.userAnswers = {};
        state.timeSpentSeconds = 0;
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
        
        // Active highlight
        if (state.activeQuestionIndex === idx) {
            btn.classList.add('active');
        }
        
        if (state.quizMode === 'solving') {
            // Check if solved
            if (state.userAnswers[idx] !== undefined) {
                btn.classList.add('solved');
            }
        } else if (state.quizMode === 'review') {
            // Correct/Incorrect colored dots
            const userAnswer = state.userAnswers[idx];
            const correctAnswer = q.answer;
            if (userAnswer === correctAnswer) {
                btn.classList.add('correct');
            } else {
                btn.classList.add('wrong');
            }
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
    applyQuestionFilter();
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
    
    // Options text binding
    dom.choices.forEach((btn, idx) => {
        const choiceNum = idx + 1;
        const textSpan = btn.querySelector('.choice-text');
        
        textSpan.innerText = q.options[idx] || '';
        
        // Reset option styles
        btn.className = 'choice-item';
        
        // If question was already answered
        const userAnswer = state.userAnswers[state.activeQuestionIndex];
        const correctAnswer = q.answer;
        
        if (userAnswer !== undefined) {
            // Apply correct/wrong decoration
            if (choiceNum === correctAnswer) {
                btn.classList.add('correct');
            } else if (choiceNum === userAnswer) {
                btn.classList.add('wrong');
            }
        }
    });
    
    // Hint & Explanation Box
    dom.explanationText.innerHTML = q.hint || '이 문제에 대한 별도 해설 정보가 없습니다.';
    
    const userAnswer = state.userAnswers[state.activeQuestionIndex];
    if (userAnswer !== undefined) {
        // Automatically open the hint box when answered!
        dom.explanationBox.classList.remove('collapsed');
    } else {
        // Keep collapsed for new questions
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

// Choice Click logic
function handleSelectAnswer(choiceNum) {
    // If in review mode or already answered, block selection
    if (state.quizMode === 'review') return;
    if (state.userAnswers[state.activeQuestionIndex] !== undefined) return;
    
    // Save answer
    state.userAnswers[state.activeQuestionIndex] = choiceNum;
    
    // Render current question updates (apply colors, open hint box)
    renderActiveQuestion();
    
    // Auto-save session
    autoSaveSession();
    
    // Check if ALL questions solved (Auto-submit suggestion)
    const answeredCount = Object.keys(state.userAnswers).length;
    if (answeredCount === state.currentQuestions.length) {
        // Tiny timeout to let the user see the current question's result
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
async function submitExam() {
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
        updateHomeResumeButton();
    }
    
    // Refresh leaderboard immediately
    renderLeaderboard();

    // 서버 동기화: cbt_progress 삽입 및 user_stats 집계 업데이트 (클라우드 우선 방식)
    if (state.currentUser) {
        try {
            const { data: userData } = await supabase.auth.getUser();
            const uid = userData && userData.user ? userData.user.id : null;
            if (uid) {
                // Insert progress to cloud
                try {
                    await supabase.from('cbt_progress').insert([{ 
                        user_id: uid,
                        subject: state.activeSubject,
                        round_key: roundKey,
                        score: correct,
                        total: total,
                        percent: scoreVal,
                        time_seconds: state.timeSpentSeconds,
                        completed: true
                    }]);
                } catch (e) {
                    console.warn('cbt_progress insert error', e.message || e);
                }

                // Update aggregated user_stats (fetch current, then upsert totals)
                try {
                    const { data: existingStats } = await supabase.from('user_stats').select('*').eq('user_id', uid).maybeSingle();
                    const updated = {
                        user_id: uid,
                        total_solved: (existingStats && existingStats.total_solved ? existingStats.total_solved : 0) + total,
                        total_exams_attempted: (existingStats && existingStats.total_exams_attempted ? existingStats.total_exams_attempted : 0) + 1,
                        passed_exams_count: (existingStats && existingStats.passed_exams_count ? existingStats.passed_exams_count : 0) + (isPass ? 1 : 0),
                        average_sum: (existingStats && existingStats.average_sum ? existingStats.average_sum : 0) + scoreVal
                    };
                    await supabase.from('user_stats').upsert([updated]);
                } catch (e) {
                    console.warn('user_stats update error', e.message || e);
                }

                // Refresh local from cloud to ensure 단일 소스 진실성
                try {
                    await syncDataFromCloud(uid, state.currentUser);
                } catch (e) {
                    console.warn('syncDataFromCloud after submit error', e.message || e);
                }
            }
        } catch (e) {
            console.warn('submitExam cloud sync error', e.message || e);
        }
    }
    
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
    const historyKey = `cbt_${state.currentUser}_past_sessions_${state.activeSubject}`;
    const stored = JSON.parse(localStorage.getItem(historyKey)) || [];
    
    const wrongQuestions = state.currentQuestions
        .filter((q, idx) => state.userAnswers[idx] !== undefined && state.userAnswers[idx] !== q.answer)
        .map(q => ({ ...q }));
    
    if (wrongQuestions.length === 0) return;
    
    stored.unshift({
        timestamp: Date.now(),
        subject: state.activeSubject,
        round: state.activeRound.round,
        year: state.activeRound.year,
        wrongQuestions
    });

    if (stored.length > 20) stored.length = 20;
    localStorage.setItem(historyKey, JSON.stringify(stored));
}

function handleCalculatorInput(value) {
    if (!dom.calculatorDisplay) return;
    let current = dom.calculatorDisplay.value || '';
    if (value === 'C') {
        dom.calculatorDisplay.value = '0';
        return;
    }
    if (value === '=') {
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
        .replace(/ln\(/g, 'Math.log(')
        .replace(/log\(/g, 'Math.log10(')
        .replace(/\^/g, '**');

    return Function(`"use strict"; return (${cleaned})`)();
}

function gatherWrongReviewQuestions() {
    if (!state.currentUser || !state.activeSubject) return [];
    const historyKey = `cbt_${state.currentUser}_past_sessions_${state.activeSubject}`;
    const sessions = JSON.parse(localStorage.getItem(historyKey)) || [];
    const questionMap = new Map();

    sessions.forEach(session => {
        (session.wrongQuestions || []).forEach(question => {
            const key = `${question.num}-${question.question}`;
            if (!questionMap.has(key)) {
                questionMap.set(key, { ...question });
            }
        });
    });

    return Array.from(questionMap.values());
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
