import { useState, useEffect } from "react";
import { get_keys } from "~features/key-generation";
import { useAppContext } from "~popup";


export default function Keys() {
    const { email, setEmail, pubKeys, setPubKeys } = useAppContext();


    return (
        <div className="px-2 py-2">
            <div className="border border-purple-500 rounded-lg px-1 py-1">
                <p>Email: {email || 'Fetching email...'}</p>
                <select name="pub_keys" className="w-56" id="" multiple={true}>
                    {pubKeys.map((key, index) => (
                        <option key={index}>PUBLIC KEY {index + 1}</option>
                    ))}
                </select>
            </div>
        </div>
    )
}
