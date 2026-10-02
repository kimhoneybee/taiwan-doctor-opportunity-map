# Taiwan Doctor Opportunity Map

台灣家醫科／復健科診所與醫師兼職、支援、合作、合夥、新據點機會地圖。

## 網站結構
- `index.html`：互動地圖與篩選介面。
- `opportunities.json`：醫師工作／合作機會資料。每週更新時原則上只需要修改這個檔案。

## GitHub Pages
到 **Settings → Pages → Build and deployment → Deploy from a branch**，選：
- Branch: `main`
- Folder: `/ (root)`

專案 Pages 的典型網址：
`https://kimhoneybee.github.io/taiwan-doctor-opportunity-map/`

此 repository 目前是 **private**。GitHub 官方文件指出：private repository 的 GitHub Pages 需要 GitHub Pro、Team、Enterprise Cloud 或 Enterprise Server；若使用 GitHub Free，Pages 來源 repo 需為 public。

## 每週自動更新
ChatGPT 的每週排程會搜尋新的台灣醫師兼職、支援、合作、合夥、入股、開業培訓與新據點機會，並更新 `opportunities.json`。網站本身不需要每週重建；重新整理頁面就會載入最新 JSON。

## opportunities.json 主要欄位
- 診所／體系名稱、縣市、行政區、地址
- 需求科別
- 兼職／支援／合作／合夥／新據點／開業培訓
- 待遇或診次
- 公開聯絡人、電話、Email、官網
- PT/OT/ST 或其他團隊資訊
- 規模與合夥／入股訊號
- 原始來源、來源網址與日期

## 資料原則
- 只收公開可查證的招募／合作資訊。
- 「明確公開合夥／入股」與「可主動詢問但未公開承諾股權」分開寫。
- 職缺與合作條件可能隨時改變，聯絡前請回原始來源確認。
- 地圖的診所底圖使用公開醫療院所空間圖層；其中負責人欄位可能是較舊資料，只作線索。
