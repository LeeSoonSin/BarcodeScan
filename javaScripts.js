let totalCount = 0;
let targetPrefix = null;
let lastScannedAmount = 0; // ★ 직전 수량을 기억하기 위한 변수 추가

const errorSound = new Audio('false.mp3');
const successSound = new Audio('true.mp3');
const barcodeInput = document.getElementById('barcode-input');

// 1. 포커스 유지
document.addEventListener('click', () => barcodeInput.focus());
setInterval(() => { if (document.activeElement !== barcodeInput) barcodeInput.focus(); }, 1000);

// 2. 스캔 이벤트
barcodeInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        const rawData = barcodeInput.value.trim();
        if (rawData) processBarcode(rawData);
        barcodeInput.value = '';
    }
});

// 3. 바코드 처리
function processBarcode(barcode) {
    const currentPrefix = barcode.slice(0, -1);
    const unitCount = parseInt(barcode.slice(-1));

    if (isNaN(unitCount) || unitCount < 1 || unitCount > 4) {
        handleError("수량 오류 (끝자리 1-4)");
        return;
    }

    if (!targetPrefix) {
        targetPrefix = currentPrefix;
        document.getElementById('target-text').innerText = targetPrefix;
        handleSuccess(unitCount, barcode);
    } else if (currentPrefix === targetPrefix) {
        handleSuccess(unitCount, barcode);
    } else {
        handleError("품목 불일치!");
    }
}

// 4. 성공 처리 (수량 기억 로직 추가)
function handleSuccess(amount, code) {
    successSound.currentTime = 0;
    successSound.play().catch(() => {});
    if (navigator.vibrate) navigator.vibrate(50);

    lastScannedAmount = amount; // ★ 이번에 더한 수량을 저장해둠
    totalCount += amount;
    
    document.getElementById('count-view').innerText = totalCount;
    document.getElementById('scan-status-bar').innerText = "OK: " + code;
    document.getElementById('scan-status-bar').className = "detected";
    
    sendToPC(targetPrefix, amount);
}

// 5. PC 전송 함수
function sendToPC(prefix, count) {
    const pcIP = "192.168.0.10"; // 본인 PC IP로 수정
    fetch(`http://${pcIP}:3000`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: prefix, count: count })
    }).catch(err => console.log("전송 실패"));
}

// 6. 직전 스캔 취소 버튼 로직 ★ 추가됨
document.getElementById("undo-btn").onclick = () => {
    if (lastScannedAmount === 0) {
        alert("취소할 수 있는 직전 기록이 없거나 이미 취소되었습니다.");
        return;
    }

    if (confirm(`방금 스캔한 ${lastScannedAmount}개를 취소할까요?`)) {
        totalCount -= lastScannedAmount; // 수량 차감
        document.getElementById('count-view').innerText = totalCount;
        
        // 서버에 마이너스 값을 보내서 엑셀 합계도 줄임
        sendToPC(targetPrefix, -lastScannedAmount); 
        
        document.getElementById('scan-status-bar').innerText = "취소됨 (-" + lastScannedAmount + ")";
        document.getElementById('scan-status-bar').className = "";
        
        lastScannedAmount = 0; // 연속 취소 방지
    }
};

// 7. 전체 초기화 버튼
document.getElementById("reset-btn").onclick = () => {
    if (confirm("모든 데이터를 초기화할까요?")) {
        totalCount = 0;
        targetPrefix = null;
        lastScannedAmount = 0;
        document.getElementById("count-view").innerText = "0";
        document.getElementById("target-text").innerText = "-";
        document.getElementById('scan-status-bar').innerText = "스캔 버튼을 눌러주세요";
        document.getElementById('scan-status-bar').className = "";
    }
};

function handleError(msg) {
    errorSound.currentTime = 0;
    errorSound.play().catch(() => {});
    document.getElementById('scan-status-bar').innerText = msg;
    document.getElementById('scan-status-bar').className = "error";
}