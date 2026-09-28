export type Category = {
  id: string;
  name: string;
  slug: string;
  type: string;
  description?: string;
};

export type ProductImage = {
  id: string;
  url: string;
  alt_text: string;
  sort_order: number;
  image_type: string;
};

export type ProductVariant = {
  id: string;
  pack_size: string;
  price: number;
  mrp: number;
  stock_qty: number;
  sku: string;
  batch_no?: string | null;
  expiry_date?: string;
};

export type Product = {
  id: string;
  name: string;
  slug: string;
  description: string;
  ingredients: string[];
  price: number;
  mrp: number;
  discount_pct: number;
  spice_level: string;
  status: string;
  categories: string[];
  dish_type?: string | null;
  is_veg?: boolean;
  contains_ginger_garlic?: boolean;
  contains_tamarind?: boolean;
  contains_salt?: boolean;
  all_in_one?: boolean;
  net_weight?: string | null;
  shelf_life?: string | null;
  fssai_license?: string | null;
  allergen_info?: string | null;
  meal_cost?: number | null;
  rating?: number | null;
  review_count?: number;
  variant_type?: string | null;
  recipe_video_url?: string | null;
  variants: ProductVariant[];
  images: ProductImage[];
};

export type Recipe = {
  id: string;
  title: string;
  slug: string;
  cook_time_minutes: number;
  cuisine: string;
  dish_type: string;
  ingredients: string[];
  steps: string[];
  hero_image_url: string;
  video_url?: string | null;
};

export type BlogPost = {
  /** Only returned by the list endpoint (`GET /api/blog`). */
  id?: string;
  title: string;
  slug: string;
  hero_image_url?: string | null;
  /** Only returned by the detail endpoint — paragraph breaks on newlines. */
  body?: string;
  /** Optional editorial metadata; not every API response includes these. */
  category?: string | null;
  published_at?: string | null;
};
