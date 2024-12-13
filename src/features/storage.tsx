import bcryptjs from "bcryptjs"

export async function hash_password(password: string): Promise<string> {
    const salt = await bcryptjs.genSalt(10);
    const hashedPassword = await bcryptjs.hash(password, salt);
    return hashedPassword;
}

export async function verify_password(password: string, hashedPassword: string): Promise<boolean> {
    return await bcryptjs.compare(password, hashedPassword);
}

export async function store_password(passphrase: string): Promise<string> {
    const hashed_password = await hash_password(passphrase)
    chrome.storage.local.set({ password_hash: hashed_password }, () => {
        console.log('Stored hashed password');
    });
    return hashed_password.toString()
}

export async function get_storage() {
    const storage = await chrome.storage.local.get(['password_hash'])
    return storage
}


