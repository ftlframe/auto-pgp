import { generate_key } from "~features/key-generation"

function KeyOperations() {

    return (
        <div className="px-2 py-2">
            <div className="border border-purple-500 rounded-lg px-1 py-2">
                <button className="border border-purple-500 rounded-lg" onClick={generate_key}>Generate keys</button>
            </div>
        </div>
    )
}

export default KeyOperations