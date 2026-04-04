# 小工具-自訂倒數計時
[`https://tools.nekolive.net/custom_timer`](https://tools.nekolive.net/custom_timer)  
若使用在普通瀏覽器將會顯示幫助，若使用 OBS 將會自動隱藏  

## 年
qs: `y`  
預設：`明年`

## 月
qs: `m`  
預設：`01`

## 日
qs: `d` 
預設：`01` 

## 時間
qs: `t` 
預設：`00:00:00`

## 訊息
qs: `msg` 
預設：`距離 y 還有`

## 結束訊息
qs: `end` 
預設：`新年快樂！`

## 使用方式
於網址後方加上上方提供的 `qs` (query string)  
`?y=2028` → 設定結束時間為 2028 年。
`?msg=距離生日還有&end=生日快樂` → 設定顯示訊息為 `距離生日還有 [自動補上時間]`，結束顯示 `生日快樂`。