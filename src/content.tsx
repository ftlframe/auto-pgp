import { useEffect } from "react"
import { createRoot } from "react-dom/client"
import cssText from "data-text:~style.css"

const PGPButton = () => {
  const handleClick = () => {
    // Get email content
    const content = document.querySelector(".Am.aiL, .editable")?.textContent || ""

    // We will use a mutation observer to watch for changes in the recipient field
    // Find spans inside the div with class "aoD hl"
    const recipientSpans = document.querySelectorAll('div.aoD.hl span');

    // Extract the recipient email addresses
    let recipients: string[] = [];
    recipientSpans.forEach((span) => {
      const textContent = span.textContent?.trim();
      if (textContent) {
        recipients.push(textContent);  // Add the recipient's email to the array
      }
    });
    console.log(recipients)
    // Send the content and recipients to the background script
    chrome.runtime.sendMessage({
      type: "PGP_ENCRYPT_REQUEST",
      payload: { content, recipients }
    })
  }

  // Render the button
  return (
    <div
      onClick={handleClick}
      className="T-I J-J5-Ji aoO T-I-atl"
      style={{
        backgroundColor: "#1a73e8",
        color: "white",
        marginRight: "8px",
        marginLeft: "2px",
        minWidth: "85px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: "4px",
        fontFamily: "'Google Sans', Roboto, sans-serif",
        fontSize: "14px",
        fontWeight: 500,
        height: "36px",
        padding: "0 16px",
        position: "relative",
        cursor: "pointer",
      }}
      role="button"
      tabIndex={0}
      aria-label="PGP Encrypt"
      data-tooltip="PGP Encrypt"
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ marginRight: "6px" }}
      >
        <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
      Encrypt
    </div>
  )
}

const injectPGPButton = () => {
  // Check for existing button
  if (document.getElementById("pgp-button-container")) return

  // Find the send button container
  const sendButtonContainer = document.querySelector(".dC")
  if (!sendButtonContainer) return

  // Create container for our button
  const container = document.createElement("div")
  container.id = "pgp-button-container"
  container.className = "J-J5-Ji"
  container.style.display = "inline-flex"
  container.style.alignItems = "center"

  // Insert before send button
  sendButtonContainer.parentNode?.insertBefore(container, sendButtonContainer)

  // Render React component
  const root = createRoot(container)
  root.render(<PGPButton />)
}

// Function to observe changes to the compose window and inject the PGP button
const observeComposeWindow = () => {
  const observer = new MutationObserver(() => {
    if (document.querySelector(".aYF, .nH.Hd")) {
      // Wait for toolbar to be ready
      setTimeout(() => {
        if (document.querySelector(".dC") && !document.getElementById("pgp-button-container")) {
          injectPGPButton()
        }
      }, 300)
    }
  })

  observer.observe(document.body, {
    childList: true,
    subtree: true
  })
}

// Add a hover effect for the button
const injectStylesheet = () => {
  const style = document.createElement('style')
  style.textContent = `
    #pgp-button-container .T-I:hover {
      background-color: #1967d2 !important;
      box-shadow: 0 1px 2px 0 rgba(60,64,67,0.3), 0 1px 3px 1px rgba(60,64,67,0.15) !important;
    }
    #pgp-button-container .T-I:active {
      background-color: #1a73e8 !important;
      box-shadow: 0 1px 2px 0 rgba(60,64,67,0.3) !important;
    }
  `
  document.head.appendChild(style)
}

// Initialize when Gmail is ready
if (document.readyState === "complete") {
  observeComposeWindow()
  injectStylesheet()
} else {
  window.addEventListener("load", () => {
    observeComposeWindow()
    injectStylesheet()
  })
}

/**
 * Generates a style element with adjusted CSS to work correctly within a Shadow DOM.
 */
export const getStyle = (): HTMLStyleElement => {
  const baseFontSize = 16

  let updatedCssText = cssText.replaceAll(":root", ":host(plasmo-csui)")
  const remRegex = /([\d.]+)rem/g
  updatedCssText = updatedCssText.replace(remRegex, (match, remValue) => {
    const pixelsValue = parseFloat(remValue) * baseFontSize
    return `${pixelsValue}px`
  })

  const styleElement = document.createElement("style")
  styleElement.textContent = updatedCssText

  return styleElement
}

const PlasmoOverlay = () => {
  return (
    <div className="z-50 flex fixed top-32 right-8">
    </div>
  )
}

export default PlasmoOverlay
