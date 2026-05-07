# How to Add a New PayU Payment Gateway

This guide explains how to add a new PayU-based payment gateway to an Angular e-commerce project that uses NGXS state management. Follow these steps exactly.

---

## Prerequisites

You need the following details for the new gateway:

| Detail | Example Value | Description |
|--------|--------------|-------------|
| `name` | `payu_rapportmart` | Internal identifier used in code |
| `title` | `paybyU2` | Display name shown to users on checkout |
| `icon` | `./assets/images/payuicon.png` | Path to the payment icon image |
| `status` | `true` | Whether the gateway is enabled |
| `api_endpoint` | `payu-initiate-payment-rapportmart` | Backend API endpoint path (appended to environment.URL) |

---

## Files to Modify (3 files)

### File 1: `src/app/shared/state/setting.state.ts`

**Purpose:** Register the payment method so it appears in the checkout UI.

**Find** the `customPayments` array inside the `getSettingOptions` method. It contains objects like:

```typescript
{
  name: 'payu_shoplite',
  status: true,
  title: 'Pay by PayU',
  icon: './assets/images/payuicon.png',
},
```

**Add** a new entry right after the existing PayU entry (or anywhere in the array):

```typescript
{
  name: 'YOUR_GATEWAY_NAME',
  status: true,
  title: 'YOUR_DISPLAY_TITLE',
  icon: './assets/images/YOUR_ICON.png',
},
```

**Example:**

```typescript
{
  name: 'payu_rapportmart',
  status: true,
  title: 'paybyU2',
  icon: './assets/images/payuicon.png',
},
```

---

### File 2: `src/app/shared/services/cart.service.ts`

**Purpose:** Add a service method that calls the backend API to initiate payment.

**Find** the existing `initiatePayUIntent` method (or any similar payment initiation method).

**Add** a new method after it with your endpoint URL:

```typescript
initiateYourGatewayIntent(data: any): Observable<any> {
  return new Observable(observer => {
    fetch(`${environment.URL}/YOUR_API_ENDPOINT`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    })
      .then(response => response.json())
      .then(data => {
        observer.next(data);
        observer.complete();
      })
      .catch(error => {
        observer.error(error);
      });
  });
}
```

**Example:**

```typescript
initiatePayURapportmartIntent(data: any): Observable<any> {
  return new Observable(observer => {
    fetch(`${environment.URL}/payu-initiate-payment-rapportmart`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    })
      .then(response => response.json())
      .then(data => {
        observer.next(data);
        observer.complete();
      })
      .catch(error => {
        observer.error(error);
      });
  });
}
```

**Note:** Make sure `Observable` is imported from `rxjs` and `environment` is imported from the environments file. These should already exist in the file.

---

### File 3: `src/app/components/shop/checkout/checkout.component.ts`

**Purpose:** Handle payment method selection, initiate the payment flow, and redirect the user.

#### Change 1 of 3: Add a `case` in `selectPaymentMethod()`

**Find** the `selectPaymentMethod(value: string)` method. It has a `switch` statement with cases for each payment method.

**Add** a new case before `default`:

```typescript
case 'YOUR_GATEWAY_NAME':
  this.checkout(value);
  break;
```

**Example:**

```typescript
case 'payu_rapportmart':
  this.checkout(value);
  break;
```

#### Change 2 of 3: Add the payment initiation method

**Add** a new method in the component class. This method:
1. Reads user data from localStorage
2. Calls the cart service method with payment details
3. Stores session/local storage items for tracking
4. Extracts the transaction ID from the response
5. Redirects the user to the payment gateway URL

```typescript
// Your Gateway Payment Integration
initiateYourGatewayPaymentIntent(payment_method: string, uuid: any, order_result: any) {
  const userData = localStorage.getItem('account');
  const parsedUserData = JSON.parse(userData || '{}')?.user || {};

  const payload = {
    uuid,
    ...parsedUserData,
    checkout: this.checkoutTotal
  };

  this.cartService.initiateYourGatewayIntent({
    name: parsedUserData.name,
    amount: this.checkoutTotal?.total?.total,
    email: parsedUserData.email,
    phone: parsedUserData.phone,
    uuid: payload.uuid,
    surl: `${window.location.origin}/success?order_status=true&order_number=${order_result.order_number}`,
    furl: `${window.location.origin}/checkout?payment_status=failed&order_number=${order_result.order_number}`
  }).subscribe({
    next: (response) => {
      console.log('Your Gateway initiate-payment full response:', JSON.stringify(response));

      if (response?.success && response?.redirect_url) {
        sessionStorage.setItem('payment_uuid', uuid);
        sessionStorage.setItem('payment_method', payment_method);
        sessionStorage.setItem('payment_action', JSON.stringify(this.form.value));
        localStorage.setItem('order_id', JSON.stringify(order_result.order_number));

        let txnid: string | null = response?.txnid || null;

        if (!txnid && response?.redirect_url) {
          const urlParts = response.redirect_url.split('/');
          const extracted = urlParts[urlParts.length - 1];
          if (extracted && extracted.length > 5) {
            txnid = extracted;
            console.log('txnid extracted from redirect_url:', txnid);
          }
        }

        if (txnid) {
          localStorage.setItem('payu_txnid', txnid);
          console.log('payu_txnid saved to localStorage:', txnid);
        } else {
          console.warn('Could not capture txnid from response:', response);
        }

        window.location.href = response.redirect_url;
      } else {
        console.error("Payment initiation failed:", response);
      }
    },
    error: (err) => {
      console.log("Error initiating payment:", err);
    }
  });
}
```

#### Change 3 of 3: Add condition in `placeorder()`

**Find** the `placeorder()` method. Inside the `subscribe > next` callback, there are multiple `if` blocks checking `this.payment_method` for each gateway.

**Add** a new `if` block after the existing ones:

```typescript
if (this.payment_method === 'YOUR_GATEWAY_NAME') {
  this.initiateYourGatewayPaymentIntent(this.payment_method, uuid, result);
}
```

**Example:**

```typescript
if (this.payment_method === 'payu_rapportmart') {
  this.initiatePayURapportmartPaymentIntent(this.payment_method, uuid, result);
}
```

---

## Expected Backend API Contract

The frontend expects the backend endpoint (`POST /YOUR_API_ENDPOINT`) to:

**Accept this request body:**

```json
{
  "name": "Customer Name",
  "amount": 1234.56,
  "email": "customer@example.com",
  "phone": "9876543210",
  "uuid": "generated-uuid-v4",
  "surl": "https://yoursite.com/success?order_status=true&order_number=123",
  "furl": "https://yoursite.com/checkout?payment_status=failed&order_number=123"
}
```

**Return this response on success:**

```json
{
  "success": true,
  "redirect_url": "https://payment-gateway-url.com/pay/txn123",
  "txnid": "txn123"
}
```

The `txnid` field is optional in the response; the code will attempt to extract it from the last segment of `redirect_url` as a fallback.

---

## Payment Flow Summary

1. User selects the payment method on checkout page
2. `selectPaymentMethod()` triggers `checkout()` to calculate totals
3. User clicks "Place Order" which calls `placeorder()`
4. `placeorder()` creates the order via `orderService.placeOrder()`
5. On success, it calls the gateway's initiation method
6. The initiation method calls the backend API via the cart service
7. Backend returns a `redirect_url`
8. User is redirected to the payment gateway page
9. After payment, gateway redirects back to `/success` (on success) or `/checkout` (on failure)
10. The `payment-success` component calls `payu-after-sucesss` API with the `txnid` to confirm

---

## Checklist

- [ ] Added payment config object in `setting.state.ts` inside `customPayments` array
- [ ] Added service method in `cart.service.ts` with correct API endpoint
- [ ] Added `case` in `selectPaymentMethod()` switch in `checkout.component.ts`
- [ ] Added initiation method in `checkout.component.ts`
- [ ] Added `if` block in `placeorder()` in `checkout.component.ts`
- [ ] Payment icon image exists at the specified path in `src/assets/images/`
- [ ] Backend API endpoint is deployed and working
