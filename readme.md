# LotteryDraw: 抽獎程式

## 緣由

因為今年公司尾牙決定採用電腦抽獎, 所以開發了這個程式. 在此分享給有類似需求的人. 也歡迎pull request, 共同enhancement這個程式.

## 安裝方式

```
$ npm install
$ cd web
$ bower install
$ cd ..
$ npm start
```

This should start the server, and you can point your web browser to http://localhost:3000.

## 資料設定

### 人員資料

- 請參考: data/employee.xlsx
- 每個部門一個tab, tab的名稱為部門名稱
- 欄位資料: 職稱(沒有使用),姓名,可抽獎類型,資格標記

### 獎項資料

- 請參考: data/prize.xlsx
- 欄位順序: 編號, 標題, 內容, 數量, 類型, 標記限制, 每次抽出數量

### 抽獎規則

- 獎項可以分成不同群組獨立抽出. 例如最後加碼獎如果是與先前的獎項資格獨立的話, 則可以設定不同的分類. 在prize.xlsx內
  目前設定了兩個群組(1,2), 其中最後一個獎"董事長加碼特別獎"是屬於群組2, 所以就算抽到群組1的人也可以抽.
- 每個獎項可以設定得獎的限制. 例如prize.xlsx內第五獎到第一獎有一個"A"的標記, 所以員工必須有"A"的標記才能抽到這個獎項(使用情境:
  某些獎項必須是符合特定資格的人才可以抽).
- 人員資料的第三欄以分號的方式定義這個人員可以抽獎的群組. 第4欄則定義這個人員的標記.

## 其他功能

- 可以設定每個獎項每次抽出的人數
- 抽到的人可以棄權 (click在抽到的人員icon上面會跳出DB確認是否要放棄)
- 獎項可以臨時加碼 (click在可抽出數量上面會跳出DB確認是否加碼)
- 抽獎途中可以修改人員/獎項資料(例如臨時有貴賓加入) (從畫面右上方設定icon點選重新載入資料)
- 可以列出獎項得獎名單
- 可以列出未得獎名單
- 唱名功能 (see next section)

## 唱名功能

- 目前程式內建揭露獎項時自動唱名的功能,
- 請先連到[中研院 ITRI TTS@Web](http://atc.ccl.itri.org.tw/speech/tts/web.php)網站取得開發帳號/密碼,
- 使用以下程式下載語音合成檔

```
$ cd bin
$ mkdir ../web/tts
$ ./downloadtts.js --employeefile=../data/employee.xlsx --outputfolder=../web/tts --user=userid --pass=password
```
執行完成後程式會把人員的語音檔下載到web的tts目錄內, 然後從設定畫面內開啟語音功能即可.









