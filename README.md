# Pelagic — 潛水日誌

Pelagic 是一個給潛水者使用的相片日誌與社群網站。它讓使用者把每一次下潛看見的海洋生物、潛點、深度與照片保存起來，並在世界地圖上留下自己的潛水足跡。

網站已部署於 [pelagic-dive-log.vercel.app](https://pelagic-dive-log.vercel.app/)。

## 這個專案可以做什麼？

- 用 Email 或 Google 帳號登入，保留個人日誌與檔案。
- 一次記錄一潛，並可上傳多張水下相片；至少為一張相片填寫物種名稱。
- 輸入地址或在世界地圖上選點，儲存潛點名稱與經緯度。
- 隨時修改自己的日誌資料，或連同相片一起刪除日誌。
- 在地圖上查看自己的、社群公開的，以及追蹤者的潛水紀錄。
- 探索其他潛水者公開的日誌，追蹤創作者，並依互動熱度排序內容。
- 對公開日誌按讚、收藏、留言；創作者可在站內收到互動通知。
- 點擊相片可放大瀏覽、下載，並跳至對應的潛點地圖。
- 管理員可查看及移除不適合的公開內容。

## 技術架構

- **前端：** React + Vite
- **地圖：** Leaflet、React Leaflet、OpenStreetMap 與 Overpass API
- **登入、資料庫與相片儲存：** Supabase Auth、PostgreSQL、Supabase Storage
- **部署：** Vercel

## 本機啟動

```powershell
npm install
Copy-Item .env.example .env
npm run dev
```

在 `.env` 填入自己的 Supabase 專案資料：

```env
VITE_SUPABASE_URL=你的 Supabase Project URL
VITE_SUPABASE_PUBLISHABLE_KEY=你的 Supabase publishable key
```

請只使用 publishable key；不要把 `service_role` 或 secret key 放進前端環境檔或提交到 GitHub。

## 建立 Supabase 資料庫

依序在 Supabase SQL Editor 執行 [`supabase/migrations`](supabase/migrations) 內的 migration 檔案。它們會建立：

- 使用者個人檔案、潛水日誌與多張相片資料表
- 留言、按讚、收藏、追蹤與通知
- 管理員與內容審核權限
- Row Level Security（每位使用者只能管理自己的內容）
- `dive-photos` 圖片儲存 bucket 的存取規則

接著在 Supabase Auth 啟用 Email 與 Google 登入。Google OAuth 的 redirect URL 應包含本機開發網址與正式網站網址。

## 注意事項

- 潛點地圖資料來自社群維護的 OpenStreetMap，並不代表完整商業潛點資料庫。
- 目前物種名稱由使用者手動填寫；尚未接入自動生物辨識服務。
- 對其他人的相片請尊重版權、潛水安全及當地保育規範。

## 開發指令

```powershell
npm run dev      # 啟動本機開發伺服器
npm run build    # 建立正式部署版本
npm run preview  # 預覽建立後的版本
```
