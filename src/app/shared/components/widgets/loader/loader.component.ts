import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-loader',
  templateUrl: './loader.component.html',
  styleUrls: ['./loader.component.scss']
})
export class LoaderComponent {

  @Input() loaderClass: string = 'loader-wrapper';
  @Input() loaderType: 'spinner' | 'dots' | 'pulse' | 'wave' | 'text' = 'spinner';
  @Input() message: string = 'Please Wait...';
  @Input() showMessage: boolean = true;
  @Input() brandText: string = 'ShopTurnLife';

}
