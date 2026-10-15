const customers = ["원익홀딩스", "케이씨", "퓨처스", "에드워드", "포이스", "버슘한양기공", "그외"];
let scanList = [];

// ==========================================
// [오디오 객체 초기화 (true.mp3, false.mp3)]
// ==========================================
const trueSound = new Audio('true.mp3');
const falseSound = new Audio('false.mp3');

// ==========================================
// [Zebra PDA 스캐너 상태 관리 변수]
// ==========================================
let isLocked = false;         // 스캔 1회 완료 후 중복 입력 방지 락
let rearmTimer = null;        // 레이저 연속 누름 감지 및 재무장(Re-arm) 타이머
let autoSubmitTimer = null;   // Enter가 안 들어올 경우 대비 자동 제출 타이머
let globalBuffer = "";        // 포커스 누락 대비 글로벌 키 수집 버퍼

const REARM_DELAY_MS = 400;   // 스캔 중단 후 다음 스캔 재무장까지 대기시간 (ms)
const AUTO_SUBMIT_MS = 100;   // 텍스트 입력 후 스캔 완료로 판단하는 시간 (ms)

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

    // 1. 브라우저 전체 키 이벤트 감지 (포커스가 빠져있어도 키 수신 가능)
    window.addEventListener("keydown", function(e) {
        const active = document.activeElement;

        // 고객사 선택(SELECT)이나 버튼(BUTTON) 조작 중일 때는 스캐너 가로채기 제외
        if (active && (active.tagName === 'SELECT' || active.tagName === 'BUTTON')) {
            return;
        }

        // 포커스가 input에 없었더라도 키가 들어오면 즉시 input으로 포커스 이동
        if (active !== input) {
            input.focus();
        }

        // Enter 신호 감지 (Zebra DataWedge에서 Send ENTER key가 설정된 경우)
        if (e.key === "Enter") {
            e.preventDefault();
            clearTimeout(autoSubmitTimer);
            handleScanComplete();
            return;
        }

        // 포커스가 없었을 때 들어온 문자를 대비해 globalBuffer에 저장
        if (e.key.length === 1 && !isLocked) {
            globalBuffer += e.key;
            resetRearmTimer();

            // Enter 없이 텍스트만 들어올 때 자동 완성을 위한 타이머
            clearTimeout(autoSubmitTimer);
            autoSubmitTimer = setTimeout(() => {
                if (!isLocked && (input.value.trim() || globalBuffer.trim())) {
                    handleScanComplete();
                }
            }, AUTO_SUBMIT_MS);
        }
    });

    // 2. Input 이벤트 감지 (Zebra가 텍스트를 입력창에 직접 밀어 넣는 경우)
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

    // 3. 포커스가 빠져나갔을 때 자동 복구
    input.addEventListener("blur", function() {
        setTimeout(() => {
            ensureFocus();
        }, 100);
    });

    // 4. 화면 아무 곳이나 터치/클릭 시 포커스를 무조건 입력창으로 고정 (브라우저 제한 해제)
    document.addEventListener("touchstart", handleUserInteraction, { passive: true });
    document.addEventListener("click", handleUserInteraction);
}

function handleUserInteraction(e) {
    if (e && e.target && (e.target.tagName === 'SELECT' || e.target.tagName === 'BUTTON')) {
        return; // 드롭다운이나 버튼 클릭 시에는 포커스 이동하지 않음
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

// 스캔 완료 처리 (중복 체크 및 소리 재생 로직 포함)
function handleScanComplete() {
    const input = document.getElementById("barcodeInput");
    // input 값 또는 포커스 빠진 동안 수집된 globalBuffer 사용
    const barcode = (input.value.trim() || globalBuffer.trim());

    if (isLocked || !barcode) {
        globalBuffer = "";
        if (input) input.value = "";
        return;
    }

    // 1회 스캔 완료 후 잠금
    isLocked = true;

    // [중복 체크] 지금까지 찍은 목록(scanList) 중에 동일한 품목코드가 있는지 검사
    const isDuplicate = scanList.some(item => item.item_code === barcode);

    if (isDuplicate) {
        // 이미 존재할 경우: false.mp3 재생 및 리스트 추가 거부
        falseSound.currentTime = 0;
        falseSound.play().catch(err => console.log("Audio play error:", err));
    } else {
        // 처음 찍힌 새로운 값일 경우: true.mp3 재생 및 리스트 추가
        trueSound.currentTime = 0;
        trueSound.play().catch(err => console.log("Audio play error:", err));

        const selectedCustomer = document.getElementById("customerSelect").value;
        const newItem = {
            no: scanList.length + 1,
            customer: selectedCustomer,
            item_code: barcode
        };

        scanList.push(newItem);
        saveData();
        renderTable();
    }

    // 초기화
    input.value = "";
    globalBuffer = "";
    resetRearmTimer();
}

// 레이저 버튼을 떼었는지 감지하여 다음 스캔 준비 (Re-arm)
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
// [데이터 저장 및 표 렌더링 (기존 유지)]
// ==========================================
function saveData() {
    localStorage.setItem("uniric_scan_list", JSON.stringify(scanList));
}

function loadSavedData() {
    const saved = localStorage.getItem("uniric_scan_list");
    if (saved) {
        try {
            scanList = JSON.parse(saved);
            renderTable();
        } catch(e) {
            console.error("저장된 데이터 로드 실패:", e);
        }
    }
}

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
        renderTable();
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