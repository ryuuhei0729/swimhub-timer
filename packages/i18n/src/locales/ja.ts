const ja = {
  common: {
    appName: "SwimHub Timer",
    export: "書き出し",
    back: "戻る",
    retry: "再試行",
    error: "エラー",
    done: "完了",
    reset: "リセット",
    cancel: "キャンセル",
    new: "新規",
    close: "閉じる",
  },

  meta: {
    title: "SwimHub Timer – 水泳レース動画にストップウォッチを自動オーバーレイ",
    description:
      "水泳のレース動画にストップウォッチを自動でオーバーレイ。スタート信号を音声検出し、ラップタイムを動画上に表示・書き出しできる無料Webツールです。",
    ogLocale: "ja_JP",
    manifestDescription: "水泳レース動画のストップウォッチオーバーレイツール",
    keywords: [
      "水泳",
      "ストップウォッチ",
      "レース動画",
      "タイム計測",
      "オーバーレイ",
      "swimming",
      "stopwatch",
      "race video",
      "SwimHub Timer",
    ],
  },

  import: {
    subtitle: "水泳レース動画にストップウォッチオーバーレイを追加",
    selectVideo: "動画を選択",
    selectVideoDesc: "フォトライブラリから水泳レースの動画を選んでください",
    dropHere: "レース動画をドロップ",
    orClickToBrowse: "またはクリックして選択",
    supportedFormats: "MP4 / MOV / WebM",
    loading: "読み込み中...",
    failedToLoad: "動画の読み込みに失敗しました",
    failedToPick: "動画の選択に失敗しました",
    stepImport: "動画取り込み",
    stepImportDesc: "動画をアップロード",
    stepDetect: "検出 & デザイン",
    stepDetectDesc: "スタート信号を検出",
    stepExport: "書き出し",
    stepExportDesc: "結果をダウンロード",
  },

  signal: {
    title: "スタート合図",
    clickWaveform: "波形をクリックしてスタートポイントを設定",
    autoDetect: "自動検出",
    autoDetectDesc: "音声解析でスタート音を検出します",
    analyzing: "音声解析中...",
    detecting: "検出中...",
    extracting: "音声を抽出中...",
    analyzingStart: "スタート音を解析中...",
    confirmed: "確定済み",
    setAsStartPoint: "この時刻で確定",
    confirmedTime: "スタート時刻（確定）",
    candidateTime: "候補時刻",
    startConfirmed: "スタート時刻確定",
    change: "変更する",
    hintText: "波形をタッチするか「自動検出」で\nスタート音をセットしてください",
    fineTune: "微調整",
    notDetected:
      "スタート合図を自動検出できませんでした。手動でセットしてください。",
    audioExtractionError: "音声抽出中にエラーが発生しました",
    audioAnalysisError: "音声解析中にエラーが発生しました",
  },

  design: {
    title: "デザイン",
    size: "サイズ",
    preset: {
      "classic-digital": "クラシックデジタル",
      "minimal-white": "ミニマルホワイト",
      broadcast: "ブロードキャスト",
      "competition-red": "コンペティションレッド",
    },
  },

  splits: {
    title: "スプリット",
    record: "Record",
    finish: "Finish",
    finalTime: "Final Time",
    distancePlaceholder: "距離 (m)",
    memoPlaceholder: "メモ（任意）",
    emptyHint: "動画を一時停止し、距離を入力して\nRecordボタンでスプリットを記録",
    lap: "lap",
    count: "{{count}}件",
  },

  exportScreen: {
    title: "書き出し",
    webTitle: "動画を書き出し",
    subtitle: "ストップウォッチオーバーレイ付きの動画を作成",
    settings: "書き出し設定",
    video: "動画",
    startTime: "スタート時刻",
    splitsLabel: "スプリット",
    notSet: "未設定",
    resolution: "解像度",
    quality: "品質",
    original: "オリジナル",
    recommended: "（推奨）",
    exportMp4: "書き出し MP4",
    encoding: "書き出し中...",
    encodingPercent: "書き出し中... {{percent}}%",
    complete: "書き出し完了!",
    downloadMp4: "MP4 をダウンロード ({{size}} MB)",
    backToEditor: "エディターに戻る",
    saveToLibrary: "フォトライブラリに保存",
    share: "共有",
    startExport: "書き出し開始",
    timeEstimate: "動画の長さにより数分かかる場合があります",
    errorDuringExport: "書き出し中にエラーが発生しました",
    needVideoAndStart: "動画とスタート時刻を設定してください",
    savedToLibrary: "フォトライブラリに保存しました",
    saveComplete: "保存完了",
    saveFailed: "保存に失敗しました",
    adLoading: "広告を読み込み中...",
    adFailed: "広告の読み込みに失敗しました",
    adWatchPrompt: "広告の視聴が完了するまでお待ちください",
  },

  editor: {
    title: "エディター",
    tabSignal: "信号",
    tabDesign: "デザイン",
    tabSplits: "スプリット",
  },

  privacy: {
    title: "プライバシーポリシー",
    metaTitle: "プライバシーポリシー | SwimHub Timer",
    metaDescription: "SwimHub Timerのプライバシーポリシー",
    lastUpdated: "最終更新日: 2026年2月17日",
    introTitle: "はじめに",
    introBody:
      "SwimHub Timer（以下「本アプリ」）は、水泳のレース動画にストップウォッチをオーバーレイするためのアプリです。本プライバシーポリシーでは、本アプリにおける個人情報の取り扱いについて説明します。",
    collectionTitle: "収集する情報",
    collectionBody:
      "本アプリは、個人情報を収集しません。動画の処理はすべてお使いのデバイス上でローカルに行われ、外部サーバーへのデータ送信は行いません。",
    accessTitle: "デバイスへのアクセス",
    accessBody: "本アプリは、以下の機能にアクセスする場合があります：",
    accessPhotoLibrary:
      "フォトライブラリ：動画のインポートおよび書き出した動画の保存のため",
    accessMicrophone: "マイク：動画内のスタート信号音を検出するため",
    accessNote:
      "これらのアクセスはデバイス上での処理にのみ使用され、データが外部に送信されることはありません。",
    thirdPartyTitle: "第三者への提供",
    thirdPartyBody:
      "本アプリは個人情報を収集しないため、第三者への情報提供は行いません。",
    contactTitle: "お問い合わせ",
    contactBody:
      "本ポリシーに関するご質問は、アプリのサポートページよりお問い合わせください。",
    backToTop: "トップページに戻る",
  },
} as const;

export default ja;
export type TranslationResource = typeof ja;

// Loosened type for non-default locales (string values instead of literal types)
type DeepStringify<T> = T extends readonly string[]
  ? string[]
  : T extends Record<string, unknown>
    ? { [K in keyof T]: DeepStringify<T[K]> }
    : string;

export type TranslationShape = DeepStringify<TranslationResource>;
