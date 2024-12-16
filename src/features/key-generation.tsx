import * as openpgp from 'openpgp'

export async function generate_key() {
    const USERMAIL = localStorage.getItem('USERMAIL')
    const key_object = await openpgp.generateKey({
        userIDs: {email: USERMAIL},
        type: 'rsa'
    })
    const private_key = key_object.privateKey
    const public_key = key_object.publicKey
    
    update_key_storage(USERMAIL, public_key, private_key)
}

export async function clear_storage() {
    chrome.storage.local.clear()
}

export async function get_keys(id) {
    chrome.storage.local.get('keyring').then((result) => {
        const keyring = result.keyring[id]
        return keyring.pub_keys
    })
}

function update_key_storage(id, pub_key, priv_key) {
    chrome.storage.local.get('keyring', (data) => {
        const keyring = data.keyring || {};
        const existing_pub_keys = keyring[id]?.pub_keys || [];
        const existing_priv_keys = keyring[id]?.priv_keys || [];

        existing_pub_keys.push(pub_key); // Append the full pub_key as a string
        existing_priv_keys.push(priv_key); // Append the full pub_key as a string
        
        keyring[id] = {
            pub_keys: existing_pub_keys,
            priv_keys: existing_priv_keys 
        };

        chrome.storage.local.set({ keyring }, () => {
            console.log('Updated keyring in storage')
            // console.log(keyring)
        });
    });


}