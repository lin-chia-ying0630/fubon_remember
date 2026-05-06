# 專案技能：富邦回憶錄開發指南

## 核心開發原則
- **UI 規範**：側邊欄需具備收合功能。使用 CSS 變數管理全域顏色與亮度，確保能一鍵切換風格[span_8](start_span)[span_8](end_span)。
- **資料對應**：開發上傳功能時，必須確保一張圖片對應一個 .md 檔案。檔案命名需保持一致（例如：image01.jpg 與 image01.md）[span_9](start_span)[span_9](end_span)。
- **隱私安全性**：所有變更應導向至 Git 私人儲存庫，避免個人照片與回憶內容公開[span_10](start_span)[span_10](end_span)。

## 畫面情境實作
1. **上傳模組**：
   - 提供圖片預覽。
   - 建立表單輸入情境說明，並將文字寫入對應的 Markdown 檔案[span_11](start_span)[span_11](end_span)。
2. **展示模組 (Gallery)**：
   - 採用 Vue 3 動態元件，將照片與 .md 說明渲染為「隨機排列的便利貼」[span_12](start_span)[span_12](end_span)。
   - 隨機生成 5度 內的旋轉角度與座標偏移量，增加視覺豐富度[span_13](start_span)[span_13](end_span)。

## GitHub 同步邏輯
- 每次偵測到新檔案產生，提醒使用者執行版本提交，確保回憶資訊已上傳至雲端[span_14](start_span)[span_14](end_span)。