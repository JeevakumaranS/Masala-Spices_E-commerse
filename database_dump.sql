--
-- PostgreSQL database dump
--

\restrict dxYj2Y6nYrCrgStEbTkczDvM4kbemmTSMFAOWZbTC0sJBnDjKr3oY81IBNQkzvo

-- Dumped from database version 18.6
-- Dumped by pg_dump version 18.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: message_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.message_status AS ENUM (
    'new',
    'read'
);


ALTER TYPE public.message_status OWNER TO postgres;

--
-- Name: uuidv7(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.uuidv7() RETURNS uuid
    LANGUAGE sql
    AS $$
        SELECT encode(
            set_bit(
                set_bit(
                    overlay(uuid_send(gen_random_uuid())
                            placing substring(int8send((extract(epoch FROM clock_timestamp()) * 1000)::bigint)
                                        from 3)
                            from 1 for 6),
                    52, 1),
                53, 1),
            'hex')::uuid;
        $$;


ALTER FUNCTION public.uuidv7() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: admin_users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.admin_users (
    email character varying(254) NOT NULL,
    password_hash character varying(255) NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT uuidv7() CONSTRAINT admin_users_id_new_not_null NOT NULL
);


ALTER TABLE public.admin_users OWNER TO postgres;

--
-- Name: alembic_version; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.alembic_version (
    version_num character varying(32) NOT NULL
);


ALTER TABLE public.alembic_version OWNER TO postgres;

--
-- Name: blog_posts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.blog_posts (
    id uuid DEFAULT uuidv7() NOT NULL,
    title character varying(255) NOT NULL,
    slug character varying(255) NOT NULL,
    category character varying(120) NOT NULL,
    published_at date NOT NULL,
    hero_image_url text NOT NULL,
    body text NOT NULL,
    status character varying(20) DEFAULT 'draft'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_blog_posts_status CHECK (((status)::text = ANY ((ARRAY['draft'::character varying, 'published'::character varying])::text[])))
);


ALTER TABLE public.blog_posts OWNER TO postgres;

--
-- Name: categories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.categories (
    name character varying(255) NOT NULL,
    slug character varying(255) NOT NULL,
    type character varying(32) DEFAULT 'product_type'::character varying NOT NULL,
    description text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    id uuid DEFAULT uuidv7() CONSTRAINT categories_id_new_not_null NOT NULL,
    image_key character varying
);


ALTER TABLE public.categories OWNER TO postgres;

--
-- Name: combos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.combos (
    id uuid NOT NULL,
    name character varying,
    slug character varying,
    description text,
    price numeric,
    mrp numeric,
    discount_pct integer,
    spice_level character varying,
    status character varying,
    categories text[],
    images text[],
    dish_type character varying,
    is_veg boolean,
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    catalog_products jsonb DEFAULT '[]'::jsonb NOT NULL
);


ALTER TABLE public.combos OWNER TO postgres;

--
-- Name: coupons; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.coupons (
    code character varying(40) NOT NULL,
    kind character varying(24) NOT NULL,
    label character varying(255) NOT NULL,
    discount_value numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    minimum_order numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    max_discount numeric(12,2),
    active boolean DEFAULT true NOT NULL,
    starts_at date,
    ends_at date,
    buy_quantity integer DEFAULT 0 NOT NULL,
    free_quantity integer DEFAULT 0 NOT NULL,
    first_order_only boolean DEFAULT false NOT NULL,
    id uuid DEFAULT uuidv7() CONSTRAINT coupons_id_new_not_null NOT NULL,
    eligible_terms text[]
);


ALTER TABLE public.coupons OWNER TO postgres;

--
-- Name: guest_cart_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.guest_cart_items (
    guest_id uuid NOT NULL,
    product_id uuid NOT NULL,
    variant_key uuid NOT NULL,
    variant_id uuid,
    is_combo boolean DEFAULT false NOT NULL,
    qty integer NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    CONSTRAINT ck_guest_cart_items_qty CHECK (((qty >= 1) AND (qty <= 20)))
);


ALTER TABLE public.guest_cart_items OWNER TO postgres;

--
-- Name: guest_sessions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.guest_sessions (
    guest_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    last_seen_at timestamp with time zone NOT NULL
);


ALTER TABLE public.guest_sessions OWNER TO postgres;

--
-- Name: guest_watchlist_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.guest_watchlist_items (
    guest_id uuid NOT NULL,
    product_id uuid NOT NULL,
    "position" integer DEFAULT 0 NOT NULL
);


ALTER TABLE public.guest_watchlist_items OWNER TO postgres;

--
-- Name: hero_images; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.hero_images (
    id uuid NOT NULL,
    object_key character varying NOT NULL,
    alt_text text DEFAULT ''::text NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone NOT NULL
);


ALTER TABLE public.hero_images OWNER TO postgres;

--
-- Name: homepage_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.homepage_settings (
    id uuid DEFAULT uuidv7() NOT NULL,
    content json NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


ALTER TABLE public.homepage_settings OWNER TO postgres;

--
-- Name: messages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.messages (
    id uuid DEFAULT uuidv7() NOT NULL,
    name character varying(160) NOT NULL,
    email character varying(254) NOT NULL,
    phone character varying(24),
    subject character varying(80) NOT NULL,
    message text NOT NULL,
    status public.message_status DEFAULT 'new'::public.message_status NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.messages OWNER TO postgres;

--
-- Name: notification_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notification_settings (
    id integer NOT NULL,
    email_api_key text,
    sms_enabled boolean DEFAULT false NOT NULL,
    sms_account_sid text,
    sms_auth_token text,
    sms_sender_phone character varying(32),
    email_enabled boolean DEFAULT false NOT NULL,
    email_sender_name character varying(255),
    email_sender_email character varying(320),
    CONSTRAINT ck_notification_settings_singleton CHECK ((id = 1))
);


ALTER TABLE public.notification_settings OWNER TO postgres;

--
-- Name: notification_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.notification_settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.notification_settings_id_seq OWNER TO postgres;

--
-- Name: notification_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.notification_settings_id_seq OWNED BY public.notification_settings.id;


--
-- Name: order_history; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.order_history (
    id uuid DEFAULT uuidv7() NOT NULL,
    order_id uuid NOT NULL,
    status character varying,
    changed_at timestamp with time zone,
    note text
);


ALTER TABLE public.order_history OWNER TO postgres;

--
-- Name: order_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.order_items (
    id uuid DEFAULT uuidv7() NOT NULL,
    order_id uuid NOT NULL,
    product_id uuid,
    variant_id uuid,
    name character varying,
    pack_size character varying,
    sku character varying,
    dish_type character varying,
    categories character varying[],
    price numeric(12,2),
    qty integer,
    line_total numeric(12,2)
);


ALTER TABLE public.order_items OWNER TO postgres;

--
-- Name: order_reference_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.order_reference_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    MAXVALUE 99999
    CACHE 1;


ALTER SEQUENCE public.order_reference_seq OWNER TO postgres;

--
-- Name: orders; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.orders (
    order_number character varying(40) NOT NULL,
    phone character varying(32) NOT NULL,
    email character varying(254),
    status character varying(32) NOT NULL,
    total numeric(12,2) NOT NULL,
    created_at timestamp with time zone NOT NULL,
    id uuid DEFAULT uuidv7() CONSTRAINT orders_id_new_not_null NOT NULL,
    customer_name character varying,
    payment_status character varying,
    subtotal numeric(12,2),
    shipping_amount numeric(12,2),
    discount_amount numeric(12,2),
    coupon_code character varying,
    coupon_label character varying,
    delivery_mode character varying,
    country_code character varying,
    shipping_note text,
    item_count integer,
    address_line text,
    city character varying,
    state character varying,
    postal_code character varying,
    admin_note text,
    payment_note text,
    tracking_id character varying(128),
    courier_partner character varying(120),
    guest_id uuid
);


ALTER TABLE public.orders OWNER TO postgres;

--
-- Name: product_reviews; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.product_reviews (
    reviewer_name character varying(120) NOT NULL,
    rating integer NOT NULL,
    comment text NOT NULL,
    status character varying(24) DEFAULT 'pending'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT uuidv7() CONSTRAINT product_reviews_id_new_not_null NOT NULL,
    product_id uuid,
    combo_id uuid,
    CONSTRAINT ck_product_reviews_one_catalog_item CHECK (((product_id IS NOT NULL) <> (combo_id IS NOT NULL)))
);


ALTER TABLE public.product_reviews OWNER TO postgres;

--
-- Name: product_variants; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.product_variants (
    pack_size character varying(32) NOT NULL,
    kit_type character varying(32),
    price numeric(10,2) NOT NULL,
    mrp numeric(10,2) NOT NULL,
    stock_qty integer DEFAULT 0 NOT NULL,
    batch_no character varying(64),
    expiry_date date,
    sku character varying(64) NOT NULL,
    id uuid DEFAULT uuidv7() CONSTRAINT product_variants_id_new_not_null NOT NULL,
    product_id uuid
);


ALTER TABLE public.product_variants OWNER TO postgres;

--
-- Name: products; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.products (
    name character varying(255) NOT NULL,
    slug character varying(255) NOT NULL,
    description text NOT NULL,
    spice_level character varying(32) DEFAULT 'mild'::character varying NOT NULL,
    status character varying(32) DEFAULT 'active'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    id uuid DEFAULT uuidv7() CONSTRAINT products_id_new_not_null NOT NULL,
    categories text[],
    images text[]
);


ALTER TABLE public.products OWNER TO postgres;

--
-- Name: recipes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.recipes (
    title character varying(255) NOT NULL,
    slug character varying(255) NOT NULL,
    cook_time_minutes integer NOT NULL,
    cuisine character varying(120) NOT NULL,
    dish_type character varying(120) NOT NULL,
    hero_image_url text NOT NULL,
    video_url text,
    id uuid DEFAULT uuidv7() CONSTRAINT recipes_id_new_not_null NOT NULL,
    ingredients text[],
    steps text[]
);


ALTER TABLE public.recipes OWNER TO postgres;

--
-- Name: updates; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.updates (
    id uuid NOT NULL,
    email character varying(254) NOT NULL,
    created_at timestamp with time zone NOT NULL,
    confirmation_sent_at timestamp with time zone
);


ALTER TABLE public.updates OWNER TO postgres;

--
-- Name: notification_settings id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notification_settings ALTER COLUMN id SET DEFAULT nextval('public.notification_settings_id_seq'::regclass);


--
-- Data for Name: admin_users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.admin_users (email, password_hash, is_active, created_at, id) FROM stdin;
admin@gmail.com	scrypt$16384$8$1$fZkV7D74c8h4-kisfnsfyg==$ABS_0-C_kfljs6LVRfLmIhr2g9RCvepxwjU2LOxNI5A=	t	2026-10-05 14:27:50.788796+05:30	01a10b48-9de1-7b5d-9023-2a213c1b91da
\.


--
-- Data for Name: alembic_version; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.alembic_version (version_num) FROM stdin;
20261029_message_schema
\.


--
-- Data for Name: blog_posts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.blog_posts (id, title, slug, category, published_at, hero_image_url, body, status, created_at, updated_at) FROM stdin;
01a10b82-72b3-7f5a-b84e-f13e2c96f685	A pantry guide to home cooking	pantry-guide-to-home-cooking	Basics	2026-08-28	blog/whatsapp-image-2026-10-06-at-1-41-10-pm.jpeg	A good pantry is not a big pantry. Six well-chosen jars will cook more dinners than thirty you forgot you owned.\n\nStart with a warming blend, a tangy one, a pepper-forward podi, whole cumin, turmeric, and salt. Everything else is a variation once those are in place.\n\nStore them sealed, away from the hob, and buy in sizes you will actually finish. A jar is only fresh until you open it, and ground spice does not wait for anyone.	published	2026-10-05 15:31:00.85195+05:30	2026-10-06 13:42:39.748875+05:30
01a10b82-72b3-7650-b5e8-8f9cbd70e6e3	Why our masalas taste different	why-our-masalas-taste-different	Sourcing	2026-08-14	blog/a4e81a12-0bee-4180-906c-0f0710003550.png	Most masala on a shelf was ground months ago, from commodity powder bought by the tonne. That is why it smells fine in the jar and tastes flat in the pan.\n\nWe buy whole spices by the lot from growers we visit, then roast each one on its own schedule. Coriander finishes long before dried chilli does, so they never share a tray. Ground cool and slow, the volatile oils stay in the powder instead of drifting off as heat.\n\nThe practical difference is arithmetic: a blend sealed within two weeks of grinding needs far less to taste like something. That is the whole trick, and there is no second one.	published	2026-10-05 15:31:00.85195+05:30	2026-10-06 13:47:25.503593+05:30
01a10b82-72b3-7a00-98ea-1312e5716441	A freshness test for the jar in your cupboard	freshness-test-spice-jar	Basics	2026-09-30	blog/a-freshness-test-for-your-cupboard.png	Open the jar and smell it before you reach for the spoon. Fresh ground spices should be easy to recognise, not just warm and dusty. Rub a pinch between your fingers to release more aroma.\n\nBuy a size you can finish while it still smells bright. Keep it sealed in a cool cupboard, away from steam, sunlight and the heat beside the stove.	published	2026-10-05 15:31:00.85195+05:30	2026-10-06 13:40:15.698217+05:30
01a10b82-72b3-7a24-8c3c-e709810fe85b	Cooking with chilli: heat and flavour	chilli-heat-and-flavour	Basics	2026-10-01	blog/e60a0cd5-8f5a-4f2d-97b0-a5e380d8133b.png	Chilli is not a single dial marked hot. Different varieties bring fruit, smoke, colour or a clean sharp heat, and the amount of each matters as much as the number of seeds.\n\nTaste your blend in a little warm oil before adding it to a large pot. If you want more warmth, add it in small steps; you can always build heat, but you cannot take it back out.	published	2026-10-05 15:31:00.85195+05:30	2026-10-06 13:42:57.695989+05:30
01a10b82-72b3-729e-a72a-5e7d2491b208	From whole spice to a weeknight curry	whole-spice-to-weeknight-curry	Roastery	2026-10-03	blog/e97f85d1-cd2c-4c6d-bf10-bc576b352a71.png	A useful curry does not need a long ingredient list. Onion, tomato, a spoon of masala and something from the fridge are enough when the blend has been roasted and balanced carefully.\n\nGive the onions time to soften, cook the masala briefly in the pan, then add water and your main ingredient. The spice does the quiet work while the curry simmers.	published	2026-10-05 15:31:00.85195+05:30	2026-10-06 13:43:32.945182+05:30
01a10b82-72b3-7baf-bbe2-a8d5f99d1646	How to bloom spices without burning them	bloom-spices-without-burning	Techniques	2026-09-22	blog/34300000-a966-41c4-bf31-f713aac7df99.png	Blooming spices is a short, quiet step: warm oil, whole spices first, then ground blends. When the cumin crackles and the aroma rises, the pan is ready for the next ingredient.\n\nKeep the heat at medium and have your onions or liquid ready. A dark, smoking pan will make chilli and fenugreek taste bitter, while a few seconds in warm fat is enough to open their aroma.	published	2026-10-05 15:31:00.85195+05:30	2026-10-06 13:44:11.556786+05:30
01a10b82-72b3-7324-b0f6-7bd2f58b516b	Five weeknight dinners one masala can fix	weeknight-dinners-one-masala	Recipes	2026-09-18	blog/whatsapp-image-2026-10-06-at-1-44-09-pm.jpeg	One jar, five weeknights, no new shopping list. This is how most of us actually cook.\n\nA spoonful into dal, another into a pan of roasted vegetables, a third bloomed in butter for rice, folded through beaten eggs, or stirred into yogurt as a quick marinade. The blend does the balancing, so you are only managing heat and salt.\n\nBloom it in fat rather than water whenever you can — most of the flavour you want is fat-soluble, and that single step is what separates a good weeknight dinner from a dull one.	published	2026-10-05 15:31:00.85195+05:30	2026-10-06 13:44:33.132103+05:30
01a10b82-72b3-7940-a328-37235abae9d4	Why coriander leads a good masala	why-coriander-leads-masala	Sourcing	2026-09-25	blog/257f2bab-b9dc-44c2-bab7-8831a30ed1de.png	Coriander seed gives a blend its warm citrus note and a soft, rounded base. It is often the largest ingredient by weight, but its job is balance rather than volume.\n\nThe seed changes with its growing season and storage. We taste each lot before roasting, then adjust the blend around its sweetness so the finished masala stays familiar from batch to batch.	published	2026-10-05 15:31:00.85195+05:30	2026-10-06 13:46:20.741474+05:30
01a10b82-72b3-7b05-a73f-82f6d0b4a19c	The right way to store whole spices	store-whole-spices	Basics	2026-09-05	blog/whatsapp-image-2026-10-06-at-1-45-57-pm.jpeg	Heat, light and air do most of the damage. A spice rack above the hob is the worst place in your kitchen to keep spices, and it is where most people put them.\n\nKeep whole spices in airtight containers, in a cupboard, at room temperature. Never refrigerate — condensation is worse than the heat you were trying to avoid.\n\nWhole spices hold for a year or more; ground spices are best inside three. If it no longer smells like anything when you crush it between your fingers, it is done.	published	2026-10-05 15:31:00.85195+05:30	2026-10-06 13:47:01.235247+05:30
01a10b82-72b3-72dd-894a-ee43e2dd0c1c	The small logic behind a good rasam	small-logic-good-rasam	Recipes	2026-09-28	blog/whatsapp-image-2026-10-06-at-1-46-50-pm.jpeg	Rasam is built in layers: sour tamarind, peppery spice, a little sweetness from tomato, and a finish of mustard and curry leaves. None needs to dominate the bowl.\n\nLet the tamarind simmer before adding the ground blend. A short boil softens its sharp edge; the final tempering brings the aroma back to the surface just before serving.	published	2026-10-05 15:31:00.85195+05:30	2026-10-06 13:47:52.448133+05:30
\.


--
-- Data for Name: categories; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.categories (name, slug, type, description, created_at, id, image_key) FROM stdin;
South Indian	south-indian	region	Classic flavours from the south.	2026-10-05 14:45:58.217623	01a10b59-3589-7104-bbdf-78916e15053c	\N
North Indian	north-indian	region	Comforting, indulgent spice profiles.	2026-10-05 14:45:58.217623	01a10b59-3589-739a-a0c8-728c5e761ded	\N
Masala Powders	masala-powders	product_type	Everyday ground masalas for quick, flavourful cooking.	2026-10-05 14:45:58.217623	01a10b59-3589-70db-8245-b2bc89812201	\N
Spice Blends	spice-blends	product_type	Balanced blends for regional dishes and family favourites.	2026-10-05 14:45:58.217623	01a10b59-3589-7832-b511-ff72bd8afd58	\N
Curry Pastes	curry-pastes	product_type	Ready-to-cook pastes for rich curries.	2026-10-05 14:45:58.217623	01a10b59-3589-7f30-838c-441b10bbbe0c	\N
Podis	podis	product_type	South Indian podis for rice, idli and dosa.	2026-10-05 14:45:58.217623	01a10b59-3589-7c35-bdcb-f5b042d69cbd	\N
Pickles	pickles	product_type	Bright, punchy accompaniments.	2026-10-05 14:45:58.217623	01a10b59-3589-790b-8f62-633141879dde	\N
Pure Spices	pure-spices	product_type	Single-origin whole and ground spices.	2026-10-05 14:45:58.217623	01a10b59-3589-7754-97ca-a4b83a3f4c16	\N
Recipe Kits	recipe-kits	product_type	Measured spice kits for reliable home cooking.	2026-10-05 14:45:58.217623	01a10b59-3589-79f5-8f43-e9e33012dd80	\N
Combos & Packs	combos-packs	product_type	Curated pantry bundles at better value.	2026-10-05 14:45:58.217623	01a10b59-3589-757b-8a96-5bffc6f14fff	\N
Tamil Nadu	tamil-nadu	region	Bold, aromatic blends from Tamil kitchens.	2026-10-05 14:45:58.217623	01a10b59-3589-7ff7-b771-b36772764a4f	\N
Kerala / Malabar	kerala-malabar	region	Warm, toasted Malabar profiles.	2026-10-05 14:45:58.217623	01a10b59-3589-7e58-81b4-dbe90f2d3fad	\N
Andhra	andhra	region	Chilli-forward Andhra flavours.	2026-10-05 14:45:58.217623	01a10b59-3589-73df-9f82-8a0ba5507abd	\N
Chettinad	chettinad	region	Peppery, roasted Chettinad masalas.	2026-10-05 14:45:58.217623	01a10b59-3589-77fe-be85-106f79d40812	\N
Hyderabadi	hyderabadi	region	Layered blends for fragrant biryani.	2026-10-05 14:45:58.217623	01a10b59-3589-7a2f-9e0f-1d0b83e1f421	\N
Biryani	biryani	dish	Masalas for layered rice dishes.	2026-10-05 14:45:58.217623	01a10b59-3589-74ec-9840-c38403af683f	\N
Fried Rice	fried-rice	dish	Fast, savoury blends for rice meals.	2026-10-05 14:45:58.217623	01a10b59-3589-76a8-8178-5d47e2d57ae5	\N
Kulambu Masalas	kulambu-masalas	dish	Deep, warming curry blends.	2026-10-05 14:45:58.217623	01a10b59-3589-724b-9347-1d560bd352be	\N
Fry / Varuval	fry-varuval	dish	Roasted spice blends for crisp fries.	2026-10-05 14:45:58.217623	01a10b59-3589-70ee-9ecb-7c17fadb52a3	\N
Sambar / Rasam	sambar-rasam	dish	Comforting South Indian staples.	2026-10-05 14:45:58.217623	01a10b59-3589-7d94-baf3-4ae0e5e71572	\N
Bestsellers	bestsellers	collection	Customer favourites, selected from the catalogue.	2026-10-05 14:45:58.217623	01a10b59-3589-7352-9237-5802ba368f9d	\N
New Launches	new-launches	collection	Recently added blends and pantry ideas.	2026-10-05 14:45:58.217623	01a10b59-3589-7bcf-9473-55eb8b4aa646	\N
Everyday Masalas	breakfast-masalas	product_type	Quick, aromatic blends for everyday meals.	2026-10-05 14:45:58.217623	01a10b59-3589-7202-b104-a101b8cfdd67	\N
\.


--
-- Data for Name: combos; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.combos (id, name, slug, description, price, mrp, discount_pct, spice_level, status, categories, images, dish_type, is_veg, created_at, updated_at, catalog_products) FROM stdin;
01a10b83-a3c4-7b0c-b023-45603aae3875	Pantry Starter Set	pantry-starter-set	Three kitchen favourites to start a versatile spice pantry.	349	467	0	medium	active	{combos-packs}	{products/01a10b83-a3c4-7b0c-b023-45603aae3875/pantry-starter-set.png}	\N	t	\N	2026-10-05 15:54:02.571876	[{"id": "c62ae389-910e-4a67-bc4f-5e0a29f00522", "quantity": 1, "product_id": "5ffd6b11-791b-403c-813a-b3115337a4c2", "sort_order": 0, "variant_id": "01a10b70-6665-7058-94af-c147e69b08cc"}, {"id": "93c08a49-7d73-49cf-8dc3-0232ce4dfd79", "quantity": 1, "product_id": "b6b30548-3420-46a4-a9d7-053c2e740ede", "sort_order": 1, "variant_id": "01a10b70-c282-73e0-b6ad-9ee227c4f1a7"}, {"id": "6a0a33bd-8d48-48ed-884c-2cb8c2dd5dd1", "quantity": 1, "product_id": "9068cf64-7ac7-42f7-ac18-379e30010352", "sort_order": 2, "variant_id": "01a10b71-04d3-7cb0-9e97-7c56bc396289"}]
01a10b83-a3c0-7d78-9e43-1eb9df711354	Curry & Pickle Pairing	curry-pickle-pairing	A warming Fish curry masala paired with a tangy mango pickle.	399	438	0	medium	active	{combos-packs}	{combos/curry-pickle-pairing-c9aca4b6.jpeg}	\N	t	\N	2026-10-06 13:37:34.800076	[{"id": "b35255d3-4abc-4495-a5c3-66e89f0d425b", "quantity": 2, "product_id": "9068cf64-7ac7-42f7-ac18-379e30010352", "sort_order": 0, "variant_id": "01a10b71-04d3-7cb0-9e97-7c56bc396289"}, {"id": "d45dc3c8-39f9-4734-88e4-5cc219a6b00f", "quantity": 2, "product_id": "d0cd71b8-b561-4c16-ae06-5654d3459c2b", "sort_order": 1, "variant_id": "01a10fa4-a134-7f97-b8e2-1cd7d8805e9a"}]
01a10b83-a398-7b91-88b7-6c0748737d41	Everyday Masala Duo	everyday-masala-duo	A practical pair of biryani and garam masalas for everyday cooking.	299	377	0	medium	active	{combos-packs}	{products/01a10b83-a398-7b91-88b7-6c0748737d41/everyday-masala-duo-2.png}	\N	t	\N	2026-10-05 15:49:37.113757	[{"id": "74c99439-ae63-45b2-a2f1-ea9fe0ad953d", "quantity": 1, "product_id": "5ffd6b11-791b-403c-813a-b3115337a4c2", "sort_order": 0, "variant_id": "01a10b70-6665-7058-94af-c147e69b08cc"}, {"id": "1e4f6e59-280b-4385-8b55-97113f9e7c84", "quantity": 1, "product_id": "b6b30548-3420-46a4-a9d7-053c2e740ede", "sort_order": 1, "variant_id": "01a10b70-c282-73e0-b6ad-9ee227c4f1a7"}]
01a10b83-a3be-7568-9019-fe587bdb6edd	Masala Night Duo	masala-night-duo	Biryani masala, Mutton Masala for a complete dinner spread.	1349	1674.88	0	medium	active	{combos-packs}	{combos/masala-night-duo-276094d9.jpeg}	\N	t	\N	2026-10-06 11:03:42.946831	[{"id": "58b7aea7-f12d-4060-a4dd-79c79a9de68d", "quantity": 4, "product_id": "5ffd6b11-791b-403c-813a-b3115337a4c2", "sort_order": 0, "variant_id": "01a10b70-6667-7b25-9767-061b1080a115"}, {"id": "cb7e3141-1d41-42d6-abea-2adcc2e611ea", "quantity": 4, "product_id": "981fe830-333a-4bd1-87dd-a4669c05b21e", "sort_order": 1, "variant_id": "01a10fa1-3508-7ee3-9068-911a28bd2fd0"}]
01a10b83-a3c1-757d-bbbb-155f8ae62fb3	Family Spice Set	family-spice-set	Podis for family meals.	279	338	0	medium	active	{combos-packs}	{combos/family-spice-set-5d6e3adf.jpeg}	\N	t	\N	2026-10-06 11:09:48.900627	[{"id": "48040437-6979-4d23-87f3-9689ed1f8dfb", "quantity": 2, "product_id": "4342e0f4-6a9a-4b1b-a1ac-6e5ae13fba6e", "sort_order": 0, "variant_id": "01a10fb7-0030-72ee-8ea4-14d060ae18bd"}, {"id": "0e3cefe9-22c5-4d76-bb84-16374bdf8716", "quantity": 2, "product_id": "bd66645a-7471-4065-9d58-f0b76af9cff0", "sort_order": 1, "variant_id": "01a10fb5-9ba3-7263-ba80-30f07bbfec4b"}]
\.


--
-- Data for Name: coupons; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.coupons (code, kind, label, discount_value, minimum_order, max_discount, active, starts_at, ends_at, buy_quantity, free_quantity, first_order_only, id, eligible_terms) FROM stdin;
SPICE10	percentage	10% off your order	10.00	199.00	100.00	t	\N	\N	0	0	f	01a10b83-a3c6-77ad-b837-080057ba4524	{}
WELCOME15	percentage	15% off your first order	15.00	299.00	150.00	t	\N	\N	0	0	t	01a10b83-a3cc-72ed-ae4c-57ba1344b9dc	{}
SAVE50	fixed	?50 off orders over ?399	50.00	399.00	\N	t	\N	\N	0	0	f	01a10b83-a3ce-701b-aa3e-39fd7e812849	{}
MASALA2X1	buy_x_get_y	Buy 1 masala, get 1 masala free	0.00	0.00	\N	t	\N	\N	1	1	f	01a10b83-a3cf-7a67-b7d8-fce18751c57f	{masala}
PANTRY20	percentage	20% off your pantry bundle	20.00	499.00	200.00	t	\N	\N	0	0	f	01a10b83-a3d0-75b6-8e17-b131a790af14	{combos-packs}
\.


--
-- Data for Name: guest_cart_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.guest_cart_items (guest_id, product_id, variant_key, variant_id, is_combo, qty, "position") FROM stdin;
01a110c8-db8f-7b57-8590-d4611b9a272f	01a10b83-a398-7b91-88b7-6c0748737d41	00000000-0000-0000-0000-000000000000	\N	t	1	0
01a110c8-db8f-7b57-8590-d4611b9a272f	01a10b83-a3c1-757d-bbbb-155f8ae62fb3	00000000-0000-0000-0000-000000000000	\N	t	1	1
\.


--
-- Data for Name: guest_sessions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.guest_sessions (guest_id, created_at, last_seen_at) FROM stdin;
01a110c9-28d4-7be0-928f-5f6649ea6807	2026-10-06 16:06:21.076351+05:30	2026-10-06 16:06:21.466054+05:30
01a114d0-bf27-75be-bfc1-d53dbd697d41	2026-10-07 10:53:07.175752+05:30	2026-10-07 10:53:07.501301+05:30
01a114de-2374-7c82-9a73-53349cdc45a3	2026-10-07 11:07:44.820685+05:30	2026-10-07 11:07:44.820685+05:30
01a114de-2378-7f5a-bd04-63432e61fc9c	2026-10-07 11:07:44.824434+05:30	2026-10-07 11:07:44.824434+05:30
01a114de-2370-7f46-8dad-35e13c6c7cb5	2026-10-07 11:07:44.816071+05:30	2026-10-07 11:07:44.816071+05:30
01a110c9-556c-70b1-b57f-297731fa5b58	2026-10-06 16:06:32.492293+05:30	2026-10-06 16:06:32.492293+05:30
01a114ba-0116-7d1c-a572-4106bb00e251	2026-10-07 10:28:16.726249+05:30	2026-10-07 10:28:16.726249+05:30
01a114ba-011a-74f7-871d-0262f0ed8613	2026-10-07 10:28:16.730197+05:30	2026-10-07 10:28:16.730197+05:30
01a114ba-0120-702c-8d1c-5fb3de9026a9	2026-10-07 10:28:16.736344+05:30	2026-10-07 10:28:16.736344+05:30
01a114ba-011b-789f-9f2d-1de6ea31251e	2026-10-07 10:28:16.73138+05:30	2026-10-07 10:28:16.73138+05:30
01a114ba-011e-7e47-b033-4bc4e55a7dcd	2026-10-07 10:28:16.734915+05:30	2026-10-07 10:28:16.734915+05:30
01a114ba-0124-743b-8e6b-489ed5048dfb	2026-10-07 10:28:16.740807+05:30	2026-10-07 10:28:16.740807+05:30
01a114de-2366-7269-a642-039ed5277e4f	2026-10-07 11:07:44.806573+05:30	2026-10-07 11:07:44.806573+05:30
01a114de-2369-7df6-9404-910fdd0b6cc9	2026-10-07 11:07:44.809837+05:30	2026-10-07 11:07:44.809837+05:30
01a114de-232f-7c0a-9b60-0b16a0422dc5	2026-10-07 11:07:44.752251+05:30	2026-10-07 11:07:44.752251+05:30
01a114e2-f5d3-7611-9719-d84f59d648f2	2026-10-07 11:13:00.820009+05:30	2026-10-07 11:13:00.820009+05:30
01a114e2-f5d6-7d76-a924-22a7f55b0a1d	2026-10-07 11:13:00.822763+05:30	2026-10-07 11:13:00.822763+05:30
01a114e2-f5d5-7d91-946f-d28f8741ffd4	2026-10-07 11:13:00.821906+05:30	2026-10-07 11:13:00.821906+05:30
01a114e2-f5d6-7f4b-add0-96b69984f868	2026-10-07 11:13:00.822355+05:30	2026-10-07 11:13:00.822355+05:30
01a114e2-f5d5-7ec6-b29e-644933111f11	2026-10-07 11:13:00.821098+05:30	2026-10-07 11:13:00.821098+05:30
01a114e2-f5d7-7957-872f-da8ccab67f29	2026-10-07 11:13:00.8232+05:30	2026-10-07 11:13:00.8232+05:30
01a110c9-4a90-7f75-a992-61268b9db460	2026-10-06 16:06:29.712108+05:30	2026-10-06 16:06:37.792746+05:30
01a110d2-595a-77a0-9a89-e764d6b794d9	2026-10-06 16:16:23.323155+05:30	2026-10-06 16:16:23.323155+05:30
01a110d4-1d88-7fa6-a845-e1aabd4b6cbf	2026-10-06 16:18:19.080403+05:30	2026-10-06 16:18:19.080403+05:30
01a110d5-910c-7baf-a0a0-16840ad0b8dd	2026-10-06 16:19:54.189067+05:30	2026-10-06 16:19:54.189067+05:30
01a110d5-913e-7f0e-9356-abc17a4c39ef	2026-10-06 16:19:54.238698+05:30	2026-10-06 16:19:54.238698+05:30
01a110d5-913c-7401-bfb5-b39ba282c5f5	2026-10-06 16:19:54.23618+05:30	2026-10-06 16:19:54.23618+05:30
01a110d5-912f-797d-b624-2301ee2f8b06	2026-10-06 16:19:54.22399+05:30	2026-10-06 16:19:54.22399+05:30
01a110d5-9110-703b-89ac-aad290461363	2026-10-06 16:19:54.192209+05:30	2026-10-06 16:19:54.192209+05:30
01a110d5-9139-79ed-9c15-954fe7a0ef81	2026-10-06 16:19:54.233067+05:30	2026-10-06 16:19:54.233067+05:30
01a110d5-a937-7420-ac4e-dd353f6d7ee2	2026-10-06 16:20:00.375097+05:30	2026-10-06 16:20:00.375097+05:30
01a110d5-a985-73fc-8689-5f40be90faac	2026-10-06 16:20:00.453759+05:30	2026-10-06 16:20:00.453759+05:30
01a114ef-222b-794f-b29f-427823c16e07	2026-10-07 11:26:18.603092+05:30	2026-10-07 11:26:18.603092+05:30
01a110e0-c72f-75c6-b3f3-72d41c1e0c41	2026-10-06 16:32:08.946149+05:30	2026-10-06 16:32:08.946149+05:30
01a110e0-c76c-7703-a896-1dc1e8c154b9	2026-10-06 16:32:09.004996+05:30	2026-10-06 16:32:09.004996+05:30
01a110e0-c86a-7036-9869-a4ac214e5ee0	2026-10-06 16:32:09.258168+05:30	2026-10-06 16:32:09.258168+05:30
01a110e0-c76e-71e7-b543-25f3f0105eac	2026-10-06 16:32:09.006202+05:30	2026-10-06 16:32:09.257322+05:30
01a114ef-222d-7ba8-bbf0-9dd2937dc9d8	2026-10-07 11:26:18.605361+05:30	2026-10-07 11:26:18.605361+05:30
01a110e2-156f-7843-bf24-f38c1eb8688f	2026-10-06 16:33:34.511015+05:30	2026-10-06 16:33:34.511015+05:30
01a110e2-156d-7420-b68d-0be812f119de	2026-10-06 16:33:34.50985+05:30	2026-10-06 16:33:34.50985+05:30
01a110e2-1572-729c-874a-7e7ef430972e	2026-10-06 16:33:34.514072+05:30	2026-10-06 16:33:34.514072+05:30
01a110e2-1573-7af5-a6f2-0b2aaf5b9276	2026-10-06 16:33:34.515506+05:30	2026-10-06 16:33:34.515506+05:30
01a110e2-1571-7212-b43b-c82a34b00537	2026-10-06 16:33:34.513157+05:30	2026-10-06 16:33:34.513157+05:30
01a110e2-1577-7cf0-90d7-0675882c61a7	2026-10-06 16:33:34.519128+05:30	2026-10-06 16:33:34.519128+05:30
01a114ef-2230-741b-8fbe-98bd1b2e8025	2026-10-07 11:26:18.608807+05:30	2026-10-07 11:26:18.608807+05:30
01a114ef-222f-7bf8-8f22-9ca56da855fe	2026-10-07 11:26:18.607763+05:30	2026-10-07 11:26:18.607763+05:30
01a114ef-222e-74cb-bbbc-be0abb0172e3	2026-10-07 11:26:18.606689+05:30	2026-10-07 11:26:18.606689+05:30
01a114ef-2231-7f4e-b51f-11a4687b8a95	2026-10-07 11:26:18.609599+05:30	2026-10-07 11:26:18.609599+05:30
01a110e0-c87c-794d-82fd-3c1e6a56d925	2026-10-06 16:32:09.276284+05:30	2026-10-06 16:33:36.629688+05:30
01a114b2-71fb-71c4-9a25-daae8a72fabe	2026-10-07 10:20:01.339216+05:30	2026-10-07 10:20:01.339216+05:30
01a114b2-71f7-75f9-af06-bae5640aac09	2026-10-07 10:20:01.335993+05:30	2026-10-07 10:20:01.335993+05:30
01a114b2-71eb-742e-923c-84ace06afbd1	2026-10-07 10:20:01.323191+05:30	2026-10-07 10:20:01.323191+05:30
01a114b2-71d6-780a-9e8b-618cd7068f5a	2026-10-07 10:20:01.302524+05:30	2026-10-07 10:20:01.302524+05:30
01a114b2-71ef-7f5c-bce9-952ab0a19f0c	2026-10-07 10:20:01.327056+05:30	2026-10-07 10:20:01.327056+05:30
01a114b2-71f3-7dd8-9ad0-521602a0f80e	2026-10-07 10:20:01.331668+05:30	2026-10-07 10:20:01.331668+05:30
01a114b2-9e46-7fe1-ac27-1e6491a9048b	2026-10-07 10:20:12.678714+05:30	2026-10-07 10:20:12.678714+05:30
01a114b2-9e49-7980-a228-53779e897c39	2026-10-07 10:20:12.681895+05:30	2026-10-07 10:20:12.681895+05:30
01a114b2-9e4c-7197-a845-03a6c86a75fe	2026-10-07 10:20:12.684194+05:30	2026-10-07 10:20:12.684194+05:30
01a114b2-9e4a-748a-ae0b-7047aa3a8547	2026-10-07 10:20:12.682972+05:30	2026-10-07 10:20:12.682972+05:30
01a114b2-9e4b-7e9e-8477-49321f5a5189	2026-10-07 10:20:12.683544+05:30	2026-10-07 10:20:12.683544+05:30
01a114b2-9e4c-7f78-80eb-3fda3bcb887c	2026-10-07 10:20:12.684662+05:30	2026-10-07 10:20:12.684662+05:30
01a114b3-2eac-7ef9-8dde-1c814dda4627	2026-10-07 10:20:49.644424+05:30	2026-10-07 10:20:49.644424+05:30
01a114b3-2ed2-7476-915a-dea4c7e063df	2026-10-07 10:20:49.68257+05:30	2026-10-07 10:20:49.68257+05:30
01a114b3-2f04-70b8-918e-a3eb78a1336b	2026-10-07 10:20:49.732616+05:30	2026-10-07 10:20:49.732616+05:30
01a114b4-1b89-72b3-9d5d-7f754f382cd0	2026-10-07 10:21:50.281702+05:30	2026-10-07 10:21:50.281702+05:30
01a114b4-1b88-7000-873b-d2bed639b83a	2026-10-07 10:21:50.280332+05:30	2026-10-07 10:21:50.280332+05:30
01a114b4-1b8b-7795-80e5-2fee73ece1b9	2026-10-07 10:21:50.28364+05:30	2026-10-07 10:21:50.28364+05:30
01a114b4-1b7c-791a-87a2-dfb74ab7acea	2026-10-07 10:21:50.268994+05:30	2026-10-07 10:21:50.268994+05:30
01a114b4-1b8a-7229-906c-09e283f937fb	2026-10-07 10:21:50.282861+05:30	2026-10-07 10:21:50.282861+05:30
01a114b4-1b8c-7f42-9170-d225a164e556	2026-10-07 10:21:50.284823+05:30	2026-10-07 10:21:50.284823+05:30
01a11509-4b7c-7d2b-97cb-37785225fddc	2026-10-07 11:54:53.126714+05:30	2026-10-07 11:54:53.126714+05:30
01a11509-4c1b-7b3c-9643-fb6e328edf48	2026-10-07 11:54:53.276086+05:30	2026-10-07 11:54:53.276086+05:30
01a114b4-36fd-7049-bab8-44493ea03a00	2026-10-07 10:21:57.309295+05:30	2026-10-07 10:21:57.309295+05:30
01a114b4-3751-72fe-b508-c6153e9fa87f	2026-10-07 10:21:57.393864+05:30	2026-10-07 10:21:57.393864+05:30
01a114b4-3780-70ec-ad3b-12fa8c214a2e	2026-10-07 10:21:57.44088+05:30	2026-10-07 10:21:57.44088+05:30
01a114b7-9582-7145-8586-76843da198e9	2026-10-07 10:25:38.114866+05:30	2026-10-07 10:25:38.114866+05:30
01a114b7-9578-742c-a0c7-a67f8024406a	2026-10-07 10:25:38.105069+05:30	2026-10-07 10:25:38.105069+05:30
01a114b7-9583-7e07-bc9a-5cbe45a63a2d	2026-10-07 10:25:38.11576+05:30	2026-10-07 10:25:38.11576+05:30
01a114b8-5a76-7af3-b6a8-957cbe7d4617	2026-10-07 10:26:28.534835+05:30	2026-10-07 10:26:28.534835+05:30
01a114b8-5a7e-74ca-a0a8-075a11970667	2026-10-07 10:26:28.542416+05:30	2026-10-07 10:26:28.542416+05:30
01a114b8-5a7f-71f9-b91a-66582974ddde	2026-10-07 10:26:28.543539+05:30	2026-10-07 10:26:28.543539+05:30
01a11509-4c2c-74bf-a095-7370f1256633	2026-10-07 11:54:53.292801+05:30	2026-10-07 11:54:53.292801+05:30
01a11509-4c26-7d06-ba5a-45de658a9ff5	2026-10-07 11:54:53.28675+05:30	2026-10-07 11:54:53.28675+05:30
01a114c4-aa3d-72d5-9120-6b9408f1e76c	2026-10-07 10:39:55.389992+05:30	2026-10-07 10:39:55.67543+05:30
01a114c4-f0f5-752c-a5eb-fc110e082b67	2026-10-07 10:40:13.493709+05:30	2026-10-07 10:40:13.493709+05:30
01a11509-4c20-73ec-9059-0fab0b5810b1	2026-10-07 11:54:53.280358+05:30	2026-10-07 11:54:53.280358+05:30
01a11509-4c35-7b24-b982-ec55b204294a	2026-10-07 11:54:53.302076+05:30	2026-10-07 11:54:53.302076+05:30
01a11509-f5c8-7994-b3c0-bc542a2239bf	2026-10-07 11:55:36.712791+05:30	2026-10-07 11:55:36.712791+05:30
01a114b8-6d0e-77fc-b955-71d8d136c904	2026-10-07 10:26:33.294251+05:30	2026-10-07 10:26:33.294251+05:30
01a114b8-6d4e-7d41-bca3-8dc96d84b683	2026-10-07 10:26:33.358904+05:30	2026-10-07 10:26:33.358904+05:30
01a114b8-6d83-7c82-bf67-3ede6be5566e	2026-10-07 10:26:33.411432+05:30	2026-10-07 10:26:33.411432+05:30
01a114b8-ac8f-7f00-baa5-d285b339e9da	2026-10-07 10:26:49.551867+05:30	2026-10-07 10:26:49.551867+05:30
01a114b8-ac90-7f66-9dda-d6d139f5dde1	2026-10-07 10:26:49.552877+05:30	2026-10-07 10:26:49.552877+05:30
01a114b8-ac91-7996-a190-cab15fc9d051	2026-10-07 10:26:49.553731+05:30	2026-10-07 10:26:49.553731+05:30
01a11509-f5e2-7f26-9836-c7e4b4da69ac	2026-10-07 11:55:36.738096+05:30	2026-10-07 11:55:36.738096+05:30
01a11509-f5db-7a3c-af42-892203b88ccf	2026-10-07 11:55:36.731969+05:30	2026-10-07 11:55:36.731969+05:30
01a11509-f5e3-73df-bb47-f8a22ad37778	2026-10-07 11:55:36.739769+05:30	2026-10-07 11:55:36.739769+05:30
01a11509-f5e0-7ce6-88c8-1fc305812692	2026-10-07 11:55:36.736275+05:30	2026-10-07 11:55:36.736275+05:30
01a11509-f5e5-76e2-842d-fef6302fa4ec	2026-10-07 11:55:36.74167+05:30	2026-10-07 11:55:36.74167+05:30
01a114b8-b812-72a2-a2d6-589c94f8d897	2026-10-07 10:26:52.498685+05:30	2026-10-07 10:26:52.498685+05:30
01a114b8-b813-7aa4-b8d6-85087ea5cd67	2026-10-07 10:26:52.499613+05:30	2026-10-07 10:26:52.499613+05:30
01a114b8-b814-7d80-a904-872b2dc9cf98	2026-10-07 10:26:52.5004+05:30	2026-10-07 10:26:52.5004+05:30
01a114b8-b825-79ff-8ee3-616e7b16d4e0	2026-10-07 10:26:52.517433+05:30	2026-10-07 10:26:52.517433+05:30
01a114b8-b824-7ce3-896e-7cbb35130d75	2026-10-07 10:26:52.516487+05:30	2026-10-07 10:26:52.516487+05:30
01a114b8-b825-7487-aeb0-14843f086d18	2026-10-07 10:26:52.517887+05:30	2026-10-07 10:26:52.517887+05:30
01a1150a-248d-7f2f-9654-d119de3feaeb	2026-10-07 11:55:48.686104+05:30	2026-10-07 11:55:48.686104+05:30
01a1150a-24a3-7dd4-a44b-35f3e5a4218a	2026-10-07 11:55:48.707967+05:30	2026-10-07 11:55:48.707967+05:30
01a1150a-24a1-7246-a8cd-93d7c3471685	2026-10-07 11:55:48.705207+05:30	2026-10-07 11:55:48.705207+05:30
01a1150a-24a2-708b-bcaf-d30acfda2d05	2026-10-07 11:55:48.706326+05:30	2026-10-07 11:55:48.706326+05:30
01a1150a-249f-785c-94ad-fcec13cbffeb	2026-10-07 11:55:48.703538+05:30	2026-10-07 11:55:48.703538+05:30
01a1150a-24a6-7d78-a454-180c595f1402	2026-10-07 11:55:48.710679+05:30	2026-10-07 11:55:48.710679+05:30
01a1150a-2805-78bc-b6e4-4e51d5ba20e4	2026-10-07 11:55:49.573092+05:30	2026-10-07 11:55:49.573092+05:30
01a1150a-2809-7470-8692-9d686d658f9d	2026-10-07 11:55:49.577185+05:30	2026-10-07 11:55:49.577185+05:30
01a1150a-280a-7b2c-aa38-827889063869	2026-10-07 11:55:49.578625+05:30	2026-10-07 11:55:49.578625+05:30
01a114cf-5b22-7659-adcd-950292d94fb6	2026-10-07 10:51:36.034992+05:30	2026-10-07 10:51:36.453881+05:30
01a1150a-280c-74be-9632-eca5cf3e1ce0	2026-10-07 11:55:49.580079+05:30	2026-10-07 11:55:49.580079+05:30
01a1150a-2807-7548-a8a3-f34e97430803	2026-10-07 11:55:49.575353+05:30	2026-10-07 11:55:49.575353+05:30
01a1150a-280d-71a0-83a0-57973eda3787	2026-10-07 11:55:49.581039+05:30	2026-10-07 11:55:49.581039+05:30
01a1150c-2aeb-7854-9a94-88b9b1b7a9ea	2026-10-07 11:58:01.387264+05:30	2026-10-07 11:58:01.387264+05:30
01a1150c-2acb-7769-9e60-7a4fdcacb809	2026-10-07 11:58:01.356379+05:30	2026-10-07 11:58:01.356379+05:30
01a1150c-2ae6-7bd7-8d1d-a9b56108a670	2026-10-07 11:58:01.382996+05:30	2026-10-07 11:58:01.382996+05:30
01a1150c-2ae9-79da-8e72-39f9b88a0d52	2026-10-07 11:58:01.385338+05:30	2026-10-07 11:58:01.385338+05:30
01a1150c-2aed-7c00-a5c9-64fc2ee47dfb	2026-10-07 11:58:01.389038+05:30	2026-10-07 11:58:01.389038+05:30
01a114cf-d9f2-77f6-8256-088af4bafde0	2026-10-07 10:52:08.498902+05:30	2026-10-07 10:52:08.982345+05:30
01a1150c-2aee-7a56-81a3-52d474ff0a87	2026-10-07 11:58:01.390344+05:30	2026-10-07 11:58:01.390344+05:30
01a1150c-db21-7ba7-962e-9d7805cc9fbb	2026-10-07 11:58:46.497386+05:30	2026-10-07 11:58:46.497386+05:30
01a1150c-db1e-7f72-8869-aa3804ba855a	2026-10-07 11:58:46.494744+05:30	2026-10-07 11:58:46.494744+05:30
01a1150c-db1c-74ff-bfc3-bc79314c8465	2026-10-07 11:58:46.492135+05:30	2026-10-07 11:58:46.492135+05:30
01a1150c-db20-7a6e-9031-e459c317c16d	2026-10-07 11:58:46.496454+05:30	2026-10-07 11:58:46.496454+05:30
01a1150c-db08-7d48-a97c-75e83dc5e33b	2026-10-07 11:58:46.472599+05:30	2026-10-07 11:58:46.472599+05:30
01a1150c-db22-733f-b744-a5d901d67157	2026-10-07 11:58:46.498906+05:30	2026-10-07 11:58:46.498906+05:30
01a1150c-e5ad-744d-a2c2-632dca852822	2026-10-07 11:58:49.19789+05:30	2026-10-07 11:58:49.19789+05:30
01a1150d-9f44-7453-955a-54cc9601b036	2026-10-07 11:59:36.708715+05:30	2026-10-07 11:59:36.708715+05:30
01a1150f-615d-749e-bbc9-fcb9546de4ab	2026-10-07 12:01:31.933768+05:30	2026-10-07 12:01:31.933768+05:30
01a1151a-6cf2-79c4-a0e4-c122b84f88ef	2026-10-07 12:13:35.794969+05:30	2026-10-07 12:13:35.794969+05:30
01a1151a-6cf8-7466-9416-c65555c18c24	2026-10-07 12:13:35.800227+05:30	2026-10-07 12:13:35.800227+05:30
01a1150c-e5aa-7654-a30d-22853c606512	2026-10-07 11:58:49.194478+05:30	2026-10-07 11:58:49.382457+05:30
01a1151a-6cf5-72d0-9453-b2fd0b3ac02a	2026-10-07 12:13:35.797572+05:30	2026-10-07 12:13:35.797572+05:30
01a1151a-da1e-7d5a-a681-9815fc4c617e	2026-10-07 12:14:03.743409+05:30	2026-10-07 12:14:03.743409+05:30
01a1151a-da40-71ac-8ed3-0316ea5c0af0	2026-10-07 12:14:03.776163+05:30	2026-10-07 12:14:03.776163+05:30
01a1151b-1d24-700d-a2f9-0fdceb750f75	2026-10-07 12:14:20.900885+05:30	2026-10-07 12:14:20.900885+05:30
01a1151b-1d26-7bc2-a77c-09fa6198d8c0	2026-10-07 12:14:20.902226+05:30	2026-10-07 12:14:20.902226+05:30
01a1151c-8db5-7586-b1ec-7de2a646db6a	2026-10-07 12:15:55.253431+05:30	2026-10-07 12:15:55.253431+05:30
01a1151c-8db6-726e-87a6-99a963dc898f	2026-10-07 12:15:55.25451+05:30	2026-10-07 12:15:55.25451+05:30
01a1151f-6a02-7614-b544-e20581f978e1	2026-10-07 12:19:02.722505+05:30	2026-10-07 12:19:02.722505+05:30
01a1151f-69f9-7b2b-b8fd-17dd1283a990	2026-10-07 12:19:02.713682+05:30	2026-10-07 12:19:02.713682+05:30
01a1151f-7cde-7204-8145-386fc77f2bb9	2026-10-07 12:19:07.550226+05:30	2026-10-07 12:19:07.550226+05:30
01a1151f-7ce0-7f80-99a9-c44010cca538	2026-10-07 12:19:07.552672+05:30	2026-10-07 12:19:07.552672+05:30
01a1151f-ae8f-7427-b90c-735063ccb407	2026-10-07 12:19:20.27178+05:30	2026-10-07 12:19:20.27178+05:30
01a1151f-ae91-7422-b43c-2021b55c72a2	2026-10-07 12:19:20.273679+05:30	2026-10-07 12:19:20.273679+05:30
01a1150c-e63c-7052-b825-8228df695cb7	2026-10-07 11:58:49.340554+05:30	2026-10-07 12:09:02.803906+05:30
01a1151f-ae93-73ac-b03f-2653ebfc6362	2026-10-07 12:19:20.275087+05:30	2026-10-07 12:19:20.275087+05:30
01a1150c-e5b1-7902-9b05-530a8f33d646	2026-10-07 11:58:49.201187+05:30	2026-10-07 11:58:49.201187+05:30
01a1150c-e638-7d7a-80c8-342f2f0ef59d	2026-10-07 11:58:49.336077+05:30	2026-10-07 11:58:49.336077+05:30
01a1151a-6cfa-7987-a771-bc63b9320c12	2026-10-07 12:13:35.802908+05:30	2026-10-07 12:13:35.802908+05:30
01a1151a-6cfd-7908-8bcf-6b15f039eb1d	2026-10-07 12:13:35.805455+05:30	2026-10-07 12:13:35.805455+05:30
01a1151a-da39-7dde-aadd-39f1cd6fbe62	2026-10-07 12:14:03.769376+05:30	2026-10-07 12:14:03.769376+05:30
01a1151a-da3d-77e5-ac8b-6ffba13a4501	2026-10-07 12:14:03.77389+05:30	2026-10-07 12:14:03.77389+05:30
01a1151b-1d20-72b6-b086-b97b68fd84f3	2026-10-07 12:14:20.8965+05:30	2026-10-07 12:14:20.8965+05:30
01a1151b-1d29-7c88-aa7a-438fbe874502	2026-10-07 12:14:20.905324+05:30	2026-10-07 12:14:20.905324+05:30
01a1151c-4f4d-7c71-936b-050bc21ec836	2026-10-07 12:15:39.277075+05:30	2026-10-07 12:15:39.277075+05:30
01a1151c-8db1-7814-8301-47a5b501486d	2026-10-07 12:15:55.249144+05:30	2026-10-07 12:15:55.249144+05:30
01a1151c-8db4-7053-bfb0-7ac66c6a12ba	2026-10-07 12:15:55.252063+05:30	2026-10-07 12:15:55.252063+05:30
01a1151f-69fd-7fb9-998b-4fcaf87eebc8	2026-10-07 12:19:02.717714+05:30	2026-10-07 12:19:02.717714+05:30
01a1151f-6a06-7c33-9b8e-0254df94b0cb	2026-10-07 12:19:02.726755+05:30	2026-10-07 12:19:02.726755+05:30
01a1151f-6a09-78bc-913b-b274865c6155	2026-10-07 12:19:02.729424+05:30	2026-10-07 12:19:02.729424+05:30
01a1151f-7ce0-78d8-945d-a1620c02ab5e	2026-10-07 12:19:07.552049+05:30	2026-10-07 12:19:07.552049+05:30
01a1151f-7ce1-76fb-a12e-023e4fba6f15	2026-10-07 12:19:07.553831+05:30	2026-10-07 12:19:07.553831+05:30
01a1151f-ae88-7dc1-833e-b5f416869b55	2026-10-07 12:19:20.264967+05:30	2026-10-07 12:19:20.264967+05:30
01a1151f-ae90-7ab9-9392-abcf7627a1bf	2026-10-07 12:19:20.272628+05:30	2026-10-07 12:19:20.272628+05:30
01a1151a-6cd1-7d0d-bda0-0edd12986a14	2026-10-07 12:13:35.76304+05:30	2026-10-07 12:13:35.76304+05:30
01a1151a-da3b-768b-959e-8784c0759328	2026-10-07 12:14:03.77146+05:30	2026-10-07 12:14:03.77146+05:30
01a1151a-da41-7b7d-aea7-33f268b1e836	2026-10-07 12:14:03.77794+05:30	2026-10-07 12:14:03.77794+05:30
01a1151b-1d27-70c2-b2ad-d5ab2d7e933c	2026-10-07 12:14:20.903935+05:30	2026-10-07 12:14:20.903935+05:30
01a1151b-1d2a-7516-aa05-74753c0eca7d	2026-10-07 12:14:20.906648+05:30	2026-10-07 12:14:20.906648+05:30
01a1151c-4f4e-76c8-8d1e-90937d77579a	2026-10-07 12:15:39.278443+05:30	2026-10-07 12:15:39.278443+05:30
01a1151c-4f3c-7d2f-b38b-4d60e04094d1	2026-10-07 12:15:39.261121+05:30	2026-10-07 12:15:39.261121+05:30
01a1151c-8dae-7d7a-b594-cea8c69f9a1c	2026-10-07 12:15:55.246865+05:30	2026-10-07 12:15:55.246865+05:30
01a1151c-8db2-76e8-b0b0-b303954d54f0	2026-10-07 12:15:55.250659+05:30	2026-10-07 12:15:55.250659+05:30
01a1150d-9f45-7f18-b7fc-9fff526bf6bb	2026-10-07 11:59:36.709491+05:30	2026-10-07 11:59:36.709491+05:30
01a1150d-9f3f-7d5b-b6b1-387c1ab1ad15	2026-10-07 11:59:36.703106+05:30	2026-10-07 11:59:36.703106+05:30
01a1150d-9f41-720f-8f5a-4a647def0417	2026-10-07 11:59:36.705211+05:30	2026-10-07 11:59:36.705211+05:30
01a1150d-9f43-7610-8304-87c939799a50	2026-10-07 11:59:36.70762+05:30	2026-10-07 11:59:36.70762+05:30
01a1150d-9f46-7b9e-98ce-f90dd92ac23d	2026-10-07 11:59:36.710325+05:30	2026-10-07 11:59:36.710325+05:30
01a1150f-615a-7341-a900-33cfb8b503d2	2026-10-07 12:01:31.93065+05:30	2026-10-07 12:01:31.93065+05:30
01a1150f-6131-7c38-9b98-c043824b0318	2026-10-07 12:01:31.891802+05:30	2026-10-07 12:01:31.891802+05:30
01a1150f-615c-7c63-838c-f1828bf5a6c9	2026-10-07 12:01:31.932294+05:30	2026-10-07 12:01:31.932294+05:30
01a1150f-6158-71c5-bea3-53363000eafc	2026-10-07 12:01:31.928795+05:30	2026-10-07 12:01:31.928795+05:30
01a1150f-615f-7fd3-9357-6fadb28a7a07	2026-10-07 12:01:31.935279+05:30	2026-10-07 12:01:31.935279+05:30
01a1150f-dd7d-72cb-8533-1606aeaf0c76	2026-10-07 12:02:03.710084+05:30	2026-10-07 12:02:03.710084+05:30
01a1150f-dd91-726d-a596-c441ef629151	2026-10-07 12:02:03.729719+05:30	2026-10-07 12:02:03.729719+05:30
01a1150f-dd95-73bd-b6d4-ac40fa57ada2	2026-10-07 12:02:03.733154+05:30	2026-10-07 12:02:03.733154+05:30
01a11510-400b-7da0-9e89-f226e8e6211f	2026-10-07 12:02:28.940179+05:30	2026-10-07 12:02:28.940179+05:30
01a11510-401d-7f4a-81d9-9bda2207b09d	2026-10-07 12:02:28.957355+05:30	2026-10-07 12:02:28.957355+05:30
01a11510-401b-73ea-b97f-b18bc1c87b62	2026-10-07 12:02:28.95505+05:30	2026-10-07 12:02:28.95505+05:30
01a11510-4023-726a-aa3b-ced70a0d3e88	2026-10-07 12:02:28.963634+05:30	2026-10-07 12:02:28.963634+05:30
01a11510-4021-7199-b32e-ecac015ae31d	2026-10-07 12:02:28.961563+05:30	2026-10-07 12:02:28.961563+05:30
01a11510-4025-73d4-bf27-7748aed31b0d	2026-10-07 12:02:28.965894+05:30	2026-10-07 12:02:28.965894+05:30
01a1151f-69ae-79fd-96fc-3260dbebb27b	2026-10-07 12:19:02.64071+05:30	2026-10-07 12:19:02.64071+05:30
01a1151f-7ce1-70a7-b37e-b15252b2d306	2026-10-07 12:19:07.55322+05:30	2026-10-07 12:19:07.55322+05:30
01a1151f-7ce2-79dd-911c-5713cc064d1b	2026-10-07 12:19:07.554542+05:30	2026-10-07 12:19:07.554542+05:30
01a1151f-ae8e-733e-86fb-700347f20d19	2026-10-07 12:19:20.27018+05:30	2026-10-07 12:19:20.27018+05:30
01a110c8-db8f-7b57-8590-d4611b9a272f	2026-10-06 16:06:01.295532+05:30	2026-10-07 12:20:56.074385+05:30
01a11512-a407-7b63-a222-a19d0012e139	2026-10-07 12:05:05.60778+05:30	2026-10-07 12:05:05.60778+05:30
01a11512-a421-7830-a5ec-8fafe1485481	2026-10-07 12:05:05.633309+05:30	2026-10-07 12:05:05.633309+05:30
01a11512-a425-7a6f-9a24-2bc95b0c2474	2026-10-07 12:05:05.637745+05:30	2026-10-07 12:05:05.637745+05:30
01a11512-a427-7593-a227-04989db90b90	2026-10-07 12:05:05.639787+05:30	2026-10-07 12:05:05.639787+05:30
01a11512-a423-74aa-8997-a943c3502160	2026-10-07 12:05:05.63503+05:30	2026-10-07 12:05:05.63503+05:30
01a11512-a429-7049-a07b-1cc1f203b219	2026-10-07 12:05:05.641074+05:30	2026-10-07 12:05:05.641074+05:30
01a11512-a446-78e6-b7e6-76bee8abf89d	2026-10-07 12:05:05.670632+05:30	2026-10-07 12:05:05.670632+05:30
01a11512-a440-7c5a-b7ad-6110a1e4c6e7	2026-10-07 12:05:05.665006+05:30	2026-10-07 12:05:05.665006+05:30
01a11512-a439-7c72-9fa3-e67242afe94b	2026-10-07 12:05:05.657339+05:30	2026-10-07 12:05:05.657339+05:30
01a11512-a464-7ee1-ad03-b6ee4535302e	2026-10-07 12:05:05.700256+05:30	2026-10-07 12:05:05.700256+05:30
01a11512-a459-7601-b14b-383d7061aed8	2026-10-07 12:05:05.689218+05:30	2026-10-07 12:05:05.689218+05:30
01a11512-a44c-78b0-a804-aa7b9b647633	2026-10-07 12:05:05.676416+05:30	2026-10-07 12:05:05.676416+05:30
01a11512-c933-7a61-8b0e-abed5f694149	2026-10-07 12:05:15.123598+05:30	2026-10-07 12:05:15.123598+05:30
01a11512-c938-77fd-b15a-82f447f0e666	2026-10-07 12:05:15.128674+05:30	2026-10-07 12:05:15.128674+05:30
01a11512-c936-74a4-af1e-6f8610db1d68	2026-10-07 12:05:15.126733+05:30	2026-10-07 12:05:15.126733+05:30
01a11512-c935-720b-883f-193df3c65807	2026-10-07 12:05:15.125298+05:30	2026-10-07 12:05:15.125298+05:30
01a11512-c924-76e3-8ce0-098adb4cdc21	2026-10-07 12:05:15.11074+05:30	2026-10-07 12:05:15.11074+05:30
01a11512-c93b-7277-9f6b-898dd7014583	2026-10-07 12:05:15.131235+05:30	2026-10-07 12:05:15.131235+05:30
01a11512-c94d-77fc-b905-009ff2b0347d	2026-10-07 12:05:15.149799+05:30	2026-10-07 12:05:15.149799+05:30
01a11512-c96e-70cb-b8d9-5c782f0de493	2026-10-07 12:05:15.182743+05:30	2026-10-07 12:05:15.182743+05:30
01a11512-c954-73ce-84b0-08bf55098512	2026-10-07 12:05:15.156468+05:30	2026-10-07 12:05:15.156468+05:30
01a11512-c964-77a2-9d7b-b4f7ea3d20f4	2026-10-07 12:05:15.172372+05:30	2026-10-07 12:05:15.172372+05:30
01a11512-c95b-7cbe-b74d-5b91f640abcb	2026-10-07 12:05:15.163142+05:30	2026-10-07 12:05:15.163142+05:30
01a11512-c975-7c3f-a842-6d1fdbab517c	2026-10-07 12:05:15.189298+05:30	2026-10-07 12:05:15.189298+05:30
01a11515-6913-7101-b3cd-951066170d97	2026-10-07 12:08:07.123149+05:30	2026-10-07 12:08:07.123149+05:30
01a11515-6917-7a81-9f93-45371a106d55	2026-10-07 12:08:07.127053+05:30	2026-10-07 12:08:07.127053+05:30
01a11515-68f3-7f60-9a0d-9da4d538a474	2026-10-07 12:08:07.091656+05:30	2026-10-07 12:08:07.091656+05:30
01a11515-690d-7c77-8ef5-a09f0d8b48de	2026-10-07 12:08:07.117475+05:30	2026-10-07 12:08:07.117475+05:30
01a11515-690f-7984-9c6b-f4000af7a508	2026-10-07 12:08:07.119818+05:30	2026-10-07 12:08:07.119818+05:30
01a11515-691c-7012-a446-5ce7286425e5	2026-10-07 12:08:07.132109+05:30	2026-10-07 12:08:07.132109+05:30
01a11516-312e-7a52-ac37-502725eebb1c	2026-10-07 12:08:58.35062+05:30	2026-10-07 12:08:58.35062+05:30
01a11516-312d-762b-86e2-64617fb8243e	2026-10-07 12:08:58.349397+05:30	2026-10-07 12:08:58.349397+05:30
01a11516-312f-700d-bdbe-105536fbde6d	2026-10-07 12:08:58.352007+05:30	2026-10-07 12:08:58.352007+05:30
01a11516-3128-7fd6-bff0-7e570b09d04d	2026-10-07 12:08:58.34486+05:30	2026-10-07 12:08:58.34486+05:30
01a11516-312b-7ff0-a748-f4349aa05502	2026-10-07 12:08:58.347552+05:30	2026-10-07 12:08:58.347552+05:30
01a11516-3132-766a-ab98-1adc617e3e2c	2026-10-07 12:08:58.354052+05:30	2026-10-07 12:08:58.354052+05:30
\.


--
-- Data for Name: guest_watchlist_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.guest_watchlist_items (guest_id, product_id, "position") FROM stdin;
\.


--
-- Data for Name: hero_images; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.hero_images (id, object_key, alt_text, sort_order, created_at) FROM stdin;
84ae8884-a06b-4cce-aa78-4c94f3a57139	hero/hero1-2.png		0	2026-10-05 14:29:50.13749+05:30
94c38d74-cdbe-40df-a661-6d46e7e3c1ad	hero/hero2-2.png		1	2026-10-05 14:29:58.42664+05:30
3e514b2f-e75d-46a6-96a3-26826a15f9de	hero/hero3.png		2	2026-10-05 14:30:43.507997+05:30
0110827e-8362-4f08-b510-d00244e923bf	hero/hero4.png		3	2026-10-05 14:30:49.530288+05:30
\.


--
-- Data for Name: homepage_settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.homepage_settings (id, content, updated_at) FROM stdin;
01a10b4b-b64f-71e1-b751-cc6e9f6f9e81	{"ticker": ["Stone-ground, never beaten", "No fillers or anti-caking agents", "Roasted in 4kg batches", "Sealed within 48 hours", "Single-origin whole spices", "Recipes that actually work"], "categories": {"title": "Shop by category", "items": [{"slug": "breakfast-masalas", "label": "Everyday Masalas", "image_url": "", "image_key": "homepage/categories/masala-3.png", "image_product_slug": "sambar-masala"}, {"slug": "pure-spices", "label": "Biryani", "image_url": "", "image_key": "homepage/categories/biriyani.png", "image_product_slug": "garam-masala"}, {"slug": "podis", "label": "Podis", "image_url": "", "image_key": "homepage/categories/podi-2.png", "image_product_slug": "rasam-podi"}, {"slug": "pickles", "label": "Pickles", "image_url": "", "image_key": "", "image_product_slug": "mango-pickle"}, {"slug": "recipe-kits", "label": "Kits", "image_url": "", "image_key": "homepage/categories/whatsapp-image-2026-10-06-at-10-26-44-am.jpeg", "image_product_slug": ""}]}, "bestsellers": {"title": "Bestsellers", "product_slugs": ["everyday-masala-duo", "curry-pickle-pairing", "biriyani-masala", "mutton-masala", "chettinad-masala", "chicken-masala", "fish-curry-masala"]}, "combos": {"title": "Better valued Combos", "description": "Curated combos \\u2014 a combination of meals in one box", "product_slugs": ["everyday-masala-duo", "pantry-starter-set", "family-spice-set", "masala-night-duo"], "offer_codes": []}, "recipes": {"eyebrow": "Cook with confidence", "title": "Recipes that put the jar to work", "description": "Written for home cooks \\u2014 measured in spoons, not scales, and timed for a weeknight.", "link_label": "All recipes", "link_href": "/recipes", "recipe_slugs": ["chettinad-pepper-chicken", "restaurant-style-biryani", "weeknight-pav-bhaji", "ginger-pepper-millet-pongal"]}}	2026-10-06 11:10:28.080313+05:30
\.


--
-- Data for Name: messages; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.messages (id, name, email, phone, subject, message, status, created_at) FROM stdin;
01a10b99-5e34-78e0-bccb-f8d51b76502b	Jeva	jeevas0028@gmail.com	\N	Order issue	issues on orders	read	2026-10-05 15:56:02.93579+05:30
01a10fea-a991-7781-ab8a-ddcd89683d65	nithest	sjgaming9219@gmail.com	\N	Order issue	dfadfadfasdfasdf	read	2026-10-06 12:03:19.50577+05:30
01a1105d-1e8d-709f-a94e-5565824af243	jeevakumaran	sac@gmail.com	\N	Wholesale	fjkl;lkjhgfg	read	2026-10-06 14:08:20.559741+05:30
01a114c3-eac5-748b-87b9-27588cdb3251	Hari	hari@gmail.com	\N	Bulk orders	afafafasfsfee	new	2026-10-07 10:39:06.373625+05:30
01a114c6-96f8-7196-8162-eb769761fa0f	publisher1	tease@gmail.com	\N	test	ssssssssssssssssss	new	2026-10-07 10:42:01.529046+05:30
\.


--
-- Data for Name: notification_settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.notification_settings (id, email_api_key, sms_enabled, sms_account_sid, sms_auth_token, sms_sender_phone, email_enabled, email_sender_name, email_sender_email) FROM stdin;
1		f				t	Masala House	thalapathy0065@gmail.com
\.


--
-- Data for Name: order_history; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.order_history (id, order_id, status, changed_at, note) FROM stdin;
01a10ff5-5bfc-7bdf-b2b6-7535d5ea890f	01a10ff5-5b60-718c-9d4c-cff8648f04cb	placed	2026-10-06 12:15:00.261624+05:30	Order placed; awaiting admin confirmation.
01a11054-589b-7aa8-a10c-7f54093aff8b	01a11054-5853-7517-a9ac-4ec70f07b7e6	placed	2026-10-06 13:58:45.493012+05:30	Order placed; awaiting admin confirmation.
01a11055-0b7a-7c89-b2f3-8c3ddfb5a1a9	01a11054-5853-7517-a9ac-4ec70f07b7e6	processing	2026-10-06 13:59:31.386267+05:30	Status changed from placed to processing.
01a11055-94cc-7799-9409-6322b75e3b62	01a11054-5853-7517-a9ac-4ec70f07b7e6	shipped	2026-10-06 14:00:06.540087+05:30	Shipped with blue (tracking ID: 1234).
01a11069-bbc0-723b-887e-d7d4f3824e43	01a11054-5853-7517-a9ac-4ec70f07b7e6	delivered	2026-10-06 14:22:07.232072+05:30	Status changed from shipped to delivered.
01a11091-3634-7f42-931f-49a6ca10c21a	01a11091-35f0-7c5a-800d-d052ca58ec84	placed	2026-10-06 15:05:14.407968+05:30	Order placed; awaiting admin confirmation.
01a11093-9224-7059-a109-5b5ee9ff46f9	01a10ff5-5b60-718c-9d4c-cff8648f04cb	processing	2026-10-06 15:07:49.091433+05:30	Status changed from placed to processing.
01a11094-5445-7a8d-bae1-0f0265577e5d	01a11094-541d-7518-8324-767056a99696	placed	2026-10-06 15:08:38.743479+05:30	Order placed; awaiting admin confirmation.
01a1109d-5ed3-7b2c-b534-d6b2c25c9f8c	01a1109d-5e9c-7819-84a0-6f7c2b67cf6f	placed	2026-10-06 15:18:31.239797+05:30	Order placed; awaiting admin confirmation.
01a110ad-ace9-79cd-b6fc-6b66cbc512cc	01a110ad-acdd-751b-8fcb-2644274491a5	placed	2026-10-06 15:36:19.86226+05:30	Order placed; awaiting admin confirmation.
01a110b3-57a2-78a8-bf4e-240c045d77c0	01a110b3-575e-7853-97d2-857e2c6e3dba	placed	2026-10-06 15:42:31.183176+05:30	Order placed; awaiting admin confirmation.
01a110b4-b0f4-7b21-bd9a-77fa3e7e759d	01a110b4-b0c0-7a0b-8c07-bfe4c40c0b57	placed	2026-10-06 15:43:59.607136+05:30	Order placed; awaiting admin confirmation.
01a114ba-4401-7f30-a93e-3be18614e701	01a11054-5853-7517-a9ac-4ec70f07b7e6	delivered	2026-10-07 10:28:33.856958+05:30	Order details updated.
01a114ba-a837-706b-a310-3dbe9f1762a9	01a10ff5-5b60-718c-9d4c-cff8648f04cb	processing	2026-10-07 10:28:59.51091+05:30	Order details updated.
\.


--
-- Data for Name: order_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.order_items (id, order_id, product_id, variant_id, name, pack_size, sku, dish_type, categories, price, qty, line_total) FROM stdin;
01a11091-3605-7658-b48b-360fc69fc790	01a11091-35f0-7c5a-800d-d052ca58ec84	c5e9967b-0de0-44ac-ab6e-6cf9c67949ef	01a10f9f-af4a-7a53-be83-88000bb34f53	Chettinad Masala	100g	CHM-100	\N	{masala-powders}	98.00	1	98.00
01a11091-3632-7c77-bfba-633d00519609	01a11091-35f0-7c5a-800d-d052ca58ec84	981fe830-333a-4bd1-87dd-a4669c05b21e	01a10fa1-3508-7ee3-9068-911a28bd2fd0	Mutton Masala	50g	MM-50	\N	{masala-powders}	44.00	1	44.00
01a11094-5426-738e-b394-146ce305c7a6	01a11094-541d-7518-8324-767056a99696	d0cd71b8-b561-4c16-ae06-5654d3459c2b	01a10fa4-a134-7301-9b6d-5b4edf15008d	Fish Curry Masala	50	FCM-50	\N	{masala-powders}	51.00	1	51.00
01a11094-5444-7e59-a2bd-73fdef30a1b4	01a11094-541d-7518-8324-767056a99696	68558647-8967-4257-8c22-04a6477fb8c0	01a10f9a-ceb8-7121-8502-c35e2fdd4876	Chicken Masala	50	CM-50	\N	{masala-powders}	44.00	1	44.00
01a1109d-5eaf-760d-b424-d76857cc0f76	01a1109d-5e9c-7819-84a0-6f7c2b67cf6f	c5e9967b-0de0-44ac-ab6e-6cf9c67949ef	01a10f9f-af4a-7a53-be83-88000bb34f53	Chettinad Masala	100g	CHM-100	\N	{masala-powders}	98.00	1	98.00
01a110ad-ace6-7c70-ac35-6568af70934e	01a110ad-acdd-751b-8fcb-2644274491a5	c5e9967b-0de0-44ac-ab6e-6cf9c67949ef	01a10f9f-af4a-7a53-be83-88000bb34f53	Chettinad Masala	100g	CHM-100	\N	{masala-powders}	98.00	1	98.00
01a110b3-5775-7783-b093-eef4dfc3df53	01a110b3-575e-7853-97d2-857e2c6e3dba	981fe830-333a-4bd1-87dd-a4669c05b21e	01a10fa1-3508-7ee3-9068-911a28bd2fd0	Mutton Masala	50g	MM-50	\N	{masala-powders}	44.00	1	44.00
01a110b4-b0cc-71c1-95f4-221ce48f94db	01a110b4-b0c0-7a0b-8c07-bfe4c40c0b57	c5e9967b-0de0-44ac-ab6e-6cf9c67949ef	01a10f9f-af4a-7a53-be83-88000bb34f53	Chettinad Masala	100g	CHM-100	\N	{masala-powders}	98.00	1	98.00
01a114ba-43f5-7edf-88a8-05571020187c	01a11054-5853-7517-a9ac-4ec70f07b7e6	5ffd6b11-791b-403c-813a-b3115337a4c2	01a10b70-6665-7058-94af-c147e69b08cc	Biriyani Masala	100	BM-100	\N	{masala-powders}	149.00	1	149.00
01a114ba-4400-7c7f-b5f4-2d663dae15fa	01a11054-5853-7517-a9ac-4ec70f07b7e6	981fe830-333a-4bd1-87dd-a4669c05b21e	01a10fa1-3508-7ee3-9068-911a28bd2fd0	Mutton Masala	50g	MM-50	\N	{masala-powders}	44.00	1	44.00
01a114ba-a834-7e30-8771-9c3ce2e7ad6a	01a10ff5-5b60-718c-9d4c-cff8648f04cb	981fe830-333a-4bd1-87dd-a4669c05b21e	01a10fa1-3508-7ee3-9068-911a28bd2fd0	Mutton Masala	50g	MM-50	\N	{masala-powders}	44.00	1	44.00
01a114ba-a835-7544-abed-2e50cd8ac30f	01a10ff5-5b60-718c-9d4c-cff8648f04cb	01a10b83-a3c1-757d-bbbb-155f8ae62fb3	\N	Family Spice Set	Standard	PRODUCT-01a10b83-a3c1-757d-bbbb-155f8ae62fb3	\N	{combos-packs}	279.00	1	279.00
01a114ba-a836-7668-8864-b638baf5063a	01a10ff5-5b60-718c-9d4c-cff8648f04cb	01a10b83-a398-7b91-88b7-6c0748737d41	\N	Everyday Masala Duo	Standard	PRODUCT-01a10b83-a398-7b91-88b7-6c0748737d41	\N	{combos-packs}	299.00	1	299.00
\.


--
-- Data for Name: orders; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.orders (order_number, phone, email, status, total, created_at, id, customer_name, payment_status, subtotal, shipping_amount, discount_amount, coupon_code, coupon_label, delivery_mode, country_code, shipping_note, item_count, address_line, city, state, postal_code, admin_note, payment_note, tracking_id, courier_partner, guest_id) FROM stdin;
MAS-00012	+916381938385	jeevas0028@gmail.com	placed	182.00	2026-10-06 15:05:14.407968+05:30	01a11091-35f0-7c5a-800d-d052ca58ec84	karthi	pending_offline	142.00	40.00	0.00	\N	\N	domestic	IN	\N	2	3/198 nkl	Namakkal	TN	637020	\N	\N	\N	\N	\N
MAS-00013	+916381938385	jeevas0028@gmail.com	placed	135.00	2026-10-06 15:08:38.743479+05:30	01a11094-541d-7518-8324-767056a99696	karthi	pending_offline	95.00	40.00	0.00	\N	\N	domestic	IN	\N	2	3/198 nkl	Namakkal	TN	637020	\N	\N	\N	\N	\N
MAS-00014	+916381938385	jeevas0028@gmail.com	placed	138.00	2026-10-06 15:18:31.239797+05:30	01a1109d-5e9c-7819-84a0-6f7c2b67cf6f	nithesh	pending_offline	98.00	40.00	0.00	\N	\N	domestic	IN	\N	1	3/198 nkl	Namakkal	TN	637020	\N	\N	\N	\N	\N
MAS-00015	+918844646684	jeevas0028@gmail.com	placed	138.00	2026-10-06 15:36:19.86226+05:30	01a110ad-acdd-751b-8fcb-2644274491a5	karthi	pending_offline	98.00	40.00	0.00	\N	\N	domestic	IN	\N	1	3/198 nkl	Namakkal	TN	637020	\N	\N	\N	\N	\N
MAS-00016	+916767556565	jeevas0028@gmail.com	placed	84.00	2026-10-06 15:42:31.183176+05:30	01a110b3-575e-7853-97d2-857e2c6e3dba	karthi	pending_offline	44.00	40.00	0.00	\N	\N	domestic	IN	\N	1	3/198 nkl	Namakkal	TN	637020	\N	\N	\N	\N	\N
MAS-00017	+916767556565	jeevas0028@gmail.com	placed	138.00	2026-10-06 15:43:59.607136+05:30	01a110b4-b0c0-7a0b-8c07-bfe4c40c0b57	jeeva	pending_offline	98.00	40.00	0.00	\N	\N	domestic	IN	\N	1	3/198 nkl	Namakkal	TN	637020	\N	\N	\N	\N	\N
MAS-00011	+916381938385	jeevas0028@gmail.com	delivered	233.00	2026-10-06 13:58:45.493012+05:30	01a11054-5853-7517-a9ac-4ec70f07b7e6	jeeva	pending_offline	193.00	40.00	0.00	\N	\N	domestic	IN	\N	2	3/198 nkl	Namakkal	TN	637020			1234	blue	\N
MAS-00010	+916381938385	jeevas0028@gmail.com	processing	544.90	2026-10-06 12:15:00.261624+05:30	01a10ff5-5b60-718c-9d4c-cff8648f04cb	jeeva	pending_offline	622.00	0.00	77.10	SPICE10	10% off your order	domestic	IN	\N	3	3/198 nkl	Namakkal	TN	637020			\N	\N	\N
\.


--
-- Data for Name: product_reviews; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.product_reviews (reviewer_name, rating, comment, status, created_at, id, product_id, combo_id) FROM stdin;
\.


--
-- Data for Name: product_variants; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.product_variants (pack_size, kit_type, price, mrp, stock_qty, batch_no, expiry_date, sku, id, product_id) FROM stdin;
50	\N	84.00	90.00	5	\N	2026-10-29	MP-50	01a10b71-04d3-7cb0-9e97-7c56bc396289	9068cf64-7ac7-42f7-ac18-379e30010352
100	\N	99.00	120.00	50	\N	\N	CM-100	01a10f9a-ceb9-7479-9872-b6fd0b4e956d	68558647-8967-4257-8c22-04a6477fb8c0
200	\N	299.00	360.00	2	\N	2026-10-30	BM-200	01a10b70-6667-7b25-9767-061b1080a115	5ffd6b11-791b-403c-813a-b3115337a4c2
100g	\N	99.00	129.00	20	\N	\N	FCM-100	01a10fa4-a134-7f97-b8e2-1cd7d8805e9a	d0cd71b8-b561-4c16-ae06-5654d3459c2b
100	\N	149.00	188.00	5	\N	2026-10-28	GM-100	01a10b70-c282-73e0-b6ad-9ee227c4f1a7	b6b30548-3420-46a4-a9d7-053c2e740ede
100g	\N	59.00	99.00	2	\N	\N	DRP-100	01a10fb5-9ba3-7263-ba80-30f07bbfec4b	bd66645a-7471-4065-9d58-f0b76af9cff0
100g	\N	48.00	70.00	45	\N	\N	ICP-100	01a10fb7-0030-72ee-8ea4-14d060ae18bd	4342e0f4-6a9a-4b1b-a1ac-6e5ae13fba6e
100	\N	149.00	189.00	4	\N	2026-11-05	BM-100	01a10b70-6665-7058-94af-c147e69b08cc	5ffd6b11-791b-403c-813a-b3115337a4c2
50	\N	44.00	59.00	24	\N	\N	CM-50	01a10f9a-ceb8-7121-8502-c35e2fdd4876	68558647-8967-4257-8c22-04a6477fb8c0
50	\N	51.00	98.83	55	\N	\N	FCM-50	01a10fa4-a134-7301-9b6d-5b4edf15008d	d0cd71b8-b561-4c16-ae06-5654d3459c2b
50g	\N	44.00	58.72	71	\N	\N	MM-50	01a10fa1-3508-7ee3-9068-911a28bd2fd0	981fe830-333a-4bd1-87dd-a4669c05b21e
100g	\N	98.00	120.00	41	\N	\N	CHM-100	01a10f9f-af4a-7a53-be83-88000bb34f53	c5e9967b-0de0-44ac-ab6e-6cf9c67949ef
\.


--
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.products (name, slug, description, spice_level, status, created_at, updated_at, id, categories, images) FROM stdin;
Idly Chilli Powder	idly-chilli-powder		mild	active	2026-10-06 11:06:53.805289	2026-10-06 11:08:24.897508	4342e0f4-6a9a-4b1b-a1ac-6e5ae13fba6e	{podis}	{products/idly-chilli-powder-02ab0201.jpeg}
Garam Masala	garam-masala	Good	mild	active	2026-10-05 14:29:09.535172	2026-10-06 12:02:36.325199	b6b30548-3420-46a4-a9d7-053c2e740ede	{masala-powders}	{products/garam-masala-146739b0.jpeg}
Mango Pickle	mango-pickle	Mango pickle	hot	active	2026-10-05 15:08:23.639113	2026-10-05 15:11:58.607027	9068cf64-7ac7-42f7-ac18-379e30010352	{tamil-nadu,pickles}	{products/9068cf64-7ac7-42f7-ac18-379e30010352/pickle.png}
Chicken Masala	chicken-masala	Chicken Masala	mild	active	2026-10-06 10:35:46.119928	2026-10-06 10:36:06.110944	68558647-8967-4257-8c22-04a6477fb8c0	{masala-powders}	{products/chicken-masala-43254391.jpeg}
Chettinad Masala	chettinad-masala		mild	active	2026-10-06 10:41:25.747359	2026-10-06 10:41:25.747362	c5e9967b-0de0-44ac-ab6e-6cf9c67949ef	{masala-powders}	{products/chettinad-masala-fe9fb1c8.jpeg}
Mutton Masala	mutton-masala		mild	active	2026-10-06 10:42:29.108276	2026-10-06 10:43:05.525382	981fe830-333a-4bd1-87dd-a4669c05b21e	{masala-powders}	{products/mutton-masala-c6743532.jpeg}
Biriyani Masala	biriyani-masala	Biriyani Masala	mild	active	2026-10-05 14:36:54.707052	2026-10-06 10:57:26.075184	5ffd6b11-791b-403c-813a-b3115337a4c2	{masala-powders}	{products/biriyani-masala-ea0bb2a5.jpeg}
Fish Curry Masala	fish-curry-masala		hot	active	2026-10-06 10:44:35.383891	2026-10-06 10:58:06.524176	d0cd71b8-b561-4c16-ae06-5654d3459c2b	{masala-powders}	{products/fish-curry-masala-5be7c162.jpeg}
Dal Rice Powder	dal-rice-powder		mild	active	2026-10-06 11:05:22.520163	2026-10-06 11:07:20.756458	bd66645a-7471-4065-9d58-f0b76af9cff0	{podis}	{products/dal-rice-powder-2bd0c610.jpeg}
\.


--
-- Data for Name: recipes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.recipes (title, slug, cook_time_minutes, cuisine, dish_type, hero_image_url, video_url, id, ingredients, steps) FROM stdin;
Coconut Rasam	coconut-rasam	25	South Indian	Soup	recipes/whatsapp-image-2026-10-06-at-11-13-36-am.jpeg	\N	01a10b73-1e4f-7901-adf2-bf60dac79b3c	{Tamarind,"Rasam podi",Coconut,Tomato}	{"Simmer tamarind and tomato.","Stir in the podi off the heat.","Add coconut and a final tempering."}
Coconut Sambar	coconut-sambar	30	South Indian	Main Course	recipes/whatsapp-image-2026-10-06-at-11-15-10-am.jpeg	\N	01a10b73-1e4f-75fa-881d-9f5534c2686c	{"Toor dal","Sambar masala",Coconut,Vegetables}	{"Cook the dal until soft.","Add vegetables and masala.","Finish with coconut and tempering."}
Podi Idli	podi-idli	20	South Indian	Breakfast	recipes/whatsapp-image-2026-10-06-at-11-15-45-am.jpeg	\N	01a10b73-1e4f-742a-a68c-25808c2981a8	{"Idli batter","Rasam podi",Ghee,Sesame}	{"Steam the idlis soft.","Toss hot idli in ghee and podi.","Rest two minutes so it clings."}
Restaurant Style Biryani	restaurant-style-biryani	55	Hyderabadi	Rice	recipes/biriyani-res.png	\N	01a10b73-1e4f-7e05-99aa-4ea9c246236a	{"Basmati rice","Biriyani masala",Yogurt,Onions}	{"Marinate vegetables and protein.","Layer with rice and masala.","Steam until aromatic."}
Weeknight Pav Bhaji	weeknight-pav-bhaji	35	Indian	Street Food	recipes/pavbhaji.png	\N	01a10b73-1e4f-7032-9d3d-5d11eae78f24	{Potatoes,"Pav bhaji masala",Butter,Onions}	{"Boil and mash the vegetables.","Fry onion, then bloom the masala.","Finish with butter and a squeeze of lime."}
Tamil Lemon Rice	tamil-lemon-rice	25	Tamil	Rice	recipes/whatsapp-image-2026-10-06-at-11-16-19-am.jpeg	\N	01a10b73-1e4f-7581-a2ca-c032688351e2	{"Cooked rice","Fresh lemon juice","Mustard seeds",Turmeric,Peanuts,"Curry leaves","Dried red chilli"}	{"Spread freshly cooked rice on a tray and let it cool until the grains separate.","Heat oil, crackle mustard seeds, then add peanuts, dried chilli, curry leaves and turmeric.","Turn off the heat, stir in lemon juice and salt, then fold through the rice.","Rest for five minutes and taste for lemon and salt before serving."}
Chettinad Pepper Chicken	chettinad-pepper-chicken	45	Chettinad	Main Course	recipes/chettinad-pepper-chicken.png	\N	01a10b73-1e4f-7c01-9853-e9c2ac061632	{Chicken,"Chettinad masala","Curry leaf",Coconut}	{"Toast the masala until fragrant.","Brown the chicken with curry leaf.","Simmer until the oil separates."}
Chettinad Vegetable Kurma	chettinad-vegetable-kurma	40	Chettinad	Main Course	recipes/whatsapp-image-2026-10-06-at-11-12-48-am.jpeg	\N	01a10b73-1e4f-76e5-9f9d-bab07b77c6fe	{"Mixed seasonal vegetables",Onion,Tomato,"Coriander seeds","Fennel seeds","Black pepper","Fresh coconut","Ginger and garlic"}	{"Toast coriander, fennel and pepper until aromatic, then grind with coconut, ginger and garlic.","Saute sliced onion until soft, add tomato and cook until pulpy.","Stir in the ground spice paste and cook gently for two minutes.","Add vegetables and water, cover and simmer until tender.","Adjust salt and consistency, then serve with idiyappam, parotta or rice."}
Ginger Pepper Millet Pongal	ginger-pepper-millet-pongal	35	South Indian	Breakfast	recipes/whatsapp-image-2026-10-06-at-11-18-07-am.jpeg	\N	01a10b73-1e4f-7911-8853-cab5ada01ec7	{"Foxtail millet","Split yellow moong dal","Fresh ginger","Whole black pepper","Cumin seeds","Curry leaves",Cashews,Ghee}	{"Rinse millet and moong dal, then drain well.","Pressure-cook them with water and salt until soft and creamy.","Crush pepper and cumin lightly; fry with ginger, curry leaves and cashews in ghee.","Stir the tempering into the cooked millet and dal, loosening with hot water if needed.","Serve warm with coconut chutney or sambar."}
Pepper Mushroom Fry	pepper-mushroom-fry	30	South Indian	Side Dish	recipes/whatsapp-image-2026-10-06-at-11-17-05-am.jpeg	\N	01a10b73-1e4f-7d36-b53a-d209e31a4749	{"Button mushrooms","Coarsely crushed black pepper",Shallots,Ginger,Garlic,"Curry leaves","Coriander leaves"}	{"Wipe the mushrooms clean and quarter the larger ones.","Sizzle curry leaves, sliced shallots, ginger and garlic in a hot pan until golden.","Add mushrooms and salt; cook uncovered until their released moisture evaporates.","Toss with crushed pepper and chopped coriander, then serve while hot."}
\.


--
-- Data for Name: updates; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.updates (id, email, created_at, confirmation_sent_at) FROM stdin;
01a10ba3-f249-7ae4-a58c-5bdd1fa1fadb	hari@gmail.com	2026-10-05 16:07:36.199219+05:30	\N
01a10ba3-7924-7d0d-8f09-de0dffaa75bb	jeevas0028@gmail.com	2026-10-05 16:07:05.166657+05:30	2026-10-06 15:35:42.222555+05:30
\.


--
-- Name: notification_settings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.notification_settings_id_seq', 1, false);


--
-- Name: order_reference_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.order_reference_seq', 17, true);


--
-- Name: admin_users admin_users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_users
    ADD CONSTRAINT admin_users_pkey PRIMARY KEY (id);


--
-- Name: alembic_version alembic_version_pkc; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.alembic_version
    ADD CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num);


--
-- Name: blog_posts blog_posts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.blog_posts
    ADD CONSTRAINT blog_posts_pkey PRIMARY KEY (id);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: categories categories_slug_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_slug_key UNIQUE (slug);


--
-- Name: combos combos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.combos
    ADD CONSTRAINT combos_pkey PRIMARY KEY (id);


--
-- Name: coupons coupons_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.coupons
    ADD CONSTRAINT coupons_code_key UNIQUE (code);


--
-- Name: coupons coupons_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.coupons
    ADD CONSTRAINT coupons_pkey PRIMARY KEY (id);


--
-- Name: guest_cart_items guest_cart_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.guest_cart_items
    ADD CONSTRAINT guest_cart_items_pkey PRIMARY KEY (guest_id, product_id, variant_key);


--
-- Name: guest_sessions guest_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.guest_sessions
    ADD CONSTRAINT guest_sessions_pkey PRIMARY KEY (guest_id);


--
-- Name: guest_watchlist_items guest_watchlist_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.guest_watchlist_items
    ADD CONSTRAINT guest_watchlist_items_pkey PRIMARY KEY (guest_id, product_id);


--
-- Name: hero_images hero_images_object_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.hero_images
    ADD CONSTRAINT hero_images_object_key_key UNIQUE (object_key);


--
-- Name: hero_images hero_images_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.hero_images
    ADD CONSTRAINT hero_images_pkey PRIMARY KEY (id);


--
-- Name: homepage_settings homepage_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.homepage_settings
    ADD CONSTRAINT homepage_settings_pkey PRIMARY KEY (id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- Name: notification_settings notification_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notification_settings
    ADD CONSTRAINT notification_settings_pkey PRIMARY KEY (id);


--
-- Name: order_history order_history_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_history
    ADD CONSTRAINT order_history_pkey PRIMARY KEY (id);


--
-- Name: order_items order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);


--
-- Name: orders orders_order_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_order_number_key UNIQUE (order_number);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: product_reviews product_reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_reviews
    ADD CONSTRAINT product_reviews_pkey PRIMARY KEY (id);


--
-- Name: product_variants product_variants_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_variants
    ADD CONSTRAINT product_variants_pkey PRIMARY KEY (id);


--
-- Name: product_variants product_variants_sku_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_variants
    ADD CONSTRAINT product_variants_sku_key UNIQUE (sku);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: products products_slug_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_slug_key UNIQUE (slug);


--
-- Name: recipes recipes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.recipes
    ADD CONSTRAINT recipes_pkey PRIMARY KEY (id);


--
-- Name: recipes recipes_slug_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.recipes
    ADD CONSTRAINT recipes_slug_key UNIQUE (slug);


--
-- Name: updates updates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.updates
    ADD CONSTRAINT updates_pkey PRIMARY KEY (id);


--
-- Name: admin_users uq_admin_users_email; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_users
    ADD CONSTRAINT uq_admin_users_email UNIQUE (email);


--
-- Name: blog_posts uq_blog_posts_slug; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.blog_posts
    ADD CONSTRAINT uq_blog_posts_slug UNIQUE (slug);


--
-- Name: combos uq_combos_slug; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.combos
    ADD CONSTRAINT uq_combos_slug UNIQUE (slug);


--
-- Name: updates uq_updates_email; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.updates
    ADD CONSTRAINT uq_updates_email UNIQUE (email);


--
-- Name: ix_blog_posts_status_published_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_blog_posts_status_published_at ON public.blog_posts USING btree (status, published_at);


--
-- Name: ix_categories_slug; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX ix_categories_slug ON public.categories USING btree (slug);


--
-- Name: ix_guest_sessions_last_seen_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_guest_sessions_last_seen_at ON public.guest_sessions USING btree (last_seen_at);


--
-- Name: ix_messages_status_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_messages_status_created_at ON public.messages USING btree (status, created_at);


--
-- Name: ix_messages_subject_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_messages_subject_created_at ON public.messages USING btree (subject, created_at);


--
-- Name: ix_order_history_order_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_order_history_order_id ON public.order_history USING btree (order_id);


--
-- Name: ix_order_items_order_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_order_items_order_id ON public.order_items USING btree (order_id);


--
-- Name: ix_orders_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_orders_email ON public.orders USING btree (email);


--
-- Name: ix_orders_guest_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_orders_guest_id ON public.orders USING btree (guest_id);


--
-- Name: ix_orders_phone; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_orders_phone ON public.orders USING btree (phone);


--
-- Name: ix_product_reviews_product_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_product_reviews_product_id ON public.product_reviews USING btree (product_id);


--
-- Name: ix_product_variants_product_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_product_variants_product_id ON public.product_variants USING btree (product_id);


--
-- Name: ix_products_slug; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX ix_products_slug ON public.products USING btree (slug);


--
-- Name: ix_recipes_slug; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX ix_recipes_slug ON public.recipes USING btree (slug);


--
-- Name: orders fk_orders_guest_id_guest_sessions; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT fk_orders_guest_id_guest_sessions FOREIGN KEY (guest_id) REFERENCES public.guest_sessions(guest_id) ON DELETE SET NULL;


--
-- Name: product_reviews fk_product_reviews_combo_id_combos; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_reviews
    ADD CONSTRAINT fk_product_reviews_combo_id_combos FOREIGN KEY (combo_id) REFERENCES public.combos(id) ON DELETE CASCADE;


--
-- Name: guest_cart_items guest_cart_items_guest_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.guest_cart_items
    ADD CONSTRAINT guest_cart_items_guest_id_fkey FOREIGN KEY (guest_id) REFERENCES public.guest_sessions(guest_id) ON DELETE CASCADE;


--
-- Name: guest_watchlist_items guest_watchlist_items_guest_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.guest_watchlist_items
    ADD CONSTRAINT guest_watchlist_items_guest_id_fkey FOREIGN KEY (guest_id) REFERENCES public.guest_sessions(guest_id) ON DELETE CASCADE;


--
-- Name: order_history order_history_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_history
    ADD CONSTRAINT order_history_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: order_items order_items_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: product_reviews product_reviews_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_reviews
    ADD CONSTRAINT product_reviews_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: product_variants product_variants_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_variants
    ADD CONSTRAINT product_variants_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict dxYj2Y6nYrCrgStEbTkczDvM4kbemmTSMFAOWZbTC0sJBnDjKr3oY81IBNQkzvo
