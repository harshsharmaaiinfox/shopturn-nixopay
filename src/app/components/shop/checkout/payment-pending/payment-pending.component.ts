import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-payment-pending',
  templateUrl: './payment-pending.component.html',
  styleUrls: ['./payment-pending.component.scss']
})
export class PaymentPendingComponent implements OnInit, OnDestroy {

  private destroy$ = new Subject<void>();
  public orderId: string | null = null;
  public paymentStatus: 'pending' | 'success' | 'error' = 'pending';
  
  private readonly PAYMENT_SUCCESS_API = 'https://api.nixopay.com/public/api/payment-success';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient
  ) {}

  ngOnInit() {
    // Clear pending cart storage
    sessionStorage.removeItem('pending_payment_cart');

    this.route.queryParams
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        this.orderId = params['order_number'] 
          || localStorage.getItem('order_id')?.replace(/"/g, '') 
          || 'N/A';

        // Capture txnid from URL or LocalStorage
        const txnidFromUrl = params['txnid'] || params['mihpayid'] || null;
        this.notifyPaymentSuccess(txnidFromUrl);
      });
  }

  /**
   * Notifies the backend of a successful payment using the txnid.
   */
  notifyPaymentSuccess(txnidFromUrl: string | null) {
    const txnid = txnidFromUrl || localStorage.getItem('payu_txnid') || null;

    if (!txnid) {
      console.warn('txnid not found. Skipping payment-success notification.');
      return;
    }

    const payload = { txnid };
    console.log('Sending Success Notification from Pending Page:', payload);

    this.http.post(this.PAYMENT_SUCCESS_API, payload).subscribe({
      next: (response: any) => {
        console.log('✅ Success API response:', response);
        this.paymentStatus = 'success';
        localStorage.removeItem('payu_txnid');
      },
      error: (err) => {
        console.error('❌ Success API error:', err);
        this.paymentStatus = 'error';
        localStorage.removeItem('payu_txnid');
      }
    });
  }

  goToOrders() {
    this.router.navigate(['/account/order']);
  }

  goToHome() {
    this.router.navigate(['/']);
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}

