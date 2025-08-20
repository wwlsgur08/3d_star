// 손 추적 기능
class HandTrackingManager {
    constructor() {
        this.hands = null;
        this.camera = null;
        this.videoElement = null;
        this.canvasElement = null;
        this.canvasCtx = null;
        
        // 제스처 상태
        this.currentGesture = 'IDLE';
        this.handLandmarks = null;
        this.gestureHistory = [];
        
        // 3D 카메라 컨트롤 참조
        this.orbitControls = null;
        
        // 새로운 제스처 인식 변수들
        this.lastHandPosition = { x: 0, y: 0 };
        this.lastPinchDistance = 0;
        this.cursorPosition = { x: 0.5, y: 0.5 };
        
        // 더블 클릭 감지
        this.lastTapTime = 0;
        this.tapCount = 0;
        this.tapTimeout = null;
        
        // 제스처 상태
        this.isPointing = false;
        this.isPinching = false;
        this.isHandOpen = false;
        
        this.init();
    }
    
    async init() {
        console.log('🤚 Hand Tracking Manager 초기화 시작');
        
        // MediaPipe 라이브러리 상태 확인
        console.log('🔍 MediaPipe 라이브러리 상태 확인...');
        console.log('- window.Hands:', !!window.Hands);
        console.log('- window.Camera:', !!window.Camera);
        console.log('- window.drawConnectors:', !!window.drawConnectors);
        console.log('- window.drawLandmarks:', !!window.drawLandmarks);
        
        // UI 요소들 가져오기
        this.videoElement = document.getElementById('webcam-video');
        this.canvasElement = document.getElementById('hand-overlay');
        
        if (!this.videoElement || !this.canvasElement) {
            console.error('❌ UI 요소를 찾을 수 없습니다');
            return;
        }
        
        console.log('✅ UI 요소 확인 완료');
        console.log('- 비디오 요소:', this.videoElement);
        console.log('- 캔버스 요소:', this.canvasElement);
        
        this.canvasCtx = this.canvasElement.getContext('2d');
        
        // 캔버스 크기 설정
        this.canvasElement.width = 160;
        this.canvasElement.height = 120;
        console.log('✅ 캔버스 크기 설정 완료: 160x120');
        
        // 단계별 초기화
        console.log('1️⃣ 카메라 설정 중...');
        await this.setupCamera();
        
        console.log('2️⃣ MediaPipe 설정 중...');  
        await this.setupMediaPipe();
        
        console.log('3️⃣ 카메라 시작 중...');
        await this.startCamera();
        
        console.log('✅ Hand Tracking Manager 초기화 완료');
    }
    
    async setupCamera() {
        try {
            console.log('📹 카메라 권한 요청 중...');
            
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    facingMode: 'user'
                },
                audio: false
            });
            
            this.videoElement.srcObject = stream;
            this.updateStatus('camera-status', 'ON', 'active');
            document.getElementById('hand-tracking-container').classList.add('active');
            
            console.log('✅ 카메라 스트림 연결 완료');
            
            // 비디오가 완전히 로드될 때까지 대기
            return new Promise((resolve) => {
                this.videoElement.addEventListener('loadeddata', () => {
                    console.log('📹 비디오 스트림 준비 완료');
                    console.log('📏 비디오 크기:', this.videoElement.videoWidth, 'x', this.videoElement.videoHeight);
                    resolve();
                });
            });
            
        } catch (error) {
            console.error('❌ 카메라 접근 실패:', error);
            this.updateStatus('camera-status', 'DENIED');
            alert('웹캠 권한이 필요합니다. 브라우저 설정에서 카메라 권한을 허용해주세요.');
        }
    }
    
    async setupMediaPipe() {
        try {
            console.log('📡 MediaPipe 초기화 시작...');
            
            // MediaPipe 라이브러리 로딩 대기 (최대 10초)
            let attempts = 0;
            while ((!window.Hands || !window.Camera) && attempts < 20) {
                console.log(`⏳ MediaPipe 라이브러리 로딩 대기 중... (${attempts + 1}/20)`);
                await new Promise(resolve => setTimeout(resolve, 500));
                attempts++;
            }
            
            if (!window.Hands || !window.Camera) {
                console.error('❌ MediaPipe 라이브러리 로딩 실패');
                this.updateStatus('camera-status', 'LIBRARY_ERROR');
                // 대체 방법: 간단한 웹캠 스트림만 표시
                this.fallbackMode();
                return;
            }
            
            console.log('✅ MediaPipe 라이브러리 로드 완료');
            
            // MediaPipe Hands 초기화
            this.hands = new window.Hands({
                locateFile: (file) => {
                    // CDN 대신 여러 소스 시도
                    const sources = [
                        `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
                        `https://unpkg.com/@mediapipe/hands/${file}`
                    ];
                    return sources[0]; // 첫 번째 소스 사용
                }
            });
            
            this.hands.setOptions({
                maxNumHands: 2,
                modelComplexity: 0, // 0으로 낮춤 (더 빠름)
                minDetectionConfidence: 0.3, // 더 감도 낮춤
                minTrackingConfidence: 0.2,  // 더 감도 낮춤
            });
            
            this.hands.onResults(this.onResults.bind(this));
            console.log('✅ MediaPipe Hands 설정 완료');
            
            // MediaPipe 카메라 객체 생성 (아직 시작하지 않음)
            console.log('📷 MediaPipe 카메라 객체 생성 중...');
            this.camera = new window.Camera(this.videoElement, {
                onFrame: async () => {
                    try {
                        // 프레임 전송 로그는 너무 자주 나오므로 1%로 제한
                        if (Math.random() < 0.01) {
                            console.log('🎬 프레임 전송 중...', {
                                hasHands: !!this.hands,
                                videoReady: this.videoElement.readyState,
                                videoWidth: this.videoElement.videoWidth,
                                videoHeight: this.videoElement.videoHeight
                            });
                        }
                        
                        if (this.hands && this.videoElement.readyState === 4) {
                            await this.hands.send({ image: this.videoElement });
                            // 프레임 전송 완료 로그도 1%로 제한
                            if (Math.random() < 0.01) {
                                console.log('✅ 프레임 전송 완료');
                            }
                        }
                    } catch (error) {
                        console.error('❌ 프레임 처리 오류:', error);
                    }
                },
                width: 640,
                height: 480
            });
            
            console.log('✅ MediaPipe 카메라 객체 생성 완료 (아직 시작되지 않음)');
            
        } catch (error) {
            console.error('❌ MediaPipe 설정 실패:', error);
            this.updateStatus('camera-status', 'ERROR');
            this.fallbackMode();
        }
    }
    
    // 카메라 시작 함수
    async startCamera() {
        if (!this.camera) {
            console.error('❌ 카메라 객체가 없습니다!');
            return;
        }
        
        console.log('▶️ MediaPipe 카메라 시작 시도...');
        try {
            await this.camera.start();
            console.log('✅ MediaPipe 카메라 시작 성공!');
            
            // 3초 후 강제 테스트
            setTimeout(() => {
                console.log('🔄 강제 테스트 프레임 전송...');
                if (this.hands && this.videoElement.readyState === 4) {
                    this.hands.send({image: this.videoElement})
                        .then(() => console.log('✅ 강제 프레임 전송 성공'))
                        .catch(err => console.error('❌ 강제 프레임 전송 실패:', err));
                }
            }, 3000);
            
        } catch (error) {
            console.error('❌ MediaPipe 카메라 시작 실패:', error);
        }
    }
    
    // 대체 모드: MediaPipe 없이 웹캠만 표시
    fallbackMode() {
        console.log('🔄 대체 모드 활성화 - 웹캠만 표시');
        this.updateStatus('hands-status', 'DISABLED');
        this.setGesture('FALLBACK');
    }
    
    onResults(results) {
        // 프레임 처리 로그 (더 자주 확인)
        if (Math.random() < 0.1) { // 10% 확률로 로그
            console.log('📡 MediaPipe 프레임 처리 중...', {
                hasResults: !!results,
                hasMultiHandLandmarks: !!results.multiHandLandmarks,
                handCount: results.multiHandLandmarks ? results.multiHandLandmarks.length : 0
            });
        }
        
        // 캔버스 초기화
        this.canvasCtx.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);
        
        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            // 처음 손이 감지되면 로그
            if (this.handLandmarks === null) {
                console.log('👋 손 감지됨!', results.multiHandLandmarks.length, '개');
            }
            
            this.handLandmarks = results.multiHandLandmarks;
            this.updateStatus('hands-status', `${results.multiHandLandmarks.length}`, 'active');
            
            // 손 랜드마크 그리기
            this.drawHands(results);
            
            // 제스처 인식
            this.recognizeGestures(results);
            
        } else {
            // 손이 사라지면 로그
            if (this.handLandmarks !== null) {
                console.log('👋 손 감지 종료');
            }
            
            this.handLandmarks = null;
            this.updateStatus('hands-status', 'NONE');
            this.setGesture('IDLE');
        }
    }
    
    drawHands(results) {
        const ctx = this.canvasCtx;
        
        for (const landmarks of results.multiHandLandmarks) {
            // 손가락 관절 그리기
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            for (const landmark of landmarks) {
                const x = landmark.x * this.canvasElement.width;
                const y = landmark.y * this.canvasElement.height;
                ctx.beginPath();
                ctx.arc(x, y, 3, 0, 2 * Math.PI);
                ctx.fill();
            }
            
            // 손가락 연결선 그리기
            ctx.strokeStyle = 'rgba(76, 175, 80, 0.6)';
            ctx.lineWidth = 1;
            this.drawConnections(ctx, landmarks);
        }
    }
    
    drawConnections(ctx, landmarks) {
        // MediaPipe Hands의 연결점 정보
        const connections = [
            [0, 1], [1, 2], [2, 3], [3, 4], // 엄지
            [0, 5], [5, 6], [6, 7], [7, 8], // 검지
            [0, 9], [9, 10], [10, 11], [11, 12], // 중지
            [0, 13], [13, 14], [14, 15], [15, 16], // 약지
            [0, 17], [17, 18], [18, 19], [19, 20], // 새끼
            [5, 9], [9, 13], [13, 17] // 손가락 베이스 연결
        ];
        
        for (const [start, end] of connections) {
            const startPoint = landmarks[start];
            const endPoint = landmarks[end];
            
            ctx.beginPath();
            ctx.moveTo(startPoint.x * this.canvasElement.width, startPoint.y * this.canvasElement.height);
            ctx.lineTo(endPoint.x * this.canvasElement.width, endPoint.y * this.canvasElement.height);
            ctx.stroke();
        }
    }
    
    recognizeGestures(results) {
        const hands = results.multiHandLandmarks;
        
        if (hands.length >= 1) {
            // 첫 번째 손만 사용해서 스와이프 회전
            this.analyzeSingleHand(hands[0]);
        } else {
            this.setGesture('IDLE');
        }
    }
    
    analyzeSingleHand(hand) {
        // 검지 끝점 (손 중심으로 사용)
        const indexTip = hand[8];
        
        // 스와이프 회전 (항상 활성화)
        this.handleSwipeGesture(indexTip);
    }
    
    // 스와이프 회전만 남김
    
    // 손 스와이프 회전 (유일한 기능)
    handleSwipeGesture(handPosition) {
        if (!this.orbitControls) {
            console.warn('OrbitControls가 없습니다!');
            return;
        }
        
        const deltaX = (handPosition.x - this.lastHandPosition.x) * 8; // 감도 더 높임
        const deltaY = (handPosition.y - this.lastHandPosition.y) * 8;
        
        // 디버깅 로그 (가끔씩만)
        if (Math.random() < 0.01) {
            console.log('🤚 손 위치:', {
                x: handPosition.x.toFixed(3),
                y: handPosition.y.toFixed(3),
                deltaX: deltaX.toFixed(3),
                deltaY: deltaY.toFixed(3)
            });
        }
        
        // 움직임이 있을 때만 회전
        if (Math.abs(deltaX) > 0.001 || Math.abs(deltaY) > 0.001) {
            this.orbitControls.azimuthalAngle -= deltaX; // 좌우 회전
            this.orbitControls.polarAngle += deltaY;     // 상하 회전
            
            // 상하 각도 제한
            this.orbitControls.polarAngle = Math.max(0.1, Math.min(Math.PI - 0.1, this.orbitControls.polarAngle));
            
            this.orbitControls.update();
            this.setGesture('ROTATE');
        } else {
            this.setGesture('HAND');
        }
        
        this.lastHandPosition = { x: handPosition.x, y: handPosition.y };
    }
    
    handleZoomGesture(distanceChange) {
        if (!this.orbitControls) return;
        
        const zoomFactor = distanceChange * 0.1; // 줌 감도 조정
        
        try {
            // Three.js 카메라 위치를 직접 조정
            const camera = this.orbitControls.object;
            const target = this.orbitControls.target;
            
            // 카메라에서 타겟으로의 방향벡터
            const direction = camera.position.clone().sub(target).normalize();
            const currentDistance = camera.position.distanceTo(target);
            
            // 새로운 거리 계산
            const newDistance = Math.max(0.5, Math.min(10, currentDistance + zoomFactor));
            
            // 카메라 위치 업데이트
            camera.position.copy(target).add(direction.multiplyScalar(newDistance));
            
            this.orbitControls.update();
            
        } catch (error) {
            console.warn('줌 제스처 처리 중 오류:', error);
        }
    }
    
    isFingerExtended(hand, tipIndex) {
        const tip = hand[tipIndex];
        const pip = hand[tipIndex - 2];
        return tip.y < pip.y; // 끝점이 관절보다 위에 있으면 펴진 것
    }
    
    calculateDistance(point1, point2) {
        const dx = point1.x - point2.x;
        const dy = point1.y - point2.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    setGesture(gesture) {
        if (this.currentGesture !== gesture) {
            this.currentGesture = gesture;
            this.updateStatus('gesture-status', gesture, 'gesture');
            
            // 제스처 히스토리 추가
            this.gestureHistory.push({
                gesture,
                timestamp: Date.now()
            });
            
            // 히스토리는 최대 10개만 유지
            if (this.gestureHistory.length > 10) {
                this.gestureHistory.shift();
            }
        }
    }
    
    // 화면에 커서 표시
    showCursor(position) {
        const canvas = this.canvasElement;
        const ctx = this.canvasCtx;
        
        // 커서 위치 계산 (정규화된 좌표를 캔버스 좌표로 변환)
        const x = position.x * canvas.width;
        const y = position.y * canvas.height;
        
        // 동그란 커서 그리기
        ctx.fillStyle = 'rgba(0, 255, 100, 0.8)';
        ctx.strokeStyle = 'rgba(0, 255, 100, 1)';
        ctx.lineWidth = 2;
        
        ctx.beginPath();
        ctx.arc(x, y, 8, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
        
        // 중심점
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, 2 * Math.PI);
        ctx.fill();
    }
    
    // 더블 탭 감지
    detectDoubleTap() {
        const now = Date.now();
        
        if (this.tapTimeout) {
            clearTimeout(this.tapTimeout);
            this.tapTimeout = null;
        }
        
        if (now - this.lastTapTime < 500) { // 500ms 내 두 번째 탭
            this.tapCount++;
            if (this.tapCount >= 2) {
                this.handleDoubleClick();
                this.tapCount = 0;
                this.lastTapTime = 0;
                return;
            }
        } else {
            this.tapCount = 1;
        }
        
        this.lastTapTime = now;
        
        // 500ms 후 탭 카운트 리셋
        this.tapTimeout = setTimeout(() => {
            this.tapCount = 0;
            this.tapTimeout = null;
        }, 500);
    }
    
    // 더블 클릭 처리
    handleDoubleClick() {
        console.log('👆👆 더블클릭 감지!', this.cursorPosition);
        this.setGesture('DOUBLE_CLICK');
        
        // Three.js 화면에서 클릭된 별 찾기 (기존 코드 활용)
        this.performStarClick();
        
        // 1초 후 제스처 리셋
        setTimeout(() => {
            if (this.currentGesture === 'DOUBLE_CLICK') {
                this.setGesture('POINT');
            }
        }, 1000);
    }
    
    // 별 클릭 수행 (기존 별자리 앱의 클릭 이벤트 활용)
    performStarClick() {
        // 정규화된 좌표를 화면 좌표로 변환
        const screenX = this.cursorPosition.x * window.innerWidth;
        const screenY = this.cursorPosition.y * window.innerHeight;
        
        // 마우스 클릭 이벤트 시뮬레이션
        const clickEvent = new MouseEvent('dblclick', {
            clientX: screenX,
            clientY: screenY,
            bubbles: true
        });
        
        document.dispatchEvent(clickEvent);
        console.log('🌟 별 클릭 시뮬레이션:', screenX, screenY);
    }
    
    updateStatus(elementId, value, className = '') {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = value;
            element.className = `status-value ${className}`;
        }
    }
    
    // 3D 컨트롤과 연동
    setOrbitControls(controls) {
        this.orbitControls = controls;
        console.log('🔗 OrbitControls와 연동 완료');
    }
    
    // 손 추적 중단
    stop() {
        if (this.camera) {
            this.camera.stop();
        }
        
        if (this.videoElement && this.videoElement.srcObject) {
            this.videoElement.srcObject.getTracks().forEach(track => track.stop());
        }
        
        this.updateStatus('camera-status', 'OFF');
        this.updateStatus('hands-status', 'NONE');
        this.setGesture('IDLE');
        
        document.getElementById('hand-tracking-container').classList.remove('active');
    }
}

// 전역으로 내보내기
window.HandTrackingManager = HandTrackingManager;