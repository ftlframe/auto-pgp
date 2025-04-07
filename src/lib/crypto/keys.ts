import * as openpgp from 'openpgp';

export async function generatePGPKeyPair(name: string, email: string) {
    const { privateKey, publicKey } = await openpgp.generateKey({
        type: 'rsa', // or 'ecc'
        rsaBits: 2048, // size of the RSA key
        userIDs: [{ name, email }],
        passphrase: '', // encrypts the private key
    });

    return { privateKey, publicKey };
}