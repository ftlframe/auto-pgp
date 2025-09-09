interface PublicKeyInfo {
  fingerprint: string;
  publicKey: string;
  // When sending via chrome.runtime.sendMessage, Date objects are typically
  // serialized into ISO date strings. So the frontend receives strings.
  dateCreated: string;
  dateExpire: string | null;
}
