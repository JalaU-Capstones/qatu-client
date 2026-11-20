import { AboutView } from './AboutView.js';

describe('AboutView', () => {
  let container;
  let view;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    view = new AboutView();
  });

  afterEach(() => {
    view.destroy();
    container.remove();
  });

  it('renders the Nosotros story and regional vision', () => {
    view.mount(container);

    expect(container.querySelector('#q-about-title').textContent).toContain('Nosotros');
    expect(container.querySelector('#q-about-story-title').textContent).toContain('feria');
    expect(container.querySelector('.q-about__vision').textContent).toContain(
      'Un mercado sin fronteras'
    );
    expect(container.textContent).toContain('proyecto capstone universitario');
  });

  it('renders all founding engineers with handles, roles, local avatars, and email links', () => {
    view.mount(container);
    const members = container.querySelectorAll('.q-about__member');

    expect(members.length).toBe(4);
    expect(members[0].querySelector('h3').textContent).toBe('Alejandro Botina');
    expect(members[0].querySelector('.q-about__role').textContent).toBe(
      'Lead Architect & Principal Developer'
    );
    expect(members[0].querySelector('.q-about__email').getAttribute('href')).toBe(
      'mailto:support@codewithbotina.com'
    );
    expect(members[0].querySelector('img').getAttribute('src')).toBe(
      '/assets/team/alejandro-botina.png'
    );
    expect(container.textContent).toContain('@agusmounier');
    expect(container.textContent).toContain('@Gadrilee');
    expect(container.textContent).toContain('@Leotopo');

    const avatar = members[1].querySelector('.q-about__avatar img');
    avatar.dispatchEvent(new Event('error'));
    expect(avatar.hidden).toBe(true);
    expect(members[1].querySelector('.q-about__avatar-fallback').hidden).toBe(false);
  });

  it('links to both public repositories in new tabs', () => {
    view.mount(container);
    const repositories = container.querySelectorAll('.q-about__repository');

    expect(repositories.length).toBe(2);
    expect(repositories[0].href).toBe('https://github.com/JalaU-Capstones/qatu-client');
    expect(repositories[1].href).toBe('https://github.com/JalaU-Capstones/qatu-api');
    repositories.forEach((repository) => {
      expect(repository.target).toBe('_blank');
      expect(repository.rel).toContain('noopener');
    });
  });
});
