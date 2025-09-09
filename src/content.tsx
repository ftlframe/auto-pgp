import * as InboxSDK from "@inboxsdk/core";
import type { PlasmoCSConfig } from "plasmo";

export const config: PlasmoCSConfig = {
  matches: ["https://mail.google.com/*"],
  run_at: "document_end"
};

const SDK_APP_ID = process.env.PLASMO_PUBLIC_INBOX_SDK_APP_ID;

type EncryptionResponse = {
    success: any;
    encryptedContent: any;
    error: string;
};

type Contact = { name: string; emailAddress: string; };

InboxSDK.load(2, SDK_APP_ID).then((sdk) => {
  console.log("[Auto-PGP] InboxSDK loaded successfully.");

  const userEmail = sdk.User.getEmailAddress();
  chrome.runtime.sendMessage({ type: 'SET_EMAIL', payload: { email: userEmail } });

  sdk.Compose.registerComposeViewHandler((composeView) => {
    composeView.addButton({
      title: "Encrypt with PGP",
      iconUrl: 'https://cdn.iconscout.com/icon/free/png-512/free-lock-icon-svg-download-png-2235834.png',
      onClick: async (event) => {
        const compose = event.composeView;
        const originalBody = await compose.getTextContent();
        const originalSubject = await compose.getSubject();
                
        // 1. Get all confirmed "pill" recipients
        const toContacts    = compose.getToRecipients();
        const ccContacts    = compose.getCcRecipients();
        const bccContacts   = compose.getBccRecipients();

        let allRecipients = [
          ...toContacts.map(c => c.emailAddress),
          ...ccContacts.map(c => c.emailAddress),
          ...bccContacts.map(c => c.emailAddress)
        ];

        // 2. Also check for unconfirmed text in the input fields
        const metadataForm = compose.getMetadataForm();
        const inputs = metadataForm.querySelectorAll('input[name="to"], input[name="cc"], input[name="bcc"]');
        
        inputs.forEach(input => {
          const email = (input as HTMLInputElement).value;
          if (email && /.+@.+\..+/.test(email)) {
            allRecipients.push(email);
          }
        });
        
        // Remove duplicates
        allRecipients = [...new Set(allRecipients)];
        

        if (allRecipients.length === 0) {
          compose.setSubject(originalSubject);
          compose.setBodyText("Please add at least one recipient before encrypting.\n\n" + originalBody);
          return;
        }
        
        console.log("[Auto-PGP] Requesting encryption for:", { recipients: allRecipients, content: originalBody });

        const response: EncryptionResponse = await chrome.runtime.sendMessage({
            type: "PGP_ENCRYPT_REQUEST",
            payload: { recipients: allRecipients, content: originalBody }
        });

        if (response.success && response.encryptedContent) {
          compose.setSubject("[PGP Encrypted] " + originalSubject);
          compose.setBodyText(response.encryptedContent);
        } else {
          const errorMessage = `--- ENCRYPTION FAILED ---\n${response.error || 'An unknown error occurred.'}\n\n--- ORIGINAL MESSAGE ---\n`;
          compose.setSubject(originalSubject);
          compose.setBodyText(errorMessage + originalBody);
        }
      },
    });
  });
});

export default function PlasmoContent() {
  return null;
}