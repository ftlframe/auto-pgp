import { useState } from "react"
import EncryptTab from "~encrypt-tab"
import { CountButton } from "~features/count-button"
import HomeTab from "~home-tab/home-tab"
import KeysTab from "~keys-tab/keys-tab"

import "~style.css"

function IndexPopup() {
  const [active_tab, setTab] = useState(0)

  const tabs = [
    { tab_id: 0, label: 'Home' },
    { tab_id: 1, label: 'Keys' },
    { tab_id: 2, label: 'Encrypt' },
    { tab_id: 3, label: 'Decrypt' },
  ]
  return (
    <div className="flex flex-col h-80 w-72">
      <div className="flex border-b">
        {tabs.map((tab) => (
          <button key={tab.tab_id}
            onClick={() => setTab(tab.tab_id)}
            className={`px-4 py-2 font-semibold ${active_tab === tab.tab_id ? "border-b-2 border-purple-500 text-purple-500" : "text-gray-500 hover:text-purple-500"}`}>{tab.label}</button>
        ))}
      </div>
      <div>
        {active_tab == 0 && <HomeTab></HomeTab>}
        {active_tab == 1 && <KeysTab></KeysTab>}
        {active_tab == 2 && <EncryptTab></EncryptTab>}
      </div>
    </div>
  )

}


export default IndexPopup
