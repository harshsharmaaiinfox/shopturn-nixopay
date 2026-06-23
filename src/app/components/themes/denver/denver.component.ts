import { Component, Input, OnInit, AfterViewInit } from '@angular/core';
import { Select, Store } from '@ngxs/store';
import { Observable, forkJoin } from 'rxjs';
import { GetProductByIds, GetProducts } from '../../../shared/action/product.action';
import { Denver } from '../../../shared/interface/theme.interface';
import { ThemeOptionService } from '../../../shared/services/theme-option.service';
import * as data from '../../../shared/data/owl-carousel';
import { GetBrands } from '../../../shared/action/brand.action';
import { ThemeOptionState } from '../../../shared/state/theme-option.state';
import { Option } from '../../../shared/interface/theme-option.interface';
import { ActivatedRoute, Router } from '@angular/router';
import { Params } from '../../../shared/interface/core.interface';

@Component({
  selector: 'app-denver',
  templateUrl: './denver.component.html',
  styleUrls: ['./denver.component.scss']
})
export class DenverComponent implements OnInit, AfterViewInit {

  @Input() data?: Denver;
  @Input() slug?: string;

  @Select(ThemeOptionState.themeOptions) themeOption$: Observable<Option>;

  public categorySlider = data.categorySlider9;
  public productSlider6ItemMargin = data.productSlider6ItemMargin;

  // ---- TOP FEATURED SECTION (Section 1 ~ line 117 in HTML) ----
  public topFeaturedIds: number[] = [6832, 6834, 6851, 6835];

  // ---- BOTTOM FEATURED COLLECTION (Section 2 ~ line 213 in HTML) ----
  public bottomFeaturedIds: number[] = [1417, 1421, 1457, 1459];

  // Filter for collection page with sidebar
  public filter: Params = {
    'page': 1,
    'paginate': 40,
    'status': 1,
    'field': 'created_at',
    'price': '',
    'category': '',
    'tag': '',
    'sort': 'asc',
    'sortBy': '',
    'rating': '',
    'attribute': ''
  };

  constructor(private store: Store,
    private route: ActivatedRoute,
    private router: Router,
    private themeOptionService: ThemeOptionService) { }

  ngAfterViewInit() {
    // Slider functionality removed - using static image instead
  }

  ngOnInit() {
    if (this.data?.slug == this.slug) {
      const allFeaturedIds = [...new Set([...this.topFeaturedIds, ...this.bottomFeaturedIds])];
      const getFeaturedProducts$ = this.store.dispatch(new GetProductByIds({
        status: 1,
        paginate: allFeaturedIds.length,
        ids: allFeaturedIds.join(',')
      }));
      const getBrand$ = this.store.dispatch(new GetBrands({
        status: 1,
        ids: this.data?.content?.brands?.brand_ids?.join()
      }));
      // Skeleton Loader
      document.body.classList.add('skeleton-body');

      forkJoin([getFeaturedProducts$, getBrand$]).subscribe({
        complete: () => {
          document.body.classList.remove('skeleton-body');
          this.themeOptionService.preloader = false;
        }
      });
    }

    this.route.queryParams.subscribe(params => {
      // Update filter based on query params
      this.filter = {
        'page': params['page'] ? params['page'] : 1,
        'paginate': 40,
        'status': 1,
        'field': params['field'] ? params['field'] : 'created_at',
        'price': params['price'] ? params['price'] : '',
        'category': params['category'] ? params['category'] : '',
        'tag': params['tag'] ? params['tag'] : '',
        'sort': params['sort'] ? params['sort'] : 'asc',
        'sortBy': params['sortBy'] ? params['sortBy'] : '',
        'rating': params['rating'] ? params['rating'] : '',
        'attribute': params['attribute'] ? params['attribute'] : ''
      };

      // Load products for collection section with updated filters
      this.store.dispatch(new GetProducts(this.filter));

      // Scroll to collection section if category is selected
      if (params['category']) {
        setTimeout(() => {
          const collectionSection = document.getElementById('filtered_products');
          if (collectionSection) {
            collectionSection.scrollIntoView({
              behavior: 'smooth',
              block: 'start'
            });
          }
        }, 500); // Increased delay to ensure products are loaded
      }

      // Handle product box slider settings
      if (this.route.snapshot.data['data']?.theme_option?.productBox === 'digital') {
        if (this.productSlider6ItemMargin && this.productSlider6ItemMargin.responsive && this.productSlider6ItemMargin.responsive['1180']) {
          this.productSlider6ItemMargin = {
            ...this.productSlider6ItemMargin, items: 4, responsive: {
              ...this.productSlider6ItemMargin.responsive,
              1180: {
                items: 4
              }
            }
          }
        }
      } else {
        if (this.productSlider6ItemMargin && this.productSlider6ItemMargin.responsive && this.productSlider6ItemMargin.responsive['1180']) {
          this.productSlider6ItemMargin = {
            ...this.productSlider6ItemMargin, items: 6, responsive: {
              ...this.productSlider6ItemMargin.responsive,
              1180: {
                items: 6
              }
            }
          }
        }
      }
    });
  }

  // Method to handle category selection on home page

  selectCategory(category: string, event?: Event) {
    if (event) {
      event.preventDefault();
    }

    // Navigate to collection page with updated query params
    this.router.navigate(['/collections'], {
      queryParams: {
        category: category,
        page: 1
      },
      queryParamsHandling: 'merge'
    });
  }

}
