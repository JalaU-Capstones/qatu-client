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

// Recovered coverage from backup/pre-rebase-tests
(() => {
  (() => {
    describe('AboutView additional branches (recovered 1)', () => {
      let container;
      let view;

      beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
        view = new AboutView();
      });

      afterEach(() => {
        view?.destroy();
        view = null;
        container.remove();
      });

      it('memoizes render() and returns the mounted node from mount()', () => {
        const rendered = view.render();

        expect(view.render()).toBe(rendered);
        expect(view.mount(container)).toBe(rendered);
        expect(container.querySelector('.q-about')).toBe(rendered);
      });

      it('marks only the featured founding member', () => {
        view.mount(container);
        const members = [...container.querySelectorAll('.q-about__member')];

        expect(members.length).toBe(4);
        expect(members[0].classList.contains('q-about__member--featured')).toBe(true);
        expect(
          members.slice(1).map((member) => member.classList.contains('q-about__member--featured'))
        ).toEqual([false, false, false]);
      });

      it('starts with hidden initials fallbacks and reveals one only on image error', () => {
        view.mount(container);
        const members = [...container.querySelectorAll('.q-about__member')];
        const names = ['Alejandro Botina', 'Agustín Mounier', 'Gabriel Mamani', 'Leonardo Pitre'];

        members.forEach((member, index) => {
          const image = member.querySelector('.q-about__avatar img');
          const fallback = member.querySelector('.q-about__avatar-fallback');
          expect(image.hidden).toBe(false);
          expect(image.getAttribute('alt')).toBe(names[index]);
          expect(image.getAttribute('loading')).toBe('lazy');
          expect(fallback.hidden).toBe(true);
        });

        const image = members[1].querySelector('.q-about__avatar img');
        const fallback = members[1].querySelector('.q-about__avatar-fallback');
        image.dispatchEvent(new Event('error'));
        expect(image.hidden).toBe(true);
        expect(fallback.hidden).toBe(false);

        fallback.hidden = true;
        image.dispatchEvent(new Event('error'));
        expect(fallback.hidden).toBe(true);
      });

      it('renders the exact static roles, emails, and initials for all four members', () => {
        view.mount(container);
        const actual = [...container.querySelectorAll('.q-about__member')].map((member) => {
          const email = member.querySelector('.q-about__email');
          return [
            member.querySelector('.q-about__role').textContent,
            email.getAttribute('href'),
            email.textContent,
            member.querySelector('.q-about__avatar-fallback').textContent,
          ];
        });

        expect(actual).toEqual([
          [
            'Lead Architect & Principal Developer',
            'mailto:support@codewithbotina.com',
            'support@codewithbotina.com',
            'AB',
          ],
          [
            'Co-Creator & Full-Stack Developer',
            'mailto:Agustin.Mounier0125@jala.edu',
            'Agustin.Mounier0125@jala.edu',
            'AM',
          ],
          [
            'Co-Creator & Full-Stack Developer',
            'mailto:Gabriel.Mamani0125@jala.edu',
            'Gabriel.Mamani0125@jala.edu',
            'GM',
          ],
          [
            'Co-Creator & Full-Stack Developer',
            'mailto:Leonardo.Pitre0125@jala.edu',
            'Leonardo.Pitre0125@jala.edu',
            'LP',
          ],
        ]);
      });

      it('exposes exact repository metadata, accessible labels, and decorative glyphs', () => {
        view.mount(container);
        const links = [...container.querySelectorAll('.q-about__repository')];
        const expected = [
          {
            description:
              'La experiencia de compra: una vitrina para descubrir y apoyar talento local.',
            href: 'https://github.com/JalaU-Capstones/qatu-client',
            label: 'Explorar el repositorio del cliente',
            name: "Q'atu Client",
          },
          {
            description:
              'Los servicios que conectan productos, tiendas y compradores de la región.',
            href: 'https://github.com/JalaU-Capstones/qatu-api',
            label: 'Explorar el repositorio de la API',
            name: "Q'atu API",
          },
        ];

        expect(links.length).toBe(2);
        links.forEach((link, index) => {
          expect(link.getAttribute('href')).toBe(expected[index].href);
          expect(link.getAttribute('target')).toBe('_blank');
          expect(link.getAttribute('rel')).toBe('noopener noreferrer');
          expect(link.getAttribute('aria-label')).toBe(expected[index].label);
          expect(link.querySelector('strong').textContent).toBe(expected[index].name);
          expect(link.querySelector('.q-about__repository-copy > span').textContent).toBe(
            expected[index].description
          );
          expect(link.querySelector('.q-about__repository-icon').getAttribute('aria-hidden')).toBe(
            'true'
          );
          expect(link.querySelector('.q-about__repository-arrow').getAttribute('aria-hidden')).toBe(
            'true'
          );
        });
      });

      it('links the hero call to action to the team section', () => {
        view.mount(container);
        const link = container.querySelector('.q-about__hero-link');

        expect(link.getAttribute('href')).toBe('#q-about-team');
        expect(link.textContent).toContain('Conoce al equipo');
        expect(container.querySelector('#q-about-team')).not.toBeNull();
        expect(link.querySelector('span').getAttribute('aria-hidden')).toBe('true');
      });

      it('labels every section with an existing heading id', () => {
        view.mount(container);
        const sections = [...container.querySelectorAll('.q-about > section')];
        const labelledBy = sections.map((section) => section.getAttribute('aria-labelledby'));

        expect(labelledBy).toEqual([
          'q-about-title',
          'q-about-story-title',
          'q-about-team-title',
          'q-about-repos-title',
        ]);
        labelledBy.forEach((id) => {
          expect(view.element.querySelector(`#${id}`)).not.toBeNull();
        });
      });

      it('hides decorative marks and glyphs from assistive technology', () => {
        view.mount(container);
        const decorative = [
          ...view.element.querySelectorAll(
            '.q-about__glow, .q-about__hero-mark, .q-about__vision-icon, .q-about__repository-icon, .q-about__repository-arrow'
          ),
        ];

        expect(decorative.length).toBe(8);
        decorative.forEach((element) => {
          expect(element.getAttribute('aria-hidden')).toBe('true');
        });
        expect(
          view.element.querySelector('.q-about__eyebrow span').getAttribute('aria-hidden')
        ).toBe('true');
      });

      it('removes the page and clears element on destroy()', () => {
        view.mount(container);
        const page = view.element;

        view.destroy();

        expect(container.querySelector('.q-about')).toBeNull();
        expect(page.isConnected).toBe(false);
        expect(view.element).toBeNull();
      });

      it('tolerates destroy() before mount and can still mount afterwards', () => {
        expect(() => view.destroy()).not.toThrow();
        expect(view.element).toBeNull();

        const mounted = view.mount(container);
        expect(mounted.classList.contains('q-about')).toBe(true);
        expect(container.querySelector('.q-about')).toBe(mounted);
      });
    });
  })();
})();
