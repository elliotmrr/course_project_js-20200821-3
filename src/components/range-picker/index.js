const LOCALES = JSON.parse(process.env.LOCALES);

export default class RangePicker {
  element;
  isFromSelected = false;
  subElements = {};
  selected = {};

  static formatDate(date) {
    return date.toLocaleString(LOCALES, {
      dateStyle: 'short'
    });
  }

  onDocumentClick = event => {
    const isOpen = this.element.classList.contains('rangepicker_open');
    const isRangePicker = this.element.contains(event.target);

    if (isOpen && !isRangePicker) {
      this.close();
    }
  };

  constructor({
    from,
    to = new Date()
  } = {}) {
    if (!from) {
      from = new Date(to);
      from.setMonth(to.getMonth() - 2);
    }

    this.selected = { from, to };
    this.showDateFrom = new Date(from);

    this.render();

    this.initEventListeners();
  }

  render() {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = this.template;
    this.element = wrapper.firstElementChild;

    this.subElements = this.getSubElements(this.element);
  }

  initEventListeners() {
    const {input, selector} = this.subElements;

    input.addEventListener('click', () => this.toggle());
    selector.addEventListener('click', event => this.onSelectorClick(event));

    document.addEventListener('click', this.onDocumentClick, true);
  }

  prev() {
    this.showDateFrom.setMonth(this.showDateFrom.getMonth() - 1);
    this.renderDateRangePicker();
  }

  next() {
    this.showDateFrom.setMonth(this.showDateFrom.getMonth() + 1);
    this.renderDateRangePicker();
  }

  toggle() {
    this.element.classList.toggle('rangepicker_open');
    this.renderDateRangePicker();
  }

  close() {
    this.element.classList.remove('rangepicker_open');
  }

  onSelectorClick({ target }) {
    if (target.classList.contains('rangepicker__cell')) {
      this.onRangePickerCellClick(target);
    }
  }

  onRangePickerCellClick(target) {
    const { value } = target.dataset;

    if (!value) {
      return;
    }

    const dateValue = new Date(value);

    const setFromDate = () => {
      this.selected = {
        from: dateValue,
        to:   null
      };
    };

    const setToDate = () => {
      if (dateValue > this.selected.from) {
        this.selected.to = dateValue;
      } else {
        this.selected.to = this.selected.from;
        this.selected.from = dateValue;
      }

      setSelectedRange();
    };

    const setSelectedRange = () => {
      this.subElements.from.innerHTML = RangePicker.formatDate(this.selected.from);
      this.subElements.to.innerHTML = RangePicker.formatDate(this.selected.to)
      this.dispatchEvent();
      this.close();
    };

    if (this.isFromSelected) {
      setToDate();
      this.isFromSelected = false;
    } else {
      setFromDate();
      this.isFromSelected = true;
    }

    this.renderHighlight();
  }

  renderDateRangePicker() {
    const from = new Date(this.showDateFrom);
    const to = new Date(this.showDateFrom);

    to.setMonth(to.getMonth() + 1);

    this.renderCalendar({ from, to });

    this.renderHighlight();
  }

  renderCalendar({ from, to }) {
    const { selector } = this.subElements;

    selector.innerHTML = `
      ${this.getCalendar(from)}
      ${this.getCalendar(to)}
    `;

    const arrow = document.createElement("div");
    arrow.className = "rangepicker__selector-arrow";

    const controlLeft = document.createElement("div");
    controlLeft.className = "rangepicker__selector-control-left";
    controlLeft.addEventListener('click', () => this.prev());

    const controlRight = document.createElement("div");
    controlRight.className = "rangepicker__selector-control-right";
    controlRight.addEventListener('click', () => this.next());

    selector.prepend(
      arrow,
      controlLeft,
      controlRight,
    );
  }

  getCalendar(givenDate) {
    const date = new Date(givenDate);

    return `
      <div class="rangepicker__calendar">
        ${this.getCalendarItems(date)}
      </div>
    `;
  }

  getCalendarItems(givenDate) {
    return `
      <div class="rangepicker__month-indicator">
        ${this.getMonthIndicator(givenDate)}
      </div>
      <div class="rangepicker__day-of-week">
        ${this.daysWeek}
      </div>
      <div class="rangepicker__date-grid">
        ${this.getDateGrid(givenDate)}
      </div>
    `;
  }

  getMonthIndicator(givenDate) {
    const monthStr = givenDate.toLocaleString(LOCALES, { month: 'long' });

    return `
      <time datetime=${monthStr}>${monthStr}</time>
    `;
  }

  getDateGrid(givenDate) {
    const date = new Date(givenDate);
    const buttons = [];

    date.setDate(1);

    const dayWeekNumber = [7, 1, 2, 3, 4, 5, 6][date.getDay()];

    const firstDayMonthButton = `
      <button
        type="button"
        class="rangepicker__cell"
        data-value="${date.toISOString()}"
        style="--start-from: ${dayWeekNumber}">
          ${date.getDate()}
      </button>
    `;

    buttons.push(firstDayMonthButton);

    date.setDate(2);

    while (date.getMonth() === givenDate.getMonth()) {
      const dayButton = `
        <button
          type="button"
          class="rangepicker__cell"
          data-value="${date.toISOString()}">
            ${date.getDate()}
        </button>
      `;

      buttons.push(dayButton);

      date.setDate(date.getDate() + 1);
    }

    return buttons.join('');
  }

  renderHighlight() {
    const { from, to } = this.selected;
    const { selector } = this.subElements;

    for (const cell of selector.querySelectorAll('.rangepicker__cell')) {
      const { value } = cell.dataset;
      const cellDate = new Date(value);

      cell.classList.remove('rangepicker__selected-from');
      cell.classList.remove('rangepicker__selected-between');
      cell.classList.remove('rangepicker__selected-to');

      if (from && value === from.toISOString()) {
        cell.classList.add('rangepicker__selected-from');
      } else if (to && value === to.toISOString()) {
        cell.classList.add('rangepicker__selected-to');
      } else if (from && to && cellDate >= from && cellDate <= to) {
        cell.classList.add('rangepicker__selected-between');
      }
    }
  }

  dispatchEvent() {
    this.element.dispatchEvent(new CustomEvent('date-select', {
      bubbles: true,
      detail:  this.selected
    }));
  }

  deinEventListeners() {
    document.removeEventListener('click', this.onDocumentClick, true);
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
    this.deinEventListeners();
  }

  get template() {
    const from = RangePicker.formatDate(this.selected.from);
    const to = RangePicker.formatDate(this.selected.to);

    return `
      <div class="rangepicker">
        <div class="rangepicker__input" data-element="input">
          <span data-element="from">${from}</span> -
          <span data-element="to">${to}</span>
        </div>
        <div class="rangepicker__selector" data-element="selector"></div>
      </div>
    `;
  }

  get daysWeek() {
    const date = new Date(0);
    date.setDate(-2); // set on Monday

    const days = [];

    for (let i = 0; i < 7; i++) {
      const dayWeek = `<div>${formatDate(date)}</div>`;

      days.push(dayWeek);

      date.setDate(date.getDate() + 1);
    }

    return days.join('');

    function formatDate(date) {
      return date.toLocaleString(LOCALES, {
        weekday: 'short'
      });
    }
  }
}
