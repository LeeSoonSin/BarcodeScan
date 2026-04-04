let totalCount = 0;
let targetPrefix = null;
let undoStack = []; // 취소 기록 저장소 (최대 3개)
let lastScannedAmount = 0; // ★ 직전 수량을 기억하기 위한 변수 추가

const errorSound = new Audio('false.mp3');
const successSound = new Audio('true.mp3');
const barcodeInput = document.getElementById('barcode-input');

// 1. 초기화 버튼 옆에 취소 가능 횟수 표시 추가
const updateUndoUI = () => {
    const btn = document.getElementById("undo-btn");
    btn.innerHTML = `직전 취소 <span class="undo-count">(남은 횟수: ${undoStack.length})</span>`;
    btn.disabled = undoStack.length === 0;
    btn.style.filter = undoStack.length === 0 ? "grayscale(1)" : "none";
};



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
        handleError("수량 오류 (1-4)");
        return;
    }

    if (!targetPrefix || currentPrefix === targetPrefix) {
        if (!targetPrefix) {
            targetPrefix = currentPrefix;
            document.getElementById('target-text').innerText = targetPrefix;
        }
        handleSuccess(unitCount, barcode);
    } else {
        handleError("품목 불일치!");
    }
}

// 4. 성공 처리 (수량 기억 로직 추가)
function handleSuccess(amount, code) {
    successSound.currentTime = 0;
    successSound.play().catch(() => {});
    
    // 취소 기록 관리 (최대 3개 유지)
    undoStack.push(amount);
    if (undoStack.length > 3) undoStack.shift(); 
    updateUndoUI();

    totalCount += amount;
    document.getElementById('count-view').innerText = totalCount;
    document.getElementById('scan-status-bar').innerText = "OK: " + code;
    document.getElementById('scan-status-bar').className = "detected";
    
    sendToPC(targetPrefix, amount);
}

// 5. PC 전송 함수
function sendToPC(prefix, count) {
    const pcIP = "192.168.219.105"; // 본인 IPv4 주소로 수정
    fetch(`http://${pcIP}:3000`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: prefix, count: count })
    }).catch(err => console.log("서버 전송 실패"));
}

// 6. 직전 스캔 취소 버튼 로직 ★ 추가됨
document.getElementById("undo-btn").onclick = () => {
    if (undoStack.length === 0) return;

    const amountToCancel = undoStack.pop(); // 가장 최근 기록 꺼내기
    
    if (confirm(`방금 스캔한 ${amountToCancel}개를 취소할까요?`)) {
        totalCount -= amountToCancel;
        document.getElementById('count-view').innerText = totalCount;
        
        sendToPC(targetPrefix, -amountToCancel); // 서버에 마이너스 전송
        
        document.getElementById('scan-status-bar').innerText = "취소됨 (-" + amountToCancel + ")";
        document.getElementById('scan-status-bar').className = "";
        updateUndoUI();
    } else {
        undoStack.push(amountToCancel); // 취소 안하면 다시 넣기
    }
};

// 7. 전체 초기화 버튼
document.getElementById("reset-btn").onclick = () => {
    if (confirm("모든 데이터를 초기화할까요?")) {
        totalCount = 0;
        targetPrefix = null;
        undoStack = [];
        document.getElementById("count-view").innerText = "0";
        document.getElementById("target-text").innerText = "-";
        document.getElementById('scan-status-bar').innerText = "스캔 버튼을 눌러주세요";
        document.getElementById('scan-status-bar').className = "";
        updateUndoUI();
    }
};

function handleError(msg) {
    errorSound.currentTime = 0;
    errorSound.play().catch(() => {});
    document.getElementById('scan-status-bar').innerText = msg;
    document.getElementById('scan-status-bar').className = "error";
}