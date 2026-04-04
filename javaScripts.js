let totalCount = 0;
let targetPrefix = null;

const errorSound = new Audio('false.mp3');
const successSound = new Audio('true.mp3');
const barcodeInput = document.getElementById('barcode-input');

// 1. 항상 입력창에 포커스 유지
document.addEventListener('click', () => barcodeInput.focus());
setInterval(() => {
    if (document.activeElement !== barcodeInput) barcodeInput.focus();
}, 1000);

// 2. 바코드 스캔 감지
barcodeInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        const rawData = barcodeInput.value.trim();
        if (rawData) processBarcode(rawData);
        barcodeInput.value = '';
    }
});

function processBarcode(barcode) {
    const currentPrefix = barcode.slice(0, -1);
    const unitCount = parseInt(barcode.slice(-1));

    if (isNaN(unitCount) || unitCount < 1 || unitCount > 4) {
        handleError("잘못된 수량 규칙");
        return;
    }

    if (!targetPrefix) {
        targetPrefix = currentPrefix;
        document.getElementById('target-text').innerText = targetPrefix;
        handleSuccess(unitCount, barcode);
    } else if (currentPrefix === targetPrefix) {
        handleSuccess(unitCount, barcode);
    } else {
        handleError("다른 품목 감지!");
    }
}

// 핵심: PC 서버로 데이터 전송
function sendToPC(prefix, count) {
    const pcIP = "192.168.219.105"; // ★ 실제 PC IP로 수정 필수
    fetch(`http://${pcIP}:3000`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: prefix, count: count })
    }).catch(err => console.log("PC 연결 실패"));
}

function handleSuccess(amount, code) {
    successSound.currentTime = 0;
    successSound.play().catch(() => {});
    if (navigator.vibrate) navigator.vibrate(50);

    totalCount += amount;
    document.getElementById('count-view').innerText = totalCount;
    
    document.getElementById('scan-status-bar').innerText = "OK: " + code;
    document.getElementById('scan-status-bar').className = "detected";
    
    // PC로 데이터 전송
    sendToPC(targetPrefix, amount);
}

function handleError(msg) {
    errorSound.currentTime = 0;
    errorSound.play().catch(() => {});
    const card = document.getElementById("display-card");
    card.classList.add("error-bg");
    setTimeout(() => card.classList.remove("error-bg"), 500);
}

document.getElementById("reset-btn").onclick = () => {
    if (confirm("초기화할까요?")) {
        totalCount = 0;
        targetPrefix = null;
        document.getElementById("count-view").innerText = "0";
        document.getElementById("target-text").innerText = "-";
    }
};