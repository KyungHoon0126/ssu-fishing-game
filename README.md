<img width="30%" alt="shoong shoong" src="https://github.com/user-attachments/assets/29174eda-a011-4785-88fb-539e6553e077" />

# 🎣 SHOONG! SHOONG!
> **계절의 흐름을 낚다, 리듬 액션 낚시 게임**  
> **Interactive Rhythm Action Fishing Game built with p5.js**

<div style="display:flex; gap:12px;">
  <img width="49%" alt="{370BF4AA-BFB7-4F13-93CD-151B33728826}" src="https://github.com/user-attachments/assets/2fef1947-12fa-4151-be0b-a2df2d44be37" />
  <img width="49%" alt="{BA6E0ADD-9402-44B2-9EEC-9FDF55B82B39}" src="https://github.com/user-attachments/assets/bd991f4e-05eb-42b0-9cfe-695902320779" />
  <img width="49%" alt="{14D3096F-B67F-46C7-AE98-E8023D2DCB2D}" src="https://github.com/user-attachments/assets/cf3a5d57-17c3-4228-9fef-fe8d58d3cac1" />
  <img width="49%" alt="{554993B3-8365-44B6-BCA7-B85569D04E15}" src="https://github.com/user-attachments/assets/7c619bf2-41fa-412e-bbc4-7e8ac0546682" />
</div>

## 📖 프로젝트 소개 (Introduction)
<b>SHOONG! SHOONG!</b>은 HTML5 Canvas와 **p5.js** 라이브러리를 활용하여 개발된 웹 기반 아케이드 낚시 게임입니다.
단순한 낚시를 넘어, 타이밍에 맞춰 게이지를 맞추는 **리듬 액션 요소**를 결합하여 짜릿한 손맛을 구현했습니다. 봄, 여름, 가을, 겨울 사계절의 변화에 따라 달라지는 아름다운 배경과 BGM, 그리고 각 계절을 대표하는 다양한 물고기들을 만나보세요.

## 👨‍💻 팀원 소개 (Team)
**숭실대학교 디지털미디어학과 미디어 앤 테크**
*   **김경훈 (20251669)** : 메인 로직 구현, 물리 엔진, 상태 관리 시스템 및 사운드 시스템 구현
*   **강성준 (20253308)** : 메인 로직 구현, 물리 엔진, 게임 밸런싱 구현
*   **박규리 (20241095)** : 메인 테마 및 에셋 통합 구현, UI/UX 디자인 및 사운드 리소스 제작

## 🛠 기술 스택 (Tech Stack)
*   **Language**: JavaScript (ES6+)
*   **Library**: [p5.js](https://p5js.org/) (Graphics), [p5.sound](https://p5js.org/reference/#/libraries/p5.sound) (Audio)
*   **Rendering**: HTML5 Canvas API
*   **Tools**: VS Code, Git

## ✨ 주요 기능 (Key Features)

### 1. 4계절 테마 시스템 (Seasonal Theme)
*   봄, 여름, 가을, 겨울 4가지 계절을 선택하여 플레이할 수 있습니다.
*   계절에 따라 **배경 이미지, BGM, 등장하는 물고기의 종류**가 실시간으로 변경됩니다.

### 2. 리듬 액션 낚시 (Rhythm Action Mechanic)
*   물고기가 미끼를 물면 **게이지 미니게임**이 시작됩니다.
*   움직이는 바가 목표 지점에 도달했을 때 `SPACE` 키를 눌러야 하며, 물고기의 등급(크기)에 따라 난이도가 동적으로 조절됩니다.

### 3. 경제 및 상점 시스템 (Economy & Shop)
*   물고기를 잡아 획득한 골드로 상점을 이용할 수 있습니다.
*   **미끼 아이템**: 판정 범위 증가, 골드 획득량 증가 등 다양한 버프 효과를 제공합니다.
*   **보관함**: 구매한 미끼를 관리하고 장착할 수 있습니다.

### 4. 도감 시스템 (Pokedex)
*   게임 종료(TIME UP) 시, 해당 세션에서 잡은 물고기들이 도감에 등록됩니다.
*   잡지 못한 물고기는 실루엣으로 처리되어 수집 욕구를 자극합니다.

### 5. 인터랙티브 오디오 (Interactive Audio)
*   메뉴, 인게임, 결과 화면 등 <b>게임 상태(State)</b>에 따라 BGM이 자연스럽게 전환됩니다.
*   버튼 클릭, 낚시 성공/실패, 상점 구매 등 모든 액션에 효과음(SFX)이 적용되어 있습니다.

## 📂 프로젝트 구조 (Project Structure)
```bash
ssu-fishing-game/
├── index.html          # 게임 진입점 및 라이브러리 로드
├── sketch.js           # p5.js Setup/Draw, 에셋 로딩(Preload), 전역 이벤트
├── Game.js             # 메인 게임 컨트롤러 (상태 관리, 렌더링 총괄)
├── constants.js        # 게임 설정값 (물고기 데이터, 계절 정보 등)
├── entities/           # 게임 오브젝트 클래스
│   ├── boat.js         # 플레이어 배 (이동 로직)
│   ├── hook.js         # 낚싯바늘 (물리 연산, 충돌 감지)
│   ├── fish.js         # 물고기 (AI 이동, 저항 로직)
│   └── particle.js     # 시각 효과 (물방울 등)
├── ui/                 # UI 모듈
│   ├── menu.js         # 메인 메뉴, 상점, 보관함 UI (Mixin 패턴)
│   └── infoOverlay.js  # 게임 설명 팝업
└── Resources/          # 게임 리소스 (이미지, 오디오)
```

## 🚀 설치 및 실행 (Installation & Run)
이 프로젝트는 별도의 빌드 과정 없이 웹 브라우저에서 바로 실행 가능합니다.
1. 저장소 클론 (Clone)
2. 실행 (Run)
3. VS Code Live Server 이용 (권장): index.html 우클릭 → Open with Live Server 또는 로컬 웹 서버를 통해 index.html을 실행합니다.

주의: 브라우저 보안 정책(CORS)으로 인해 로컬 파일 직접 열기(file://) 시 오디오 로딩이 차단될 수 있습니다.

## 💻 주요 구현 내용 및 알고리즘 (Technical Details)
**1. 상태 패턴 (State Pattern) 기반 게임 관리**
- Game.js에서 게임의 상태를 MENU, INFO, PLAY, RESULT로 정의하고, update()와 render() 루프 내에서 상태에 따른 로직을 분기 처리하여 유기적인 화면 전환을 구현했습니다.

**2. 벡터 물리 연산 (Vector Physics)**
- p5.Vector를 활용하여 낚싯바늘의 움직임을 구현했습니다.
- **Hook Mechanics** : 낚싯줄이 내려가고 올라오는 속도, 물고기가 걸렸을 때의 저항감 등을 벡터 연산으로 처리하여 부드러운 움직임을 제공합니다.
- **Lerp Interpolation** : 게이지 바의 움직임과 물고기의 회전 등에 선형 보간법(lerp)을 적용하여 자연스러운 애니메이션을 구현했습니다.

**3. UI 모듈화 (Prototype Mixin)**
- menu.js 등에서 Game.prototype에 UI 렌더링 함수들을 주입하는 Mixin 패턴을 사용하여, 거대해질 수 있는 Game 클래스의 코드를 기능별로 분리하고 유지보수성을 높였습니다.

**4. 비동기 리소스 관리**
- sketch.js의 preload() 단계에서 이미지와 오디오 리소스를 비동기로 미리 로드하고, 로딩이 완료된 후 게임이 시작되도록 하여 리소스 누락 없는 안정적인 플레이 환경을 제공합니다

## 🔮 Future Work
- 터치 디바이스 대응
- 난이도 프리셋 및 타임어택 모드
- 추가 물고기/보스 이벤트
- 점수 리더보드 (백엔드 연동)

## 📜 License
This project is licensed under the MIT License.
