function getInitials(seller) {
  const nameParts = String(seller.fullName || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (nameParts.length) {
    return `${nameParts[0][0]}${nameParts.length > 1 ? nameParts[nameParts.length - 1][0] : ''}`.toLocaleUpperCase(
      'es'
    );
  }
  return String(seller.username || '')
    .slice(0, 2)
    .toLocaleUpperCase('es');
}

export function renderStoreCard(seller, { onClick = null } = {}) {
  const item = document.createElement('li');
  item.className = 'q-store-card-item';

  const card = document.createElement('article');
  card.className = 'q-store-card';
  if (typeof onClick === 'function') {
    card.addEventListener('click', () => onClick(seller));
  } else {
    card.setAttribute('aria-disabled', 'true');
    card.title = 'Perfil de vendedor próximamente';
  }

  const header = document.createElement('div');
  header.className = 'q-store-card__header';
  if (seller.avatarPath) {
    const avatar = document.createElement('img');
    avatar.className = 'q-store-card__avatar-img';
    avatar.src = seller.avatarPath;
    avatar.alt = '';
    avatar.width = 58;
    avatar.height = 58;
    header.appendChild(avatar);
  } else {
    const avatar = document.createElement('div');
    avatar.className = 'q-store-card__avatar q-store-card__avatar--initials';
    avatar.setAttribute('aria-hidden', 'true');
    const initials = document.createElement('span');
    initials.className = 'q-store-card__initials';
    initials.textContent = getInitials(seller) || '?';
    avatar.appendChild(initials);
    header.appendChild(avatar);
  }

  const name = document.createElement('h3');
  name.className = 'q-store-card__name';
  name.textContent = seller.fullName || seller.username || '';

  const bio = document.createElement('p');
  bio.className = 'q-store-card__bio';
  bio.textContent = seller.bio || 'Sin descripción todavía';

  const count = document.createElement('p');
  count.className = 'q-store-card__count';
  count.textContent = `${seller.productCount} productos`;

  card.append(header, name, bio, count);
  item.appendChild(card);
  return item;
}
