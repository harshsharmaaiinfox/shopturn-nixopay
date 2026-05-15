import { Component } from '@angular/core';
import { Breadcrumb } from '../../../shared/interface/breadcrumb';

@Component({
  selector: 'app-bank-details',
  templateUrl: './bank-details.component.html',
  styleUrls: ['./bank-details.component.scss']
})
export class BankDetailsComponent {

  public breadcrumb: Breadcrumb = {
    title: 'Refund Policy',
    items: [{ label: 'Refund Policy', active: true }]
  };

}
