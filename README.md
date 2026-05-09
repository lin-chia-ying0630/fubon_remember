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

網頁上的「加入展示」會先把照片放到目前畫面的展示牆預覽；展示畫面的「存入 GIT」可以輸入 GitHub token，透過 GitHub API 直接把照片、Markdown 與 `index.json` commit 到 repo。

GitHub token 建議使用 fine-grained token，授權範圍只給這個 repo，Repository permissions 設定 `Contents: Read and write`。token 只會存放在目前瀏覽器 session，不會提交到 repo。

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
