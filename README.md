# fubon_remember
富邦回憶錄

## GitHub Pages 展示資料

這個專案的展示頁會讀取 `public/memories/index.json`，再依照裡面的對應關係顯示照片與 Markdown 說明。

新增一張要讓所有人都看到的照片時，建議使用發布工具：

```bash
npm run publish:memory -- --photo ./family.jpg --title "家庭聚餐" --situation "大家一起吃飯的回憶"
npm run build
git add public
git commit -m "Add family memory"
git push origin main
```

GitHub Actions 會自動 build 並部署到 GitHub Pages。

網頁上的「加入展示」會先把照片放到目前畫面的展示牆預覽；展示畫面的「存入 GIT」會產生 GitHub Actions 手動發布所需欄位。

## GitHub Actions 手動發布

此專案提供 `.github/workflows/publish-memory.yml`，可以在 GitHub Actions 頁面手動新增照片，workflow 會自動：

1. 將照片寫入 `public/photos/`
2. 建立 Markdown 到 `public/memories/2026/`
3. 更新 `public/memories/index.json`
4. Commit 並 push 到 `main`
5. Build 並部署 GitHub Pages

使用方式：

1. 到 GitHub repo 的 `Actions`
2. 選 `Publish Memory`
3. 按 `Run workflow`
4. 填入 `title`、`situation`、`photo_name`、`photo_base64`
5. 執行後等待 GitHub Pages 部署完成

`photo_base64` 可以使用包含 `data:image/...;base64,` 前綴的內容，也可以只貼純 base64。

手動新增一張要永久展示的照片時：

1. 將照片放到 `public/photos/`
2. 將情境說明 Markdown 放到 `public/memories/2026/`
3. 在 `public/memories/index.json` 新增一筆資料
4. Commit 並 push 到 `main`
5. GitHub Actions 會自動 build 並部署到 GitHub Pages

範例資料：

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
