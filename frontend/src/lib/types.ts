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
  object_key?: string | null;
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

export type ComboCatalogProduct = {
  id: string;
  product_id: string;
  variant_id: string;
  name: string;
  sku: string;
  quantity: number;
  pack_size: string;
  price: number;
  mrp: number;
  stock_qty: number;
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
  is_combo: boolean;
  categories: string[];
  dish_type?: string | null;
  is_veg?: boolean;
  contains_salt?: boolean;
  net_weight?: string | null;
  meal_cost?: number | null;
  rating?: number | null;
  review_count?: number;
  variant_type?: string | null;
  recipe_video_url?: string | null;
  variants: ProductVariant[];
  combo_catalog_products: ComboCatalogProduct[];
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
  hero_image_key?: string | null;
  video_url?: string | null;
};

export type HomepageContent = {
  ticker: string[];
  categories: {
    title: string;
    items: {
      slug: string;
      label: string;
      image_url: string;
      image_key: string;
      image_product_slug: string;
    }[];
  };
  bestsellers: {
    title: string;
    product_slugs: string[];
  };
  combos: {
    title: string;
    description: string;
    product_slugs: string[];
    offer_codes: string[];
  };
  recipes: {
    eyebrow: string;
    title: string;
    description: string;
    link_label: string;
    link_href: string;
    recipe_slugs: string[];
  };
};

export type ActiveOffer = {
  code: string;
  kind: "percentage" | "fixed" | "buy_x_get_y" | "combo";
  label: string;
  discount_value: number;
  minimum_order: number;
  max_discount?: number | null;
  buy_quantity: number;
  free_quantity: number;
  first_order_only: boolean;
  starts_at?: string | null;
  ends_at?: string | null;
};

export type BlogPost = {
  id?: string;
  title: string;
  slug: string;
  hero_image_url?: string | null;
  /** Only returned by the detail endpoint — paragraph breaks on newlines. */
  body?: string;
  /** Optional editorial metadata; not every API response includes these. */
  category?: string | null;
  published_at?: string | null;
  status?: "draft" | "published";
};
