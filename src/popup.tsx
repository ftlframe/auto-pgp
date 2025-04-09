
import { LoginScreen } from "~features/auth/LoginScreen"
import VaultProvider, { useVault, VaultContext } from "~contexts/VaultContext"
import "~style.css"
import { useEffect, useState } from "react"
import { MainLayout } from "~components/layout/MainLayout";

function IndexPopupContent() {
  const { isUnlocked } = useVault();
  return isUnlocked ? <MainLayout /> : <LoginScreen />
}

function IndexPopup() {

  return (
    <div className="w-[500px] h-[300px]">
      <VaultProvider>
        <IndexPopupContent />
      </VaultProvider>

    </div>
  )
}

export default IndexPopup
