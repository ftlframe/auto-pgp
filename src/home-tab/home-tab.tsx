import "~style.css"
import Contact from "./contact";
import ContactOperations from "./contact-operations";
import React from "react";

function HomeTab() {
    return (
        <>
            <Contact></Contact>
            <ContactOperations></ContactOperations>
        </>
    )
}

export default HomeTab;