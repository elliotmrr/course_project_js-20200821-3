import fetchJson from './../../utils/fetch-json.js';

export default class DoubleSlider {
  element;
  subElements = {};

  onThumbPointerMove = event => {
    event.preventDefault();

    const { inner, thumbLeft, thumbRight, progress, from, to } = this.subElements;
    const { left: innerLeft, right: innerRight, width } = inner.getBoundingClientRect();

    if (this.dragging === thumbLeft) {
      let newLeft = (event.clientX - innerLeft + this.shiftX) / width;

      if (newLeft < 0) {
        newLeft = 0;
      }
      newLeft *= 100;
      let right = parseFloat(thumbRight.style.right);

      if (newLeft + right > 100) {
        newLeft = 100 - right;
      }

      this.dragging.style.left = progress.style.left = newLeft + '%';
      from.innerHTML = this.formatValue(this.getValue().from);
    }

    if (this.dragging === thumbRight) {
      let newRight = (innerRight - event.clientX - this.shiftX) / width;

      if (newRight < 0) {
        newRight = 0;
      }
      newRight *= 100;

      let left = parseFloat(thumbLeft.style.left);

      if (left + newRight > 100) {
        newRight = 100 - left;
      }
      this.dragging.style.right = progress.style.right = newRight + '%';
      to.innerHTML = this.formatValue(this.getValue().to);
    }
  };

  onThumbPointerUp = () => {
    this.element.classList.remove('range-slider_dragging');

    document.removeEventListener('pointermove', this.onThumbPointerMove);
    document.removeEventListener('pointerup', this.onThumbPointerUp);

    this.element.dispatchEvent(new CustomEvent('range-select', {
      detail: this.getValue(),
      bubbles: true
    }));
  };

  constructor({
    min = 0,
    max = 4000,
    formatValue = value => '$' + value,
    selected = {
      from: min,
      to: max,
    },
  } = {}) {
    this.min = min;
    this.max = max;
    this.formatValue = formatValue;
    this.selected = selected;
    this.selected.from ??= min;
    this.selected.to ??= max;

    this.render();
    this.updateMaxValueRange();
  }

  render() {
    const element = document.createElement('div');
    element.innerHTML = this.template;
    this.element = element.firstElementChild;
    this.element.ondragstart = () => false;

    this.subElements = this.getSubElements(element);

    this.initEventListeners();
    this.update();
  }

  initEventListeners() {
    const { thumbLeft, thumbRight } = this.subElements;

    thumbLeft.addEventListener('pointerdown', event => this.onThumbPointerDown(event));
    thumbRight.addEventListener('pointerdown', event => this.onThumbPointerDown(event));
  }

  update() {
    const { progress, thumbLeft, thumbRight } = this.subElements;
    const rangeTotal = this.max - this.min;
    const left = Math.floor((this.selected.from - this.min) / rangeTotal * 100) + '%';
    const right = Math.floor((this.max - this.selected.to) / rangeTotal * 100) + '%';

    progress.style.left = left;
    progress.style.right = right;

    thumbLeft.style.left = left;
    thumbRight.style.right = right;
  }

  onThumbPointerDown(event) {
    const thumbElem = event.target;

    event.preventDefault();

    const { left, right } = thumbElem.getBoundingClientRect();

    if (thumbElem === this.subElements.thumbLeft) {
      this.shiftX = right - event.clientX;
    } else {
      this.shiftX = left - event.clientX;
    }

    this.dragging = thumbElem;

    this.element.classList.add('range-slider_dragging');

    document.addEventListener('pointermove', this.onThumbPointerMove);
    document.addEventListener('pointerup', this.onThumbPointerUp);
  }

  getValue() {
    const rangeTotal = this.max - this.min;
    const { left } = this.subElements.thumbLeft.style;
    const { right } = this.subElements.thumbRight.style;

    const from = Math.round(this.min + parseFloat(left) * 0.01 * rangeTotal);
    const to = Math.round(this.max - parseFloat(right) * 0.01 * rangeTotal);

    return { from, to };
  }

  getSubElements(element) {
    const elements = element.querySelectorAll('[data-element]');

    return [...elements].reduce((accum, subElement) => {
      accum[subElement.dataset.element] = subElement;

      return accum;
    }, {});
  }

  async updateMaxValueRange() {
    const data = await fetchJson(`${process.env.BACKEND_URL}api/rest/products`);

    if (data.length) {
      this.max = Math.max(...getPrices(data));
      this.selected.to = this.max;

      this.subElements.to.innerHTML = this.formatValue(this.max);
    }

    function getPrices(data) {
      return data.reduce((prices, product) => {
        prices.push(product.price);

        return prices;
      }, []);
    }
  }

  remove() {
    this.element.remove();
  }

  destroy() {
    this.remove();
    document.removeEventListener('pointermove', this.onThumbPointerMove);
    document.removeEventListener('pointerup', this.onThumbPointerUp);
  }

  get template() {
    const { from, to } = this.selected;

    return `<div class="range-slider">
      <span data-element="from">${this.formatValue(from)}</span>
      <div data-element="inner" class="range-slider__inner">
        <span data-element="progress" class="range-slider__progress"></span>
        <span data-element="thumbLeft" class="range-slider__thumb-left"></span>
        <span data-element="thumbRight" class="range-slider__thumb-right"></span>
      </div>
      <span data-element="to">${this.formatValue(to)}</span>
    </div>`;
  }
}
