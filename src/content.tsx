import * as InboxSDK from "@inboxsdk/core";
import type { PlasmoCSConfig } from "plasmo";
import { formatDate } from "~lib/utils";

export const config: PlasmoCSConfig = {
  matches: ["https://mail.google.com/*"],
  run_at: "document_end"
};

const SDK_APP_ID = process.env.PLASMO_PUBLIC_INBOX_SDK_APP_ID;

// --- Type Definitions ---
type PgpResponse = {
  success: boolean;
  encryptedContent?: string;
  decryptedContent?: string;
  error?: string;
  payload?: any;
  keyFingerprint?: string;
};
type Contact = { name: string; emailAddress: string; };

/**
 * Builds and displays a modal for the user to make key selections.
 */
async function showKeySelectionModal(widgets: InboxSDK.Widgets, composeView: InboxSDK.ComposeView, payload: any) {
  const originalBody = composeView.getTextContent();
  const originalRecipients = (await Promise.all([
    composeView.getToRecipients(),
    composeView.getCcRecipients(),
    composeView.getBccRecipients()
  ])).flat().map(c => c.emailAddress);

  const modalEl = document.createElement('div');
  modalEl.style.padding = '20px';
  modalEl.style.fontSize = '14px';

  const formEl = document.createElement('form');
  formEl.id = 'key-selection-form';

  const createFieldset = (legendText: string) => {
    const fieldset = document.createElement('fieldset');
    fieldset.style.border = '1px solid #ccc';
    fieldset.style.padding = '10px';
    fieldset.style.marginBottom = '15px';
    fieldset.style.borderRadius = '5px';
    const legend = document.createElement('legend');
    legend.textContent = legendText;
    legend.style.fontWeight = 'bold';
    legend.style.marginLeft = '10px';
    legend.style.padding = '0 5px';
    fieldset.appendChild(legend);
    return fieldset;
  };

  if (payload.userKeyOptions?.length > 0) {
    const fieldset = createFieldset("Select your signing key");
    payload.userKeyOptions.forEach((key, index) => {
      const label = document.createElement('label');
      label.style.display = 'block'; label.style.margin = '5px 0';
      const radio = document.createElement('input');
      radio.type = 'radio'; radio.name = 'userKeyFingerprint'; radio.value = key.fingerprint;
      if (index === 0) radio.checked = true;
      label.appendChild(radio);
      label.append(` Key ending in ...${key.fingerprint.slice(-16)} (Created: ${formatDate(key.created)})`);
      fieldset.appendChild(label);
    });
    formEl.appendChild(fieldset);
  }

  if (payload.recipientKeyOptions && Object.keys(payload.recipientKeyOptions).length > 0) {
    for (const email in payload.recipientKeyOptions) {
      const keys = payload.recipientKeyOptions[email];
      const fieldset = createFieldset(`Select key for ${email}`);
      keys.forEach((key, index) => {
        const label = document.createElement('label');
        label.style.display = 'block'; label.style.margin = '5px 0';
        const radio = document.createElement('input');
        radio.type = 'radio'; radio.name = `recipientKey_${email}`; radio.value = key.fingerprint;
        if (index === 0) radio.checked = true;
        label.appendChild(radio);
        label.append(` Key ending in ...${key.fingerprint.slice(-16)} (Created: ${formatDate(key.created)})`);
        fieldset.appendChild(label);
      });
      formEl.appendChild(fieldset);
    }
  }

  if (payload.newContacts?.length > 0) {
    payload.newContacts.forEach(email => {
      const fieldset = createFieldset(`New Contact: Provide Public Key for ${email}`);
      const textarea = document.createElement('textarea');
      textarea.name = `newContactKey_${email}`; textarea.required = true;
      textarea.placeholder = '-----BEGIN PGP PUBLIC KEY BLOCK-----...';
      textarea.style.cssText = 'width:100%; height:120px; font-family:monospace; font-size:12px; margin-top:5px; padding: 5px; border: 1px solid #ddd; border-radius: 3px;';
      fieldset.appendChild(textarea);
      formEl.appendChild(fieldset);
    });
  }

  modalEl.appendChild(formEl);

  const modal = widgets.showModalView({
    title: 'Encryption Key Selection Required',
    el: modalEl,
    buttons: [
      { text: 'Cancel', onClick: () => modal.close() },
      {
        text: 'Confirm & Encrypt',
        onClick: async () => {
          if (!formEl.checkValidity()) {
            formEl.reportValidity(); return;
          }
          const formData = new FormData(formEl);
          const selections = {
            userKeyFingerprint: formData.get('userKeyFingerprint') as string,
            recipientKeyFingerprints: {},
            newContactKeys: {}
          };
          for (const [key, value] of formData.entries()) {
            if (key.startsWith('recipientKey_')) {
              selections.recipientKeyFingerprints[key.replace('recipientKey_', '')] = value as string;
            } else if (key.startsWith('newContactKey_')) {
              selections.newContactKeys[key.replace('newContactKey_', '')] = value as string;
            }
          }
          modal.close();
          composeView.setBodyText("Encrypting with selected keys...");

          const finalResponse: PgpResponse = await chrome.runtime.sendMessage({
            type: "PGP_ENCRYPT_REQUEST",
            payload: { recipients: originalRecipients, content: originalBody, selections: selections }
          });

          if (finalResponse.success && finalResponse.encryptedContent) {
            const formattedPgpBlock = `<pre style="font-family: monospace; white-space: pre-wrap; font-size: 12px;">${finalResponse.encryptedContent}</pre>`;
            composeView.setBodyHTML(formattedPgpBlock);
            composeView.setSubject("[PGP Encrypted] " + composeView.getSubject());
          } else {
            composeView.setBodyText(`Encryption failed after selection: ${finalResponse.error}`);
          }
        },
        type: 'PRIMARY_ACTION',
      }
    ]
  });
}

function normalizePgpBlock(text: string): string | null {
  const pgpRegex = /-----BEGIN PGP MESSAGE-----(.|\n|\r)*?-----END PGP MESSAGE-----/;
  const match = text.match(pgpRegex);
  if (!match || !match[0]) return null;

  let block = match[0];
  const header = "-----BEGIN PGP MESSAGE-----";
  if (!block.startsWith(header + "\n") && !block.startsWith(header + "\r\n")) {
    block = block.replace(header, header + "\n\n");
  }
  return block;
}

// --- Main execution block ---
InboxSDK.load(2, SDK_APP_ID).then((sdk) => {
  console.log("[Auto-PGP] InboxSDK loaded successfully.");

  let lastActiveComposeView: InboxSDK.ComposeView | null = null;
  let elementToDecrypt: HTMLElement | null = null;

  const userEmail = sdk.User.getEmailAddress();
  chrome.runtime.sendMessage({ type: 'SET_EMAIL', payload: { email: userEmail } });

  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === "ENCRYPTION_RESULT" && lastActiveComposeView) {
      const composeView = lastActiveComposeView;
      const response = message.payload;
      if (response.success && response.encryptedContent) {
        const subject = composeView.getSubject();
        composeView.setSubject("[PGP Encrypted] " + subject);
        const formattedPgpBlock = `<pre style="font-family: monospace; white-space: pre-wrap; font-size: 12px;">${response.encryptedContent}</pre>`;
        composeView.setBodyHTML(formattedPgpBlock);
      } else {
        const originalBody = composeView.getTextContent();
        const errorMessage = `--- ENCRYPTION FAILED ---\n${response.error || 'An unknown error occurred.'}\n\n--- ORIGINAL MESSAGE ---\n`;
        composeView.setBodyText(errorMessage + originalBody);
      }
      lastActiveComposeView = null;
    } else if (message.type === "DECRYPTION_RESULT" && elementToDecrypt) {
      const response = message.payload;
      if (response.success && response.decryptedContent) {
        elementToDecrypt.innerHTML = `<blockquote style="font-family: sans-serif; white-space: pre-wrap; padding: 15px; border-left: 4px solid #ccc; background: #f9f9f9; margin: 10px 0;">${response.decryptedContent}</blockquote>`;
      } else {
        elementToDecrypt.innerHTML = `<p style="font-family: sans-serif; color: red;"><b>Decryption Failed:</b> ${response.error}</p>`;
      }
      elementToDecrypt = null;
    } else if (message.type === "SHOW_SELECTION_MODAL" && lastActiveComposeView) {
      showKeySelectionModal(sdk.Widgets, lastActiveComposeView, message.payload);
      lastActiveComposeView = null;
    }
  });

  sdk.Compose.registerComposeViewHandler((composeView) => {
    composeView.addButton({
      title: "Encrypt with PGP",
      iconUrl: 'https://cdn.iconscout.com/icon/free/png-512/free-lock-icon-svg-download-png-2235834.png',
      onClick: async (event) => {
        lastActiveComposeView = event.composeView;
        const compose = event.composeView;
        const originalBody = compose.getTextContent();
        const originalSubject = compose.getSubject();

        const toContacts: Contact[] = await compose.getToRecipients();
        const ccContacts: Contact[] = await compose.getCcRecipients();
        const bccContacts: Contact[] = await compose.getBccRecipients();

        let allRecipients = [
          ...toContacts.map(c => c.emailAddress),
          ...ccContacts.map(c => c.emailAddress),
          ...bccContacts.map(c => c.emailAddress)
        ];

        const metadataForm = compose.getMetadataForm();
        const inputs = metadataForm.querySelectorAll('input[name="to"], input[name="cc"], input[name="bcc"]');

        inputs.forEach(input => {
          const email = (input as HTMLInputElement).value;
          if (email && /.+@.+\..+/.test(email)) { allRecipients.push(email); }
        });

        allRecipients = [...new Set(allRecipients)];

        if (allRecipients.length === 0) {
          compose.setBodyText("Please add at least one recipient before encrypting.\n\n" + originalBody);
          return;
        }

        compose.setBodyText("Checking keys and encrypting...");

        const response: PgpResponse = await chrome.runtime.sendMessage({
          type: "PGP_ENCRYPT_REQUEST",
          payload: { recipients: allRecipients, content: originalBody }
        });

        if (response.error === 'vault_locked') {
          // Use the specific message for the encryption flow
          chrome.runtime.sendMessage({ type: "OPEN_POPUP_FOR_UNLOCK" });
          compose.setBodyText(originalBody);
          return;
        } else if (response.error === 'key_selection_required') {
          compose.setBodyText(originalBody);
          showKeySelectionModal(sdk.Widgets, compose, response.payload);
          return;
        }

        if (response.success && response.encryptedContent) {
          compose.setSubject("[PGP Encrypted] " + originalSubject);
          const formattedPgpBlock = `<pre style="font-family: monospace; white-space: pre-wrap; font-size: 12px;">${response.encryptedContent}</pre>`;
          compose.setBodyHTML(formattedPgpBlock);
        } else {
          const errorMessage = `--- ENCRYPTION FAILED ---\n${response.error || 'An unknown error occurred.'}\n\n--- ORIGINAL MESSAGE ---\n`;
          compose.setSubject(originalSubject);
          compose.setBodyText(errorMessage + originalBody);
        }
      },
    });
  });

  sdk.Conversations.registerThreadViewHandler((threadView) => {
    const messageViews = threadView.getMessageViews();
    messageViews.forEach((messageView) => {
      const bodyElement = messageView.getBodyElement();
      if (bodyElement.innerText.includes("-----BEGIN PGP MESSAGE-----")) {
        messageView.addToolbarButton({
          title: "Decrypt Message",
          iconUrl: 'https://cdn.iconscout.com/icon/premium/png-256-thumb/unlock-1763261-1499511.png',
          section: sdk.Conversations.MessageViewToolbarSectionNames.MORE,
          onClick: async (event) => {
            const pgpBlockElement = Array.from(bodyElement.querySelectorAll('div, pre')).find(el => (el as HTMLElement).innerText.includes("-----BEGIN PGP MESSAGE-----")) as HTMLElement;
            if (pgpBlockElement) {
              elementToDecrypt = pgpBlockElement;

              const armoredMessage = normalizePgpBlock(pgpBlockElement.innerText);

              if (!armoredMessage) {
                pgpBlockElement.innerHTML = `<p style="font-family: sans-serif; color: red;"><b>Decryption Failed:</b> Could not find a valid PGP block after cleaning.</p>`;
                return;
              }

              pgpBlockElement.innerHTML = '<p style="font-family: sans-serif; color: #555;">Requesting decryption...</p>';

              const response: PgpResponse = await chrome.runtime.sendMessage({
                type: "PGP_DECRYPT_REQUEST",
                payload: { armoredMessage }
              });

              if (response.error === 'password_required') {
                // Use the specific message for the decryption flow
                chrome.runtime.sendMessage({
                  type: "OPEN_POPUP_FOR_DECRYPT",
                  payload: { armoredMessage, keyFingerprint: response.keyFingerprint }
                });
              } else if (!response.success) {
                elementToDecrypt.innerHTML = `<p style="font-family: sans-serif; color: red;"><b>Decryption Failed:</b> ${response.error}</p>`;
                elementToDecrypt = null;
              }
            }
          },
        });
      }
    });
  });
});

export default function PlasmoContent() {
  return null;
}