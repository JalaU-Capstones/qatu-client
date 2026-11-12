/**
 * Reusable quantity selector (`− 1 +`) used by the product detail page and
 * the shopping cart. It is a pure presentation component: the caller owns the
 * state and receives every change through `onChange`.
 */
export class QuantitySelectorView {
  /**
   * @param {Object} [options]
   * @param {number} [options.value=1]
   * @param {number} [options.min=1]
   * @param {number|null} [options.max=null]
   * @param {boolean} [options.disabled=false]
   * @param {Function} [options.onChange] Called with the next numeric value.
   * @param {string} [options.label='Cantidad']
   */
  constructor(options = {}) {
    this.min = Number.isFinite(Number(options.min)) ? Math.max(1, Number(options.min)) : 1;
    this.max =
      options.max === null || options.max === undefined
        ? null
        : Math.max(this.min, Number(options.max));
    this.value = this._clamp(options.value ?? 1);
    this.disabled = Boolean(options.disabled);
    this.onChange = typeof options.onChange === 'function' ? options.onChange : null;
    this.label = options.label || 'Cantidad';
    this.element = null;
    this._input = null;
    this._decreaseBtn = null;
    this._increaseBtn = null;
  }

  render() {
    if (this.element) return this.element;

    const wrapper = document.createElement('div');
    wrapper.className = 'q-quantity-selector';
    wrapper.setAttribute('role', 'group');
    wrapper.setAttribute('aria-label', this.label);

    const decrease = document.createElement('button');
    decrease.type = 'button';
    decrease.className = 'q-quantity-selector__btn q-quantity-selector__btn--decrease';
    decrease.setAttribute('aria-label', 'Disminuir cantidad');
    decrease.textContent = '−';
    decrease.addEventListener('click', () => this._step(-1));
    this._decreaseBtn = decrease;

    const input = document.createElement('input');
    input.className = 'q-quantity-selector__input';
    input.type = 'number';
    input.inputMode = 'numeric';
    input.min = String(this.min);
    if (this.max !== null) input.max = String(this.max);
    input.value = String(this.value);
    input.setAttribute('aria-label', this.label);
    input.addEventListener('change', () => {
      const parsed = Number(input.value);
      const next = this._clamp(Number.isFinite(parsed) ? parsed : this.value);
      this._apply(next, true);
    });
    input.addEventListener('blur', () => {
      input.value = String(this.value);
    });
    this._input = input;

    const increase = document.createElement('button');
    increase.type = 'button';
    increase.className = 'q-quantity-selector__btn q-quantity-selector__btn--increase';
    increase.setAttribute('aria-label', 'Aumentar cantidad');
    increase.textContent = '+';
    increase.addEventListener('click', () => this._step(1));
    this._increaseBtn = increase;

    wrapper.appendChild(decrease);
    wrapper.appendChild(input);
    wrapper.appendChild(increase);

    this.element = wrapper;
    this._syncDisabled();
    return wrapper;
  }

  /**
   * @param {HTMLElement} container
   * @returns {HTMLElement}
   */
  mount(container) {
    const el = this.render();
    container.appendChild(el);
    return el;
  }

  /**
   * Updates the visible value without notifying the caller.
   * @param {number} value
   */
  setValue(value) {
    this._apply(this._clamp(value), false);
  }

  /**
   * @param {number} delta
   * @private
   */
  _step(delta) {
    if (this.disabled) return;
    const next = this._clamp(this.value + delta);
    if (next === this.value) return;
    this._apply(next, true);
  }

  /**
   * @param {number} value
   * @param {boolean} notify
   * @private
   */
  _apply(value, notify) {
    this.value = value;
    if (this._input) this._input.value = String(value);
    this._syncDisabled();
    if (notify && this.onChange) this.onChange(value);
  }

  /**
   * @param {number} value
   * @returns {number}
   * @private
   */
  _clamp(value) {
    let next = Math.max(this.min, Math.floor(Number(value) || this.min));
    if (this.max !== null) next = Math.min(this.max, next);
    return next;
  }

  /**
   * @private
   */
  _syncDisabled() {
    if (this._decreaseBtn) {
      this._decreaseBtn.disabled = this.disabled || this.value <= this.min;
    }
    if (this._increaseBtn) {
      this._increaseBtn.disabled = this.disabled || (this.max !== null && this.value >= this.max);
    }
    if (this._input) {
      this._input.disabled = this.disabled;
    }
  }

  destroy() {
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
    this.element = null;
    this._input = null;
    this._decreaseBtn = null;
    this._increaseBtn = null;
  }
}
