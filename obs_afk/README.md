# 小工具-暫離
[`https://tools.nekolive.net/obs_afk`](https://tools.nekolive.net/obs_afk)  

## OBS 設定
建議高度 `1920`  
建議寬度 `1080`
字體預設 `俐方體11號`，若畫面上字體出現問題，請右鍵進屬性 → 更新當前頁面快取  
  
自訂 CSS
```css
@import url('https://fonts.googleapis.com/css2?family=Roboto+Mono&display=swap');
.subtitle, .char { 
    font-family: 'Roboto Mono', monospace; 
}
```

## 大標題
qs: `text`  
預設：`離席中 ...`

## 小標題
qs: `subtitle`  
預設：`Be right back...`

## 使用方式
於網址後方加上上方提供的 `qs` (query string)  
`?text=暫時離開` → 大標題顯示為 `暫時離開`
`?text=暫時離開&subtitle=我去偷睡覺` → 大標題顯示為 `暫時離開`，小標題顯示為 `我去偷睡覺`