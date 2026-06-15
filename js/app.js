/**
 * Antigravity CBT - Core Application Script
 * Handled features: SPA routing, JSON loading, Quiz state, grading engine, and localStorage stats.
 */

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
    currentQuestions: []    // Active question list (usually 60)
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
    startLearningBtn: document.getElementById('start-learning-btn'),
    
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
    energy_industrial: { name: '에너지산업관리기사', isReal: false },
    energy_master: { name: '에너지기능장', isReal: false },
    air_conditioning: { name: '공조기능사', isReal: false }
};

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    loadDashboardStats();
    loadGasQuestions();
    registerEventListeners();
});

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

// Load JSON Database
async function loadGasQuestions() {
    try {
        const response = await fetch('data/gas/gas_questions.json');
        if (!response.ok) {
            throw new Error('데이터베이스를 불러올 수 없습니다.');
        }
        state.exams.gas = await response.json();
        console.log('가스기능사 데이터 로드 완료:', state.exams.gas.length, '회차');
    } catch (error) {
        console.error('기출문제 파일 로드 에러:', error);
        // Fallback or empty alert. Since we are on GitHub Pages/Server, it will fetch.
        // Let's create an empty array in state to prevent crashes
        state.exams.gas = [];
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
    
    // Start Learning Button on Dashboard
    dom.startLearningBtn.addEventListener('click', () => {
        navigateTo('gas'); // Default to main subject
    });
    
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
}

// SPA Navigation Control
function navigateTo(subject) {
    // Stop timers if we leave quiz
    if (state.activeSubject === 'quiz' && subject !== 'quiz') {
        clearInterval(state.timerInterval);
    }
    
    // Show corresponding screens under "home" tab flow
    if (subject === 'home') {
        state.activeSubject = 'home';
        showView('home');
        loadDashboardStats();
    } else {
        // Show Round Selector
        state.activeSubject = subject;
        showView('rounds');
        renderRoundsList(subject);
    }
    
    // Ensure "home" tab is active visually
    switchTabStyles('home');
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
    // Check if test is active when trying to view quiz or grading
    if ((tabName === 'quiz' || tabName === 'grading') && !state.activeRound) {
        alert('진행 중인 시험이 없습니다. 홈 화면에서 시험을 시작해 주세요.');
        switchTab('home');
        return;
    }
    
    switchTabStyles(tabName);
    
    if (tabName === 'home') {
        if (state.activeSubject && state.activeSubject !== 'home') {
            showView('rounds');
        } else {
            showView('home');
        }
    } else if (tabName === 'quiz') {
        showView('quiz');
        const quizScreen = document.getElementById('quiz-screen');
        quizScreen.classList.add('show-quiz-main');
        quizScreen.classList.remove('show-quiz-sidebar');
    } else if (tabName === 'grading') {
        showView('quiz');
        const quizScreen = document.getElementById('quiz-screen');
        quizScreen.classList.add('show-quiz-sidebar');
        quizScreen.classList.remove('show-quiz-main');
    } else if (tabName === 'settings') {
        showView('settings');
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

// Render available rounds grid
function renderRoundsList(subject) {
    const details = subjectDetails[subject];
    dom.roundsTitle.innerText = details.name;
    dom.roundsList.innerHTML = '';
    
    let roundsData = [];
    if (subject === 'gas') {
        roundsData = state.exams.gas || [];
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
        const progressKey = `cbt_progress_${subject}_${round.year}_${round.round}`;
        const progress = JSON.parse(localStorage.getItem(progressKey)) || { score: 0, total: 0, completed: false };
        
        let progressBadge = '';
        let progressBarWidth = '0%';
        if (progress.completed) {
            progressBadge = `<span class="round-badge complete">풀이완료 (${progress.score}/${progress.total})</span>`;
            progressBarWidth = '100%';
        }
        
        card.innerHTML = `
            ${progressBadge}
            <div class="round-title">${round.year}년 ${round.round}</div>
            <div class="round-desc">${round.questions.length} 문제 출제</div>
            <div class="round-progress-bar-wrapper">
                <div class="round-progress-bar" style="width: ${progressBarWidth}"></div>
            </div>
        `;
        
        card.addEventListener('click', () => {
            startQuiz(round);
        });
        
        dom.roundsList.appendChild(card);
    });
}

// Start Quiz Session
function startQuiz(round) {
    state.activeRound = round;
    state.currentQuestions = round.questions;
    state.activeQuestionIndex = 0;
    state.userAnswers = {};
    state.quizMode = 'solving';
    state.timeSpentSeconds = 0;
    
    // Set Header titles
    dom.quizSubjectName.innerText = round.subject;
    dom.quizRoundName.innerText = `${round.year}년 ${round.round}`;
    
    // Clear elements styling
    dom.explanationBox.classList.add('collapsed');
    
    // Render Marking sheet
    renderMarkingSheet();
    
    // Render first question
    renderActiveQuestion();
    
    // Start timer
    clearInterval(state.timerInterval);
    dom.timerText.innerText = '00:00';
    state.timerInterval = setInterval(() => {
        state.timeSpentSeconds++;
        const mins = String(Math.floor(state.timeSpentSeconds / 60)).padStart(2, '0');
        const secs = String(state.timeSpentSeconds % 60).padStart(2, '0');
        dom.timerText.innerText = `${mins}:${secs}`;
    }, 1000);
    
    // Show screen and switch tab to quiz
    switchTab('quiz');
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

function updateMarkingStatus() {
    state.currentQuestions.forEach((q, idx) => {
        const btn = document.getElementById(`marking-num-${idx}`);
        if (!btn) return;
        
        // Remove states
        btn.className = 'marking-btn';
        
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

// Render active question to view pane
function renderActiveQuestion() {
    const q = state.currentQuestions[state.activeQuestionIndex];
    if (!q) return;
    
    // Question layout (remove "Q. " prefix)
    dom.questionNum.innerText = String(q.num).padStart(2, '0');
    dom.questionText.innerText = q.question;
    
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
    dom.explanationText.innerText = q.hint || '이 문제에 대한 별도 해설 정보가 없습니다.';
    
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
    if (state.activeQuestionIndex > 0) {
        state.activeQuestionIndex--;
        renderActiveQuestion();
    }
}

function nextQuestion() {
    if (state.activeQuestionIndex < state.currentQuestions.length - 1) {
        state.activeQuestionIndex++;
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
        dom.scoreRingBar.style.strokeDashoffset = dashOffset;
    }, 100);
    
    // Save progress to LocalStorage
    const roundKey = `${state.activeRound.year}_${state.activeRound.round}`;
    const progressKey = `cbt_progress_${state.activeSubject}_${roundKey}`;
    localStorage.setItem(progressKey, JSON.stringify({
        score: correct,
        total: total,
        completed: true,
        percent: scoreVal,
        time: state.timeSpentSeconds
    }));
    
    // Update dashboard global counters
    saveGlobalStats(scoreVal, total, isPass);
    
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
function saveGlobalStats(scoreVal, total, isPass) {
    const stats = JSON.parse(localStorage.getItem('cbt_global_stats')) || {
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
    
    localStorage.setItem('cbt_global_stats', JSON.stringify(stats));
}

function loadDashboardStats() {
    const stats = JSON.parse(localStorage.getItem('cbt_global_stats')) || {
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
}
