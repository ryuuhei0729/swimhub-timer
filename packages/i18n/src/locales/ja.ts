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
    subtitle: "レース動画にストップウォッチオーバーレイを追加",
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
    limitReached:
      "スプリットの上限（{{max}}件）に達しました。Premiumプランで無制限に記録できます。",
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

  auth: {
    login: "ログイン",
    logout: "ログアウト",
    logoutConfirm: "ログアウトしますか？",
    welcome: {
      getStarted: "さっそく始める",
      login: "ログイン",
    },
    getStarted: {
      title: "アカウント作成",
      subtitle: "SwimHub Timerを始めましょう",
      withApple: "Appleで登録",
      withGoogle: "Googleで登録",
      withEmail: "メールアドレスで登録",
    },
    loginMethod: {
      title: "ログイン",
      subtitle: "SwimHub Timerへようこそ",
      withApple: "Appleでログイン",
      withGoogle: "Googleでログイン",
      withEmail: "メールアドレスでログイン",
    },
    emailLogin: "メールでログイン",
    emailSignup: "メールで新規登録",
    signUp: "新規登録",
    signIn: "ログイン",
    switchToSignUp: "アカウントをお持ちでない方はこちら",
    switchToSignIn: "アカウントをお持ちの方はこちら",
    emailPlaceholder: "メールアドレス",
    passwordPlaceholder: "パスワード",
    confirmationSent: "確認メールを送信しました。メールをご確認ください。",
    or: "または",
    terms: "利用規約",
    termsAgree: "続行することで、利用規約とプライバシーポリシーに同意したものとみなされます。",
    account: "アカウント",
    accountInfo: "アカウント情報",
    email: "メールアドレス",
    plan: "プラン",
    planGuest: "ゲスト",
    planFree: "Free",
    planPremium: "Premium",
    premiumOnly: "Premiumプランのみ",
    continueAsGuest: "ゲストとして続ける",
    deleteAccount: "アカウントを削除",
    deleteAccountConfirm:
      "アカウントを削除すると、すべてのデータが完全に削除されます。この操作は取り消せません。",
    deleteAccountWarning: "すべてのデータが完全に削除されます",
    errors: {
      cancelled: "認証がキャンセルされました",
      generic: "認証に失敗しました。もう一度お試しください。",
      timeout: "認証がタイムアウトしました。もう一度お試しください。",
      notInitialized: "認証サービスが初期化されていません",
      logoutFailed: "ログアウトに失敗しました",
      invalidCredentials: "メールアドレスまたはパスワードが正しくありません",
      alreadyRegistered: "このメールアドレスは既に登録されています。ログインしてください。",
      passwordTooShort: "パスワードは{{minLength}}文字以上で入力してください",
      deleteAccountFailed:
        "アカウントの削除に失敗しました。再度お試しください。",
    },
  },

  terms: {
    title: "利用規約",
    metaTitle: "利用規約 | SwimHub Timer",
    metaDescription: "SwimHub Timerの利用規約",
    lastUpdated: "最終更新日: 2026年2月24日",
    introTitle: "はじめに",
    introBody:
      "この利用規約（以下「本規約」）は、SwimHub Timer（以下「本アプリ」）の利用条件を定めるものです。本アプリをご利用いただくことにより、本規約に同意したものとみなされます。",
    serviceTitle: "サービス内容",
    serviceBody:
      "本アプリは、水泳のレース動画にストップウォッチをオーバーレイし、動画を書き出すためのツールです。",
    accountTitle: "アカウント",
    accountBody:
      "本アプリの一部機能を利用するにはアカウント登録が必要です。ユーザーは正確な情報を提供し、アカウント情報の管理について責任を負います。",
    prohibitedTitle: "禁止事項",
    prohibitedBody: "以下の行為を禁止します：",
    prohibitedItems: [
      "法令または公序良俗に違反する行為",
      "本アプリの運営を妨害する行為",
      "他のユーザーに不利益を与える行為",
      "不正アクセスまたはそれを試みる行為",
      "本アプリを商業目的で無断利用する行為",
    ],
    subscriptionTitle: "有料プラン（サブスクリプション）",
    subscriptionBody:
      "本アプリでは、追加機能を利用できる有料プラン（プレミアムプラン）を提供しています。",
    subscriptionItems: [
      "プレミアムプランの料金は、月額プラン（¥500/月）および年額プラン（¥5,000/年）です。料金は変更される場合があり、変更時は事前に通知します。",
      "サブスクリプションは、現在の期間が終了する少なくとも24時間前にキャンセルしない限り、同じ条件で自動的に更新されます。",
      "初回登録時には7日間の無料トライアル期間が設けられます。トライアル期間中にキャンセルしない場合、トライアル終了後に自動的に課金が開始されます。",
      "Web経由でのお支払いにはStripeを、モバイルアプリでのお支払いにはApple App Store / Google Playのアプリ内課金（RevenueCat経由）を使用します。",
      "解約はいつでも可能です。Web経由の場合はStripeカスタマーポータルから、モバイルの場合は各ストアのサブスクリプション管理画面から行えます。解約後も、現在の課金期間が終了するまでプレミアム機能を利用できます。",
      "返金については、各決済プラットフォーム（Stripe、Apple App Store、Google Play）のポリシーに準じます。",
    ],
    disclaimerTitle: "免責事項",
    disclaimerBody:
      "本アプリは「現状のまま」で提供されます。本アプリの利用により生じた損害について、運営者は一切の責任を負いません。",
    changesTitle: "規約の変更",
    changesBody:
      "運営者は、必要に応じて本規約を変更することがあります。変更後の規約は、本アプリ上に掲載した時点で効力を生じます。",
    contactTitle: "お問い合わせ",
    contactBody:
      "本規約に関するご質問は、アプリのサポートページよりお問い合わせください。",
    backToTop: "トップページに戻る",
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
    paymentTitle: "決済情報の取り扱い",
    paymentBody:
      "本アプリの有料プラン（プレミアムプラン）をご利用いただく際、決済処理は以下の外部サービスに委託しており、本アプリがクレジットカード番号等の決済情報を直接保存することはありません。",
    paymentStripe:
      "Stripe, Inc.: Web経由でのサブスクリプション決済処理を委託しています。Stripeは PCI DSS に準拠した決済基盤を提供しています。",
    paymentRevenueCat:
      "RevenueCat, Inc.: モバイルアプリでのサブスクリプション管理を委託しています。Apple App Store / Google Play経由の課金処理はRevenueCatを通じて行われます。",
    paymentNote:
      "本アプリは、サブスクリプションの状態（有効/無効、プラン種別、有効期限等）のみを管理し、決済情報そのものは上記の委託先が管理します。",
    thirdPartyTitle: "第三者への提供",
    thirdPartyBody:
      "上記の決済処理委託先を除き、ユーザーの個人情報を第三者に提供することはありません。法令に基づく場合はこの限りではありません。",
    contactTitle: "お問い合わせ",
    contactBody:
      "本ポリシーに関するご質問は、アプリのサポートページよりお問い合わせください。",
    backToTop: "トップページに戻る",
  },

  support: {
    title: "サポート",
    metaTitle: "サポート | SwimHub Timer",
    metaDescription: "SwimHub Timerのサポート・お問い合わせ",
    heading: "サポート・お問い合わせ",
    description:
      "SwimHub Timerに関するご質問やお問い合わせは、以下のメールアドレスまでご連絡ください。",
    emailLabel: "お問い合わせ先メールアドレス",
    email: "support@swim-hub.app",
    responseNote: "通常、数営業日以内にご返信いたします。",
    faqTitle: "よくある質問",
    faqItems: [
      {
        question: "動画の書き出しに失敗します",
        answer:
          "デバイスの空き容量を確認してください。長時間の動画の場合、十分なストレージが必要です。",
      },
      {
        question: "スタート信号が自動検出されません",
        answer:
          "周囲の騒音が大きい場合、自動検出が難しいことがあります。波形をタップして手動でスタートポイントを設定してください。",
      },
      {
        question: "アカウントを削除したい",
        answer:
          "アカウントの削除をご希望の場合は、上記メールアドレスまでご連絡ください。",
      },
    ],
  },
} as const;

export default ja;
export type TranslationResource = typeof ja;

// Loosened type for non-default locales (string values instead of literal types)
type DeepStringify<T> = T extends readonly string[]
  ? string[]
  : T extends readonly (infer U)[]
    ? DeepStringify<U>[]
    : T extends Record<string, unknown>
      ? { [K in keyof T]: DeepStringify<T[K]> }
      : string;

export type TranslationShape = DeepStringify<TranslationResource>;
