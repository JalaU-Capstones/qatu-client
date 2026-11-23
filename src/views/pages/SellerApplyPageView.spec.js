import {
  SELLER_PHONE_COUNTRIES,
  SellerApplyViewModel,
} from '../../viewmodels/pages/SellerApplyViewModel.js';
import { SellerApplyPageView } from './SellerApplyPageView.js';

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('SellerApplyPageView', () => {
  let container;
  let api;
  let viewModel;
  let view;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    api = {
      getMyApplication: jasmine.createSpy('getMyApplication').and.resolveTo(null),
      apply: jasmine.createSpy('apply').and.resolveTo({ data: { status: 'pending' } }),
    };
    viewModel = new SellerApplyViewModel({
      sellerApplicationsApi: api,
      authStore: {
        hasRole: () => false,
        getUser: () => ({ id: 'user-1', email: 'buyer@example.com' }),
        getProfile: () => ({ locale: 'es-PE' }),
      },
    });
    view = new SellerApplyPageView({ viewModel });
  });

  afterEach(() => {
    view.destroy();
    container.remove();
  });

  function renderView() {
    container.appendChild(view.render());
    view._unsubscribe = viewModel.subscribe(() => view._update());
  }

  it('renders account email and toggles the required alternate email input', () => {
    renderView();

    const countryNames = Array.from(
      container.querySelectorAll('[name="country_region"] option'),
      (option) => option.textContent.split(' (')[0]
    );
    const accountOption = container.querySelector('[name="email_option"][value="account"]');
    const accountEmail = container.querySelector('#q-apply-account-email');
    const customOption = container.querySelector('[name="email_option"][value="custom"]');
    const customEmail = container.querySelector('[name="custom_contact_email"]');

    expect(accountOption.checked).toBe(true);
    expect(accountEmail.value).toBe('buyer@example.com');
    expect(accountEmail.readOnly).toBe(true);
    expect(customEmail.required).toBe(false);
    expect(customEmail.closest('[data-role="custom-email-field"]').hidden).toBe(true);
    expect(container.querySelectorAll('.q-seller-apply-required').length).toBe(2);
    expect(countryNames).toEqual(
      [...SELLER_PHONE_COUNTRIES]
        .sort((left, right) => left.name.localeCompare(right.name, 'es'))
        .map((country) => `${country.name}`)
    );

    customOption.checked = true;
    customOption.dispatchEvent(new Event('change', { bubbles: true }));
    expect(customEmail.required).toBe(true);
    expect(customEmail.closest('[data-role="custom-email-field"]').hidden).toBe(false);
  });

  it('submits the selected email and separate country and phone fields', async () => {
    renderView();

    const fields = {
      business_name: 'Textiles Cusco',
      business_description: 'Tejidos tradicionales elaborados en lana de alpaca.',
      custom_contact_email: 'contacto@textiles.pe',
    };
    Object.entries(fields).forEach(([name, value]) => {
      const input = container.querySelector(`[name="${name}"]`);
      input.value = value;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });

    const country = container.querySelector('[name="country_region"]');
    country.value = 'PE';
    country.dispatchEvent(new Event('change', { bubbles: true }));

    const phone = container.querySelector('[name="phone_number"]');
    phone.value = '987-654-321';
    phone.dispatchEvent(new Event('input', { bubbles: true }));
    expect(phone.value).toBe('987654321');

    const customOption = container.querySelector('[name="email_option"][value="custom"]');
    customOption.checked = true;
    customOption.dispatchEvent(new Event('change', { bubbles: true }));

    container
      .querySelector('.q-seller-apply-form')
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await tick();

    expect(api.apply).toHaveBeenCalledWith(
      jasmine.objectContaining({
        country_code: '+51',
        phone_number: '987654321',
        contact_email: 'contacto@textiles.pe',
      })
    );
  });
});
