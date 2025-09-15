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
 * Builds and displays a modal for the user to make key selections,
 * following the best practices from the InboxSDK Widgets documentation.
 */
async function showKeySelectionModal(widgets: InboxSDK.Widgets, composeView: InboxSDK.ComposeView, payload: any) {
  // Store original content to resend after user makes selections
  const originalBody = await composeView.getTextContent();
  const originalRecipients = (await Promise.all([
    composeView.getToRecipients(),
    composeView.getCcRecipients(),
    composeView.getBccRecipients()
  ])).flat().map(c => c.emailAddress);

  // 1. Create the root element for the modal content
  const modalEl = document.createElement('div');
  modalEl.style.padding = '20px';
  modalEl.style.fontSize = '14px';

  // 2. Create the form element that will contain all our inputs
  const formEl = document.createElement('form');
  formEl.id = 'key-selection-form';

  // Helper function to create a styled fieldset for grouping options
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

  // 3. Programmatically create and append each section of the form
  if (payload.userKeyOptions?.length > 0) {
    const fieldset = createFieldset("Select your signing key");
    payload.userKeyOptions.forEach((key, index) => {
      const label = document.createElement('label');
      label.style.display = 'block';
      label.style.margin = '5px 0';
      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = 'userKeyFingerprint';
      radio.value = key.fingerprint;
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
        label.style.display = 'block';
        label.style.margin = '5px 0';
        const radio = document.createElement('input');
        radio.type = 'radio';
        radio.name = `recipientKey_${email}`;
        radio.value = key.fingerprint;
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
      textarea.name = `newContactKey_${email}`;
      textarea.required = true;
      textarea.placeholder = '-----BEGIN PGP PUBLIC KEY BLOCK-----...';
      textarea.style.cssText = 'width:100%; height:120px; font-family:monospace; font-size:12px; margin-top:5px; padding: 5px; border: 1px solid #ddd; border-radius: 3px;';
      fieldset.appendChild(textarea);
      formEl.appendChild(fieldset);
    });
  }

  modalEl.appendChild(formEl);

  // 4. Use the official Widgets API to show the modal
  const modal = widgets.showModalView({
    title: 'Encryption Key Selection Required',
    el: modalEl,
    buttons: [
      { text: 'Cancel', onClick: () => modal.close() },
      {
        text: 'Confirm & Encrypt',
        onClick: async () => {
          if (!formEl.checkValidity()) {
            formEl.reportValidity();
            return;
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

          const finalResponse: EncryptionResponse = await chrome.runtime.sendMessage({
            type: "PGP_ENCRYPT_REQUEST",
            payload: { recipients: originalRecipients, content: originalBody, selections: selections }
          });

          if (finalResponse.success && finalResponse.encryptedContent) {
            composeView.setBodyText(finalResponse.encryptedContent);
            composeView.setSubject("[PGP Encrypted] " + await composeView.getSubject());
          } else {
            composeView.setBodyText(`Encryption failed after selection: ${finalResponse.error}`);
          }
        },
        type: 'PRIMARY_ACTION',
      }
    ]
  });
}

// --- Main execution block ---
InboxSDK.load(2, SDK_APP_ID).then((sdk) => {
  console.log("[Auto-PGP] InboxSDK loaded successfully.");

  let lastActiveComposeView: InboxSDK.ComposeView | null = null;
  const userEmail = sdk.User.getEmailAddress();
  chrome.runtime.sendMessage({ type: 'SET_EMAIL', payload: { email: userEmail } });

  chrome.runtime.onMessage.addListener((message) => {
    const composeView = lastActiveComposeView;
    if (!composeView) return;

    if (message.type === "ENCRYPTION_RESULT") {
      console.log("[Auto-PGP] Received final encryption result after retry.", message.payload);
      const response = message.payload;
      if (response.success && response.encryptedContent) {
        // --- FIX: Use synchronous calls ---
        const subject = composeView.getSubject();
        composeView.setSubject("[PGP Encrypted] " + subject);
        composeView.setBodyText(response.encryptedContent);
        // --- END FIX ---
      } else {
        // --- FIX: Use synchronous calls ---
        const originalBody = composeView.getTextContent();
        const errorMessage = `--- ENCRYPTION FAILED ---\n${response.error || 'An unknown error occurred.'}\n\n--- ORIGINAL MESSAGE ---\n`;
        composeView.setBodyText(errorMessage + originalBody);
        // --- END FIX ---
      }
      lastActiveComposeView = null;
    } else if (message.type === "SHOW_SELECTION_MODAL") {
      console.log("[Auto-PGP] Received request to show selection modal after unlock.");
      showKeySelectionModal(sdk.Widgets, composeView, message.payload);
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

        // --- FIX: Use synchronous calls ---
        const originalBody = compose.getTextContent();
        const originalSubject = compose.getSubject();
        // --- END FIX ---

        // Asynchronous calls for recipients are still correct
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
          compose.setSubject(originalSubject);
          compose.setBodyText("Please add at least one recipient before encrypting.\n\n" + originalBody);
          return;
        }

        compose.setBodyText("Checking keys and encrypting...");

        const response: PgpResponse = await chrome.runtime.sendMessage({
          type: "PGP_ENCRYPT_REQUEST",
          payload: { recipients: allRecipients, content: originalBody }
        });

        if (response.error === 'vault_locked') {
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
          compose.setBodyText(response.encryptedContent);
        } else {
          const errorMessage = `--- ENCRYPTION FAILED ---\n${response.error || 'An unknown error occurred.'}\n\n--- ORIGINAL MESSAGE ---\n`;
          compose.setSubject(originalSubject);
          compose.setBodyText(errorMessage + originalBody);
        }
      },
    });
  });

  let elementToDecrypt: HTMLElement | null = null;

  sdk.Conversations.registerThreadViewHandler((threadView) => {
    const messageViews = threadView.getMessageViews();

    messageViews.forEach((messageView) => {
      const bodyElement = messageView.getBodyElement();
      // Check if the message body contains a PGP block
      if (bodyElement.innerText.includes("-----BEGIN PGP MESSAGE-----")) {

        messageView.addToolbarButton({
          title: "Decrypt Message",
          iconUrl: 'https://cdn.iconscout.com/icon/free/png-512/free-unlock-icon-svg-download-png-1213973.png',
          section: sdk.Conversations.MessageViewToolbarSectionNames.MORE,
          onClick: async (event) => {
            // Find the specific DOM element containing the PGP block to replace it later
            const pgpBlockElement = Array.from(bodyElement.querySelectorAll('div, pre')).find(el => (el as HTMLElement).innerText.includes("-----BEGIN PGP MESSAGE-----")) as HTMLElement;

            if (pgpBlockElement) {
              elementToDecrypt = pgpBlockElement; // Store a reference to the element
              const armoredMessage = pgpBlockElement.innerText;

              pgpBlockElement.innerHTML = '<p style="font-family: sans-serif; color: #555;">Requesting decryption...</p>';

              // Send the PGP block to the background for the first decryption attempt
              const response: PgpResponse = await chrome.runtime.sendMessage({
                type: "PGP_DECRYPT_REQUEST",
                payload: { armoredMessage }
              });

              // If the background needs a password, it will tell us to open the popup
              if (response.error === 'password_required') {
                chrome.runtime.sendMessage({
                  type: "OPEN_POPUP_FOR_DECRYPT",
                  payload: { armoredMessage, keyFingerprint: response.keyFingerprint }
                });
              } else if (!response.success) {
                // Handle other immediate failures (e.g., no private key found)
                elementToDecrypt.innerHTML = `<p style="font-family: sans-serif; color: red;"><b>Decryption Failed:</b> ${response.error}</p>`;
                elementToDecrypt = null; // Clear reference on failure
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