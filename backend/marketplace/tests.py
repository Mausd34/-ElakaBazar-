from django.test import TestCase
from django.contrib.auth import get_user_model
from .models import Area, Shop, Category, Product, ShopProduct
from decimal import Decimal
from rest_framework.test import APIClient

class MarketplaceModelTests(TestCase):
    def test_shop_product_unique_per_shop(self):
        User = get_user_model()
        owner = User.objects.create_user(username="01711111111", password="StrongPass123", role="SHOPKEEPER")
        area = Area.objects.create(name="Tongi")
        shop = Shop.objects.create(owner=owner, area=area, name="Test Shop", phone="01711111111", address="Tongi", status="APPROVED")
        category = Category.objects.create(name="Test")
        product = Product.objects.create(category=category, name="Rice")
        ShopProduct.objects.create(shop=shop, product=product, price=Decimal("70"), stock=Decimal("10"))
        self.assertEqual(ShopProduct.objects.filter(shop=shop, product=product).count(), 1)

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
        self.assertEqual(response.status_code, 404)

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

        self.assertEqual(response.status_code, 200)
        listing.refresh_from_db()
        self.assertEqual(listing.shop, self.shop)
        self.assertEqual(listing.price, Decimal("50.00"))

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
