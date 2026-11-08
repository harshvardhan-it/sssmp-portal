export interface RazorpayCheckoutResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export interface RazorpayCheckoutOptions {
  key: string;
  amount: number;
  currency: 'INR';
  name: string;
  description: string;
  order_id: string;
  handler: (response: RazorpayCheckoutResponse) => void;
  modal?: { ondismiss?: () => void };
}

interface RazorpayConstructor {
  new (options: RazorpayCheckoutOptions): RazorpayCheckoutInstance;
}

export interface RazorpayCheckoutInstance {
  open: () => void;
  on?: (event: 'payment.failed', handler: () => void) => void;
}

declare global {
  interface Window {
    Razorpay?: RazorpayConstructor;
  }
}

let scriptPromise: Promise<void> | undefined;

export function loadRazorpayCheckout(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => window.Razorpay ? resolve() : reject(new Error('Razorpay Checkout failed to initialize'));
    script.onerror = () => reject(new Error('Unable to load Razorpay Checkout'));
    document.head.appendChild(script);
  });
  return scriptPromise;
}

export function openRazorpayCheckout(options: RazorpayCheckoutOptions): RazorpayCheckoutInstance {
  if (!window.Razorpay) throw new Error('Razorpay Checkout is not loaded');
  const checkout = new window.Razorpay(options);
  checkout.open();
  return checkout;
}
