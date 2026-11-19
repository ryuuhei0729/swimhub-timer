/**
 * Thrown by saveToPhotoLibrary when Photos access isn't granted, so callers can
 * tell "the user denied access" (→ point them to Settings) apart from other
 * save failures.
 */
export class PhotoLibraryPermissionError extends Error {
  constructor(message = "フォトライブラリへのアクセスが許可されていません") {
    super(message);
    this.name = "PhotoLibraryPermissionError";
  }
}
