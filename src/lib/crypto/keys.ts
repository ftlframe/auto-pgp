import * as openpgp from 'openpgp';

// TODO: pass settings to the function
export async function generatePGPKeyPair(email: string) {
    const { privateKey, publicKey } = await openpgp.generateKey({
        type: 'rsa', // or 'ecc'
        rsaBits: 2048, // size of the RSA key
        userIDs: [{ email }],
        passphrase: '', // encrypts the private key
    });

    const fingerprint = await getFingerprint(publicKey)

    return { privateKey, publicKey, fingerprint };
}

export async function getFingerprint(publicKey: string) {
    const publicKeyObj = await openpgp.readKey({armoredKey: publicKey});
    const fingerprint = publicKeyObj.getFingerprint().toUpperCase();

    return fingerprint
}
