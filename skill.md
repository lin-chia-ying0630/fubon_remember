# 專案技能：富邦回憶錄開發指南

## 核心開發原則
- 使用 Vue 3 + TypeScript + Vite 開發。
- 側邊欄只保留兩個主要功能：「上傳」與「展示照片」。
- 側邊欄必須支援收合、整體顏色調整、整體亮度調整。
- 使用 CSS 變數管理側邊欄色相與亮度。
- 每一張照片必須對應一個獨立 Markdown 說明檔。
- 照片檔名與 Markdown 檔名需維持一致語意，例如 `family-dinner.jpg` 對應 `family-dinner.md`。
- 專案若包含真實個人照片或回憶內容，GitHub repo 應保持 private，避免公開敏感資料。

## GitHub Pages 永久展示資料規範
GitHub Pages 是靜態網站，不能直接從瀏覽器把照片寫回 repo。因此永久展示資料必須存在 repo 裡：

- 照片放在 `public/photos/`
- Markdown 說明放在 `public/memories/2026/`
- 展示索引放在 `public/memories/index.json`

展示頁必須以 `public/memories/index.json` 作為永久資料來源，並依照其中的 `photoUrl` 與 `markdownName` 建立照片與 Markdown 的一對一對應。

`index.json` 範例：

```json
{
  "id": 4,
  "title": "新的回憶",
  "photoName": "new-memory.jpg",
  "markdownName": "new-memory.md",
  "photoUrl": "photos/new-memory.jpg",
  "githubPath": "memories/2026/new-memory.md",
  "situation": "這張照片的情境說明。",
  "note": {
    "x": 80,
    "y": 80,
    "rotate": "-2deg",
    "color": "#fff3b8",
    "zIndex": 4,
    "scale": 1
  }
}
```

## 上傳模組規範
- 上傳頁可以提供圖片預覽與情境說明輸入。
- 前端可產生 Markdown 預覽與下載按鈕。
- 瀏覽器上傳的照片若只存在 `localStorage`，只能視為本機暫存，不等於永久保存。
- 若要讓同事在 GitHub Pages 看到該照片，必須將照片與 Markdown 加入 `public/` 對應資料夾，更新 `index.json`，再 commit/push。

## 展示模組規範
- 展示頁需將照片與情境說明渲染成便利貼。
- 便利貼需支援拖曳移動。
- 便利貼需支援放大與縮小。
- 便利貼需支援從畫面移除。
- 使用者在網頁移除 GitHub Pages 靜態資料時，只能從該瀏覽器本機隱藏，應以 `localStorage` 記錄 hidden ids。
- 若要讓所有同事都看不到某張照片，必須永久刪除 repo 內資料：
  - 從 `public/memories/index.json` 移除該筆資料
  - 刪除對應的 `public/photos/...`
  - 刪除對應的 `public/memories/2026/...md`
  - commit 並 push 到 GitHub

## 本機狀態與永久資料的差異
- `localStorage` 只存在使用者自己的瀏覽器。
- `localStorage` 可保存：
  - 側邊欄收合狀態
  - 側邊欄顏色與亮度
  - 本機新增的便利貼
  - 本機拖曳位置
  - 本機縮放比例
  - 本機隱藏的靜態資料 id
- `localStorage` 不能作為 GitHub Pages 共享資料來源。
- 同事要看到一致資料，必須透過 repo 內的 `public/memories/index.json` 與實體照片/Markdown 檔。

## GitHub 同步流程
新增永久照片：

1. 將照片放到 `public/photos/`
2. 將說明 Markdown 放到 `public/memories/2026/`
3. 更新 `public/memories/index.json`
4. 執行 `npm run build` 確認可建置
5. commit 並 push 到 `main`
6. GitHub Actions 會部署到 GitHub Pages

刪除永久照片：

1. 從 `public/memories/index.json` 移除資料
2. 刪除對應照片檔
3. 刪除對應 Markdown 檔
4. 執行 `npm run build`
5. commit 並 push 到 `main`

## GitHub Pages 設定
- `vite.config.ts` 的 `base` 應為 `/fubon_remember/`。
- GitHub Pages 部署來源應設定為 GitHub Actions。
- 部署 workflow 位於 `.github/workflows/deploy.yml`。
