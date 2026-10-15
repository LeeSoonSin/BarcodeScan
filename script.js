const customers = ["원익홀딩스", "케이씨", "퓨처스", "에드워드", "포이스", "버슘한양기공", "그외"];
let scanList = [];

// ==========================================
// [오디오 객체 초기화 및 안전 재생 함수]
// ==========================================
const trueSound = new Audio('true.mp3');
const falseSound = new Audio('false.mp3');

function playSound(audioObj) {
    audioObj.currentTime = 0;
    audioObj.play().catch(err => {
        console.log("Audio play warning:", err);
    });
}

// ==========================================
// [Zebra PDA 스캐너 상태 관리 변수]
// ==========================================
let isLocked = false;         // 스캔 1회 완료 후 중복 입력 방지 락
let rearmTimer = null;        // 레이저 연속 누름 감지 및 재무장(Re-arm) 타이머
let autoSubmitTimer = null;   // Enter가 안 들어올 경우 대비 자동 제출 타이머
let globalBuffer = "";        // 포커스 누락 대비 글로벌 키 수집 버퍼

const REARM_DELAY_MS = 300;   // 스캔 재무장 대기시간 단축
const AUTO_SUBMIT_MS = 80;    // 자동 제출 판정 시간 최적화

window.onload = function() {
    initCustomerSelect();
    loadSavedData();
    initZebraScanner();
    ensureFocus();
};

function initCustomerSelect() {
    const select = document.getElementById("customerSelect");
    customers.forEach(cust => {
        let option = document.createElement("option");
        option.value = cust;
        option.text = cust;
        select.appendChild(option);
    });
}

// ==========================================
// [언제든지 스캔 가능하도록 포커스 및 글로벌 키 처리]
// ==========================================
function initZebraScanner() {
    const input = document.getElementById("barcodeInput");

    window.addEventListener("keydown", function(e) {
        const active = document.activeElement;

        if (active && (active.tagName === 'SELECT' || active.tagName === 'BUTTON')) {
            return;
        }

        if (active !== input) {
            input.focus();
        }

        if (e.key === "Enter") {
            e.preventDefault();
            clearTimeout(autoSubmitTimer);
            handleScanComplete();
            return;
        }

        if (e.key.length === 1 && !isLocked) {
            globalBuffer += e.key;
            resetRearmTimer();

            clearTimeout(autoSubmitTimer);
            autoSubmitTimer = setTimeout(() => {
                if (!isLocked && (input.value.trim() || globalBuffer.trim())) {
                    handleScanComplete();
                }
            }, AUTO_SUBMIT_MS);
        }
    });

    input.addEventListener("input", function() {
        if (isLocked) {
            input.value = "";
            return;
        }

        resetRearmTimer();

        clearTimeout(autoSubmitTimer);
        autoSubmitTimer = setTimeout(() => {
            if (!isLocked && input.value.trim().length > 0) {
                handleScanComplete();
            }
        }, AUTO_SUBMIT_MS);
    });

    input.addEventListener("blur", function() {
        setTimeout(() => {
            ensureFocus();
        }, 100);
    });

    document.addEventListener("touchstart", handleUserInteraction, { passive: true });
    document.addEventListener("click", handleUserInteraction);
}

function handleUserInteraction(e) {
    if (e && e.target && (e.target.tagName === 'SELECT' || e.target.tagName === 'BUTTON')) {
        return;
    }
    ensureFocus();
}

function ensureFocus() {
    const input = document.getElementById("barcodeInput");
    const active = document.activeElement;
    if (input && active.tagName !== 'SELECT' && active.tagName !== 'BUTTON') {
        input.focus();
    }
}

// 스캔 완료 처리
function handleScanComplete() {
    const input = document.getElementById("barcodeInput");
    const barcode = (input.value.trim() || globalBuffer.trim());

    if (isLocked || !barcode) {
        globalBuffer = "";
        if (input) input.value = "";
        return;
    }

    isLocked = true;

    // 중복 체크
    const isDuplicate = scanList.some(item => item.item_code === barcode);

    if (isDuplicate) {
        playSound(falseSound);
    } else {
        playSound(trueSound);

        const selectedCustomer = document.getElementById("customerSelect").value;
        const newItem = {
            no: scanList.length + 1,
            customer: selectedCustomer,
            item_code: barcode
        };

        scanList.push(newItem);
        saveData();
        
        // [성능 최적화] 전체 렌더링 대신 새 행만 추가하여 튕김 현상 방지
        appendRowToTable(newItem, scanList.length - 1);
    }

    input.value = "";
    globalBuffer = "";
    resetRearmTimer();
}

function resetRearmTimer() {
    clearTimeout(rearmTimer);
    rearmTimer = setTimeout(() => {
        isLocked = false;
        globalBuffer = "";
        ensureFocus();
    }, REARM_DELAY_MS);
}

function addBarcode() {
    handleScanComplete();
}

// ==========================================
// [데이터 저장 및 표 렌더링 최적화]
// ==========================================
function saveData() {
    localStorage.setItem("uniric_scan_list", JSON.stringify(scanList));
}

function loadSavedData() {
    const saved = localStorage.getItem("uniric_scan_list");
    if (saved) {
        try {
            scanList = JSON.parse(saved);
            renderTable(); // 최초 로드 시 전체 렌더링
        } catch(e) {
            console.error("저장된 데이터 로드 실패:", e);
        }
    }
}

// 전체 테이블 렌더링 (최초 로드, 삭제, 전체 비우기 시에만 수행)
function renderTable() {
    const tbody = document.getElementById("scanTableBody");
    if (!tbody) return;
    tbody.innerHTML = "";

    scanList.forEach((item, index) => {
        item.no = index + 1;
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${item.no}</td>
            <td>${item.customer}</td>
            <td>${item.item_code}</td>
            <td><button class="btn-delete" onclick="deleteItem(${index})">✕</button></td>
        `;
        tbody.appendChild(tr);
    });

    scrollToBottom();
}

// 단일 행 추가 함수 (일반 스캔 시 성능 극대화)
function appendRowToTable(item, index) {
    const tbody = document.getElementById("scanTableBody");
    if (!tbody) return;

    const tr = document.createElement("tr");
    tr.innerHTML = `
        <td>${item.no}</td>
        <td>${item.customer}</td>
        <td>${item.item_code}</td>
        <td><button class="btn-delete" onclick="deleteItem(${index})">✕</button></td>
    `;
    tbody.appendChild(tr);
    scrollToBottom();
}

function scrollToBottom() {
    const tableContainer = document.querySelector(".table-container");
    if (tableContainer) {
        tableContainer.scrollTop = tableContainer.scrollHeight;
    }
}

function deleteItem(index) {
    const item = scanList[index];
    if (confirm(`'${item.item_code}' 품목코드를 삭제하시겠습니까?`)) {
        scanList.splice(index, 1);
        saveData();
        renderTable(); // 삭제 시에는 인덱스 재정렬이 필요하므로 전체 렌더링 수행
    }
    ensureFocus();
}

function clearAllData() {
    if (scanList.length === 0) return;
    if (confirm("스캔 목록을 모두 삭제하시겠습니까?")) {
        scanList = [];
        saveData();
        renderTable();
    }
    ensureFocus();
}

function exportToExcel() {
    if (scanList.length === 0) {
        alert("저장할 데이터가 없습니다.");
        return;
    }

    fetch('/export-excel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: scanList })
    })
    .then(res => res.json())
    .then(data => {
        if (data.status === "success") {
            alert(`엑셀 파일이 성공적으로 저장되었습니다!\n경로: ${data.path}`);
        } else {
            alert(`저장 실패: ${data.message}`);
        }
    })
    .catch(err => {
        console.error(err);
        alert("서버와 통신 중 오류가 발생했습니다.");
    });
}