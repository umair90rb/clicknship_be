export interface OrderData {
  id: number;
  name: string;
  note: any;
  tags: string;
  test: boolean;
  email: string;
  phone: any;
  token: string;
  app_id: number;
  number: number;
  refunds: any[];
  returns: any[];
  user_id: number;
  currency: string;
  customer: any;
  closed_at: any;
  confirmed: boolean;
  device_id: any;
  po_number: any;
  reference: any;
  tax_lines: any[];
  total_tax: string;
  browser_ip: string;
  cart_token: any;
  created_at: string;
  line_items: LineItem[];
  source_url: any;
  tax_exempt: boolean;
  updated_at: string;
  checkout_id: number;
  location_id: number;
  source_name: string;
  total_price: string;
  cancelled_at: any;
  fulfillments: any[];
  landing_site: any;
  order_number: number;
  processed_at: string;
  total_weight: number;
  cancel_reason: any;
  contact_email: any;
  payment_terms: PaymentTerms;
  total_tax_set: TotalTaxSet;
  checkout_token: string;
  client_details: ClientDetails;
  discount_codes: any[];
  referring_site: any;
  shipping_lines: ShippingLine[];
  subtotal_price: string;
  taxes_included: boolean;
  billing_address: any;
  customer_locale: string;
  duties_included: boolean;
  estimated_taxes: boolean;
  note_attributes: NoteAttribute[];
  total_discounts: string;
  total_price_set: TotalPriceSet;
  financial_status: string;
  landing_site_ref: any;
  order_status_url: string;
  shipping_address: any;
  current_total_tax: string;
  source_identifier: any;
  total_outstanding: string;
  fulfillment_status: any;
  subtotal_price_set: SubtotalPriceSet;
  total_tip_received: string;
  confirmation_number: string;
  current_total_price: string;
  total_discounts_set: TotalDiscountsSet;
  admin_graphql_api_id: string;
  presentment_currency: string;
  current_total_tax_set: CurrentTotalTaxSet;
  discount_applications: any[];
  payment_gateway_names: any[];
  current_subtotal_price: string;
  total_line_items_price: string;
  buyer_accepts_marketing: boolean;
  current_total_discounts: string;
  current_total_price_set: CurrentTotalPriceSet;
  current_total_duties_set: any;
  total_shipping_price_set: TotalShippingPriceSet;
  merchant_of_record_app_id: any;
  original_total_duties_set: any;
  current_shipping_price_set: CurrentShippingPriceSet;
  current_subtotal_price_set: CurrentSubtotalPriceSet;
  total_line_items_price_set: TotalLineItemsPriceSet;
  current_total_discounts_set: CurrentTotalDiscountsSet;
  merchant_business_entity_id: string;
  current_total_additional_fees_set: any;
  original_total_additional_fees_set: any;
  total_cash_rounding_refund_adjustment_set: TotalCashRoundingRefundAdjustmentSet;
  total_cash_rounding_payment_adjustment_set: TotalCashRoundingPaymentAdjustmentSet;
}

export interface LineItem {
  id: number;
  sku: string;
  name: string;
  grams: number;
  price: string;
  title: string;
  duties: any[];
  vendor: string;
  taxable: boolean;
  quantity: number;
  gift_card: boolean;
  price_set: PriceSet;
  tax_lines: any[];
  product_id: number;
  properties: any[];
  variant_id: number;
  variant_title: string;
  product_exists: boolean;
  total_discount: string;
  current_quantity: number;
  requires_shipping: boolean;
  fulfillment_status: any;
  total_discount_set: TotalDiscountSet;
  fulfillment_service: string;
  admin_graphql_api_id: string;
  discount_allocations: any[];
  fulfillable_quantity: number;
  sales_line_item_group_id: any;
  variant_inventory_management: string;
}

export interface PriceSet {
  shop_money: ShopMoney;
  presentment_money: PresentmentMoney;
}

export interface ShopMoney {
  amount: string;
  currency_code: string;
}

export interface PresentmentMoney {
  amount: string;
  currency_code: string;
}

export interface TotalDiscountSet {
  shop_money: ShopMoney2;
  presentment_money: PresentmentMoney2;
}

export interface ShopMoney2 {
  amount: string;
  currency_code: string;
}

export interface PresentmentMoney2 {
  amount: string;
  currency_code: string;
}

export interface PaymentTerms {
  id: number;
  created_at: string;
  updated_at: string;
  due_in_days: any;
  payment_schedules: any[];
  payment_terms_name: string;
  payment_terms_type: string;
}

export interface TotalTaxSet {
  shop_money: ShopMoney3;
  presentment_money: PresentmentMoney3;
}

export interface ShopMoney3 {
  amount: string;
  currency_code: string;
}

export interface PresentmentMoney3 {
  amount: string;
  currency_code: string;
}

export interface ClientDetails {
  browser_ip: string;
  user_agent: string;
  session_hash: any;
  browser_width: any;
  browser_height: any;
  accept_language: any;
}

export interface ShippingLine {
  id: number;
  code: string;
  phone: any;
  price: string;
  title: string;
  source: string;
  price_set: PriceSet2;
  tax_lines: any[];
  is_removed: boolean;
  discounted_price: string;
  carrier_identifier: any;
  discount_allocations: any[];
  discounted_price_set: DiscountedPriceSet;
  current_discounted_price_set: CurrentDiscountedPriceSet;
  requested_fulfillment_service_id: any;
}

export interface PriceSet2 {
  shop_money: ShopMoney4;
  presentment_money: PresentmentMoney4;
}

export interface ShopMoney4 {
  amount: string;
  currency_code: string;
}

export interface PresentmentMoney4 {
  amount: string;
  currency_code: string;
}

export interface DiscountedPriceSet {
  shop_money: ShopMoney5;
  presentment_money: PresentmentMoney5;
}

export interface ShopMoney5 {
  amount: string;
  currency_code: string;
}

export interface PresentmentMoney5 {
  amount: string;
  currency_code: string;
}

export interface CurrentDiscountedPriceSet {
  shop_money: ShopMoney6;
  presentment_money: PresentmentMoney6;
}

export interface ShopMoney6 {
  amount: string;
  currency_code: string;
}

export interface PresentmentMoney6 {
  amount: string;
  currency_code: string;
}

export interface NoteAttribute {
  name: string;
  value: string;
}

export interface TotalPriceSet {
  shop_money: ShopMoney7;
  presentment_money: PresentmentMoney7;
}

export interface ShopMoney7 {
  amount: string;
  currency_code: string;
}

export interface PresentmentMoney7 {
  amount: string;
  currency_code: string;
}

export interface SubtotalPriceSet {
  shop_money: ShopMoney8;
  presentment_money: PresentmentMoney8;
}

export interface ShopMoney8 {
  amount: string;
  currency_code: string;
}

export interface PresentmentMoney8 {
  amount: string;
  currency_code: string;
}

export interface TotalDiscountsSet {
  shop_money: ShopMoney9;
  presentment_money: PresentmentMoney9;
}

export interface ShopMoney9 {
  amount: string;
  currency_code: string;
}

export interface PresentmentMoney9 {
  amount: string;
  currency_code: string;
}

export interface CurrentTotalTaxSet {
  shop_money: ShopMoney10;
  presentment_money: PresentmentMoney10;
}

export interface ShopMoney10 {
  amount: string;
  currency_code: string;
}

export interface PresentmentMoney10 {
  amount: string;
  currency_code: string;
}

export interface CurrentTotalPriceSet {
  shop_money: ShopMoney11;
  presentment_money: PresentmentMoney11;
}

export interface ShopMoney11 {
  amount: string;
  currency_code: string;
}

export interface PresentmentMoney11 {
  amount: string;
  currency_code: string;
}

export interface TotalShippingPriceSet {
  shop_money: ShopMoney12;
  presentment_money: PresentmentMoney12;
}

export interface ShopMoney12 {
  amount: string;
  currency_code: string;
}

export interface PresentmentMoney12 {
  amount: string;
  currency_code: string;
}

export interface CurrentShippingPriceSet {
  shop_money: ShopMoney13;
  presentment_money: PresentmentMoney13;
}

export interface ShopMoney13 {
  amount: string;
  currency_code: string;
}

export interface PresentmentMoney13 {
  amount: string;
  currency_code: string;
}

export interface CurrentSubtotalPriceSet {
  shop_money: ShopMoney14;
  presentment_money: PresentmentMoney14;
}

export interface ShopMoney14 {
  amount: string;
  currency_code: string;
}

export interface PresentmentMoney14 {
  amount: string;
  currency_code: string;
}

export interface TotalLineItemsPriceSet {
  shop_money: ShopMoney15;
  presentment_money: PresentmentMoney15;
}

export interface ShopMoney15 {
  amount: string;
  currency_code: string;
}

export interface PresentmentMoney15 {
  amount: string;
  currency_code: string;
}

export interface CurrentTotalDiscountsSet {
  shop_money: ShopMoney16;
  presentment_money: PresentmentMoney16;
}

export interface ShopMoney16 {
  amount: string;
  currency_code: string;
}

export interface PresentmentMoney16 {
  amount: string;
  currency_code: string;
}

export interface TotalCashRoundingRefundAdjustmentSet {
  shop_money: ShopMoney17;
  presentment_money: PresentmentMoney17;
}

export interface ShopMoney17 {
  amount: string;
  currency_code: string;
}

export interface PresentmentMoney17 {
  amount: string;
  currency_code: string;
}

export interface TotalCashRoundingPaymentAdjustmentSet {
  shop_money: ShopMoney18;
  presentment_money: PresentmentMoney18;
}

export interface ShopMoney18 {
  amount: string;
  currency_code: string;
}

export interface PresentmentMoney18 {
  amount: string;
  currency_code: string;
}
