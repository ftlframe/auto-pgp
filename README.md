# Auto-PGP for Gmail

[![built with Plasmo](https://img.shields.io/badge/built%20with-Plasmo-blue.svg)](https://www.plasmo.com)

**Auto-PGP** is a browser extension that seamlessly integrates PGP (Pretty Good Privacy) encryption and decryption into the Gmail interface. It provides a secure, user-friendly way to manage PGP keys, handle contacts, and send/receive encrypted emails directly within Gmail.

The core of the extension is a secure, master password-protected vault that stores all your PGP keys and contact information locally on your machine.

---

## ✨ Features

* **Secure Local Vault**: All sensitive data (private keys, contacts, key passphrases) is encrypted with a master password and stored locally. The vault auto-locks after a period of inactivity for enhanced security.
* **Seamless Gmail Integration**: Adds "Encrypt" and "Decrypt" buttons directly into the Gmail UI using the InboxSDK for a native feel.
* **Full Key Management**:
    * Generate new PGP key pairs.
    * Add optional passphrases to individual keys for an extra layer of security (defense-in-depth).
    * View your keys, copy public keys to the clipboard, and delete them.
* **Contact Management**:
    * Save your contacts and their public PGP keys for easy, secure communication.
    * The system gracefully handles contacts with multiple public keys by prompting you to choose during encryption.
    * Edit and delete contacts and their associated keys.
* **Seamless "Unlock & Retry" Workflow**: If you try to encrypt or decrypt a message while your vault is locked, the extension automatically opens the login prompt and seamlessly resumes the action after you unlock the vault, without requiring a second password prompt.
* **Signature Verification**: When decrypting a message, the extension also verifies the sender's digital signature to ensure the message is authentic and has not been tampered with, displaying a clear status banner.
* **Light & Dark Mode**: A clean, modern UI with a persistent theme toggle for user comfort.



---

## 🚀 Getting Started

Follow these instructions to set up the development environment on your local machine.

### Prerequisites

* [Node.js](https://nodejs.org/en/) (v16.x or later)
* [pnpm](https://pnpm.io/installation) package manager

### 1. Obtain an InboxSDK App ID

Before you can run the extension, you need a free App ID from InboxSDK.

1.  Go to the [InboxSDK signup page](https://www.inboxsdk.com/register).
2.  Register your application. You can use a placeholder like `http://localhost` for the URL during development.
3.  You will receive an App ID string.

### 2. Environment Setup

1.  **Clone the repository:**
    ```bash
    git clone <your-repository-url>
    cd auto-pgp
    ```

2.  **Install dependencies:**
    ```bash
    pnpm install
    ```

3.  **Create the environment file:**
    Create a file named `.env.local` in the root of the project directory.

4.  **Add the App ID to the environment file:**
    Inside `.env.local`, add your InboxSDK App ID like this. **Replace the placeholder** with your actual ID.
    ```
    PLASMO_PUBLIC_INBOX_SDK_APP_ID=your_inboxsdk_app_id_here
    ```

---

## 💻 Running in Development

1.  **Start the development server:**
    ```bash
    pnpm dev
    ```
    This will create a `build/chrome-mv3-dev` directory with the unpacked extension files.

2.  **Load the extension in Chrome:**
    * Open Chrome and navigate to `chrome://extensions`.
    * Turn on "Developer mode" in the top right corner.
    * Click "Load unpacked".
    * Select the `build/chrome-mv3-dev` directory from your project.

The extension will now be active. As you make changes to the source code, the development server will automatically update the files. You can simply reload the extension or the Gmail tab to see the changes.

---

## 📦 Building for Production

When you are ready to create a production-ready version of the extension:

1.  **Run the build command:**
    ```bash
    pnpm build
    ```
    This will generate an optimized production build in the `build/chrome-mv3-prod` directory.

2.  **Package for the store:**
    ```bash
    pnpm package
    ```
    This will create a `build/chrome-mv3-prod.zip` file, which is ready to be uploaded to the Chrome Web Store.

---

## 📄 License

This project is licensed under the MIT License.