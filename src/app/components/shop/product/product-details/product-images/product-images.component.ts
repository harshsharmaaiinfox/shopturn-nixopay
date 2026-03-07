import { Component, Input } from '@angular/core';
import { Product } from '../../../../../shared/interface/product.interface';
import { Option } from '../../../../../shared/interface/theme-option.interface';

@Component({
  selector: 'app-product-images',
  templateUrl: './product-images.component.html',
  styleUrls: ['./product-images.component.scss']
})
export class ProductImagesComponent {

  @Input() product: Product;
  @Input() option: Option | null;

  public videType = ['video/mp4', 'video/webm', 'video/ogg'];
  public audioType = ['audio/mpeg', 'audio/wav', 'audio/ogg'];

  get firstGalleryImage() {
    return this.product?.product_galleries && this.product.product_galleries.length > 0 
      ? this.product.product_galleries[0] 
      : null;
  }

  get hasMultipleImages() {
    return this.product?.product_galleries && this.product.product_galleries.length > 1;
  }
}
