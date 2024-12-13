import { useState, useEffect } from "react";


function Keys() {
    const [email, setEmail] = useState("");

    useEffect(() => {
        chrome.runtime.sendMessage({ type: "GET_EMAIL" }, (response) => {
            if (response?.email) {
                setEmail(response.email);
                localStorage.setItem('USERMAIL', response.email)
            } else {
                setEmail("No email found");
            }
        });
    }, []);

    return (
        <div className="px-2 py-2">
            <div className="border border-purple-500 rounded-lg px-1 py-1">
                <p>Email: {email || 'Fetching email...'}</p>
                <select name="pub_keys" className="w-56" id="" multiple={true}>
                    <option value="A">A</option>
                </select>
            </div>
        </div>
    )
}

export default Keys;