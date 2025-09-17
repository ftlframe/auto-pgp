
import { LoginScreen } from "~features/auth/LoginScreen"
import VaultProvider, { useVault, VaultContext } from "~contexts/VaultContext"
import "~style.css"
import { useEffect, useState } from "react"
import { MainLayout } from "~components/layout/MainLayout";
import { DecryptPrompt } from "~features/auth/DecryptPrompt";

function IndexPopupContent() {
  const vault = useVault();

  if (vault.pendingAction) {
    return <DecryptPrompt />;
  }

  // Otherwise, show the normal login screen or main layout.
  return vault.isUnlocked ? <MainLayout /> : <LoginScreen />;
}

function IndexPopup() {

  return (
    <div className="w-[450px] h-[550px]">
      <VaultProvider>
        <IndexPopupContent />
      </VaultProvider>

    </div>
  )
}

export default IndexPopup
