# gh-activity-scraper

gh-activity-scraper は、Node.js と TypeScript を用いて開発された、GitHub 上での活動記録を自動で取得・集計・可視化するツールです。Puppeteer を利用して GitHub の画面をスクレイピングし、指定された期間ごとの Pull Request 作成数、 Issue 発行数、レビューした Pull Request 数などの主要な指標を集計します。その後、取得したデータは JSON として出力され、Chart.js を利用したインタラクティブな HTML レポート（折れ線グラフ付き）としても生成されます。

## 特徴

- **Puppeteer による Web スクレイピング**  
  GitHub へのログイン（セッション cookie 管理付き）を自動化し、ブラウザを介してデータを取得します。

- **柔軟な期間設定**  
  `config.json` ファイルに、複数の期間（開始日・終了日）を設定することで、任意の期間の活動記録を収集可能です。

- **セッション管理**  
  ログイン時に取得した cookie を `cookies.json` に保存し、次回以降は自動的に再利用することで、毎回のログイン手続きを省略できます。

- **データの集計と出力**  
  スクレイピングによって取得されたデータは、JSON 形式（`output/activity-summary.json`）で保存され、後続の処理に利用されます。

- **インタラクティブな HTML レポート**  
  JSON データから生成された HTML レポート（`output/index.html`）には、Chart.js と chartjs-plugin-datalabels を使用したインタラクティブな折れ線グラフが組み込まれており、各期間の活動数が視覚的に把握できます。

## インストール

1. **リポジトリのクローン：**
   ```bash
   git clone <リポジトリのURL>
   cd gh-activity-scraper
   ```

2. **依存関係のインストール：**
   ```bash
   yarn install
   ```

## 設定

プロジェクトルートにある `config.json` ファイルで、スクレイピング対象の GitHub URL や集計期間を設定します。例:
```json
{
  "githubUrl": "https://github.com/",
  "terms": [
    {
      "startDate": "2021-10-01",
      "endDate": "2022-03-31"
    },
    {
      "startDate": "2022-04-01",
      "endDate": "2022-09-30"
    },
    {
      "startDate": "2022-10-01",
      "endDate": "2023-03-31"
    }
  ]
}
```

## 使い方

### 1. スクレイピングの実行および集計データを可視化した HTML の生成

下記コマンドを実行すると、GitHub へのログイン後、指定された期間の活動データがスクレイピングされ、`output/activity-summary.json` に集計結果が保存されます。  
加えて、集計データを Chart.js を使った折れ線グラフで可視化した `output/index.html` が生成されます。
```bash
yarn start
```

### 2. HTML レポートの表示

下記コマンドで、`output` ディレクトリの内容をローカルサーバーで表示可能です。:
```bash
yarn serve-summary
```

## ディレクトリ構成

```
gh-activity-scraper/
├── config.json                # GitHub URL と集計期間の設定ファイル
├── cookies.json               # GitHub ログイン用のセッション cookie 情報
├── package.json               # プロジェクト定義、スクリプト、依存関係
├── tsconfig.json              # TypeScript のコンパイラ設定
├── .yarnrc.yml                # Yarn の設定
├── output/                    # 成果物格納ディレクトリ
│   ├── activity-summary.json  # 集計された GitHub 活動データ JSON
│   └── index.html             # activity-summary.json の内容を Chart.js を使った折れ線グラフで可視化した HTML
└── src/
    ├── index.ts               # Puppeteer によるメインのスクレイピング処理
    └── generateSummaryHtml.ts # JSON データから HTML レポートを生成するスクリプト
```
