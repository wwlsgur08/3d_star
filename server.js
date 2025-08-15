// 🌟 별자리 실시간 공유 WebSocket 서버
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

// StarGenerator 가져오기
const { StarGenerator } = require('./starGenerator.js');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// 미들웨어 설정
app.use(cors());
app.use(express.json({ limit: '10mb' })); // PNG 이미지 처리를 위한 큰 용량
// 정적 파일 서빙 (index.html은 제외)
app.use(express.static('.', { index: false }));

const PORT = process.env.PORT || 3333;

// 연결된 클라이언트들 추적
let connectedClients = new Set();
let starCounter = 51; // 기존 50개 다음부터

// 전시용 별자리 관리 변수
const MAX_TOTAL_STARS = 170; // 총 170개 제한
const ORIGINAL_DUMMY_COUNT = 50; // 원본 더미 데이터 50개
let realStarsCount = 0; // 실제 생성된 별자리 수
let dummyStarsToRemove = []; // 제거할 더미 별자리 ID 목록

console.log('🌟 별자리 서버 시작 중...');

// WebSocket 연결 처리
io.on('connection', (socket) => {
    connectedClients.add(socket);
    console.log(`✨ 새로운 우주 연결됨! (ID: ${socket.id})`);
    console.log(`🌍 현재 연결된 우주: ${connectedClients.size}개`);

    // 클라이언트 연결 해제
    socket.on('disconnect', () => {
        connectedClients.delete(socket);
        console.log(`💫 우주 연결 해제 (ID: ${socket.id})`);
        console.log(`🌍 현재 연결된 우주: ${connectedClients.size}개`);
    });

    // 새 별자리 생성 요청 수신
    socket.on('create-constellation', async (data) => {
        try {
            console.log('🎭 새 별자리 생성 요청 수신:', {
                charms: Object.keys(data.charmScores || {}),
                hasImage: !!data.imageData
            });

            // 전시용 별자리 관리 로직
            realStarsCount++;
            let dummyToRemove = null;
            
            console.log(`📊 현재 상태: 실제 별 ${realStarsCount}개, 더미 제거 대기 ${dummyStarsToRemove.length}개`);

            // 20개 초과 시 더미 데이터 하나 삭제 준비
            if (realStarsCount > 20 && dummyStarsToRemove.length < ORIGINAL_DUMMY_COUNT) {
                dummyToRemove = realStarsCount - 20; // 1부터 50까지 순서대로 제거
                dummyStarsToRemove.push(dummyToRemove);
                console.log(`🗑️ 더미 별자리 ID ${dummyToRemove} 제거 예정`);
            }

            // AI로 별명/설명 생성
            const generator = new StarGenerator();
            const generatedStar = generator.generateStar(data.charmScores);

            // 이미지 저장 처리
            let imagePath = null;
            if (data.imageData) {
                imagePath = await saveConstellationImage(data.imageData, starCounter);
            }

            // 새 별 데이터 구성
            const newStar = {
                id: starCounter,
                name: generatedStar.name,
                simpleDescription: generatedStar.simpleDescription,
                charms: generatedStar.charms,
                comment: generatedStar.comment,
                image: imagePath || `image/${starCounter}.png`, // 기본 이미지 경로
                isNewStar: true, // 신규 별 표시용
                timestamp: new Date().toISOString(),
                replaceDummyId: dummyToRemove // 교체할 더미 ID (있는 경우)
            };

            console.log(`⭐ 새로운 별 생성 완료: "${newStar.name}" (ID: ${starCounter})`);
            if (dummyToRemove) {
                console.log(`🔄 더미 별자리 ID ${dummyToRemove}를 실제 별자리로 교체`);
            }

            // 모든 연결된 3D 우주에 새 별 브로드캐스트
            io.emit('new-star-added', newStar);
            
            console.log(`📡 ${connectedClients.size}개 우주에 별 전송 완료`);

            // 생성 요청한 클라이언트에게 성공 응답
            socket.emit('constellation-created', {
                success: true,
                star: newStar,
                message: `"${newStar.name}"이 우주에 추가되었습니다! ⭐ (실제 별: ${realStarsCount}개)`
            });

            starCounter++;

        } catch (error) {
            console.error('❌ 별자리 생성 실패:', error);
            realStarsCount--; // 실패 시 카운트 되돌리기
            socket.emit('constellation-created', {
                success: false,
                error: error.message,
                message: '별자리 생성 중 오류가 발생했습니다.'
            });
        }
    });

    // 테스트용 별 생성
    socket.on('test-star', () => {
        const testCharms = {
            '창의성': 6,
            '열정': 5,
            '호기심': 4,
            '모험심': 3
        };
        
        socket.emit('create-constellation', {
            charmScores: testCharms,
            imageData: null
        });
    });
});

// 이미지 저장 함수
async function saveConstellationImage(base64Data, starId) {
    try {
        // base64 데이터에서 헤더 제거 (data:image/png;base64, 부분)
        const base64Image = base64Data.replace(/^data:image\/[a-z]+;base64,/, '');
        
        // 이미지 폴더 확인/생성
        const imageDir = path.join(__dirname, 'image');
        if (!fs.existsSync(imageDir)) {
            fs.mkdirSync(imageDir, { recursive: true });
        }

        // 파일 저장
        const fileName = `${starId}.png`;
        const filePath = path.join(imageDir, fileName);
        
        fs.writeFileSync(filePath, base64Image, 'base64');
        
        console.log(`💾 이미지 저장 완료: ${fileName}`);
        return `image/${fileName}`;
        
    } catch (error) {
        console.error('❌ 이미지 저장 실패:', error);
        return null;
    }
}

// HTTP 엔드포인트들
app.get('/', (req, res) => {
    res.send(`
        <h1>🌟 별자리 실시간 공유 서버</h1>
        <p>WebSocket 서버가 포트 ${PORT}에서 실행 중입니다.</p>
        <p>연결된 우주: <strong>${connectedClients.size}개</strong></p>
        <ul>
            <li><a href="/test-sender.html">🧪 테스트용 별자리 송신기</a></li>
            <li><a href="/index.html">🌌 3D 우주 (수신기)</a></li>
            <li><a href="/test-generator.html">🤖 AI 생성기 테스트</a></li>
        </ul>
        <hr>
        <h3>📡 사용 방법:</h3>
        <ol>
            <li>별자리 생성기에서 WebSocket으로 데이터 전송</li>
            <li>서버가 AI로 별명/설명 생성</li>
            <li>모든 3D 우주에 실시간 브로드캐스트</li>
        </ol>
    `);
});

// 서버 상태 확인 API
app.get('/status', (req, res) => {
    res.json({
        server: 'running',
        connections: connectedClients.size,
        nextStarId: starCounter,
        uptime: process.uptime()
    });
});

// 서버 시작
server.listen(PORT, () => {
    console.log(`
🚀 별자리 서버가 포트 ${PORT}에서 실행 중입니다!
🌐 브라우저에서 http://localhost:${PORT} 접속하세요.

📡 WebSocket 엔드포인트: ws://localhost:${PORT}
🎭 이벤트:
   - create-constellation: 새 별자리 생성 요청
   - new-star-added: 모든 우주에 새 별 브로드캐스트
   - constellation-created: 생성 완료 응답

🌟 준비 완료! 별자리를 우주로 보내보세요!
    `);
});