# API quick reference

Base: `/api/v1/`

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

JWT protected endpoints require `Authorization: Bearer <access-token>`.
