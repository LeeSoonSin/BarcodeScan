// 1. 오디오 객체 생성 (파일 경로 지정)
const errorSound = new Audio('false.mp3');

let targetBarcode = null;
let count = 0;
let isScanning = false; // 현재 스캔 처리 중인지 확인하는 변수
let totalCount = 0; // 누적 합계를 저장할 변수
let targetBarcodePrefix = null; // 기준 바코드(앞부분) 저장용 (선택 사항)

function onScanSuccess(decodedText) {
    if (isScanning) return;
    isScanning = true;

    // 1. 바코드의 마지막 한 글자를 가져와서 숫자로 변환 (1, 2, 3, 4 중 하나)
    const unitCount = parseInt(decodedText.slice(-1));

    // 숫자가 1~4 사이인지 확인 (유효성 검사)
    if (!isNaN(unitCount) && unitCount >= 1 && unitCount <= 4) {
        
        // 2. 누적 합계 계산 (+=)
        totalCount += unitCount;
        
        // 화면 업데이트
        document.getElementById('count-view').innerText = totalCount;
        
        // 첫 스캔이라면 기준 텍스트 표시 (참고용)
        if (!targetBarcodePrefix) {
            targetBarcodePrefix = decodedText;
            document.getElementById('target-text').innerText = "검수 시작됨";
        }

        // 성공 알림 (선택 사항: 진동)
        if(navigator.vibrate) navigator.vibrate(50);

    } else {
        // 1~4가 아니거나 숫자가 아닐 경우 에러 처리
        playErrorSound();
        triggerVisualError();
        alert("유효하지 않은 바코드입니다 (끝자리 1-4만 가능)");
    }

    // 3. 중복 스캔 방지를 위한 지연 시간 (1.5초)
    setTimeout(() => {
        isScanning = false;
    }, 1500);
}

// 초기화 버튼 클릭 시 누적 값도 0으로
document.getElementById('reset-btn').onclick = () => {
    totalCount = 0;
    targetBarcodePrefix = null;
    document.getElementById('target-text').innerText = "스캔 대기 중";
    document.getElementById('count-view').innerText = "0";
    alert("모든 데이터가 초기화되었습니다.");
};

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