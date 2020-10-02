import RangePicker from '../../components/range-picker/index.js';
import SortableTable from '../../components/sortable-table/index.js';
import ColumnChart from '../../components/column-chart/index.js';
import header from './bestsellers-header.js';

import fetchJson from '../../utils/fetch-json.js';

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
    this.initEventListeners();

    return this.element;
  }

  initComponents() {
    const from = new Date();
    const to = new Date();
    from.setMonth(from.getMonth() - 2);

    this.components.rangePicker = new RangePicker({from, to});

    this.components.ordersChart = new ColumnChart({
      label: 'orders',
      link: '#',
      url: 'api/dashboard/orders',
      range: {from, to},
    });

    this.components.salesChart = new ColumnChart({
      label: 'sales',
      formatHeading: data => `$${data}`,
      url: 'api/dashboard/sales',
      range: {from, to},
    });

    this.components.customersChart = new ColumnChart({
      label: 'customers',
      url: 'api/dashboard/customers',
      range: {from, to},
    });

    this.components.productsContainer = new SortableTable(header, {
      url: `api/dashboard/bestsellers`,
      isSortLocally: true,
      range: {from, to},
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
      const { from, to } = event.detail;
      this.updateComponents(from, to);
    });
  }

  async updateComponents(from, to) {
    this.components.ordersChart.update(from, to);
    this.components.salesChart.update(from, to);
    this.components.customersChart.update(from, to);
    this.components.productsContainer.update(from, to);
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
    return `<div class="dashboard">
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
    </div>`;
  }
}
