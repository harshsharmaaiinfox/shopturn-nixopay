import { Component } from '@angular/core';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-shipping-delevary',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './shipping-delevary.component.html',
  styleUrl: './shipping-delevary.component.scss'
})
export class ShippingDelevaryComponent {
  currentDate = new Date();
}
