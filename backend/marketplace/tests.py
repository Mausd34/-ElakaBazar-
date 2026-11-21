from unittest.mock import patch
from decimal import Decimal
from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from rest_framework.test import APIClient
from .models import Area, Address, Shop, Category, Product, ShopProduct, Cart, CartItem, Order, OrderItem, OrderStatusHistory
from .sslcommerz import PaymentGatewayError, initiate_payment
User = get_user_model()

class MarketplaceModelTests(TestCase):
    def test_shop_product_unique_per_shop(self):
        owner = User.objects.create_user(username="01711111111", password="StrongPass123", role="SHOPKEEPER")
        area = Area.objects.create(name="Tongi")
        shop = Shop.objects.create(owner=owner, area=area, name="Test Shop", phone="01711111111", address="Tongi", status="APPROVED")
        category = Category.objects.create(name="Test")
        product = Product.objects.create(category=category, name="Rice")
        ShopProduct.objects.create(shop=shop, product=product, price=Decimal("70"), stock=Decimal("10"))
        self.assertEqual(ShopProduct.objects.filter(shop=shop, product=product).count(), 1)

class OrderTrackingApiTests(TestCase):
    def setUp(self):
        User = get_user_model()
        self.owner = User.objects.create_user(username="01730000001", password="DemoPass123!", role="SHOPKEEPER")
        self.customer = User.objects.create_user(username="01730000002", password="DemoPass123!", role="CUSTOMER")
        self.other_customer = User.objects.create_user(username="01730000003", password="DemoPass123!", role="CUSTOMER")
        self.admin = User.objects.create_superuser(username="admin-track", password="DemoPass123!", role="ADMIN")
        self.area = Area.objects.create(name="Tracking Area")
        self.shop = Shop.objects.create(owner=self.owner, area=self.area, name="Tracking Shop", phone="01730000001", address="Area 1", status=Shop.Status.APPROVED)
        self.address = Address.objects.create(user=self.customer, area=self.area, address_line="House 1", phone="01730000002")
        self.order = Order.objects.create(customer=self.customer, shop=self.shop, address=self.address, subtotal=Decimal("100.00"), delivery_fee=Decimal("30.00"), total=Decimal("130.00"), tracking_number="ELKTRACK123")
        OrderStatusHistory.objects.create(order=self.order, status=Order.Status.PLACED, changed_by=self.customer, note="Order placed")

    def test_customer_can_track_owned_order(self):
        client = APIClient()
        client.force_authenticate(self.customer)
        response = client.get(f"/api/v1/orders/{self.order.id}/tracking/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["order_number"], self.order.order_number)
        self.assertIsNotNone(response.data["delivery_address"])

    def test_customer_cannot_track_another_customer_order(self):
        client = APIClient()
        client.force_authenticate(self.other_customer)
        response = client.get(f"/api/v1/orders/{self.order.id}/tracking/")
        self.assertEqual(response.status_code, 404)

    def test_public_tracking_masks_address_and_rejects_invalid_number(self):
        client = APIClient()
        response = client.get("/api/v1/track/ELKTRACK123/")
        self.assertEqual(response.status_code, 200)
        self.assertIsNone(response.data["delivery_address"])
        self.assertEqual(client.get("/api/v1/track/NO/").status_code, 400)

    def test_invalid_status_transition_is_rejected_and_history_is_created(self):
        client = APIClient()
        client.force_authenticate(self.admin)
        response = client.patch(f"/api/v1/admin/orders/{self.order.id}/status/", {"status": "DELIVERED", "note": "Delivery confirmed"})
        self.assertEqual(response.status_code, 400)
        response = client.patch(f"/api/v1/admin/orders/{self.order.id}/status/", {"status": "ACCEPTED", "note": "Seller confirmed"})
        self.assertEqual(response.status_code, 200)
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, Order.Status.ACCEPTED)
        self.assertEqual(self.order.history.count(), 2)

    def test_seller_cannot_update_another_sellers_order(self):
        User = get_user_model()
        other_owner = User.objects.create_user(username="01730000004", password="DemoPass123!", role="SHOPKEEPER")
        other_shop = Shop.objects.create(owner=other_owner, area=self.area, name="Other Tracking Shop", phone="01730000004", address="Area 2", status=Shop.Status.APPROVED)
        other_order = Order.objects.create(customer=self.customer, shop=other_shop, address=self.address, subtotal=Decimal("50.00"), delivery_fee=Decimal("30.00"), total=Decimal("80.00"), tracking_number="ELKOTHER123")
        client = APIClient()
        client.force_authenticate(self.owner)
        response = client.patch(f"/api/v1/seller/orders/{other_order.id}/status/", {"status": "ACCEPTED"})
        self.assertEqual(response.status_code, 404)

class ShopkeeperApiTests(TestCase):
    def setUp(self):
        User = get_user_model()
        self.owner = User.objects.create_user(username="01722222221", password="DemoPass123!", role="SHOPKEEPER")
        self.other_owner = User.objects.create_user(username="01722222222", password="DemoPass123!", role="SHOPKEEPER")
        area = Area.objects.create(name="Uttara")
        self.shop = Shop.objects.create(
            owner=self.owner,
            area=area,
            name="My Shop",
            phone="01722222221",
            address="Sector 7",
            status=Shop.Status.APPROVED,
        )
        self.other_shop = Shop.objects.create(
            owner=self.other_owner,
            area=area,
            name="Other Shop",
            phone="01722222222",
            address="Sector 8",
            status=Shop.Status.APPROVED,
        )
        category = Category.objects.create(name="Produce")
        self.product = Product.objects.create(category=category, name="Carrot")
        self.client = APIClient()
        self.client.force_authenticate(self.owner)

    def test_shopkeeper_can_list_owned_shops_and_catalog(self):
        shops = self.client.get("/api/v1/shopkeeper/shops/")
        catalog = self.client.get("/api/v1/catalog/products/")

        self.assertEqual(shops.status_code, 200)
        self.assertEqual([shop["id"] for shop in shops.data["results"]], [self.shop.id])
        self.assertEqual(catalog.status_code, 200)
        self.assertEqual(catalog.data["results"][0]["id"], self.product.id)

    def test_shopkeeper_can_create_listing_only_for_owned_shop(self):
        response = self.client.post(
            "/api/v1/shop-products/manage/",
            {"shop": self.shop.id, "product": self.product.id, "price": "45.00", "stock": "12"},
        )

        self.assertEqual(response.status_code, 201)
        listing = ShopProduct.objects.get(pk=response.data["id"])
        self.assertEqual(listing.shop, self.shop)
        self.assertEqual(listing.stock, Decimal("12"))

        response = self.client.post(
            "/api/v1/shop-products/manage/",
            {"shop": self.other_shop.id, "product": self.product.id, "price": "45.00", "stock": "12"},
        )
        self.assertEqual(response.status_code, 400)

    def test_listing_update_cannot_move_product_to_another_shop(self):
        listing = ShopProduct.objects.create(
            shop=self.shop,
            product=self.product,
            price=Decimal("45.00"),
            stock=Decimal("12"),
        )

        response = self.client.patch(
            f"/api/v1/shop-products/manage/{listing.id}/",
            {"shop": self.other_shop.id, "price": "50.00"},
        )

        self.assertEqual(response.status_code, 400)
        listing.refresh_from_db()
        self.assertEqual(listing.shop, self.shop)
        self.assertEqual(listing.price, Decimal("45.00"))

    def test_shopkeeper_can_register_shop_pending_review(self):
        response = self.client.post(
            "/api/v1/shopkeeper/shops/",
            {
                "name": "New Shop",
                "area": self.shop.area_id,
                "phone": "01722222223",
                "address": "Sector 9",
                "delivery_fee": "35.00",
                "minimum_order": "100.00",
            },
        )

        self.assertEqual(response.status_code, 201)
        new_shop = Shop.objects.get(pk=response.data["id"])
        self.assertEqual(new_shop.owner, self.owner)
        self.assertEqual(new_shop.status, Shop.Status.PENDING)
class CoreMarketplaceAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.area = Area.objects.create(name="Tongi")
        self.customer = User.objects.create_user(username="01700000001", password="StrongPass123", phone="01700000001", full_name="Test Customer")
        self.other_customer = User.objects.create_user(username="01700000002", password="StrongPass123", phone="01700000002")
        self.seller = User.objects.create_user(username="01700000003", password="StrongPass123", phone="01700000003", role=User.Role.SHOPKEEPER)
        self.other_seller = User.objects.create_user(username="01700000004", password="StrongPass123", phone="01700000004", role=User.Role.SHOPKEEPER)
        self.shop = Shop.objects.create(owner=self.seller, area=self.area, name="Local Store", phone="01700000003", address="Tongi", status=Shop.Status.APPROVED)
        self.other_shop = Shop.objects.create(owner=self.other_seller, area=self.area, name="Other Store", phone="01700000004", address="Tongi", status=Shop.Status.APPROVED)
        self.category = Category.objects.create(name="Grocery")
        self.product = Product.objects.create(category=self.category, name="Rice")
        self.shop_product = ShopProduct.objects.create(shop=self.shop, product=self.product, price=Decimal("75"), stock=Decimal("20"))
        self.address = Address.objects.create(user=self.customer, area=self.area, address_line="House 1, Tongi", phone="01700000001")
        self.order = Order.objects.create(customer=self.customer, shop=self.shop, address=self.address, subtotal=Decimal("150"), delivery_fee=Decimal("30"), total=Decimal("180"))
        OrderItem.objects.create(order=self.order, product=self.product, product_name="Rice", unit="kg", quantity=Decimal("2"), unit_price=Decimal("75"), line_total=Decimal("150"))
        OrderStatusHistory.objects.create(order=self.order, status=Order.Status.PLACED, changed_by=self.customer)

    def test_customer_can_register(self):
        response = self.client.post("/api/v1/auth/register/", {
            "username": "01700000005", "phone": "01700000005",
            "full_name": "New Customer", "password": "StrongPass123"
        }, format="json")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(User.objects.get(username="01700000005").role, User.Role.CUSTOMER)

    def test_customer_sees_own_orders_and_timeline(self):
        self.client.force_authenticate(self.customer)
        response = self.client.get("/api/v1/orders/")
        self.assertEqual(response.status_code, 200)
        rows = response.data["results"] if isinstance(response.data, dict) and "results" in response.data else response.data
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["history"][0]["status"], Order.Status.PLACED)
        self.assertEqual(rows[0]["address_line"], "House 1, Tongi")
        self.assertFalse(rows[0]["has_review"])

    def test_customer_can_review_delivered_order_only_once(self):
        self.order.status = Order.Status.DELIVERED
        self.order.save(update_fields=["status"])
        self.client.force_authenticate(self.customer)
        payload = {"order": str(self.order.id), "rating": 5, "comment": "Great service"}

        response = self.client.post("/api/v1/reviews/", payload, format="json")
        self.assertEqual(response.status_code, 201, response.data)
        self.assertTrue(Order.objects.get(pk=self.order.id).review)

        duplicate = self.client.post("/api/v1/reviews/", payload, format="json")
        self.assertEqual(duplicate.status_code, 400)
        self.assertTrue(self.client.get("/api/v1/orders/").data["results"][0]["has_review"])

    def test_customer_cannot_review_undelivered_or_another_customers_order(self):
        self.client.force_authenticate(self.customer)
        response = self.client.post("/api/v1/reviews/", {"order": str(self.order.id), "rating": 5}, format="json")
        self.assertEqual(response.status_code, 400)

        self.order.status = Order.Status.DELIVERED
        self.order.save(update_fields=["status"])
        self.client.force_authenticate(self.other_customer)
        response = self.client.post("/api/v1/reviews/", {"order": str(self.order.id), "rating": 5}, format="json")
        self.assertEqual(response.status_code, 400)

    def test_customer_cannot_read_another_customers_order(self):
        self.client.force_authenticate(self.other_customer)
        response = self.client.get(f"/api/v1/orders/{self.order.id}/")
        self.assertEqual(response.status_code, 404)

    def test_shopkeeper_only_sees_own_shops_and_inventory(self):
        self.client.force_authenticate(self.seller)
        shops = self.client.get("/api/v1/shopkeeper/shops/")
        inventory = self.client.get("/api/v1/shop-products/manage/")
        self.assertEqual(shops.status_code, 200)
        self.assertEqual(inventory.status_code, 200)
        self.assertEqual(len(shops.data["results"]), 1)
        self.assertEqual(len(inventory.data["results"]), 1)
        self.assertEqual(shops.data["results"][0]["id"], self.shop.id)

    def test_shopkeeper_cannot_create_inventory_for_another_shop(self):
        self.client.force_authenticate(self.seller)
        response = self.client.post("/api/v1/shop-products/manage/", {
            "shop": self.other_shop.id, "product": self.product.id,
            "price": "80.00", "stock": "5"
        }, format="json")
        self.assertEqual(response.status_code, 400)

    def test_shopkeeper_can_add_catalogue_product_to_own_shop(self):
        self.client.force_authenticate(self.seller)
        another_product = Product.objects.create(category=self.category, name="Cooking Oil")
        response = self.client.post("/api/v1/shop-products/manage/", {
            "shop": self.shop.id, "product": another_product.id,
            "price": "160.00", "stock": "8.000", "is_available": True
        }, format="json")
        self.assertEqual(response.status_code, 201, response.data)
        self.assertTrue(ShopProduct.objects.filter(shop=self.shop, product=another_product).exists())

    def test_shopkeeper_cannot_set_negative_stock(self):
        self.client.force_authenticate(self.seller)
        response = self.client.patch(f"/api/v1/shop-products/manage/{self.shop_product.id}/", {
            "stock": "-1.000"
        }, format="json")
        self.assertEqual(response.status_code, 400)

    def test_shopkeeper_can_update_own_inventory(self):
        self.client.force_authenticate(self.seller)
        response = self.client.patch(f"/api/v1/shop-products/manage/{self.shop_product.id}/", {
            "price": "82.50", "stock": "12.000", "is_available": True
        }, format="json")
        self.assertEqual(response.status_code, 200)
        self.shop_product.refresh_from_db()
        self.assertEqual(self.shop_product.price, Decimal("82.50"))
        self.assertEqual(self.shop_product.stock, Decimal("12.000"))


class AdminAndDeliveryWorkflowTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.area = Area.objects.create(name="Uttara")
        self.admin = User.objects.create_user(username="admin-user", password="StrongPass123", is_staff=True, is_superuser=True)
        self.seller = User.objects.create_user(username="seller-user", password="StrongPass123", role=User.Role.SHOPKEEPER, full_name="Local Seller")
        self.customer = User.objects.create_user(username="buyer-user", password="StrongPass123", phone="01700000111", full_name="Buyer")
        self.agent = User.objects.create_user(username="agent-user", password="StrongPass123", role=User.Role.DELIVERY_AGENT, phone="01700000112", full_name="Delivery Agent")
        self.shop = Shop.objects.create(owner=self.seller, area=self.area, name="Pending Store", phone="01700000113", address="Uttara", status=Shop.Status.PENDING)
        self.address = Address.objects.create(user=self.customer, area=self.area, address_line="Road 1", phone="01700000111")
        self.category = Category.objects.create(name="Daily Goods")

    def test_shopkeeper_can_apply_for_shop_and_application_is_pending(self):
        self.client.force_authenticate(self.seller)
        response = self.client.post("/api/v1/shopkeeper/shops/apply/", {
            "name": "New Grocery", "phone": "01700000114", "address": "Sector 4",
            "area": self.area.id, "delivery_fee": "25.00", "minimum_order": "100.00"
        }, format="json")
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(Shop.objects.get(name="New Grocery").status, Shop.Status.PENDING)
        self.assertEqual(Shop.objects.get(name="New Grocery").owner, self.seller)

    def test_admin_can_review_shops_and_read_dashboard(self):
        self.client.force_authenticate(self.admin)
        overview = self.client.get("/api/v1/admin/overview/")
        self.assertEqual(overview.status_code, 200)
        self.assertEqual(overview.data["shops_pending"], 1)
        action = self.client.post(f"/api/v1/admin/shops/{self.shop.id}/approve/")
        self.assertEqual(action.status_code, 200)
        self.shop.refresh_from_db()
        self.assertEqual(self.shop.status, Shop.Status.APPROVED)

    def test_non_admin_cannot_access_admin_dashboard(self):
        self.client.force_authenticate(self.customer)
        response = self.client.get("/api/v1/admin/overview/")
        self.assertEqual(response.status_code, 403)

    def test_admin_can_create_catalogue_product_and_list_agents(self):
        self.client.force_authenticate(self.admin)
        product = self.client.post("/api/v1/admin/products/", {
            "name": "Lentils", "name_bn": "মসুর ডাল", "unit": "kg",
            "category": self.category.id
        }, format="json")
        agents = self.client.get("/api/v1/admin/delivery-agents/")
        self.assertEqual(product.status_code, 201, product.data)
        self.assertEqual(agents.status_code, 200)
        self.assertEqual(len(agents.data["results"]), 1)

    def test_admin_dashboard_orders_include_agent_assignment_fields(self):
        order = Order.objects.create(
            customer=self.customer, shop=self.shop, address=self.address,
            delivery_agent=self.agent, subtotal=Decimal("100"),
            delivery_fee=Decimal("20"), total=Decimal("120"),
        )
        self.client.force_authenticate(self.admin)

        response = self.client.get("/api/v1/admin/orders/list/")

        self.assertEqual(response.status_code, 200)
        row = response.data["results"][0]
        self.assertEqual(row["id"], str(order.id))
        self.assertEqual(row["delivery_agent"], self.agent.id)
        self.assertEqual(row["delivery_agent_name"], self.agent.full_name)

    def test_delivery_agent_can_pick_up_and_complete_assigned_order(self):
        order = Order.objects.create(
            customer=self.customer, shop=self.shop, address=self.address,
            delivery_agent=self.agent, subtotal=Decimal("100"),
            delivery_fee=Decimal("20"), total=Decimal("120"), status=Order.Status.READY
        )
        self.client.force_authenticate(self.agent)
        jobs = self.client.get("/api/v1/delivery/jobs/")
        self.assertEqual(jobs.status_code, 200)
        pickup = self.client.post(f"/api/v1/delivery/jobs/{order.id}/pickup/")
        self.assertEqual(pickup.status_code, 200, pickup.data)
        complete = self.client.post(f"/api/v1/delivery/jobs/{order.id}/complete/")
        self.assertEqual(complete.status_code, 200, complete.data)
        order.refresh_from_db()
        self.assertEqual(order.status, Order.Status.DELIVERED)
        self.assertEqual(order.payment_status, Order.PaymentStatus.PAID)


@override_settings(
    SSLCOMMERZ_STORE_ID="sandbox-store",
    SSLCOMMERZ_STORE_PASSWORD="sandbox-password",
)
class CheckoutPaymentTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.area = Area.objects.create(name="Tongi")
        self.customer = User.objects.create_user(username="01700000901", password="StrongPass123", full_name="Test Buyer")
        self.seller = User.objects.create_user(username="01700000902", password="StrongPass123", role=User.Role.SHOPKEEPER)
        self.shop = Shop.objects.create(
            owner=self.seller, area=self.area, name="Test Shop", phone="01700000902",
            address="Tongi", status=Shop.Status.APPROVED,
        )
        self.address = Address.objects.create(
            user=self.customer, area=self.area, address_line="House 1, Tongi", phone="01700000901",
        )
        self.category = Category.objects.create(name="Groceries")
        self.product = Product.objects.create(category=self.category, name="Rice")
        self.listing = ShopProduct.objects.create(
            shop=self.shop, product=self.product, price=Decimal("75.00"), stock=Decimal("20.000"),
        )
        self.cart = Cart.objects.create(customer=self.customer, shop=self.shop)
        self.cart_item = CartItem.objects.create(
            cart=self.cart, shop_product=self.listing, quantity=Decimal("2.000"),
        )
        self.client.force_authenticate(self.customer)

    def checkout(self, payment_method="COD"):
        payload = {"address": self.address.id, "payment_method": payment_method}
        if payment_method == "SSLCOMMERZ":
            payload["email"] = "buyer@example.com"
        return self.client.post("/api/v1/checkout/", payload, format="json")

    def test_cart_includes_shop_delivery_area(self):
        response = self.client.get("/api/v1/cart/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["shop_area_name"], "Tongi")

    def test_cod_checkout_keeps_existing_behavior(self):
        response = self.checkout()

        self.assertEqual(response.status_code, 201, response.data)
        order = Order.objects.get()
        self.assertEqual(order.payment_method, "COD")
        self.assertIsNone(order.payment_transaction_id)
        self.assertEqual(self.listing.__class__.objects.get(pk=self.listing.pk).stock, Decimal("18.000"))
        self.assertFalse(CartItem.objects.filter(cart=self.cart).exists())

    def test_checkout_rejects_an_address_outside_the_shop_delivery_area(self):
        other_area = Area.objects.create(name="Banani", district="Dhaka")
        other_address = Address.objects.create(
            user=self.customer, area=other_area, address_line="Road 1, Banani", phone="01700000901",
        )

        response = self.client.post("/api/v1/checkout/", {"address":other_address.id}, format="json")

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["detail"], "This shop does not currently serve the selected area.")
        self.assertEqual(ShopProduct.objects.get(pk=self.listing.pk).stock, Decimal("20.000"))
        self.assertTrue(CartItem.objects.filter(pk=self.cart_item.pk).exists())

    def test_wallet_checkout_starts_hosted_mobile_banking_session(self):
        with patch("marketplace.views.initiate_payment", return_value="https://sandbox.sslcommerz.com/test-session") as initiate:
            response = self.checkout("SSLCOMMERZ")

        self.assertEqual(response.status_code, 201, response.data)
        order = Order.objects.get()
        self.assertEqual(order.payment_method, "SSLCOMMERZ")
        self.assertEqual(order.payment_status, Order.PaymentStatus.PENDING)
        self.assertEqual(len(order.payment_transaction_id), 30)
        self.assertEqual(response.data["payment_url"], "https://sandbox.sslcommerz.com/test-session")
        self.assertEqual(initiate.call_args.args[0]["multi_card_name"], "mobilebank")
        self.assertIn("payments/sslcommerz/ipn/", initiate.call_args.args[0]["ipn_url"])

    def test_gateway_failure_rolls_back_order_stock_and_cart(self):
        with patch("marketplace.views.initiate_payment", side_effect=PaymentGatewayError("Unavailable")):
            response = self.checkout("SSLCOMMERZ")

        self.assertEqual(response.status_code, 503)
        self.assertFalse(Order.objects.exists())
        self.assertEqual(ShopProduct.objects.get(pk=self.listing.pk).stock, Decimal("20.000"))
        self.assertTrue(CartItem.objects.filter(pk=self.cart_item.pk).exists())

    @override_settings(SSLCOMMERZ_STORE_ID="", SSLCOMMERZ_STORE_PASSWORD="")
    def test_online_checkout_requires_gateway_credentials(self):
        response = self.checkout("SSLCOMMERZ")

        self.assertEqual(response.status_code, 503)
        self.assertFalse(Order.objects.exists())
        self.assertEqual(ShopProduct.objects.get(pk=self.listing.pk).stock, Decimal("20.000"))
        self.assertTrue(CartItem.objects.filter(pk=self.cart_item.pk).exists())

    def test_gateway_rejects_redirects_outside_sslcommerz(self):
        with patch("marketplace.sslcommerz._request_json", return_value={
            "status":"SUCCESS", "GatewayPageURL":"https://attacker.example/pay",
        }):
            with self.assertRaises(PaymentGatewayError):
                initiate_payment({"tran_id":"test"})

    @override_settings(
        SSLCOMMERZ_SANDBOX=False, DEBUG=True,
        PAYMENT_CALLBACK_BASE_URL="https://api.example.com",
        FRONTEND_URL="https://shop.example.com",
    )
    def test_live_gateway_is_disabled_in_debug_mode(self):
        with self.assertRaises(PaymentGatewayError):
            initiate_payment({"tran_id":"test"})

    def test_validated_success_callback_marks_order_paid(self):
        with patch("marketplace.views.initiate_payment", return_value="https://sandbox.sslcommerz.com/test-session"):
            self.checkout("SSLCOMMERZ")
        order = Order.objects.get()
        validation = {
            "status":"VALID", "tran_id":order.payment_transaction_id,
            "amount":"180.00", "currency":"BDT", "store_id":"sandbox-store",
        }

        with patch("marketplace.views.validate_payment", return_value=validation):
            response = self.client.post("/api/v1/payments/sslcommerz/success/", {
                "tran_id":order.payment_transaction_id, "val_id":"validated-id",
            }, format="json")

        self.assertEqual(response.status_code, 302)
        order.refresh_from_db()
        self.assertEqual(order.payment_status, Order.PaymentStatus.PAID)
        self.assertIn("status=success", response["Location"])

    def test_late_cancel_callback_does_not_reverse_a_verified_payment(self):
        with patch("marketplace.views.initiate_payment", return_value="https://sandbox.sslcommerz.com/test-session"):
            self.checkout("SSLCOMMERZ")
        order = Order.objects.get()
        validation = {
            "status":"VALID", "tran_id":order.payment_transaction_id,
            "amount":"180.00", "currency":"BDT", "store_id":"sandbox-store",
        }
        with patch("marketplace.views.validate_payment", return_value=validation):
            self.client.post("/api/v1/payments/sslcommerz/success/", {
                "tran_id":order.payment_transaction_id, "val_id":"validated-id",
            }, format="json")

        response = self.client.post("/api/v1/payments/sslcommerz/cancel/", {
            "tran_id":order.payment_transaction_id,
        }, format="json")

        order.refresh_from_db()
        self.assertEqual(order.payment_status, Order.PaymentStatus.PAID)
        self.assertEqual(ShopProduct.objects.get(pk=self.listing.pk).stock, Decimal("18.000"))
        self.assertIn("status=success", response["Location"])

    def test_unverified_ipn_does_not_mark_order_paid(self):
        with patch("marketplace.views.initiate_payment", return_value="https://sandbox.sslcommerz.com/test-session"):
            self.checkout("SSLCOMMERZ")
        order = Order.objects.get()
        validation = {
            "status":"VALID", "tran_id":order.payment_transaction_id,
            "amount":"1.00", "currency":"BDT", "store_id":"sandbox-store",
        }

        with patch("marketplace.views.validate_payment", return_value=validation):
            response = self.client.post("/api/v1/payments/sslcommerz/ipn/", {
                "tran_id":order.payment_transaction_id, "val_id":"validated-id",
            }, format="json")

        self.assertEqual(response.status_code, 400)
        order.refresh_from_db()
        self.assertEqual(order.payment_status, Order.PaymentStatus.PENDING)

    def test_risky_ipn_does_not_mark_order_paid(self):
        with patch("marketplace.views.initiate_payment", return_value="https://sandbox.sslcommerz.com/test-session"):
            self.checkout("SSLCOMMERZ")
        order = Order.objects.get()
        validation = {
            "status":"VALID", "tran_id":order.payment_transaction_id,
            "amount":"180.00", "currency":"BDT", "store_id":"sandbox-store",
            "risk_level":"1",
        }

        with patch("marketplace.views.validate_payment", return_value=validation):
            response = self.client.post("/api/v1/payments/sslcommerz/ipn/", {
                "tran_id":order.payment_transaction_id, "val_id":"validated-id",
            }, format="json")

        self.assertEqual(response.status_code, 400)
        order.refresh_from_db()
        self.assertEqual(order.payment_status, Order.PaymentStatus.PENDING)

    def test_cancelled_checkout_restores_reserved_inventory_and_cart(self):
        with patch("marketplace.views.initiate_payment", return_value="https://sandbox.sslcommerz.com/test-session"):
            self.checkout("SSLCOMMERZ")
        order = Order.objects.get()

        response = self.client.post("/api/v1/payments/sslcommerz/cancel/", {
            "tran_id":order.payment_transaction_id,
        }, format="json")

        self.assertEqual(response.status_code, 302)
        order.refresh_from_db()
        self.assertEqual(order.payment_status, Order.PaymentStatus.FAILED)
        self.assertEqual(order.status, Order.Status.CANCELLED)
        self.assertEqual(ShopProduct.objects.get(pk=self.listing.pk).stock, Decimal("20.000"))
        self.assertEqual(CartItem.objects.get(cart=self.cart).quantity, Decimal("2.000"))

    def test_shopkeeper_cannot_process_an_unpaid_wallet_order(self):
        with patch("marketplace.views.initiate_payment", return_value="https://sandbox.sslcommerz.com/test-session"):
            self.checkout("SSLCOMMERZ")
        order = Order.objects.get()
        self.client.force_authenticate(self.seller)

        response = self.client.post(f"/api/v1/shopkeeper/orders/{order.id}/accept/")

        self.assertEqual(response.status_code, 400)
        order.refresh_from_db()
        self.assertEqual(order.status, Order.Status.PLACED)
