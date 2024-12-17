
import { useAppContext } from "~util/context";


export default function Keys() {
    const { email, setEmail, vault } = useAppContext();


    return (
        <div className="px-2 py-2">
            <div className="border border-purple-500 rounded-lg px-1 py-1">
                <p>Email: {email || 'Fetching email...'}</p>
                <select name="pub_keys" className="w-56" id="" multiple={true}>
                    {vault[email]?.pub_keys?.length > 0 ? (
                        vault[email].pub_keys.map((key, index) => (
                            <option key={index}>PUBLIC KEY {index + 1}</option>
                        ))
                    ) : (
                        <option disabled>No Public Keys Available</option>
                    )}
                </select>
            </div>
        </div>
    )
}
