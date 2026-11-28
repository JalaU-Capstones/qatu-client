const TEAM = [
  {
    name: 'Alejandro Botina',
    handle: '@CodeWithBotinaOficial',
    role: 'Lead Architect & Principal Developer',
    email: 'support@codewithbotina.com',
    avatar: '/assets/team/alejandro-botina.png',
    initials: 'AB',
    featured: true,
  },
  {
    name: 'Agustín Mounier',
    handle: '@agusmounier',
    role: 'Co-Creator & Full-Stack Developer',
    email: 'Agustin.Mounier0125@jala.edu',
    avatar: '/assets/team/agustin-mounier.png',
    initials: 'AM',
  },
  {
    name: 'Gabriel Mamani',
    handle: '@Gadrilee',
    role: 'Co-Creator & Full-Stack Developer',
    email: 'Gabriel.Mamani0125@jala.edu',
    avatar: '/assets/team/gabriel-mamani.png',
    initials: 'GM',
  },
  {
    name: 'Leonardo Pitre',
    handle: '@Leotopo',
    role: 'Co-Creator & Full-Stack Developer',
    email: 'Leonardo.Pitre0125@jala.edu',
    avatar: '/assets/team/leonardo-pitre.png',
    initials: 'LP',
  },
];

const REPOSITORIES = [
  {
    name: "Q'atu Client",
    description: 'La experiencia de compra: una vitrina para descubrir y apoyar talento local.',
    href: 'https://github.com/JalaU-Capstones/qatu-client',
    label: 'Explorar el repositorio del cliente',
  },
  {
    name: "Q'atu API",
    description: 'Los servicios que conectan productos, tiendas y compradores de la región.',
    href: 'https://github.com/JalaU-Capstones/qatu-api',
    label: 'Explorar el repositorio de la API',
  },
];

export class AboutView {
  constructor() {
    this.element = null;
  }

  render() {
    if (this.element) return this.element;

    const page = document.createElement('div');
    page.className = 'q-about';
    page.innerHTML = `
      <section class="q-about__hero q-ambient" aria-labelledby="q-about-title">
        <div class="q-about__glow q-about__glow--pink" aria-hidden="true"></div>
        <div class="q-about__glow q-about__glow--teal" aria-hidden="true"></div>
        <div class="q-about__container q-about__hero-content">
          <p class="q-about__eyebrow"><span aria-hidden="true"></span> De un proyecto universitario a una visión regional</p>
          <h1 id="q-about-title">Nosotros<span> creemos en lo local.</span></h1>
          <p class="q-about__intro">
            Q'atu nació como un proyecto capstone universitario con una idea sencilla:
            acercar el talento de nuestros mercados a más personas. Hoy construimos una
            ambiciosa plataforma de mercado, con enorme potencial para crecer mucho más
            allá del aula.
          </p>
          <a class="q-about__hero-link" href="#q-about-team">Conoce al equipo <span aria-hidden="true">↓</span></a>
        </div>
        <div class="q-about__hero-mark" aria-hidden="true">Q’</div>
      </section>

      <section class="q-about__story q-about__container" aria-labelledby="q-about-story-title">
        <div class="q-about__story-copy">
          <p class="q-about__eyebrow">Nuestra historia</p>
          <h2 id="q-about-story-title">Las mejores ideas también nacen en una feria.</h2>
          <p>
            Empezamos en la universidad, imaginando un espacio donde artesanos, creadores
            y negocios independientes pudieran mostrar lo que hacen con orgullo. Ese
            capstone fue el primer paso, no el destino.
          </p>
          <p>
            Estamos convirtiendo esa primera idea en un mercado digital pensado para
            Latinoamérica: una forma de descubrir historias, comprar con propósito y
            conectar a productores locales con compradores de toda la región.
          </p>
        </div>
        <aside class="q-about__vision q-glass-panel">
          <span class="q-about__vision-icon" aria-hidden="true">✦</span>
          <p class="q-about__eyebrow">Nuestra visión</p>
          <h3>Un mercado sin fronteras para el talento de aquí.</h3>
          <p>
            Queremos que cada negocio independiente encuentre su lugar y que cada compra
            ayude a mantener vivas las tradiciones que hacen única a nuestra región.
          </p>
        </aside>
      </section>

      <section id="q-about-team" class="q-about__team q-about__container" aria-labelledby="q-about-team-title">
        <header class="q-about__section-heading">
          <p class="q-about__eyebrow">Las personas detrás de Q'atu</p>
          <h2 id="q-about-team-title">Un equipo que construye con propósito.</h2>
          <p>Cuatro ingenieros fundadores, una misma apuesta por el potencial latinoamericano.</p>
        </header>
        <div class="q-about__team-grid"></div>
      </section>

      <section class="q-about__open-source q-about__container" aria-labelledby="q-about-repos-title">
        <header class="q-about__section-heading">
          <p class="q-about__eyebrow">Código abierto</p>
          <h2 id="q-about-repos-title">Construido en comunidad.</h2>
          <p>Explora los repositorios públicos que dan vida a la plataforma.</p>
        </header>
        <div class="q-about__repository-grid"></div>
      </section>
    `;

    const teamGrid = page.querySelector('.q-about__team-grid');
    TEAM.forEach((member) => teamGrid.appendChild(this._createTeamCard(member)));

    const repositoryGrid = page.querySelector('.q-about__repository-grid');
    REPOSITORIES.forEach((repository) => {
      const link = document.createElement('a');
      link.className = 'q-about__repository q-glass-panel';
      link.href = repository.href;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.setAttribute('aria-label', repository.label);
      link.innerHTML = `
        <span class="q-about__repository-icon" aria-hidden="true">⌘</span>
        <span class="q-about__repository-copy">
          <strong>${repository.name}</strong>
          <span>${repository.description}</span>
        </span>
        <span class="q-about__repository-arrow" aria-hidden="true">↗</span>
      `;
      repositoryGrid.appendChild(link);
    });

    this.element = page;
    return this.element;
  }

  _createTeamCard(member) {
    const card = document.createElement('article');
    card.className = `q-about__member q-glass-panel${member.featured ? ' q-about__member--featured' : ''}`;

    const avatar = document.createElement('div');
    avatar.className = 'q-about__avatar';
    const fallback = document.createElement('span');
    fallback.className = 'q-about__avatar-fallback';
    fallback.textContent = member.initials;
    fallback.hidden = true;

    const image = document.createElement('img');
    image.src = member.avatar;
    image.alt = `${member.name}`;
    image.loading = 'lazy';
    image.addEventListener(
      'error',
      () => {
        image.hidden = true;
        fallback.hidden = false;
      },
      { once: true }
    );
    avatar.append(image, fallback);

    const details = document.createElement('div');
    details.className = 'q-about__member-details';
    const handle = document.createElement('p');
    handle.className = 'q-about__handle';
    handle.textContent = member.handle;

    const name = document.createElement('h3');
    name.textContent = member.name;

    const role = document.createElement('p');
    role.className = 'q-about__role';
    role.textContent = member.role;

    const email = document.createElement('a');
    email.className = 'q-about__email';
    email.href = `mailto:${member.email}`;
    email.textContent = member.email;

    details.append(handle, name, role, email);
    card.append(avatar, details);
    return card;
  }

  mount(container) {
    container.appendChild(this.render());
    return this.element;
  }

  destroy() {
    this.element?.remove();
    this.element = null;
  }
}
