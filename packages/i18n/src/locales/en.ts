import type { TranslationShape } from "./ja";

const en: TranslationShape = {
  common: {
    appName: "SwimHub Timer",
    export: "Export",
    back: "Back",
    retry: "Retry",
    error: "Error",
    done: "Done",
    reset: "Reset",
    cancel: "Cancel",
    new: "New",
    close: "Close",
  },

  meta: {
    title: "SwimHub Timer – Auto-overlay stopwatch on swimming race videos",
    description:
      "Automatically overlay a stopwatch on swimming race videos. Detect start signals via audio, display lap times on video, and export – free web tool.",
    ogLocale: "en_US",
    manifestDescription: "Swimming race video stopwatch overlay tool",
    keywords: [
      "swimming",
      "stopwatch",
      "race video",
      "timing",
      "overlay",
      "swimming",
      "stopwatch",
      "race video",
      "SwimHub Timer",
    ],
  },

  import: {
    subtitle:
      "Automatically overlay a stopwatch on your swimming race videos",
    selectVideo: "Select Video",
    selectVideoDesc:
      "Choose a swimming race video from your photo library",
    dropHere: "Drop your race video here",
    orClickToBrowse: "or click to browse",
    supportedFormats: "MP4 / MOV / WebM",
    loading: "Loading...",
    failedToLoad: "Failed to load video",
    failedToPick: "Failed to pick video",
    stepImport: "Import",
    stepImportDesc: "Upload video",
    stepDetect: "Detect & Design",
    stepDetectDesc: "Find start signal",
    stepExport: "Export",
    stepExportDesc: "Download result",
  },

  signal: {
    title: "Start Signal",
    clickWaveform: "Click waveform to set start point",
    autoDetect: "Auto-Detect",
    autoDetectDesc: "Detect start sound via audio analysis",
    analyzing: "Analyzing...",
    detecting: "Detecting...",
    extracting: "Extracting audio...",
    analyzingStart: "Analyzing start sound...",
    confirmed: "Confirmed",
    setAsStartPoint: "Set as Start Point",
    confirmedTime: "Start Time (Confirmed)",
    candidateTime: "Candidate Time",
    startConfirmed: "Start confirmed",
    change: "Change",
    hintText:
      "Tap the waveform or use \"Auto-Detect\"\nto set the start sound",
    fineTune: "Fine-tune",
    notDetected:
      "Could not auto-detect start signal. Please set it manually.",
    audioExtractionError: "An error occurred while extracting audio",
    audioAnalysisError: "An error occurred during audio analysis",
  },

  design: {
    title: "Design",
    size: "Size",
    preset: {
      "classic-digital": "Classic Digital",
      "minimal-white": "Minimal White",
      broadcast: "Broadcast",
      "competition-red": "Competition Red",
    },
  },

  splits: {
    title: "Splits",
    record: "Record",
    finish: "Finish",
    finalTime: "Final Time",
    distancePlaceholder: "Distance (m)",
    memoPlaceholder: "Memo (optional)",
    emptyHint:
      "Pause the video, enter distance,\nand tap Record to log a split",
    lap: "lap",
    count: "{{count}}",
  },

  exportScreen: {
    title: "Export",
    webTitle: "Export Video",
    subtitle: "Create your final video with stopwatch overlay",
    settings: "Export Settings",
    video: "Video",
    startTime: "Start Time",
    splitsLabel: "Splits",
    notSet: "Not set",
    resolution: "Resolution",
    quality: "Quality",
    original: "Original",
    recommended: "(Recommended)",
    exportMp4: "Export MP4",
    encoding: "Encoding...",
    encodingPercent: "Encoding... {{percent}}%",
    complete: "Export complete!",
    downloadMp4: "Download MP4 ({{size}} MB)",
    backToEditor: "Back to editor",
    saveToLibrary: "Save to Photo Library",
    share: "Share",
    startExport: "Start Export",
    timeEstimate:
      "This may take a few minutes depending on video length",
    errorDuringExport: "An error occurred during export",
    needVideoAndStart: "Please set a video and start time",
    savedToLibrary: "Saved to Photo Library",
    saveComplete: "Save Complete",
    saveFailed: "Failed to save",
    adLoading: "Loading ad...",
    adFailed: "Ad failed to load",
    adWatchPrompt: "Please complete watching the ad to proceed",
  },

  editor: {
    title: "Editor",
    tabSignal: "Signal",
    tabDesign: "Design",
    tabSplits: "Splits",
  },

  auth: {
    login: "Log In",
    logout: "Log Out",
    logoutConfirm: "Are you sure you want to log out?",
    loginWith: {
      google: "Sign in with Google",
      apple: "Sign in with Apple",
      email: "Sign in with Email",
    },
    signUp: "Sign Up",
    signIn: "Sign In",
    switchToSignUp: "Don't have an account? Sign up",
    switchToSignIn: "Already have an account? Sign in",
    emailPlaceholder: "Email address",
    passwordPlaceholder: "Password",
    confirmationSent: "Confirmation email sent. Please check your inbox.",
    or: "or",
    terms: "Terms of Service",
    termsAgree: "By logging in, you agree to the Terms of Service and Privacy Policy",
    account: "Account",
    accountInfo: "Account Information",
    email: "Email",
    plan: "Plan",
    planFree: "Free",
    planPremium: "Premium",
    premiumOnly: "Premium only",
    errors: {
      cancelled: "Authentication was cancelled",
      generic: "Authentication failed. Please try again.",
      timeout: "Authentication timed out. Please try again.",
      notInitialized: "Authentication service is not initialized",
      logoutFailed: "Failed to log out",
      invalidCredentials: "Invalid email or password",
      alreadyRegistered: "This email is already registered. Please sign in.",
      passwordTooShort: "Password must be at least 6 characters",
    },
  },

  terms: {
    title: "Terms of Service",
    metaTitle: "Terms of Service | SwimHub Timer",
    metaDescription: "SwimHub Timer Terms of Service",
    lastUpdated: "Last updated: February 24, 2026",
    introTitle: "Introduction",
    introBody:
      "These Terms of Service (hereinafter \"the Terms\") set forth the conditions for using SwimHub Timer (hereinafter \"the App\"). By using the App, you are deemed to have agreed to the Terms.",
    serviceTitle: "Service Description",
    serviceBody:
      "The App is a tool for overlaying a stopwatch on swimming race videos and exporting the result.",
    accountTitle: "Accounts",
    accountBody:
      "An account is required to use certain features of the App. Users must provide accurate information and are responsible for managing their account credentials.",
    prohibitedTitle: "Prohibited Activities",
    prohibitedBody: "The following activities are prohibited:",
    prohibitedItems: [
      "Actions that violate laws or public order",
      "Actions that interfere with the operation of the App",
      "Actions that cause disadvantage to other users",
      "Unauthorized access or attempts thereof",
      "Unauthorized commercial use of the App",
    ],
    disclaimerTitle: "Disclaimer",
    disclaimerBody:
      "The App is provided \"as is.\" The operator assumes no liability for any damages arising from the use of the App.",
    changesTitle: "Changes to Terms",
    changesBody:
      "The operator may modify these Terms as necessary. Modified Terms take effect upon publication within the App.",
    contactTitle: "Contact Us",
    contactBody:
      "For questions about these Terms, please contact us through the app's support page.",
    backToTop: "Back to home",
  },

  privacy: {
    title: "Privacy Policy",
    metaTitle: "Privacy Policy | SwimHub Timer",
    metaDescription: "SwimHub Timer Privacy Policy",
    lastUpdated: "Last updated: February 17, 2026",
    introTitle: "Introduction",
    introBody:
      "SwimHub Timer (hereinafter \"the App\") is an application for overlaying a stopwatch on swimming race videos. This Privacy Policy explains how personal information is handled in the App.",
    collectionTitle: "Information We Collect",
    collectionBody:
      "The App does not collect personal information. All video processing is performed locally on your device, and no data is transmitted to external servers.",
    accessTitle: "Device Access",
    accessBody:
      "The App may access the following features:",
    accessPhotoLibrary:
      "Photo Library: To import videos and save exported videos",
    accessMicrophone:
      "Microphone: To detect start signal sounds within videos",
    accessNote:
      "These accesses are used only for on-device processing, and no data is transmitted externally.",
    thirdPartyTitle: "Third-Party Disclosure",
    thirdPartyBody:
      "Since the App does not collect personal information, no information is disclosed to third parties.",
    contactTitle: "Contact Us",
    contactBody:
      "For questions about this policy, please contact us through the app's support page.",
    backToTop: "Back to home",
  },
} as const;

export default en;
