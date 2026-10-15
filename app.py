from flask import Flask, render_template, request, jsonify
import pandas as pd
import os
from datetime import datetime

app = Flask(__name__, template_folder='.', static_folder='.', static_url_path='')

# 저장할 로컬 폴더 경로 설정 (폴더가 없으면 자동 생성)
SAVE_DIR = r"Z:\퓨처스 자료\1. 영업업무진행 현황\이순신\회의때발표용\큐알스캔엑셀로저장"
#C:\Users\이용욱\Desktop\신입사원 교육자료 모음\FutersMacro\유니락바코드스캐너웹페이지

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/export-excel', methods=['POST'])
def export_excel():
    try:
        data = request.json.get('data', [])
        if not data:
            return jsonify({"status": "error", "message": "저장할 데이터가 없습니다."}), 400

        # DataFrame 변환
        df = pd.DataFrame(data)
        df = df[['no', 'customer', 'item_code']] # 열 순서 정리
        df.columns = ['NO', '고객사', '품목코드'] # 엑셀 헤더명 설정

        # 저장 폴더가 없으면 생성
        if not os.path.exists(SAVE_DIR):
            os.makedirs(SAVE_DIR)

        # 파일명 (예: 스캔결과_20261004_213000.xlsx)
        filename = f"스캔결과_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
        full_path = os.path.join(SAVE_DIR, filename)

        # 엑셀 파일 저장
        df.to_excel(full_path, index=False)

        return jsonify({"status": "success", "path": full_path})
    
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

if __name__ == '__main__':
    print(f"서버가 시작되었습니다. 브라우저에서 http://127.0.0.1:5000 에 접속하세요.")
    app.run(host='0.0.0.0', port=5000, debug=True)