import { Component } from '@angular/core';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-refund-and-cancellation',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './refund-and-cancellation.component.html',
  styleUrl: './refund-and-cancellation.component.scss'
})
export class RefundAndCancellationComponent {
  currentDate = new Date();
}
