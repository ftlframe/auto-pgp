
import { LoginScreen } from "~features/auth/LoginScreen"
import VaultProvider, { useVault, VaultContext } from "~contexts/VaultContext"
import "~style.css"
import { useEffect, useState } from "react"
import { MainLayout } from "~components/layout/MainLayout";
import ThemeProvider from "~contexts/ThemeContext"

function IndexPopupContent() {
  const vault = useVault();

  if (vault.isUnlocked && vault.isLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50 dark:bg-gray-800">
        <p className="text-lg text-gray-500 dark:text-gray-400">Loading Vault...</p>
      </div>
    );
  }

  // Otherwise, show the normal login screen or main layout.
  return vault.isUnlocked ? <MainLayout /> : <LoginScreen />;
}

function IndexPopup() {

  return (
    <div className="w-[450px] h-[550px]">
      <ThemeProvider>
        <VaultProvider>
          <IndexPopupContent />
        </VaultProvider>
      </ThemeProvider>

    </div>
  )
}

export default IndexPopup
