let totalCount = 0;
let targetPrefix = null;
let undoStack = []; // 취소 기록 저장소 (최대 3개)
let localInventory = {}; // ★ 품목별 수량을 저장할 객체

const errorSound = new Audio('false.mp3');
const successSound = new Audio('true.mp3');
const barcodeInput = document.getElementById('barcode-input');

// 1. UI 업데이트 함수 (취소 버튼 상태 및 횟수 표시)
const updateUndoUI = () => {
    const btn = document.getElementById("undo-btn");
    if (btn) {
        btn.innerHTML = `직전 취소 <span class="undo-count">(남은 횟수: ${undoStack.length})</span>`;
        btn.disabled = undoStack.length === 0;
        btn.style.filter = undoStack.length === 0 ? "grayscale(1)" : "none";
    }
};

// 2. 포커스 유지 로직
document.addEventListener('click', () => barcodeInput.focus());
setInterval(() => { if (document.activeElement !== barcodeInput) barcodeInput.focus(); }, 1000);

// 3. 스캔 이벤트 (엔터키 감지)
barcodeInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        const rawData = barcodeInput.value.trim();
        if (rawData) processBarcode(rawData);
        barcodeInput.value = '';
    }
});

// 4. 바코드 처리 핵심 로직
function processBarcode(barcode) {
    const currentPrefix = barcode.slice(0, -1); // 품목ID (마지막 글자 제외)
    const unitCount = parseInt(barcode.slice(-1)); // 수량 (마지막 글자)

    if (isNaN(unitCount) || unitCount < 1 || unitCount > 4) {
        handleError("수량 오류 (1-4)");
        return;
    }

    // 처음 스캔하거나, 기존 품목과 같을 때만 허용
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

// 5. 성공 처리 (품목별 합산 및 서버 전송)
function handleSuccess(amount, code) {
    successSound.currentTime = 0;
    successSound.play().catch(() => {});
    if (navigator.vibrate) navigator.vibrate(50);

    // 취소 기록 저장 (최대 3개 유지)
    undoStack.push({ id: targetPrefix, amount: amount });
    if (undoStack.length > 3) undoStack.shift(); 
    updateUndoUI();

    // 전체 수량 및 품목별 수량 합산
    totalCount += amount;
    localInventory[targetPrefix] = (localInventory[targetPrefix] || 0) + amount;

    document.getElementById('count-view').innerText = totalCount;
    document.getElementById('scan-status-bar').innerText = "OK: " + code;
    document.getElementById('scan-status-bar').className = "detected";
    
    sendToPC(targetPrefix, amount);
}

// 6. PC 전송 함수 (Node.js 서버로 전송)
function sendToPC(prefix, count) {
    const pcIP = "192.168.0.10"; // ★ 실제 본인 PC의 IPv4 주소로 반드시 수정하세요!
    fetch(`http://${pcIP}:3000`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: prefix, count: count })
    }).catch(err => console.log("서버 전송 실패"));
}

// 7. 직전 스캔 취소 버튼 (최대 3회 가능)
document.getElementById("undo-btn").onclick = () => {
    if (undoStack.length === 0) return;

    const lastAction = undoStack.pop(); // 가장 최근 기록 꺼내기
    const amountToCancel = lastAction.amount;
    const itemId = lastAction.id;
    
    if (confirm(`방금 스캔한 ${amountToCancel}개를 취소할까요?`)) {
        totalCount -= amountToCancel;
        localInventory[itemId] -= amountToCancel;
        
        // 수량이 0이 되면 목록에서 삭제
        if (localInventory[itemId] <= 0) delete localInventory[itemId];

        document.getElementById('count-view').innerText = totalCount;
        sendToPC(itemId, -amountToCancel); // 서버에 마이너스 전송 (차감)
        
        document.getElementById('scan-status-bar').innerText = "취소됨 (-" + amountToCancel + ")";
        document.getElementById('scan-status-bar').className = "";
        updateUndoUI();
    } else {
        undoStack.push(lastAction); // 취소 안하면 다시 넣기
    }
};

// 8. [신규] 현황 보기 버튼 클릭 시 팝업창 띄우기
document.getElementById("view-status-btn").onclick = () => {
    const body = document.getElementById("inventory-body");
    body.innerHTML = ""; // 기존 내용 비우기

    if (Object.keys(localInventory).length === 0) {
        body.innerHTML = "<tr><td colspan='2'>데이터가 없습니다.</td></tr>";
    } else {
        for (const [id, count] of Object.entries(localInventory)) {
            const row = `<tr><td>${id}</td><td><b>${count}</b></td></tr>`;
            body.insertAdjacentHTML('beforeend', row);
        }
    }
    document.getElementById("status-modal").style.display = "flex";
};

// 9. 현황 팝업창 닫기
document.getElementById("close-modal").onclick = () => {
    document.getElementById("status-modal").style.display = "none";
};

// 10. 전체 초기화 버튼
document.getElementById("reset-btn").onclick = () => {
    if (confirm("모든 데이터를 초기화할까요?")) {
        totalCount = 0;
        targetPrefix = null;
        undoStack = [];
        localInventory = {};
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
    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
    document.getElementById('scan-status-bar').innerText = msg;
    document.getElementById('scan-status-bar').className = "error";
}