import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-payment-success',
  templateUrl: './payment-success.component.html',
  styleUrls: ['./payment-success.component.scss']
})
export class PaymentSuccessComponent implements OnInit, OnDestroy {

  private destroy$ = new Subject<void>();

  public orderId: string | null = null;
  public loading: boolean = true;
  public showRedirectMessage: boolean = false;
  public redirectCountdown: number = 5;
  public paymentSuccessStatus: 'pending' | 'success' | 'error' = 'pending';

  private countdownInterval: any;
  private readonly PAYMENT_SUCCESS_API = 'https://api.nixopay.com/public/api/payment-success';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient
  ) {}

  ngOnInit() {
    sessionStorage.removeItem('pending_payment_cart');

    this.route.queryParams
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        this.orderId = params['order_number']
          || localStorage.getItem('order_id')?.replace(/"/g, '')
          || null;

        // Source 1: txnid from URL query param (PayU may append it on redirect)
        const txnidFromUrl = params['txnid'] || params['mihpayid'] || null;

        this.callPaymentSuccessAPI(txnidFromUrl);
      });

    // Show success UI after 2 seconds
    setTimeout(() => {
      this.loading = false;
      if (this.orderId) {
        this.showRedirectMessage = true;
        this.startCountdown();
      }
    }, 2000);
  }

  /**
   * Resolves txnid using a 2-level priority chain:
   *   1. URL query param ?txnid=... (PayU redirect)
   *   2. localStorage 'payu_txnid' (saved before redirect in checkout.component.ts)
   * Then POSTs { txnid } to the Nixopay payment-success API.
   */
  callPaymentSuccessAPI(txnidFromUrl: string | null) {
    const txnid = txnidFromUrl || localStorage.getItem('payu_txnid') || null;

    if (!txnid) {
      console.warn('txnid not found in URL params or localStorage. Skipping payment-success API call.');
      return;
    }

    const payload = { txnid };
    console.log('Calling payment-success API:', this.PAYMENT_SUCCESS_API, 'Payload:', payload);

    this.http.post(this.PAYMENT_SUCCESS_API, payload).subscribe({
      next: (response: any) => {
        console.log('✅ payment-success API response:', response);
        this.paymentSuccessStatus = 'success';
        localStorage.removeItem('payu_txnid');
      },
      error: (err) => {
        console.error('❌ payment-success API error:', err);
        this.paymentSuccessStatus = 'error';
        localStorage.removeItem('payu_txnid');
      }
    });
  }

  startCountdown() {
    this.countdownInterval = setInterval(() => {
      this.redirectCountdown--;
      if (this.redirectCountdown <= 0) {
        clearInterval(this.countdownInterval);
        this.goToOrderDetails();
      }
    }, 1000);
  }

  goToOrderDetails() {
    if (this.orderId) {
      this.router.navigate(['/account/order/details', this.orderId]);
    }
  }

  continueShopping() {
    this.router.navigateByUrl('/');
  }

  goToHome() {
    this.router.navigateByUrl('/');
  }

  ngOnDestroy() {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
    this.destroy$.next();
    this.destroy$.complete();
  }
}
