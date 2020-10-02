import fetchJson from './../../utils/fetch-json.js';

export default class SortableTable {
  element;
  subElements = {};
  data = [];
  loading = false;

  onWindowScroll = async () => {
    const { bottom } = this.element.getBoundingClientRect();
    const { id, order } = this.sorting;

    if (bottom < document.documentElement.clientHeight && !this.loading && !this.isSortLocally) {
      this.start = this.end;

      this.loading = true;

      const data = await this.loadData(id, order, this.start, this.end);
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
      // Запрещаем запрос
      this.loading = true;

      const {id, order: oldOrder} = column.dataset;
      const order = toggleOrder(oldOrder);

      this.sorting = {id, order};

      this.sort(id, order);
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
    sorting = {
      id: headersConfig.find(item => item.sortable).id,
      order: 'asc',
    },
    isSortLocally = false,
    start = 0,
    step = 20,
    range = {},
  } = {}) {
    this.headersConfig = headersConfig;
    this.url = url;
    this.sorting = sorting;
    this.isSortLocally = isSortLocally;
    this.start = start;
    this.step = step;
    this.range = range;

    this.render();
    this.initEventListeners();
  }

  render() {
    const element = document.createElement('div');
    element.innerHTML = this.template;
    this.element = element.firstElementChild;

    this.subElements = this.getSubElements(element);
    this.update();

    return this.element;
  }

  initEventListeners() {
    this.subElements.header.addEventListener("pointerdown", event => this.onSortClick(event));
    document.addEventListener('scroll', this.onWindowScroll);
  }

  async loadData(id, order, start = this.start, end = this.end) {
    const url = new URL(this.url, process.env.BACKEND_URL);
    const { from, to } = this.range;

    url.searchParams.set('_sort', id);
    url.searchParams.set('_order', order);
    url.searchParams.set('_start', start);
    url.searchParams.set('_end', end);

    if (from && to) {
      url.searchParams.set('from', from.toISOString());
      url.searchParams.set('to', to.toISOString());
    }

    this.element.classList.add('sortable-table_loading');

    const data = await fetchJson(url);

    this.element.classList.remove('sortable-table_loading');

    return data;
  }

  async update(from, to) {
    if (from && to) {
      this.range = {from, to};
    }

    const { id, order } = this.sorting;

    return this.sortOnServer(id, order);
  }

  async sort(field, order) {
    this.setCaret(field, order);

    return this.isSortLocally
      ? this.sortLocally(field, order)
      : await this.sortOnServer(field, order);
  }

  sortLocally(id, order) {
    const sortedData = this.sortData(id, order);

    return this.renderTableBodyRows(sortedData);
  }

  async sortOnServer(id, order) {
    const { body } = this.subElements;

    // Обнуляем для "правильного" получения данных
    this.start = 0;
    body.innerHTML = "";

    this.data = await this.loadData(id, order);

    // Разрешаем запрос
    this.loading = false;

    return this.renderTableBodyRows(this.data);
  }

  renderTableBodyRows(data) {
    const { body } = this.subElements;

    body.innerHTML = this.getTableBodyRows(data);

    if (data.length) {
      this.element.classList.remove('sortable-table_empty');
    } else {
      this.element.classList.add('sortable-table_empty');
    }

    return body;
  }

  addTableBodyRows(data) {
    this.data.push(...data);

    const rows = document.createElement('div');
    rows.innerHTML = this.getTableBodyRows(data);

    this.subElements.body.append(...rows.children);
  }

  sortData(id, order = this.sorting.order) {
    if (!id) {
      return;
    }

    const arr = [...this.data];
    const column = this.headersConfig.find(item => item.id === id);
    const { sortType, customSorting } = column;
    const direction = order === 'asc' ? 1 : -1;

    return arr.sort((a, b) => {
      switch (sortType) {
        case 'number':
          return direction * (a[id] - b[id]);
        case 'string':
          return direction * a[id].localeCompare(b[id], ['ru', 'en']);
        case 'custom':
          return direction * customSorting(a, b);
        default:
          return direction * (a[id] - b[id]);
      }
    });
  }

  getTableHeaderCells({id, title, sortable}) {
    const order = sortable ? `data-order="${this.sorting.order}"` : "";

    return `
      <div class="sortable-table__cell" data-id="${id}" data-sortable="${sortable}" ${order}>
        <span>${title}</span>
        ${id === this.sorting.id ? this.headerSortingArrow : ""}
      </div>
    `;
  }

  setCaret(field, order = this.sorting.order) {
    if (!field) {
      return;
    }

    const { header, arrow } = this.subElements;
    const column = header.querySelector(`[data-id="${field}"]`);

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
    const cells = this.headersConfig.map(({id, template}) => {
      return {id, template};
    });

    return cells.map(({id, template}) => {
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

  remove () {
    this.element.remove();
    this.deinEventListeners();
  }

  destroy() {
    this.remove();
    this.element = null;
    this.subElements = {};
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
