from decimal import Decimal
from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient
from .models import Area, Address, Shop, Category, Product, ShopProduct, Order, OrderItem, OrderStatusHistory

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
