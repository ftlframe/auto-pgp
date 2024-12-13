import type { PlasmoCSConfig } from "plasmo"
import infoFinderInstance from "~features/get-info"


export const config: PlasmoCSConfig = {
  matches: ["https://mail.google.com/*"]
}
const info_finder = infoFinderInstance

window.addEventListener("load", () => {
  const email = info_finder.get_email();
  if (email) {
    chrome.runtime.sendMessage({ type: "EMAIL_UPDATE", email });
  }
});