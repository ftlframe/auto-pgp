import React, { useEffect } from "react";
import { useState } from "react";
import { get_storage, store_password, verify_password } from "~features/storage";

function ContactOperations() {
    const [showPasswordModal, setShowPasswordModal] = useState(true);
    const [password, setPassword] = useState("");

    useEffect(() => {
        const savedModalState = localStorage.getItem("showPasswordModal");
        if(savedModalState) {
            setShowPasswordModal(savedModalState === 'true')
        }
        else {
            localStorage.setItem('showPasswordModal', 'true')
        }
    }, []);

    async function handle_password_submit(e) {
        e.preventDefault();

        const form = e.target;
        const formData = new FormData(form);
        const inputted_passphrase = formData.get('passphrase').toString()
        console.log(inputted_passphrase)
        if (!password) {
            const hashed_password = await store_password(inputted_passphrase)
            setPassword(hashed_password)
            localStorage.setItem('showPasswordModal', "false")
        }
        else {
            const passphrase_valid = await verify_password(inputted_passphrase, password)
            if (passphrase_valid) {
                console.log(await get_storage())
            }
            else {
                alert('Wrong password!')
                setShowPasswordModal(true)
                localStorage.setItem('showPasswordModal', "true")
                
                return
            }
        }
        setShowPasswordModal(false)
        localStorage.setItem('showPasswordModal', "false")
    }

    return (
        <div className="px-2 py-2">
            {/* Password Modal */}
            {showPasswordModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                    <div className="bg-white rounded-lg p-4 shadow-lg">
                        <form method="post" onSubmit={handle_password_submit}>
                            <h2 className="text-lg font-semibold mb-2">
                                {!password ? "Set Your Password" : "Enter Password"}
                            </h2>
                            <input
                                type="password"
                                className="border rounded px-2 py-1 w-full mb-4"
                                name="passphrase"
                            />
                            <div className="flex justify-end">
                                <button
                                    type="submit"
                                    className="bg-purple-500 text-white px-3 py-1 rounded mr-2"
                                >
                                    Submit
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div className="border border-purple-500 rounded-lg px-1 py-1">
                <section className="flex">
                    <button
                        className="rounded-md border border-purple-500 px-1 m-2 w-full hover:font-semibold"
                        onClick={() => setShowPasswordModal(true)}
                    >
                        Refresh
                    </button>
                    <button className="rounded-md border border-purple-500 px-1 m-2 w-full hover:font-semibold">
                        Add contact
                    </button>
                    <button className="rounded-md border border-purple-500 px-1 m-2 w-full hover:font-semibold">
                        Remove contact
                    </button>
                    <button className="rounded-md border border-purple-500 px-1 m-2 w-full hover:font-semibold">
                        Untrust contact
                    </button>
                </section>
            </div>
            <div className="flex items-center justify-center px-2 py-2">
                <button className="border border-purple-500 rounded-lg px-2 py-2">
                    Extension options
                </button>
            </div>
        </div>
    );
}

export default ContactOperations;
