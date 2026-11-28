import { SellerProductFormViewModel } from '../../viewmodels/pages/SellerProductFormViewModel.js';
import { SellerProductFormView } from './SellerProductFormView.js';

const tick = (ms = 10) => new Promise((resolve) => setTimeout(resolve, ms));

describe('SellerProductFormView', () => {
  let container;
  let productsApi;
  let categories;
  let viewModel;
  let view;
  let onNavigate;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    productsApi = {
      createProduct: jasmine.createSpy('createProduct').and.resolveTo({
        data: { id: 'prod-1', slug: 'my-product', state: 'draft' },
        meta: {},
      }),
      uploadProductImage: jasmine.createSpy('uploadProductImage').and.resolveTo({
        data: { id: 'img-1', path: 'https://example.com/1.png', alt_text: '1.png' },
        meta: {},
      }),
      publishProduct: jasmine.createSpy('publishProduct').and.resolveTo({
        data: { id: 'prod-1', state: 'published' },
        meta: {},
      }),
      deleteProductImage: jasmine.createSpy('deleteProductImage').and.resolveTo(undefined),
    };
    categories = [
      { id: 'cat-1', name: 'Electrónica', slug: 'electronica' },
      { id: 'cat-2', name: 'Ropa', slug: 'ropa' },
    ];
    viewModel = new SellerProductFormViewModel({ productsApi, categories });
    onNavigate = jasmine.createSpy('onNavigate');
    view = new SellerProductFormView({ viewModel, categories, onNavigate });
  });

  afterEach(() => {
    view?.destroy();
    view = null;
    container.remove();
  });

  it('renders the single-page product form and keeps images hidden before draft creation', () => {
    view.mount(container);

    expect(container.querySelector('.q-seller-product-form__stepper')).toBeNull();
    expect(container.querySelector('.q-seller-product-form__breadcrumb').textContent).toContain(
      'Inicio'
    );
    expect(container.querySelector('.q-seller-product-form__status').textContent).toBe('Borrador');
    for (const selector of [
      'input[name="name"]',
      'input[name="slug"]',
      'select[name="categoryId"]',
      'input[name="price"]',
      'select[name="currency"]',
      'input[name="stock"]',
      'textarea[name="description"]',
      'textarea[name="attributesText"]',
    ]) {
      expect(container.querySelector(selector)).not.toBeNull();
    }
    expect(container.querySelector('.q-seller-product-form__images-panel')).toBeNull();
    expect(container.querySelector('.q-seller-product-form__cancel-btn').textContent).toBe(
      'Cancelar'
    );
    expect(container.querySelector('.q-seller-product-form__submit-btn').textContent).toBe(
      'Crear borrador'
    );
  });

  it('updates the generated slug and description character counter while typing', () => {
    view.mount(container);
    const nameInput = container.querySelector('#field-name');
    const slugInput = container.querySelector('#field-slug');
    nameInput.value = 'Cámara de Acción';
    nameInput.dispatchEvent(new Event('input', { bubbles: true }));
    expect(slugInput.value).toBe('camara-de-accion');

    const description = container.querySelector('#field-description');
    description.value = 'Descripción breve';
    description.dispatchEvent(new Event('input', { bubbles: true }));
    expect(container.querySelector('.q-seller-product-form__character-count').textContent).toBe(
      '17 / 5,000'
    );
  });

  it('shows validation errors and does not create a draft with an empty form', async () => {
    view.mount(container);
    container
      .querySelector('.q-seller-product-form__form')
      .dispatchEvent(new Event('submit', { cancelable: true }));
    await tick();

    expect(container.querySelectorAll('.q-seller-product-form__error').length).toBeGreaterThan(0);
    expect(productsApi.createProduct).not.toHaveBeenCalled();
  });

  it('creates a draft without leaving the page, locks fields, and reveals image upload', async () => {
    view.mount(container);
    viewModel.setField('name', 'Teclado Mecánico');
    viewModel.setField('price', '45.00');
    viewModel.setField('categoryId', 'cat-1');
    container
      .querySelector('.q-seller-product-form__form')
      .dispatchEvent(new Event('submit', { cancelable: true }));
    await tick();

    expect(viewModel.productId).toBe('prod-1');
    expect(container.querySelector('.q-seller-product-form__form')).not.toBeNull();
    expect(container.querySelector('#field-name').disabled).toBe(true);
    expect(container.querySelector('#field-description').disabled).toBe(true);
    expect(container.querySelector('#field-attributesText').disabled).toBe(true);
    expect(container.querySelector('.q-seller-product-form__locked-notice').textContent).toContain(
      'modal de edición'
    );
    expect(container.querySelector('.q-seller-product-form__images-panel')).not.toBeNull();
    expect(container.querySelector('.q-seller-product-form__image-count').textContent).toBe(
      '0 / 5 imágenes'
    );
    expect(container.querySelector('.q-seller-product-form__draft-btn').textContent).toBe(
      'Guardar como borrador'
    );
    expect(container.querySelector('.q-seller-product-form__publish-btn').disabled).toBe(true);
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it('shows the primary badge and enables publishing after an image uploads', async () => {
    viewModel.productId = 'prod-1';
    viewModel.images = [{ id: 'img-1', path: 'https://example.com/1.png' }];
    view.mount(container);

    expect(container.querySelector('.q-seller-product-form__primary-badge').textContent).toBe(
      'Principal'
    );
    expect(container.querySelector('.q-seller-product-form__publish-btn').disabled).toBe(false);
    container.querySelector('.q-seller-product-form__publish-btn').click();
    expect(productsApi.publishProduct).toHaveBeenCalledWith('prod-1');
    await tick();
    expect(onNavigate).toHaveBeenCalledWith('/seller/products');
  });

  it('provides a full-thumb, accessible delete confirmation with yes and no actions', async () => {
    viewModel.productId = 'prod-1';
    viewModel.images = [{ id: 'img-1', path: 'https://example.com/1.png' }];
    view.mount(container);

    const thumb = container.querySelector('.q-seller-product-form__thumb');
    const removeButton = thumb.querySelector('.q-seller-product-form__image-remove');
    removeButton.click();
    const confirmation = thumb.querySelector('.q-seller-product-form__image-confirm');
    expect(confirmation.hidden).toBe(false);
    expect(confirmation.getAttribute('aria-label')).toContain('Confirmar');
    expect(confirmation.textContent).toContain('¿Eliminar?');
    expect(confirmation.querySelector('[aria-label="No, conservar imagen"]')).not.toBeNull();

    confirmation.querySelector('[aria-label="No, conservar imagen"]').click();
    expect(confirmation.hidden).toBe(true);
    expect(removeButton.hidden).toBe(false);

    removeButton.click();
    confirmation.querySelector('[aria-label="Sí, eliminar imagen"]').click();
    await tick();
    expect(productsApi.deleteProductImage).toHaveBeenCalledWith('prod-1', 'img-1');
  });

  it('renders upload validation errors and disables upload at the five-image limit', () => {
    viewModel.productId = 'prod-1';
    viewModel.images = [1, 2, 3, 4, 5].map((id) => ({
      id: `img-${id}`,
      path: `https://example.com/${id}.png`,
    }));
    viewModel.uploadErrors = [{ filename: 'bad.txt', message: 'Formato no soportado' }];
    view.mount(container);

    expect(container.querySelector('.q-seller-product-form__file-input').disabled).toBe(true);
    expect(container.querySelector('.q-seller-product-form__upload-errors').textContent).toContain(
      'bad.txt'
    );
  });

  it('protects an uncompleted draft from accidental unload and redirects after publish', () => {
    view.mount(container);
    viewModel.productId = 'prod-1';
    const event = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);

    viewModel.publishedSuccess = true;
    viewModel._notify();
    expect(onNavigate).toHaveBeenCalledWith('/seller/products');
  });
});

// Recovered coverage from backup/pre-rebase-tests
(() => {
  (() => {
    const tick = (ms = 10) => new Promise((resolve) => setTimeout(resolve, ms));
    const CURRENCIES = ['USD', 'EUR', 'BOB', 'PEN', 'ARS', 'COP', 'MXN', 'BRL'];

    function slugify(value) {
      return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
    }

    function createViewModel(overrides = {}) {
      const vm = {
        productId: null,
        form: {
          name: '',
          slug: '',
          price: '',
          categoryId: '',
          description: '',
          currency: 'USD',
          stock: '0',
          attributesText: '',
        },
        fieldErrors: {},
        generalError: '',
        images: [],
        uploadingCount: 0,
        uploadErrors: [],
        isCreating: false,
        isPublishing: false,
        publishedSuccess: false,
        slugEdited: false,
        deletingImageId: null,
        imageErrors: {},
        categories: [],
        _listeners: new Set(),
        _notify() {
          for (const listener of vm._listeners) listener(this);
        },
        get canPublish() {
          return Boolean(
            this.productId && this.images.length >= 1 && !this.uploadingCount && !this.isPublishing
          );
        },
        get uploadLimitReached() {
          return this.images.length >= 5;
        },
      };
      vm.unsubscribeSpy = jasmine
        .createSpy('unsubscribe')
        .and.callFake(() => vm._listeners.clear());
      vm.subscribe = jasmine.createSpy('subscribe').and.callFake((listener) => {
        vm._listeners.add(listener);
        return vm.unsubscribeSpy;
      });
      vm.setField = jasmine.createSpy('setField').and.callFake((name, value) => {
        vm.form[name] = value;
        if (name === 'slug') vm.slugEdited = true;
        else if (name === 'name' && !vm.slugEdited) vm.form.slug = slugify(value);
        delete vm.fieldErrors[name];
      });
      vm.canSubmitForm = jasmine.createSpy('canSubmitForm').and.callFake(() => {
        const { name, price, categoryId } = vm.form;
        return Boolean(
          !vm.productId &&
          name &&
          name.trim() !== '' &&
          price &&
          String(price).trim() !== '' &&
          categoryId &&
          String(categoryId).trim() !== '' &&
          !vm.isCreating
        );
      });
      vm.submitForm = jasmine.createSpy('submitForm').and.resolveTo({ status: 'success' });
      vm.addFiles = jasmine.createSpy('addFiles').and.resolveTo(undefined);
      vm.publish = jasmine.createSpy('publish').and.resolveTo({ status: 'success' });
      vm.deleteImage = jasmine.createSpy('deleteImage').and.resolveTo({ status: 'success' });
      return Object.assign(vm, overrides);
    }

    describe('SellerProductFormView additional branches (recovered 1)', () => {
      let container;
      let viewModel;
      let view;
      let onNavigate;
      let categories;

      beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
        categories = [
          { id: 'cat-1', name: 'Electrónica' },
          { id: 'cat-2', name: 'Ropa' },
        ];
        viewModel = createViewModel({ categories });
        onNavigate = jasmine.createSpy('onNavigate');
        view = new SellerProductFormView({ viewModel, categories, onNavigate });
      });

      afterEach(() => {
        view?.destroy();
        view = null;
        container.remove();
      });

      it('falls back to viewModel categories when explicit categories are empty', () => {
        const fallbackViewModel = createViewModel({
          categories: [{ id: 'vm-1', name: 'Desde VM' }],
        });
        view = new SellerProductFormView({
          viewModel: fallbackViewModel,
          categories: [],
          onNavigate,
        });
        view.mount(container);

        const options = Array.from(container.querySelectorAll('#field-categoryId option'));
        expect(options.map((option) => [option.value, option.textContent])).toEqual([
          ['', 'Selecciona una categoría'],
          ['vm-1', 'Desde VM'],
        ]);
      });

      it('renders only the category placeholder when no categories are available', () => {
        view = new SellerProductFormView({ viewModel: createViewModel(), onNavigate });
        view.mount(container);

        const options = Array.from(container.querySelectorAll('#field-categoryId option'));
        expect(options.length).toBe(1);
        expect(options[0].value).toBe('');
        expect(options[0].textContent).toBe('Selecciona una categoría');
      });

      it('prefers explicitly supplied categories over viewModel categories', () => {
        viewModel.categories = [{ id: 'vm-1', name: 'Desde VM' }];
        view.mount(container);

        const options = Array.from(container.querySelectorAll('#field-categoryId option'));
        expect(options.map((option) => option.value)).toEqual(['', 'cat-1', 'cat-2']);
      });

      it('removes the beforeunload guard on destroy', () => {
        view.mount(container);
        viewModel.productId = 'prod-1';

        const beforeDestroy = new Event('beforeunload', { cancelable: true });
        window.dispatchEvent(beforeDestroy);
        expect(beforeDestroy.defaultPrevented).toBe(true);

        view.destroy();
        const afterDestroy = new Event('beforeunload', { cancelable: true });
        window.dispatchEvent(afterDestroy);
        expect(afterDestroy.defaultPrevented).toBe(false);
      });

      it('removes the beforeunload guard after publish and navigates only once', async () => {
        viewModel.productId = 'prod-1';
        viewModel.images = [{ id: 'img-1', path: 'https://example.com/1.png' }];
        view.mount(container);
        expect(view._onBeforeUnload).not.toBeNull();

        viewModel.publishedSuccess = true;
        viewModel._notify();
        viewModel._notify();
        await tick();

        expect(view._onBeforeUnload).toBeNull();
        expect(onNavigate).toHaveBeenCalledTimes(1);
        expect(onNavigate).toHaveBeenCalledWith('/seller/products');

        const event = new Event('beforeunload', { cancelable: true });
        window.dispatchEvent(event);
        expect(event.defaultPrevented).toBe(false);
      });

      it('does not throw when onNavigate is null', () => {
        view = new SellerProductFormView({ viewModel });
        view.mount(container);

        expect(() =>
          container.querySelector('.q-seller-product-form__cancel-btn').click()
        ).not.toThrow();
        expect(() =>
          container.querySelector('.q-seller-product-form__breadcrumb a').click()
        ).not.toThrow();
      });

      it('shows the exact general error banner text', () => {
        viewModel.generalError = 'Ya existe un producto con ese nombre. Prueba con otro.';
        view.mount(container);

        const banner = container.querySelector('.q-seller-product-form__error-banner');
        expect(banner.getAttribute('role')).toBe('alert');
        expect(banner.textContent).toBe('Ya existe un producto con ese nombre. Prueba con otro.');
      });

      it('exposes the expected field metadata and returns undefined from mount', () => {
        expect(view.mount(container)).toBeUndefined();

        const name = container.querySelector('#field-name');
        expect(name.required).toBe(true);
        expect(name.maxLength).toBe(200);

        const price = container.querySelector('#field-price');
        expect(price.type).toBe('number');
        expect(price.min).toBe('0.01');
        expect(price.step).toBe('0.01');

        const stock = container.querySelector('#field-stock');
        expect(stock.min).toBe('0');
        expect(stock.value).toBe('0');

        const description = container.querySelector('#field-description');
        expect(description.maxLength).toBe(5000);
      });

      it('renders all eight currencies with USD selected by default', () => {
        view.mount(container);

        const select = container.querySelector('#field-currency');
        const options = Array.from(select.querySelectorAll('option'));
        expect(options.map((option) => option.value)).toEqual(CURRENCIES);
        expect(options.map((option) => option.textContent)).toEqual(CURRENCIES);
        expect(select.value).toBe('USD');
        expect(options.filter((option) => option.selected).map((option) => option.value)).toEqual([
          'USD',
        ]);
      });

      it('renders the category placeholder followed by category options', () => {
        view.mount(container);

        const options = Array.from(container.querySelectorAll('#field-categoryId option'));
        expect(options.map((option) => [option.value, option.textContent])).toEqual([
          ['', 'Selecciona una categoría'],
          ['cat-1', 'Electrónica'],
          ['cat-2', 'Ropa'],
        ]);
      });

      it('marks every errored field as invalid and shows an alert message', () => {
        const errors = {
          name: 'Error nombre',
          slug: 'Error slug',
          categoryId: 'Error categoría',
          price: 'Error precio',
          currency: 'Error moneda',
          stock: 'Error stock',
          description: 'Error descripción',
          attributesText: 'Error atributos',
        };
        viewModel.fieldErrors = errors;
        view.mount(container);

        for (const [field, message] of Object.entries(errors)) {
          const wrap = container.querySelector(`[data-field="${field}"]`);
          const control = wrap.querySelector('input, select, textarea');
          expect(control.classList.contains('is-invalid')).toBe(true);
          const error = wrap.querySelector('.q-seller-product-form__error');
          expect(error.getAttribute('role')).toBe('alert');
          expect(error.textContent).toBe(message);
        }
      });

      it('keeps a manually edited slug when the product name changes afterwards', () => {
        viewModel.form.name = 'Teclado';
        viewModel.form.slug = 'teclado';
        view.mount(container);

        const slugInput = container.querySelector('#field-slug');
        slugInput.value = 'slug-manual';
        slugInput.dispatchEvent(new Event('input', { bubbles: true }));
        expect(viewModel.slugEdited).toBe(true);

        const nameInput = container.querySelector('#field-name');
        nameInput.value = 'Otro nombre';
        nameInput.dispatchEvent(new Event('input', { bubbles: true }));

        expect(viewModel.setField).toHaveBeenCalledWith('name', 'Otro nombre');
        expect(viewModel.form.slug).toBe('slug-manual');
        expect(slugInput.value).toBe('slug-manual');
      });

      it('disables and re-enables submit according to canSubmitForm', () => {
        viewModel.canSubmitForm.and.returnValue(false);
        view.mount(container);

        const submitButton = container.querySelector('.q-seller-product-form__submit-btn');
        expect(submitButton.disabled).toBe(true);

        viewModel.canSubmitForm.and.returnValue(true);
        const nameInput = container.querySelector('#field-name');
        nameInput.dispatchEvent(new Event('input', { bubbles: true }));
        expect(submitButton.disabled).toBe(false);

        viewModel.canSubmitForm.and.returnValue(false);
        nameInput.dispatchEvent(new Event('input', { bubbles: true }));
        expect(submitButton.disabled).toBe(true);
      });

      it('navigates to the product list from cancel, breadcrumb and draft footer', () => {
        // A new (unlocked) form renders the cancel button; the breadcrumb link is always present.
        view.mount(container);

        const cancel = container.querySelector('.q-seller-product-form__cancel-btn');
        const breadcrumbLink = container.querySelector('.q-seller-product-form__breadcrumb a');
        expect(cancel).not.toBeNull();
        expect(breadcrumbLink).not.toBeNull();
        cancel.click();
        breadcrumbLink.click();
        expect(onNavigate.calls.count()).toBe(2);

        // Once a product exists the form is locked: cancel is replaced by the draft footer.
        viewModel.productId = 'prod-1';
        viewModel._notify();
        expect(container.querySelector('.q-seller-product-form__cancel-btn')).toBeNull();
        const draft = container.querySelector('.q-seller-product-form__draft-btn');
        expect(draft).not.toBeNull();
        draft.click();

        expect(onNavigate.calls.count()).toBe(3);
        for (const call of onNavigate.calls.allArgs()) expect(call).toEqual(['/seller/products']);
      });

      it('uses the image alt fallback and renders a 24px placeholder', () => {
        viewModel.productId = 'prod-1';
        viewModel.images = [
          { id: 'img-1', path: 'https://example.com/1.png' },
          { id: 'img-2', path: null, alt_text: '' },
        ];
        view.mount(container);

        const thumbs = container.querySelectorAll('.q-seller-product-form__thumb-item');
        const withSource = thumbs[0].querySelector('img');
        expect(withSource.getAttribute('src')).toBe('https://example.com/1.png');
        expect(withSource.alt).toBe('Imagen de producto');

        const placeholder = thumbs[1].querySelector('.q-seller-product-form__thumb-placeholder');
        expect(placeholder).not.toBeNull();
        const mark = placeholder.querySelector('img');
        expect(mark.getAttribute('width')).toBe('24');
        expect(mark.getAttribute('height')).toBe('24');
      });

      it('exposes file input metadata and forwards select button clicks', () => {
        viewModel.productId = 'prod-1';
        view.mount(container);

        const fileInput = container.querySelector('.q-seller-product-form__file-input');
        expect(fileInput.type).toBe('file');
        expect(fileInput.getAttribute('accept')).toBe('image/jpeg,image/png,image/webp');
        expect(fileInput.multiple).toBe(true);
        expect(fileInput.getAttribute('aria-label')).toBe('Seleccionar imágenes del producto');

        spyOn(fileInput, 'click');
        container.querySelector('.q-seller-product-form__select-files-btn').click();
        expect(fileInput.click).toHaveBeenCalledTimes(1);
      });

      it('forwards file input changes to addFiles without resetting the input value', () => {
        viewModel.productId = 'prod-1';
        view.mount(container);

        const fileInput = container.querySelector('.q-seller-product-form__file-input');
        const file = { name: 'image.png', type: 'image/png', size: 12 };
        Object.defineProperty(fileInput, 'files', { configurable: true, value: [file] });
        Object.defineProperty(fileInput, 'value', {
          configurable: true,
          writable: true,
          value: 'image.png',
        });

        fileInput.dispatchEvent(new Event('change', { bubbles: true }));

        expect(viewModel.addFiles).toHaveBeenCalledTimes(1);
        expect(viewModel.addFiles).toHaveBeenCalledWith([file]);
        expect(fileInput.value).toBe('image.png');
      });

      it('handles dragover, drop and dragleave on the dropzone', () => {
        viewModel.productId = 'prod-1';
        view.mount(container);

        const dropzone = container.querySelector('.q-seller-product-form__dropzone');
        const file = { name: 'photo.webp', type: 'image/webp', size: 12 };
        const dataTransfer = { files: [file] };

        const dragover = new Event('dragover', { bubbles: true, cancelable: true });
        Object.defineProperty(dragover, 'dataTransfer', { value: dataTransfer });
        dropzone.dispatchEvent(dragover);
        expect(dragover.defaultPrevented).toBe(true);
        expect(dropzone.classList.contains('is-dragover')).toBe(true);

        const drop = new Event('drop', { bubbles: true, cancelable: true });
        Object.defineProperty(drop, 'dataTransfer', { value: dataTransfer });
        dropzone.dispatchEvent(drop);
        expect(drop.defaultPrevented).toBe(true);
        expect(dropzone.classList.contains('is-dragover')).toBe(false);
        expect(viewModel.addFiles).toHaveBeenCalledTimes(1);
        expect(viewModel.addFiles).toHaveBeenCalledWith(dataTransfer.files);

        dropzone.dispatchEvent(new Event('dragleave', { bubbles: true }));
        expect(dropzone.classList.contains('is-dragover')).toBe(false);
      });

      it('disables uploads and shows the exact limit message at five images', () => {
        viewModel.productId = 'prod-1';
        viewModel.images = [1, 2, 3, 4, 5].map((index) => ({
          id: `img-${index}`,
          path: `https://example.com/${index}.png`,
        }));
        view.mount(container);

        expect(container.querySelector('.q-seller-product-form__file-input').disabled).toBe(true);
        expect(container.querySelector('.q-seller-product-form__select-files-btn').disabled).toBe(
          true
        );
        expect(container.querySelector('.q-seller-product-form__limit-msg').textContent).toBe(
          'Has alcanzado el límite máximo de 5 imágenes.'
        );

        const dropzone = container.querySelector('.q-seller-product-form__dropzone');
        dropzone.dispatchEvent(new Event('dragover', { bubbles: true, cancelable: true }));
        expect(dropzone.classList.contains('is-dragover')).toBe(false);
        expect(viewModel.addFiles).not.toHaveBeenCalled();
      });

      it('shows upload progress while one image is uploading', () => {
        viewModel.productId = 'prod-1';
        viewModel.uploadingCount = 1;
        view.mount(container);

        const uploadWrap = container.querySelector('.q-seller-product-form__uploading');
        expect(uploadWrap.querySelector('span').textContent).toBe('Subiendo 1 imagen(es)…');

        const progress = uploadWrap.querySelector('progress');
        expect(progress.max).toBe(5);
        expect(progress.value).toBe(1);
        expect(progress.getAttribute('aria-label')).toBe('Progreso de carga de imágenes');
      });

      it('renders upload errors with the exact filename and message', () => {
        viewModel.productId = 'prod-1';
        viewModel.uploadErrors = [{ filename: 'bad.txt', message: 'Formato no soportado' }];
        view.mount(container);

        const errorList = container.querySelector('.q-seller-product-form__upload-errors');
        expect(errorList.getAttribute('role')).toBe('alert');
        expect(Array.from(errorList.children).map((item) => item.textContent)).toEqual([
          'bad.txt: Formato no soportado',
        ]);
      });

      it('disables publish while publishing or uploading and calls publish on click', async () => {
        viewModel.productId = 'prod-1';
        viewModel.images = [{ id: 'img-1', path: 'https://example.com/1.png' }];
        view.mount(container);

        const publishButton = container.querySelector('.q-seller-product-form__publish-btn');
        expect(publishButton.disabled).toBe(false);
        publishButton.click();
        expect(viewModel.publish).toHaveBeenCalledTimes(1);
        await tick();

        viewModel.isPublishing = true;
        viewModel._notify();
        let current = container.querySelector('.q-seller-product-form__publish-btn');
        expect(current.textContent).toBe('Publicando…');
        expect(current.disabled).toBe(true);

        viewModel.isPublishing = false;
        viewModel.uploadingCount = 1;
        viewModel._notify();
        current = container.querySelector('.q-seller-product-form__publish-btn');
        expect(current.textContent).toBe('Publicar producto');
        expect(current.disabled).toBe(true);
      });

      it('renders deleting-image state with hidden remove, disabled siblings and error alerts', () => {
        viewModel.productId = 'prod-1';
        viewModel.images = [
          { id: 'img-1', path: 'https://example.com/1.png' },
          { id: 'img-2', path: 'https://example.com/2.png' },
        ];
        viewModel.deletingImageId = 'img-1';
        viewModel.imageErrors = { 'img-2': 'No se pudo eliminar' };
        view.mount(container);

        const thumbs = container.querySelectorAll('.q-seller-product-form__thumb-item');
        const firstRemove = thumbs[0].querySelector('.q-seller-product-form__image-remove');
        const secondRemove = thumbs[1].querySelector('.q-seller-product-form__image-remove');

        expect(firstRemove.hidden).toBe(true);
        expect(thumbs[0].querySelector('.q-seller-product-form__image-deleting').textContent).toBe(
          'Eliminando…'
        );
        expect(secondRemove.hidden).toBe(false);
        expect(secondRemove.disabled).toBe(true);

        const imageError = thumbs[1].querySelector('.q-seller-product-form__image-error');
        expect(imageError.getAttribute('role')).toBe('alert');
        expect(imageError.textContent).toBe('No se pudo eliminar');
      });

      it('moves focus to confirm and back to cancel, then disables confirmation buttons', () => {
        viewModel.productId = 'prod-1';
        viewModel.images = [{ id: 'img-1', path: 'https://example.com/1.png' }];
        view.mount(container);

        const thumb = container.querySelector('.q-seller-product-form__thumb');
        const removeButton = thumb.querySelector('.q-seller-product-form__image-remove');
        const confirmation = thumb.querySelector('.q-seller-product-form__image-confirm');
        const confirmButton = confirmation.querySelector('[aria-label="Sí, eliminar imagen"]');
        const cancelButton = confirmation.querySelector('[aria-label="No, conservar imagen"]');

        removeButton.click();
        expect(document.activeElement).toBe(confirmButton);

        cancelButton.click();
        expect(document.activeElement).toBe(removeButton);

        removeButton.click();
        confirmButton.click();
        expect(confirmation.querySelector('span').textContent).toBe('Eliminando…');
        expect(confirmButton.disabled).toBe(true);
        expect(cancelButton.disabled).toBe(true);
        expect(viewModel.deleteImage).toHaveBeenCalledWith('img-1');
      });

      it('calls deleteImage again when a disabled confirm receives a synthetic click', async () => {
        viewModel.productId = 'prod-1';
        viewModel.images = [{ id: 'img-1', path: 'https://example.com/1.png' }];
        view.mount(container);

        const thumb = container.querySelector('.q-seller-product-form__thumb');
        thumb.querySelector('.q-seller-product-form__image-remove').click();
        const confirmButton = thumb.querySelector('[aria-label="Sí, eliminar imagen"]');
        confirmButton.click();
        expect(confirmButton.disabled).toBe(true);

        confirmButton.dispatchEvent(new Event('click', { bubbles: true }));
        await tick();

        expect(viewModel.deleteImage).toHaveBeenCalledTimes(2);
      });

      it('clears the DOM, listener and internal refs on destroy', () => {
        view.mount(container);
        expect(viewModel._listeners.size).toBe(1);

        view.destroy();

        expect(view.element).toBeNull();
        expect(view._bodyEl).toBeNull();
        expect(view._onBeforeUnload).toBeNull();
        expect(view._unsubscribe).toBeNull();
        expect(viewModel.unsubscribeSpy).toHaveBeenCalledTimes(1);
        expect(viewModel._listeners.size).toBe(0);
        expect(container.querySelector('.q-seller-product-form')).toBeNull();
      });

      it('leaves the body permanently blank when publish succeeds before mount without onNavigate', () => {
        viewModel.publishedSuccess = true;
        view = new SellerProductFormView({ viewModel });

        view.mount(container);
        const body = container.querySelector('.q-seller-product-form__body');
        expect(body.childElementCount).toBe(0);

        viewModel._notify();
        viewModel._notify();
        expect(view._didNavigateAfterPublish).toBe(true);
        expect(container.querySelector('.q-seller-product-form__form')).toBeNull();
        expect(body.childElementCount).toBe(0);
      });

      it('keeps stale form markup after publish without onNavigate because the flag is sticky', () => {
        viewModel.productId = 'prod-1';
        viewModel.images = [{ id: 'img-1', path: 'https://example.com/1.png' }];
        view = new SellerProductFormView({ viewModel });

        view.mount(container);
        const formBeforePublish = container.querySelector('.q-seller-product-form__form');
        expect(formBeforePublish).not.toBeNull();

        viewModel.publishedSuccess = true;
        viewModel._notify();
        viewModel._notify();

        expect(view._didNavigateAfterPublish).toBe(true);
        expect(container.querySelector('.q-seller-product-form__form')).toBe(formBeforePublish);
        expect(container.querySelector('.q-seller-product-form__publish-btn')).not.toBeNull();
      });
    });
  })();
})();
