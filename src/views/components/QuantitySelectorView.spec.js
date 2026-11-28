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

// Recovered coverage from backup/pre-rebase-tests
(() => {
  (() => {
    describe('QuantitySelectorView additional branches (recovered 1)', () => {
      let container;
      let view = null;

      beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
      });

      afterEach(() => {
        view?.destroy();
        container.remove();
      });

      it('normalizes minimums at or below one and non-finite values', () => {
        const cases = [
          [{ min: 0 }, 1],
          [{ min: -5 }, 1],
          [{ min: 1 }, 1],
          [{ min: '3' }, 3],
          [{ min: '' }, 1],
          [{ min: null }, 1],
          [{ min: 'abc' }, 1],
          [{ min: Infinity }, 1],
        ];

        cases.forEach(([options, expected]) => {
          view = new QuantitySelectorView(options);
          expect(view.min).toBe(expected);
        });
      });

      it('keeps fractional minimums verbatim and clamps values below them', () => {
        view = new QuantitySelectorView({ min: 2.7, value: 2 });
        expect(view.min).toBe(2.7);
        expect(view.value).toBe(2.7);

        const input = view.render().querySelector('.q-quantity-selector__input');
        expect(input.getAttribute('min')).toBe('2.7');
        expect(input.value).toBe('2.7');
      });

      it('clamps the maximum up to the minimum and characterizes non-numeric maximums', () => {
        const cases = [
          [{ min: 3, max: 1 }, 3],
          [{ max: '4' }, 4],
          [{ max: null }, null],
          [{}, null],
        ];

        cases.forEach(([options, expected]) => {
          view = new QuantitySelectorView(options);
          expect(view.max).toBe(expected);
        });

        view = new QuantitySelectorView({ max: 'abc' });
        expect(view.max).toBeNaN();
        expect(view.value).toBeNaN();
        expect(view.render().querySelector('input').getAttribute('max')).toBe('NaN');
      });

      it('coerces disabled and onChange options and falls back for empty labels', () => {
        expect(new QuantitySelectorView({ disabled: 'yes' }).disabled).toBe(true);
        expect(new QuantitySelectorView({ disabled: 0 }).disabled).toBe(false);
        expect(new QuantitySelectorView({ onChange: 'nope' }).onChange).toBeNull();

        const onChange = () => {};
        expect(new QuantitySelectorView({ onChange }).onChange).toBe(onChange);
        expect(new QuantitySelectorView({ label: '' }).label).toBe('Cantidad');
        expect(new QuantitySelectorView({ label: null }).label).toBe('Cantidad');
        expect(new QuantitySelectorView({ label: 'Unidades' }).label).toBe('Unidades');
      });

      it('renders group, button and input roles, labels and types in order', () => {
        view = new QuantitySelectorView({ value: 2, min: 1, max: 5, label: 'Unidades' });
        const element = view.render();
        const [decrease, input, increase] = element.children;

        expect(element.getAttribute('role')).toBe('group');
        expect(element.getAttribute('aria-label')).toBe('Unidades');
        expect(element.className).toBe('q-quantity-selector');
        expect(decrease.type).toBe('button');
        expect(decrease.className).toBe(
          'q-quantity-selector__btn q-quantity-selector__btn--decrease'
        );
        expect(decrease.getAttribute('aria-label')).toBe('Disminuir cantidad');
        expect(decrease.textContent).toBe('−');
        expect(input.type).toBe('number');
        expect(input.inputMode).toBe('numeric');
        expect(input.getAttribute('min')).toBe('1');
        expect(input.getAttribute('max')).toBe('5');
        expect(input.value).toBe('2');
        expect(input.getAttribute('aria-label')).toBe('Unidades');
        expect(increase.type).toBe('button');
        expect(increase.className).toBe(
          'q-quantity-selector__btn q-quantity-selector__btn--increase'
        );
        expect(increase.getAttribute('aria-label')).toBe('Aumentar cantidad');
        expect(increase.textContent).toBe('+');

        view.destroy();
        view = new QuantitySelectorView({ value: 1 });
        expect(view.render().querySelector('input').hasAttribute('max')).toBe(false);
      });

      it('clamps and notifies on change, notifies unchanged for invalid input and resets on blur', () => {
        const onChange = jasmine.createSpy('onChange');
        view = new QuantitySelectorView({ value: 3, min: 1, max: 5, onChange });
        const input = view.mount(container).querySelector('input');

        input.value = '2.7';
        input.dispatchEvent(new Event('change'));
        expect(view.value).toBe(2);
        expect(onChange).toHaveBeenCalledWith(2);

        input.value = '';
        input.dispatchEvent(new Event('change'));
        expect(view.value).toBe(1);
        expect(onChange).toHaveBeenCalledWith(1);

        input.type = 'text';
        input.value = 'abc';
        input.dispatchEvent(new Event('change'));
        expect(view.value).toBe(1);
        expect(onChange).toHaveBeenCalledTimes(3);
        expect(onChange.calls.mostRecent().args[0]).toBe(1);
        input.type = 'number';

        input.value = '9';
        input.dispatchEvent(new Event('blur'));
        expect(input.value).toBe('1');
        expect(onChange).toHaveBeenCalledTimes(3);
      });

      it('guards _step at the minimum, maximum and disabled state', () => {
        const onChange = jasmine.createSpy('onChange');
        view = new QuantitySelectorView({ value: 1, min: 1, max: 3, onChange });
        const element = view.mount(container);
        const decrease = element.querySelector('.q-quantity-selector__btn--decrease');

        decrease.click();
        view._step(-1);
        expect(view.value).toBe(1);
        expect(onChange).not.toHaveBeenCalled();

        view._step(1);
        expect(view.value).toBe(2);
        expect(onChange).toHaveBeenCalledWith(2);

        view.setValue(3);
        view._step(1);
        expect(view.value).toBe(3);
        expect(onChange).toHaveBeenCalledTimes(1);

        view.disabled = true;
        view._step(-1);
        view._step(1);
        expect(view.value).toBe(3);
        expect(onChange).toHaveBeenCalledTimes(1);
      });

      it('setValue clamps out-of-range values silently before render', () => {
        const onChange = jasmine.createSpy('onChange');
        view = new QuantitySelectorView({ value: 1, min: 2, max: 4, onChange });
        expect(view.value).toBe(2);
        expect(view._input).toBeNull();

        view.setValue(99);
        expect(view.value).toBe(4);
        expect(onChange).not.toHaveBeenCalled();

        view.setValue('abc');
        expect(view.value).toBe(2);
        expect(onChange).not.toHaveBeenCalled();

        const element = view.mount(container);
        expect(element.querySelector('input').value).toBe('2');
        expect(element.querySelector('.q-quantity-selector__btn--decrease').disabled).toBe(true);
        expect(element.querySelector('.q-quantity-selector__btn--increase').disabled).toBe(false);
      });

      it('syncs disabled buttons and input dynamically after render', () => {
        view = new QuantitySelectorView({ value: 1, min: 1, max: 3 });
        const element = view.mount(container);
        const decrease = element.querySelector('.q-quantity-selector__btn--decrease');
        const input = element.querySelector('input');
        const increase = element.querySelector('.q-quantity-selector__btn--increase');

        expect(decrease.disabled).toBe(true);
        expect(increase.disabled).toBe(false);

        view.setValue(3);
        expect(decrease.disabled).toBe(false);
        expect(increase.disabled).toBe(true);

        view.max = 5;
        view._syncDisabled();
        expect(increase.disabled).toBe(false);

        view.disabled = true;
        view._syncDisabled();
        expect(decrease.disabled).toBe(true);
        expect(increase.disabled).toBe(true);
        expect(input.disabled).toBe(true);

        view.disabled = false;
        view._syncDisabled();
        expect(decrease.disabled).toBe(false);
        expect(input.disabled).toBe(false);
      });

      it('caches render output and the mounted node', () => {
        view = new QuantitySelectorView({ value: 2 });
        const first = view.render();

        expect(view.render()).toBe(first);
        expect(view.mount(container)).toBe(first);
        expect(view.render()).toBe(first);
        expect(container.querySelectorAll('.q-quantity-selector').length).toBe(1);
      });

      it('destroy nulls cached refs and is safe detached, twice and on re-render', () => {
        view = new QuantitySelectorView();
        const first = view.render();
        expect(view._input).not.toBeNull();
        expect(view._decreaseBtn).not.toBeNull();
        expect(view._increaseBtn).not.toBeNull();

        view.destroy();
        expect(view.element).toBeNull();
        expect(view._input).toBeNull();
        expect(view._decreaseBtn).toBeNull();
        expect(view._increaseBtn).toBeNull();
        expect(() => view.destroy()).not.toThrow();

        const second = view.render();
        expect(second).not.toBe(first);
        expect(view._input).not.toBeNull();
        view.destroy();

        const untouched = new QuantitySelectorView();
        expect(() => untouched.destroy()).not.toThrow();
        view = untouched;
      });
    });
  })();
})();
