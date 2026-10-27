const BASE_URL =
  typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL
    ? import.meta.env.VITE_API_BASE_URL
    : 'http://localhost:3000/v1';

/**
 * Local catalog used by the frontend-only product detail and cart flows.
 *
 * The featured products keep `imageUrl: null` on purpose: the current visual
 * phase uses the placeholder artwork from the product card. The `gallery`
 * field describes the frames shown on the detail page and can later hold real
 * image URLs without changing the view contract.
 */
const LOCAL_PRODUCTS = [
  {
    id: 'aguayo-tradicional-tarabuco',
    name: 'Aguayo tradicional de Tarabuco',
    seller: 'Tejidos Illimani',
    country: 'Bolivia',
    rating: 4.9,
    ratingsCount: 24,
    price: 40,
    currency: 'USD',
    imageUrl: null,
    category: 'Textiles',
    stock: 15,
    description:
      'Aguayo tejido a mano en telar de cintura por artesanas de Tarabuco. Cada pieza combina lana de oveja teñida con tintes naturales y motivos geométricos heredados de generaciones. Es una prenda versátil que funciona como abrigo, manta o pieza decorativa.',
    attributes: [
      { label: 'Técnica', value: 'Telar de cintura' },
      { label: 'Material', value: 'Lana de oveja teñida con tintes naturales' },
      { label: 'Medidas', value: '120 × 90 cm' },
      { label: 'Origen', value: 'Tarabuco, Bolivia' },
      { label: 'Cuidado', value: 'Lavado a mano en agua fría' },
    ],
    gallery: [
      { label: 'Vista frontal' },
      { label: 'Detalle del tejido' },
      { label: 'Reverso de la pieza' },
    ],
    sellerSince: 2018,
    sellerSales: 320,
    reviews: [
      {
        author: 'María L.',
        rating: 5,
        date: '12 sep 2026',
        comment: 'Los colores son aún más vivos de lo que esperaba. Se nota el trabajo artesanal.',
      },
      {
        author: 'Diego R.',
        rating: 4,
        date: '28 ago 2026',
        comment: 'Muy abrigador y llegó bien empacado. El tamaño es ideal para usar como manta.',
      },
    ],
  },
  {
    id: 'cafe-especialidad-cusco',
    name: 'Café de especialidad de Cusco 500 g',
    seller: 'Café Altura Cusco',
    country: 'Perú',
    rating: 4.8,
    ratingsCount: 18,
    price: 14,
    currency: 'USD',
    imageUrl: null,
    category: 'Alimentos',
    stock: 8,
    description:
      'Café de especialidad cultivado en las alturas de Cusco y tostado en pequeños lotes. Su perfil equilibrado combina notas cítricas y un final dulce, ideal para métodos filtrados como V60 o prensa francesa.',
    attributes: [
      { label: 'Tueste', value: 'Medio' },
      { label: 'Notas', value: 'Cítricos, panela y cacao' },
      { label: 'Peso', value: '500 g' },
      { label: 'Origen', value: 'Valle de La Convención, Cusco' },
      { label: 'Presentación', value: 'Grano entero' },
    ],
    gallery: [{ label: 'Bolsa de café' }, { label: 'Grano tostado' }, { label: 'Taza preparada' }],
    sellerSince: 2020,
    sellerSales: 210,
    reviews: [
      {
        author: 'Lucía P.',
        rating: 5,
        date: '3 sep 2026',
        comment: 'Muy aromático. Lo preparo en prensa francesa y queda suave, sin amargor.',
      },
      {
        author: 'Andrés M.',
        rating: 4,
        date: '19 ago 2026',
        comment: 'Buen café para todos los días. Me gustaría que también venga molido.',
      },
    ],
  },
  {
    id: 'jarron-barro-negro-oaxaca',
    name: 'Jarrón de barro negro de Oaxaca',
    seller: 'Barro Negro Oaxaca',
    country: 'México',
    rating: 5.0,
    ratingsCount: 12,
    price: 38,
    currency: 'USD',
    imageUrl: null,
    category: 'Hogar',
    stock: 0,
    description:
      'Jarrón modelado y pulido a mano en San Bartolo Coyotepec. El barro negro de Oaxaca se reconoce por su brillo metálico, resultado de una cocción tradicional sin esmalte. Cada pieza tiene variaciones únicas de forma y textura.',
    attributes: [
      { label: 'Técnica', value: 'Barro negro pulido a mano' },
      { label: 'Material', value: 'Arcilla local' },
      { label: 'Medidas', value: '28 cm de alto' },
      { label: 'Origen', value: 'San Bartolo Coyotepec, Oaxaca' },
      { label: 'Uso', value: 'Decorativo, no apto para líquidos' },
    ],
    gallery: [
      { label: 'Vista frontal' },
      { label: 'Detalle del brillo' },
      { label: 'Vista lateral' },
    ],
    sellerSince: 2016,
    sellerSales: 145,
    reviews: [
      {
        author: 'Renata G.',
        rating: 5,
        date: '7 sep 2026',
        comment: 'Una pieza preciosa. El acabado brillante cambia con la luz del cuarto.',
      },
    ],
  },
  {
    id: 'bolso-cuero-artesanal',
    name: 'Bolso de cuero artesanal',
    seller: 'Pampa Cuero',
    country: 'Argentina',
    rating: 4.7,
    ratingsCount: 31,
    price: 85,
    currency: 'USD',
    imageUrl: null,
    category: 'Accesorios',
    stock: 12,
    description:
      'Bolso de cuero vacuno curtido al vegetal, cosido a mano por artesanos de la pampa argentina. Tiene un compartimento principal amplio, bolsillo interno y correa ajustable para usarlo al hombro o cruzado.',
    attributes: [
      { label: 'Material', value: 'Cuero vacuno curtido al vegetal' },
      { label: 'Medidas', value: '32 × 26 × 10 cm' },
      { label: 'Herrajes', value: 'Latón envejecido' },
      { label: 'Origen', value: 'Córdoba, Argentina' },
      { label: 'Cuidado', value: 'Hidratar con cera neutra cada 3 meses' },
    ],
    gallery: [{ label: 'Vista frontal' }, { label: 'Interior' }, { label: 'Detalle de costura' }],
    sellerSince: 2019,
    sellerSales: 410,
    reviews: [
      {
        author: 'Sofía C.',
        rating: 5,
        date: '30 ago 2026',
        comment: 'El cuero es grueso y huele increíble. Entra laptop de 13 pulgadas sin problema.',
      },
      {
        author: 'Tomás V.',
        rating: 4,
        date: '14 ago 2026',
        comment: 'Muy buen acabado. La correa podría ser un poco más acolchada.',
      },
    ],
  },
  {
    id: 'audifonos-inalambricos-anc-pro',
    name: 'Audífonos inalámbricos ANC Pro',
    seller: 'Andes Tech',
    country: 'Chile',
    rating: 4.6,
    ratingsCount: 46,
    price: 165,
    currency: 'USD',
    imageUrl: null,
    category: 'Tecnología',
    stock: 5,
    description:
      'Audífonos inalámbricos con cancelación activa de ruido, modo transparencia y hasta 30 horas de batería con el estuche de carga. Incluyen controles táctiles, micrófonos duales para llamadas y resistencia al agua IPX4.',
    attributes: [
      { label: 'Conectividad', value: 'Bluetooth 5.3' },
      { label: 'Batería', value: '8 h en audífonos + 22 h en estuche' },
      { label: 'Cancelación', value: 'ANC híbrida con modo transparencia' },
      { label: 'Resistencia', value: 'IPX4' },
      { label: 'Incluye', value: 'Estuche, cable USB-C y 3 pares de almohadillas' },
    ],
    gallery: [
      { label: 'Audífonos y estuche' },
      { label: 'Vista lateral' },
      { label: 'Controles táctiles' },
    ],
    sellerSince: 2021,
    sellerSales: 980,
    reviews: [
      {
        author: 'Francisca R.',
        rating: 5,
        date: '9 sep 2026',
        comment:
          'La cancelación de ruido funciona muy bien en el metro. La batería dura lo prometido.',
      },
      {
        author: 'Ignacio T.',
        rating: 4,
        date: '22 ago 2026',
        comment: 'Sonido claro y buen estuche. El modo transparencia suena un poco artificial.',
      },
    ],
  },
  {
    id: 'chocolate-cacao-esmeraldas',
    name: 'Chocolate 70% cacao de Esmeraldas',
    seller: 'Cacao Esmeraldas',
    country: 'Ecuador',
    rating: 4.9,
    ratingsCount: 27,
    price: 6,
    currency: 'USD',
    imageUrl: null,
    category: 'Alimentos',
    stock: 20,
    description:
      'Barra de chocolate artesanal elaborada con cacao fino de aroma de Esmeraldas. El 70% de cacao deja un sabor intenso con notas de frutos rojos y un final largo. Sin conservantes ni grasas añadidas.',
    attributes: [
      { label: 'Cacao', value: '70%' },
      { label: 'Peso', value: '90 g' },
      { label: 'Ingredientes', value: 'Cacao, manteca de cacao y azúcar de caña' },
      { label: 'Origen', value: 'Esmeraldas, Ecuador' },
      { label: 'Alérgenos', value: 'Puede contener trazas de frutos secos' },
    ],
    gallery: [{ label: 'Barra completa' }, { label: 'Detalle del corte' }, { label: 'Empaque' }],
    sellerSince: 2017,
    sellerSales: 760,
    reviews: [
      {
        author: 'Valentina S.',
        rating: 5,
        date: '5 sep 2026',
        comment: 'Textura muy fina y sabor intenso. No es demasiado dulce, justo como me gusta.',
      },
      {
        author: 'Mateo D.',
        rating: 5,
        date: '17 ago 2026',
        comment: 'Se nota la calidad del cacao. Ya pedí tres barras más.',
      },
    ],
  },
  {
    id: 'mochila-trekking-45l',
    name: 'Mochila de trekking 45 L',
    seller: 'Sabores del Eje',
    country: 'Colombia',
    rating: 4.8,
    ratingsCount: 15,
    price: 92,
    currency: 'USD',
    imageUrl: null,
    category: 'Aventura',
    stock: 0,
    description:
      'Mochila de 45 litros pensada para caminatas de varios días. Cuenta con espalda ventilada, cinturón lumbar acolchado, cubre-lluvia integrado y múltiples bolsillos para organizar el equipo.',
    attributes: [
      { label: 'Capacidad', value: '45 L' },
      { label: 'Peso', value: '1.4 kg' },
      { label: 'Material', value: 'Nylon ripstop 420D' },
      { label: 'Incluye', value: 'Cubre-lluvia y bolsa de compresión' },
      { label: 'Origen', value: 'Medellín, Colombia' },
    ],
    gallery: [{ label: 'Vista frontal' }, { label: 'Espalda ventilada' }, { label: 'Bolsillos' }],
    sellerSince: 2015,
    sellerSales: 260,
    reviews: [
      {
        author: 'Camila O.',
        rating: 5,
        date: '1 sep 2026',
        comment: 'La usé en el Cocuy y se ajustó muy bien. El cubre-lluvia salvó el equipo.',
      },
    ],
  },
  {
    id: 'huipil-bordado-guatemalteco',
    name: 'Huipil bordado guatemalteco',
    seller: 'Telar Maya',
    country: 'Guatemala',
    rating: 4.9,
    ratingsCount: 9,
    price: 65,
    currency: 'USD',
    imageUrl: null,
    category: 'Textiles',
    stock: 6,
    description:
      'Huipil tradicional tejido y bordado a mano en el altiplano guatemalteco. Los motivos florales y geométricos se inspiran en la cosmovisión maya. Puede usarse como blusa o exhibirse como pieza textil decorativa.',
    attributes: [
      { label: 'Técnica', value: 'Telar de cintura y bordado a mano' },
      { label: 'Material', value: 'Algodón teñido con tintes naturales' },
      { label: 'Medidas', value: 'Talla única, 70 cm de ancho' },
      { label: 'Origen', value: 'Chichicastenango, Guatemala' },
      { label: 'Cuidado', value: 'Lavado a mano y secado a la sombra' },
    ],
    gallery: [
      { label: 'Vista frontal' },
      { label: 'Detalle del bordado' },
      { label: 'Vista posterior' },
    ],
    sellerSince: 2014,
    sellerSales: 190,
    reviews: [
      {
        author: 'Ana Lucía M.',
        rating: 5,
        date: '8 sep 2026',
        comment: 'Los bordados son espectaculares. Llegó impecable y con una nota de la artesana.',
      },
      {
        author: 'Pablo H.',
        rating: 4,
        date: '25 ago 2026',
        comment: 'Muy lindo. Es más corto de lo que imaginaba, pero funciona perfecto como blusa.',
      },
    ],
  },
];

function cloneProduct(product) {
  return {
    ...product,
    attributes: product.attributes.map((attribute) => ({ ...attribute })),
    gallery: product.gallery.map((frame) => ({ ...frame })),
    reviews: product.reviews.map((review) => ({ ...review })),
  };
}

export class ProductsApi {
  /**
   * @returns {Promise<Array<Object>>} The featured products. Each call returns fresh copies.
   */
  async getFeaturedProducts() {
    return LOCAL_PRODUCTS.map(cloneProduct);
  }

  /**
   * Returns one product from the local catalog.
   * @param {string} productId
   * @returns {Promise<Object|null>} A fresh copy, or null when the id is unknown.
   */
  async getProductById(productId) {
    const product = LOCAL_PRODUCTS.find((item) => item.id === productId);
    return product ? cloneProduct(product) : null;
  }

  /**
   * Returns products related to the given one. Products in the same category
   * come first, then the rest of the in-stock catalog. This is intentionally a
   * simple static recommendation rule — no external service is involved.
   *
   * @param {string} productId
   * @param {number} [limit=3]
   * @returns {Promise<Array<Object>>} Fresh copies, never including the current product.
   */
  async getSimilarProducts(productId, limit = 3) {
    const product = LOCAL_PRODUCTS.find((item) => item.id === productId);
    const safeLimit = Math.max(0, Math.floor(Number(limit) || 0));
    if (!product || safeLimit === 0) return [];

    const candidates = LOCAL_PRODUCTS.filter((item) => item.id !== productId && item.stock > 0);
    const sameCategory = candidates.filter((item) => item.category === product.category);
    const others = candidates.filter((item) => item.category !== product.category);

    return [...sameCategory, ...others].slice(0, safeLimit).map(cloneProduct);
  }

  /**
   * Fetches a paginated list of products from the API.
   * @param {Object} [params]
   * @param {number} [params.page=1]   Page number (1-based).
   * @param {number} [params.limit=20] Items per page.
   * @returns {Promise<{ data: Array<Object>, meta: Object }>}
   * @throws {Error} When the server responds with a non-2xx status.
   */
  async getProducts({ page = 1, limit = 20 } = {}) {
    const url = `${BASE_URL}/products?page=${page}&limit=${limit}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch products: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }
}
