import React from "react"
import { useAppContext } from "~util/context"

function Contact() {
    const { vault, email } = useAppContext()

    return (
        <div className="px-2 py-2">
            <div className="border border-purple-500 rounded-lg ">
                <section className="">
                    <div className="flex flex-wrap px-2 pb-2 w-full">
                        <label>Contact: </label>
                        <select className="w-56" name="" id="">
                            {vault[email]?.contacts?.length > 0 ? (
                                vault[email].contacts.map((key, index) => (
                                    <option key={index}>{key}</option>
                                ))
                            ) : (
                                <option disabled>No Contacts Available</option>
                            )}
                        </select>
                    </div>
                    <div className="flex flex-wrap px-2 pb-2">
                        <label>Known public keys for contact</label>
                        <select className="w-56" multiple={true}>
                            {vault[email]?.contacts?.length > 0 ? (
                                vault[email].contacts.pub_keys.map((key, index) => (
                                    <option key={index}>PUBLIC KEY No. {index}</option>
                                ))
                            ) : (
                                <option disabled>No keys available</option>
                            )}
                        </select>
                    </div>
                </section>
            </div>
        </div>
    )
}

export default Contact