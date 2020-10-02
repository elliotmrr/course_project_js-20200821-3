import ProductForm from "../../../components/product-form";
import SortableTable from '../../../components/sortable-table';
import header from '../../dashboard/bestsellers-header';

export default class Page {
  element;
  subElements = {};
  components = {};

  async render() {
    const element = document.createElement('div');
    element.innerHTML = this.template;
    this.element = element.firstElementChild;

    this.subElements = this.getSubElements(this.element);

    this.initComponents();
    this.renderComponents();

    return this.element;
  }

  initComponents() {
    this.components.productsContainer = new SortableTable(header, {
      url: `api/rest/products`,
    });
  }

  renderComponents() {
    Object.keys(this.components).forEach(component => {
      const root = this.subElements[component];
      const { element } = this.components[component];

      root.append(element);
    });
  }

  getSubElements(element) {
    const elements = element.querySelectorAll('[data-element]');

    return [...elements].reduce((accum, subElement) => {
      accum[subElement.dataset.element] = subElement;

      return accum;
    }, {});
  }

  destroy() {
    for (const component of Object.values(this.components)) {
      component.destroy();
    }
  }

  get template() {
    return `
      <div class="products-list">
        <div class="content__top-panel">
          <h1 class="page-title">Товары</h1>
          <a href="/products/add" class="button-primary">Добавить товар</a>
        </div>
        <div class="content-box content-box_small">
          <form class="form-inline">
            <div class="form-group">
              <label class="form-label">Сортировать по:</label>
              <input type="text" data-element="filterName" class="form-control" placeholder="Название товара">
            </div>
            <div class="form-group" data-element="sliderContainer">
              <label class="form-label">Цена:</label>
              <!-- double-slider component -->
              <div class="range-slider">
                <span data-element="from">$0</span>
                <div data-element="inner" class="range-slider__inner">
                  <span data-element="progress" class="range-slider__progress" style="left: 0%; right: 0%;"></span>
                  <span data-element="thumbLeft" class="range-slider__thumb-left" style="left: 0%;"></span>
                  <span data-element="thumbRight" class="range-slider__thumb-right" style="right: 0%;"></span>
                </div>
                <span data-element="to">$4000</span>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Статус:</label>
              <select class="form-control" data-element="filterStatus">
                <option value="" selected="">Любой</option>
                <option value="1">Активный</option>
                <option value="0">Неактивный</option>
              </select>
            </div>
          </form>
        </div>
        <div data-element="productsContainer" class="products-list__container">
          <!-- sortable-table component -->
        </div>
      </div>
    `;
  }
}
