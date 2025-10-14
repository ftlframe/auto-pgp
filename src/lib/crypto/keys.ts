import * as openpgp from 'openpgp';
import type { AppSettings } from '~contexts/SettingsContent';

// TODO: pass settings to the function
export async function generatePGPKeyPair(email: string, passphrase?: string, options?: Partial<AppSettings>) {
    const { privateKey, publicKey } = await openpgp.generateKey({
        type: options?.keyType || 'rsa',
        rsaBits: options?.keyType === 'rsa' ? (options?.rsaBits || 2048) : undefined,
        userIDs: [{ email }],
        passphrase: passphrase || ''
    });

    const fingerprint = await getFingerprint(publicKey)

    return { privateKey, publicKey, fingerprint };
}

export async function getFingerprint(publicKey: string) {
    const publicKeyObj = await openpgp.readKey({ armoredKey: publicKey });
    const fingerprint = publicKeyObj.getFingerprint().toUpperCase();

    return fingerprint
}
