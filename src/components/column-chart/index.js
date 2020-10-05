import fetchJson from './../../utils/fetch-json.js';

const LOCALES = JSON.parse(process.env.LOCALES);

export default class ColumnChart {
  element; // HTMLElement;
  subElements = {};
  chartHeight = 50;

  constructor({
    label = '',
    link = '',
    formatHeading = data => data,
    url = '',
    dateRange = {
      from: new Date(),
      to: new Date(),
    }
  } = {}) {
    this.label = label;
    this.link = link;
    this.formatHeading = formatHeading;
    this.url = url;
    this.dateRange = dateRange;

    this.render();
    this.update(dateRange);
  }

  render() {
    const element = document.createElement('div');
    element.innerHTML = this.template;
    this.element = element.firstElementChild;

    this.subElements = this.getSubElements(this.element);
  }

  async update({ from, to }) {
    const { header, body } = this.subElements;

    this.dateRange = { from, to };

    this.element.classList.add('column-chart_loading');
    header.textContent = '';
    body.innerHTML = '';

    const data = await this.loadData({ from, to });

    if (data && Object.values(data).length) {
      header.textContent = this.getHeaderValue(data);
      body.innerHTML = this.getColumnBody(data);

      this.element.classList.remove('column-chart_loading');
    }

    return this.element;
  }

  loadData({ from, to }) {
    const url = new URL(this.url, process.env.BACKEND_URL);

    url.searchParams.set('from', from.toISOString());
    url.searchParams.set('to', to.toISOString());

    return fetchJson(url);
  }

  getLink() {
    return this.link ? `<a class="column-chart__link" href="${this.link}">View all</a>` : '';
  }

  getHeaderValue(data) {
    return this.formatHeading(Object.values(data).reduce((accum, item) => (accum + item), 0));
  }

  getColumnBody(data) {
    const maxValue = Math.max(...Object.values(data));
    const scale = this.chartHeight / maxValue;

    return Object.entries(data).map(([key, value]) => {
      const percent = (value / maxValue * 100).toFixed(0);
      const tooltip = `
        <span>
          <small>
            ${new Date(key).toLocaleString(LOCALES, {
              dateStyle: 'medium',
            })}
          </small>
          <br />
          <strong>${percent}%</strong>
        </span>
      `;

      return `<div style="--value: ${Math.floor(value * scale)}" data-tooltip="${tooltip}"></div>`;
    }).join('');
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
    this.remove();
    this.element = null;
    this.subElements = {};
  }

  get template() {
    return `
      <div class="column-chart column-chart_loading" style="--chart-height: ${this.chartHeight}">
        <div class="column-chart__title">
          Total ${this.label}
          ${this.getLink()}
        </div>
        <div class="column-chart__container">
          <div data-element="header" class="column-chart__header"></div>
          <div data-element="body" class="column-chart__chart"></div>
        </div>
      </div>
    `;
  }
}
