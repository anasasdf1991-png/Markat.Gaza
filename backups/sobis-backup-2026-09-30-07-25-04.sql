--
-- PostgreSQL database dump
--

\restrict ouzUZ1MmgPcNQq8SqtnQBcbQUBKaX7xCmXdNnKdfs9hTQauputBfIfc73qut3e9

-- Dumped from database version 15.16 (Debian 15.16-0+deb12u1)
-- Dumped by pg_dump version 15.16 (Debian 15.16-0+deb12u1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs (
    id integer NOT NULL,
    user_id integer,
    user_name text DEFAULT 'النظام'::text NOT NULL,
    action character varying(40) NOT NULL,
    entity character varying(60),
    entity_id integer,
    meta jsonb,
    ip character varying(60),
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: audit_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.audit_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: audit_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.audit_logs_id_seq OWNED BY public.audit_logs.id;


--
-- Name: backups; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.backups (
    id integer NOT NULL,
    filename text NOT NULL,
    size bigint DEFAULT 0 NOT NULL,
    status character varying(20) DEFAULT 'success'::character varying NOT NULL,
    note text,
    created_by integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: backups_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.backups_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: backups_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.backups_id_seq OWNED BY public.backups.id;


--
-- Name: categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.categories (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    sort integer DEFAULT 0 NOT NULL
);


--
-- Name: categories_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.categories_id_seq OWNED BY public.categories.id;


--
-- Name: customers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customers (
    id integer NOT NULL,
    name text NOT NULL,
    phone character varying(40),
    address text,
    email character varying(120),
    id_number character varying(40),
    notes text,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: customers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.customers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: customers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.customers_id_seq OWNED BY public.customers.id;


--
-- Name: expenses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.expenses (
    id integer NOT NULL,
    title text NOT NULL,
    category character varying(60) DEFAULT 'أخرى'::character varying NOT NULL,
    amount numeric(14,2) NOT NULL,
    note text,
    created_by integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: expenses_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.expenses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: expenses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.expenses_id_seq OWNED BY public.expenses.id;


--
-- Name: invoice_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.invoice_items (
    id integer NOT NULL,
    invoice_id integer NOT NULL,
    product_id integer,
    product_name text NOT NULL,
    unit character varying(20) DEFAULT 'قطعة'::character varying NOT NULL,
    price numeric(14,2) NOT NULL,
    cost numeric(14,2) DEFAULT '0'::numeric NOT NULL,
    qty numeric(14,3) NOT NULL,
    discount_pct numeric(6,2) DEFAULT '0'::numeric NOT NULL,
    tax_rate numeric(6,2) DEFAULT '0'::numeric NOT NULL,
    total numeric(14,2) NOT NULL
);


--
-- Name: invoice_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.invoice_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: invoice_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.invoice_items_id_seq OWNED BY public.invoice_items.id;


--
-- Name: invoices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.invoices (
    id integer NOT NULL,
    customer_id integer,
    user_id integer NOT NULL,
    status character varying(20) DEFAULT 'completed'::character varying NOT NULL,
    payment_method character varying(20) DEFAULT 'cash'::character varying NOT NULL,
    subtotal numeric(14,2) DEFAULT '0'::numeric NOT NULL,
    discount numeric(14,2) DEFAULT '0'::numeric NOT NULL,
    tax numeric(14,2) DEFAULT '0'::numeric NOT NULL,
    total numeric(14,2) DEFAULT '0'::numeric NOT NULL,
    paid numeric(14,2) DEFAULT '0'::numeric NOT NULL,
    change_amount numeric(14,2) DEFAULT '0'::numeric NOT NULL,
    notes text,
    due_date date,
    suspended_label text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: invoices_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.invoices_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: invoices_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.invoices_id_seq OWNED BY public.invoices.id;


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id integer NOT NULL,
    type character varying(30) NOT NULL,
    title text NOT NULL,
    body text,
    entity character varying(60),
    entity_id integer,
    read boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.notifications_id_seq OWNED BY public.notifications.id;


--
-- Name: payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payments (
    id integer NOT NULL,
    invoice_id integer,
    customer_id integer,
    amount numeric(14,2) NOT NULL,
    method character varying(20) DEFAULT 'cash'::character varying NOT NULL,
    type character varying(20) DEFAULT 'sale'::character varying NOT NULL,
    note text,
    created_by integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: payments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.payments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: payments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.payments_id_seq OWNED BY public.payments.id;


--
-- Name: products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.products (
    id integer NOT NULL,
    barcode character varying(64) NOT NULL,
    sku character varying(64) NOT NULL,
    name text NOT NULL,
    short_name text,
    category_id integer,
    supplier_id integer,
    purchase_price numeric(14,2) DEFAULT '0'::numeric NOT NULL,
    sale_price numeric(14,2) DEFAULT '0'::numeric NOT NULL,
    wholesale_price numeric(14,2) DEFAULT '0'::numeric NOT NULL,
    special_price numeric(14,2),
    stock numeric(14,3) DEFAULT '0'::numeric NOT NULL,
    min_stock numeric(14,3) DEFAULT '5'::numeric NOT NULL,
    unit character varying(20) DEFAULT 'قطعة'::character varying NOT NULL,
    expiry_date date,
    batch_code character varying(60),
    tax_rate numeric(6,2) DEFAULT '0'::numeric NOT NULL,
    image_url text,
    description text,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    favorite boolean DEFAULT false NOT NULL
);


--
-- Name: products_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.products_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: products_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.products_id_seq OWNED BY public.products.id;


--
-- Name: purchases; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.purchases (
    id integer NOT NULL,
    supplier_id integer NOT NULL,
    amount numeric(14,2) NOT NULL,
    paid numeric(14,2) DEFAULT '0'::numeric NOT NULL,
    note text,
    created_by integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: purchases_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.purchases_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: purchases_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.purchases_id_seq OWNED BY public.purchases.id;


--
-- Name: settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.settings (
    key character varying(80) NOT NULL,
    value text DEFAULT ''::text NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by integer
);


--
-- Name: stock_movements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stock_movements (
    id integer NOT NULL,
    product_id integer NOT NULL,
    change numeric(14,3) NOT NULL,
    type character varying(20) NOT NULL,
    ref_id integer,
    note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: stock_movements_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.stock_movements_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: stock_movements_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.stock_movements_id_seq OWNED BY public.stock_movements.id;


--
-- Name: suppliers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.suppliers (
    id integer NOT NULL,
    name text NOT NULL,
    phone character varying(40),
    email character varying(120),
    address text,
    company text,
    notes text,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: suppliers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.suppliers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: suppliers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.suppliers_id_seq OWNED BY public.suppliers.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id integer NOT NULL,
    username character varying(60) NOT NULL,
    password_hash text NOT NULL,
    full_name text NOT NULL,
    role character varying(30) DEFAULT 'cashier'::character varying NOT NULL,
    permissions jsonb DEFAULT '[]'::jsonb NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    theme character varying(10) DEFAULT 'dark'::character varying NOT NULL,
    failed_attempts integer DEFAULT 0 NOT NULL,
    locked_until timestamp with time zone,
    last_login_at timestamp with time zone,
    session_version integer DEFAULT 0 NOT NULL
);


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: audit_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs ALTER COLUMN id SET DEFAULT nextval('public.audit_logs_id_seq'::regclass);


--
-- Name: backups id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.backups ALTER COLUMN id SET DEFAULT nextval('public.backups_id_seq'::regclass);


--
-- Name: categories id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories ALTER COLUMN id SET DEFAULT nextval('public.categories_id_seq'::regclass);


--
-- Name: customers id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers ALTER COLUMN id SET DEFAULT nextval('public.customers_id_seq'::regclass);


--
-- Name: expenses id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses ALTER COLUMN id SET DEFAULT nextval('public.expenses_id_seq'::regclass);


--
-- Name: invoice_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_items ALTER COLUMN id SET DEFAULT nextval('public.invoice_items_id_seq'::regclass);


--
-- Name: invoices id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices ALTER COLUMN id SET DEFAULT nextval('public.invoices_id_seq'::regclass);


--
-- Name: notifications id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications ALTER COLUMN id SET DEFAULT nextval('public.notifications_id_seq'::regclass);


--
-- Name: payments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments ALTER COLUMN id SET DEFAULT nextval('public.payments_id_seq'::regclass);


--
-- Name: products id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products ALTER COLUMN id SET DEFAULT nextval('public.products_id_seq'::regclass);


--
-- Name: purchases id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchases ALTER COLUMN id SET DEFAULT nextval('public.purchases_id_seq'::regclass);


--
-- Name: stock_movements id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_movements ALTER COLUMN id SET DEFAULT nextval('public.stock_movements_id_seq'::regclass);


--
-- Name: suppliers id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.suppliers ALTER COLUMN id SET DEFAULT nextval('public.suppliers_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.audit_logs (id, user_id, user_name, action, entity, entity_id, meta, ip, created_at) FROM stdin;
1	1	عمر السبيعي	login	user	1	\N	127.0.0.1	2026-09-30 07:24:42.275887+00
\.


--
-- Data for Name: backups; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.backups (id, filename, size, status, note, created_by, created_at) FROM stdin;
\.


--
-- Data for Name: categories; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.categories (id, name, sort) FROM stdin;
1	مشروبات	0
2	ألبان وأجبان	1
3	مواد غذائية	2
4	حلويات وسناكس	3
5	منظفات	4
6	عناية شخصية	5
7	مخبوزات	6
\.


--
-- Data for Name: customers; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.customers (id, name, phone, address, email, id_number, notes, active, created_at) FROM stdin;
1	أحمد محمود الشاذلي	01012345678	حي النرجس - التجمع الخامس	ahmed.shazly@gmail.com	\N	\N	t	2026-01-09 12:00:54+00
2	محمد السيد عمر	01128765432	شارع الجمهورية - وسط البلد	\N	\N	\N	t	2026-07-29 12:00:06+00
3	فاطمة الزهراء إبراهيم	01233445566	مدينة نصر - عباس العقاد	\N	\N	\N	t	2026-01-11 12:00:38+00
4	حسن علي حسن	01098765432	حي المعادي - شارع 9	\N	\N	\N	t	2026-08-13 12:00:49+00
5	منى عبد الرحمن	01551223344	الزمالك - شارع 26 يوليو	mona.a@outlook.com	\N	\N	t	2026-07-31 12:00:13+00
6	سوبر ماركت القمر (جملة)	0223456789	المنطقة التجارية بالعبور	\N	\N	\N	t	2026-05-20 12:00:39+00
7	كافيتريا الندى	01277001122	كورنيش النيل	\N	\N	\N	t	2026-06-13 12:00:59+00
8	سامي جرجس فؤاد	01066677889	مصر الجديدة - روكسي	\N	\N	\N	t	2026-08-16 12:00:01+00
9	أسما خالد مراد	01155667788	حدائق القبة	\N	\N	\N	t	2026-02-03 12:00:03+00
10	محمود طه رزق	01033445566	شبرا مصر	\N	\N	\N	t	2026-03-13 12:00:02+00
\.


--
-- Data for Name: expenses; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.expenses (id, title, category, amount, note, created_by, created_at) FROM stdin;
1	إنترنت	اتصالات	350.00	\N	1	2026-08-17 13:00:52+00
2	نقل بضاعة	نقل	236.00	\N	1	2026-08-20 12:00:14+00
3	إنترنت	اتصالات	350.00	\N	1	2026-08-21 10:00:46+00
4	صيانة ثلاجات	صيانة	501.00	\N	1	2026-08-23 17:00:40+00
5	إنترنت	اتصالات	350.00	\N	1	2026-08-24 11:00:18+00
6	فاتورة كهرباء	كهرباء	1485.00	\N	1	2026-08-27 10:00:54+00
7	فاتورة مياه	مياه	206.00	\N	1	2026-08-28 17:00:56+00
8	نقل بضاعة	نقل	259.00	\N	1	2026-08-29 15:00:59+00
9	إنترنت	اتصالات	350.00	\N	1	2026-08-30 15:00:44+00
10	إنترنت	اتصالات	350.00	\N	1	2026-09-02 12:00:19+00
11	إيجار المحل	إيجار	8000.00	\N	1	2026-09-06 11:00:31+00
12	مستلزمات وأكياس	مستلزمات	389.00	\N	1	2026-09-07 15:00:47+00
13	فاتورة كهرباء	كهرباء	985.00	\N	1	2026-09-08 19:00:44+00
14	نقل بضاعة	نقل	218.00	\N	1	2026-09-09 20:00:35+00
15	صيانة ثلاجات	صيانة	596.00	\N	1	2026-09-10 11:00:42+00
16	فاتورة كهرباء	كهرباء	1313.00	\N	1	2026-09-11 20:00:10+00
17	فاتورة مياه	مياه	135.00	\N	1	2026-09-13 20:00:39+00
18	فاتورة مياه	مياه	182.00	\N	1	2026-09-16 12:00:04+00
19	إنترنت	اتصالات	350.00	\N	1	2026-09-17 20:00:28+00
20	إيجار المحل	إيجار	8000.00	\N	1	2026-09-18 18:00:22+00
21	صيانة ثلاجات	صيانة	161.00	\N	1	2026-09-20 18:00:28+00
22	مستلزمات وأكياس	مستلزمات	93.00	\N	1	2026-09-23 12:00:48+00
23	صيانة ثلاجات	صيانة	490.00	\N	1	2026-09-24 13:00:12+00
24	فاتورة مياه	مياه	142.00	\N	1	2026-09-25 17:00:26+00
25	فاتورة مياه	مياه	168.00	\N	1	2026-09-27 20:00:55+00
26	مستلزمات وأكياس	مستلزمات	286.00	\N	1	2026-09-28 13:00:26+00
\.


--
-- Data for Name: invoice_items; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.invoice_items (id, invoice_id, product_id, product_name, unit, price, cost, qty, discount_pct, tax_rate, total) FROM stdin;
1	1	20	شوكولاتة جالاكسي سادة 36 غرام	قطعة	25.00	17.00	4.000	10.00	0.00	90.00
2	2	9	زبادي دانون 4×100 غرام	باكيت	30.00	23.00	3.000	5.00	0.00	85.50
3	2	12	زبدة لورباك 200 غرام	علبة	162.00	128.00	3.000	0.00	0.00	486.00
4	2	17	دقيق المطاحن فاخر 1 كيلو	كيس	34.00	27.00	2.000	10.00	0.00	61.20
5	2	15	سكر حر 1 كيلو	كيس	47.00	40.00	2.000	0.00	0.00	94.00
6	2	34	كرواسون بالشوكولاتة	قطعة	18.00	11.00	2.000	0.00	0.00	36.00
7	3	7	نسكافيه كلاسيك 200 غرام	عبوة	262.00	208.00	1.000	0.00	0.00	262.00
8	3	29	شامبو هيد آند شولدرز 400 مل	عبوة	242.00	188.00	2.000	0.00	14.00	551.76
9	3	31	مناديل فاين 550 منديل	علبة	48.00	36.00	3.000	5.00	0.00	136.80
10	4	3	عصير جهينة برتقال 1 لتر	علبة	50.00	38.00	4.000	0.00	0.00	200.00
11	4	11	جبنة شرائح كرافت 200 غرام	علبة	96.00	76.00	2.000	0.00	0.00	192.00
12	5	33	توست ريتش 600 غرام	كيس	40.00	31.00	2.000	5.00	0.00	76.00
13	5	28	صابون لوكس 3 قطع	باكيت	61.00	47.00	3.000	5.00	14.00	198.19
14	5	7	نسكافيه كلاسيك 200 غرام	عبوة	262.00	208.00	1.000	0.00	0.00	262.00
15	5	9	زبادي دانون 4×100 غرام	باكيت	30.00	23.00	4.000	5.00	0.00	114.00
16	5	10	جبنة رومي قديم	كيلو	425.00	360.00	1.500	10.00	0.00	573.75
17	6	22	أوريو أصلي 154 غرام	علبة	40.00	29.00	3.000	0.00	0.00	120.00
18	6	5	ريد بول 250 مل	علبة	75.00	58.00	2.000	5.00	0.00	142.50
19	6	24	تايد أصلي 2.5 كيلو	علبة	262.00	208.00	1.000	0.00	14.00	298.68
20	7	14	مكرونة الملكة 400 غرام	كيس	15.00	11.00	3.000	10.00	0.00	40.50
21	7	22	أوريو أصلي 154 غرام	علبة	40.00	29.00	3.000	5.00	0.00	114.00
22	7	4	مياه معدنية دساني 600 مل	زجاجة	10.00	6.50	2.000	5.00	0.00	19.00
23	7	10	جبنة رومي قديم	كيلو	425.00	360.00	3.500	0.00	0.00	1487.50
24	8	18	عدس أصفر 1 كيلو	كيس	68.00	54.00	1.000	5.00	0.00	64.60
25	8	19	صلصة هاينز 300 غرام	عبوة	58.00	44.00	1.000	0.00	0.00	58.00
26	8	33	توست ريتش 600 غرام	كيس	40.00	31.00	2.000	0.00	0.00	80.00
27	9	17	دقيق المطاحن فاخر 1 كيلو	كيس	34.00	27.00	1.000	0.00	0.00	34.00
28	9	26	كلور مركز 1 لتر	زجاجة	32.00	24.00	4.000	10.00	14.00	131.33
29	9	34	كرواسون بالشوكولاتة	قطعة	18.00	11.00	3.000	0.00	0.00	54.00
30	9	10	جبنة رومي قديم	كيلو	425.00	360.00	3.500	0.00	0.00	1487.50
31	9	27	ديتول مطهر 500 مل	زجاجة	84.00	64.00	3.000	5.00	14.00	272.92
32	10	28	صابون لوكس 3 قطع	باكيت	61.00	47.00	1.000	0.00	14.00	69.54
33	10	20	شوكولاتة جالاكسي سادة 36 غرام	قطعة	25.00	17.00	2.000	0.00	0.00	50.00
34	10	29	شامبو هيد آند شولدرز 400 مل	عبوة	242.00	188.00	1.000	0.00	14.00	275.88
35	11	23	بسكويت التمر 12 حبة	باكيت	27.00	19.00	2.000	0.00	0.00	54.00
36	12	28	صابون لوكس 3 قطع	باكيت	61.00	47.00	2.000	0.00	14.00	139.08
37	13	32	حفاضات بامبرز مقاس 4 (64 قطعة)	عبوة	463.00	378.00	4.000	10.00	14.00	1900.15
38	13	24	تايد أصلي 2.5 كيلو	علبة	262.00	208.00	1.000	0.00	14.00	298.68
39	13	8	حليب جهينة كامل الدسم 1 لتر	علبة	53.00	42.00	2.000	0.00	0.00	106.00
40	13	1	بيبسي 1 لتر	زجاجة	32.00	26.00	2.000	0.00	0.00	64.00
41	13	15	سكر حر 1 كيلو	كيس	47.00	40.00	4.000	0.00	0.00	188.00
42	14	21	شيبسي كلاسيك عائلي	كيس	55.00	38.00	3.000	0.00	0.00	165.00
43	14	6	شاي ليبتون 100 كيس	علبة	192.00	155.00	1.000	0.00	0.00	192.00
44	14	11	جبنة شرائح كرافت 200 غرام	علبة	96.00	76.00	1.000	10.00	0.00	86.40
45	14	24	تايد أصلي 2.5 كيلو	علبة	262.00	208.00	4.000	10.00	14.00	1075.25
46	15	5	ريد بول 250 مل	علبة	75.00	58.00	4.000	0.00	0.00	300.00
47	15	10	جبنة رومي قديم	كيلو	425.00	360.00	1.500	10.00	0.00	573.75
48	16	2	كوكاكولا 330 مل	علبة	19.00	14.00	2.000	0.00	0.00	38.00
49	16	12	زبدة لورباك 200 غرام	علبة	162.00	128.00	4.000	5.00	0.00	615.60
50	16	20	شوكولاتة جالاكسي سادة 36 غرام	قطعة	25.00	17.00	4.000	5.00	0.00	95.00
51	17	29	شامبو هيد آند شولدرز 400 مل	عبوة	242.00	188.00	4.000	0.00	14.00	1103.52
52	17	9	زبادي دانون 4×100 غرام	باكيت	30.00	23.00	1.000	10.00	0.00	27.00
53	18	16	زيت عافية 2.25 لتر	زجاجة	286.00	238.00	4.000	0.00	0.00	1144.00
54	18	1	بيبسي 1 لتر	زجاجة	32.00	26.00	2.000	10.00	0.00	57.60
55	19	20	شوكولاتة جالاكسي سادة 36 غرام	قطعة	25.00	17.00	1.000	5.00	0.00	23.75
56	19	5	ريد بول 250 مل	علبة	75.00	58.00	4.000	10.00	0.00	270.00
57	20	24	تايد أصلي 2.5 كيلو	علبة	262.00	208.00	4.000	5.00	14.00	1134.98
58	20	14	مكرونة الملكة 400 غرام	كيس	15.00	11.00	4.000	0.00	0.00	60.00
59	20	31	مناديل فاين 550 منديل	علبة	48.00	36.00	3.000	5.00	0.00	136.80
60	20	34	كرواسون بالشوكولاتة	قطعة	18.00	11.00	2.000	0.00	0.00	36.00
61	21	31	مناديل فاين 550 منديل	علبة	48.00	36.00	1.000	0.00	0.00	48.00
62	21	4	مياه معدنية دساني 600 مل	زجاجة	10.00	6.50	2.000	0.00	0.00	20.00
63	21	9	زبادي دانون 4×100 غرام	باكيت	30.00	23.00	2.000	0.00	0.00	60.00
64	22	26	كلور مركز 1 لتر	زجاجة	32.00	24.00	1.000	0.00	14.00	36.48
65	22	7	نسكافيه كلاسيك 200 غرام	عبوة	262.00	208.00	4.000	5.00	0.00	995.60
66	23	21	شيبسي كلاسيك عائلي	كيس	55.00	38.00	3.000	10.00	0.00	148.50
67	23	6	شاي ليبتون 100 كيس	علبة	192.00	155.00	4.000	10.00	0.00	691.20
68	23	8	حليب جهينة كامل الدسم 1 لتر	علبة	53.00	42.00	3.000	0.00	0.00	159.00
69	23	23	بسكويت التمر 12 حبة	باكيت	27.00	19.00	4.000	0.00	0.00	108.00
70	24	25	فيري سائل غسيل الأطباق 500 مل	زجاجة	69.00	54.00	3.000	5.00	14.00	224.18
71	24	31	مناديل فاين 550 منديل	علبة	48.00	36.00	2.000	5.00	0.00	91.20
72	24	33	توست ريتش 600 غرام	كيس	40.00	31.00	3.000	0.00	0.00	120.00
73	25	5	ريد بول 250 مل	علبة	75.00	58.00	4.000	10.00	0.00	270.00
74	26	7	نسكافيه كلاسيك 200 غرام	عبوة	262.00	208.00	2.000	0.00	0.00	524.00
75	26	2	كوكاكولا 330 مل	علبة	19.00	14.00	3.000	0.00	0.00	57.00
76	27	33	توست ريتش 600 غرام	كيس	40.00	31.00	4.000	0.00	0.00	160.00
77	27	12	زبدة لورباك 200 غرام	علبة	162.00	128.00	2.000	0.00	0.00	324.00
78	27	21	شيبسي كلاسيك عائلي	كيس	55.00	38.00	3.000	5.00	0.00	156.75
79	27	20	شوكولاتة جالاكسي سادة 36 غرام	قطعة	25.00	17.00	4.000	0.00	0.00	100.00
80	27	15	سكر حر 1 كيلو	كيس	47.00	40.00	4.000	0.00	0.00	188.00
81	28	24	تايد أصلي 2.5 كيلو	علبة	262.00	208.00	2.000	0.00	14.00	597.36
82	28	3	عصير جهينة برتقال 1 لتر	علبة	50.00	38.00	4.000	0.00	0.00	200.00
83	28	6	شاي ليبتون 100 كيس	علبة	192.00	155.00	4.000	0.00	0.00	768.00
84	28	10	جبنة رومي قديم	كيلو	425.00	360.00	2.500	5.00	0.00	1009.38
85	28	11	جبنة شرائح كرافت 200 غرام	علبة	96.00	76.00	4.000	0.00	0.00	384.00
86	29	8	حليب جهينة كامل الدسم 1 لتر	علبة	53.00	42.00	3.000	0.00	0.00	159.00
87	29	20	شوكولاتة جالاكسي سادة 36 غرام	قطعة	25.00	17.00	3.000	0.00	0.00	75.00
88	29	30	معجون أسنان سيغنال 120 مل	علبة	55.00	41.00	4.000	5.00	14.00	238.26
89	29	24	تايد أصلي 2.5 كيلو	علبة	262.00	208.00	1.000	5.00	14.00	283.75
90	30	21	شيبسي كلاسيك عائلي	كيس	55.00	38.00	4.000	10.00	0.00	198.00
91	30	10	جبنة رومي قديم	كيلو	425.00	360.00	2.500	0.00	0.00	1062.50
92	31	23	بسكويت التمر 12 حبة	باكيت	27.00	19.00	2.000	0.00	0.00	54.00
93	31	1	بيبسي 1 لتر	زجاجة	32.00	26.00	3.000	10.00	0.00	86.40
94	31	16	زيت عافية 2.25 لتر	زجاجة	286.00	238.00	4.000	0.00	0.00	1144.00
95	32	34	كرواسون بالشوكولاتة	قطعة	18.00	11.00	4.000	5.00	0.00	68.40
96	32	12	زبدة لورباك 200 غرام	علبة	162.00	128.00	4.000	0.00	0.00	648.00
97	32	2	كوكاكولا 330 مل	علبة	19.00	14.00	4.000	5.00	0.00	72.20
98	33	23	بسكويت التمر 12 حبة	باكيت	27.00	19.00	1.000	0.00	0.00	27.00
99	33	6	شاي ليبتون 100 كيس	علبة	192.00	155.00	3.000	5.00	0.00	547.20
100	33	27	ديتول مطهر 500 مل	زجاجة	84.00	64.00	1.000	0.00	14.00	95.76
101	33	26	كلور مركز 1 لتر	زجاجة	32.00	24.00	3.000	0.00	14.00	109.44
102	33	32	حفاضات بامبرز مقاس 4 (64 قطعة)	عبوة	463.00	378.00	4.000	0.00	14.00	2111.28
103	34	3	عصير جهينة برتقال 1 لتر	علبة	50.00	38.00	3.000	0.00	0.00	150.00
104	34	21	شيبسي كلاسيك عائلي	كيس	55.00	38.00	3.000	5.00	0.00	156.75
105	34	23	بسكويت التمر 12 حبة	باكيت	27.00	19.00	2.000	0.00	0.00	54.00
106	34	32	حفاضات بامبرز مقاس 4 (64 قطعة)	عبوة	463.00	378.00	4.000	0.00	14.00	2111.28
107	35	34	كرواسون بالشوكولاتة	قطعة	18.00	11.00	1.000	5.00	0.00	17.10
108	35	16	زيت عافية 2.25 لتر	زجاجة	286.00	238.00	2.000	0.00	0.00	572.00
109	35	10	جبنة رومي قديم	كيلو	425.00	360.00	1.500	0.00	0.00	637.50
110	36	13	أرز الضحى 5 كيلو	كيس	449.00	375.00	1.000	0.00	0.00	449.00
111	36	8	حليب جهينة كامل الدسم 1 لتر	علبة	53.00	42.00	4.000	0.00	0.00	212.00
112	37	17	دقيق المطاحن فاخر 1 كيلو	كيس	34.00	27.00	2.000	10.00	0.00	61.20
113	38	4	مياه معدنية دساني 600 مل	زجاجة	10.00	6.50	2.000	0.00	0.00	20.00
114	38	32	حفاضات بامبرز مقاس 4 (64 قطعة)	عبوة	463.00	378.00	4.000	10.00	14.00	1900.15
115	38	9	زبادي دانون 4×100 غرام	باكيت	30.00	23.00	3.000	10.00	0.00	81.00
116	38	8	حليب جهينة كامل الدسم 1 لتر	علبة	53.00	42.00	3.000	5.00	0.00	151.05
117	39	24	تايد أصلي 2.5 كيلو	علبة	262.00	208.00	4.000	0.00	14.00	1194.72
118	39	25	فيري سائل غسيل الأطباق 500 مل	زجاجة	69.00	54.00	2.000	5.00	14.00	149.45
119	39	2	كوكاكولا 330 مل	علبة	19.00	14.00	2.000	0.00	0.00	38.00
120	39	13	أرز الضحى 5 كيلو	كيس	449.00	375.00	3.000	0.00	0.00	1347.00
121	40	12	زبدة لورباك 200 غرام	علبة	162.00	128.00	3.000	5.00	0.00	461.70
122	41	2	كوكاكولا 330 مل	علبة	19.00	14.00	1.000	0.00	0.00	19.00
123	42	28	صابون لوكس 3 قطع	باكيت	61.00	47.00	4.000	10.00	14.00	250.34
124	42	5	ريد بول 250 مل	علبة	75.00	58.00	2.000	0.00	0.00	150.00
125	42	11	جبنة شرائح كرافت 200 غرام	علبة	96.00	76.00	3.000	0.00	0.00	288.00
126	43	17	دقيق المطاحن فاخر 1 كيلو	كيس	34.00	27.00	1.000	0.00	0.00	34.00
127	44	34	كرواسون بالشوكولاتة	قطعة	18.00	11.00	1.000	5.00	0.00	17.10
128	44	21	شيبسي كلاسيك عائلي	كيس	55.00	38.00	3.000	0.00	0.00	165.00
129	44	31	مناديل فاين 550 منديل	علبة	48.00	36.00	3.000	0.00	0.00	144.00
130	44	12	زبدة لورباك 200 غرام	علبة	162.00	128.00	3.000	0.00	0.00	486.00
131	45	22	أوريو أصلي 154 غرام	علبة	40.00	29.00	3.000	0.00	0.00	120.00
132	45	6	شاي ليبتون 100 كيس	علبة	192.00	155.00	1.000	10.00	0.00	172.80
133	45	18	عدس أصفر 1 كيلو	كيس	68.00	54.00	3.000	0.00	0.00	204.00
134	45	29	شامبو هيد آند شولدرز 400 مل	عبوة	242.00	188.00	1.000	5.00	14.00	262.09
135	46	2	كوكاكولا 330 مل	علبة	19.00	14.00	4.000	5.00	0.00	72.20
136	46	14	مكرونة الملكة 400 غرام	كيس	15.00	11.00	2.000	0.00	0.00	30.00
137	46	15	سكر حر 1 كيلو	كيس	47.00	40.00	1.000	0.00	0.00	47.00
138	46	5	ريد بول 250 مل	علبة	75.00	58.00	1.000	0.00	0.00	75.00
139	46	34	كرواسون بالشوكولاتة	قطعة	18.00	11.00	3.000	5.00	0.00	51.30
140	47	7	نسكافيه كلاسيك 200 غرام	عبوة	262.00	208.00	2.000	10.00	0.00	471.60
141	47	1	بيبسي 1 لتر	زجاجة	32.00	26.00	2.000	10.00	0.00	57.60
142	47	20	شوكولاتة جالاكسي سادة 36 غرام	قطعة	25.00	17.00	3.000	5.00	0.00	71.25
143	47	6	شاي ليبتون 100 كيس	علبة	192.00	155.00	3.000	10.00	0.00	518.40
144	47	12	زبدة لورباك 200 غرام	علبة	162.00	128.00	2.000	0.00	0.00	324.00
145	48	27	ديتول مطهر 500 مل	زجاجة	84.00	64.00	1.000	0.00	14.00	95.76
146	48	5	ريد بول 250 مل	علبة	75.00	58.00	4.000	0.00	0.00	300.00
147	48	12	زبدة لورباك 200 غرام	علبة	162.00	128.00	2.000	0.00	0.00	324.00
148	48	13	أرز الضحى 5 كيلو	كيس	449.00	375.00	4.000	0.00	0.00	1796.00
149	49	32	حفاضات بامبرز مقاس 4 (64 قطعة)	عبوة	463.00	378.00	4.000	5.00	14.00	2005.72
150	49	10	جبنة رومي قديم	كيلو	425.00	360.00	3.500	0.00	0.00	1487.50
151	50	12	زبدة لورباك 200 غرام	علبة	162.00	128.00	2.000	5.00	0.00	307.80
152	51	6	شاي ليبتون 100 كيس	علبة	192.00	155.00	2.000	5.00	0.00	364.80
153	52	4	مياه معدنية دساني 600 مل	زجاجة	10.00	6.50	3.000	0.00	0.00	30.00
154	53	10	جبنة رومي قديم	كيلو	425.00	360.00	1.500	10.00	0.00	573.75
155	53	22	أوريو أصلي 154 غرام	علبة	40.00	29.00	1.000	0.00	0.00	40.00
156	53	29	شامبو هيد آند شولدرز 400 مل	عبوة	242.00	188.00	2.000	10.00	14.00	496.58
157	53	32	حفاضات بامبرز مقاس 4 (64 قطعة)	عبوة	463.00	378.00	2.000	0.00	14.00	1055.64
158	54	24	تايد أصلي 2.5 كيلو	علبة	262.00	208.00	4.000	0.00	14.00	1194.72
159	54	31	مناديل فاين 550 منديل	علبة	48.00	36.00	4.000	10.00	0.00	172.80
160	54	1	بيبسي 1 لتر	زجاجة	32.00	26.00	2.000	0.00	0.00	64.00
161	54	14	مكرونة الملكة 400 غرام	كيس	15.00	11.00	3.000	0.00	0.00	45.00
162	55	18	عدس أصفر 1 كيلو	كيس	68.00	54.00	1.000	10.00	0.00	61.20
163	56	8	حليب جهينة كامل الدسم 1 لتر	علبة	53.00	42.00	3.000	0.00	0.00	159.00
164	56	19	صلصة هاينز 300 غرام	عبوة	58.00	44.00	3.000	0.00	0.00	174.00
165	57	14	مكرونة الملكة 400 غرام	كيس	15.00	11.00	3.000	0.00	0.00	45.00
166	57	20	شوكولاتة جالاكسي سادة 36 غرام	قطعة	25.00	17.00	1.000	0.00	0.00	25.00
167	57	8	حليب جهينة كامل الدسم 1 لتر	علبة	53.00	42.00	2.000	10.00	0.00	95.40
168	57	34	كرواسون بالشوكولاتة	قطعة	18.00	11.00	1.000	0.00	0.00	18.00
169	58	33	توست ريتش 600 غرام	كيس	40.00	31.00	3.000	5.00	0.00	114.00
170	58	25	فيري سائل غسيل الأطباق 500 مل	زجاجة	69.00	54.00	3.000	0.00	14.00	235.98
171	58	7	نسكافيه كلاسيك 200 غرام	عبوة	262.00	208.00	3.000	0.00	0.00	786.00
172	58	18	عدس أصفر 1 كيلو	كيس	68.00	54.00	1.000	10.00	0.00	61.20
173	59	28	صابون لوكس 3 قطع	باكيت	61.00	47.00	2.000	0.00	14.00	139.08
174	59	7	نسكافيه كلاسيك 200 غرام	عبوة	262.00	208.00	3.000	0.00	0.00	786.00
175	60	1	بيبسي 1 لتر	زجاجة	32.00	26.00	1.000	5.00	0.00	30.40
176	60	19	صلصة هاينز 300 غرام	عبوة	58.00	44.00	3.000	0.00	0.00	174.00
177	60	16	زيت عافية 2.25 لتر	زجاجة	286.00	238.00	2.000	0.00	0.00	572.00
178	61	34	كرواسون بالشوكولاتة	قطعة	18.00	11.00	1.000	0.00	0.00	18.00
179	61	22	أوريو أصلي 154 غرام	علبة	40.00	29.00	1.000	0.00	0.00	40.00
180	62	33	توست ريتش 600 غرام	كيس	40.00	31.00	1.000	0.00	0.00	40.00
181	62	22	أوريو أصلي 154 غرام	علبة	40.00	29.00	1.000	5.00	0.00	38.00
182	62	1	بيبسي 1 لتر	زجاجة	32.00	26.00	2.000	5.00	0.00	60.80
183	63	12	زبدة لورباك 200 غرام	علبة	162.00	128.00	1.000	0.00	0.00	162.00
184	63	22	أوريو أصلي 154 غرام	علبة	40.00	29.00	3.000	0.00	0.00	120.00
185	63	31	مناديل فاين 550 منديل	علبة	48.00	36.00	4.000	0.00	0.00	192.00
186	63	28	صابون لوكس 3 قطع	باكيت	61.00	47.00	1.000	10.00	14.00	62.59
187	63	1	بيبسي 1 لتر	زجاجة	32.00	26.00	4.000	0.00	0.00	128.00
188	64	32	حفاضات بامبرز مقاس 4 (64 قطعة)	عبوة	463.00	378.00	4.000	0.00	14.00	2111.28
189	65	29	شامبو هيد آند شولدرز 400 مل	عبوة	242.00	188.00	3.000	0.00	14.00	827.64
190	65	16	زيت عافية 2.25 لتر	زجاجة	286.00	238.00	1.000	0.00	0.00	286.00
191	65	9	زبادي دانون 4×100 غرام	باكيت	30.00	23.00	4.000	0.00	0.00	120.00
192	65	7	نسكافيه كلاسيك 200 غرام	عبوة	262.00	208.00	3.000	10.00	0.00	707.40
193	65	30	معجون أسنان سيغنال 120 مل	علبة	55.00	41.00	3.000	0.00	14.00	188.10
194	66	23	بسكويت التمر 12 حبة	باكيت	27.00	19.00	3.000	0.00	0.00	81.00
195	66	3	عصير جهينة برتقال 1 لتر	علبة	50.00	38.00	2.000	0.00	0.00	100.00
196	66	30	معجون أسنان سيغنال 120 مل	علبة	55.00	41.00	2.000	0.00	14.00	125.40
197	67	32	حفاضات بامبرز مقاس 4 (64 قطعة)	عبوة	463.00	378.00	4.000	10.00	14.00	1900.15
198	67	1	بيبسي 1 لتر	زجاجة	32.00	26.00	4.000	0.00	0.00	128.00
199	67	12	زبدة لورباك 200 غرام	علبة	162.00	128.00	4.000	10.00	0.00	583.20
200	68	16	زيت عافية 2.25 لتر	زجاجة	286.00	238.00	1.000	10.00	0.00	257.40
201	69	17	دقيق المطاحن فاخر 1 كيلو	كيس	34.00	27.00	4.000	0.00	0.00	136.00
202	69	14	مكرونة الملكة 400 غرام	كيس	15.00	11.00	4.000	10.00	0.00	54.00
203	69	26	كلور مركز 1 لتر	زجاجة	32.00	24.00	1.000	0.00	14.00	36.48
204	69	31	مناديل فاين 550 منديل	علبة	48.00	36.00	4.000	10.00	0.00	172.80
205	69	24	تايد أصلي 2.5 كيلو	علبة	262.00	208.00	2.000	0.00	14.00	597.36
206	70	2	كوكاكولا 330 مل	علبة	19.00	14.00	3.000	0.00	0.00	57.00
207	70	27	ديتول مطهر 500 مل	زجاجة	84.00	64.00	1.000	0.00	14.00	95.76
208	71	5	ريد بول 250 مل	علبة	75.00	58.00	4.000	10.00	0.00	270.00
209	71	19	صلصة هاينز 300 غرام	عبوة	58.00	44.00	4.000	5.00	0.00	220.40
210	71	14	مكرونة الملكة 400 غرام	كيس	15.00	11.00	4.000	0.00	0.00	60.00
211	71	20	شوكولاتة جالاكسي سادة 36 غرام	قطعة	25.00	17.00	2.000	0.00	0.00	50.00
212	72	5	ريد بول 250 مل	علبة	75.00	58.00	1.000	10.00	0.00	67.50
213	72	21	شيبسي كلاسيك عائلي	كيس	55.00	38.00	3.000	0.00	0.00	165.00
214	72	11	جبنة شرائح كرافت 200 غرام	علبة	96.00	76.00	2.000	5.00	0.00	182.40
215	72	16	زيت عافية 2.25 لتر	زجاجة	286.00	238.00	3.000	0.00	0.00	858.00
216	72	29	شامبو هيد آند شولدرز 400 مل	عبوة	242.00	188.00	4.000	5.00	14.00	1048.34
217	73	32	حفاضات بامبرز مقاس 4 (64 قطعة)	عبوة	463.00	378.00	1.000	10.00	14.00	475.04
218	73	16	زيت عافية 2.25 لتر	زجاجة	286.00	238.00	4.000	10.00	0.00	1029.60
219	73	11	جبنة شرائح كرافت 200 غرام	علبة	96.00	76.00	2.000	0.00	0.00	192.00
220	73	3	عصير جهينة برتقال 1 لتر	علبة	50.00	38.00	4.000	10.00	0.00	180.00
221	73	15	سكر حر 1 كيلو	كيس	47.00	40.00	2.000	10.00	0.00	84.60
222	74	7	نسكافيه كلاسيك 200 غرام	عبوة	262.00	208.00	2.000	0.00	0.00	524.00
223	74	5	ريد بول 250 مل	علبة	75.00	58.00	3.000	0.00	0.00	225.00
224	74	9	زبادي دانون 4×100 غرام	باكيت	30.00	23.00	4.000	0.00	0.00	120.00
225	74	21	شيبسي كلاسيك عائلي	كيس	55.00	38.00	4.000	5.00	0.00	209.00
226	74	8	حليب جهينة كامل الدسم 1 لتر	علبة	53.00	42.00	2.000	0.00	0.00	106.00
227	75	16	زيت عافية 2.25 لتر	زجاجة	286.00	238.00	2.000	0.00	0.00	572.00
228	75	3	عصير جهينة برتقال 1 لتر	علبة	50.00	38.00	4.000	5.00	0.00	190.00
229	75	19	صلصة هاينز 300 غرام	عبوة	58.00	44.00	1.000	0.00	0.00	58.00
230	75	7	نسكافيه كلاسيك 200 غرام	عبوة	262.00	208.00	2.000	0.00	0.00	524.00
231	76	3	عصير جهينة برتقال 1 لتر	علبة	50.00	38.00	2.000	0.00	0.00	100.00
232	76	25	فيري سائل غسيل الأطباق 500 مل	زجاجة	69.00	54.00	3.000	10.00	14.00	212.38
233	76	16	زيت عافية 2.25 لتر	زجاجة	286.00	238.00	3.000	0.00	0.00	858.00
234	76	7	نسكافيه كلاسيك 200 غرام	عبوة	262.00	208.00	2.000	0.00	0.00	524.00
235	77	23	بسكويت التمر 12 حبة	باكيت	27.00	19.00	2.000	0.00	0.00	54.00
236	78	28	صابون لوكس 3 قطع	باكيت	61.00	47.00	2.000	0.00	14.00	139.08
237	79	34	كرواسون بالشوكولاتة	قطعة	18.00	11.00	1.000	0.00	0.00	18.00
238	79	13	أرز الضحى 5 كيلو	كيس	449.00	375.00	4.000	0.00	0.00	1796.00
239	79	20	شوكولاتة جالاكسي سادة 36 غرام	قطعة	25.00	17.00	4.000	10.00	0.00	90.00
240	79	11	جبنة شرائح كرافت 200 غرام	علبة	96.00	76.00	1.000	0.00	0.00	96.00
241	80	31	مناديل فاين 550 منديل	علبة	48.00	36.00	3.000	0.00	0.00	144.00
242	80	11	جبنة شرائح كرافت 200 غرام	علبة	96.00	76.00	2.000	0.00	0.00	192.00
243	80	14	مكرونة الملكة 400 غرام	كيس	15.00	11.00	1.000	0.00	0.00	15.00
244	80	19	صلصة هاينز 300 غرام	عبوة	58.00	44.00	2.000	5.00	0.00	110.20
245	81	4	مياه معدنية دساني 600 مل	زجاجة	10.00	6.50	3.000	0.00	0.00	30.00
246	81	13	أرز الضحى 5 كيلو	كيس	449.00	375.00	2.000	5.00	0.00	853.10
247	81	12	زبدة لورباك 200 غرام	علبة	162.00	128.00	3.000	10.00	0.00	437.40
248	82	28	صابون لوكس 3 قطع	باكيت	61.00	47.00	4.000	0.00	14.00	278.16
249	82	18	عدس أصفر 1 كيلو	كيس	68.00	54.00	1.000	5.00	0.00	64.60
250	82	6	شاي ليبتون 100 كيس	علبة	192.00	155.00	3.000	10.00	0.00	518.40
251	82	26	كلور مركز 1 لتر	زجاجة	32.00	24.00	4.000	0.00	14.00	145.92
252	82	4	مياه معدنية دساني 600 مل	زجاجة	10.00	6.50	2.000	0.00	0.00	20.00
253	83	1	بيبسي 1 لتر	زجاجة	32.00	26.00	2.000	10.00	0.00	57.60
254	83	10	جبنة رومي قديم	كيلو	425.00	360.00	2.500	0.00	0.00	1062.50
255	83	17	دقيق المطاحن فاخر 1 كيلو	كيس	34.00	27.00	2.000	0.00	0.00	68.00
256	83	20	شوكولاتة جالاكسي سادة 36 غرام	قطعة	25.00	17.00	1.000	0.00	0.00	25.00
257	83	22	أوريو أصلي 154 غرام	علبة	40.00	29.00	3.000	0.00	0.00	120.00
258	84	24	تايد أصلي 2.5 كيلو	علبة	262.00	208.00	4.000	0.00	14.00	1194.72
259	84	9	زبادي دانون 4×100 غرام	باكيت	30.00	23.00	4.000	5.00	0.00	114.00
260	84	33	توست ريتش 600 غرام	كيس	40.00	31.00	4.000	10.00	0.00	144.00
261	84	16	زيت عافية 2.25 لتر	زجاجة	286.00	238.00	1.000	10.00	0.00	257.40
262	85	21	شيبسي كلاسيك عائلي	كيس	55.00	38.00	3.000	0.00	0.00	165.00
263	86	3	عصير جهينة برتقال 1 لتر	علبة	50.00	38.00	2.000	0.00	0.00	100.00
264	86	1	بيبسي 1 لتر	زجاجة	32.00	26.00	3.000	0.00	0.00	96.00
265	87	26	كلور مركز 1 لتر	زجاجة	32.00	24.00	1.000	0.00	14.00	36.48
266	87	32	حفاضات بامبرز مقاس 4 (64 قطعة)	عبوة	463.00	378.00	4.000	10.00	14.00	1900.15
267	87	7	نسكافيه كلاسيك 200 غرام	عبوة	262.00	208.00	1.000	5.00	0.00	248.90
268	88	29	شامبو هيد آند شولدرز 400 مل	عبوة	242.00	188.00	2.000	0.00	14.00	551.76
269	89	2	كوكاكولا 330 مل	علبة	19.00	14.00	4.000	0.00	0.00	76.00
270	89	27	ديتول مطهر 500 مل	زجاجة	84.00	64.00	3.000	0.00	14.00	287.28
271	90	2	كوكاكولا 330 مل	علبة	19.00	14.00	1.000	0.00	0.00	19.00
272	91	14	مكرونة الملكة 400 غرام	كيس	15.00	11.00	1.000	0.00	0.00	15.00
273	91	16	زيت عافية 2.25 لتر	زجاجة	286.00	238.00	4.000	5.00	0.00	1086.80
274	91	1	بيبسي 1 لتر	زجاجة	32.00	26.00	4.000	10.00	0.00	115.20
275	91	9	زبادي دانون 4×100 غرام	باكيت	30.00	23.00	1.000	0.00	0.00	30.00
276	91	31	مناديل فاين 550 منديل	علبة	48.00	36.00	1.000	10.00	0.00	43.20
277	92	24	تايد أصلي 2.5 كيلو	علبة	262.00	208.00	4.000	10.00	14.00	1075.25
278	93	21	شيبسي كلاسيك عائلي	كيس	55.00	38.00	3.000	5.00	0.00	156.75
279	93	30	معجون أسنان سيغنال 120 مل	علبة	55.00	41.00	1.000	0.00	14.00	62.70
560	195	1	بيبسي 1 لتر	زجاجة	32.00	26.00	1.000	0.00	0.00	32.00
280	94	25	فيري سائل غسيل الأطباق 500 مل	زجاجة	69.00	54.00	2.000	5.00	14.00	149.45
281	94	15	سكر حر 1 كيلو	كيس	47.00	40.00	3.000	0.00	0.00	141.00
282	95	30	معجون أسنان سيغنال 120 مل	علبة	55.00	41.00	2.000	0.00	14.00	125.40
283	95	16	زيت عافية 2.25 لتر	زجاجة	286.00	238.00	2.000	0.00	0.00	572.00
284	95	6	شاي ليبتون 100 كيس	علبة	192.00	155.00	1.000	10.00	0.00	172.80
285	95	27	ديتول مطهر 500 مل	زجاجة	84.00	64.00	1.000	10.00	14.00	86.18
286	95	1	بيبسي 1 لتر	زجاجة	32.00	26.00	1.000	10.00	0.00	28.80
287	96	31	مناديل فاين 550 منديل	علبة	48.00	36.00	2.000	0.00	0.00	96.00
288	96	5	ريد بول 250 مل	علبة	75.00	58.00	3.000	10.00	0.00	202.50
289	96	30	معجون أسنان سيغنال 120 مل	علبة	55.00	41.00	1.000	0.00	14.00	62.70
290	96	26	كلور مركز 1 لتر	زجاجة	32.00	24.00	4.000	0.00	14.00	145.92
291	97	2	كوكاكولا 330 مل	علبة	19.00	14.00	2.000	0.00	0.00	38.00
292	97	27	ديتول مطهر 500 مل	زجاجة	84.00	64.00	4.000	10.00	14.00	344.74
293	98	16	زيت عافية 2.25 لتر	زجاجة	286.00	238.00	4.000	0.00	0.00	1144.00
294	98	8	حليب جهينة كامل الدسم 1 لتر	علبة	53.00	42.00	2.000	0.00	0.00	106.00
295	99	13	أرز الضحى 5 كيلو	كيس	449.00	375.00	4.000	10.00	0.00	1616.40
296	99	7	نسكافيه كلاسيك 200 غرام	عبوة	262.00	208.00	1.000	0.00	0.00	262.00
297	99	29	شامبو هيد آند شولدرز 400 مل	عبوة	242.00	188.00	2.000	10.00	14.00	496.58
298	99	12	زبدة لورباك 200 غرام	علبة	162.00	128.00	2.000	0.00	0.00	324.00
299	99	34	كرواسون بالشوكولاتة	قطعة	18.00	11.00	3.000	0.00	0.00	54.00
300	100	9	زبادي دانون 4×100 غرام	باكيت	30.00	23.00	4.000	0.00	0.00	120.00
301	101	9	زبادي دانون 4×100 غرام	باكيت	30.00	23.00	3.000	0.00	0.00	90.00
302	102	3	عصير جهينة برتقال 1 لتر	علبة	50.00	38.00	2.000	0.00	0.00	100.00
303	102	6	شاي ليبتون 100 كيس	علبة	192.00	155.00	2.000	10.00	0.00	345.60
304	102	31	مناديل فاين 550 منديل	علبة	48.00	36.00	4.000	10.00	0.00	172.80
305	102	23	بسكويت التمر 12 حبة	باكيت	27.00	19.00	4.000	0.00	0.00	108.00
306	103	14	مكرونة الملكة 400 غرام	كيس	15.00	11.00	4.000	5.00	0.00	57.00
307	103	5	ريد بول 250 مل	علبة	75.00	58.00	3.000	0.00	0.00	225.00
308	104	16	زيت عافية 2.25 لتر	زجاجة	286.00	238.00	3.000	0.00	0.00	858.00
309	104	11	جبنة شرائح كرافت 200 غرام	علبة	96.00	76.00	1.000	0.00	0.00	96.00
310	105	23	بسكويت التمر 12 حبة	باكيت	27.00	19.00	4.000	0.00	0.00	108.00
311	106	16	زيت عافية 2.25 لتر	زجاجة	286.00	238.00	2.000	0.00	0.00	572.00
312	106	20	شوكولاتة جالاكسي سادة 36 غرام	قطعة	25.00	17.00	4.000	0.00	0.00	100.00
313	106	2	كوكاكولا 330 مل	علبة	19.00	14.00	4.000	0.00	0.00	76.00
314	106	12	زبدة لورباك 200 غرام	علبة	162.00	128.00	1.000	0.00	0.00	162.00
315	106	30	معجون أسنان سيغنال 120 مل	علبة	55.00	41.00	1.000	5.00	14.00	59.56
316	107	1	بيبسي 1 لتر	زجاجة	32.00	26.00	4.000	0.00	0.00	128.00
317	107	12	زبدة لورباك 200 غرام	علبة	162.00	128.00	2.000	0.00	0.00	324.00
318	108	25	فيري سائل غسيل الأطباق 500 مل	زجاجة	69.00	54.00	4.000	5.00	14.00	298.91
319	108	26	كلور مركز 1 لتر	زجاجة	32.00	24.00	1.000	0.00	14.00	36.48
320	108	12	زبدة لورباك 200 غرام	علبة	162.00	128.00	3.000	5.00	0.00	461.70
321	108	22	أوريو أصلي 154 غرام	علبة	40.00	29.00	2.000	0.00	0.00	80.00
322	109	17	دقيق المطاحن فاخر 1 كيلو	كيس	34.00	27.00	3.000	10.00	0.00	91.80
323	109	4	مياه معدنية دساني 600 مل	زجاجة	10.00	6.50	3.000	0.00	0.00	30.00
324	110	24	تايد أصلي 2.5 كيلو	علبة	262.00	208.00	2.000	5.00	14.00	567.49
325	111	18	عدس أصفر 1 كيلو	كيس	68.00	54.00	4.000	0.00	0.00	272.00
326	111	15	سكر حر 1 كيلو	كيس	47.00	40.00	4.000	10.00	0.00	169.20
327	111	9	زبادي دانون 4×100 غرام	باكيت	30.00	23.00	4.000	0.00	0.00	120.00
328	111	19	صلصة هاينز 300 غرام	عبوة	58.00	44.00	1.000	0.00	0.00	58.00
329	112	3	عصير جهينة برتقال 1 لتر	علبة	50.00	38.00	3.000	10.00	0.00	135.00
330	112	14	مكرونة الملكة 400 غرام	كيس	15.00	11.00	2.000	10.00	0.00	27.00
331	112	6	شاي ليبتون 100 كيس	علبة	192.00	155.00	3.000	10.00	0.00	518.40
332	112	15	سكر حر 1 كيلو	كيس	47.00	40.00	2.000	0.00	0.00	94.00
333	112	25	فيري سائل غسيل الأطباق 500 مل	زجاجة	69.00	54.00	1.000	0.00	14.00	78.66
334	113	23	بسكويت التمر 12 حبة	باكيت	27.00	19.00	1.000	0.00	0.00	27.00
335	113	30	معجون أسنان سيغنال 120 مل	علبة	55.00	41.00	1.000	5.00	14.00	59.56
336	114	18	عدس أصفر 1 كيلو	كيس	68.00	54.00	2.000	10.00	0.00	122.40
337	115	22	أوريو أصلي 154 غرام	علبة	40.00	29.00	3.000	0.00	0.00	120.00
338	115	2	كوكاكولا 330 مل	علبة	19.00	14.00	2.000	0.00	0.00	38.00
339	116	18	عدس أصفر 1 كيلو	كيس	68.00	54.00	1.000	0.00	0.00	68.00
340	116	1	بيبسي 1 لتر	زجاجة	32.00	26.00	3.000	0.00	0.00	96.00
341	116	12	زبدة لورباك 200 غرام	علبة	162.00	128.00	2.000	0.00	0.00	324.00
342	116	27	ديتول مطهر 500 مل	زجاجة	84.00	64.00	4.000	5.00	14.00	363.89
343	116	28	صابون لوكس 3 قطع	باكيت	61.00	47.00	1.000	0.00	14.00	69.54
344	117	9	زبادي دانون 4×100 غرام	باكيت	30.00	23.00	3.000	0.00	0.00	90.00
345	117	22	أوريو أصلي 154 غرام	علبة	40.00	29.00	4.000	10.00	0.00	144.00
346	118	19	صلصة هاينز 300 غرام	عبوة	58.00	44.00	2.000	0.00	0.00	116.00
347	118	28	صابون لوكس 3 قطع	باكيت	61.00	47.00	4.000	0.00	14.00	278.16
348	119	6	شاي ليبتون 100 كيس	علبة	192.00	155.00	2.000	0.00	0.00	384.00
349	120	1	بيبسي 1 لتر	زجاجة	32.00	26.00	2.000	0.00	0.00	64.00
350	120	8	حليب جهينة كامل الدسم 1 لتر	علبة	53.00	42.00	3.000	5.00	0.00	151.05
351	120	4	مياه معدنية دساني 600 مل	زجاجة	10.00	6.50	1.000	0.00	0.00	10.00
352	120	17	دقيق المطاحن فاخر 1 كيلو	كيس	34.00	27.00	4.000	10.00	0.00	122.40
353	120	21	شيبسي كلاسيك عائلي	كيس	55.00	38.00	3.000	0.00	0.00	165.00
354	121	18	عدس أصفر 1 كيلو	كيس	68.00	54.00	4.000	5.00	0.00	258.40
355	122	17	دقيق المطاحن فاخر 1 كيلو	كيس	34.00	27.00	2.000	0.00	0.00	68.00
356	122	18	عدس أصفر 1 كيلو	كيس	68.00	54.00	3.000	5.00	0.00	193.80
357	122	12	زبدة لورباك 200 غرام	علبة	162.00	128.00	1.000	5.00	0.00	153.90
358	123	29	شامبو هيد آند شولدرز 400 مل	عبوة	242.00	188.00	1.000	10.00	14.00	248.29
359	124	33	توست ريتش 600 غرام	كيس	40.00	31.00	2.000	0.00	0.00	80.00
360	124	19	صلصة هاينز 300 غرام	عبوة	58.00	44.00	1.000	0.00	0.00	58.00
361	125	17	دقيق المطاحن فاخر 1 كيلو	كيس	34.00	27.00	4.000	5.00	0.00	129.20
362	125	16	زيت عافية 2.25 لتر	زجاجة	286.00	238.00	2.000	0.00	0.00	572.00
363	125	15	سكر حر 1 كيلو	كيس	47.00	40.00	3.000	5.00	0.00	133.95
364	125	13	أرز الضحى 5 كيلو	كيس	449.00	375.00	1.000	0.00	0.00	449.00
365	125	34	كرواسون بالشوكولاتة	قطعة	18.00	11.00	2.000	5.00	0.00	34.20
366	126	18	عدس أصفر 1 كيلو	كيس	68.00	54.00	2.000	0.00	0.00	136.00
367	127	23	بسكويت التمر 12 حبة	باكيت	27.00	19.00	2.000	0.00	0.00	54.00
368	127	1	بيبسي 1 لتر	زجاجة	32.00	26.00	4.000	0.00	0.00	128.00
369	127	12	زبدة لورباك 200 غرام	علبة	162.00	128.00	4.000	0.00	0.00	648.00
370	127	11	جبنة شرائح كرافت 200 غرام	علبة	96.00	76.00	3.000	0.00	0.00	288.00
371	128	1	بيبسي 1 لتر	زجاجة	32.00	26.00	3.000	0.00	0.00	96.00
372	128	23	بسكويت التمر 12 حبة	باكيت	27.00	19.00	1.000	0.00	0.00	27.00
373	128	14	مكرونة الملكة 400 غرام	كيس	15.00	11.00	4.000	0.00	0.00	60.00
374	129	6	شاي ليبتون 100 كيس	علبة	192.00	155.00	4.000	0.00	0.00	768.00
375	130	12	زبدة لورباك 200 غرام	علبة	162.00	128.00	4.000	10.00	0.00	583.20
376	130	18	عدس أصفر 1 كيلو	كيس	68.00	54.00	4.000	5.00	0.00	258.40
377	130	15	سكر حر 1 كيلو	كيس	47.00	40.00	3.000	0.00	0.00	141.00
378	130	31	مناديل فاين 550 منديل	علبة	48.00	36.00	1.000	0.00	0.00	48.00
379	130	34	كرواسون بالشوكولاتة	قطعة	18.00	11.00	4.000	0.00	0.00	72.00
380	131	29	شامبو هيد آند شولدرز 400 مل	عبوة	242.00	188.00	1.000	5.00	14.00	262.09
381	132	30	معجون أسنان سيغنال 120 مل	علبة	55.00	41.00	3.000	0.00	14.00	188.10
382	132	17	دقيق المطاحن فاخر 1 كيلو	كيس	34.00	27.00	1.000	10.00	0.00	30.60
383	132	11	جبنة شرائح كرافت 200 غرام	علبة	96.00	76.00	4.000	0.00	0.00	384.00
384	132	18	عدس أصفر 1 كيلو	كيس	68.00	54.00	4.000	0.00	0.00	272.00
385	133	19	صلصة هاينز 300 غرام	عبوة	58.00	44.00	3.000	0.00	0.00	174.00
386	133	8	حليب جهينة كامل الدسم 1 لتر	علبة	53.00	42.00	2.000	10.00	0.00	95.40
387	133	12	زبدة لورباك 200 غرام	علبة	162.00	128.00	4.000	10.00	0.00	583.20
388	133	31	مناديل فاين 550 منديل	علبة	48.00	36.00	3.000	5.00	0.00	136.80
389	133	29	شامبو هيد آند شولدرز 400 مل	عبوة	242.00	188.00	4.000	5.00	14.00	1048.34
390	134	28	صابون لوكس 3 قطع	باكيت	61.00	47.00	1.000	0.00	14.00	69.54
391	135	20	شوكولاتة جالاكسي سادة 36 غرام	قطعة	25.00	17.00	3.000	0.00	0.00	75.00
392	135	7	نسكافيه كلاسيك 200 غرام	عبوة	262.00	208.00	1.000	0.00	0.00	262.00
393	135	14	مكرونة الملكة 400 غرام	كيس	15.00	11.00	1.000	0.00	0.00	15.00
394	135	8	حليب جهينة كامل الدسم 1 لتر	علبة	53.00	42.00	1.000	5.00	0.00	50.35
395	136	25	فيري سائل غسيل الأطباق 500 مل	زجاجة	69.00	54.00	1.000	0.00	14.00	78.66
396	136	12	زبدة لورباك 200 غرام	علبة	162.00	128.00	4.000	0.00	0.00	648.00
397	137	9	زبادي دانون 4×100 غرام	باكيت	30.00	23.00	2.000	0.00	0.00	60.00
398	137	23	بسكويت التمر 12 حبة	باكيت	27.00	19.00	4.000	10.00	0.00	97.20
399	137	15	سكر حر 1 كيلو	كيس	47.00	40.00	2.000	0.00	0.00	94.00
400	138	14	مكرونة الملكة 400 غرام	كيس	15.00	11.00	3.000	10.00	0.00	40.50
401	139	16	زيت عافية 2.25 لتر	زجاجة	286.00	238.00	3.000	0.00	0.00	858.00
402	140	2	كوكاكولا 330 مل	علبة	19.00	14.00	1.000	5.00	0.00	18.05
403	141	27	ديتول مطهر 500 مل	زجاجة	84.00	64.00	4.000	5.00	14.00	363.89
404	141	18	عدس أصفر 1 كيلو	كيس	68.00	54.00	2.000	10.00	0.00	122.40
405	141	3	عصير جهينة برتقال 1 لتر	علبة	50.00	38.00	1.000	0.00	0.00	50.00
406	141	19	صلصة هاينز 300 غرام	عبوة	58.00	44.00	3.000	5.00	0.00	165.30
407	141	8	حليب جهينة كامل الدسم 1 لتر	علبة	53.00	42.00	3.000	0.00	0.00	159.00
408	142	22	أوريو أصلي 154 غرام	علبة	40.00	29.00	4.000	0.00	0.00	160.00
409	142	20	شوكولاتة جالاكسي سادة 36 غرام	قطعة	25.00	17.00	3.000	5.00	0.00	71.25
410	142	28	صابون لوكس 3 قطع	باكيت	61.00	47.00	4.000	0.00	14.00	278.16
411	142	25	فيري سائل غسيل الأطباق 500 مل	زجاجة	69.00	54.00	1.000	0.00	14.00	78.66
412	142	1	بيبسي 1 لتر	زجاجة	32.00	26.00	3.000	0.00	0.00	96.00
413	143	28	صابون لوكس 3 قطع	باكيت	61.00	47.00	4.000	10.00	14.00	250.34
414	144	21	شيبسي كلاسيك عائلي	كيس	55.00	38.00	1.000	0.00	0.00	55.00
415	145	14	مكرونة الملكة 400 غرام	كيس	15.00	11.00	2.000	0.00	0.00	30.00
416	145	18	عدس أصفر 1 كيلو	كيس	68.00	54.00	3.000	5.00	0.00	193.80
417	146	30	معجون أسنان سيغنال 120 مل	علبة	55.00	41.00	4.000	5.00	14.00	238.26
418	146	14	مكرونة الملكة 400 غرام	كيس	15.00	11.00	3.000	5.00	0.00	42.75
419	147	23	بسكويت التمر 12 حبة	باكيت	27.00	19.00	3.000	10.00	0.00	72.90
420	148	3	عصير جهينة برتقال 1 لتر	علبة	50.00	38.00	2.000	0.00	0.00	100.00
421	148	27	ديتول مطهر 500 مل	زجاجة	84.00	64.00	1.000	0.00	14.00	95.76
422	149	17	دقيق المطاحن فاخر 1 كيلو	كيس	34.00	27.00	4.000	0.00	0.00	136.00
423	150	7	نسكافيه كلاسيك 200 غرام	عبوة	262.00	208.00	1.000	5.00	0.00	248.90
424	150	12	زبدة لورباك 200 غرام	علبة	162.00	128.00	3.000	0.00	0.00	486.00
425	150	14	مكرونة الملكة 400 غرام	كيس	15.00	11.00	4.000	10.00	0.00	54.00
426	150	15	سكر حر 1 كيلو	كيس	47.00	40.00	4.000	10.00	0.00	169.20
427	150	17	دقيق المطاحن فاخر 1 كيلو	كيس	34.00	27.00	3.000	0.00	0.00	102.00
428	151	20	شوكولاتة جالاكسي سادة 36 غرام	قطعة	25.00	17.00	2.000	10.00	0.00	45.00
429	151	17	دقيق المطاحن فاخر 1 كيلو	كيس	34.00	27.00	1.000	5.00	0.00	32.30
430	151	22	أوريو أصلي 154 غرام	علبة	40.00	29.00	4.000	0.00	0.00	160.00
431	151	13	أرز الضحى 5 كيلو	كيس	449.00	375.00	2.000	0.00	0.00	898.00
432	151	27	ديتول مطهر 500 مل	زجاجة	84.00	64.00	4.000	0.00	14.00	383.04
433	152	18	عدس أصفر 1 كيلو	كيس	68.00	54.00	1.000	0.00	0.00	68.00
434	152	14	مكرونة الملكة 400 غرام	كيس	15.00	11.00	4.000	0.00	0.00	60.00
435	153	18	عدس أصفر 1 كيلو	كيس	68.00	54.00	1.000	0.00	0.00	68.00
436	153	24	تايد أصلي 2.5 كيلو	علبة	262.00	208.00	4.000	0.00	14.00	1194.72
437	153	2	كوكاكولا 330 مل	علبة	19.00	14.00	1.000	0.00	0.00	19.00
438	153	33	توست ريتش 600 غرام	كيس	40.00	31.00	1.000	0.00	0.00	40.00
439	153	15	سكر حر 1 كيلو	كيس	47.00	40.00	1.000	10.00	0.00	42.30
440	154	23	بسكويت التمر 12 حبة	باكيت	27.00	19.00	1.000	10.00	0.00	24.30
441	155	20	شوكولاتة جالاكسي سادة 36 غرام	قطعة	25.00	17.00	4.000	0.00	0.00	100.00
442	155	29	شامبو هيد آند شولدرز 400 مل	عبوة	242.00	188.00	1.000	5.00	14.00	262.09
443	155	27	ديتول مطهر 500 مل	زجاجة	84.00	64.00	4.000	0.00	14.00	383.04
444	155	8	حليب جهينة كامل الدسم 1 لتر	علبة	53.00	42.00	2.000	0.00	0.00	106.00
445	155	4	مياه معدنية دساني 600 مل	زجاجة	10.00	6.50	2.000	0.00	0.00	20.00
446	156	14	مكرونة الملكة 400 غرام	كيس	15.00	11.00	4.000	5.00	0.00	57.00
447	156	31	مناديل فاين 550 منديل	علبة	48.00	36.00	4.000	5.00	0.00	182.40
448	157	17	دقيق المطاحن فاخر 1 كيلو	كيس	34.00	27.00	2.000	0.00	0.00	68.00
449	158	24	تايد أصلي 2.5 كيلو	علبة	262.00	208.00	3.000	10.00	14.00	806.44
450	158	10	جبنة رومي قديم	كيلو	425.00	360.00	1.500	5.00	0.00	605.63
451	158	20	شوكولاتة جالاكسي سادة 36 غرام	قطعة	25.00	17.00	3.000	0.00	0.00	75.00
452	158	29	شامبو هيد آند شولدرز 400 مل	عبوة	242.00	188.00	4.000	0.00	14.00	1103.52
453	159	6	شاي ليبتون 100 كيس	علبة	192.00	155.00	3.000	0.00	0.00	576.00
454	160	15	سكر حر 1 كيلو	كيس	47.00	40.00	2.000	0.00	0.00	94.00
455	161	2	كوكاكولا 330 مل	علبة	19.00	14.00	3.000	5.00	0.00	54.15
456	162	24	تايد أصلي 2.5 كيلو	علبة	262.00	208.00	2.000	5.00	14.00	567.49
457	162	33	توست ريتش 600 غرام	كيس	40.00	31.00	4.000	5.00	0.00	152.00
458	162	32	حفاضات بامبرز مقاس 4 (64 قطعة)	عبوة	463.00	378.00	4.000	5.00	14.00	2005.72
459	163	6	شاي ليبتون 100 كيس	علبة	192.00	155.00	4.000	0.00	0.00	768.00
460	163	15	سكر حر 1 كيلو	كيس	47.00	40.00	1.000	5.00	0.00	44.65
461	163	4	مياه معدنية دساني 600 مل	زجاجة	10.00	6.50	4.000	0.00	0.00	40.00
462	163	12	زبدة لورباك 200 غرام	علبة	162.00	128.00	2.000	5.00	0.00	307.80
463	163	31	مناديل فاين 550 منديل	علبة	48.00	36.00	4.000	0.00	0.00	192.00
464	164	26	كلور مركز 1 لتر	زجاجة	32.00	24.00	1.000	5.00	14.00	34.66
465	164	27	ديتول مطهر 500 مل	زجاجة	84.00	64.00	4.000	0.00	14.00	383.04
466	164	9	زبادي دانون 4×100 غرام	باكيت	30.00	23.00	2.000	0.00	0.00	60.00
467	164	1	بيبسي 1 لتر	زجاجة	32.00	26.00	3.000	0.00	0.00	96.00
468	165	22	أوريو أصلي 154 غرام	علبة	40.00	29.00	1.000	5.00	0.00	38.00
469	165	5	ريد بول 250 مل	علبة	75.00	58.00	3.000	0.00	0.00	225.00
470	166	17	دقيق المطاحن فاخر 1 كيلو	كيس	34.00	27.00	1.000	0.00	0.00	34.00
471	166	3	عصير جهينة برتقال 1 لتر	علبة	50.00	38.00	1.000	0.00	0.00	50.00
472	166	11	جبنة شرائح كرافت 200 غرام	علبة	96.00	76.00	3.000	0.00	0.00	288.00
473	166	23	بسكويت التمر 12 حبة	باكيت	27.00	19.00	2.000	0.00	0.00	54.00
474	166	27	ديتول مطهر 500 مل	زجاجة	84.00	64.00	1.000	0.00	14.00	95.76
475	167	14	مكرونة الملكة 400 غرام	كيس	15.00	11.00	1.000	10.00	0.00	13.50
476	168	4	مياه معدنية دساني 600 مل	زجاجة	10.00	6.50	2.000	0.00	0.00	20.00
477	168	29	شامبو هيد آند شولدرز 400 مل	عبوة	242.00	188.00	3.000	5.00	14.00	786.26
478	168	24	تايد أصلي 2.5 كيلو	علبة	262.00	208.00	3.000	0.00	14.00	896.04
479	168	25	فيري سائل غسيل الأطباق 500 مل	زجاجة	69.00	54.00	1.000	0.00	14.00	78.66
480	168	8	حليب جهينة كامل الدسم 1 لتر	علبة	53.00	42.00	3.000	5.00	0.00	151.05
481	169	3	عصير جهينة برتقال 1 لتر	علبة	50.00	38.00	4.000	0.00	0.00	200.00
482	170	32	حفاضات بامبرز مقاس 4 (64 قطعة)	عبوة	463.00	378.00	1.000	5.00	14.00	501.43
483	170	13	أرز الضحى 5 كيلو	كيس	449.00	375.00	4.000	0.00	0.00	1796.00
484	170	2	كوكاكولا 330 مل	علبة	19.00	14.00	4.000	0.00	0.00	76.00
485	171	34	كرواسون بالشوكولاتة	قطعة	18.00	11.00	1.000	0.00	0.00	18.00
486	171	20	شوكولاتة جالاكسي سادة 36 غرام	قطعة	25.00	17.00	4.000	0.00	0.00	100.00
487	171	21	شيبسي كلاسيك عائلي	كيس	55.00	38.00	3.000	10.00	0.00	148.50
488	172	7	نسكافيه كلاسيك 200 غرام	عبوة	262.00	208.00	4.000	0.00	0.00	1048.00
489	172	4	مياه معدنية دساني 600 مل	زجاجة	10.00	6.50	1.000	5.00	0.00	9.50
490	173	19	صلصة هاينز 300 غرام	عبوة	58.00	44.00	4.000	5.00	0.00	220.40
491	173	15	سكر حر 1 كيلو	كيس	47.00	40.00	2.000	0.00	0.00	94.00
492	174	19	صلصة هاينز 300 غرام	عبوة	58.00	44.00	4.000	0.00	0.00	232.00
493	175	23	بسكويت التمر 12 حبة	باكيت	27.00	19.00	2.000	5.00	0.00	51.30
494	176	13	أرز الضحى 5 كيلو	كيس	449.00	375.00	4.000	0.00	0.00	1796.00
495	176	17	دقيق المطاحن فاخر 1 كيلو	كيس	34.00	27.00	3.000	5.00	0.00	96.90
496	176	19	صلصة هاينز 300 غرام	عبوة	58.00	44.00	2.000	10.00	0.00	104.40
497	176	25	فيري سائل غسيل الأطباق 500 مل	زجاجة	69.00	54.00	2.000	0.00	14.00	157.32
498	176	3	عصير جهينة برتقال 1 لتر	علبة	50.00	38.00	4.000	0.00	0.00	200.00
499	177	12	زبدة لورباك 200 غرام	علبة	162.00	128.00	3.000	5.00	0.00	461.70
500	177	19	صلصة هاينز 300 غرام	عبوة	58.00	44.00	1.000	5.00	0.00	55.10
501	177	11	جبنة شرائح كرافت 200 غرام	علبة	96.00	76.00	2.000	0.00	0.00	192.00
502	178	30	معجون أسنان سيغنال 120 مل	علبة	55.00	41.00	3.000	10.00	14.00	169.29
503	178	33	توست ريتش 600 غرام	كيس	40.00	31.00	4.000	5.00	0.00	152.00
504	178	8	حليب جهينة كامل الدسم 1 لتر	علبة	53.00	42.00	1.000	10.00	0.00	47.70
505	179	16	زيت عافية 2.25 لتر	زجاجة	286.00	238.00	3.000	0.00	0.00	858.00
506	179	23	بسكويت التمر 12 حبة	باكيت	27.00	19.00	1.000	0.00	0.00	27.00
507	179	28	صابون لوكس 3 قطع	باكيت	61.00	47.00	3.000	5.00	14.00	198.19
508	179	6	شاي ليبتون 100 كيس	علبة	192.00	155.00	1.000	10.00	0.00	172.80
509	179	26	كلور مركز 1 لتر	زجاجة	32.00	24.00	4.000	10.00	14.00	131.33
510	180	28	صابون لوكس 3 قطع	باكيت	61.00	47.00	1.000	0.00	14.00	69.54
511	180	34	كرواسون بالشوكولاتة	قطعة	18.00	11.00	3.000	0.00	0.00	54.00
512	180	21	شيبسي كلاسيك عائلي	كيس	55.00	38.00	3.000	0.00	0.00	165.00
513	180	33	توست ريتش 600 غرام	كيس	40.00	31.00	2.000	0.00	0.00	80.00
514	180	29	شامبو هيد آند شولدرز 400 مل	عبوة	242.00	188.00	3.000	10.00	14.00	744.88
515	181	15	سكر حر 1 كيلو	كيس	47.00	40.00	2.000	0.00	0.00	94.00
516	181	22	أوريو أصلي 154 غرام	علبة	40.00	29.00	3.000	5.00	0.00	114.00
517	181	4	مياه معدنية دساني 600 مل	زجاجة	10.00	6.50	4.000	0.00	0.00	40.00
518	181	6	شاي ليبتون 100 كيس	علبة	192.00	155.00	2.000	5.00	0.00	364.80
519	181	16	زيت عافية 2.25 لتر	زجاجة	286.00	238.00	3.000	0.00	0.00	858.00
520	182	6	شاي ليبتون 100 كيس	علبة	192.00	155.00	2.000	0.00	0.00	384.00
521	183	13	أرز الضحى 5 كيلو	كيس	449.00	375.00	2.000	10.00	0.00	808.20
522	184	17	دقيق المطاحن فاخر 1 كيلو	كيس	34.00	27.00	3.000	5.00	0.00	96.90
523	184	3	عصير جهينة برتقال 1 لتر	علبة	50.00	38.00	3.000	0.00	0.00	150.00
524	185	26	كلور مركز 1 لتر	زجاجة	32.00	24.00	3.000	0.00	14.00	109.44
525	185	18	عدس أصفر 1 كيلو	كيس	68.00	54.00	2.000	0.00	0.00	136.00
526	185	8	حليب جهينة كامل الدسم 1 لتر	علبة	53.00	42.00	3.000	5.00	0.00	151.05
527	185	22	أوريو أصلي 154 غرام	علبة	40.00	29.00	1.000	0.00	0.00	40.00
528	185	19	صلصة هاينز 300 غرام	عبوة	58.00	44.00	1.000	0.00	0.00	58.00
529	186	19	صلصة هاينز 300 غرام	عبوة	58.00	44.00	3.000	0.00	0.00	174.00
530	186	28	صابون لوكس 3 قطع	باكيت	61.00	47.00	4.000	10.00	14.00	250.34
531	187	14	مكرونة الملكة 400 غرام	كيس	15.00	11.00	2.000	0.00	0.00	30.00
532	187	19	صلصة هاينز 300 غرام	عبوة	58.00	44.00	3.000	0.00	0.00	174.00
533	188	27	ديتول مطهر 500 مل	زجاجة	84.00	64.00	2.000	0.00	14.00	191.52
534	188	11	جبنة شرائح كرافت 200 غرام	علبة	96.00	76.00	3.000	5.00	0.00	273.60
535	188	10	جبنة رومي قديم	كيلو	425.00	360.00	2.500	0.00	0.00	1062.50
536	188	21	شيبسي كلاسيك عائلي	كيس	55.00	38.00	4.000	0.00	0.00	220.00
537	189	27	ديتول مطهر 500 مل	زجاجة	84.00	64.00	4.000	0.00	14.00	383.04
538	189	23	بسكويت التمر 12 حبة	باكيت	27.00	19.00	2.000	0.00	0.00	54.00
539	190	2	كوكاكولا 330 مل	علبة	19.00	14.00	2.000	10.00	0.00	34.20
540	190	16	زيت عافية 2.25 لتر	زجاجة	286.00	238.00	2.000	0.00	0.00	572.00
541	190	33	توست ريتش 600 غرام	كيس	40.00	31.00	4.000	0.00	0.00	160.00
542	190	6	شاي ليبتون 100 كيس	علبة	192.00	155.00	3.000	0.00	0.00	576.00
543	190	32	حفاضات بامبرز مقاس 4 (64 قطعة)	عبوة	463.00	378.00	1.000	10.00	14.00	475.04
544	191	25	فيري سائل غسيل الأطباق 500 مل	زجاجة	69.00	54.00	3.000	0.00	14.00	235.98
545	191	5	ريد بول 250 مل	علبة	75.00	58.00	1.000	5.00	0.00	71.25
546	192	26	كلور مركز 1 لتر	زجاجة	32.00	24.00	2.000	0.00	14.00	72.96
547	192	23	بسكويت التمر 12 حبة	باكيت	27.00	19.00	1.000	0.00	0.00	27.00
548	192	30	معجون أسنان سيغنال 120 مل	علبة	55.00	41.00	3.000	10.00	14.00	169.29
549	193	12	زبدة لورباك 200 غرام	علبة	162.00	128.00	4.000	0.00	0.00	648.00
550	193	28	صابون لوكس 3 قطع	باكيت	61.00	47.00	3.000	0.00	14.00	208.62
551	193	34	كرواسون بالشوكولاتة	قطعة	18.00	11.00	1.000	5.00	0.00	17.10
552	193	1	بيبسي 1 لتر	زجاجة	32.00	26.00	1.000	0.00	0.00	32.00
553	193	27	ديتول مطهر 500 مل	زجاجة	84.00	64.00	1.000	0.00	14.00	95.76
554	194	29	شامبو هيد آند شولدرز 400 مل	عبوة	242.00	188.00	1.000	0.00	14.00	275.88
555	194	25	فيري سائل غسيل الأطباق 500 مل	زجاجة	69.00	54.00	4.000	0.00	14.00	314.64
556	194	5	ريد بول 250 مل	علبة	75.00	58.00	2.000	0.00	0.00	150.00
557	195	22	أوريو أصلي 154 غرام	علبة	40.00	29.00	1.000	0.00	0.00	40.00
558	195	25	فيري سائل غسيل الأطباق 500 مل	زجاجة	69.00	54.00	1.000	0.00	14.00	78.66
559	195	33	توست ريتش 600 غرام	كيس	40.00	31.00	4.000	10.00	0.00	144.00
561	195	16	زيت عافية 2.25 لتر	زجاجة	286.00	238.00	2.000	0.00	0.00	572.00
562	196	23	بسكويت التمر 12 حبة	باكيت	27.00	19.00	2.000	10.00	0.00	48.60
563	196	21	شيبسي كلاسيك عائلي	كيس	55.00	38.00	4.000	10.00	0.00	198.00
564	196	17	دقيق المطاحن فاخر 1 كيلو	كيس	34.00	27.00	3.000	0.00	0.00	102.00
565	196	33	توست ريتش 600 غرام	كيس	40.00	31.00	3.000	0.00	0.00	120.00
566	196	7	نسكافيه كلاسيك 200 غرام	عبوة	262.00	208.00	4.000	10.00	0.00	943.20
567	197	12	زبدة لورباك 200 غرام	علبة	162.00	128.00	1.000	0.00	0.00	162.00
568	197	2	كوكاكولا 330 مل	علبة	19.00	14.00	1.000	0.00	0.00	19.00
569	197	6	شاي ليبتون 100 كيس	علبة	192.00	155.00	2.000	0.00	0.00	384.00
570	197	3	عصير جهينة برتقال 1 لتر	علبة	50.00	38.00	2.000	10.00	0.00	90.00
571	197	1	بيبسي 1 لتر	زجاجة	32.00	26.00	1.000	0.00	0.00	32.00
572	198	13	أرز الضحى 5 كيلو	كيس	449.00	375.00	2.000	0.00	0.00	898.00
573	199	10	جبنة رومي قديم	كيلو	425.00	360.00	3.500	10.00	0.00	1338.75
574	199	16	زيت عافية 2.25 لتر	زجاجة	286.00	238.00	3.000	5.00	0.00	815.10
575	199	2	كوكاكولا 330 مل	علبة	19.00	14.00	2.000	10.00	0.00	34.20
576	199	9	زبادي دانون 4×100 غرام	باكيت	30.00	23.00	3.000	5.00	0.00	85.50
577	200	33	توست ريتش 600 غرام	كيس	40.00	31.00	1.000	0.00	0.00	40.00
578	200	32	حفاضات بامبرز مقاس 4 (64 قطعة)	عبوة	463.00	378.00	4.000	10.00	14.00	1900.15
579	200	8	حليب جهينة كامل الدسم 1 لتر	علبة	53.00	42.00	4.000	0.00	0.00	212.00
580	200	30	معجون أسنان سيغنال 120 مل	علبة	55.00	41.00	2.000	0.00	14.00	125.40
581	200	19	صلصة هاينز 300 غرام	عبوة	58.00	44.00	1.000	0.00	0.00	58.00
582	201	34	كرواسون بالشوكولاتة	قطعة	18.00	11.00	1.000	0.00	0.00	18.00
583	201	15	سكر حر 1 كيلو	كيس	47.00	40.00	4.000	10.00	0.00	169.20
584	201	20	شوكولاتة جالاكسي سادة 36 غرام	قطعة	25.00	17.00	2.000	10.00	0.00	45.00
585	201	11	جبنة شرائح كرافت 200 غرام	علبة	96.00	76.00	2.000	0.00	0.00	192.00
586	201	5	ريد بول 250 مل	علبة	75.00	58.00	1.000	0.00	0.00	75.00
587	202	30	معجون أسنان سيغنال 120 مل	علبة	55.00	41.00	2.000	0.00	14.00	125.40
588	203	34	كرواسون بالشوكولاتة	قطعة	18.00	11.00	2.000	5.00	0.00	34.20
589	203	13	أرز الضحى 5 كيلو	كيس	449.00	375.00	2.000	0.00	0.00	898.00
590	203	2	كوكاكولا 330 مل	علبة	19.00	14.00	2.000	0.00	0.00	38.00
591	203	8	حليب جهينة كامل الدسم 1 لتر	علبة	53.00	42.00	2.000	0.00	0.00	106.00
592	203	28	صابون لوكس 3 قطع	باكيت	61.00	47.00	2.000	0.00	14.00	139.08
593	204	2	كوكاكولا 330 مل	علبة	19.00	14.00	4.000	0.00	0.00	76.00
594	204	28	صابون لوكس 3 قطع	باكيت	61.00	47.00	2.000	10.00	14.00	125.17
595	204	16	زيت عافية 2.25 لتر	زجاجة	286.00	238.00	4.000	0.00	0.00	1144.00
596	204	3	عصير جهينة برتقال 1 لتر	علبة	50.00	38.00	2.000	10.00	0.00	90.00
597	204	13	أرز الضحى 5 كيلو	كيس	449.00	375.00	3.000	0.00	0.00	1347.00
598	205	12	زبدة لورباك 200 غرام	علبة	162.00	128.00	2.000	10.00	0.00	291.60
599	206	24	تايد أصلي 2.5 كيلو	علبة	262.00	208.00	4.000	0.00	14.00	1194.72
600	206	18	عدس أصفر 1 كيلو	كيس	68.00	54.00	4.000	5.00	0.00	258.40
601	207	29	شامبو هيد آند شولدرز 400 مل	عبوة	242.00	188.00	3.000	0.00	14.00	827.64
602	207	3	عصير جهينة برتقال 1 لتر	علبة	50.00	38.00	3.000	5.00	0.00	142.50
603	207	34	كرواسون بالشوكولاتة	قطعة	18.00	11.00	1.000	0.00	0.00	18.00
604	208	12	زبدة لورباك 200 غرام	علبة	162.00	128.00	4.000	0.00	0.00	648.00
605	208	15	سكر حر 1 كيلو	كيس	47.00	40.00	1.000	0.00	0.00	47.00
606	208	9	زبادي دانون 4×100 غرام	باكيت	30.00	23.00	4.000	0.00	0.00	120.00
607	208	31	مناديل فاين 550 منديل	علبة	48.00	36.00	3.000	10.00	0.00	129.60
608	208	22	أوريو أصلي 154 غرام	علبة	40.00	29.00	4.000	5.00	0.00	152.00
609	209	31	مناديل فاين 550 منديل	علبة	48.00	36.00	1.000	0.00	0.00	48.00
610	209	3	عصير جهينة برتقال 1 لتر	علبة	50.00	38.00	4.000	10.00	0.00	180.00
611	210	1	بيبسي 1 لتر	زجاجة	32.00	26.00	3.000	10.00	0.00	86.40
612	210	13	أرز الضحى 5 كيلو	كيس	449.00	375.00	1.000	0.00	0.00	449.00
613	210	24	تايد أصلي 2.5 كيلو	علبة	262.00	208.00	3.000	10.00	14.00	806.44
614	211	22	أوريو أصلي 154 غرام	علبة	40.00	29.00	2.000	5.00	0.00	76.00
615	211	17	دقيق المطاحن فاخر 1 كيلو	كيس	34.00	27.00	2.000	0.00	0.00	68.00
616	211	5	ريد بول 250 مل	علبة	75.00	58.00	3.000	0.00	0.00	225.00
617	211	32	حفاضات بامبرز مقاس 4 (64 قطعة)	عبوة	463.00	378.00	2.000	5.00	14.00	1002.86
618	212	1	بيبسي 1 لتر	زجاجة	32.00	26.00	2.000	0.00	0.00	64.00
619	212	8	حليب جهينة كامل الدسم 1 لتر	علبة	53.00	42.00	1.000	0.00	0.00	53.00
\.


--
-- Data for Name: invoices; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.invoices (id, customer_id, user_id, status, payment_method, subtotal, discount, tax, total, paid, change_amount, notes, due_date, suspended_label, created_at) FROM stdin;
2	\N	3	completed	card	774.00	11.30	0.00	762.70	762.70	0.00	\N	\N	\N	2026-08-15 10:21:18+00
4	\N	1	completed	card	392.00	0.00	0.00	392.00	392.00	0.00	\N	\N	\N	2026-08-15 20:33:11+00
5	\N	1	completed	cash	1282.50	82.90	24.34	1223.94	1223.94	6.06	\N	\N	\N	2026-08-16 16:59:12+00
6	\N	3	completed	card	532.00	7.50	36.68	561.18	561.18	0.00	\N	\N	\N	2026-08-16 20:09:59+00
7	\N	1	completed	card	1672.50	11.50	0.00	1661.00	1661.00	0.00	\N	\N	\N	2026-08-16 09:50:01+00
8	\N	3	completed	cash	206.00	3.40	0.00	202.60	202.60	7.40	\N	\N	\N	2026-08-16 12:04:38+00
9	\N	2	completed	card	1955.50	25.40	49.64	1979.74	1979.74	0.00	\N	\N	\N	2026-08-16 21:03:35+00
11	\N	1	completed	card	54.00	0.00	0.00	54.00	54.00	0.00	\N	\N	\N	2026-08-17 12:22:40+00
12	\N	3	completed	card	122.00	0.00	17.08	139.08	139.08	0.00	\N	\N	\N	2026-08-17 12:25:09+00
13	\N	3	completed	cash	2472.00	185.20	270.03	2556.83	2556.83	3.17	\N	\N	\N	2026-08-17 12:02:54+00
14	\N	3	completed	bank	1501.00	114.40	132.05	1518.65	1518.65	0.00	\N	\N	\N	2026-08-17 13:47:30+00
15	\N	3	completed	cash	937.50	63.75	0.00	873.75	873.75	6.25	\N	\N	\N	2026-08-18 15:02:19+00
16	\N	3	completed	bank	786.00	37.40	0.00	748.60	748.60	0.00	\N	\N	\N	2026-08-18 13:54:33+00
17	\N	2	completed	cash	998.00	3.00	135.52	1130.52	1130.52	9.48	\N	\N	\N	2026-08-18 20:03:45+00
18	\N	1	completed	bank	1208.00	6.40	0.00	1201.60	1201.60	0.00	\N	\N	\N	2026-08-18 17:09:18+00
19	\N	3	completed	cash	325.00	31.25	0.00	293.75	293.75	6.25	\N	\N	\N	2026-08-18 20:40:12+00
20	\N	1	completed	card	1288.00	59.60	139.38	1367.78	1367.78	0.00	\N	\N	\N	2026-08-18 09:36:29+00
21	\N	2	completed	cash	128.00	0.00	0.00	128.00	128.00	2.00	\N	\N	\N	2026-08-19 20:19:49+00
22	\N	3	completed	cash	1080.00	52.40	4.48	1032.08	1032.08	7.92	\N	\N	\N	2026-08-19 12:22:02+00
24	\N	2	completed	bank	423.00	15.15	27.53	435.38	435.38	0.00	\N	\N	\N	2026-08-19 20:06:58+00
25	\N	3	completed	card	300.00	30.00	0.00	270.00	270.00	0.00	\N	\N	\N	2026-08-19 19:07:29+00
26	\N	2	completed	cash	581.00	0.00	0.00	581.00	581.00	9.00	\N	\N	\N	2026-08-20 12:25:49+00
27	\N	1	completed	card	937.00	8.25	0.00	928.75	928.75	0.00	\N	\N	\N	2026-08-20 20:23:38+00
28	\N	2	completed	cash	2938.50	53.13	73.36	2958.74	2958.74	1.26	\N	\N	\N	2026-08-20 14:04:18+00
29	\N	1	completed	cash	716.00	24.10	64.11	756.01	756.01	3.99	\N	\N	\N	2026-08-20 13:05:20+00
30	\N	3	completed	cash	1282.50	22.00	0.00	1260.50	1260.50	9.50	\N	\N	\N	2026-08-21 17:51:29+00
31	\N	1	completed	cash	1294.00	9.60	0.00	1284.40	1284.40	5.60	\N	\N	\N	2026-08-21 15:00:22+00
32	\N	1	completed	cash	796.00	7.40	0.00	788.60	788.60	1.40	\N	\N	\N	2026-08-21 13:50:19+00
33	\N	2	completed	cash	2635.00	28.80	284.48	2890.68	2890.68	9.32	\N	\N	\N	2026-08-21 17:28:58+00
34	\N	2	completed	cash	2221.00	8.25	259.28	2472.03	2472.03	7.97	\N	\N	\N	2026-08-21 14:14:50+00
35	\N	3	completed	cash	1227.50	0.90	0.00	1226.60	1226.60	3.40	\N	\N	\N	2026-08-21 15:25:12+00
36	\N	1	completed	card	661.00	0.00	0.00	661.00	661.00	0.00	\N	\N	\N	2026-08-22 21:09:57+00
37	\N	2	completed	cash	68.00	6.80	0.00	61.20	61.20	8.80	\N	\N	\N	2026-08-22 11:40:38+00
38	\N	1	completed	card	2121.00	202.15	233.35	2152.20	2152.20	0.00	\N	\N	\N	2026-08-22 15:12:26+00
40	\N	3	completed	cash	486.00	24.30	0.00	461.70	461.70	8.30	\N	\N	\N	2026-08-23 11:03:24+00
42	\N	1	completed	cash	682.00	24.40	30.74	688.34	688.34	1.66	\N	\N	\N	2026-08-23 15:41:04+00
43	\N	2	completed	card	34.00	0.00	0.00	34.00	34.00	0.00	\N	\N	\N	2026-08-23 09:35:35+00
44	\N	3	completed	cash	813.00	0.90	0.00	812.10	812.10	7.90	\N	\N	\N	2026-08-23 11:27:03+00
45	\N	2	completed	card	758.00	31.30	32.19	758.89	758.89	0.00	\N	\N	\N	2026-08-23 10:22:29+00
46	\N	2	completed	card	282.00	6.50	0.00	275.50	275.50	0.00	\N	\N	\N	2026-08-24 11:22:10+00
47	\N	1	completed	card	1563.00	120.15	0.00	1442.85	1442.85	0.00	\N	\N	\N	2026-08-24 18:14:18+00
48	\N	2	completed	bank	2504.00	0.00	11.76	2515.76	2515.76	0.00	\N	\N	\N	2026-08-24 11:19:00+00
49	\N	1	completed	cash	3339.50	92.60	246.32	3493.22	3493.22	6.78	\N	\N	\N	2026-08-24 12:42:50+00
50	\N	1	completed	cash	324.00	16.20	0.00	307.80	307.80	2.20	\N	\N	\N	2026-08-24 11:09:59+00
51	\N	3	completed	cash	384.00	19.20	0.00	364.80	364.80	5.20	\N	\N	\N	2026-08-24 18:00:34+00
52	\N	2	completed	cash	30.00	0.00	0.00	30.00	30.00	0.00	\N	\N	\N	2026-08-25 21:54:36+00
53	\N	3	completed	card	2087.50	112.15	190.62	2165.97	2165.97	0.00	\N	\N	\N	2026-08-25 13:21:40+00
54	\N	3	completed	card	1349.00	19.20	146.72	1476.52	1476.52	0.00	\N	\N	\N	2026-08-25 19:06:54+00
55	\N	3	completed	cash	68.00	6.80	0.00	61.20	61.20	8.80	\N	\N	\N	2026-08-25 11:19:21+00
56	\N	2	completed	cash	333.00	0.00	0.00	333.00	333.00	7.00	\N	\N	\N	2026-08-25 10:04:05+00
57	\N	2	completed	cash	194.00	10.60	0.00	183.40	183.40	6.60	\N	\N	\N	2026-08-25 16:50:55+00
58	\N	3	completed	cash	1181.00	12.80	28.98	1197.18	1197.18	2.82	\N	\N	\N	2026-08-25 12:51:04+00
59	\N	2	completed	card	908.00	0.00	17.08	925.08	925.08	0.00	\N	\N	\N	2026-08-26 14:59:09+00
60	\N	2	completed	card	778.00	1.60	0.00	776.40	776.40	0.00	\N	\N	\N	2026-08-26 15:04:02+00
61	\N	1	completed	cash	58.00	0.00	0.00	58.00	58.00	2.00	\N	\N	\N	2026-08-26 19:53:50+00
62	\N	3	completed	card	144.00	5.20	0.00	138.80	138.80	0.00	\N	\N	\N	2026-08-26 14:18:00+00
63	\N	1	completed	bank	663.00	6.10	7.69	664.59	664.59	0.00	\N	\N	\N	2026-08-26 17:08:37+00
64	\N	3	completed	bank	1852.00	0.00	259.28	2111.28	2111.28	0.00	\N	\N	\N	2026-08-26 16:00:44+00
65	\N	3	completed	bank	2083.00	78.60	124.74	2129.14	2129.14	0.00	\N	\N	\N	2026-08-27 16:24:19+00
66	\N	3	completed	cash	291.00	0.00	15.40	306.40	306.40	3.60	\N	\N	\N	2026-08-27 18:11:20+00
67	\N	2	completed	card	2628.00	250.00	233.35	2611.35	2611.35	0.00	\N	\N	\N	2026-08-27 17:30:23+00
68	\N	3	completed	cash	286.00	28.60	0.00	257.40	257.40	2.60	\N	\N	\N	2026-08-27 11:19:13+00
69	\N	2	completed	cash	944.00	25.20	77.84	996.64	996.64	3.36	\N	\N	\N	2026-08-28 18:02:49+00
70	\N	3	completed	card	141.00	0.00	11.76	152.76	152.76	0.00	\N	\N	\N	2026-08-28 20:01:42+00
71	\N	2	completed	cash	642.00	41.60	0.00	600.40	600.40	9.60	\N	\N	\N	2026-08-29 15:23:33+00
72	\N	1	completed	card	2258.00	65.50	128.74	2321.24	2321.24	0.00	\N	\N	\N	2026-08-29 15:07:28+00
73	\N	3	completed	cash	2093.00	190.10	58.34	1961.24	1961.24	8.76	\N	\N	\N	2026-08-29 09:23:26+00
74	\N	3	completed	cash	1195.00	11.00	0.00	1184.00	1184.00	6.00	\N	\N	\N	2026-08-29 12:19:19+00
75	\N	3	completed	cash	1354.00	10.00	0.00	1344.00	1344.00	6.00	\N	\N	\N	2026-08-29 12:53:11+00
76	\N	2	completed	card	1689.00	20.70	26.08	1694.38	1694.38	0.00	\N	\N	\N	2026-08-30 13:38:35+00
77	\N	1	completed	cash	54.00	0.00	0.00	54.00	54.00	6.00	\N	\N	\N	2026-08-30 16:56:44+00
3	10	2	completed	credit	890.00	7.20	67.76	950.56	950.56	0.00	\N	2026-08-22	\N	2026-08-15 11:56:15+00
41	10	2	completed	credit	19.00	0.00	0.00	19.00	19.00	0.00	\N	2026-08-30	\N	2026-08-23 09:30:01+00
10	2	2	completed	credit	353.00	0.00	42.42	395.42	395.42	0.00	\N	2026-08-23	\N	2026-08-16 19:13:55+00
23	6	1	completed	credit	1200.00	93.30	0.00	1106.70	664.02	0.00	\N	2026-08-26	\N	2026-08-19 21:26:46+00
39	2	2	completed	credit	2571.00	6.90	165.07	2729.17	100.00	0.00	\N	2026-08-30	\N	2026-08-23 14:46:45+00
78	\N	2	completed	card	122.00	0.00	17.08	139.08	139.08	0.00	\N	\N	\N	2026-08-30 14:19:33+00
79	\N	1	completed	card	2010.00	10.00	0.00	2000.00	2000.00	0.00	\N	\N	\N	2026-08-30 11:21:04+00
80	\N	3	completed	cash	467.00	5.80	0.00	461.20	461.20	8.80	\N	\N	\N	2026-08-30 18:08:15+00
81	\N	1	completed	card	1414.00	93.50	0.00	1320.50	1320.50	0.00	\N	\N	\N	2026-08-31 18:44:00+00
82	\N	1	completed	cash	1036.00	61.00	52.08	1027.08	1027.08	2.92	\N	\N	\N	2026-08-31 17:42:06+00
83	\N	2	completed	card	1339.50	6.40	0.00	1333.10	1333.10	0.00	\N	\N	\N	2026-08-31 12:26:37+00
84	\N	2	completed	cash	1614.00	50.60	146.72	1710.12	1710.12	9.88	\N	\N	\N	2026-09-01 09:43:18+00
85	\N	2	completed	cash	165.00	0.00	0.00	165.00	165.00	5.00	\N	\N	\N	2026-09-01 14:32:19+00
86	\N	3	completed	card	196.00	0.00	0.00	196.00	196.00	0.00	\N	\N	\N	2026-09-02 14:34:53+00
87	\N	1	completed	cash	2146.00	198.30	237.83	2185.53	2185.53	4.47	\N	\N	\N	2026-09-02 11:10:53+00
88	\N	1	completed	cash	484.00	0.00	67.76	551.76	551.76	8.24	\N	\N	\N	2026-09-02 09:07:30+00
89	6	2	completed	credit	328.00	0.00	35.28	363.28	0.00	0.00	\N	2026-09-09	\N	2026-09-02 11:08:00+00
90	\N	3	completed	cash	19.00	0.00	0.00	19.00	19.00	1.00	\N	\N	\N	2026-09-02 14:43:10+00
91	\N	2	completed	bank	1365.00	74.80	0.00	1290.20	1290.20	0.00	\N	\N	\N	2026-09-02 18:33:06+00
92	\N	3	completed	bank	1048.00	104.80	132.05	1075.25	1075.25	0.00	\N	\N	\N	2026-09-02 16:46:43+00
93	\N	2	completed	cash	220.00	8.25	7.70	219.45	219.45	0.55	\N	\N	\N	2026-09-03 10:31:43+00
94	\N	1	completed	card	279.00	6.90	18.35	290.45	290.45	0.00	\N	\N	\N	2026-09-03 13:26:15+00
95	4	2	completed	credit	990.00	30.80	25.98	985.18	0.00	0.00	\N	2026-09-11	\N	2026-09-04 18:28:14+00
96	\N	2	completed	card	504.00	22.50	25.62	507.12	507.12	0.00	\N	\N	\N	2026-09-04 10:37:42+00
97	\N	1	completed	card	374.00	33.60	42.34	382.74	382.74	0.00	\N	\N	\N	2026-09-05 16:02:53+00
98	\N	3	completed	card	1250.00	0.00	0.00	1250.00	1250.00	0.00	\N	\N	\N	2026-09-05 11:20:46+00
99	\N	3	completed	cash	2920.00	228.00	60.98	2752.98	2752.98	7.02	\N	\N	\N	2026-09-05 16:19:12+00
100	\N	1	completed	card	120.00	0.00	0.00	120.00	120.00	0.00	\N	\N	\N	2026-09-05 13:39:23+00
101	\N	3	completed	bank	90.00	0.00	0.00	90.00	90.00	0.00	\N	\N	\N	2026-09-06 19:15:54+00
102	\N	2	completed	cash	784.00	57.60	0.00	726.40	726.40	3.60	\N	\N	\N	2026-09-06 21:12:21+00
103	\N	1	completed	cash	285.00	3.00	0.00	282.00	282.00	8.00	\N	\N	\N	2026-09-06 12:47:05+00
104	\N	2	completed	card	954.00	0.00	0.00	954.00	954.00	0.00	\N	\N	\N	2026-09-06 17:09:05+00
105	\N	3	completed	card	108.00	0.00	0.00	108.00	108.00	0.00	\N	\N	\N	2026-09-06 10:06:17+00
107	\N	3	completed	card	452.00	0.00	0.00	452.00	452.00	0.00	\N	\N	\N	2026-09-07 19:38:37+00
108	\N	1	completed	card	874.00	38.10	41.19	877.09	877.09	0.00	\N	\N	\N	2026-09-08 20:40:00+00
109	\N	2	completed	cash	132.00	10.20	0.00	121.80	121.80	8.20	\N	\N	\N	2026-09-08 12:55:11+00
111	\N	2	completed	cash	638.00	18.80	0.00	619.20	619.20	0.80	\N	\N	\N	2026-09-08 11:34:10+00
112	\N	2	completed	card	919.00	75.60	9.66	853.06	853.06	0.00	\N	\N	\N	2026-09-08 11:01:50+00
113	\N	3	completed	card	82.00	2.75	7.32	86.57	86.57	0.00	\N	\N	\N	2026-09-09 15:42:25+00
114	\N	2	completed	cash	136.00	13.60	0.00	122.40	122.40	7.60	\N	\N	\N	2026-09-09 10:54:57+00
115	\N	1	completed	card	158.00	0.00	0.00	158.00	158.00	0.00	\N	\N	\N	2026-09-09 19:45:28+00
116	\N	2	completed	bank	885.00	16.80	53.23	921.43	921.43	0.00	\N	\N	\N	2026-09-09 16:31:27+00
117	\N	2	completed	bank	250.00	16.00	0.00	234.00	234.00	0.00	\N	\N	\N	2026-09-10 18:29:55+00
118	\N	3	completed	card	360.00	0.00	34.16	394.16	394.16	0.00	\N	\N	\N	2026-09-10 14:26:36+00
119	\N	1	completed	cash	384.00	0.00	0.00	384.00	384.00	6.00	\N	\N	\N	2026-09-10 14:20:47+00
120	\N	1	completed	cash	534.00	21.55	0.00	512.45	512.45	7.55	\N	\N	\N	2026-09-10 10:40:25+00
121	\N	2	completed	cash	272.00	13.60	0.00	258.40	258.40	1.60	\N	\N	\N	2026-09-10 10:09:42+00
122	\N	2	completed	cash	434.00	18.30	0.00	415.70	415.70	4.30	\N	\N	\N	2026-09-10 21:24:00+00
123	\N	2	completed	card	242.00	24.20	30.49	248.29	248.29	0.00	\N	\N	\N	2026-09-10 15:46:00+00
124	\N	1	completed	cash	138.00	0.00	0.00	138.00	138.00	2.00	\N	\N	\N	2026-09-11 21:29:51+00
125	\N	1	completed	bank	1334.00	15.65	0.00	1318.35	1318.35	0.00	\N	\N	\N	2026-09-11 21:54:02+00
126	\N	3	completed	cash	136.00	0.00	0.00	136.00	136.00	4.00	\N	\N	\N	2026-09-11 15:22:30+00
127	\N	1	completed	cash	1118.00	0.00	0.00	1118.00	1118.00	2.00	\N	\N	\N	2026-09-11 14:39:25+00
128	\N	1	completed	bank	183.00	0.00	0.00	183.00	183.00	0.00	\N	\N	\N	2026-09-11 10:53:39+00
129	\N	1	completed	cash	768.00	0.00	0.00	768.00	768.00	2.00	\N	\N	\N	2026-09-12 10:58:27+00
130	\N	2	completed	card	1181.00	78.40	0.00	1102.60	1102.60	0.00	\N	\N	\N	2026-09-12 20:26:03+00
131	\N	2	completed	bank	242.00	12.10	32.19	262.09	262.09	0.00	\N	\N	\N	2026-09-12 16:03:41+00
132	\N	2	completed	card	855.00	3.40	23.10	874.70	874.70	0.00	\N	\N	\N	2026-09-12 19:50:13+00
133	\N	2	completed	cash	2040.00	131.00	128.74	2037.74	2037.74	2.26	\N	\N	\N	2026-09-12 10:28:47+00
134	\N	2	completed	bank	61.00	0.00	8.54	69.54	69.54	0.00	\N	\N	\N	2026-09-13 15:59:16+00
135	\N	3	completed	cash	405.00	2.65	0.00	402.35	402.35	7.65	\N	\N	\N	2026-09-13 18:06:00+00
136	\N	3	completed	card	717.00	0.00	9.66	726.66	726.66	0.00	\N	\N	\N	2026-09-13 21:56:17+00
137	\N	2	completed	cash	262.00	10.80	0.00	251.20	251.20	8.80	\N	\N	\N	2026-09-13 21:40:43+00
139	\N	1	completed	cash	858.00	0.00	0.00	858.00	858.00	2.00	\N	\N	\N	2026-09-13 20:24:22+00
140	\N	3	completed	cash	19.00	0.95	0.00	18.05	18.05	1.95	\N	\N	\N	2026-09-14 14:40:36+00
141	\N	1	completed	cash	855.00	39.10	44.69	860.59	860.59	9.41	\N	\N	\N	2026-09-14 12:12:01+00
142	\N	1	completed	card	644.00	3.75	43.82	684.07	684.07	0.00	\N	\N	\N	2026-09-14 12:24:42+00
143	\N	3	completed	card	244.00	24.40	30.74	250.34	250.34	0.00	\N	\N	\N	2026-09-14 14:38:08+00
144	\N	1	completed	card	55.00	0.00	0.00	55.00	55.00	0.00	\N	\N	\N	2026-09-15 21:45:44+00
145	\N	2	completed	cash	234.00	10.20	0.00	223.80	223.80	6.20	\N	\N	\N	2026-09-15 17:46:13+00
146	\N	3	completed	cash	265.00	13.25	29.26	281.01	281.01	8.99	\N	\N	\N	2026-09-15 18:08:53+00
147	6	3	completed	credit	81.00	8.10	0.00	72.90	0.00	0.00	\N	2026-09-22	\N	2026-09-15 18:06:44+00
148	\N	2	completed	card	184.00	0.00	11.76	195.76	195.76	0.00	\N	\N	\N	2026-09-15 18:59:37+00
149	\N	3	completed	cash	136.00	0.00	0.00	136.00	136.00	4.00	\N	\N	\N	2026-09-16 20:06:12+00
150	\N	3	completed	cash	1098.00	37.90	0.00	1060.10	1060.10	9.90	\N	\N	\N	2026-09-16 18:11:47+00
151	\N	3	completed	cash	1478.00	6.70	47.04	1518.34	1518.34	1.66	\N	\N	\N	2026-09-16 09:14:05+00
152	\N	1	completed	cash	128.00	0.00	0.00	128.00	128.00	2.00	\N	\N	\N	2026-09-16 15:21:57+00
153	\N	2	completed	card	1222.00	4.70	146.72	1364.02	1364.02	0.00	\N	\N	\N	2026-09-16 18:14:47+00
154	\N	3	completed	card	27.00	2.70	0.00	24.30	24.30	0.00	\N	\N	\N	2026-09-17 13:14:52+00
155	\N	1	completed	card	804.00	12.10	79.23	871.13	871.13	0.00	\N	\N	\N	2026-09-17 11:59:45+00
138	10	1	completed	credit	45.00	4.50	0.00	40.50	22.65	0.00	\N	2026-09-20	\N	2026-09-13 13:28:57+00
106	5	1	completed	credit	965.00	2.75	7.32	969.57	678.70	0.00	\N	2026-09-14	\N	2026-09-07 19:09:10+00
156	\N	2	completed	cash	252.00	12.60	0.00	239.40	239.40	0.60	\N	\N	\N	2026-09-17 16:45:22+00
157	\N	2	completed	cash	68.00	0.00	0.00	68.00	68.00	2.00	\N	\N	\N	2026-09-17 16:16:06+00
158	\N	2	completed	card	2466.50	110.48	234.56	2590.58	2590.58	0.00	\N	\N	\N	2026-09-17 12:48:46+00
159	\N	3	completed	cash	576.00	0.00	0.00	576.00	576.00	4.00	\N	\N	\N	2026-09-18 14:30:19+00
160	\N	1	completed	cash	94.00	0.00	0.00	94.00	94.00	6.00	\N	\N	\N	2026-09-18 16:45:08+00
161	\N	3	completed	card	57.00	2.85	0.00	54.15	54.15	0.00	\N	\N	\N	2026-09-18 17:21:19+00
162	\N	2	completed	card	2536.00	126.80	316.01	2725.21	2725.21	0.00	\N	\N	\N	2026-09-18 13:33:50+00
163	\N	1	completed	cash	1371.00	18.55	0.00	1352.45	1352.45	7.55	\N	\N	\N	2026-09-18 12:12:41+00
164	\N	1	completed	cash	524.00	1.60	51.30	573.70	573.70	6.30	\N	\N	\N	2026-09-18 09:46:48+00
165	\N	1	completed	bank	265.00	2.00	0.00	263.00	263.00	0.00	\N	\N	\N	2026-09-19 19:21:58+00
166	\N	3	completed	cash	510.00	0.00	11.76	521.76	521.76	8.24	\N	\N	\N	2026-09-19 09:43:53+00
167	\N	1	completed	cash	15.00	1.50	0.00	13.50	13.50	6.50	\N	\N	\N	2026-09-19 18:03:13+00
168	\N	3	completed	cash	1760.00	44.25	216.26	1932.01	1932.01	7.99	\N	\N	\N	2026-09-19 15:31:58+00
169	\N	1	completed	cash	200.00	0.00	0.00	200.00	200.00	0.00	\N	\N	\N	2026-09-19 15:06:02+00
170	\N	2	completed	card	2335.00	23.15	61.58	2373.43	2373.43	0.00	\N	\N	\N	2026-09-20 21:58:02+00
171	\N	1	completed	cash	283.00	16.50	0.00	266.50	266.50	3.50	\N	\N	\N	2026-09-20 15:59:31+00
172	\N	2	completed	cash	1058.00	0.50	0.00	1057.50	1057.50	2.50	\N	\N	\N	2026-09-20 11:23:58+00
173	\N	3	completed	card	326.00	11.60	0.00	314.40	314.40	0.00	\N	\N	\N	2026-09-21 18:18:37+00
174	\N	1	completed	cash	232.00	0.00	0.00	232.00	232.00	8.00	\N	\N	\N	2026-09-21 13:34:00+00
175	\N	3	completed	cash	54.00	2.70	0.00	51.30	51.30	8.70	\N	\N	\N	2026-09-21 19:15:49+00
176	\N	3	completed	cash	2352.00	16.70	19.32	2354.62	2354.62	5.38	\N	\N	\N	2026-09-22 11:50:03+00
177	\N	2	completed	card	736.00	27.20	0.00	708.80	708.80	0.00	\N	\N	\N	2026-09-22 19:20:42+00
178	\N	3	completed	card	378.00	29.80	20.79	368.99	368.99	0.00	\N	\N	\N	2026-09-23 19:19:57+00
179	\N	3	completed	card	1388.00	41.15	40.47	1387.32	1387.32	0.00	\N	\N	\N	2026-09-23 14:31:54+00
180	\N	1	completed	cash	1086.00	72.60	100.02	1113.42	1113.42	6.58	\N	\N	\N	2026-09-23 11:44:15+00
181	\N	3	completed	cash	1496.00	25.20	0.00	1470.80	1470.80	9.20	\N	\N	\N	2026-09-23 10:40:30+00
182	\N	3	completed	cash	384.00	0.00	0.00	384.00	384.00	6.00	\N	\N	\N	2026-09-24 16:30:33+00
183	\N	1	completed	card	898.00	89.80	0.00	808.20	808.20	0.00	\N	\N	\N	2026-09-24 15:45:59+00
184	\N	3	completed	cash	252.00	5.10	0.00	246.90	246.90	3.10	\N	\N	\N	2026-09-24 20:33:33+00
185	\N	3	completed	card	489.00	7.95	13.44	494.49	494.49	0.00	\N	\N	\N	2026-09-24 12:42:39+00
186	\N	3	completed	cash	418.00	24.40	30.74	424.34	424.34	5.66	\N	\N	\N	2026-09-24 11:50:46+00
187	\N	2	completed	cash	204.00	0.00	0.00	204.00	204.00	6.00	\N	\N	\N	2026-09-24 09:11:07+00
188	\N	2	completed	cash	1738.50	14.40	23.52	1747.62	1747.62	2.38	\N	\N	\N	2026-09-24 13:51:03+00
189	\N	3	completed	bank	390.00	0.00	47.04	437.04	437.04	0.00	\N	\N	\N	2026-09-25 20:55:25+00
190	\N	3	completed	cash	1809.00	50.10	58.34	1817.24	1817.24	2.76	\N	\N	\N	2026-09-25 17:39:51+00
191	\N	1	completed	cash	282.00	3.75	28.98	307.23	307.23	2.77	\N	\N	\N	2026-09-25 21:34:46+00
192	\N	1	completed	cash	256.00	16.50	29.75	269.25	269.25	0.75	\N	\N	\N	2026-09-25 10:31:54+00
193	\N	2	completed	cash	965.00	0.90	37.38	1001.48	1001.48	8.52	\N	\N	\N	2026-09-25 15:18:19+00
194	\N	2	completed	card	668.00	0.00	72.52	740.52	740.52	0.00	\N	\N	\N	2026-09-26 16:06:14+00
195	\N	3	completed	cash	873.00	16.00	9.66	866.66	866.66	3.34	\N	\N	\N	2026-09-26 10:33:42+00
196	\N	3	completed	cash	1544.00	132.20	0.00	1411.80	1411.80	8.20	\N	\N	\N	2026-09-27 13:26:37+00
197	\N	2	completed	cash	697.00	10.00	0.00	687.00	687.00	3.00	\N	\N	\N	2026-09-27 14:08:20+00
198	\N	1	completed	cash	898.00	0.00	0.00	898.00	898.00	2.00	\N	\N	\N	2026-09-27 09:41:23+00
199	\N	2	completed	card	2473.50	199.95	0.00	2273.55	2273.55	0.00	\N	\N	\N	2026-09-27 12:43:46+00
200	\N	1	completed	cash	2272.00	185.20	248.75	2335.55	2335.55	4.45	\N	\N	\N	2026-09-27 12:56:11+00
201	\N	3	completed	card	523.00	23.80	0.00	499.20	499.20	0.00	\N	\N	\N	2026-09-27 12:10:01+00
202	\N	2	completed	card	110.00	0.00	15.40	125.40	125.40	0.00	\N	\N	\N	2026-09-27 10:56:24+00
203	9	3	completed	credit	1200.00	1.80	17.08	1215.28	0.00	0.00	\N	2026-10-05	\N	2026-09-28 17:44:56+00
204	\N	1	completed	cash	2789.00	22.20	15.37	2782.17	2782.17	7.83	\N	\N	\N	2026-09-28 09:46:21+00
205	9	3	completed	credit	324.00	32.40	0.00	291.60	0.00	0.00	\N	2026-10-05	\N	2026-09-28 14:39:17+00
206	\N	2	completed	cash	1320.00	13.60	146.72	1453.12	1453.12	6.88	\N	\N	\N	2026-09-29 18:05:27+00
207	\N	2	completed	card	894.00	7.50	101.64	988.14	988.14	0.00	\N	\N	\N	2026-09-29 18:27:40+00
208	\N	3	completed	card	1119.00	22.40	0.00	1096.60	1096.60	0.00	\N	\N	\N	2026-09-29 10:02:10+00
209	\N	3	completed	bank	248.00	20.00	0.00	228.00	228.00	0.00	\N	\N	\N	2026-09-29 10:17:45+00
210	\N	2	voided	card	1331.00	88.20	99.04	1341.84	1341.84	0.00	\N	\N	\N	2026-09-29 18:40:53+00
211	\N	2	completed	cash	1299.00	50.30	123.16	1371.86	1371.86	8.14	\N	\N	\N	2026-09-29 18:08:40+00
1	7	3	completed	credit	100.00	10.00	0.00	90.00	90.00	0.00	\N	2026-08-22	\N	2026-08-15 12:07:10+00
110	7	1	completed	credit	524.00	26.20	69.69	567.49	324.29	0.00	\N	2026-09-15	\N	2026-09-08 19:28:34+00
212	\N	1	completed	cash	117.00	0.00	0.00	117.00	117.00	33.00	\N	\N	\N	2026-09-29 17:15:51.57947+00
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.notifications (id, type, title, body, entity, entity_id, read, created_at) FROM stdin;
1	low_stock	2 منتج منخفض المخزون	نواقص: 0 • منخفضة: 2 — راجع صفحة المنتجات لتجديد المخزون.	products	\N	f	2026-09-30 07:24:42.356087+00
2	expired	1 منتج منتهي الصلاحية	منتجات تجاوزت تاريخ الانتهاء وموجودة في المخزون — افحصها فورًا.	products	\N	f	2026-09-30 07:24:42.358807+00
3	expiring	4 منتج يقترب من انتهاء الصلاحية	ستنتهي صلاحيتها خلال 30 يومًا.	products	\N	f	2026-09-30 07:24:42.361691+00
4	debt_overdue	8 دين متأخر بقيمة 5045 شيكل	فواتير آجلة تجاوزت تاريخ الاستحقاق — تابع التحصيل من صفحة الديون.	debts	\N	f	2026-09-30 07:24:42.364761+00
\.


--
-- Data for Name: payments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.payments (id, invoice_id, customer_id, amount, method, type, note, created_by, created_at) FROM stdin;
1	1	7	63.00	cash	sale	دفعة أولى	3	2026-08-15 12:07:10+00
2	\N	7	10.80	cash	debt	تحصيل دفعة من الدين	3	2026-08-17 10:00:14+00
3	2	\N	762.70	card	sale	\N	3	2026-08-15 10:21:18+00
4	3	10	665.39	cash	sale	دفعة أولى	2	2026-08-15 11:56:15+00
5	\N	10	285.17	cash	debt	تحصيل دفعة من الدين	2	2026-08-18 11:00:33+00
6	4	\N	392.00	card	sale	\N	1	2026-08-15 20:33:11+00
7	5	\N	1223.94	cash	sale	\N	1	2026-08-16 16:59:12+00
8	6	\N	561.18	card	sale	\N	3	2026-08-16 20:09:59+00
9	7	\N	1661.00	card	sale	\N	1	2026-08-16 09:50:01+00
10	8	\N	202.60	cash	sale	\N	3	2026-08-16 12:04:38+00
11	9	\N	1979.74	card	sale	\N	2	2026-08-16 21:03:35+00
12	10	2	197.71	cash	sale	دفعة أولى	2	2026-08-16 19:13:55+00
13	\N	2	197.71	cash	debt	تحصيل دفعة من الدين	2	2026-08-18 14:00:43+00
14	11	\N	54.00	card	sale	\N	1	2026-08-17 12:22:40+00
15	12	\N	139.08	card	sale	\N	3	2026-08-17 12:25:09+00
16	13	\N	2556.83	cash	sale	\N	3	2026-08-17 12:02:54+00
17	14	\N	1518.65	bank	sale	\N	3	2026-08-17 13:47:30+00
18	15	\N	873.75	cash	sale	\N	3	2026-08-18 15:02:19+00
19	16	\N	748.60	bank	sale	\N	3	2026-08-18 13:54:33+00
20	17	\N	1130.52	cash	sale	\N	2	2026-08-18 20:03:45+00
21	18	\N	1201.60	bank	sale	\N	1	2026-08-18 17:09:18+00
22	19	\N	293.75	cash	sale	\N	3	2026-08-18 20:40:12+00
23	20	\N	1367.78	card	sale	\N	1	2026-08-18 09:36:29+00
24	21	\N	128.00	cash	sale	\N	2	2026-08-19 20:19:49+00
25	22	\N	1032.08	cash	sale	\N	3	2026-08-19 12:22:02+00
26	\N	6	664.02	cash	debt	تحصيل دفعة من الدين	1	2026-08-21 20:00:14+00
27	24	\N	435.38	bank	sale	\N	2	2026-08-19 20:06:58+00
28	25	\N	270.00	card	sale	\N	3	2026-08-19 19:07:29+00
29	26	\N	581.00	cash	sale	\N	2	2026-08-20 12:25:49+00
30	27	\N	928.75	card	sale	\N	1	2026-08-20 20:23:38+00
31	28	\N	2958.74	cash	sale	\N	2	2026-08-20 14:04:18+00
32	29	\N	756.01	cash	sale	\N	1	2026-08-20 13:05:20+00
33	30	\N	1260.50	cash	sale	\N	3	2026-08-21 17:51:29+00
34	31	\N	1284.40	cash	sale	\N	1	2026-08-21 15:00:22+00
35	32	\N	788.60	cash	sale	\N	1	2026-08-21 13:50:19+00
36	33	\N	2890.68	cash	sale	\N	2	2026-08-21 17:28:58+00
37	34	\N	2472.03	cash	sale	\N	2	2026-08-21 14:14:50+00
38	35	\N	1226.60	cash	sale	\N	3	2026-08-21 15:25:12+00
39	36	\N	661.00	card	sale	\N	1	2026-08-22 21:09:57+00
40	37	\N	61.20	cash	sale	\N	2	2026-08-22 11:40:38+00
41	38	\N	2152.20	card	sale	\N	1	2026-08-22 15:12:26+00
42	40	\N	461.70	cash	sale	\N	3	2026-08-23 11:03:24+00
43	41	10	13.30	cash	sale	دفعة أولى	2	2026-08-23 09:30:01+00
44	42	\N	688.34	cash	sale	\N	1	2026-08-23 15:41:04+00
45	43	\N	34.00	card	sale	\N	2	2026-08-23 09:35:35+00
46	44	\N	812.10	cash	sale	\N	3	2026-08-23 11:27:03+00
47	45	\N	758.89	card	sale	\N	2	2026-08-23 10:22:29+00
48	46	\N	275.50	card	sale	\N	2	2026-08-24 11:22:10+00
49	47	\N	1442.85	card	sale	\N	1	2026-08-24 18:14:18+00
50	48	\N	2515.76	bank	sale	\N	2	2026-08-24 11:19:00+00
51	49	\N	3493.22	cash	sale	\N	1	2026-08-24 12:42:50+00
52	50	\N	307.80	cash	sale	\N	1	2026-08-24 11:09:59+00
53	51	\N	364.80	cash	sale	\N	3	2026-08-24 18:00:34+00
54	52	\N	30.00	cash	sale	\N	2	2026-08-25 21:54:36+00
55	53	\N	2165.97	card	sale	\N	3	2026-08-25 13:21:40+00
56	54	\N	1476.52	card	sale	\N	3	2026-08-25 19:06:54+00
57	55	\N	61.20	cash	sale	\N	3	2026-08-25 11:19:21+00
58	56	\N	333.00	cash	sale	\N	2	2026-08-25 10:04:05+00
59	57	\N	183.40	cash	sale	\N	2	2026-08-25 16:50:55+00
60	58	\N	1197.18	cash	sale	\N	3	2026-08-25 12:51:04+00
61	59	\N	925.08	card	sale	\N	2	2026-08-26 14:59:09+00
62	60	\N	776.40	card	sale	\N	2	2026-08-26 15:04:02+00
63	61	\N	58.00	cash	sale	\N	1	2026-08-26 19:53:50+00
64	62	\N	138.80	card	sale	\N	3	2026-08-26 14:18:00+00
65	63	\N	664.59	bank	sale	\N	1	2026-08-26 17:08:37+00
66	64	\N	2111.28	bank	sale	\N	3	2026-08-26 16:00:44+00
67	65	\N	2129.14	bank	sale	\N	3	2026-08-27 16:24:19+00
68	66	\N	306.40	cash	sale	\N	3	2026-08-27 18:11:20+00
69	67	\N	2611.35	card	sale	\N	2	2026-08-27 17:30:23+00
70	68	\N	257.40	cash	sale	\N	3	2026-08-27 11:19:13+00
71	69	\N	996.64	cash	sale	\N	2	2026-08-28 18:02:49+00
72	70	\N	152.76	card	sale	\N	3	2026-08-28 20:01:42+00
73	71	\N	600.40	cash	sale	\N	2	2026-08-29 15:23:33+00
74	72	\N	2321.24	card	sale	\N	1	2026-08-29 15:07:28+00
75	73	\N	1961.24	cash	sale	\N	3	2026-08-29 09:23:26+00
76	74	\N	1184.00	cash	sale	\N	3	2026-08-29 12:19:19+00
77	75	\N	1344.00	cash	sale	\N	3	2026-08-29 12:53:11+00
78	76	\N	1694.38	card	sale	\N	2	2026-08-30 13:38:35+00
79	77	\N	54.00	cash	sale	\N	1	2026-08-30 16:56:44+00
80	78	\N	139.08	card	sale	\N	2	2026-08-30 14:19:33+00
81	79	\N	2000.00	card	sale	\N	1	2026-08-30 11:21:04+00
82	80	\N	461.20	cash	sale	\N	3	2026-08-30 18:08:15+00
83	81	\N	1320.50	card	sale	\N	1	2026-08-31 18:44:00+00
84	82	\N	1027.08	cash	sale	\N	1	2026-08-31 17:42:06+00
85	83	\N	1333.10	card	sale	\N	2	2026-08-31 12:26:37+00
86	84	\N	1710.12	cash	sale	\N	2	2026-09-01 09:43:18+00
87	85	\N	165.00	cash	sale	\N	2	2026-09-01 14:32:19+00
88	86	\N	196.00	card	sale	\N	3	2026-09-02 14:34:53+00
89	87	\N	2185.53	cash	sale	\N	1	2026-09-02 11:10:53+00
90	88	\N	551.76	cash	sale	\N	1	2026-09-02 09:07:30+00
91	90	\N	19.00	cash	sale	\N	3	2026-09-02 14:43:10+00
92	91	\N	1290.20	bank	sale	\N	2	2026-09-02 18:33:06+00
93	92	\N	1075.25	bank	sale	\N	3	2026-09-02 16:46:43+00
94	93	\N	219.45	cash	sale	\N	2	2026-09-03 10:31:43+00
95	94	\N	290.45	card	sale	\N	1	2026-09-03 13:26:15+00
96	96	\N	507.12	card	sale	\N	2	2026-09-04 10:37:42+00
97	97	\N	382.74	card	sale	\N	1	2026-09-05 16:02:53+00
98	98	\N	1250.00	card	sale	\N	3	2026-09-05 11:20:46+00
99	99	\N	2752.98	cash	sale	\N	3	2026-09-05 16:19:12+00
100	100	\N	120.00	card	sale	\N	1	2026-09-05 13:39:23+00
101	101	\N	90.00	bank	sale	\N	3	2026-09-06 19:15:54+00
102	102	\N	726.40	cash	sale	\N	2	2026-09-06 21:12:21+00
103	103	\N	282.00	cash	sale	\N	1	2026-09-06 12:47:05+00
104	104	\N	954.00	card	sale	\N	2	2026-09-06 17:09:05+00
105	105	\N	108.00	card	sale	\N	3	2026-09-06 10:06:17+00
106	106	5	484.79	cash	sale	دفعة أولى	1	2026-09-07 19:09:10+00
107	\N	5	193.91	bank	debt	تحصيل دفعة من الدين	1	2026-09-11 11:00:03+00
108	107	\N	452.00	card	sale	\N	3	2026-09-07 19:38:37+00
109	108	\N	877.09	card	sale	\N	1	2026-09-08 20:40:00+00
110	109	\N	121.80	cash	sale	\N	2	2026-09-08 12:55:11+00
111	\N	7	340.49	bank	debt	تحصيل دفعة من الدين	1	2026-09-12 10:00:42+00
112	111	\N	619.20	cash	sale	\N	2	2026-09-08 11:34:10+00
113	112	\N	853.06	card	sale	\N	2	2026-09-08 11:01:50+00
114	113	\N	86.57	card	sale	\N	3	2026-09-09 15:42:25+00
115	114	\N	122.40	cash	sale	\N	2	2026-09-09 10:54:57+00
116	115	\N	158.00	card	sale	\N	1	2026-09-09 19:45:28+00
117	116	\N	921.43	bank	sale	\N	2	2026-09-09 16:31:27+00
118	117	\N	234.00	bank	sale	\N	2	2026-09-10 18:29:55+00
119	118	\N	394.16	card	sale	\N	3	2026-09-10 14:26:36+00
120	119	\N	384.00	cash	sale	\N	1	2026-09-10 14:20:47+00
121	120	\N	512.45	cash	sale	\N	1	2026-09-10 10:40:25+00
122	121	\N	258.40	cash	sale	\N	2	2026-09-10 10:09:42+00
123	122	\N	415.70	cash	sale	\N	2	2026-09-10 21:24:00+00
124	123	\N	248.29	card	sale	\N	2	2026-09-10 15:46:00+00
125	124	\N	138.00	cash	sale	\N	1	2026-09-11 21:29:51+00
126	125	\N	1318.35	bank	sale	\N	1	2026-09-11 21:54:02+00
127	126	\N	136.00	cash	sale	\N	3	2026-09-11 15:22:30+00
128	127	\N	1118.00	cash	sale	\N	1	2026-09-11 14:39:25+00
129	128	\N	183.00	bank	sale	\N	1	2026-09-11 10:53:39+00
130	129	\N	768.00	cash	sale	\N	1	2026-09-12 10:58:27+00
131	130	\N	1102.60	card	sale	\N	2	2026-09-12 20:26:03+00
132	131	\N	262.09	bank	sale	\N	2	2026-09-12 16:03:41+00
133	132	\N	874.70	card	sale	\N	2	2026-09-12 19:50:13+00
134	133	\N	2037.74	cash	sale	\N	2	2026-09-12 10:28:47+00
135	134	\N	69.54	bank	sale	\N	2	2026-09-13 15:59:16+00
136	135	\N	402.35	cash	sale	\N	3	2026-09-13 18:06:00+00
137	136	\N	726.66	card	sale	\N	3	2026-09-13 21:56:17+00
138	137	\N	251.20	cash	sale	\N	2	2026-09-13 21:40:43+00
139	138	10	20.25	cash	sale	دفعة أولى	1	2026-09-13 13:28:57+00
140	\N	10	8.10	cash	debt	تحصيل دفعة من الدين	1	2026-09-16 12:00:33+00
141	139	\N	858.00	cash	sale	\N	1	2026-09-13 20:24:22+00
142	140	\N	18.05	cash	sale	\N	3	2026-09-14 14:40:36+00
143	141	\N	860.59	cash	sale	\N	1	2026-09-14 12:12:01+00
144	142	\N	684.07	card	sale	\N	1	2026-09-14 12:24:42+00
145	143	\N	250.34	card	sale	\N	3	2026-09-14 14:38:08+00
146	144	\N	55.00	card	sale	\N	1	2026-09-15 21:45:44+00
147	145	\N	223.80	cash	sale	\N	2	2026-09-15 17:46:13+00
148	146	\N	281.01	cash	sale	\N	3	2026-09-15 18:08:53+00
149	148	\N	195.76	card	sale	\N	2	2026-09-15 18:59:37+00
150	149	\N	136.00	cash	sale	\N	3	2026-09-16 20:06:12+00
151	150	\N	1060.10	cash	sale	\N	3	2026-09-16 18:11:47+00
152	151	\N	1518.34	cash	sale	\N	3	2026-09-16 09:14:05+00
153	152	\N	128.00	cash	sale	\N	1	2026-09-16 15:21:57+00
154	153	\N	1364.02	card	sale	\N	2	2026-09-16 18:14:47+00
155	154	\N	24.30	card	sale	\N	3	2026-09-17 13:14:52+00
156	155	\N	871.13	card	sale	\N	1	2026-09-17 11:59:45+00
157	156	\N	239.40	cash	sale	\N	2	2026-09-17 16:45:22+00
158	157	\N	68.00	cash	sale	\N	2	2026-09-17 16:16:06+00
159	158	\N	2590.58	card	sale	\N	2	2026-09-17 12:48:46+00
160	159	\N	576.00	cash	sale	\N	3	2026-09-18 14:30:19+00
161	160	\N	94.00	cash	sale	\N	1	2026-09-18 16:45:08+00
162	161	\N	54.15	card	sale	\N	3	2026-09-18 17:21:19+00
163	162	\N	2725.21	card	sale	\N	2	2026-09-18 13:33:50+00
164	163	\N	1352.45	cash	sale	\N	1	2026-09-18 12:12:41+00
165	164	\N	573.70	cash	sale	\N	1	2026-09-18 09:46:48+00
166	165	\N	263.00	bank	sale	\N	1	2026-09-19 19:21:58+00
167	166	\N	521.76	cash	sale	\N	3	2026-09-19 09:43:53+00
168	167	\N	13.50	cash	sale	\N	1	2026-09-19 18:03:13+00
169	168	\N	1932.01	cash	sale	\N	3	2026-09-19 15:31:58+00
170	169	\N	200.00	cash	sale	\N	1	2026-09-19 15:06:02+00
171	170	\N	2373.43	card	sale	\N	2	2026-09-20 21:58:02+00
172	171	\N	266.50	cash	sale	\N	1	2026-09-20 15:59:31+00
173	172	\N	1057.50	cash	sale	\N	2	2026-09-20 11:23:58+00
174	173	\N	314.40	card	sale	\N	3	2026-09-21 18:18:37+00
175	174	\N	232.00	cash	sale	\N	1	2026-09-21 13:34:00+00
176	175	\N	51.30	cash	sale	\N	3	2026-09-21 19:15:49+00
177	176	\N	2354.62	cash	sale	\N	3	2026-09-22 11:50:03+00
178	177	\N	708.80	card	sale	\N	2	2026-09-22 19:20:42+00
179	178	\N	368.99	card	sale	\N	3	2026-09-23 19:19:57+00
180	179	\N	1387.32	card	sale	\N	3	2026-09-23 14:31:54+00
181	180	\N	1113.42	cash	sale	\N	1	2026-09-23 11:44:15+00
182	181	\N	1470.80	cash	sale	\N	3	2026-09-23 10:40:30+00
183	182	\N	384.00	cash	sale	\N	3	2026-09-24 16:30:33+00
184	183	\N	808.20	card	sale	\N	1	2026-09-24 15:45:59+00
185	184	\N	246.90	cash	sale	\N	3	2026-09-24 20:33:33+00
186	185	\N	494.49	card	sale	\N	3	2026-09-24 12:42:39+00
187	186	\N	424.34	cash	sale	\N	3	2026-09-24 11:50:46+00
188	187	\N	204.00	cash	sale	\N	2	2026-09-24 09:11:07+00
189	188	\N	1747.62	cash	sale	\N	2	2026-09-24 13:51:03+00
190	189	\N	437.04	bank	sale	\N	3	2026-09-25 20:55:25+00
191	190	\N	1817.24	cash	sale	\N	3	2026-09-25 17:39:51+00
192	191	\N	307.23	cash	sale	\N	1	2026-09-25 21:34:46+00
193	192	\N	269.25	cash	sale	\N	1	2026-09-25 10:31:54+00
194	193	\N	1001.48	cash	sale	\N	2	2026-09-25 15:18:19+00
195	194	\N	740.52	card	sale	\N	2	2026-09-26 16:06:14+00
196	195	\N	866.66	cash	sale	\N	3	2026-09-26 10:33:42+00
197	196	\N	1411.80	cash	sale	\N	3	2026-09-27 13:26:37+00
198	197	\N	687.00	cash	sale	\N	2	2026-09-27 14:08:20+00
199	198	\N	898.00	cash	sale	\N	1	2026-09-27 09:41:23+00
200	199	\N	2273.55	card	sale	\N	2	2026-09-27 12:43:46+00
201	200	\N	2335.55	cash	sale	\N	1	2026-09-27 12:56:11+00
202	201	\N	499.20	card	sale	\N	3	2026-09-27 12:10:01+00
203	202	\N	125.40	card	sale	\N	2	2026-09-27 10:56:24+00
204	204	\N	2782.17	cash	sale	\N	1	2026-09-28 09:46:21+00
205	206	\N	1453.12	cash	sale	\N	2	2026-09-29 18:05:27+00
206	207	\N	988.14	card	sale	\N	2	2026-09-29 18:27:40+00
207	208	\N	1096.60	card	sale	\N	3	2026-09-29 10:02:10+00
208	209	\N	228.00	bank	sale	\N	3	2026-09-29 10:17:45+00
209	211	\N	1371.86	cash	sale	\N	2	2026-09-29 18:08:40+00
210	212	\N	117.00	cash	sale	\N	1	2026-09-29 17:15:51.57947+00
211	\N	2	100.00	cash	debt	اختبار	1	2026-09-29 17:15:51.609003+00
\.


--
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.products (id, barcode, sku, name, short_name, category_id, supplier_id, purchase_price, sale_price, wholesale_price, special_price, stock, min_stock, unit, expiry_date, batch_code, tax_rate, image_url, description, active, created_at, favorite) FROM stdin;
4	622100101003	PRD-0004	مياه معدنية دساني 600 مل	مياه معدنية	1	3	6.50	10.00	8.25	\N	240.000	48.000	زجاجة	\N	B641	0.00	\N	\N	t	2026-09-29 16:40:04.559299+00	f
5	622100101004	PRD-0005	ريد بول 250 مل	ريد بول	1	3	58.00	75.00	66.50	\N	24.000	6.000	علبة	\N	B482	0.00	\N	\N	t	2026-09-29 16:40:04.560871+00	f
6	622100101005	PRD-0006	شاي ليبتون 100 كيس	شاي ليبتون	1	5	155.00	192.00	173.50	\N	18.000	6.000	علبة	\N	B641	0.00	\N	\N	t	2026-09-29 16:40:04.562387+00	f
7	622100101006	PRD-0007	نسكافيه كلاسيك 200 غرام	نسكافيه كلاسيك	1	5	208.00	262.00	235.00	\N	3.000	6.000	عبوة	\N	B478	0.00	\N	\N	t	2026-09-29 16:40:04.564384+00	f
9	622100101008	PRD-0009	زبادي دانون 4×100 غرام	زبادي دانون	2	2	23.00	30.00	26.50	\N	40.000	12.000	باكيت	2026-09-25	B370	0.00	\N	\N	t	2026-09-29 16:40:04.568315+00	f
10	622100101009	PRD-0010	جبنة رومي قديم	جبنة رومي	2	2	360.00	425.00	392.50	\N	14.000	3.000	كيلو	2026-11-28	B666	0.00	\N	\N	t	2026-09-29 16:40:04.569889+00	f
11	622100101010	PRD-0011	جبنة شرائح كرافت 200 غرام	جبنة شرائح	2	1	76.00	96.00	86.00	\N	22.000	6.000	علبة	2026-12-28	B680	0.00	\N	\N	t	2026-09-29 16:40:04.572018+00	f
13	622100101012	PRD-0013	أرز الضحى 5 كيلو	أرز الضحى	3	3	375.00	449.00	412.00	\N	26.000	8.000	كيس	\N	B363	0.00	\N	\N	t	2026-09-29 16:40:04.575816+00	f
15	622100101014	PRD-0015	سكر حر 1 كيلو	سكر حر	3	3	40.00	47.00	43.50	\N	90.000	24.000	كيس	\N	B885	0.00	\N	\N	t	2026-09-29 16:40:04.579054+00	f
17	622100101016	PRD-0017	دقيق المطاحن فاخر 1 كيلو	دقيق المطاحن	3	3	27.00	34.00	30.50	\N	55.000	12.000	كيس	\N	B560	0.00	\N	\N	t	2026-09-29 16:40:04.582575+00	f
18	622100101017	PRD-0018	عدس أصفر 1 كيلو	عدس أصفر	3	3	54.00	68.00	61.00	\N	4.000	8.000	كيس	\N	B885	0.00	\N	\N	t	2026-09-29 16:40:04.585739+00	f
19	622100101018	PRD-0019	صلصة هاينز 300 غرام	صلصة هاينز	3	3	44.00	58.00	51.00	\N	36.000	8.000	عبوة	2027-03-28	B651	0.00	\N	\N	t	2026-09-29 16:40:04.587938+00	f
21	622100101020	PRD-0021	شيبسي كلاسيك عائلي	شيبسي كلاسيك	4	6	38.00	55.00	46.50	\N	64.000	12.000	كيس	\N	B670	0.00	\N	\N	t	2026-09-29 16:40:04.590989+00	f
22	622100101021	PRD-0022	أوريو أصلي 154 غرام	أوريو أصلي	4	6	29.00	40.00	34.50	\N	45.000	10.000	علبة	\N	B483	0.00	\N	\N	t	2026-09-29 16:40:04.593453+00	f
23	622100101022	PRD-0023	بسكويت التمر 12 حبة	بسكويت التمر	4	6	19.00	27.00	23.00	\N	38.000	8.000	باكيت	\N	B495	0.00	\N	\N	t	2026-09-29 16:40:04.595372+00	f
25	622100101024	PRD-0025	فيري سائل غسيل الأطباق 500 مل	فيري سائل	5	4	54.00	69.00	61.50	\N	42.000	10.000	زجاجة	\N	B219	14.00	\N	\N	t	2026-09-29 16:40:04.601177+00	f
26	622100101025	PRD-0026	كلور مركز 1 لتر	كلور مركز	5	5	24.00	32.00	28.00	\N	60.000	12.000	زجاجة	\N	B293	14.00	\N	\N	t	2026-09-29 16:40:04.602851+00	f
27	622100101026	PRD-0027	ديتول مطهر 500 مل	ديتول مطهر	5	5	64.00	84.00	74.00	\N	28.000	6.000	زجاجة	\N	B311	14.00	\N	\N	t	2026-09-29 16:40:04.604872+00	f
28	622100101027	PRD-0028	صابون لوكس 3 قطع	صابون لوكس	5	5	47.00	61.00	54.00	\N	50.000	10.000	باكيت	\N	B238	14.00	\N	\N	t	2026-09-29 16:40:04.607541+00	f
29	622100101028	PRD-0029	شامبو هيد آند شولدرز 400 مل	شامبو هيد	6	4	188.00	242.00	215.00	\N	14.000	4.000	عبوة	\N	B717	14.00	\N	\N	t	2026-09-29 16:40:04.609212+00	f
30	622100101029	PRD-0030	معجون أسنان سيغنال 120 مل	معجون أسنان	6	5	41.00	55.00	48.00	\N	44.000	8.000	علبة	\N	B931	14.00	\N	\N	t	2026-09-29 16:40:04.610905+00	f
31	622100101030	PRD-0031	مناديل فاين 550 منديل	مناديل فاين	6	3	36.00	48.00	42.00	\N	66.000	12.000	علبة	\N	B101	0.00	\N	\N	t	2026-09-29 16:40:04.613413+00	f
32	622100101031	PRD-0032	حفاضات بامبرز مقاس 4 (64 قطعة)	حفاضات بامبرز	6	4	378.00	463.00	420.50	\N	10.000	3.000	عبوة	\N	B666	14.00	\N	\N	t	2026-09-29 16:40:04.614919+00	f
33	622100101032	PRD-0033	توست ريتش 600 غرام	توست ريتش	7	7	31.00	40.00	35.50	\N	24.000	8.000	كيس	2026-10-05	B791	0.00	\N	\N	t	2026-09-29 16:40:04.616733+00	f
34	622100101033	PRD-0034	كرواسون بالشوكولاتة	كرواسون بالشوكولاتة	7	7	11.00	18.00	14.50	\N	30.000	6.000	قطعة	2026-10-02	B418	0.00	\N	\N	t	2026-09-29 16:40:04.618682+00	f
8	622100101007	PRD-0008	حليب جهينة كامل الدسم 1 لتر	حليب جهينة	2	1	42.00	53.00	47.50	\N	59.000	24.000	علبة	2026-10-24	B238	0.00	\N	\N	t	2026-09-29 16:40:04.566616+00	f
2	622100101001	PRD-0002	كوكاكولا 330 مل	كوكاكولا 330	1	3	14.00	19.00	16.50	\N	96.000	24.000	علبة	\N	B102	0.00	\N	\N	t	2026-09-29 16:40:04.555371+00	t
3	622100101002	PRD-0003	عصير جهينة برتقال 1 لتر	عصير جهينة	1	1	38.00	50.00	44.00	\N	48.000	12.000	علبة	\N	B996	0.00	\N	\N	t	2026-09-29 16:40:04.557214+00	t
12	622100101011	PRD-0012	زبدة لورباك 200 غرام	زبدة لورباك	2	2	128.00	162.00	145.00	\N	12.000	4.000	علبة	2026-10-11	B555	0.00	\N	\N	t	2026-09-29 16:40:04.573553+00	t
14	622100101013	PRD-0014	مكرونة الملكة 400 غرام	مكرونة الملكة	3	3	11.00	15.00	13.00	\N	180.000	36.000	كيس	\N	B400	0.00	\N	\N	t	2026-09-29 16:40:04.577292+00	t
16	622100101015	PRD-0016	زيت عافية 2.25 لتر	زيت عافية	3	3	238.00	286.00	262.00	\N	32.000	10.000	زجاجة	\N	B861	0.00	\N	\N	t	2026-09-29 16:40:04.58088+00	t
20	622100101019	PRD-0020	شوكولاتة جالاكسي سادة 36 غرام	شوكولاتة جالاكسي	4	6	17.00	25.00	21.00	\N	120.000	24.000	قطعة	\N	B719	0.00	\N	\N	t	2026-09-29 16:40:04.589417+00	t
24	622100101023	PRD-0024	تايد أصلي 2.5 كيلو	تايد أصلي	5	4	208.00	262.00	235.00	\N	16.000	6.000	علبة	\N	B707	14.00	\N	\N	t	2026-09-29 16:40:04.598457+00	t
1	622100101000	PRD-0001	بيبسي 1 لتر	بيبسي 1	1	3	26.00	32.00	29.00	\N	142.000	24.000	زجاجة	\N	B313	0.00	\N	\N	t	2026-09-29 16:40:04.552725+00	t
\.


--
-- Data for Name: purchases; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.purchases (id, supplier_id, amount, paid, note, created_by, created_at) FROM stdin;
1	6	62700.00	0.00	فاتورة توريد بضاعة شهرية	1	2026-09-16 12:00:39+00
2	5	77300.00	77300.00	فاتورة توريد بضاعة شهرية	1	2026-09-06 12:00:05+00
3	1	71000.00	71000.00	فاتورة توريد بضاعة شهرية	1	2026-08-31 12:00:28+00
4	1	72000.00	0.00	فاتورة توريد بضاعة شهرية	1	2026-09-12 12:00:50+00
5	2	72800.00	36400.00	فاتورة توريد بضاعة شهرية	1	2026-08-19 12:00:56+00
6	6	77100.00	77100.00	فاتورة توريد بضاعة شهرية	1	2026-08-17 12:00:20+00
7	3	67000.00	0.00	فاتورة توريد بضاعة شهرية	1	2026-08-07 12:00:37+00
8	6	75100.00	37550.00	فاتورة توريد بضاعة شهرية	1	2026-08-25 12:00:44+00
9	6	79800.00	39900.00	فاتورة توريد بضاعة شهرية	1	2026-08-29 12:00:41+00
10	1	63500.00	0.00	فاتورة توريد بضاعة شهرية	1	2026-09-07 12:00:53+00
11	7	72100.00	0.00	فاتورة توريد بضاعة شهرية	1	2026-08-02 12:00:06+00
12	5	72900.00	36450.00	فاتورة توريد بضاعة شهرية	1	2026-08-26 12:00:48+00
\.


--
-- Data for Name: settings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.settings (key, value, updated_at, updated_by) FROM stdin;
\.


--
-- Data for Name: stock_movements; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.stock_movements (id, product_id, change, type, ref_id, note, created_at) FROM stdin;
1	1	-2.000	sale	212	فاتورة بيع INV-000212	2026-09-29 17:15:51.57947+00
2	8	-1.000	sale	212	فاتورة بيع INV-000212	2026-09-29 17:15:51.57947+00
\.


--
-- Data for Name: suppliers; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.suppliers (id, name, phone, email, address, company, notes, active, created_at) FROM stdin;
1	شركة جهينة للصناعات الغذائية	0227380100	\N	مدينة 6 أكتوبر الصناعية	جهينة	\N	t	2026-09-29 16:40:04.544899+00
2	المراعي للألبان	0115544332	\N	العاشر من رمضان	المراعي	\N	t	2026-09-29 16:40:04.546389+00
3	أراب فود للتوزيع	0100123456	\N	المنطقة الصناعية - العبور	أراب فود	\N	t	2026-09-29 16:40:04.547433+00
4	بروكتر آند جامبل مصر	0224990000	\N	التجمع الخامس	P&G	\N	t	2026-09-29 16:40:04.548301+00
5	يونيليفر مشرق	0226180000	\N	مدينة نصر	يونيليفر	\N	t	2026-09-29 16:40:04.549257+00
6	شركة ايديتا للصناعات الغذائية	0235330000	\N	6 أكتوبر	ايديتا	\N	t	2026-09-29 16:40:04.550199+00
7	بيتزا ريدتش للمخبوزات	0101999887	\N	شبرا الخيمة	ريدتش	\N	t	2026-09-29 16:40:04.551066+00
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, username, password_hash, full_name, role, permissions, active, created_at, theme, failed_attempts, locked_until, last_login_at, session_version) FROM stdin;
2	manager	5b89c769b58c1d805cb13b8ab60539cf:3b52252eafed7fb0e5271415c16b8f6e66f72716e8695e91719626d8dbf15a5c	خالد الحربي	manager	["sell", "void_invoice", "edit_price", "add_debt", "collect_debt", "view_profits", "view_reports", "add_product", "delete_product", "manage_inventory", "manage_customers", "manage_suppliers", "manage_expenses"]	t	2026-09-29 16:40:04.421535+00	dark	0	\N	\N	0
3	cashier	1a80532abfe2a3ed8126b43a5a6ae5f3:ecf4d83e733a0ded4d739348fc126824e02ad5eb7e96cd911fca6741d42d528a	سارة أحمد	cashier	["sell", "add_debt", "collect_debt"]	t	2026-09-29 16:40:04.459059+00	dark	0	\N	\N	0
4	store	9aa047bd56e6d261ca25b9546e2d8e71:0df5cc93a2bb4f9cebfb26ede3c7cdeefcf0cd824be9de001e617dfcbab20e3a	يوسف عبد الله	warehouse	["add_product", "manage_inventory"]	t	2026-09-29 16:40:04.496272+00	dark	0	\N	\N	0
5	accountant	54deb7444b9dc30abf08497c0b690127:1a886b1c6c0e0ec5560c72cb945cd30ecddc75ca64bb967038077bc12f901af2	منى حسن	accountant	["view_reports", "view_profits", "collect_debt", "manage_expenses", "manage_suppliers"]	t	2026-09-29 16:40:04.534992+00	dark	0	\N	\N	0
1	admin	$2b$12$V34HPKyilL.XMrjqvFaLauYQ2fTZOp3aoe/lynOu9739gevB3EoZC	عمر السبيعي	admin	["sell", "void_invoice", "edit_price", "add_debt", "collect_debt", "view_profits", "view_reports", "add_product", "delete_product", "manage_inventory", "manage_customers", "manage_suppliers", "manage_expenses", "manage_employees"]	t	2026-09-29 16:40:04.375725+00	dark	0	\N	2026-09-30 07:24:42.007+00	0
\.


--
-- Name: audit_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.audit_logs_id_seq', 1, true);


--
-- Name: backups_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.backups_id_seq', 1, false);


--
-- Name: categories_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.categories_id_seq', 7, true);


--
-- Name: customers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.customers_id_seq', 10, true);


--
-- Name: expenses_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.expenses_id_seq', 26, true);


--
-- Name: invoice_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.invoice_items_id_seq', 619, true);


--
-- Name: invoices_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.invoices_id_seq', 212, true);


--
-- Name: notifications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.notifications_id_seq', 4, true);


--
-- Name: payments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.payments_id_seq', 211, true);


--
-- Name: products_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.products_id_seq', 34, true);


--
-- Name: purchases_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.purchases_id_seq', 12, true);


--
-- Name: stock_movements_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.stock_movements_id_seq', 2, true);


--
-- Name: suppliers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.suppliers_id_seq', 7, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.users_id_seq', 5, true);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: backups backups_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.backups
    ADD CONSTRAINT backups_pkey PRIMARY KEY (id);


--
-- Name: categories categories_name_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_name_unique UNIQUE (name);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: customers customers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_pkey PRIMARY KEY (id);


--
-- Name: expenses expenses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_pkey PRIMARY KEY (id);


--
-- Name: invoice_items invoice_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_items
    ADD CONSTRAINT invoice_items_pkey PRIMARY KEY (id);


--
-- Name: invoices invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: products products_barcode_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_barcode_unique UNIQUE (barcode);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: products products_sku_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_sku_unique UNIQUE (sku);


--
-- Name: purchases purchases_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchases
    ADD CONSTRAINT purchases_pkey PRIMARY KEY (id);


--
-- Name: settings settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT settings_pkey PRIMARY KEY (key);


--
-- Name: stock_movements stock_movements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_movements
    ADD CONSTRAINT stock_movements_pkey PRIMARY KEY (id);


--
-- Name: suppliers suppliers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT suppliers_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_unique UNIQUE (username);


--
-- Name: idx_audit_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_created ON public.audit_logs USING btree (created_at DESC);


--
-- Name: idx_invoices_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoices_created ON public.invoices USING btree (created_at DESC);


--
-- Name: idx_invoices_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoices_customer ON public.invoices USING btree (customer_id);


--
-- Name: idx_items_invoice; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_items_invoice ON public.invoice_items USING btree (invoice_id);


--
-- Name: idx_items_product; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_items_product ON public.invoice_items USING btree (product_id);


--
-- Name: idx_notif_read; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notif_read ON public.notifications USING btree (read, created_at DESC);


--
-- Name: idx_payments_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payments_customer ON public.payments USING btree (customer_id);


--
-- Name: idx_products_cat; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_cat ON public.products USING btree (category_id) WHERE active;


--
-- Name: expenses expenses_created_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_created_by_users_id_fk FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: invoice_items invoice_items_invoice_id_invoices_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_items
    ADD CONSTRAINT invoice_items_invoice_id_invoices_id_fk FOREIGN KEY (invoice_id) REFERENCES public.invoices(id);


--
-- Name: invoice_items invoice_items_product_id_products_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_items
    ADD CONSTRAINT invoice_items_product_id_products_id_fk FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: invoices invoices_customer_id_customers_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_customer_id_customers_id_fk FOREIGN KEY (customer_id) REFERENCES public.customers(id);


--
-- Name: invoices invoices_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: payments payments_created_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_created_by_users_id_fk FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: payments payments_customer_id_customers_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_customer_id_customers_id_fk FOREIGN KEY (customer_id) REFERENCES public.customers(id);


--
-- Name: payments payments_invoice_id_invoices_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_invoice_id_invoices_id_fk FOREIGN KEY (invoice_id) REFERENCES public.invoices(id);


--
-- Name: products products_category_id_categories_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_category_id_categories_id_fk FOREIGN KEY (category_id) REFERENCES public.categories(id);


--
-- Name: products products_supplier_id_suppliers_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_supplier_id_suppliers_id_fk FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id);


--
-- Name: purchases purchases_created_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchases
    ADD CONSTRAINT purchases_created_by_users_id_fk FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: purchases purchases_supplier_id_suppliers_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchases
    ADD CONSTRAINT purchases_supplier_id_suppliers_id_fk FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id);


--
-- Name: stock_movements stock_movements_product_id_products_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_movements
    ADD CONSTRAINT stock_movements_product_id_products_id_fk FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- PostgreSQL database dump complete
--

\unrestrict ouzUZ1MmgPcNQq8SqtnQBcbQUBKaX7xCmXdNnKdfs9hTQauputBfIfc73qut3e9

