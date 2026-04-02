// 상태 변수
let totalCount = 0;
let targetPrefix = null; 
let currentDetectedBarcode = null;

// 효과음 설정
const errorSound = new Audio('false.mp3');
const successSound = new Audio('true.mp3');

/**
 * 1. 실시간 인식 (카메라 피드백)
 */
function onScanSuccess(decodedText) {
    currentDetectedBarcode = decodedText;
    const statusBar = document.getElementById('scan-status-bar');
    statusBar.innerText = "인식됨: " + decodedText;
    statusBar.classList.add('detected');
}

/**
 * 2. 스캔 버튼 클릭 (검수 및 합산)
 */
document.getElementById('scan-trigger-btn').onclick = () => {
    if (!currentDetectedBarcode) {
        alert("바코드를 먼저 인식시켜주세요!");
        return;
    }

    // 바코드 분리: 앞부분(ID), 뒷자리(수량)
    const currentPrefix = currentDetectedBarcode.slice(0, -1);
    const unitCount = parseInt(currentDetectedBarcode.slice(-1));

    // 유효성 검사 (뒷자리 1~4)
    if (isNaN(unitCount) || unitCount < 1 || unitCount > 4) {
        handleError("잘못된 수량입니다 (끝자리 1-4만 가능)");
        return;
    }

    // 품목 비교 로직
    if (!targetPrefix) {
        // 첫 스캔인 경우 기준 설정
        targetPrefix = currentPrefix;
        document.getElementById('target-text').innerText = targetPrefix;
        handleSuccess(unitCount);
    } else {
        // 기존 기준과 일치하는지 확인
        if (currentPrefix === targetPrefix) {
            handleSuccess(unitCount);
        } else {
            handleError("다른 품목입니다! 기준: " + targetPrefix);
        }
    }
};

// 성공 시 실행
function handleSuccess(amount) {
    successSound.currentTime = 0;
    successSound.play().catch(e => console.log("재생 오류:", e));
    
    if (navigator.vibrate) navigator.vibrate(50);

    totalCount += amount;
    document.getElementById('count-view').innerText = totalCount;
    
    // 다음 스캔을 위해 초기화
    resetStatusBar();
}

// 에러 시 실행
function handleError(msg) {
    errorSound.currentTime = 0;
    errorSound.play().catch(e => console.log("재생 오류:", e));
    
    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);

    const card = document.getElementById("display-card");
    card.classList.add("error-bg");
    setTimeout(() => card.classList.remove("error-bg"), 500);
    
    alert(msg);
    resetStatusBar();
}

// 상태표시줄 초기화
function resetStatusBar() {
    currentDetectedBarcode = null;
    const statusBar = document.getElementById('scan-status-bar');
    statusBar.innerText = "바코드를 비춰주세요...";
    statusBar.classList.remove('detected');
}

// 초기화 버튼
document.getElementById("reset-btn").onclick = () => {
    if (confirm("기준 품목과 누적 수량을 모두 초기화할까요?")) {
        totalCount = 0;
        targetPrefix = null;
        document.getElementById("count-view").innerText = "0";
        document.getElementById("target-text").innerText = "-";
        resetStatusBar();
    }
};

/**
 * 3. 스캐너 초기화 (1D 바코드 최적화)
 */
const html5QrcodeScanner = new Html5QrcodeScanner("reader", {
    fps: 30,
    qrbox: { width: 350, height: 150 },
    aspectRatio: 1.777778
});
html5QrcodeScanner.render(onScanSuccess);