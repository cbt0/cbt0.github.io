# 🗄️ 글로벌 순위 및 데이터베이스 연동 계획서 (Database Integration Plan)

이 문서는 CBT 문제풀이 앱(`cbt0.github.io`)의 사용자 순위 및 정보 로그를 개별 브라우저(LocalStorage)를 넘어 전체 사용자가 실시간으로 공유하고 비교할 수 있도록 데이터베이스(DB)를 연동하기 위한 상세 기술 기획서입니다.

---

## 1. 도입 배경 및 한계 분석

### 1) 현재 구조 (LocalStorage)
* **방식**: 브라우저 내장 키-밸류 저장소에 사용자별 로그와 통계를 분리 적재.
* **한계**: 기기 독립적(Local-Only). 즉, A 사용자가 스마트폰으로 푼 문제 수와 B 사용자가 PC로 푼 문제 수가 공유되지 않아 진정한 의미의 **글로벌 순위 비교**가 불가능함.

### 2) 기술적 제약 사항 (GitHub Pages 정적 호스팅)
* **보안 위험**: GitHub Pages는 클라이언트(자바스크립트) 코드만 실행하므로, GitHub API 토큰을 소스코드에 포함해 커밋하는 방식은 **토큰 노출 및 레포지토리 탈취** 위험이 있어 불가능함.
* **백엔드 부재**: 사용자의 데이터를 받아서 로컬 파일(json 등)에 누적 기록해주는 상시 가동 백엔드 서버(Node.js, Python 등)가 존재하지 않음.

---

## 2. 해결 방안: 서버리스(Serverless) DB 도입

백엔드 서버 없이 정적 호스팅 환경에서 안전하게 글로벌 데이터를 수집할 수 있는 **무료 서버리스 DB(Database-as-a-Service)** 연동을 제안합니다.

### 💡 추천 플랫폼 비교

| 플랫폼 | 데이터 저장 방식 | 보안 및 인증 | 특징 |
| :--- | :--- | :--- | :--- |
| **Supabase** (추천 ⭐) | PostgreSQL (관계형 DB) | RLS (Row Level Security) | SQL을 그대로 사용하며, 무료 티어 제공이 강력하고 RESTful API 연동이 매우 간단함 |
| **Firebase** | NoSQL Document DB | Firebase Rules | 실시간 데이터 동기화에 최적화되어 있으나, 통계 집계(Aggregation) 쿼리가 약간 복잡함 |

---

## 3. 상세 설계안 (Supabase 기준)

### 1) 데이터베이스 스키마 (Database Schema)

#### ① `users` 테이블 (회원 관리)
```sql
CREATE TABLE users (
    id VARCHAR(50) PRIMARY KEY,
    password_hash VARCHAR(100) NOT NULL, -- 간단한 암호(dongbu) 해시 또는 평문
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### ② `user_stats` 테이블 (글로벌 및 누적 통계)
```sql
CREATE TABLE user_stats (
    user_id VARCHAR(50) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    total_solved INTEGER DEFAULT 0,
    total_exams_attempted INTEGER DEFAULT 0,
    passed_exams_count INTEGER DEFAULT 0,
    average_sum INTEGER DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### ③ `user_logs` 테이블 (최근 학습 로그)
```sql
CREATE TABLE user_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id VARCHAR(50) REFERENCES users(id) ON DELETE CASCADE,
    time_str VARCHAR(30) NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 4. 프론트엔드 연동 개발 가이드 (js/app.js 수정 방향)

### 1) CDN 연동
HTML 파일 상단에 Supabase JS SDK 라이브러리를 추가합니다.
```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
```

### 2) 클라이언트 초기화
공개 API Key를 사용하여 클라이언트를 기동합니다. (익명 공개 키는 코드에 노출되어도 안전합니다.)
```javascript
const supabaseUrl = 'https://YOUR_PROJECT_REF.supabase.co';
const supabaseKey = 'YOUR_ANON_PUBLIC_KEY';
const supabase = supabase.createClient(supabaseUrl, supabaseKey);
```

### 3) 주요 API 연동 함수 예시

#### ① 로그인 및 검증 (`login`)
```javascript
async function dbLogin(username, password) {
    // 1. users 테이블에서 ID 조회
    const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', username)
        .single();
        
    // 2. 계정이 없으면 자동 회원가입 처리 (비밀번호: dongbu)
    if (!user) {
        if (password === 'dongbu') {
            await supabase.from('users').insert([{ id: username, password_hash: password }]);
            await supabase.from('user_stats').insert([{ user_id: username }]); // 기본 통계 열 신설
        } else {
            alert('비밀번호가 일치하지 않습니다.');
            return;
        }
    }
}
```

#### ② 통계 저장 (`saveGlobalStats`)
```javascript
async function dbSaveGlobalStats(scoreVal, total, isPass) {
    if (!state.currentUser) return;
    
    // DB의 현재 값을 트랜잭션 방식으로 증분하거나 수동 fetch 후 갱신
    const { data } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', state.currentUser)
        .single();
        
    if (data) {
        await supabase
            .from('user_stats')
            .update({
                total_solved: data.total_solved + total,
                total_exams_attempted: data.total_exams_attempted + 1,
                passed_exams_count: data.passed_exams_count + (isPass ? 1 : 0),
                average_sum: data.average_sum + scoreVal,
                updated_at: new Date()
            })
            .eq('user_id', state.currentUser);
    }
}
```

#### ③ 실시간 순위 조회 (`renderLeaderboard`)
```javascript
async function dbRenderLeaderboard() {
    const rankingList = document.getElementById('user-ranking-list');
    if (!rankingList) return;
    
    // 푼 문제수(total_solved) 기준 상위 50명 호출
    const { data: rankings, error } = await supabase
        .from('user_stats')
        .select('user_id, total_solved')
        .order('total_solved', { ascending: false })
        .limit(50);
        
    if (error || !rankings || rankings.length === 0) {
        rankingList.innerHTML = '<p class="no-data-msg">순위 정보가 없습니다.</p>';
        return;
    }
    
    rankingList.innerHTML = rankings.map((user, index) => {
        const rank = index + 1;
        const isMe = user.user_id === state.currentUser;
        return `
            <div class="ranking-item ${isMe ? 'current-user' : ''}">
                <div class="ranking-user-info">
                    <span class="rank-badge rank-${rank <= 3 ? rank : ''}">${rank}</span>
                    <span class="rank-user-name">${user.user_id}${isMe ? ' (나)' : ''}</span>
                </div>
                <span class="rank-score">${user.total_solved.toLocaleString()}문제</span>
            </div>
        `;
    }).join('');
}
```

---

## 5. 기대 효과 및 도입 시점

* **기대 효과**:
  - 사용자 기기(브라우저)와 관계없이 전역 로그인 및 동기화 구현.
  - 진정한 유저 실시간 랭킹 시스템 가동으로 학습 참여 동기부여 극대화.
  - 클라이언트 스토리지 유실(캐시 삭제 등) 시에도 통계 및 활동 로그가 영구 보존됨.
* **도입 시점**:
  - 향후 다중 사용자 테스트 및 본인 외 외부 사용자가 다수 접속하게 되는 시점에 맞춰 Supabase 무료 클라우드 생성 후 적용 예정.
