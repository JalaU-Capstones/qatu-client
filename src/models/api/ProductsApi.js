/**
 * Featured products shown on the home page
 */
const FEATURED_PRODUCTS = [
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
  },
];

export class ProductsApi {
  /**
   * @returns {Promise<Array<Object>>} The featured products. Each call returns fresh copies.
   */
  async getFeaturedProducts() {
    return FEATURED_PRODUCTS.map((product) => ({ ...product }));
  }
}
