import * as InboxSDK from "@inboxsdk/core";
import type { PlasmoCSConfig } from "plasmo";
import { formatDate } from "~lib/utils";

export const config: PlasmoCSConfig = {
  matches: ["https://mail.google.com/*"],
  run_at: "document_end"
};

const SDK_APP_ID = process.env.PLASMO_PUBLIC_INBOX_SDK_APP_ID;

// --- Type Definitions ---
type EncryptionResponse = {
  success: boolean;
  encryptedContent?: string;
  error?: string;
  payload?: any; // To receive the selection payload from the background
};
type Contact = { name: string; emailAddress: string; };

/**
 * Builds and displays a modal for the user to make key selections,
 * following the best practices from the InboxSDK Widgets documentation.
 */
async function showKeySelectionModal(sdk: InboxSDK.Widgets, composeView: InboxSDK.ComposeView, payload: any) {
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
  const modal = sdk.showModalView({
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
        
        // **BUG FIX:** Added 'await' to all recipient calls. This is critical.
        const toContacts: Contact[] = await compose.getToRecipients();
        const ccContacts: Contact[] = await compose.getCcRecipients();
        const bccContacts: Contact[] = await compose.getBccRecipients();

        let allRecipients = [
          ...toContacts.map(c => c.emailAddress),
          ...ccContacts.map(c => c.emailAddress),
          ...bccContacts.map(c => c.emailAddress)
        ];

        // **BUG FIX:** Changed getMetadataForm() to getMetadataFormElement()
        const metadataForm = compose.getMetadataForm(); 
        const inputs = metadataForm.querySelectorAll('input[name="to"], input[name="cc"], input[name="bcc"]');
        
        inputs.forEach(input => {
          const email = (input as HTMLInputElement).value;
          if (email && /.+@.+\..+/.test(email)) {
            allRecipients.push(email);
          }
        });
        
        allRecipients = [...new Set(allRecipients)];
        
        if (allRecipients.length === 0) {
          compose.setSubject(originalSubject);
          compose.setBodyText("Please add at least one recipient before encrypting.\n\n" + originalBody);
          return;
        }
        
        compose.setBodyText("Checking keys and encrypting...");
        console.log("[Auto-PGP] Requesting encryption for:", { recipients: allRecipients, content: originalBody });

        const response: EncryptionResponse = await chrome.runtime.sendMessage({
            type: "PGP_ENCRYPT_REQUEST",
            payload: { recipients: allRecipients, content: originalBody }
        });

        // This is the new, more powerful response handling logic
        if (response.error === 'vault_locked') {
          console.log('[Auto-PGP] Vault is locked. Asking background to open popup');
          chrome.runtime.sendMessage({ type: "OPEN_POPUP_FOR_UNLOCK" });
          compose.setBodyText(originalBody); // Restore body while user unlocks
          return;
        } else if (response.error === 'key_selection_required') {
          console.log('[Auto-PGP] Ambiguity detected. Showing key selection modal.');
          compose.setBodyText(originalBody); // Restore body while user decides
          showKeySelectionModal(sdk.Widgets, compose, response.payload);
          return;
        }

        // Handle immediate success or other failures
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