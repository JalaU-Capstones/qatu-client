import { QuantitySelectorView } from './QuantitySelectorView.js';

describe('QuantitySelectorView', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
  });

  it('renders the current value and both controls', () => {
    const selector = new QuantitySelectorView({ value: 3 });
    const el = selector.mount(container);

    expect(el.classList.contains('q-quantity-selector')).toBe(true);
    expect(el.querySelector('.q-quantity-selector__input').value).toBe('3');
    expect(el.querySelector('.q-quantity-selector__btn--decrease').textContent).toBe('−');
    expect(el.querySelector('.q-quantity-selector__btn--increase').textContent).toBe('+');
  });

  it('increments and decrements through onChange', () => {
    const onChange = jasmine.createSpy('onChange');
    const selector = new QuantitySelectorView({ value: 2, onChange });
    const el = selector.mount(container);

    el.querySelector('.q-quantity-selector__btn--increase').click();
    expect(onChange).toHaveBeenCalledWith(3);
    expect(selector.value).toBe(3);

    el.querySelector('.q-quantity-selector__btn--decrease').click();
    expect(onChange).toHaveBeenCalledWith(2);
    expect(selector.value).toBe(2);
  });

  it('disables the decrease button at the minimum', () => {
    const selector = new QuantitySelectorView({ value: 1, min: 1 });
    const el = selector.mount(container);

    expect(el.querySelector('.q-quantity-selector__btn--decrease').disabled).toBe(true);
  });

  it('disables the increase button at the maximum', () => {
    const selector = new QuantitySelectorView({ value: 3, max: 3 });
    const el = selector.mount(container);

    expect(el.querySelector('.q-quantity-selector__btn--increase').disabled).toBe(true);
  });

  it('clamps typed values to the configured range', () => {
    const onChange = jasmine.createSpy('onChange');
    const selector = new QuantitySelectorView({ value: 1, min: 1, max: 4, onChange });
    const el = selector.mount(container);
    const input = el.querySelector('.q-quantity-selector__input');

    input.value = '99';
    input.dispatchEvent(new Event('change'));
    expect(selector.value).toBe(4);
    expect(onChange).toHaveBeenCalledWith(4);

    input.value = '0';
    input.dispatchEvent(new Event('change'));
    expect(selector.value).toBe(1);
  });

  it('supports a disabled state', () => {
    const selector = new QuantitySelectorView({ value: 2, disabled: true });
    const el = selector.mount(container);

    expect(el.querySelector('.q-quantity-selector__input').disabled).toBe(true);
    expect(el.querySelector('.q-quantity-selector__btn--decrease').disabled).toBe(true);
    expect(el.querySelector('.q-quantity-selector__btn--increase').disabled).toBe(true);
  });

  it('setValue updates the value without notifying', () => {
    const onChange = jasmine.createSpy('onChange');
    const selector = new QuantitySelectorView({ value: 1, onChange });
    const el = selector.mount(container);

    selector.setValue(4);

    expect(selector.value).toBe(4);
    expect(el.querySelector('.q-quantity-selector__input').value).toBe('4');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('destroy removes the element from the DOM', () => {
    const selector = new QuantitySelectorView();
    selector.mount(container);
    expect(container.querySelector('.q-quantity-selector')).not.toBeNull();

    selector.destroy();
    expect(container.querySelector('.q-quantity-selector')).toBeNull();
  });
});
