import DoubleSlider from '../../../components/double-slider';
import SortableTable from '../../../components/sortable-table';
import header from '../../dashboard/bestsellers-header';

export default class Page {
  element;
  subElements = {};
  components = {};

  render() {
    const element = document.createElement('div');
    element.innerHTML = this.template;
    this.element = element.firstElementChild;

    this.subElements = this.getSubElements(this.element);

    this.initComponents();
    this.renderComponents();
    this.initEventListeners();

    return this.element;
  }

  initComponents() {
    this.components.sliderContainer = new DoubleSlider();

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

  initEventListeners() {
    const { sliderContainer } = this.components;
    const { filterName, filterStatus } = this.subElements;

    sliderContainer.element.addEventListener('range-select', event => {
      const priceRange = Object.assign(event.detail);

      this.updateComponents({ priceRange });
    });

    filterName.addEventListener('input', event => {
      const searchTitle = event.target.value;

      this.updateComponents({ searchTitle });
    });

    filterStatus.addEventListener('input', event => {
      const searchStatus = event.target.value;

      this.updateComponents({ searchStatus });
    });
  }

  async updateComponents({ dateRange, priceRange, searchTitle, searchStatus}) {
    this.components.productsContainer.update({ dateRange, priceRange, searchTitle, searchStatus});
  }

  getSubElements(element) {
    const elements = element.querySelectorAll('[data-element]');

    return [...elements].reduce((accum, subElement) => {
      accum[subElement.dataset.element] = subElement;

      return accum;
    }, {});
  }

  remove() {
    this.element.remove();
  }

  destroy() {
    for (const component of Object.values(this.components)) {
      component.destroy();
    }

    this.remove();
  }

  get template() {
    return `
      <div class="products-list">
        <div class="content__top-panel">
          <h1 class="page-title">Товары</h1>
          <a href="/products/add" class="button-primary">Добавить товар</a>
        </div>
        <div class="content-box content-box_small">
          <form class="form-inline" onsubmit="return false;">
            <div class="form-group">
              <label class="form-label">Сортировать по:</label>
              <input type="text" data-element="filterName" class="form-control" placeholder="Название товара">
            </div>
            <div class="form-group" data-element="sliderContainer">
              <label class="form-label">Цена:</label>
              <!-- double-slider component -->
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
