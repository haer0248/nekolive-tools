# 小工具-時間可設定資料
[`https://tools.nekolive.net/obs_time_2`](https://tools.nekolive.net/obs_time_2)  
若使用在普通瀏覽器將會顯示幫助，若使用 OBS 將會自動隱藏  

## OBS 設定
建議高度 `80`  
建議寬度 `最低600` 若有設定下方星期 `最低700`  
字體預設 `Roboto Mono`，若畫面上字體出現問題，請右鍵進屬性 → 更新當前頁面快取  
  
自訂 CSS
```css
@import url('https://fonts.googleapis.com/css2?family=Roboto+Mono&display=swap');
html, body { 
    font-family: 'Roboto Mono', monospace; 
}
```

## 星期
qs: `week`  
|參數|資料|預設|
|----|----|----|
|en|Mon, Tue, Wed|✅|
|tw|一、二、三||
|jp|月、火、水||

## 背景透明度
qs: `opacity`  
請輸入小於 10 的整數  
透明度計算，若輸入 5 = `5 / 10 = 0.5`  
使用 `none` 來取消背景透明

## 使用方式
於網址後方加上上方提供的 `qs` (query string)  
`?week=en&opacity=5` → 顯示周 (英文)，透明度為 0.5  
`?opacity=5` → 透明度為 0.5