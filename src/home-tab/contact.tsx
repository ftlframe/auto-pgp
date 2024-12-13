import React from "react"

function Contact() {
    return (
        <div className="px-2 py-2">
            <div className="border border-purple-500 rounded-lg ">
                <section className="">
                    <div className="flex flex-wrap px-2 pb-2 w-full">
                        <label>Contact: </label>
                        <select className="w-56" name="" id="">
                            <option value="A">A</option>
                            <option value="B">B</option>
                            <option value="C">C</option>
                            <option value="D">D</option>
                        </select>
                    </div>
                    <div className="flex flex-wrap px-2 pb-2">
                        <label>Known public keys for contact</label>
                        <select className="w-56" multiple={true}>
                            <option value="A">A</option>
                            <option value="C">B</option>
                        </select>
                    </div>
                </section>
            </div>
        </div>
    )
}

export default Contact