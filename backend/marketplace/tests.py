from django.test import TestCase
from django.contrib.auth import get_user_model
from .models import Area, Shop, Category, Product, ShopProduct
from decimal import Decimal

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
