# API quick reference

Base: `/api/v1/`

## Authentication and customer account

- `POST /token/` — JWT login (`username`, `password`)
- `POST /token/refresh/` — refresh JWT
- `POST /auth/register/` — customer registration
- `GET /auth/me/` — current user
- `GET /areas/` — areas
- `GET /categories/` — categories
- `GET /shops/?area=<area_id>` — approved shops
- `GET /products/?area=<area_id>&search=<term>` — available shop products
- `GET/POST/DELETE /cart/` — current user's cart
- `PATCH/DELETE /cart/items/<id>/` — cart item
- `GET/POST /addresses/` — own addresses
- `POST /checkout/` — place COD order (`address`)
- `GET /orders/` — own orders
- `GET /orders/<uuid>/tracking/` — full tracking details for an owned order
- `GET /track/<tracking_number>/` — public tracking lookup without personal address data
- `GET /admin/orders/` — searchable/filterable admin order list
- `PATCH /admin/orders/<uuid>/status/` — validated admin status update
- `POST /admin/orders/<uuid>/shipment/` — courier and tracking-number setup
- `GET /seller/orders/` — shopkeeper-owned orders
- `PATCH /seller/orders/<uuid>/status/` — permitted seller status update
- `POST /seller/orders/<uuid>/shipment/` — shipment details for an owned order
- `GET /shopkeeper/orders/` — shopkeeper's orders
- `POST /shopkeeper/orders/<uuid>/<accept|reject|preparing|ready>/` — order action
- `GET /delivery/jobs/` — assigned delivery jobs
- `POST /delivery/jobs/<uuid>/<pickup|complete>/` — delivery action
- `POST /auth/register/` — register a customer (`username`, `phone`, `full_name`, `password`)
- `GET /auth/me/` — current authenticated user profile
- `GET /areas/` — active delivery areas
- `GET /addresses/` — list the current user's addresses
- `POST /addresses/` — create an address for the current user

## Marketplace discovery

- `GET /categories/` — active product categories
- `GET /shops/?area=<area_id>&search=<term>` — approved, open shops
- `GET /shops/<id>/` — approved shop details
- `GET /products/?area=<area_id>&shop=<shop_id>&category=<category_id>&search=<term>` — available products offered by local shops
- `GET /catalog/products/?category=<category_id>&search=<term>` — active product catalogue for seller inventory selection

## Cart and checkout

- `GET /cart/` — current user's cart, including the shop's delivery area when set
- `POST /cart/` — add a shop product (`shop_product`, `quantity`)
- `DELETE /cart/` — clear cart
- `PATCH /cart/items/<id>/` — update cart quantity
- `DELETE /cart/items/<id>/` — remove a cart item
- `POST /checkout/` — place an order with `address` and `payment_method` (`COD` or `SSLCOMMERZ`); online checkout also requires `email` and returns a hosted `payment_url`
- SSLCommerz hosted checkout displays mobile-banking methods enabled for the merchant account; the customer completes payment on the provider's page.
- `POST /payments/sslcommerz/success|fail|cancel/` — provider return callbacks; successful payments are marked paid only after server-side transaction validation.
- `POST /payments/sslcommerz/ipn/` — provider notification for payment verification if the customer does not return to the site.

## Customer orders

- `GET /orders/` — current customer's order history
- `GET /orders/<uuid>/` — details for one of the current customer's orders
- Order responses include saved line items, delivery address summary, status history and a `has_review` flag.
- `POST /reviews/` — submit a 1–5 rating and comment for your own delivered order; each order can be reviewed once.

## Shopkeeper workspace

- `GET /shopkeeper/shops/` — shops owned by the authenticated shopkeeper
- `POST /shopkeeper/shops/apply/` — submit a new shop for admin approval; ownership is assigned to the authenticated shopkeeper
- `GET /shopkeeper/orders/` — orders for the shopkeeper's shops
- `POST /shopkeeper/orders/<uuid>/<accept|reject|preparing|ready>/` — valid order status action
- `GET /shop-products/manage/` — list inventory for the shopkeeper's own shops
- `POST /shop-products/manage/` — add a catalogue product to an owned shop (`shop`, `product`, `price`, `stock`, optional `is_available`)
- `PATCH /shop-products/manage/<id>/` — update price, stock or availability
- `DELETE /shop-products/manage/<id>/` — remove a shop product

Shop ownership is checked on inventory writes. A shopkeeper cannot manage another seller's inventory. New shops stay pending until approved by an administrator.

## Delivery and administration

- `GET /admin/overview/` — staff dashboard counts and completed sales totals
- `GET /admin/shops/?status=PENDING` — list shops for review (staff only)
- `POST /admin/shops/<id>/<approve|reject|suspend>/` — moderate a shop (staff only)
- `GET /admin/orders/` — list all orders (staff only)
- `GET /admin/orders/list/` — list orders with delivery-agent assignment fields for the admin dashboard
- `GET /admin/delivery-agents/` — list active delivery agents (staff only)
- `POST /admin/products/` — add a product to the master catalogue (staff only; category must already exist)
- `POST /admin/orders/<uuid>/assign/` — assign a delivery agent (staff only)
- `GET /delivery/jobs/` — list jobs assigned to the authenticated delivery agent
- `POST /delivery/jobs/<uuid>/<pickup|complete>/` — mark an assigned order picked up or delivered

Admin endpoints require a Django staff account (`is_staff=True`); the `ADMIN` role string alone does not grant Django staff permissions.

JWT protected endpoints require `Authorization: Bearer <access-token>`.

The API uses page-number pagination for list endpoints. Responses may be wrapped as `{ "count": ..., "next": ..., "previous": ..., "results": [...] }`.
