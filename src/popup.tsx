
import { LoginScreen } from "~features/auth/LoginScreen"
import VaultProvider, { useVault, VaultContext } from "~contexts/VaultContext"
import "~style.css"
import { useEffect, useState } from "react"
import { MainLayout } from "~components/layout/MainLayout";

function IndexPopupContent() {
  const { isUnlocked } = useVault();
  return isUnlocked ? <MainLayout/> : <LoginScreen/>
}

function IndexPopup() {

  return (
    <VaultProvider>
      <IndexPopupContent/>
    </VaultProvider>
  )
}

export default IndexPopup
