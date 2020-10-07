import RangePicker from '../../components/range-picker/index.js';
import SortableTable from '../../components/sortable-table/index.js';
import ColumnChart from '../../components/column-chart/index.js';
import header from './bestsellers-header.js';

import fetchJson from '../../utils/fetch-json.js';

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
    const dateRange = {
      from: new Date(),
      to: new Date()
    };
    dateRange.from.setMonth(dateRange.from.getMonth() - 1);

    this.components.rangePicker = new RangePicker(dateRange);

    this.components.ordersChart = new ColumnChart({
      label: 'orders',
      link: '/sales',
      url: 'api/dashboard/orders',
      dateRange,
    });

    this.components.salesChart = new ColumnChart({
      label: 'sales',
      formatHeading: data => `$${data}`,
      url: 'api/dashboard/sales',
      dateRange,
    });

    this.components.customersChart = new ColumnChart({
      label: 'customers',
      url: 'api/dashboard/customers',
      dateRange,
    });

    this.components.productsContainer = new SortableTable(header, {
      url: `api/dashboard/bestsellers`,
      isSortLocally: true,
      dateRange,
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
    this.components.rangePicker.element.addEventListener('date-select', event => {
      const dateRange = Object.assign(event.detail);

      this.updateComponents(dateRange);
    });
  }

  updateComponents(dateRange) {
    this.components.ordersChart.update(dateRange);
    this.components.salesChart.update(dateRange);
    this.components.customersChart.update(dateRange);
    this.components.productsContainer.update({ dateRange });
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
      <div class="dashboard full-height flex-column">
        <div class="content__top-panel">
          <h1 class="page-title">Dashboard</h1>
          <!-- RangePicker component -->
          <div data-element="rangePicker"></div>
        </div>
        <div data-element="chartsRoot" class="dashboard__charts">
          <!-- column-chart components -->
          <div data-element="ordersChart" class="dashboard__chart_orders"></div>
          <div data-element="salesChart" class="dashboard__chart_sales"></div>
          <div data-element="customersChart" class="dashboard__chart_customers"></div>
        </div>

        <h3 class="block-title">Best sellers</h3>

        <div data-element="productsContainer">
          <!-- sortable-table component -->
        </div>
      </div>
    `;
  }
}
