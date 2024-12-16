import { clear_storage, generate_key } from "~features/key-generation"
import { useAppContext } from "~popup"

function KeyOperations() {
    const {email, set_and_update} = useAppContext();

    async function generate_and_store () {
        const [public_key, private_key] = await generate_key()
        // console.log(public_key)
        set_and_update(email, public_key, private_key)
    }

    return (
        <div className="px-2 py-2">
            <div className="border border-purple-500 rounded-lg px-1 py-2">
                <button className="border border-purple-500 rounded-lg" onClick={generate_and_store}>Generate keys</button>
            </div>
            <div className="border border-purple-500 rounded-lg px-1 py-2">
                <button className="border border-purple-500 rounded-lg" onClick={clear_storage}>Clear keys</button>
            </div>
        </div>
    )
}

export default KeyOperations