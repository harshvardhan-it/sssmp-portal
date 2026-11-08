export interface CashfreeCheckoutOptions {
  paymentSessionId: string;
  redirectTarget?: '_self' | '_blank' | HTMLElement;
}

export interface CashfreeCheckoutInstance {
  checkout(options: CashfreeCheckoutOptions): Promise<unknown>;
}

export interface CashfreeFactoryOptions {
  mode: 'sandbox' | 'production';
}

declare global {
  interface Window {
    Cashfree?: (options: CashfreeFactoryOptions) => CashfreeCheckoutInstance;
  }
}

let scriptPromise: Promise<void> | undefined;

export function loadCashfreeCheckout(): Promise<void> {
  if (window.Cashfree) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://sdk.cashfree.com/js/v3/cashfree.js';
    script.async = true;
    script.onload = () => {
      if (window.Cashfree) resolve();
      else { scriptPromise = undefined; reject(new Error('Cashfree Checkout failed to initialize')); }
    };
    script.onerror = () => {
      scriptPromise = undefined;
      reject(new Error('Unable to load Cashfree Checkout'));
    };
    document.head.appendChild(script);
  });
  return scriptPromise;
}
