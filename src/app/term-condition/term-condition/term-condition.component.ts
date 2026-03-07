import { Component } from '@angular/core';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-term-condition',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './term-condition.component.html',
  styleUrl: './term-condition.component.scss'
})
export class TermConditionComponent {
  currentDate = new Date();
}
