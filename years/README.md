# 小工具-每年倒數計時可設定資料
[`https://tools.nekolive.net/years`](https://tools.nekolive.net/years)  

## OBS 設定
字體預設 `Noto Sans JP`，若畫面上字體出現問題，請右鍵進屬性 → 更新當前頁面快取  
  
自訂 CSS
```css
@import url('https://fonts.googleapis.com/css2?family=Roboto+Mono&display=swap');
html, body { 
    font-family: 'Roboto Mono', monospace; 
}
```

## 指定年份
qs: `y`  
預設：`明年`

## 結束訊息
qs: `end`  
預設：`🎉 [y] 新年快樂！`
備註：請使用 `[y]` 帶入指定年份。

## 使用方式
於網址後方加上上方提供的 `qs` (query string)  
`?y=2028` → 設定結束年份為 `2028`

`?end=Happy New Year!&y=2026` → 設定結束年份為 `2026` 並且結束訊息為 `Happy New Year!`。  
> 由於 2026 倒數已經結束了，所以會直接顯示 `Happy New Year!`，可以用這個方式來預覽結束訊息。