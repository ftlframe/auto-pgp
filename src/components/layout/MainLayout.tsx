import { useVault } from "~contexts/VaultContext";

export function MainLayout() {
    const vault = useVault()
    return (
        <div>
            This is the main layout!
            <button onClick={() => {vault.lockVault('123')}}>Lock</button>
            <button onClick={() => {vault.unlockVault('123')}}>Unlock</button>
        </div>
    );
}