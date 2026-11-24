import { EditProductViewModel } from '../../viewmodels/components/EditProductViewModel.js';
import { EditProductView } from './EditProductView.js';

const tick = (ms = 10) => new Promise((resolve) => setTimeout(resolve, ms));

function mockProduct(overrides = {}) {
  return {
    id: 'product-1',
    category_id: 'category-1',
    name: 'Bolso tejido',
    slug: 'bolso-tejido',
    description: 'Hecho a mano',
    price: 48,
    currency: 'USD',
    stock: 12,
    state: 'draft',
    attributes: { material: 'algodón' },
    ...overrides,
  };
}

describe('EditProductView', () => {
  let view;
  let container;
  let productsApi;
  let categoriesApi;
  let onNavigate;

  beforeEach(() => {
    productsApi = {
      getProductById: jasmine.createSpy('getProductById').and.resolveTo(mockProduct()),
      listProductImages: jasmine.createSpy('listProductImages').and.resolveTo({
        data: [
          {
            id: 'image-1',
            path: 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=',
            alt_text: 'Frente del bolso',
            position: 0,
          },
        ],
      }),
      updateProduct: jasmine.createSpy('updateProduct').and.resolveTo({
        data: mockProduct({ name: 'Bolso andino' }),
      }),
      uploadProductImage: jasmine.createSpy('uploadProductImage').and.resolveTo({
        data: { id: 'image-2', path: 'https://example.test/two.webp', position: 1 },
      }),
      deleteProductImage: jasmine.createSpy('deleteProductImage').and.resolveTo(undefined),
    };
    categoriesApi = {
      getCategories: jasmine.createSpy('getCategories').and.resolveTo({
        data: [
          { id: 'category-1', name: 'Accesorios' },
          { id: 'category-2', name: 'Textiles' },
        ],
      }),
    };
    onNavigate = jasmine.createSpy('onNavigate');
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    view?.destroy();
    view = null;
    container?.remove();
    document.body.style.overflow = '';
  });

  function mount(overrides = {}) {
    view = new EditProductView({
      productId: 'product-1',
      productsApi,
      categoriesApi,
      onNavigate,
      ...overrides,
    });
    view.mount(container);
  }

  it('renders the page structure, status, supported fields, and image count after loading', async () => {
    mount();
    await tick();

    expect(container.querySelector('.q-edit-product__breadcrumb')).not.toBeNull();
    expect(container.querySelector('.q-edit-product__title').textContent).toBe('Editar producto');
    expect(container.querySelector('.q-edit-product__status').textContent).toBe('Borrador');
    expect(container.querySelector('input[name="name"]').value).toBe('Bolso tejido');
    expect(container.querySelector('select[name="categoryId"]').value).toBe('category-1');
    expect(container.querySelector('input[name="slug"]')).toBeNull();
    expect(container.querySelector('textarea[name="attributesText"]')).not.toBeNull();
    expect(container.querySelector('.q-edit-product__image-count').textContent).toBe(
      '1 / 5 imágenes'
    );
    expect(container.querySelector('.q-edit-product__primary-badge').textContent).toBe('Principal');
    expect(container.querySelector('.q-edit-product__image-frame img').alt).toBe(
      'Frente del bolso'
    );
  });

  it('shows the live description count and enforces the description character limit', async () => {
    mount();
    await tick();

    const description = container.querySelector('textarea[name="description"]');
    const counter = container.querySelector('.q-edit-product__character-count');
    expect(counter.textContent).toBe('12 / 5,000');
    description.value = 'Descripción nueva';
    description.dispatchEvent(new Event('input', { bubbles: true }));

    expect(counter.textContent).toBe('17 / 5,000');
    expect(description.maxLength).toBe(5000);
  });

  it('locks currency for published products and shows the published status', async () => {
    productsApi.getProductById.and.resolveTo(mockProduct({ state: 'published' }));
    mount();
    await tick();

    expect(container.querySelector('.q-edit-product__status').textContent).toBe('Publicado');
    expect(container.querySelector('select[name="currency"]').disabled).toBe(true);
    expect(container.querySelector('.q-edit-product__hint--notice')).not.toBeNull();
  });

  it('submits only changed fields, then navigates back to the seller product list', async () => {
    const onSaved = jasmine.createSpy('onSaved');
    mount({ onSaved });
    await tick();

    const name = container.querySelector('input[name="name"]');
    name.value = 'Bolso andino';
    name.dispatchEvent(new Event('input', { bubbles: true }));
    const save = container.querySelector('[data-action="save"]');
    expect(save.disabled).toBe(false);
    save.click();
    await tick();

    expect(productsApi.updateProduct).toHaveBeenCalledWith('product-1', { name: 'Bolso andino' });
    expect(onSaved).toHaveBeenCalledWith(jasmine.objectContaining({ name: 'Bolso andino' }));
    expect(onNavigate).toHaveBeenCalledWith('/seller/products');
  });

  it('passes the loaded product to the delete confirmation trigger', async () => {
    const onDeleteProduct = jasmine.createSpy('onDeleteProduct');
    mount({ onDeleteProduct });
    await tick();

    container.querySelector('.q-edit-product__delete-btn').click();
    expect(onDeleteProduct).toHaveBeenCalledWith(jasmine.objectContaining({ id: 'product-1' }));
  });

  it('uploads through the image picker with the provided alt text', async () => {
    mount();
    await tick();
    const altInput = container.querySelector('.q-edit-product__alt-input');
    altInput.value = 'Vista lateral';
    altInput.dispatchEvent(new Event('input', { bubbles: true }));

    const file = new File(['image'], 'bolso.webp', { type: 'image/webp' });
    const fileInput = container.querySelector('input[type="file"]');
    Object.defineProperty(fileInput, 'files', { configurable: true, value: [file] });
    fileInput.dispatchEvent(new Event('change', { bubbles: true }));
    await tick();

    expect(productsApi.uploadProductImage).toHaveBeenCalledWith('product-1', file, {
      alt_text: 'Vista lateral',
      position: 1,
    });
    expect(container.querySelector('.q-edit-product__image-count').textContent).toBe(
      '2 / 5 imágenes'
    );
  });

  it('keeps unsaved changes safe when cancel is selected', async () => {
    mount();
    await tick();
    const name = container.querySelector('input[name="name"]');
    name.value = 'Nombre modificado';
    name.dispatchEvent(new Event('input', { bubbles: true }));
    container.querySelector('.q-edit-product__cancel-btn').click();

    expect(container.querySelector('.q-edit-product__discard')).not.toBeNull();
    container.querySelector('.q-edit-product__discard .q-btn--danger').click();
    expect(onNavigate).toHaveBeenCalledWith('/seller/products');
  });

  it('confirms image removal with the overlay and reports a deletion error', async () => {
    productsApi.deleteProductImage.and.rejectWith(new Error('No se pudo eliminar'));
    mount();
    await tick();

    container.querySelector('.q-edit-product__image-remove').click();
    const overlay = container.querySelector('.q-edit-product__image-confirm');
    expect(overlay.hidden).toBe(false);
    overlay.querySelector('.q-btn--danger').click();
    await tick();

    expect(productsApi.deleteProductImage).toHaveBeenCalledWith('product-1', 'image-1');
    expect(container.querySelector('.q-edit-product__image-error').textContent).toBe(
      'No se pudo eliminar'
    );
  });
});

// Recovered coverage from backup/pre-rebase-tests
(() => {
  (() => {
    const tick = (ms = 0) => new Promise((resolve) => setTimeout(resolve, ms));

    const createForm = (overrides = {}) => ({
      name: 'Bolso tejido',
      description: 'Hecho a mano',
      price: '48',
      stock: '12',
      currency: 'USD',
      categoryId: 'cat-1',
      attributesText: '',
      ...overrides,
    });

    const createProduct = (overrides = {}) => ({
      id: 'product-1',
      category_id: 'cat-1',
      name: 'Bolso tejido',
      description: 'Hecho a mano',
      price: 48,
      currency: 'USD',
      stock: 12,
      state: 'draft',
      attributes: { material: 'algodón' },
      ...overrides,
    });

    const createImage = (overrides = {}) => ({
      id: 'img-1',
      path: 'https://cdn.test/one.jpg',
      alt_text: 'Frente del bolso',
      position: 0,
      ...overrides,
    });

    const createViewModel = (overrides = {}) => {
      const listeners = new Set();
      const vm = {
        isLoading: false,
        isSaving: false,
        isDirty: false,
        errorMessage: '',
        infoMessage: '',
        loadedProduct: createProduct(),
        form: createForm(),
        categories: [{ id: 'cat-1', name: 'Accesorios' }],
        categoryErrorMessage: '',
        images: [createImage()],
        imageErrorMessage: '',
        uploadErrors: [],
        uploadingCount: 0,
        deletingImageId: null,
        imageErrors: {},
        load: jasmine.createSpy('load').and.resolveTo({ status: 'success' }),
        setField: jasmine.createSpy('setField'),
        addImages: jasmine.createSpy('addImages').and.resolveTo(),
        deleteImage: jasmine.createSpy('deleteImage').and.resolveTo({ status: 'success' }),
        save: jasmine.createSpy('save').and.resolveTo({ status: 'no-changes' }),
        destroy: jasmine.createSpy('destroy'),
        _listeners: listeners,
        subscribe(listener) {
          listeners.add(listener);
          return () => listeners.delete(listener);
        },
        notify() {
          [...listeners].forEach((listener) => listener(vm));
        },
        ...overrides,
      };
      return vm;
    };

    describe('EditProductView additional branches (recovered 1)', () => {
      let container;
      let extraListeners;
      let onNavigate;
      let view;

      const mountView = ({ viewModel = createViewModel(), ...options } = {}) => {
        view = new EditProductView({
          productId: 'product-1',
          onNavigate,
          ...options,
          viewModel,
        });
        view.mount(container);
        return viewModel;
      };

      const pressKey = (key) => {
        const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
        document.dispatchEvent(event);
        return event;
      };

      const submitForm = async () => {
        container
          .querySelector('#edit-product-form')
          .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        await tick();
      };

      beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
        onNavigate = jasmine.createSpy('onNavigate');
        extraListeners = [];
      });

      afterEach(() => {
        view?.destroy();
        view = null;
        extraListeners.forEach(({ target, type, handler }) =>
          target.removeEventListener(type, handler)
        );
        extraListeners = [];
        container.remove();
      });

      it('mounts the shell, subscribes and calls load with the configured product id', () => {
        const viewModel = mountView();

        expect(view.element.classList.contains('q-edit-product')).toBe(true);
        expect(viewModel.load).toHaveBeenCalledTimes(1);
        expect(viewModel.load).toHaveBeenCalledWith('product-1');
        expect(viewModel._listeners.size).toBe(1);
        expect(view._onKeydown).not.toBeNull();
        expect(view._onBeforeUnload).not.toBeNull();
      });

      it('navigates on Escape when the form is clean', () => {
        mountView();

        const event = pressKey('Escape');

        expect(event.defaultPrevented).toBe(true);
        expect(onNavigate).toHaveBeenCalledTimes(1);
        expect(onNavigate).toHaveBeenCalledWith('/seller/products');
      });

      it('shows the discard prompt on Escape when dirty and closes it on a second Escape', () => {
        const viewModel = mountView();
        viewModel.isDirty = true;

        pressKey('Escape');

        expect(onNavigate).not.toHaveBeenCalled();
        const prompt = container.querySelector('.q-edit-product__discard');
        expect(prompt).not.toBeNull();
        expect(prompt.querySelector('p').textContent).toBe(
          'Tienes cambios sin guardar. ¿Quieres descartarlos?'
        );
        expect(prompt.querySelector('.q-btn--outline').textContent).toBe('Seguir editando');
        expect(prompt.querySelector('.q-btn--danger').textContent).toBe('Descartar cambios');
        expect(container.querySelector('.q-edit-product__actions')).toBeNull();

        pressKey('Escape');

        expect(container.querySelector('.q-edit-product__discard')).toBeNull();
        expect(container.querySelector('.q-edit-product__actions')).not.toBeNull();
        expect(onNavigate).not.toHaveBeenCalled();
      });

      it('closes the discard prompt with "Seguir editando" without navigating', () => {
        const viewModel = mountView();
        viewModel.isDirty = true;
        pressKey('Escape');

        container.querySelector('.q-edit-product__discard .q-btn--outline').click();

        expect(container.querySelector('.q-edit-product__discard')).toBeNull();
        expect(container.querySelector('.q-edit-product__actions')).not.toBeNull();
        expect(onNavigate).not.toHaveBeenCalled();
      });

      it('ignores non-Escape keys entirely', () => {
        mountView();

        const event = pressKey('Enter');

        expect(event.defaultPrevented).toBe(false);
        expect(onNavigate).not.toHaveBeenCalled();
        expect(container.querySelector('.q-edit-product__discard')).toBeNull();
      });

      it('prevents beforeunload only while the form is dirty', () => {
        const viewModel = mountView();
        viewModel.isDirty = true;

        const dirtyEvent = new Event('beforeunload', { cancelable: true });
        window.dispatchEvent(dirtyEvent);

        expect(dirtyEvent.defaultPrevented).toBe(true);
        // The real Event.returnValue is boolean in this browser; assigning '' coerces to false.
        expect(dirtyEvent.returnValue).toBe(false);

        viewModel.isDirty = false;
        const cleanEvent = new Event('beforeunload', { cancelable: true });
        window.dispatchEvent(cleanEvent);

        expect(cleanEvent.defaultPrevented).toBe(false);
      });

      it('removes the document and window listeners on destroy', () => {
        const addDocument = spyOn(document, 'addEventListener').and.callThrough();
        const addWindow = spyOn(window, 'addEventListener').and.callThrough();
        mountView();
        expect(addDocument).toHaveBeenCalledWith('keydown', view._onKeydown);
        expect(addWindow).toHaveBeenCalledWith('beforeunload', view._onBeforeUnload);

        const keydown = view._onKeydown;
        const beforeUnload = view._onBeforeUnload;
        const removeDocument = spyOn(document, 'removeEventListener').and.callThrough();
        const removeWindow = spyOn(window, 'removeEventListener').and.callThrough();

        view.destroy();

        expect(removeDocument).toHaveBeenCalledWith('keydown', keydown);
        expect(removeWindow).toHaveBeenCalledWith('beforeunload', beforeUnload);
        expect(view._onKeydown).toBeNull();
        expect(view._onBeforeUnload).toBeNull();
        expect(view._unsubscribe).toBeNull();

        pressKey('Escape');
        const afterDestroy = new Event('beforeunload', { cancelable: true });
        window.dispatchEvent(afterDestroy);
        expect(onNavigate).not.toHaveBeenCalled();
        expect(afterDestroy.defaultPrevented).toBe(false);
      });

      it('supports a double destroy without leftovers', () => {
        mountView();

        expect(() => {
          view.destroy();
          view.destroy();
        }).not.toThrow();
        expect(view.element).toBeNull();
        expect(view._bodyEl).toBeNull();
        expect(view._footerEl).toBeNull();
        expect(view._unsubscribe).toBeNull();
      });

      it('is safe when onNavigate and onSaved are null', async () => {
        const viewModel = mountView({ onNavigate: null, onSaved: null });
        viewModel.save.and.resolveTo({ status: 'success', product: createProduct() });

        expect(() => pressKey('Escape')).not.toThrow();
        expect(() => container.querySelector('.q-edit-product__cancel-btn').click()).not.toThrow();
        expect(() => submitForm()).not.toThrow();
        await tick();
      });

      it('characterizes the remount leak: two shells, duplicate listeners and a stale first shell', () => {
        const viewModel = mountView();
        const firstKeydown = view._onKeydown;
        const firstBeforeUnload = view._onBeforeUnload;
        extraListeners.push(
          { target: document, type: 'keydown', handler: firstKeydown },
          { target: window, type: 'beforeunload', handler: firstBeforeUnload }
        );
        const firstElement = view.element;

        view.mount(container);

        expect(view.element).not.toBe(firstElement);
        expect(container.querySelectorAll('.q-edit-product').length).toBe(2);
        expect(viewModel.load).toHaveBeenCalledTimes(2);

        onNavigate.calls.reset();
        pressKey('Escape');
        expect(onNavigate).toHaveBeenCalledTimes(2);

        viewModel.loadedProduct = createProduct({ state: 'published' });
        viewModel.notify();
        expect(view.element.querySelector('.q-edit-product__status').textContent).toBe('Publicado');
        expect(firstElement.querySelector('.q-edit-product__status').textContent).toBe('Borrador');
      });

      it('renders the loading state with role=status and no form', () => {
        const viewModel = createViewModel({ isLoading: true, loadedProduct: null });
        mountView({ viewModel });

        const loading = container.querySelector('.q-edit-product__state');
        expect(loading.getAttribute('role')).toBe('status');
        expect(loading.textContent).toBe('Cargando producto…');
        expect(container.querySelector('.q-edit-product__status').hidden).toBe(true);
        expect(container.querySelector('form')).toBeNull();
      });

      it('renders the load error when no product is available', () => {
        const viewModel = createViewModel({
          loadedProduct: null,
          errorMessage: 'No pudimos cargar el producto.',
        });
        mountView({ viewModel });

        const alert = container.querySelector('.q-edit-product__error');
        expect(alert.getAttribute('role')).toBe('alert');
        expect(alert.textContent).toBe('No pudimos cargar el producto.');
        expect(container.querySelector('form')).toBeNull();
      });

      it('renders infoMessage with role=status and the exact copy', () => {
        const viewModel = mountView();
        viewModel.infoMessage = 'No hay cambios para guardar.';
        viewModel.notify();

        const info = container.querySelector('.q-edit-product__info');
        expect(info.getAttribute('role')).toBe('status');
        expect(info.textContent).toBe('No hay cambios para guardar.');
      });

      it('maps unpublished and unknown states, keeping the raw state in the class', () => {
        const viewModel = mountView();

        viewModel.loadedProduct = createProduct({ state: 'unpublished' });
        viewModel.notify();
        let status = container.querySelector('.q-edit-product__status');
        expect(status.textContent).toBe('No publicado');
        expect(status.className).toContain('q-edit-product__status--unpublished');

        viewModel.loadedProduct = createProduct({ state: 'archived' });
        viewModel.notify();
        status = container.querySelector('.q-edit-product__status');
        expect(status.textContent).toBe('Borrador');
        expect(status.className).toContain('q-edit-product__status--archived');
      });

      it('adds a fallback option when the loaded category is missing from the list', () => {
        const viewModel = createViewModel({
          categories: [{ id: 'cat-2', name: 'Textiles' }],
          form: createForm({ categoryId: 'cat-9' }),
        });
        mountView({ viewModel });

        const options = [...container.querySelectorAll('select[name="categoryId"] option')].map(
          (option) => [option.value, option.textContent]
        );
        expect(options).toEqual([
          ['', 'Selecciona una categoría'],
          ['cat-2', 'Textiles'],
          ['cat-9', 'Categoría actual'],
        ]);
        expect(container.querySelector('select[name="categoryId"]').value).toBe('cat-9');
      });

      it('renders the category load error as an alert inside the basic information panel', () => {
        const viewModel = createViewModel({
          categoryErrorMessage: 'No pudimos cargar las categorías.',
        });
        mountView({ viewModel });

        const panel = container.querySelector('.q-edit-product__panel');
        const alert = panel.querySelector('.q-edit-product__error');
        expect(alert.getAttribute('role')).toBe('alert');
        expect(alert.textContent).toBe('No pudimos cargar las categorías.');
      });

      it('renders required, numeric, hint and currency attributes for basic fields', () => {
        mountView();

        const name = container.querySelector('input[name="name"]');
        expect(name.required).toBe(true);
        expect(name.maxLength).toBe(200);
        expect(name.type).toBe('text');
        expect(name.parentElement.querySelector('.q-edit-product__hint').textContent).toBe(
          'Entre 3 y 200 caracteres.'
        );
        const price = container.querySelector('input[name="price"]');
        expect(price.type).toBe('number');
        expect(price.required).toBe(true);
        expect(price.min).toBe('0.01');
        expect(price.step).toBe('0.01');
        const stock = container.querySelector('input[name="stock"]');
        expect(stock.type).toBe('number');
        expect(stock.min).toBe('0');
        expect(stock.step).toBe('1');
        const currency = container.querySelector('select[name="currency"]');
        expect([...currency.options].map((option) => option.value)).toEqual([
          'USD',
          'EUR',
          'BOB',
          'PEN',
          'ARS',
          'COP',
          'MXN',
          'BRL',
        ]);
        expect(currency.disabled).toBe(false);
        expect(container.querySelector('label[for="edit-field-name"]').textContent).toBe(
          'Nombre del producto *'
        );
      });

      it('forwards select changes to setField and re-enables save when dirty', () => {
        const viewModel = createViewModel({ isDirty: true });
        mountView({ viewModel });

        const category = container.querySelector('select[name="categoryId"]');
        // The mock only exposes cat-1, so assigning a missing option clears the select.
        // The change handler forwards the actual select value ('') to setField.
        category.value = 'cat-2';
        category.dispatchEvent(new Event('change', { bubbles: true }));
        expect(viewModel.setField).toHaveBeenCalledWith('categoryId', '');

        const currency = container.querySelector('select[name="currency"]');
        currency.value = 'EUR';
        currency.dispatchEvent(new Event('change', { bubbles: true }));
        expect(viewModel.setField).toHaveBeenCalledWith('currency', 'EUR');

        expect(container.querySelector('[data-action="save"]').disabled).toBe(false);
      });

      it('renders the attributes textarea and forwards input to setField', () => {
        const viewModel = createViewModel({ isDirty: true });
        mountView({ viewModel });

        const attributes = container.querySelector('textarea[name="attributesText"]');
        expect(attributes.id).toBe('edit-field-attributes');
        expect(attributes.rows).toBe(4);
        expect(attributes.placeholder).toBe('{"color":"rojo","talla":"M"}');
        expect(attributes.classList.contains('q-edit-product__textarea--code')).toBe(true);
        const panel = attributes.closest('.q-edit-product__panel');
        expect(panel.querySelector('h2').textContent).toBe('Atributos (JSON opcional)');
        expect(panel.querySelector('.q-edit-product__hint').textContent).toBe(
          'Usa un objeto JSON para agregar detalles específicos del producto.'
        );

        attributes.value = '{"color":"azul"}';
        attributes.dispatchEvent(new Event('input', { bubbles: true }));

        expect(viewModel.setField).toHaveBeenCalledWith('attributesText', '{"color":"azul"}');
        expect(container.querySelector('[data-action="save"]').disabled).toBe(false);
      });

      it('characterizes the locale-mixed description counter', () => {
        mountView();

        const description = container.querySelector('textarea[name="description"]');
        const counter = container.querySelector('.q-edit-product__character-count');
        expect(description.rows).toBe(6);
        expect(description.maxLength).toBe(5000);
        expect(counter.getAttribute('aria-live')).toBe('polite');
        expect(counter.textContent).toBe('12 / 5,000');

        const long = 'a'.repeat(1234);
        description.value = long;
        description.dispatchEvent(new Event('input', { bubbles: true }));

        expect(view.viewModel.setField).toHaveBeenCalledWith('description', long);
        expect(counter.textContent).toBe(`${long.length.toLocaleString('es')} / 5,000`);
        expect(counter.textContent).toContain(' / 5,000');
      });

      it('shows the image load error instead of the empty-images copy', () => {
        const viewModel = createViewModel({
          images: [],
          imageErrorMessage: 'No pudimos cargar las imágenes del producto.',
        });
        mountView({ viewModel });

        const panel = container.querySelector('.q-edit-product__images-panel');
        expect(panel.querySelector('.q-edit-product__error').textContent).toBe(
          'No pudimos cargar las imágenes del producto.'
        );
        expect(panel.querySelector('.q-edit-product__empty-images')).toBeNull();
        expect(panel.querySelector('.q-edit-product__image-count').textContent).toBe(
          '0 / 5 imágenes'
        );
      });

      it('shows the empty-images copy when there are no images and no error', () => {
        const viewModel = createViewModel({ images: [] });
        mountView({ viewModel });

        const empty = container.querySelector('.q-edit-product__empty-images');
        expect(empty.textContent).toBe('Aún no hay imágenes para este producto.');
        expect(container.querySelector('.q-edit-product__image-grid')).toBeNull();
      });

      it('disables upload at the image limit, while uploading and on an image error', () => {
        const viewModel = mountView();
        const disabled = () => container.querySelector('.q-edit-product__upload-btn').disabled;
        expect(disabled()).toBe(false);

        viewModel.images = Array.from({ length: 5 }, (_, index) =>
          createImage({ id: `img-${index}`, position: index })
        );
        viewModel.notify();
        expect(disabled()).toBe(true);

        viewModel.images = [createImage()];
        viewModel.uploadingCount = 1;
        viewModel.notify();
        expect(disabled()).toBe(true);

        viewModel.uploadingCount = 0;
        viewModel.imageErrorMessage = 'No pudimos cargar las imágenes del producto.';
        viewModel.notify();
        expect(disabled()).toBe(true);
      });

      it('exposes the file picker and alt-text input attributes', () => {
        mountView();

        const fileInput = container.querySelector('input[type="file"]');
        expect(fileInput.accept).toBe('image/jpeg,image/png,image/webp');
        expect(fileInput.multiple).toBe(true);
        expect(fileInput.hidden).toBe(true);
        expect(fileInput.getAttribute('aria-label')).toBe('Seleccionar imágenes del producto');

        const altInput = container.querySelector('.q-edit-product__alt-input');
        expect(altInput.type).toBe('text');
        expect(altInput.maxLength).toBe(200);
        expect(altInput.placeholder).toBe('Texto alternativo (opcional)');
        expect(altInput.getAttribute('aria-label')).toBe('Texto alternativo para las imágenes');
        expect(altInput.classList.contains('q-edit-product__input')).toBe(true);
      });

      it('handles dragover, dragleave, empty drops and file drops', () => {
        const viewModel = mountView();
        const dropzone = container.querySelector('.q-edit-product__dropzone');

        const dragover = new Event('dragover', { bubbles: true, cancelable: true });
        dropzone.dispatchEvent(dragover);
        expect(dragover.defaultPrevented).toBe(true);
        expect(dropzone.classList.contains('is-dragover')).toBe(true);

        dropzone.dispatchEvent(new Event('dragleave', { bubbles: true }));
        expect(dropzone.classList.contains('is-dragover')).toBe(false);

        const emptyDrop = new Event('drop', { bubbles: true, cancelable: true });
        dropzone.dispatchEvent(emptyDrop);
        expect(viewModel.addImages).not.toHaveBeenCalled();

        const dataTransfer = { files: [new File(['x'], 'new.webp', { type: 'image/webp' })] };
        const drop = new Event('drop', { bubbles: true, cancelable: true });
        Object.defineProperty(drop, 'dataTransfer', { value: dataTransfer });
        dropzone.dispatchEvent(drop);

        expect(drop.defaultPrevented).toBe(true);
        expect(dropzone.classList.contains('is-dragover')).toBe(false);
        expect(viewModel.addImages).toHaveBeenCalledWith(dataTransfer.files, '');
      });

      it('resets the file input, shows upload progress and formats upload errors', () => {
        const viewModel = mountView();
        const file = new File(['x'], 'bolso.webp', { type: 'image/webp' });
        const fileInput = container.querySelector('input[type="file"]');
        Object.defineProperty(fileInput, 'files', { configurable: true, value: [file] });

        fileInput.dispatchEvent(new Event('change', { bubbles: true }));

        expect(viewModel.addImages).toHaveBeenCalledWith([file], '');
        expect(fileInput.value).toBe('');

        viewModel.uploadingCount = 2;
        viewModel.uploadErrors = [
          { filename: 'big.png', message: 'La imagen excede el límite de 5 MB.' },
          { filename: 'bad.txt', message: 'Solo se aceptan imágenes JPEG, PNG o WebP.' },
        ];
        viewModel.notify();

        const progress = container.querySelector('.q-edit-product__uploading');
        expect(progress.getAttribute('role')).toBe('status');
        expect(progress.textContent).toBe('Subiendo 2 imagen(es)…');
        const errors = container.querySelector('.q-edit-product__upload-errors');
        expect(errors.getAttribute('role')).toBe('alert');
        expect([...errors.querySelectorAll('li')].map((item) => item.textContent)).toEqual([
          'big.png: La imagen excede el límite de 5 MB.',
          'bad.txt: Solo se aceptan imágenes JPEG, PNG o WebP.',
        ]);
      });

      it('characterizes the dropzone bypass: dropping files ignores the disabled upload button', () => {
        const viewModel = createViewModel({ uploadingCount: 1 });
        mountView({ viewModel });
        expect(container.querySelector('.q-edit-product__upload-btn').disabled).toBe(true);

        const dataTransfer = { files: [new File(['x'], 'bypass.webp', { type: 'image/webp' })] };
        const drop = new Event('drop', { bubbles: true, cancelable: true });
        Object.defineProperty(drop, 'dataTransfer', { value: dataTransfer });
        container.querySelector('.q-edit-product__dropzone').dispatchEvent(drop);

        expect(viewModel.addImages).toHaveBeenCalledWith(dataTransfer.files, '');
      });

      it('renders image fallbacks, remove controls, confirm/cancel and the deleting state', () => {
        const viewModel = createViewModel({
          images: [
            createImage({ id: 'img-1', alt_text: '', position: 0 }),
            createImage({ id: 'img-2', path: null, alt_text: 'Sin path', position: 1 }),
            createImage({ id: 'img-3', alt_text: 'Vista lateral', position: 2 }),
          ],
        });
        mountView({ viewModel });

        const items = [...container.querySelectorAll('.q-edit-product__image-item')];
        expect(items.length).toBe(3);
        const firstFrame = items[0].querySelector('.q-edit-product__image-frame');
        expect(firstFrame.querySelector('img').alt).toBe('Imagen del producto');
        expect(firstFrame.querySelector('.q-edit-product__primary-badge').textContent).toBe(
          'Principal'
        );
        expect(
          items[0].querySelector('.q-edit-product__image-remove').getAttribute('aria-label')
        ).toBe('Eliminar imagen');
        const secondFrame = items[1].querySelector('.q-edit-product__image-frame');
        expect(secondFrame.querySelector('.q-edit-product__image-placeholder')).not.toBeNull();
        expect(items[1].querySelector('.q-edit-product__primary-badge')).toBeNull();
        expect(
          items[1].querySelector('.q-edit-product__image-remove').getAttribute('aria-label')
        ).toBe('Eliminar imagen Sin path');

        const remove = items[2].querySelector('.q-edit-product__image-remove');
        expect(remove.getAttribute('aria-label')).toBe('Eliminar imagen Vista lateral');
        const overlay = items[2].querySelector('.q-edit-product__image-confirm');
        expect(overlay.hidden).toBe(true);
        expect(overlay.getAttribute('role')).toBe('group');
        expect(overlay.getAttribute('aria-label')).toBe('Confirmar eliminación de imagen');
        remove.click();
        expect(overlay.hidden).toBe(false);
        expect(remove.hidden).toBe(true);
        expect(document.activeElement).toBe(overlay.querySelector('.q-btn--danger'));

        overlay.querySelector('.q-btn--outline').click();
        expect(overlay.hidden).toBe(true);
        expect(remove.hidden).toBe(false);
        expect(document.activeElement).toBe(remove);

        overlay.querySelector('.q-btn--danger').click();
        expect(viewModel.deleteImage).toHaveBeenCalledWith('img-3');

        viewModel.deletingImageId = 'img-1';
        viewModel.notify();
        const current = [...container.querySelectorAll('.q-edit-product__image-item')];
        expect(
          current.every((item) => item.querySelector('.q-edit-product__image-remove').disabled)
        ).toBe(true);
        const deleting = current[0].querySelector('.q-edit-product__image-deleting');
        expect(deleting.getAttribute('role')).toBe('status');
        expect(deleting.textContent).toBe('Eliminando…');
      });

      it('drives save disabled states through _renderFooter and _updateSaveState', () => {
        const viewModel = createViewModel({ isDirty: false, uploadingCount: 1 });
        mountView({ viewModel });
        const disabled = () => container.querySelector('[data-action="save"]').disabled;
        expect(disabled()).toBe(true);

        viewModel.uploadingCount = 0;
        viewModel.notify();
        expect(disabled()).toBe(true);

        viewModel.isDirty = true;
        viewModel.notify();
        expect(disabled()).toBe(false);

        viewModel.isSaving = true;
        view._updateSaveState();
        expect(disabled()).toBe(true);
        viewModel.isSaving = false;
        view._updateSaveState();
        expect(disabled()).toBe(false);

        viewModel.isLoading = true;
        view._updateSaveState();
        expect(disabled()).toBe(true);
      });

      it('characterizes the product delete button remaining enabled during uploads', () => {
        const viewModel = createViewModel({ isDirty: true, uploadingCount: 1 });
        mountView({ viewModel });

        expect(container.querySelector('[data-action="save"]').disabled).toBe(true);
        expect(container.querySelector('.q-edit-product__delete-btn').disabled).toBe(false);
      });

      it('navigates on a clean cancel and handles error/no-changes/success save results', async () => {
        const viewModel = createViewModel({ isDirty: true });
        mountView({ viewModel });
        const onSaved = jasmine.createSpy('onSaved');
        view.onSaved = onSaved;

        viewModel.save.and.resolveTo({ status: 'error' });
        await submitForm();
        expect(onSaved).not.toHaveBeenCalled();
        expect(onNavigate).not.toHaveBeenCalled();
        expect(container.querySelector('.q-edit-product__discard')).toBeNull();

        viewModel.save.and.resolveTo({ status: 'no-changes' });
        await submitForm();
        expect(onSaved).not.toHaveBeenCalled();
        expect(onNavigate).not.toHaveBeenCalled();

        viewModel.save.and.resolveTo({
          status: 'success',
          product: createProduct({ name: 'Nuevo' }),
        });
        await submitForm();
        expect(onSaved).toHaveBeenCalledWith(jasmine.objectContaining({ name: 'Nuevo' }));
        expect(onNavigate).toHaveBeenCalledWith('/seller/products');
        expect(view._showDiscardPrompt).toBe(false);

        view._showDiscardPrompt = false;
        viewModel.isDirty = false;
        onNavigate.calls.reset();
        container.querySelector('.q-edit-product__cancel-btn').click();
        expect(onNavigate).toHaveBeenCalledWith('/seller/products');
      });

      it('characterizes a save error cleared by the next edit but left in the DOM until re-render', async () => {
        const productsApi = {
          getProductById: jasmine.createSpy('getProductById').and.resolveTo(createProduct()),
          listProductImages: jasmine.createSpy('listProductImages').and.resolveTo({ data: [] }),
          updateProduct: jasmine
            .createSpy('updateProduct')
            .and.resolveTo({ data: createProduct() }),
        };
        const categoriesApi = {
          getCategories: jasmine
            .createSpy('getCategories')
            .and.resolveTo({ data: [{ id: 'cat-1', name: 'Accesorios' }] }),
        };
        const viewModel = new EditProductViewModel({ productsApi, categoriesApi });
        mountView({ viewModel });
        await tick();

        const name = container.querySelector('input[name="name"]');
        name.value = 'x';
        name.dispatchEvent(new Event('input', { bubbles: true }));
        await viewModel.save();

        expect(viewModel.errorMessage).toBe('El nombre debe tener entre 3 y 200 caracteres.');
        expect(container.querySelector('.q-edit-product__error').textContent).toBe(
          'El nombre debe tener entre 3 y 200 caracteres.'
        );

        const freshName = container.querySelector('input[name="name"]');
        freshName.value = 'Bolso andino';
        freshName.dispatchEvent(new Event('input', { bubbles: true }));

        expect(viewModel.errorMessage).toBe('');
        expect(container.querySelector('.q-edit-product__error')).not.toBeNull();

        // The real EditProductViewModel publishes updates through _notify(), not notify().
        viewModel._notify();
        expect(container.querySelector('.q-edit-product__error')).toBeNull();
      });
    });
  })();
})();
