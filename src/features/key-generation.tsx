import * as openpgp from 'openpgp'

export async function generate_key() {
    const USERMAIL = localStorage.getItem('USERMAIL')
    const key_object = await openpgp.generateKey({
        userIDs: {email: USERMAIL},
        type: 'rsa'
    })
    const private_key = key_object.privateKey
    const public_key = key_object.publicKey
    
    return [public_key, private_key]
}

export async function clear_storage() {
    chrome.storage.local.clear()
}
