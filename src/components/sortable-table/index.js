import fetchJson from './../../utils/fetch-json.js';
import escapeHtml from './../../utils/escape-html';

const LOCALES = JSON.parse(process.env.LOCALES);

export default class SortableTable {
  element;
  subElements = {};
  data = [];
  loading = false;

  // TODO: fix a bug: infinite scroll and increase range of load data
  onWindowScroll = async () => {
    const { bottom } = this.element.getBoundingClientRect();

    if (bottom < document.documentElement.clientHeight + 100 && !this.loading && !this.isSortLocally) {
      this.start = this.end;

      this.loading = true;

      const data = await this.loadData();
      this.addTableBodyRows(data);

      this.loading = false;
    }
  };

  onSortClick = event => {
    const column = event.target.closest(".sortable-table__cell[data-sortable=true]");

    if (!column) {
      return;
    }

    if (!this.loading) {
      // TODO: реализовать прерывалели запросов вместо блокирования "повторных" запросов
      // Запрещаем запрос
      this.loading = true;

      const { id, order: oldOrder } = column.dataset;
      const order = toggleOrder(oldOrder);

      this.sortOn = { id, order };

      this.sort().then(() => this.loading = false /*Разрешаем запрос*/);
    }

    function toggleOrder(order) {
      const orders = {
        asc: 'desc',
        desc: 'asc'
      };

      return orders[order];
    }
  };

  constructor(headersConfig = [], {
    url = '',
    sortOn = {
      id: headersConfig.find(item => item.sortable).id,
      order: 'asc',
    },
    isSortLocally = false,
    start = 0,
    step = 30,
    dateRange = {},
    priceRange = {},
    searchTitle = '',
    searchStatus = '',
  } = {}) {
    this.headersConfig = headersConfig;
    this.url = url;
    this.sortOn = sortOn;
    this.isSortLocally = isSortLocally;
    this.start = start;
    this.step = step;
    this.dateRange = dateRange;
    this.priceRange = priceRange;
    this.searchTitle = searchTitle;
    this.searchStatus = searchStatus;

    this.render();
    this.update();
    this.initEventListeners();
  }

  render() {
    const element = document.createElement('div');
    element.innerHTML = this.template;
    this.element = element.firstElementChild;

    this.subElements = this.getSubElements(element);
  }

  initEventListeners() {
    this.subElements.header.addEventListener("pointerdown", event => this.onSortClick(event));

    document.addEventListener('scroll', this.onWindowScroll);
  }

  async loadData() {
    const url = new URL(this.url, process.env.BACKEND_URL);
    const { id, order } = this.sortOn;
    const { from, to } = this.dateRange;
    const { from: priceFrom, to: priceTo } = this.priceRange;

    url.searchParams.set('_sort', id);
    url.searchParams.set('_order', order);
    url.searchParams.set('_start', this.start);
    url.searchParams.set('_end', this.end);

    if (from) {
      url.searchParams.set('from', from.toISOString());
    }

    if (to) {
      url.searchParams.set('to', to.toISOString());
    }

    if (isFinite(priceFrom)) {
      url.searchParams.set('price_gte', priceFrom);
    }

    if (isFinite(priceTo)) {
      url.searchParams.set('price_lte', priceTo);
    }

    if (this.searchTitle) {
      url.searchParams.set('title_like', this.searchTitle);
    }

    if (this.searchStatus) {
      url.searchParams.set('status', this.searchStatus);
    }

    this.element.classList.add('sortable-table_loading');

    const data = await fetchJson(url);

    this.element.classList.remove('sortable-table_loading');

    return data;
  }

  async update({ dateRange, priceRange, searchTitle, searchStatus } = {}) {
    if (dateRange) {
      this.dateRange = dateRange;
    }

    if (priceRange) {
      this.priceRange = priceRange;
    }

    if (searchTitle !== undefined) {
      this.searchTitle = escapeHtml(searchTitle.trim());
    }

    if (searchStatus !== undefined) {
      this.searchStatus = searchStatus;
    }

    await this.sortOnServer();

    return this.element;
  }

  async sort() {
    this.setCaret();

    if (this.isSortLocally) {
      this.sortLocally()
    } else {
      await this.sortOnServer();
    }
  }

  sortLocally() {
    this.sortData();
    this.renderTableBodyRows();
  }

  async sortOnServer() {
    const { body } = this.subElements;

    // Обнуляем для "правильного" получения данных
    this.start = 0;
    body.innerHTML = "";

    this.data = await this.loadData();

    this.renderTableBodyRows();
  }

  renderTableBodyRows() {
    this.subElements.body.innerHTML = this.getTableBodyRows(this.data);

    if (this.data.length) {
      this.element.classList.remove('sortable-table_empty');
    } else {
      this.element.classList.add('sortable-table_empty');
    }
  }

  addTableBodyRows(data) {
    this.data.push(...data);

    const rows = document.createElement('div');
    rows.innerHTML = this.getTableBodyRows(data);

    this.subElements.body.append(...rows.children);
  }

  sortData() {
    const { id, order } = this.sortOn;

    const arr = [...this.data];
    const column = this.headersConfig.find(item => item.id === id);
    const { sortType, customSorting } = column;
    const direction = order === 'asc' ? 1 : -1;

    this.data = arr.sort((a, b) => {
      switch (sortType) {
        case 'number':
          return direction * (a[id] - b[id]);
        case 'string':
          return direction * a[id].localeCompare(b[id], LOCALES);
        case 'custom':
          return direction * customSorting(a, b);
        default:
          return direction * (a[id] - b[id]);
      }
    });
  }

  getTableHeaderCells({ id, title, sortable }) {
    const order = sortable ? `data-order="${this.sortOn.order}"` : "";

    return `
      <div class="sortable-table__cell" data-id="${id}" data-sortable="${sortable}" ${order}>
        <span>${title}</span>
        ${id === this.sortOn.id ? this.headerSortingArrow : ""}
      </div>
    `;
  }

  setCaret() {
    const { id, order } = this.sortOn;
    const { header, arrow } = this.subElements;

    const column = header.querySelector(`[data-id="${id}"]`);

    column.dataset.order = order;
    column.append(arrow);
  }

  getTableBodyRows(data) {
    return data.map(item => `
      <a href="products/${item.id}" class="sortable-table__row">
        ${this.getTableBodyCells(item, data)}
      </a>
    `).join('');
  }

  getTableBodyCells(item) {
    const cells = this.headersConfig.map(({ id, template }) => {
      return { id, template };
    });

    return cells.map(({ id, template }) => {
      return template
        ? template(item[id])
        : `<div class="sortable-table__cell">${item[id]}</div>`;
    }).join('');
  }

  getSubElements(element) {
    const elements = element.querySelectorAll('[data-element]');

    return [...elements].reduce((accum, subElement) => {
      accum[subElement.dataset.element] = subElement;

      return accum;
    }, {});
  }

  deinEventListeners() {
    document.removeEventListener('scroll', this.onWindowScroll);
  }

  remove() {
    this.element.remove();
  }

  destroy() {
    this.remove();
    this.deinEventListeners();
  }

  get template() {
    return `
      <div class="sortable-table sortable-table_loading">
        ${this.tableHeader}
        <div data-element="body" class="sortable-table__body"></div>

        <div data-element="loading" class="loading-line sortable-table__loading-line"></div>

        <div data-element="emptyPlaceholder" class="sortable-table__empty-placeholder">
          <div>Нет данных</div>
        </div>
      </div>
    `;
  }

  get tableHeader() {
    return `
      <div data-element="header" class="sortable-table__header sortable-table__row">
        ${this.headersConfig.map(item => this.getTableHeaderCells(item)).join('')}
      </div>
    `;
  }

  get headerSortingArrow() {
    return `
      <span data-element="arrow" class="sortable-table__sort-arrow">
        <span class="sort-arrow"></span>
      </span>
    `;
  }

  get end() {
    return this.start + this.step;
  }
}
