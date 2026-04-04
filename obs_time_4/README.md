# 小工具-時間可設定資料
[`https://tools.nekolive.net/obs_time_4`](https://tools.nekolive.net/obs_time_4)  

## OBS 設定
建議高度 `180`  
建議寬度 `400`  
字體預設 `Fira Code`，若畫面上字體出現問題，請右鍵進屬性 → 更新當前頁面快取  
  
自訂 CSS
```
:root {
    /*霓虹顏色*/
    --neon-color: #<hex code>;
    /*文字顏色*/
    --color: #<hex code>;
}
```
[取得 Hex Code](https://htmlcolorcodes.com/)

## 顯示星期
qs: `lang`  
|參數|資料|預設|
|:----|:----|:----|
|en|Sunday, Monday, Tuesday|✅|
|zh-TW|星期日、星期一、星期二||
|ja-JP|日曜日、月曜日、火曜日||

## 星期長度
qs: `long`  
|參數|資料|預設|
|:----|:----|:----|
|true|顯示完整星期|✅|
|false|顯示短星期||

短星期：
|參數|資料|
|:----|:----|
|en|Sun., Mon., Tue.|
|zh-TW|日、一、二|
|ja-JP|日、月、火|

## 時鐘位置
qs: `position`  
|參數|資料|預設|
|:----|:----|:----|
|left-top|左上角||
|left-bottom|左下角|✅|
|right-top|右上角||
|right-bottom|右下角||

## 使用方式
於網址後方加上上方提供的 `qs` (query string)  

**顯示星期為中文**
```
?lang=zh-TW
```

**顯示星期為中文、位置設定於右下角**
```
?lang=zh-TW&position=right-bottom
```

## 客製化
您可以下載 `index.html` 後自行修改。