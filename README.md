# Shopify商品CSV 取込前チェック

`index.html`をブラウザで開くだけで動く、無料の簡易点検ツールです。アップロードやサーバー通信は行いません。CSVはUTF-8で読み込み、元ファイルを書き換えません。

確認するのはCSV構文、列数、Title、更新時のURL handle、handle内の空白、価格とStatusの表記候補です。画像URLの可用性、Shopify上の既存データ、全列の依存関係、インポート成功は確認しません。根拠は[Shopifyの商品CSV仕様](https://help.shopify.com/ja/manual/products/import-export/using-csv)と[一般的な取込エラー](https://help.shopify.com/ja/manual/products/import-export/common-import-issues)です。

テスト: `node --test test-validator.js`

制作: たく｜製造業DX・AI。毎回のCSV変換を専用ツールにしたい場合は[ココナラの相談窓口](https://coconala.com/services/4415018)をご利用ください。自主制作であり、Shopify社とは無関係です。
