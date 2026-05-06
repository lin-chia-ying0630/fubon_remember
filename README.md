# fubon_remember
富邦回憶錄

## GitHub Pages 展示資料

這個專案的展示頁會讀取 `public/memories/index.json`，再依照裡面的對應關係顯示照片與 Markdown 說明。

新增一張要永久展示的照片時：

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
