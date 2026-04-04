const http = require('http');
const fs = require('fs');

let inventory = {}; // 메모리에 합산 결과 저장

const server = http.createServer((req, res) => {
    // CORS 허용 (TC22에서 접속 가능하게)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    if (req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const id = data.id;
                const count = parseInt(data.count);

                // 수량 합산
                inventory[id] = (inventory[id] || 0) + count;

                // CSV 저장
                saveToCSV();
                
                console.log(`[기록완료] ${id}: 현재 합계 ${inventory[id]}`);
                res.writeHead(200);
                res.end('Success');
            } catch (e) {
                res.writeHead(400);
                res.end('Error');
            }
        });
    }
});

function saveToCSV() {
    let csvContent = "\ufeff품목ID,총수량\n"; 
    for (const id in inventory) {
        csvContent += `${id},${inventory[id]}\n`;
    }
    fs.writeFileSync('final_inventory.csv', csvContent);
}

server.listen(3000, '0.0.0.0', () => {
    console.log("엑셀 합산 서버가 시작되었습니다. (Port: 3000)");
});