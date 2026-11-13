# Geo-Zebra

개인 웹 프록시 서버 (Express + WebSocket). 프록시 모드(Ultraviolet + Wisp)와 에이전트 모드(jsdom)를 제공한다.

## GitHub Codespaces에서 실행 (크롬북용)

리눅스 없이 브라우저만으로 개발/테스트할 수 있다.

1. 이 레포 페이지 → `Code` → `Codespaces` → `Create codespace on main`
2. 컨테이너가 뜨면 `.devcontainer` 설정에 따라 `npm install`이 자동 실행된다
3. 터미널에서 서버 시작:
   ```bash
   npm start
   ```
4. 포트 3000이 자동 포워딩되어 `https://....app.github.dev` 주소로 열린다
5. 프록시(서비스 워커)가 안 뜨면 `PORTS` 탭에서 3000번 → `Port Visibility` → **Public** 으로 변경

> Codespaces는 유휴 시 자동 중지되고 무료 시간이 제한되므로 **개발·테스트용**이다.
> 상시 운영은 Render.com 또는 집 서버(OMEN)에 배포한다.

## 로컬 실행

```bash
npm install
npm start
# http://localhost:3000
```

## 배포

`render.yaml` 포함 — Render.com에 연결하면 자동 빌드/배포된다.
