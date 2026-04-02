// 1. 오디오 객체 생성 (파일 경로 지정)
const errorSound = new Audio('false.mp3');

let targetBarcode = null;
let count = 0;

function onScanSuccess(decodedText) {
    if (!targetBarcode) {
        // 기준 설정
        targetBarcode = decodedText;
        document.getElementById('target-text').innerText = targetBarcode;
        count = 1;
        if(navigator.vibrate) navigator.vibrate(100);
    } else {
        if (decodedText === targetBarcode) {
            // 일치할 때
            count++;
            if(navigator.vibrate) navigator.vibrate(50);
        } else {
            // 일치하지 않을 때: 소리 재생 + 진동 + 시각 효과
            playErrorSound(); 
            if(navigator.vibrate) navigator.vibrate([200, 100, 200]);
            triggerVisualError();
        }
    }
    document.getElementById('count-view').innerText = count;
}

// 소리 재생 함수
function playErrorSound() {
    errorSound.pause();        // 재생 중일 수 있으므로 멈춤
    errorSound.currentTime = 0; // 처음으로 되돌림
    errorSound.play().catch(e => {
        console.log("소리 재생 실패:", e);
        // 브라우저 정책상 사용자의 첫 클릭이 있어야 소리가 날 수 있습니다.
    });
}

function triggerVisualError() {
    const card = document.getElementById('display-card');
    card.classList.add('error-bg');
    setTimeout(() => card.classList.remove('error-bg'), 500);
}