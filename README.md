# 주식회사 채움 웹사이트 (주소: www.cheum56.com)

## 내 PC에서 보기
1. 압축을 풉니다.
2. `start.html`을 더블클릭합니다. (Windows는 `open_site.bat`, Mac은 `open_site.command`로도 열 수 있습니다.)
3. 첫 화면에서 세로로 보기 / 가로로 보기를 고릅니다.
인터넷이 없어도 열립니다. 인터넷이 연결되어 있으면 지정 글꼴(Noto Sans KR, Saira)이 적용됩니다.

정적 사이트입니다. 빌드 과정 없이 폴더째 웹서버에 올리면 됩니다.

| 파일 | 내용 |
|---|---|
| `start.html` | 로컬 조회 첫 화면 (보기 방식 선택) |
| `index.html` | 세로로 보기 — 가로 보기와 같은 16장을 위→아래로 (자동 생성 파일) |
| `horizontal.html` | 가로로 보기 — 16장을 좌→우로 (내용 수정은 이 파일에서) |
| `tools/build_vertical.py` | horizontal.html로 index.html을 다시 만드는 스크립트 |
| `assets/style.css` | 공통 스타일 (지명원 레드 #E1192C · 차콜 #221F20 · 연회색 #EFEEEE) |
| `assets/h.css`, `assets/h.js` | 가로 보기 전용 |
| `assets/data.js` | 공사실적 103건 · 모델하우스 17건 (2025년 11월 기준 지명원) |
| `assets/app.js` | 실적 표·필터·갤러리·라이트박스 |
| `assets/img/` | 지명원에서 추출한 사진, 약도 |

## www.cheum56.com 연결
- GitHub Pages 사용. 저장소 루트의 `CNAME` 파일에 `www.cheum56.com`이 들어 있습니다.
- 가비아 DNS: `A @` 4개(185.199.108~111.153), `CNAME www → <계정>.github.io`
- Settings → Pages에서 Enforce HTTPS를 켭니다.

## 실적 추가
`assets/data.js`의 `CHEUM_PROJECTS` 배열 끝에 한 줄을 추가합니다.
`{"y":"2026","c":"시공사","s":"현장명","i":"주방,일반가구","u":300}` — `u`는 세대수(없으면 null).
건수·세대수·시공사 수·연도 그래프는 자동으로 다시 계산됩니다.

## 페이지 내용 수정
세로·가로 보기는 같은 16장의 페이지를 씁니다. 내용은 `horizontal.html`에서만 고치고,
아래 명령으로 `index.html`(세로 보기)을 다시 만듭니다.
```
python3 tools/build_vertical.py
```
