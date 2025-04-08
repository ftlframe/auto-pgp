# PGP Browser Extension Roadmap

## 1. Keys Tab Enhancements

### Core Features
- Key Management Interface
  - List existing keys with fingerprints/emails
  - Delete/Revoke keys with confirmation
  - View key details (creation date, expiration, key type)
  - Export public keys (file/clipboard)

### Advanced Features
- Key Generation Wizard
  - Email association with auto-suggest
  - Key type selection (RSA/ECC)
  - Key strength selector
  - Expiration date setting
  - Usage flags (Signing/Encryption/Authentication)
- Key Rotation Support
- Import Capabilities
  - Existing PGP key import
  - Weak key detection
- Key Server Integration
  - Publish/search public keys

## 2. Contacts Tab Enhancements

### Core Features
- Contact Management
  - Add/delete contacts
  - Edit labels/notes
  - Grouping/tagging
- Verification System
  - Fingerprint verification
  - Trust level indicators

### Advanced Features
- Batch Operations
  - CSV/JSON import/export
- Key Validation
  - Expiration warnings
  - Revocation checks
- Social Features
  - QR code sharing
  - Domain-based discovery

## 3. Email Provider Integration ("Encrypt & Send")

### Implementation Roadmap
1. **Content Script Injection**
   - Target Gmail/Outlook compose windows
   - Use `MutationObserver` for dynamic DOM

2. **UI Integration**
   - Add "Encrypt & Send" button
   - Create options overlay:
     - Recipient key dropdown
     - Signing toggle
     - Algorithm preferences

3. **Message Processing Flow**
   - Parse recipients
   - Handle key matching:
     - Auto-selection logic
     - Manual override
   - Password reprompt flow

4. **Security Workflow**
   - Draft preservation
   - Fallback warnings
   - Usage audit trail

5. **Error Handling**
   - Clear status indicators
   - Recovery options
   - Signature warnings

## 4. Additional Security Features
- Session timeout auto-relock
- Security audit log
- U2F/WebAuthn integration
- Brute-force protection
- Key usage counters

## 5. UX Considerations
- Onboarding tutorial
- Visual trust indicators
- Encrypted message preview
- Keyboard shortcuts
- Dark/light theme support

## Implementation Order
1. Basic key management UI
2. Email detection & button injection
3. Core encryption workflow
4. Contact management system
5. Advanced key features
6. Security hardening
7. Provider-specific optimizations

``` Message Passing Structure
[Content Script] ↔ [Background Worker] ↔ [Vault Service]
                     ↑
[Popup UI] ←-------→