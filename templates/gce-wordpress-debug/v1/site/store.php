<?php
// The demo store of the WordPress lab VM, run with `wp eval-file store.php --user=1`.
// Store settings in Brazilian reais, payment and shipping for a simulated checkout, the
// catalog (photos from the WooCommerce sample data), the pages and the main menu.
// Every item is looked up first (product by SKU, term and page by slug, photo by source
// URL), so running it again updates the store instead of duplicating it.

if ( ! class_exists( 'WooCommerce' ) ) {
	WP_CLI::error( 'WooCommerce is not active.' );
}
require_once ABSPATH . 'wp-admin/includes/media.php';
require_once ABSPATH . 'wp-admin/includes/file.php';
require_once ABSPATH . 'wp-admin/includes/image.php';

const S8_PHOTOS = 'https://woocommercecore.mystagingwebsite.com/wp-content/uploads/2017/12/';

// ---------------------------------------------------------------- settings

$options = [
	'woocommerce_currency'                   => 'BRL',
	'woocommerce_currency_pos'               => 'left_space',
	'woocommerce_price_thousand_sep'         => '.',
	'woocommerce_price_decimal_sep'          => ',',
	'woocommerce_price_num_decimals'         => 2,
	'woocommerce_default_country'            => 'BR:SP',
	'woocommerce_store_address'              => 'Av. Paulista, 1000',
	'woocommerce_store_city'                 => 'São Paulo',
	'woocommerce_store_postcode'             => '01310-100',
	'woocommerce_allowed_countries'          => 'specific',
	'woocommerce_specific_allowed_countries' => [ 'BR' ],
	'woocommerce_ship_to_countries'          => '',
	'woocommerce_weight_unit'                => 'kg',
	'woocommerce_dimension_unit'             => 'cm',
	'woocommerce_calc_taxes'                 => 'no',
	'woocommerce_enable_guest_checkout'      => 'yes',
	'woocommerce_enable_reviews'             => 'yes',
	'woocommerce_coming_soon'                => 'no',
	'woocommerce_store_pages_only'           => 'no',
	'woocommerce_task_list_hidden'           => 'yes',
	'woocommerce_onboarding_profile'         => [ 'skipped' => true ],
	'woocommerce_cod_settings'               => [
		'enabled'            => 'yes',
		'title'              => 'Pagamento na entrega',
		'description'        => 'Pague em dinheiro ou cartão quando receber o pedido.',
		'instructions'       => 'Tenha o valor do pedido em mãos na entrega.',
		'enable_for_methods' => [],
		'enable_for_virtual' => 'yes',
	],
	'woocommerce_bacs_settings'              => [
		'enabled'      => 'yes',
		'title'        => 'Pix ou transferência bancária',
		'description'  => 'Os dados para o pagamento aparecem depois de você finalizar o pedido. O pedido é enviado quando o pagamento é confirmado.',
		'instructions' => 'Use o número do pedido como identificação do pagamento.',
	],
];
foreach ( $options as $name => $value ) {
	update_option( $name, $value );
}
WP_CLI::log( 'settings: ' . count( $options ) . ' options' );

// One zone for the whole country: fixed rate, free above R$ 299.
$zone = null;
foreach ( WC_Shipping_Zones::get_zones() as $z ) {
	if ( 'Brasil' === $z['zone_name'] ) {
		$zone = new WC_Shipping_Zone( $z['id'] );
	}
}
if ( ! $zone ) {
	$zone = new WC_Shipping_Zone();
	$zone->set_zone_name( 'Brasil' );
	$zone->add_location( 'BR', 'country' );
	$zone->save();
}
$methods = [];
foreach ( $zone->get_shipping_methods() as $m ) {
	$methods[ $m->id ] = $m->instance_id;
}
$methods['flat_rate']     = $methods['flat_rate'] ?? $zone->add_shipping_method( 'flat_rate' );
$methods['free_shipping'] = $methods['free_shipping'] ?? $zone->add_shipping_method( 'free_shipping' );
update_option( "woocommerce_flat_rate_{$methods['flat_rate']}_settings", [ 'title' => 'Frete fixo', 'tax_status' => 'none', 'cost' => '19.90' ] );
update_option( "woocommerce_free_shipping_{$methods['free_shipping']}_settings", [ 'title' => 'Frete grátis', 'requires' => 'min_amount', 'min_amount' => '299', 'ignore_discounts' => 'no' ] );
WP_CLI::log( 'shipping: zone Brasil' );

// ---------------------------------------------------------------- helpers

function s8_photo( string $file, string $title ): int {
	global $wpdb;
	$url = S8_PHOTOS . $file;
	$id  = (int) $wpdb->get_var( $wpdb->prepare( "SELECT post_id FROM {$wpdb->postmeta} WHERE meta_key = '_source_url' AND meta_value = %s LIMIT 1", $url ) );
	if ( $id ) {
		return $id;
	}
	$id = media_sideload_image( $url, 0, $title, 'id' );
	if ( is_wp_error( $id ) ) {
		WP_CLI::warning( "$file: " . $id->get_error_message() );
		return 0;
	}
	update_post_meta( $id, '_wp_attachment_image_alt', $title );
	return (int) $id;
}

function s8_category( string $name, string $slug, int $parent = 0, string $description = '' ): int {
	$term = get_term_by( 'slug', $slug, 'product_cat' );
	if ( $term ) {
		wp_update_term( $term->term_id, 'product_cat', [ 'name' => $name, 'parent' => $parent, 'description' => $description ] );
		return (int) $term->term_id;
	}
	$r = wp_insert_term( $name, 'product_cat', [ 'slug' => $slug, 'parent' => $parent, 'description' => $description ] );
	return (int) $r['term_id'];
}

/** A global attribute (pa_<slug>) and its terms, as [id, taxonomy, term ids by slug]. */
function s8_attribute( string $slug, string $label, array $terms ): array {
	$id = wc_attribute_taxonomy_id_by_name( $slug );
	if ( ! $id ) {
		$id = wc_create_attribute( [ 'name' => $label, 'slug' => $slug, 'type' => 'select', 'order_by' => 'menu_order', 'has_archives' => false ] );
	}
	$tax = wc_attribute_taxonomy_name( $slug );
	if ( ! taxonomy_exists( $tax ) ) {
		register_taxonomy( $tax, [ 'product' ], [ 'hierarchical' => false, 'label' => $label, 'query_var' => true, 'rewrite' => false ] );
	}
	$ids   = [];
	$order = 0;
	foreach ( $terms as $term_slug => $term_name ) {
		$term = get_term_by( 'slug', $term_slug, $tax );
		$ids[ $term_slug ] = $term ? (int) $term->term_id : (int) wp_insert_term( $term_name, $tax, [ 'slug' => $term_slug ] )['term_id'];
		update_term_meta( $ids[ $term_slug ], 'order', $order++ );
	}
	return [ 'id' => (int) $id, 'tax' => $tax, 'terms' => $ids ];
}

function s8_product_attribute( array $attribute, array $slugs, bool $for_variations ): WC_Product_Attribute {
	$a = new WC_Product_Attribute();
	$a->set_id( $attribute['id'] );
	$a->set_name( $attribute['tax'] );
	$a->set_options( array_map( fn( $s ) => $attribute['terms'][ $s ], $slugs ) );
	$a->set_visible( true );
	$a->set_variation( $for_variations );
	return $a;
}

function s8_save_product( array $d ): int {
	$classes = [ 'simple' => 'WC_Product_Simple', 'variable' => 'WC_Product_Variable', 'grouped' => 'WC_Product_Grouped' ];
	$id      = wc_get_product_id_by_sku( $d['sku'] );
	$p       = new $classes[ $d['type'] ]( $id );
	$p->set_name( $d['name'] );
	$p->set_slug( $d['slug'] );
	if ( ! $id ) {
		$p->set_sku( $d['sku'] );
	}
	$p->set_status( 'publish' );
	$p->set_catalog_visibility( 'visible' );
	$p->set_short_description( $d['short'] );
	$p->set_description( $d['description'] );
	$p->set_category_ids( $d['categories'] );
	$p->set_featured( $d['featured'] ?? false );
	$p->set_image_id( $d['image'] );
	$p->set_gallery_image_ids( $d['gallery'] ?? [] );
	$p->set_attributes( $d['attributes'] ?? [] );
	$p->set_reviews_allowed( true );
	if ( 'simple' === $d['type'] ) {
		$p->set_regular_price( $d['price'] );
		$p->set_sale_price( $d['sale'] ?? '' );
		$p->set_manage_stock( true );
		$p->set_stock_quantity( $d['stock'] ?? 30 );
		$p->set_weight( $d['weight'] ?? '0.3' );
	}
	if ( 'variable' === $d['type'] ) {
		$p->set_default_attributes( $d['defaults'] ?? [] );
	}
	if ( 'grouped' === $d['type'] ) {
		$p->set_children( $d['children'] );
	}
	return (int) $p->save();
}

function s8_save_variation( int $parent, array $v ): void {
	$id = wc_get_product_id_by_sku( $v['sku'] );
	$p  = new WC_Product_Variation( $id );
	$p->set_parent_id( $parent );
	if ( ! $id ) {
		$p->set_sku( $v['sku'] );
	}
	$p->set_attributes( $v['attributes'] );
	$p->set_regular_price( $v['price'] );
	$p->set_sale_price( $v['sale'] ?? '' );
	$p->set_image_id( $v['image'] );
	$p->set_manage_stock( true );
	$p->set_stock_quantity( $v['stock'] ?? 20 );
	$p->set_weight( '0.6' );
	$p->set_status( 'publish' );
	$p->save();
}

function s8_page( string $slug, string $title, string $content, string $template = '' ): int {
	$page = get_page_by_path( $slug );
	$data = [ 'post_type' => 'page', 'post_status' => 'publish', 'post_name' => $slug, 'post_title' => $title, 'post_content' => $content ];
	$id   = $page ? wp_update_post( [ 'ID' => $page->ID ] + $data ) : wp_insert_post( $data );
	if ( $template ) {
		update_post_meta( $id, '_wp_page_template', $template );
	}
	return (int) $id;
}

// ---------------------------------------------------------------- catalog

$photo = [];
foreach ( [
	'vneck-tee-2.jpg'             => 'Camiseta gola V vermelha',
	'vnech-tee-green-1.jpg'       => 'Camiseta gola V verde',
	'vnech-tee-blue-1.jpg'        => 'Camiseta gola V azul',
	'hoodie-2.jpg'                => 'Moletom com capuz vermelho',
	'hoodie-green-1.jpg'          => 'Moletom com capuz verde',
	'hoodie-blue-1.jpg'           => 'Moletom com capuz azul',
	'hoodie-with-logo-2.jpg'      => 'Moletom azul com logo',
	'tshirt-2.jpg'                => 'Camiseta básica cinza',
	'beanie-2.jpg'                => 'Gorro vermelho',
	'belt-2.jpg'                  => 'Cinto de couro',
	'cap-2.jpg'                   => 'Boné amarelo',
	'sunglasses-2.jpg'            => 'Óculos de sol',
	'hoodie-with-pocket-2.jpg'    => 'Moletom cinza com bolso',
	'hoodie-with-zipper-2.jpg'    => 'Moletom com zíper',
	'long-sleeve-tee-2.jpg'       => 'Camiseta manga longa verde',
	'polo-2.jpg'                  => 'Camisa polo azul',
	't-shirt-with-logo-1.jpg'     => 'Camiseta cinza com logo',
	'beanie-with-logo-1.jpg'      => 'Gorro vermelho com logo',
	'logo-1.jpg'                  => 'Coleção Logo',
] as $file => $title ) {
	$photo[ $file ] = s8_photo( $file, $title );
}
WP_CLI::log( 'photos: ' . count( array_filter( $photo ) ) . ' of ' . count( $photo ) );

$cat_roupas    = s8_category( 'Roupas', 'roupas', 0, 'Camisetas e moletons em algodão, do básico ao estampado.' );
$cat_camisetas = s8_category( 'Camisetas', 'camisetas', $cat_roupas, 'Camisetas básicas, gola V, manga longa e polo.' );
$cat_moletons  = s8_category( 'Moletons', 'moletons', $cat_roupas, 'Moletons com capuz, bolso ou zíper, felpados por dentro.' );
$cat_acess     = s8_category( 'Acessórios', 'acessorios', 0, 'Bonés, gorros, cintos e óculos para completar o visual.' );
$cat_logo      = s8_category( 'Coleção Logo', 'colecao-logo', 0, 'Peças com o logo bordado da loja.' );
foreach ( [ $cat_roupas => 'hoodie-with-zipper-2.jpg', $cat_camisetas => 'tshirt-2.jpg', $cat_moletons => 'hoodie-2.jpg', $cat_acess => 'sunglasses-2.jpg', $cat_logo => 'logo-1.jpg' ] as $term => $file ) {
	update_term_meta( $term, 'thumbnail_id', $photo[ $file ] );
}
$default_cat = (int) get_option( 'default_product_cat' );
if ( $default_cat ) {
	wp_update_term( $default_cat, 'product_cat', [ 'name' => 'Outros', 'slug' => 'outros' ] );
}

$cor     = s8_attribute( 'cor', 'Cor', [ 'azul' => 'Azul', 'verde' => 'Verde', 'vermelho' => 'Vermelho', 'cinza' => 'Cinza', 'amarelo' => 'Amarelo' ] );
$tamanho = s8_attribute( 'tamanho', 'Tamanho', [ 'p' => 'P', 'm' => 'M', 'g' => 'G', 'gg' => 'GG' ] );
$sizes   = [ 'p', 'm', 'g', 'gg' ];
$a_cor   = fn( string $c ) => [ s8_product_attribute( $cor, [ $c ], false ) ];
// A garment of one color: chosen by size, each size a variation at the same price.
$a_roupa = fn( string $c ) => [ s8_product_attribute( $cor, [ $c ], false ), s8_product_attribute( $tamanho, $sizes, true ) ];

$simple = [
	[ 'sku' => 'moletom-logo', 'name' => 'Moletom com Logo', 'price' => '229.90', 'categories' => [ $cat_moletons, $cat_logo ], 'image' => 'hoodie-with-logo-2.jpg', 'attributes' => $a_roupa( 'azul' ),
	  'short' => 'Moletom azul com capuz e o logo da loja bordado no peito.',
	  'description' => 'Moletom em algodão com poliéster, felpado por dentro, com capuz forrado e bolso canguru. O logo é bordado, não estampado, e mantém a cor depois de muitas lavagens.' ],
	[ 'sku' => 'camiseta-basica', 'name' => 'Camiseta Básica', 'price' => '79.90', 'categories' => [ $cat_camisetas ], 'image' => 'tshirt-2.jpg', 'attributes' => $a_roupa( 'cinza' ), 'stock' => 60,
	  'short' => 'Camiseta cinza de gola careca em algodão penteado.',
	  'description' => 'A camiseta que combina com tudo: malha de algodão penteado 30.1, gola careca com ribana e costura dupla na barra. Modelagem reta, nem justa nem larga.' ],
	[ 'sku' => 'gorro', 'name' => 'Gorro de Tricô', 'price' => '89.90', 'sale' => '79.90', 'categories' => [ $cat_acess ], 'image' => 'beanie-2.jpg', 'attributes' => $a_cor( 'vermelho' ), 'weight' => '0.1',
	  'short' => 'Gorro vermelho de tricô com barra dobrada.',
	  'description' => 'Gorro de tricô canelado em acrílico macio, com barra dobrada que cobre as orelhas. Tamanho único, se ajusta a qualquer cabeça.' ],
	[ 'sku' => 'cinto-couro', 'name' => 'Cinto de Couro', 'price' => '289.90', 'sale' => '249.90', 'categories' => [ $cat_acess ], 'image' => 'belt-2.jpg', 'weight' => '0.2', 'stock' => 12,
	  'short' => 'Cinto de couro legítimo com fivela de metal escovado.',
	  'description' => 'Cinto em couro bovino legítimo de 3,5 cm de largura, com fivela de metal escovado e cinco furos de ajuste. Acompanha o desgaste natural do couro com o uso.' ],
	[ 'sku' => 'bone', 'name' => 'Boné Aba Curva', 'price' => '79.90', 'sale' => '69.90', 'categories' => [ $cat_acess ], 'image' => 'cap-2.jpg', 'attributes' => $a_cor( 'amarelo' ), 'featured' => true, 'weight' => '0.1',
	  'short' => 'Boné amarelo de aba curva com regulagem traseira.',
	  'description' => 'Boné de sarja de algodão com seis gomos, aba curva e fecho de regulagem traseiro. Ilhoses bordados para ventilação.' ],
	[ 'sku' => 'oculos-sol', 'name' => 'Óculos de Sol', 'price' => '399.90', 'categories' => [ $cat_acess ], 'image' => 'sunglasses-2.jpg', 'featured' => true, 'weight' => '0.1', 'stock' => 8,
	  'short' => 'Óculos de sol com lentes polarizadas e proteção UV400.',
	  'description' => 'Armação em acetato com lentes polarizadas e proteção UV400. Acompanha estojo rígido e flanela de limpeza.' ],
	[ 'sku' => 'moletom-bolso', 'name' => 'Moletom com Bolso', 'price' => '219.90', 'sale' => '169.90', 'categories' => [ $cat_moletons ], 'image' => 'hoodie-with-pocket-2.jpg', 'attributes' => $a_roupa( 'cinza' ), 'featured' => true,
	  'short' => 'Moletom cinza com capuz e bolso canguru.',
	  'description' => 'Moletom com capuz, punhos e barra em ribana e bolso canguru amplo. Felpado por dentro, para os dias frios.' ],
	[ 'sku' => 'moletom-ziper', 'name' => 'Moletom com Zíper', 'price' => '239.90', 'categories' => [ $cat_moletons ], 'image' => 'hoodie-with-zipper-2.jpg', 'attributes' => $a_roupa( 'cinza' ), 'featured' => true,
	  'short' => 'Moletom aberto com zíper frontal e capuz.',
	  'description' => 'Moletom aberto com zíper de metal, capuz com cordão e dois bolsos laterais. Fácil de vestir por cima de uma camiseta.' ],
	[ 'sku' => 'camiseta-manga-longa', 'name' => 'Camiseta Manga Longa', 'price' => '119.90', 'categories' => [ $cat_camisetas ], 'image' => 'long-sleeve-tee-2.jpg', 'attributes' => $a_roupa( 'verde' ),
	  'short' => 'Camiseta verde de manga longa em algodão.',
	  'description' => 'Camiseta de manga longa em malha de algodão, com punhos em ribana. Boa sozinha na meia-estação ou como segunda camada no inverno.' ],
	[ 'sku' => 'camisa-polo', 'name' => 'Camisa Polo', 'price' => '99.90', 'categories' => [ $cat_camisetas ], 'image' => 'polo-2.jpg', 'attributes' => $a_roupa( 'azul' ),
	  'short' => 'Camisa polo azul em piquet de algodão.',
	  'description' => 'Polo em malha piquet de algodão, com gola e punhos em ribana e três botões. Fica bem no trabalho e no fim de semana.' ],
	[ 'sku' => 'camiseta-logo', 'name' => 'Camiseta com Logo', 'price' => '84.90', 'categories' => [ $cat_camisetas, $cat_logo ], 'image' => 't-shirt-with-logo-1.jpg', 'attributes' => $a_roupa( 'cinza' ),
	  'short' => 'Camiseta cinza com o logo da loja estampado.',
	  'description' => 'A nossa camiseta básica, com o logo da loja estampado em silk no peito. Malha de algodão penteado.' ],
	[ 'sku' => 'gorro-logo', 'name' => 'Gorro com Logo', 'price' => '89.90', 'sale' => '79.90', 'categories' => [ $cat_acess, $cat_logo ], 'image' => 'beanie-with-logo-1.jpg', 'attributes' => $a_cor( 'vermelho' ), 'weight' => '0.1',
	  'short' => 'Gorro vermelho de tricô com o logo bordado.',
	  'description' => 'O gorro de tricô canelado com o logo da loja bordado na barra dobrada. Tamanho único.' ],
];
$ids = [];
foreach ( $simple as $d ) {
	$by_size    = count( $d['attributes'] ?? [] ) > 1;
	$d['type']  = $by_size ? 'variable' : 'simple';
	$d['slug']  = $d['sku'];
	$d['image'] = $photo[ $d['image'] ];
	if ( $by_size ) {
		$d['defaults'] = [ $tamanho['tax'] => 'm' ];
	}
	$id = s8_save_product( $d );
	if ( $by_size ) {
		foreach ( $sizes as $size ) {
			s8_save_variation( $id, [
				'sku'        => "{$d['sku']}-$size",
				'attributes' => [ $tamanho['tax'] => $size ],
				'price'      => $d['price'],
				'sale'       => $d['sale'] ?? '',
				'image'      => $d['image'],
				'stock'      => 'gg' === $size ? 5 : 12,
			] );
		}
		WC_Product_Variable::sync( $id );
	}
	$ids[ $d['sku'] ] = $id;
}

$variable = [
	[ 'sku' => 'camiseta-gola-v', 'name' => 'Camiseta Gola V', 'categories' => [ $cat_camisetas ], 'featured' => true,
	  'short' => 'Camiseta de gola V em algodão, em três cores.',
	  'description' => 'Camiseta de gola V em malha de algodão penteado com elastano, que mantém a forma depois da lavagem. Escolha a cor e o tamanho.',
	  'colors' => [ 'vermelho' => [ 'vneck-tee-2.jpg', '89.90', '' ], 'verde' => [ 'vnech-tee-green-1.jpg', '89.90', '' ], 'azul' => [ 'vnech-tee-blue-1.jpg', '89.90', '69.90' ] ] ],
	[ 'sku' => 'moletom-capuz', 'name' => 'Moletom com Capuz', 'categories' => [ $cat_moletons ],
	  'short' => 'Moletom clássico com capuz, em três cores.',
	  'description' => 'O moletom clássico: capuz com cordão, bolso canguru e punhos em ribana. Algodão com poliéster, felpado por dentro.',
	  'colors' => [ 'vermelho' => [ 'hoodie-2.jpg', '219.90', '199.90' ], 'verde' => [ 'hoodie-green-1.jpg', '219.90', '' ], 'azul' => [ 'hoodie-blue-1.jpg', '219.90', '' ] ] ],
];
foreach ( $variable as $d ) {
	$colors          = array_keys( $d['colors'] );
	$d['type']       = 'variable';
	$d['slug']       = $d['sku'];
	$d['image']      = $photo[ $d['colors'][ $colors[0] ][0] ];
	$d['gallery']    = array_map( fn( $c ) => $photo[ $c[0] ], array_slice( array_values( $d['colors'] ), 1 ) );
	$d['attributes'] = [ s8_product_attribute( $cor, $colors, true ), s8_product_attribute( $tamanho, $sizes, true ) ];
	$d['defaults']   = [ $cor['tax'] => $colors[0], $tamanho['tax'] => 'm' ];
	$parent          = s8_save_product( $d );
	foreach ( $d['colors'] as $color => [ $file, $price, $sale ] ) {
		foreach ( $sizes as $size ) {
			s8_save_variation( $parent, [
				'sku'        => "{$d['sku']}-$color-$size",
				'attributes' => [ $cor['tax'] => $color, $tamanho['tax'] => $size ],
				'price'      => $price,
				'sale'       => $sale,
				'image'      => $photo[ $file ],
				'stock'      => 'gg' === $size ? 6 : 15,
			] );
		}
	}
	WC_Product_Variable::sync( $parent );
	$ids[ $d['sku'] ] = $parent;
}

$ids['kit-logo'] = s8_save_product( [
	'type'        => 'grouped',
	'sku'         => 'kit-logo',
	'slug'        => 'kit-logo',
	'name'        => 'Kit Coleção Logo',
	'categories'  => [ $cat_logo ],
	'featured'    => true,
	'image'       => $photo['logo-1.jpg'],
	'gallery'     => [ $photo['hoodie-with-logo-2.jpg'], $photo['t-shirt-with-logo-1.jpg'], $photo['beanie-with-logo-1.jpg'] ],
	'children'    => [ $ids['moletom-logo'], $ids['camiseta-logo'], $ids['gorro-logo'] ],
	'short'       => 'Moletom, camiseta e gorro da Coleção Logo. Escolha as peças e as quantidades.',
	'description' => 'As três peças da Coleção Logo em uma página só. Adicione ao carrinho as que quiser, cada uma na quantidade que precisar.',
] );
WP_CLI::log( 'products: ' . count( $ids ) );

// ---------------------------------------------------------------- pages

foreach ( [ 'shop' => [ 'Loja', 'loja' ], 'cart' => [ 'Carrinho', 'carrinho' ], 'checkout' => [ 'Finalizar compra', 'finalizar-compra' ], 'myaccount' => [ 'Minha conta', 'minha-conta' ] ] as $key => [ $title, $slug ] ) {
	$page_id = wc_get_page_id( $key );
	if ( $page_id > 0 ) {
		wp_update_post( [ 'ID' => $page_id, 'post_title' => $title, 'post_name' => $slug ] );
	}
}
foreach ( [ 'hello-world', 'ola-mundo' ] as $slug ) {
	$post = get_page_by_path( $slug, OBJECT, 'post' );
	if ( $post ) {
		wp_delete_post( $post->ID, true );
	}
}
foreach ( [ 'sample-page', 'pagina-exemplo' ] as $slug ) {
	$page = get_page_by_path( $slug );
	if ( $page ) {
		wp_delete_post( $page->ID, true );
	}
}

$shop_url = get_permalink( wc_get_page_id( 'shop' ) );
$img      = fn( string $file ) => wp_get_attachment_image_url( $photo[ $file ], 'large' );
$link     = fn( int $term ) => get_term_link( $term, 'product_cat' );
$section  = fn( string $title, string $shortcode, string $more = '' ) => <<<HTML
<!-- wp:group {"align":"wide","style":{"spacing":{"padding":{"top":"var:preset|spacing|50"}}},"layout":{"type":"constrained","contentSize":"1200px"}} -->
<div class="wp-block-group alignwide" style="padding-top:var(--wp--preset--spacing--50)">
<!-- wp:heading {"textAlign":"center"} --><h2 class="wp-block-heading has-text-align-center">$title</h2><!-- /wp:heading -->
<!-- wp:shortcode -->$shortcode<!-- /wp:shortcode -->
$more
</div>
<!-- /wp:group -->
HTML;
$button = fn( string $label, string $url ) => <<<HTML
<!-- wp:buttons {"layout":{"type":"flex","justifyContent":"center"}} --><div class="wp-block-buttons"><!-- wp:button {"className":"is-style-outline"} --><div class="wp-block-button is-style-outline"><a class="wp-block-button__link wp-element-button" href="$url">$label</a></div><!-- /wp:button --></div><!-- /wp:buttons -->
HTML;
$benefit = fn( string $title, string $text ) => <<<HTML
<!-- wp:column --><div class="wp-block-column"><!-- wp:heading {"textAlign":"center","level":3,"fontSize":"large"} --><h3 class="wp-block-heading has-text-align-center has-large-font-size">$title</h3><!-- /wp:heading --><!-- wp:paragraph {"align":"center"} --><p class="has-text-align-center">$text</p><!-- /wp:paragraph --></div><!-- /wp:column -->
HTML;

$hero_img  = $img( 'hoodie-with-zipper-2.jpg' );
$logo_img  = $img( 'logo-1.jpg' );
$moletons  = $link( $cat_moletons );
$kit_url   = get_permalink( $ids['kit-logo'] );
$cats      = implode( ',', [ $cat_camisetas, $cat_moletons, $cat_acess, $cat_logo ] );
$benefits  = $benefit( 'Frete grátis', 'Nas compras acima de R$ 299, para todo o Brasil.' )
	. $benefit( 'Pix ou na entrega', 'Pague por Pix, transferência ou quando receber o pedido.' )
	. $benefit( 'Troca em 30 dias', 'A primeira troca de tamanho ou cor não tem custo.' );
$s_cats    = $section( 'Compre por categoria', '[product_categories ids="' . $cats . '" columns="4" hide_empty="1"]' );
$s_sale    = $section( 'Em promoção', '[products limit="4" columns="4" on_sale="true" orderby="popularity"]' );
$s_feat    = $section( 'Destaques', '[products limit="4" columns="4" visibility="featured" orderby="rand"]' );
$s_new     = $section( 'Novidades', '[products limit="8" columns="4" orderby="date" order="DESC"]', $button( 'Ver todos os produtos', $shop_url ) );
$home      = <<<HTML
<!-- wp:group {"align":"full","style":{"spacing":{"padding":{"top":"var:preset|spacing|70","bottom":"var:preset|spacing|70","left":"var:preset|spacing|50","right":"var:preset|spacing|50"},"margin":{"top":"0"}}},"backgroundColor":"accent-3","textColor":"base","layout":{"type":"constrained","contentSize":"1200px"}} -->
<div class="wp-block-group alignfull has-base-color has-accent-3-background-color has-text-color has-background" style="margin-top:0;padding-top:var(--wp--preset--spacing--70);padding-right:var(--wp--preset--spacing--50);padding-bottom:var(--wp--preset--spacing--70);padding-left:var(--wp--preset--spacing--50)">
<!-- wp:columns {"verticalAlignment":"center","style":{"spacing":{"blockGap":{"left":"var:preset|spacing|60"}}}} -->
<div class="wp-block-columns are-vertically-aligned-center">
<!-- wp:column {"verticalAlignment":"center","width":"55%"} -->
<div class="wp-block-column is-vertically-aligned-center" style="flex-basis:55%">
<!-- wp:paragraph {"style":{"typography":{"textTransform":"uppercase","letterSpacing":"3px"}},"fontSize":"small"} --><p class="has-small-font-size" style="letter-spacing:3px;text-transform:uppercase">Coleção outono-inverno</p><!-- /wp:paragraph -->
<!-- wp:heading {"level":1,"fontSize":"xx-large"} --><h1 class="wp-block-heading has-xx-large-font-size">Conforto para todos os dias</h1><!-- /wp:heading -->
<!-- wp:paragraph {"fontSize":"large"} --><p class="has-large-font-size">Moletons, camisetas e acessórios em algodão, com frete grátis nas compras acima de R$ 299.</p><!-- /wp:paragraph -->
<!-- wp:buttons --><div class="wp-block-buttons">
<!-- wp:button {"backgroundColor":"accent-1","textColor":"contrast"} --><div class="wp-block-button"><a class="wp-block-button__link has-contrast-color has-accent-1-background-color has-text-color has-background wp-element-button" href="$shop_url">Ver a loja</a></div><!-- /wp:button -->
<!-- wp:button {"textColor":"base","className":"is-style-outline"} --><div class="wp-block-button is-style-outline"><a class="wp-block-button__link has-base-color has-text-color wp-element-button" href="$moletons">Moletons</a></div><!-- /wp:button -->
</div><!-- /wp:buttons -->
</div>
<!-- /wp:column -->
<!-- wp:column {"verticalAlignment":"center","width":"45%"} -->
<div class="wp-block-column is-vertically-aligned-center" style="flex-basis:45%"><!-- wp:image {"sizeSlug":"large","style":{"border":{"radius":"24px"}}} --><figure class="wp-block-image size-large has-custom-border"><img src="$hero_img" alt="Moletom com zíper" style="border-radius:24px"/></figure><!-- /wp:image --></div>
<!-- /wp:column -->
</div>
<!-- /wp:columns -->
</div>
<!-- /wp:group -->

<!-- wp:group {"align":"full","style":{"spacing":{"padding":{"top":"var:preset|spacing|40","bottom":"var:preset|spacing|40","left":"var:preset|spacing|50","right":"var:preset|spacing|50"},"margin":{"top":"0"}}},"backgroundColor":"accent-5","layout":{"type":"constrained","contentSize":"1200px"}} -->
<div class="wp-block-group alignfull has-accent-5-background-color has-background" style="margin-top:0;padding-top:var(--wp--preset--spacing--40);padding-right:var(--wp--preset--spacing--50);padding-bottom:var(--wp--preset--spacing--40);padding-left:var(--wp--preset--spacing--50)">
<!-- wp:columns --><div class="wp-block-columns">
$benefits
</div><!-- /wp:columns -->
</div>
<!-- /wp:group -->

$s_cats

$s_sale

<!-- wp:group {"align":"wide","style":{"spacing":{"padding":{"top":"var:preset|spacing|60","bottom":"var:preset|spacing|60","left":"var:preset|spacing|50","right":"var:preset|spacing|50"},"margin":{"top":"var:preset|spacing|60"}},"border":{"radius":"24px"}},"backgroundColor":"accent-1","layout":{"type":"constrained","contentSize":"1100px"}} -->
<div class="wp-block-group alignwide has-accent-1-background-color has-background" style="border-radius:24px;margin-top:var(--wp--preset--spacing--60);padding-top:var(--wp--preset--spacing--60);padding-right:var(--wp--preset--spacing--50);padding-bottom:var(--wp--preset--spacing--60);padding-left:var(--wp--preset--spacing--50)">
<!-- wp:columns {"verticalAlignment":"center"} --><div class="wp-block-columns are-vertically-aligned-center">
<!-- wp:column {"verticalAlignment":"center","width":"40%"} --><div class="wp-block-column is-vertically-aligned-center" style="flex-basis:40%"><!-- wp:image {"sizeSlug":"large","style":{"border":{"radius":"16px"}}} --><figure class="wp-block-image size-large has-custom-border"><img src="$logo_img" alt="Coleção Logo" style="border-radius:16px"/></figure><!-- /wp:image --></div><!-- /wp:column -->
<!-- wp:column {"verticalAlignment":"center","width":"60%"} --><div class="wp-block-column is-vertically-aligned-center" style="flex-basis:60%">
<!-- wp:heading {"fontSize":"x-large"} --><h2 class="wp-block-heading has-x-large-font-size">Coleção Logo</h2><!-- /wp:heading -->
<!-- wp:paragraph --><p>Moletom, camiseta e gorro com o logo bordado da loja. Monte o seu kit e escolha a quantidade de cada peça na mesma página.</p><!-- /wp:paragraph -->
<!-- wp:buttons --><div class="wp-block-buttons"><!-- wp:button {"backgroundColor":"contrast","textColor":"base"} --><div class="wp-block-button"><a class="wp-block-button__link has-base-color has-contrast-background-color has-text-color has-background wp-element-button" href="$kit_url">Montar o kit</a></div><!-- /wp:button --></div><!-- /wp:buttons -->
</div><!-- /wp:column -->
</div><!-- /wp:columns -->
</div>
<!-- /wp:group -->

$s_feat

$s_new
HTML;
$home_id = s8_page( 'inicio', 'Início', $home, 'page-no-title' );

$about_id = s8_page( 'sobre', 'Sobre a loja', <<<HTML
<!-- wp:paragraph {"fontSize":"large"} --><p class="has-large-font-size">A CloudMan nasceu para vender roupas simples, bem feitas e confortáveis, sem complicar a compra.</p><!-- /wp:paragraph -->
<!-- wp:paragraph --><p>Escolhemos tecidos de algodão que aguentam o uso e a lavagem, em cortes que funcionam no trabalho e no fim de semana. Cada peça passa por conferência antes de sair do nosso estoque em São Paulo.</p><!-- /wp:paragraph -->
<!-- wp:heading {"level":3} --><h3 class="wp-block-heading">Como enviamos</h3><!-- /wp:heading -->
<!-- wp:paragraph --><p>Enviamos para todo o Brasil. O frete é fixo de R$ 19,90 e fica grátis nas compras acima de R$ 299.</p><!-- /wp:paragraph -->
<!-- wp:paragraph {"fontSize":"small"} --><p class="has-small-font-size"><em>Esta é uma loja de demonstração: os pedidos não são cobrados nem enviados.</em></p><!-- /wp:paragraph -->
HTML );

$contact_id = s8_page( 'contato', 'Contato', <<<HTML
<!-- wp:paragraph --><p>Fale com a gente pelos canais abaixo, de segunda a sexta, das 9h às 18h.</p><!-- /wp:paragraph -->
<!-- wp:list --><ul class="wp-block-list"><!-- wp:list-item --><li><strong>E-mail:</strong> atendimento@loja.example</li><!-- /wp:list-item --><!-- wp:list-item --><li><strong>Endereço:</strong> Av. Paulista, 1000, São Paulo, SP</li><!-- /wp:list-item --></ul><!-- /wp:list -->
<!-- wp:paragraph {"fontSize":"small"} --><p class="has-small-font-size"><em>Esta é uma loja de demonstração: os contatos acima não existem.</em></p><!-- /wp:paragraph -->
HTML );

$returns_content = <<<HTML
<!-- wp:paragraph --><p>Você pode trocar ou devolver qualquer peça em até 30 dias a partir do recebimento, desde que ela esteja sem uso e com a etiqueta.</p><!-- /wp:paragraph -->
<!-- wp:list --><ul class="wp-block-list"><!-- wp:list-item --><li>A primeira troca de tamanho ou cor não tem custo.</li><!-- /wp:list-item --><!-- wp:list-item --><li>Na devolução, o valor é estornado na mesma forma de pagamento em até 10 dias úteis depois que a peça chega ao nosso estoque.</li><!-- /wp:list-item --></ul><!-- /wp:list -->
HTML;
$returns_id = (int) get_option( 'woocommerce_refund_returns_page_id' );
if ( $returns_id && get_post( $returns_id ) ) {
	wp_update_post( [ 'ID' => $returns_id, 'post_title' => 'Trocas e devoluções', 'post_name' => 'trocas-e-devolucoes', 'post_status' => 'publish', 'post_content' => $returns_content ] );
} else {
	$returns_id = s8_page( 'trocas-e-devolucoes', 'Trocas e devoluções', $returns_content );
	update_option( 'woocommerce_refund_returns_page_id', $returns_id );
}

update_option( 'show_on_front', 'page' );
update_option( 'page_on_front', $home_id );

// The header's Navigation block has no menu of its own and shows the most recent one.
// Unescaped JSON: wp_insert_post strips backslashes, which would turn í into u00ed.
$nav_link = fn( string $label, string $url ) => '<!-- wp:navigation-link ' . wp_json_encode( [ 'label' => $label, 'url' => $url, 'kind' => 'custom', 'isTopLevelLink' => true ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES ) . ' /-->';
$nav      = implode( "\n", [
	$nav_link( 'Início', home_url( '/' ) ),
	$nav_link( 'Loja', $shop_url ),
	$nav_link( 'Camisetas', $link( $cat_camisetas ) ),
	$nav_link( 'Moletons', $moletons ),
	$nav_link( 'Acessórios', $link( $cat_acess ) ),
	$nav_link( 'Sobre', get_permalink( $about_id ) ),
	$nav_link( 'Contato', get_permalink( $contact_id ) ),
] );
$menu     = get_posts( [ 'post_type' => 'wp_navigation', 'name' => 'menu-principal', 'post_status' => 'any', 'numberposts' => 1 ] );
$menu_doc = [ 'post_type' => 'wp_navigation', 'post_status' => 'publish', 'post_title' => 'Menu principal', 'post_name' => 'menu-principal', 'post_content' => $nav ];
$menu ? wp_update_post( [ 'ID' => $menu[0]->ID ] + $menu_doc ) : wp_insert_post( $menu_doc );

WP_CLI::success( "store ready: home $home_id, " . count( $ids ) . ' products' );
