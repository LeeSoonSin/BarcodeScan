let totalCount = 0;
let targetPrefix = null;
let undoStack = []; 
let localInventory = {}; 

const errorSound = new Audio('false.mp3');
const successSound = new Audio('true.mp3');
const barcodeInput = document.getElementById('barcode-input');

// 1. UI 업데이트 함수
const updateUndoUI = () => {
    const btn = document.getElementById("undo-btn");
    if (btn) {
        btn.innerHTML = `직전 취소 <span class="undo-count">(남은 횟수: ${undoStack.length})</span>`;
        btn.disabled = undoStack.length === 0;
        btn.style.filter = undoStack.length === 0 ? "grayscale(1)" : "none";
    }
};

// 2. 포커스 유지 (DataWedge 값이 여기로 들어옵니다)
document.addEventListener('click', () => barcodeInput.focus());
setInterval(() => { 
    if (document.activeElement !== barcodeInput) {
        barcodeInput.focus();
    }
}, 500); // 0.5초마다 더 강력하게 체크

// 3. 스캔 이벤트 (엔터키 감지 개선)
barcodeInput.addEventListener('keydown', (e) => {
    // e.key === 'Enter' 혹은 키코드 13번 대응
    if (e.key === 'Enter' || e.keyCode === 13) {
        const rawData = barcodeInput.value.trim();
        if (rawData) {
            processBarcode(rawData);
        }
        barcodeInput.value = '';
        e.preventDefault(); // 엔터키로 인한 폼 제출 방지
    }
});

// 4. 바코드 처리 핵심 로직 (수량 기능 제거됨)
function processBarcode(barcode) {
    // 이제 마지막 글자를 자르지 않고 전체를 ID로 사용합니다.
    const currentID = barcode; 
    const unitCount = 1; // 스캔 1번에 무조건 1개

    // 처음 스캔하거나, 기존 품목과 같을 때만 허용
    if (!targetPrefix || currentID === targetPrefix) {
        if (!targetPrefix) {
            targetPrefix = currentID;
            document.getElementById('target-text').innerText = targetPrefix;
        }
        handleSuccess(unitCount, currentID);
    } else {
        handleError("품목 불일치!");
    }
}

// 5. 성공 처리
function handleSuccess(amount, code) {
    successSound.currentTime = 0;
    successSound.play().catch(() => {});
    if (navigator.vibrate) navigator.vibrate(50);

    // 취소 기록 저장
    undoStack.push({ id: targetPrefix, amount: amount });
    if (undoStack.length > 3) undoStack.shift(); 
    updateUndoUI();

    // 수량 합산
    totalCount += amount;
    localInventory[targetPrefix] = (localInventory[targetPrefix] || 0) + amount;

    document.getElementById('count-view').innerText = totalCount;
    document.getElementById('scan-status-bar').innerText = "OK: " + code;
    document.getElementById('scan-status-bar').className = "detected";
    
    sendToPC(targetPrefix, amount);
}

// 6. PC 전송 함수
function sendToPC(prefix, count) {
    const pcIP = "192.168.0.10"; // ★ 본인의 IPv4 주소로 수정 필수
    fetch(`http://${pcIP}:3000`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: prefix, count: count })
    }).catch(err => console.error("서버 전송 실패:", err));
}

// 7. 직전 스캔 취소 버튼
document.getElementById("undo-btn").onclick = () => {
    if (undoStack.length === 0) return;

    const lastAction = undoStack.pop(); 
    const amountToCancel = lastAction.amount;
    const itemId = lastAction.id;
    
    // 수량이 항상 1이므로 메시지를 단순화했습니다.
    if (confirm(`방금 스캔한 항목(${itemId})을 취소할까요?`)) {
        totalCount -= amountToCancel;
        localInventory[itemId] -= amountToCancel;
        
        if (localInventory[itemId] <= 0) delete localInventory[itemId];

        document.getElementById('count-view').innerText = totalCount;
        sendToPC(itemId, -amountToCancel); 
        
        document.getElementById('scan-status-bar').innerText = "취소됨";
        document.getElementById('scan-status-bar').className = "";
        updateUndoUI();
    } else {
        undoStack.push(lastAction); 
    }
};

// 8. 현황 보기/닫기/초기화 (기존과 동일)
document.getElementById("view-status-btn").onclick = () => {
    const body = document.getElementById("inventory-body");
    body.innerHTML = ""; 

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

document.getElementById("close-modal").onclick = () => {
    document.getElementById("status-modal").style.display = "none";
};

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